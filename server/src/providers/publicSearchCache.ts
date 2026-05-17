// Short-lived public search cache shared by public routes and provider syncs.
//
// Upgrades over the previous Map-based version:
//   - LRU eviction with explicit max-size
//   - Per-key TTL (hot keys live longer than filtered searches)
//   - Single-flight: concurrent requests for the same key share one
//     underlying fetch instead of stampeding the DB
//   - Stale-while-revalidate: an expired entry is served immediately while
//     a background refresh runs (so users never wait on a cold cache miss
//     once the entry has been computed at least once)
//
// The interface stays small on purpose so it can be swapped for Redis
// later (multi-process scale-out) without touching call sites.

import { LRUCache } from "lru-cache";

type CacheEntry = {
  data: unknown;
  expiresAt: number;
  // Soft TTL: once expired we return the entry as "stale" and trigger a
  // background refresh. Removed from the cache after hardExpiresAt.
  hardExpiresAt: number;
};

const HOT_TTL_MS = 5 * 60_000;       // bootstrap, destinations
const FILTERED_TTL_MS = 60_000;      // /all/tours with filter combos
const STALE_GRACE_MS = 5 * 60_000;   // serve stale up to 5 min past TTL

const cache = new LRUCache<string, CacheEntry>({
  max: 2_000,
  // Use our own expiresAt logic; let LRU only handle size-based eviction.
});

const inflight = new Map<string, Promise<unknown>>();

function defaultTtlFor(key: string): number {
  if (key.startsWith("destinations:")) return HOT_TTL_MS;
  if (key.startsWith("bootstrap")) return HOT_TTL_MS;
  return FILTERED_TTL_MS;
}

export function getCachedPublicSearchResult(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now >= entry.hardExpiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedPublicSearchResult(key: string, data: unknown, ttlMs?: number): void {
  const ttl = ttlMs ?? defaultTtlFor(key);
  const now = Date.now();
  cache.set(key, {
    data,
    expiresAt: now + ttl,
    hardExpiresAt: now + ttl + STALE_GRACE_MS,
  });
}

// Single-flight + stale-while-revalidate helper. Callers that adopt this
// get free request deduplication and instant-paint on stale entries.
export async function getOrFetchPublicSearchResult<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number,
): Promise<{ data: T; cache: "hit" | "stale" | "miss" }> {
  const entry = cache.get(key);
  const now = Date.now();

  if (entry && now < entry.expiresAt) {
    return { data: entry.data as T, cache: "hit" };
  }

  if (entry && now < entry.hardExpiresAt) {
    // Serve stale, refresh in background (single-flight protected).
    void runSingleFlight(key, fetcher, ttlMs).catch((err) => {
      console.warn(`[publicSearchCache] background refresh failed for ${key}:`, err);
    });
    return { data: entry.data as T, cache: "stale" };
  }

  const data = (await runSingleFlight(key, fetcher, ttlMs)) as T;
  return { data, cache: "miss" };
}

function runSingleFlight<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = (async () => {
    try {
      const data = await fetcher();
      setCachedPublicSearchResult(key, data, ttlMs);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export function invalidatePublicSearchCache(providerId?: string): void {
  if (!providerId) {
    cache.clear();
    inflight.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (
      key.startsWith(`${providerId}:`) ||
      key.startsWith("destinations:") ||
      key.startsWith("all:")
    ) {
      cache.delete(key);
    }
  }
}
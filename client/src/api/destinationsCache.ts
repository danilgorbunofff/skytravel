// ──────────────────────────────────────────────
// Destinations cache — sessionStorage-backed SWR
// for the public destinations list. Renders cached
// items instantly on revisit and revalidates with
// an If-None-Match request in the background.
// ──────────────────────────────────────────────

import type { PublicDestinationSummary } from "../types/providers";
import { safeParseJSON } from "./safeParseJSON";

const API_URL = import.meta.env.VITE_API_URL || "";
const STORAGE_PREFIX = "skytravel:destinations:v2:";

// Module-level cooldown shared across instances of this hook on the page.
const lastFetchTs = new Map<string, number>();
const FETCH_COOLDOWN_MS = 10_000;
const MAX_CACHE_AGE_MS = 5 * 60 * 1000;

type Cached = {
  items: PublicDestinationSummary[];
  etag: string | null;
  cachedAt: number;
};

function storageKey(providerId?: string): string {
  return `${STORAGE_PREFIX}${providerId ?? "all"}`;
}

function readCache(providerId?: string): Cached | null {
  try {
    const raw = sessionStorage.getItem(storageKey(providerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - (parsed.cachedAt ?? 0) > MAX_CACHE_AGE_MS) {
      sessionStorage.removeItem(storageKey(providerId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(
  providerId: string | undefined,
  items: PublicDestinationSummary[],
  etag: string | null,
): void {
  try {
    const payload: Cached = { items, etag, cachedAt: Date.now() };
    sessionStorage.setItem(storageKey(providerId), JSON.stringify(payload));
  } catch {
    // Quota errors are non-fatal.
  }
}

export type DestinationsResult = {
  items: PublicDestinationSummary[];
  fromCache: boolean;
};

/** Returns cached destinations (if any) immediately, plus a promise that
 *  resolves to the latest list. The fresh request sends `If-None-Match` so
 *  the server can return 304 when nothing changed. */
export function loadDestinations(providerId?: string): {
  cached: DestinationsResult | null;
  fresh: Promise<DestinationsResult>;
} {
  const cached = readCache(providerId);
  const now = Date.now();
  const last = lastFetchTs.get(providerId ?? "all") ?? 0;
  const withinCooldown = now - last < FETCH_COOLDOWN_MS;

  let fresh: Promise<DestinationsResult>;

  if (withinCooldown && cached) {
    fresh = Promise.resolve({ items: cached.items, fromCache: true });
  } else {
    lastFetchTs.set(providerId ?? "all", now);
    const params = new URLSearchParams();
    if (providerId) params.set("providerId", providerId);
    const query = params.toString();
    const url = `${API_URL}/api/search/destinations${query ? `?${query}` : ""}`;
    const headers: Record<string, string> = {};
    if (cached?.etag) headers["If-None-Match"] = cached.etag;

    fresh = fetch(url, { headers }).then(async (res) => {
      if (res.status === 304 && cached) {
        // Touch cache timestamp so the 5-min TTL is reset against fresh-from-server data.
        writeCache(providerId, cached.items, cached.etag);
        return { items: cached.items, fromCache: true };
      }
      if (!res.ok) {
        const body = (await safeParseJSON(res).catch(() => ({}))) as Record<string, string>;
        throw new Error(
          (body as Record<string, string>)?.error || `Request failed with status ${res.status}`,
        );
      }
      const etag = res.headers.get("ETag");
      const data = await safeParseJSON<{ items: PublicDestinationSummary[] }>(res, "destinace");
      writeCache(providerId, data.items, etag);
      return { items: data.items, fromCache: false };
    });
  }

  return {
    cached: cached ? { items: cached.items, fromCache: true } : null,
    fresh,
  };
}

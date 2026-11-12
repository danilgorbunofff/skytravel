import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import type { LandingPageData } from "./types.js";

/**
 * Data for server-rendered pages is read from this server's own public API
 * over loopback, so SSR shows exactly what the client would fetch (same
 * filtering, same provider caches) without duplicating the search logic.
 *
 * Requests carry a per-process token so the public rate limiters skip them.
 */
export const SSR_INTERNAL_TOKEN = crypto.randomUUID();
export const SSR_INTERNAL_HEADER = "x-ssr-internal";

const TIMEOUT_MS = 3500;
const LAST_MINUTE_DAYS = 21; // keep in sync with client/src/lib/dealFilters.ts
const DEALS_LIMIT = 8;

const cache = new LRUCache<string, { value: unknown[] | undefined }>({
  max: 100,
  ttl: 5 * 60 * 1000,
});

async function fetchItems(pathAndQuery: string): Promise<unknown[] | undefined> {
  const cached = cache.get(pathAndQuery);
  if (cached) return cached.value;
  let value: unknown[] | undefined;
  try {
    const res = await fetch(`http://127.0.0.1:${config.port}${pathAndQuery}`, {
      headers: { [SSR_INTERNAL_HEADER]: SSR_INTERNAL_TOKEN },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { items?: unknown[]; data?: { items?: unknown[] } };
    value = body.items ?? body.data?.items ?? [];
  } catch (err) {
    // undefined → the client fetches the block itself after hydration
    logger.warn({ err, path: pathAndQuery }, "SSR data fetch failed");
    value = undefined;
  }
  cache.set(pathAndQuery, { value });
  return value;
}

/** Mirrors dealFilters() in client/src/lib/dealFilters.ts. */
export function dealsQuery(deals: LandingPageData["deals"], now = new Date()): string {
  const params = new URLSearchParams({
    sortBy: "price",
    sortDir: "asc",
    limit: String(DEALS_LIMIT),
    page: "1",
  });
  if (deals.destinationSlug) params.set("destinationSlug", deals.destinationSlug);
  if (deals.lastMinute) {
    params.set("dateStart", now.toISOString().slice(0, 10));
    params.set(
      "dateEnd",
      new Date(now.getTime() + LAST_MINUTE_DAYS * 86_400_000).toISOString().slice(0, 10),
    );
  }
  return `/api/search/all/tours?${params}`;
}

export function fetchLandingDeals(page: LandingPageData): Promise<unknown[] | undefined> {
  return fetchItems(dealsQuery(page.deals));
}

export async function fetchHomeData(): Promise<{
  lastMinute?: unknown[];
  ownTours?: unknown[];
}> {
  const [lastMinute, ownTours] = await Promise.all([
    fetchItems("/api/alexandria/last-minute?limit=10"),
    fetchItems("/api/tours"),
  ]);
  return { lastMinute, ownTours };
}

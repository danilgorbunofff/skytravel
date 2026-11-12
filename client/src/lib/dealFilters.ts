import type { UnifiedFilters } from "../types/providers";

export interface DealQuery {
  destinationSlug: string;
  lastMinute: boolean;
}

export const DEALS_LIMIT = 8;
export const LAST_MINUTE_DAYS = 21;

/**
 * Filters for the landing-page deals block. Mirrored on the server in
 * server/src/ssr/deals.ts — keep both in sync.
 */
export function dealFilters(query: DealQuery, now = new Date()): UnifiedFilters {
  const filters: UnifiedFilters = {
    sortBy: "price",
    sortDir: "asc",
    limit: DEALS_LIMIT,
    page: 1,
  };
  if (query.destinationSlug) filters.destinationSlug = query.destinationSlug;
  if (query.lastMinute) {
    filters.dateStart = now.toISOString().slice(0, 10);
    filters.dateEnd = new Date(now.getTime() + LAST_MINUTE_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }
  return filters;
}

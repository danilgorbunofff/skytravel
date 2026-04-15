// ──────────────────────────────────────────────
// Unified Provider Types — Client Side
// ──────────────────────────────────────────────

/** Unified tour shape — superset of all provider tour types. */
export type UnifiedTour = {
  externalId: string;
  destination: string;
  title: string;
  price: number;
  originalPrice: number;
  startDate: string;
  endDate: string;
  transport: string;
  image: string;
  description: string | null;
  photos: string[];
  url: string;
  stars: string;
  board: string;
  source: string;

  offersCount?: number;
  nights?: number;
  adults?: number;
  children?: number;
  roomType?: string;
  currency?: string;
};

/**
 * Shared + provider-specific filter parameters.
 *
 * The index signature allows arbitrary provider-specific keys (e.g. `zeme`,
 * `townFrom`, `stateId`) to be spread directly into the object and serialised
 * to URLSearchParams without needing to flatten a nested structure.
 */
export type UnifiedFilters = {
  q?: string;
  priceMin?: number;
  priceMax?: number;
  dateStart?: string;
  dateEnd?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
  refresh?: boolean;
  [key: string]: unknown;
};

/** Describes a provider-specific filter field for the UI. */
export type FilterFieldDescriptor = {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "date" | "boolean";
  options?: Array<{ value: string | number; label: string }>;
  dependsOn?: string;
  defaultValue?: unknown;
};

/** Region / country / departure→destination route. */
export type ProviderRegion = {
  id: number;
  name: string;
  count?: number;
  meta?: Record<string, unknown>;
};

/** Metadata for a registered provider. */
export type ProviderMeta = {
  id: string;
  label: string;
  supportsStreaming: boolean;
  filterFields: FilterFieldDescriptor[];
  cacheStatus: CacheStatus;
};

/** Cache status snapshot. */
export type CacheStatus = {
  lastRefresh: number | null;
  ttl: number;
  itemCount: number;
  warm: boolean;
};

/** Paginated tours result. */
export type ToursResult = {
  total: number;
  filtered: number;
  uniqueDestinations: number;
  page: number;
  limit: number;
  totalPages: number;
  items: UnifiedTour[];
};

/** Result of an import operation. */
export type ImportResult = {
  ok: boolean;
  created: number;
  updated: number;
  total: number;
  message?: string;
};

// ──────────────────────────────────────────────
// Provider Abstraction Layer — Type Definitions
// ──────────────────────────────────────────────

/** Unified tour shape — superset of all provider tour types. */
export type UnifiedTour = {
  externalId: string;
  destination: string;
  title: string;
  price: number;
  originalPrice: number;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  transport: string;
  image: string;
  description: string | null;
  photos: string[];
  url: string;
  stars: string;
  board: string;
  source: string;

  // Alexandria-specific
  offersCount?: number;

  // Orextravel-specific
  nights?: number;
  adults?: number;
  children?: number;
  roomType?: string;
  currency?: string;
};

/** Shared filter parameters passed to every provider. */
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
  providerFilters: Record<string, unknown>;
};

/** Represents a region / country / departure→destination route. */
export type ProviderRegion = {
  id: number;
  name: string;
  count?: number;
  meta?: Record<string, unknown>;
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

/** Cache status snapshot. */
export type CacheStatus = {
  lastRefresh: number | null;
  ttl: number;
  itemCount: number;
  warm: boolean;
  syncing?: boolean;
};

/** Callback for SSE streaming. */
export type StreamCallback = (event: {
  batch: UnifiedTour[];
  loaded: number;
}) => void;

/** Core provider contract. */
export interface TourProvider {
  readonly id: string;
  readonly label: string;
  readonly supportsStreaming: boolean;
  readonly refreshIntervalMs: number;

  getRegions(): Promise<ProviderRegion[]>;
  getProviderFilters(): FilterFieldDescriptor[];
  fetchTours(filters: UnifiedFilters): Promise<ToursResult>;
  streamTours(
    filters: UnifiedFilters,
    onBatch: StreamCallback,
  ): Promise<void>;
  importTours(
    ids: string[],
    regionCtx: Record<string, unknown>,
  ): Promise<ImportResult>;
  warmCache(): Promise<void>;
  refreshCache(): Promise<void>;
  getCacheStatus(): CacheStatus;
  syncToDb(): Promise<void>;
}

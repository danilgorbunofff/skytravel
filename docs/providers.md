# Provider Integrations

SkyTravel aggregates tours from external travel providers via their APIs. Each provider is encapsulated behind the `TourProvider` interface.

## Registered Providers

| ID           | Label      | Data Format     | Auth                  |
| ------------ | ---------- | --------------- | --------------------- |
| `alexandria` | Alexandria | XML export feed | API key (query param) |

## Provider Contract

Every provider must implement the `TourProvider` interface from `server/src/providers/types.ts`:

```typescript
interface TourProvider {
  readonly id: string;
  readonly label: string;
  readonly supportsStreaming: boolean;
  readonly refreshIntervalMs: number;

  getRegions(filters?: UnifiedFilters): Promise<ProviderRegion[]>;
  getProviderFilters(): FilterFieldDescriptor[];
  fetchTours(filters: UnifiedFilters): Promise<ToursResult>;
  fetchOfferGroup(filters: UnifiedFilters, offerGroupKey: string): Promise<UnifiedTour[]>;
  streamTours(filters: UnifiedFilters, onBatch: StreamCallback): Promise<void>;
  importTours(ids: string[], regionCtx: Record<string, unknown>): Promise<ImportResult>;
  warmCache(): Promise<void>;
  refreshCache(): Promise<void>;
  getCacheStatus(): CacheStatus;
  syncToDb(): Promise<void>;
}
```

## Adding a New Provider

See [provider-guide.md](provider-guide.md) for the full walkthrough: interface contract,
config wiring, destination mapping, and a mock-provider test harness.

## Alexandria

- **API type:** XML export feed (full catalog dump)
- **Auth:** API key as query parameter
- **Data returned:** Full tour details including images, prices, dates, hotel info
- **Sync strategy:** Periodic full refresh (configurable interval)
- **Parsing:** `fast-xml-parser` with XXE protection enabled
- **Cache:** In-memory LRU, warmed on startup
- **Refresh script:** `tsx server/scripts/refresh-alexandria.ts`

## Caching

Each provider manages its own cache with:

- **LRU eviction** (max 2000 entries per provider)
- **Single-flight** — concurrent identical requests share one fetch
- **Stale-while-revalidate** — serves stale data immediately while refreshing in background
- **Configurable refresh interval** per provider (`refreshIntervalMs`)
- **Startup warming** — all providers warm their cache on boot (configurable via `PROVIDERS_WARM_ON_STARTUP`)

## Destination Mapping

Providers use different identifiers for the same destination. The `Destination` + `DestinationMapping` tables provide canonical mapping:

```
Alexandria "Egypt" (regionKey: "EG") ───→ Destination(slug: "egypt", czechName: "Egypt")
```

This enables unified cross-provider search by destination.

## Error Handling

- Provider API failures are caught and logged but don't crash the server
- Failed providers are excluded from search results (partial results returned)
- `ProviderSync` table tracks last successful sync and error messages
- Background refresh failures are logged via pino but don't affect current cached results

# Phase 1 — Server: Provider Abstraction Layer

## 1. Goal & Overview

**What this phase achieves:**
Create a `TourProvider` interface and wrap the existing Alexandria and Orextravel logic behind provider classes. This establishes the extensibility foundation — future tour agencies (e.g. Čedok, Fischer) can be added by implementing one class, with zero route or UI changes.

After Phase 1 completes, the new provider classes exist and are unit-testable, but **no existing route or client code is changed yet**. The old route files (`server/src/routes/admin/alexandria.ts` and `server/src/routes/admin/orextravel.ts`) continue to serve traffic until Phase 2 wires up the new unified routes.

**What this phase does NOT touch:**
- No changes to any existing route files
- No changes to `server/src/index.ts`
- No changes to `server/src/lib/alexandria.ts` or `server/src/lib/orextravel.ts` (low-level fetch/parse modules stay as-is)
- No client-side changes whatsoever
- No PM2/ecosystem config changes
- No database schema changes

---

## 2. Prerequisites

- Node.js and npm installed; `server/` dependencies are up to date (`npm install` has been run)
- Familiarity with the existing code in:
  - `server/src/lib/alexandria.ts` — exports `fetchAlexandriaRaw()`, `fetchAlexandriaParsed()`, `extractToursFromParsed()`, and the `AlexandriaTourInput` type
  - `server/src/lib/orextravel.ts` — exports `fetchOrextravelTours()`, `fetchTownState()`, `syncReferenceCache()`, `clearOrextravelCache()`, `clearTourCache()`, and the `OrextravelTourInput` type
  - `server/src/routes/admin/alexandria.ts` — contains the `feedCacheMap`, `countriesCache`, filter/sort/paginate logic, and the 200-ID country probe loop
  - `server/src/routes/admin/orextravel.ts` — contains the `feedCacheMap`, SSE streaming handler, filter/sort/paginate logic, and import logic
- Understanding that `AlexandriaTourInput` has 15 fields: `externalId`, `destination`, `title`, `price`, `originalPrice`, `startDate` (Date), `endDate` (Date), `transport`, `image`, `description`, `photos`, `url`, `stars`, `board`, plus `offersCount` is added dynamically during destination grouping
- Understanding that `OrextravelTourInput` has 19 fields: the same 14 base fields plus `nights`, `adults`, `children`, `roomType`, and internally `hotelId`

---

## 3. Files to Create

All new files go under `server/src/providers/`.

```
server/src/providers/
├── types.ts                    # Interface contract + shared types
├── registry.ts                 # Map-based provider store
├── alexandriaProvider.ts       # TourProvider implementation for Alexandria
├── orextravelProvider.ts       # TourProvider implementation for Orextravel
└── index.ts                    # Barrel: registers providers, re-exports everything
```

### 3.1 `types.ts` — Provider contract and shared types

This is the contract that all providers must implement. It defines these types:

**`UnifiedTour`** — the superset of all provider tour shapes:
- Shared required fields (present for every provider):
  - `externalId: string` — provider-specific unique ID
  - `destination: string` — display-ready destination name
  - `title: string` — hotel/tour name
  - `price: number` — current price
  - `originalPrice: number` — original (pre-discount) price
  - `startDate: string` — ISO 8601 date string (use string, not Date — this type is used for JSON serialization)
  - `endDate: string` — ISO 8601 date string
  - `transport: string` — transport type label
  - `image: string` — primary image URL
  - `description: string` — tour description text
  - `photos: string[]` — additional photo URLs
  - `url: string` — external booking/detail URL
  - `stars: string` — hotel star rating
  - `board: string` — board type (e.g. "All inclusive", "Polopenze")
  - `source: string` — provider ID (e.g. "alexandria", "orextravel")
- Optional provider-specific fields:
  - `offersCount?: number` — Alexandria only: number of offers for a destination (used in group-by-destination mode)
  - `nights?: number` — Orextravel only: number of nights
  - `adults?: number` — Orextravel only: number of adults
  - `children?: number` — Orextravel only: number of children
  - `roomType?: string` — Orextravel only: room type description

**`UnifiedFilters`** — shared filter parameters:
- `q?: string` — text search (searches destination, title, description, board)
- `priceMin?: number`
- `priceMax?: number`
- `dateStart?: string` — ISO date string
- `dateEnd?: string` — ISO date string
- `sortBy?: string` — "price" or "date" (default "price")
- `sortDir?: "asc" | "desc"` (default "asc")
- `page?: number` (default 1)
- `limit?: number` (default 50, max 200)
- `refresh?: boolean` — force cache invalidation
- `providerFilters: Record<string, unknown>` — opaque bag of provider-specific filters (e.g. `{ zeme: 107, groupBy: "destination" }` for Alexandria, `{ townFrom: 1, stateId: 5 }` for Orextravel). The provider class interprets these; the route layer just passes them through.

**`ProviderRegion`** — represents countries (Alexandria) or departure→destination routes (Orextravel):
- `id: number` — region identifier
- `name: string` — display name
- `count?: number` — number of tours in this region (optional, omitted if not yet known)
- `meta?: Record<string, unknown>` — provider-specific extra data (Orextravel may include `departureName`, `townId`, etc.)

**`FilterFieldDescriptor`** — tells the UI what provider-specific filter controls to render:
- `key: string` — filter parameter name (e.g. "zeme", "townFrom", "stateId", "transport", "board", "groupBy")
- `label: string` — human-readable label for the UI (e.g. "Země", "Odjezd z", "Destinace")
- `type: "select" | "text" | "number" | "date" | "boolean"` — determines which form control to render
- `options?: Array<{ value: string | number; label: string }>` — only for type="select", provides the selectable values
- `dependsOn?: string` — if set, this filter is disabled until the referenced filter has a value (e.g. `stateId` depends on `townFrom` for Orextravel — you can't pick a destination until you've picked a departure city)
- `defaultValue?: unknown` — initial value for the filter

**`ToursResult`** — shape returned by `fetchTours()`:
- `total: number` — total items in cache (before filtering)
- `filtered: number` — items matching filters (after filtering, before pagination)
- `uniqueDestinations: number` — count of distinct destinations in filtered results
- `page: number`
- `limit: number`
- `totalPages: number`
- `items: UnifiedTour[]` — the page of tours

**`ImportResult`** — shape returned by `importTours()`:
- `ok: boolean`
- `created: number` — newly inserted tours
- `updated: number` — existing tours updated
- `total: number` — total tours processed
- `message?: string` — optional error/info message

**`CacheStatus`** — shape returned by `getCacheStatus()`:
- `lastRefresh: number | null` — epoch timestamp of last successful cache warm, or null if never warmed
- `ttl: number` — cache TTL in milliseconds
- `itemCount: number` — total items currently in cache across all regions/routes
- `warm: boolean` — true if cache has data and is within TTL

**`StreamCallback`** — signature for SSE streaming progress callbacks:
- `(event: { batch: UnifiedTour[]; loaded: number }) => void`

**`TourProvider` interface** — the core contract every provider must implement:
- `id: string` — unique provider identifier (e.g. "alexandria", "orextravel")
- `label: string` — human-readable name (e.g. "Alexandria", "Orextravel")
- `supportsStreaming: boolean` — whether the provider can progressively stream tour data via SSE
- `refreshIntervalMs: number` — how often (in ms) the background cache refresh should run
- `getRegions(): Promise<ProviderRegion[]>` — return all available regions/countries/routes
- `getProviderFilters(): FilterFieldDescriptor[]` — return the list of provider-specific filter fields (synchronous — these are static per provider)
- `fetchTours(filters: UnifiedFilters): Promise<ToursResult>` — fetch, filter, sort, paginate tours
- `streamTours(filters: UnifiedFilters, onBatch: StreamCallback): Promise<void>` — stream tours progressively (only meaningful if `supportsStreaming` = true; otherwise, throw or call fetchTours internally)
- `importTours(ids: string[], regionCtx: Record<string, unknown>): Promise<ImportResult>` — import selected tours to the DB. `regionCtx` carries provider-specific context like `{ zeme: 107 }` or `{ townFrom: 1, stateId: 5 }`
- `warmCache(): Promise<void>` — preload/refresh the in-memory cache (called on server startup and by background interval)
- `refreshCache(): Promise<void>` — force-clear and rebuild cache (called by manual "Refresh" button)
- `getCacheStatus(): CacheStatus` — return current cache state (called by UI status bar)

### 3.2 `registry.ts` — Provider registry

This file manages a `Map<string, TourProvider>` and exposes three functions:

- `registerProvider(provider: TourProvider): void` — adds a provider to the map keyed by `provider.id`. If a provider with the same ID already exists, throw an error (catch registration bugs early).
- `getProvider(id: string): TourProvider` — returns the provider for the given ID. If not found, throw a descriptive error (e.g. `Unknown provider: "${id}"`). The route layer catches this and returns 404.
- `getAllProviders(): Array<{ id: string; label: string; supportsStreaming: boolean; filterFields: FilterFieldDescriptor[]; cacheStatus: CacheStatus }>` — iterates all registered providers and returns metadata for each. This powers the `GET /api/admin/providers` endpoint.

The map is module-scoped (not exported directly) — only the three functions are exported.

### 3.3 `alexandriaProvider.ts` — Alexandria provider class

This class implements `TourProvider` and encapsulates all Alexandria-specific logic. It replaces the in-memory cache and business logic currently in `server/src/routes/admin/alexandria.ts`.

**Private state:**
- `feedCacheMap: Map<number, { data: AlexandriaTourInput[]; ts: number }>` — same structure as in the current route file, but owned by the provider instance
- `regionsCache: { data: ProviderRegion[]; ts: number } | null` — replaces `countriesCache`
- `CACHE_TTL = 30 * 60 * 1000` — 30 minutes (currently 5 minutes in the route file — this is the key performance fix)
- `REGIONS_TTL = 24 * 60 * 60 * 1000` — 24 hours (same as current)

**Static configuration:**
- `id = "alexandria"`
- `label = "Alexandria"`
- `supportsStreaming = false` — Alexandria API returns all data at once (no progressive loading)
- `refreshIntervalMs = 25 * 60 * 1000` — 25 minutes (warm cache before the 30-min TTL expires)

**`KNOWN_COUNTRIES` constant** — hardcoded list replacing the 200-ID probe loop:
```
{ id: 53, name: "Bulharsko" }
{ id: 107, name: "Chorvatsko" }
{ id: 147, name: "Itálie" }
```
This eliminates the 20-30 second cold-start penalty of probing IDs 1 through 200. If new countries need to be supported later, add them to this list manually (Alexandria doesn't provide a "list all countries" API).

**Method implementations:**

- `getRegions()`:
  1. Check `regionsCache` — if valid (within `REGIONS_TTL`), return cached data
  2. Otherwise, iterate `KNOWN_COUNTRIES` and for each, call the private `getCachedFeed(countryId)` method
  3. Build `ProviderRegion[]` with counts from the returned data
  4. Cache the result in `regionsCache`
  5. Return the result

- `getProviderFilters()`:
  Return a static array of `FilterFieldDescriptor` objects:
  - `{ key: "zeme", label: "Země", type: "select", options: KNOWN_COUNTRIES mapped to { value: id, label: name } }`
  - `{ key: "transport", label: "Doprava", type: "select", options: [] }` — options are empty; the UI can populate them from the tour data, or the server can extract unique values from cache
  - `{ key: "board", label: "Stravování", type: "select", options: [] }` — same approach
  - `{ key: "stars", label: "Hvězdy", type: "select", options: [] }`
  - `{ key: "groupBy", label: "Seskupit dle", type: "select", options: [{ value: "", label: "Neseskupovat" }, { value: "destination", label: "Dle destinace" }] }`

- `fetchTours(filters)`:
  1. Extract `zeme` from `filters.providerFilters` (default to config's `alexandria.country`)
  2. If `filters.refresh` is true, delete the relevant `feedCacheMap` entry
  3. Call `getCachedFeed(zeme)` to get raw items
  4. Apply shared text search filter (`q`) — match against destination, title, description, board
  5. Apply shared price range filter (`priceMin`, `priceMax`)
  6. Apply shared date range filter (`dateStart`, `dateEnd`)
  7. Apply provider-specific filters: `transport`, `board`, `stars`
  8. Sort the filtered results by `sortBy` (price or date) and `sortDir` (asc or desc)
  9. Handle `groupBy=destination` mode: collapse into cheapest-per-destination with `offersCount`
  10. Compute `uniqueDestinations` count
  11. Paginate: slice by `page` and `limit`
  12. Serialize items (convert Date fields to ISO strings, spread all fields into `UnifiedTour` shape, add `source: "alexandria"`)
  13. Return `ToursResult` object

- `streamTours()`:
  Since `supportsStreaming = false`, this method should either throw `new Error("Streaming not supported")` or simply call `fetchTours()` internally and pass all items as a single batch to the callback.

- `importTours(ids, regionCtx)`:
  1. Extract `zeme` from `regionCtx` (fallback to config default)
  2. Call `getCachedFeed(zeme)` to get cached items
  3. Filter items to only those whose `externalId` is in the `ids` array
  4. For each item: check if a tour exists in the DB with `source: "alexandria"` and matching `externalId` — if yes, update; if no, create (including setting `sortOrder` to current tour count)
  5. Return `ImportResult` with created/updated/total counts

- `warmCache()`:
  1. Iterate `KNOWN_COUNTRIES`
  2. For each country, call `getCachedFeed(countryId)` — this populates the `feedCacheMap`
  3. Calls can be done in parallel via `Promise.all()` since they're independent
  4. Log the total number of cached tours

- `refreshCache()`:
  1. Clear `feedCacheMap` entirely
  2. Clear `regionsCache`
  3. Call `warmCache()` to rebuild

- `getCacheStatus()`:
  1. Compute `itemCount` by summing `.data.length` across all `feedCacheMap` entries
  2. Find the oldest `ts` in the map to determine `lastRefresh`
  3. Return `{ lastRefresh, ttl: CACHE_TTL, itemCount, warm: itemCount > 0 && newest entry is within TTL }`

**Private helper method `getCachedFeed(countryId)`:**
Same logic as the current route file's `getCachedFeed()` — check `feedCacheMap`, return cached data if within TTL, otherwise call `fetchAlexandriaParsed(countryId)` + `extractToursFromParsed()`, cache, and return.

### 3.4 `orextravelProvider.ts` — Orextravel provider class

This class implements `TourProvider` and encapsulates all Orextravel-specific logic. It replaces the in-memory cache and business logic currently in `server/src/routes/admin/orextravel.ts`.

**Private state:**
- `feedCacheMap: Map<string, { data: OrextravelTourInput[]; ts: number }>` — key is `"${townFrom}-${stateId}"` (same as current route), value is cached tour list + timestamp
- `CACHE_TTL = 60 * 60 * 1000` — 60 minutes (currently 15 minutes in the route file — increased because the underlying lib's `tourCacheMap` already has a 1-hour TTL, so the provider cache should match)

**Static configuration:**
- `id = "orextravel"`
- `label = "Orextravel"`
- `supportsStreaming = true` — Orextravel's multi-step API chain benefits from progressive loading
- `refreshIntervalMs = 45 * 60 * 1000` — 45 minutes

**Method implementations:**

- `getRegions()`:
  1. Call `fetchTownState()` from the orextravel lib
  2. Map the result into `ProviderRegion[]` — the TownState data has a nested structure (departures contain destinations). Flatten into regions with `meta` carrying the departure-destination relationship
  3. Return the region list

- `getProviderFilters()`:
  Return a static array of `FilterFieldDescriptor` objects:
  - `{ key: "townFrom", label: "Odjezd z", type: "select", options: [] }` — options are populated dynamically from `getRegions()` data (departure cities)
  - `{ key: "stateId", label: "Destinace", type: "select", options: [], dependsOn: "townFrom" }` — destinations are filtered by selected departure city. The `dependsOn` field tells the UI to disable this filter until `townFrom` has a value.

- `fetchTours(filters)`:
  1. Extract `townFrom` and `stateId` from `filters.providerFilters`
  2. If `filters.refresh` is true, delete the relevant `feedCacheMap` entry and call `clearTourCache()` from the lib
  3. Call `getCachedFeed(townFrom, stateId)` to get raw items
  4. Apply shared text search filter (`q`) — match against destination, title, description, board, AND `roomType` (unique to Orextravel)
  5. Apply shared price range filter
  6. Apply shared date range filter
  7. Sort by `sortBy` and `sortDir`
  8. Compute `uniqueDestinations` count
  9. Paginate by `page` and `limit`
  10. Serialize items into `UnifiedTour` shape with all Orextravel-specific fields (`nights`, `adults`, `children`, `roomType`), add `source: "orextravel"`
  11. Return `ToursResult`

- `streamTours(filters, onBatch)`:
  1. Extract `townFrom` and `stateId` from `filters.providerFilters`
  2. Call `fetchOrextravelTours(townFrom, stateId, onProgress)` from the lib
  3. In the `onProgress` callback, serialize each batch of `OrextravelTourInput` items into `UnifiedTour[]` and call `onBatch({ batch: serialized, loaded: runningTotal })`
  4. After `fetchOrextravelTours` completes, call `getCachedFeed()` to populate the feedCacheMap for subsequent paginated requests

- `importTours(ids, regionCtx)`:
  1. Extract `townFrom` and `stateId` from `regionCtx`
  2. Call `getCachedFeed(townFrom, stateId)` to get cached items
  3. Filter to items whose `externalId` is in `ids`
  4. For each: upsert in DB with `source: "orextravel"` + matching `externalId`
  5. Return `ImportResult`

- `warmCache()`:
  1. Call `getCachedFeed()` with no arguments (fetches the default route)
  2. This populates the feedCacheMap for the default departure/destination combo
  3. Log the cached count

- `refreshCache()`:
  1. Clear `feedCacheMap`
  2. Call `clearOrextravelCache()` from the lib (clears reference cache and tour cache)
  3. Call `warmCache()` to rebuild

- `getCacheStatus()`:
  Same pattern as Alexandria — sum itemCounts across feedCacheMap entries, find oldest ts, return CacheStatus object.

**Private helper method `getCachedFeed(townFrom?, stateId?)`:**
Same logic as the current route file — build key `"${townFrom}-${stateId}"`, check feedCacheMap, return cached data if within TTL, otherwise call `fetchOrextravelTours()`, cache, and return.

### 3.5 `index.ts` — Barrel file with auto-registration

This file:
1. Imports `registerProvider` from `./registry.ts`
2. Imports `AlexandriaProvider` from `./alexandriaProvider.ts`
3. Imports `OrextravelProvider` from `./orextravelProvider.ts`
4. Instantiates both providers and registers them: `registerProvider(new AlexandriaProvider())`, `registerProvider(new OrextravelProvider())`
5. Re-exports everything from `./types.ts`, `./registry.ts`

**Important:** This barrel file must NOT be imported from any existing route files in Phase 1. The old route files continue to work with their own independent caches. Connecting the new provider system to routes happens in Phase 2.

---

## 4. Files to Modify

**None.** Phase 1 is purely additive — only new files are created. No existing files are changed.

---

## 5. Step-by-Step Instructions

1. **Create the directory** `server/src/providers/`

2. **Create `types.ts` first** — define all types and the `TourProvider` interface. This is the foundation everything else depends on. Make sure `UnifiedTour` includes every field from both `AlexandriaTourInput` and `OrextravelTourInput`, with provider-specific fields marked optional.

3. **Create `registry.ts` second** — implement the three registry functions. This is simple and has no dependencies other than the types.

4. **Create `alexandriaProvider.ts` third** — implement the full `TourProvider` interface:
   - Start by copying the `feedCacheMap`, `countriesCache`, and `KNOWN_COUNTRIES` from `server/src/routes/admin/alexandria.ts` into private class fields
   - Move the `getCachedFeed()` helper as a private method
   - Move the `serializeItem()` helper → adapt it to produce `UnifiedTour` objects (add `source: "alexandria"`)
   - Implement `fetchTours()` by extracting the filter/sort/paginate logic from the existing `/tours` route handler
   - Implement `importTours()` by extracting the upsert logic from the existing `/import` route handler
   - Implement the remaining methods (getRegions, warmCache, refreshCache, getCacheStatus, getProviderFilters)
   - Change `CACHE_TTL` from `5 * 60 * 1000` to `30 * 60 * 1000`
   - Remove the 200-ID probe loop — use only `KNOWN_COUNTRIES` for region discovery

5. **Create `orextravelProvider.ts` fourth** — same pattern:
   - Copy `feedCacheMap` from `server/src/routes/admin/orextravel.ts` into a private class field
   - Move `getCachedFeed()` and `serializeItem()` as private methods
   - Implement all `TourProvider` methods by extracting logic from the existing route handlers
   - Change `CACHE_TTL` from `15 * 60 * 1000` to `60 * 60 * 1000`
   - Remember to include the `roomType` field in the text search filter (the existing Orextravel route does this)

6. **Create `index.ts` last** — import both provider classes, instantiate and register them, re-export types and registry functions.

7. **Verify compilation** — run `npx tsc --noEmit` from `server/` to ensure the new files compile without errors. Fix any type issues.

8. **Do NOT wire anything up yet** — the new provider files should be dead code at this point. They compile and are importable, but nothing in the running application uses them.

---

## 6. Performance Impact

Phase 1 itself has **no runtime performance impact** because the new code is not yet wired into the application. However, it bakes in the following improvements that take effect when Phase 2 connects the providers:

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Alexandria CACHE_TTL | 5 min | 30 min | 6× fewer API refetches during admin browsing sessions |
| Country discovery | Probes IDs 1–200 in batches of 10 | Hardcoded 3 known countries | Eliminates 20–30 second cold-start penalty |
| Orextravel CACHE_TTL | 15 min | 60 min | 4× fewer full API chain re-fetches |
| Code deduplication | Filter/sort/paginate copied in 2 route files | Centralized in provider classes | Easier to optimize once, applies everywhere |

---

## 7. Verification Steps

1. **TypeScript compilation passes:**
   ```
   cd server && npx tsc --noEmit
   ```
   Expect zero errors.

2. **All existing tests still pass** (if any exist):
   ```
   cd server && npm test
   ```

3. **Server still starts normally:**
   ```
   cd server && npm run dev
   ```
   The new provider files are not imported by any running code, so the server should behave identically to before.

4. **Quick smoke test** — existing Alexandria and Orextravel admin pages work exactly as before (they still use the old route files).

5. **Optional manual verification** — temporarily add a test script that imports `server/src/providers/index.ts`, calls `getAllProviders()`, and logs the result. Confirm both providers appear with correct metadata.

---

## 8. Rollback

Since Phase 1 only creates new files and modifies nothing existing:

1. Delete the `server/src/providers/` directory entirely
2. That's it — the application is back to its exact pre-Phase-1 state

---

## 9. Common Gotchas & Pitfalls

1. **Do NOT import `providers/index.ts` from any existing route** — if you accidentally import it in `server/src/routes/admin/index.ts` or similar, you'll have two competing cache systems (the old feedCacheMap in the route file AND the new one in the provider class). This creates subtle bugs where the admin sees stale data. Phase 2 handles the wiring.

2. **Date serialization** — `AlexandriaTourInput` and `OrextravelTourInput` use `Date` objects for `startDate`/`endDate`. The `UnifiedTour` type uses `string` (ISO format). Make sure the provider's serialize step converts `Date` → `.toISOString()`.

3. **The `offersCount` field is synthetic** — it's computed during destination grouping, not stored in the raw Alexandria data. The `UnifiedTour` type must mark it `optional`. Only populate it when `groupBy=destination` is active.

4. **Orextravel's `roomType` search** — the existing Orextravel route includes `roomType` in the text search filter (`q`). The Alexandria route does not (Alexandria has no `roomType`). Make sure each provider's `fetchTours()` searches the correct fields for that provider.

5. **`AlexandriaTourInput` has no `nights`, `adults`, `children`, `roomType`** — setting them to undefined is fine since they're optional on `UnifiedTour`. Do NOT set them to `0` or `""` — the UI uses their presence/absence to decide whether to show those columns.

6. **Registry must be a singleton** — the `providers` Map in `registry.ts` must be module-scoped (not inside a class or function). Node.js module caching ensures it's shared across all imports in the same process.

7. **ESM import paths** — the server uses ESM (`.js` extensions in imports). Make sure all import statements use `.js` extensions (e.g. `import { registerProvider } from "./registry.js"`), not `.ts`.

8. **Prisma import** — the import logic needs `import prisma from "../../prisma.js"` (two levels up from `providers/`). Get the relative path right.

9. **Config import** — similarly, `import { config } from "../config.js"` for Alexandria's default country ID.

10. **StreamCallback type** — even though Alexandria doesn't support streaming, the `streamTours()` method must still exist on the class (it's in the interface). Implement it as a no-op or throw. Don't skip it.

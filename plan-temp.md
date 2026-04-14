# Plan: Unified Multi-Provider Tour Search Tool

## TL;DR

Merge Alexandria + Orextravel admin pages into one extensible "Tour Search" tool with a **provider registry pattern** on the server and a **single unified UI** on the client. New providers are added by implementing a `TourProvider` interface + config — no new routes, pages, or tabs needed. Split into 5 phases: provider abstraction → unified API → unified UI → cache warming → cleanup.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Admin UI: single "Tour Search" page            │
│  ┌─────────────────────────────────────────────┐│
│  │ Provider selector │ Filters │ Sort │ Page   ││
│  │ [Alexandria ▾] [Orextravel ▾] [Future... ▾] ││
│  ├─────────────────────────────────────────────┤│
│  │ Unified tour table (dynamic columns)        ││
│  │ Detail drawer │ Bulk import                 ││
│  └─────────────────────────────────────────────┘│
└───────────────────┬─────────────────────────────┘
                    │ single API contract
                    ▼
┌─────────────────────────────────────────────────┐
│  Server: /api/admin/providers/*                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ProviderEngine│  │ProviderEngine│  + future   │
│  │ "alexandria"  │  │ "orextravel" │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         │ implements       │ implements          │
│         ▼                  ▼                     │
│  ┌─────────────────────────────────────────┐    │
│  │  TourProvider interface                  │    │
│  │  getRegions(): Region[]                  │    │
│  │  fetchTours(filters): UnifiedTour[]      │    │
│  │  importTours(ids): ImportResult          │    │
│  │  refreshCache(): void                    │    │
│  │  getProviderFilters(): FilterField[]     │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ProviderRegistry: Map<string, TourProvider>    │
│  Cache warming: setInterval per provider        │
└─────────────────────────────────────────────────┘
```

---

## Phase 1: Server — Provider Abstraction Layer

**Goal:** Create a `TourProvider` interface and wrap existing Alexandria/Orextravel logic behind it. No behavior changes yet — just restructuring.

### Steps

1.1. **Create `server/src/providers/types.ts`** — define the provider contract:
   - `TourProvider` interface with methods: `id`, `label`, `getRegions()`, `fetchTours(filters)`, `importTours(ids, regionCtx)`, `refreshCache()`, `getCacheStatus()`
   - `UnifiedTour` type — superset of both: 13 shared fields + optional `nights`, `adults`, `children`, `roomType`, `offersCount`, plus `source: string`
   - `UnifiedFilters` type — shared filters (`q`, `priceMin/Max`, `dateStart/End`, `page`, `limit`, `sortBy`, `sortDir`) + provider-specific passed as `providerFilters: Record<string, unknown>`
   - `ProviderRegion` type — `{ id: number; name: string; count?: number }` to represent countries (Alexandria) or routes (Orextravel) uniformly
   - `FilterFieldDescriptor` type — `{ key, label, type: "select"|"text"|"number"|"date", options? }` so UI can render provider-specific filters dynamically
   - `ImportResult` type — `{ ok, created, updated, total }`
   - `CacheStatus` type — `{ lastRefresh: number | null; ttl: number; itemCount: number; warm: boolean }`

1.2. **Create `server/src/providers/alexandriaProvider.ts`** — implement `TourProvider`:
   - Wrap existing `server/src/lib/alexandria.ts` functions
   - Move the in-memory `feedCacheMap` + `countriesCache` from the route file into this provider class
   - `getRegions()` = current countries logic (with optimization: persist known IDs, probe only on explicit refresh)
   - `fetchTours(filters)` = current `/tours` logic (filter + sort + paginate in-memory)
   - `importTours(ids)` = current `/import` logic
   - `refreshCache()` = clear feedCacheMap
   - `getProviderFilters()` returns `[{ key: "transport", ... }, { key: "board", ... }, { key: "stars", ... }, { key: "groupBy", ... }]`

1.3. **Create `server/src/providers/orextravelProvider.ts`** — implement `TourProvider`:
   - Wrap existing `server/src/lib/orextravel.ts` functions
   - Move the in-memory `feedCacheMap` from the route file into this provider class
   - `getRegions()` = current routes logic returning `{ departures: [...], destinations: [...] }` (two-level)
   - `fetchTours(filters)` = current `/tours` logic
   - `importTours(ids)` = current `/import` logic
   - `refreshCache()` = clear caches
   - `getProviderFilters()` returns `[{ key: "townFrom", ... }, { key: "stateId", ... }]`

1.4. **Create `server/src/providers/registry.ts`** — provider registry:
   - `const providers = new Map<string, TourProvider>()`
   - `registerProvider(provider: TourProvider)` — adds to map
   - `getProvider(id: string)` — returns provider or throws
   - `getAllProviders()` — returns metadata (id, label, filter descriptors)
   - Register both providers on import

### Relevant files
- `server/src/lib/alexandria.ts` — keep as-is (low-level XML fetch/parse)
- `server/src/lib/orextravel.ts` — keep as-is (low-level SAMO API calls)
- `server/src/providers/types.ts` — NEW
- `server/src/providers/alexandriaProvider.ts` — NEW (wraps lib + cache + filter/sort/paginate)
- `server/src/providers/orextravelProvider.ts` — NEW (wraps lib + cache + filter/sort/paginate)
- `server/src/providers/registry.ts` — NEW
- `server/src/providers/index.ts` — NEW (barrel export + auto-register)

---

## Phase 2: Server — Unified API Routes

**Goal:** Replace `/api/admin/alexandria/*` and `/api/admin/orextravel/*` with a single `/api/admin/providers/*` route set. Keep old routes temporarily as aliases.

### Steps

2.1. **Create `server/src/routes/admin/providers.ts`** — single route file:
   - `GET /api/admin/providers` — list all registered providers with metadata (id, label, filter descriptors, cache status)
   - `GET /api/admin/providers/:id/regions` — get regions for a provider (countries for Alexandria, departure+destination routes for Orextravel)
   - `GET /api/admin/providers/:id/tours` — fetch tours with unified filters + provider-specific filters via query params
   - `GET /api/admin/providers/:id/tours/stream` — SSE streaming (delegated to provider if supported, otherwise wrap normal fetch)
   - `POST /api/admin/providers/:id/import` — import selected tours
   - `POST /api/admin/providers/:id/refresh` — force cache refresh
   - `GET /api/admin/providers/:id/cache-status` — return cache age, item count, warm status

2.2. **Wire up in `server/src/routes/admin/index.ts`**:
   - Add `router.use("/providers", providersRoutes)`
   - Keep existing `/alexandria` and `/orextravel` routes temporarily (deprecated, remove in Phase 5)

2.3. **Implement cache warming in `server/src/index.ts`**:
   - After server starts, iterate all registered providers and call `provider.warmCache()` in background
   - `setInterval` per provider: Alexandria every 25 min, Orextravel every 45 min (configurable via provider)
   - Log cache warm status on completion

### Performance optimizations baked in:
   - Alexandria `CACHE_TTL`: 5 min → 30 min (in provider)
   - Orextravel `CACHE_TTL`: 15 min → 60 min (in provider)
   - Alexandria country probing: persist known IDs, only re-probe on explicit `refreshRegions()`
   - Orextravel: increase `CONCURRENCY` 3 → 6, decrease `DELAY_MS` 100 → 50

### Relevant files
- `server/src/routes/admin/providers.ts` — NEW
- `server/src/routes/admin/index.ts` — add providers route
- `server/src/index.ts` — add cache warming on startup + setInterval
- `server/src/config.ts` — add `providers.warmOnStartup`, `providers.refreshIntervals` config

---

## Phase 3: Client — Unified Types & API Layer

**Goal:** Create a single API module for the unified provider system. Remove duplicate types.

### Steps

3.1. **Create `client/src/types/providers.ts`** — unified client-side types:
   - `UnifiedTour` — all shared fields + optional provider-specific fields + `source: string`
   - `UnifiedFilters` — all shared filters + `provider: string` + provider-specific as Record
   - `ProviderMeta` — `{ id, label, filterFields: FilterFieldDescriptor[], cacheStatus }`
   - `ProviderRegion` — `{ id, name, count? }`
   - `FilterFieldDescriptor` — `{ key, label, type, options? }`

3.2. **Create `client/src/api/providers.ts`** — unified API functions:
   - `fetchProviders()` → `ProviderMeta[]`
   - `fetchProviderRegions(providerId)` → `ProviderRegion[]`
   - `fetchProviderTours(providerId, filters)` → `{ total, filtered, page, totalPages, items: UnifiedTour[] }`
   - `streamProviderTours(providerId, filters, onBatch, onDone, onError)` → close function
   - `importProviderTours(providerId, ids, regionCtx)` → `ImportResult`
   - `refreshProviderCache(providerId)` → void
   - `fetchProviderCacheStatus(providerId)` → `CacheStatus`

3.3. **Create `client/src/hooks/useProviderTours.ts`** — unified data hook:
   - Manages tours, loading, error, pagination, filters state
   - Accepts `providerId` as parameter
   - Handles both paginated fetch and SSE streaming
   - Returns `{ tours, loading, error, totalCount, filteredCount, page, totalPages, loadTours, refresh }`

### Relevant files
- `client/src/types/providers.ts` — NEW
- `client/src/api/providers.ts` — NEW
- `client/src/hooks/useProviderTours.ts` — NEW

---

## Phase 4: Client — Unified Admin Search Page

**Goal:** Build a single `AdminSearchPage` that replaces both `AdminAlexandriaPage` and `AdminOrextravelPage`.

### Steps

4.1. **Create `client/src/pages/AdminSearchPage.tsx`** — the unified page:
   - **Provider selector** — dropdown or tabs at top, populated from `fetchProviders()`. Switching provider reloads regions + tours.
   - **Region selector** — dynamic tabs/dropdown populated from `fetchProviderRegions(id)`. For Alexandria = countries, for Orextravel = departure cities + destination countries (two-level if provider supports it).
   - **Shared filters** — always visible: search (`q`), price range, date range, sort by price/date.
   - **Provider-specific filters** — rendered dynamically from `provider.filterFields[]`. Each `FilterFieldDescriptor` maps to a form control (select, input, etc.). Shown only when that provider is active.
   - **Tour table** — unified columns for shared fields, conditional columns (nights, adults/children, roomType, offersCount) shown based on provider or data presence.
   - **Detail drawer** — shows all available tour data; optional fields rendered conditionally (photos gallery if photos.length > 0, room type if present, etc.).
   - **Bulk select + import** — works the same across providers; calls `importProviderTours(providerId, selectedIds, regionContext)`.
   - **Cache status indicator** — shows last refresh time + "Refresh" button per provider. Uses `fetchProviderCacheStatus()`.
   - **Stats bar** — total, filtered, unique destinations, price range — computed from response metadata.

4.2. **Update `client/src/features/admin/AdminRoutes.tsx`**:
   - Add route `/admin/search` → `AdminSearchPage`
   - Keep `/admin/alexandria` and `/admin/orextravel` as redirects to `/admin/search?provider=alexandria` and `?provider=orextravel` temporarily

4.3. **Update `client/src/components/AdminLayout.tsx`**:
   - Replace two nav items (Alexandria + Orextravel) with single "Vyhledávání" / "Tour Search" item pointing to `/admin/search`

4.4. **Create `client/src/components/admin/ProviderFilterRenderer.tsx`** — dynamic filter renderer:
   - Takes `FilterFieldDescriptor[]` and renders the appropriate form controls
   - Emits filter changes as `Record<string, unknown>`
   - Handles select options (loaded from provider or from data)

4.5. **Create `client/src/components/admin/TourDetailDrawer.tsx`** — unified detail drawer:
   - Renders shared fields always
   - Conditionally renders: photos gallery, room type, nights, adults/children, offersCount, external URL link
   - Provider-aware styling (e.g., Alexandria link goes to alexandria.cz)

### Relevant files
- `client/src/pages/AdminSearchPage.tsx` — NEW (main page)
- `client/src/components/admin/ProviderFilterRenderer.tsx` — NEW
- `client/src/components/admin/TourDetailDrawer.tsx` — NEW
- `client/src/features/admin/AdminRoutes.tsx` — modify routes
- `client/src/components/AdminLayout.tsx` — update nav

---

## Phase 5: Cleanup & Finalize

**Goal:** Remove deprecated code, update PM2 config, verify everything works.

### Steps

5.1. **Remove old route files**:
   - `server/src/routes/admin/alexandria.ts` — logic moved to provider
   - `server/src/routes/admin/orextravel.ts` — logic moved to provider
   - Remove imports from `server/src/routes/admin/index.ts`

5.2. **Remove old page files**:
   - `client/src/pages/AdminAlexandriaPage.tsx`
   - `client/src/pages/AdminOrextravelPage.tsx`
   - Remove redirect routes from AdminRoutes

5.3. **Clean up duplicate types**:
   - Remove Alexandria/Orextravel types from `client/src/api.ts` and `client/src/features/admin/services/adminApi.ts`
   - Keep only public-facing types (e.g., `AlexandriaLastMinuteItem` for the public homepage feed)

5.4. **Update `ecosystem.config.cjs`**:
   - Remove `skytravel-alexandria-refresh` PM2 cron (cache warming is now in-process)
   - Optionally add a DB-import cron if you want periodic auto-import to the Tour table

5.5. **Keep `server/src/routes/alexandriaPublic.ts` unchanged** — the public last-minute feed is a separate concern, not part of admin search

5.6. **Keep refresh scripts** (`server/scripts/refresh-*.ts`) — useful for manual CLI operations and DB imports

---

## How to Add a Future Provider (e.g., "CedokTravel")

1. Create `server/src/providers/cedokProvider.ts` implementing `TourProvider`
2. Create `server/src/lib/cedok.ts` with the API-specific fetch/parse logic
3. Register in `server/src/providers/index.ts`: `registerProvider(new CedokProvider())`
4. Add env vars to `.env`: `CEDOK_API_URL`, `CEDOK_TOKEN`, etc.
5. Add config to `server/src/config.ts`
6. Done — the unified UI picks it up automatically

No new routes. No new pages. No new nav items. Just the provider class + lib.

---

## Verification

1. **Cold start** → both providers auto-warm in background → first admin search page load returns cached data in < 3s
2. **Switch providers** in UI → regions + tours load from the other provider's cache
3. **Apply filters** → shared filters (price, date, search) work across all providers; provider-specific filters appear/disappear on switch
4. **Import tours** → works for both providers via unified import button
5. **Refresh cache** → per-provider refresh button clears that provider's cache and re-fetches
6. **Add a mock provider** → register a dummy provider that returns hardcoded data → verify it shows up in UI without any UI code changes
7. **Public Alexandria feed** → still works at `/api/alexandria/last-minute` (untouched)
8. **Old URL redirects** → `/admin/alexandria` and `/admin/orextravel` redirect to `/admin/search?provider=...`

## Decisions

- **In-memory cache, not DB sync** — for admin browsing, in-memory is faster and simpler. DB import is a separate action (the "Import" button).
- **Provider-specific filters are dynamic** — the server tells the UI what filters to render via `FilterFieldDescriptor[]`. No hardcoded provider logic in the frontend.
- **SSE streaming is optional per provider** — if a provider doesn't support streaming, the unified route falls back to standard pagination.
- **Region model is flexible** — single-level (Alexandria countries) or multi-level (Orextravel departure + destination) handled by the same UI component.
- **Public routes untouched** — `/api/alexandria/last-minute` for the homepage is a separate concern and stays as-is.
- **Scope excluded**: i18n, user-facing search, analytics dashboard, email campaigns — all out of scope.

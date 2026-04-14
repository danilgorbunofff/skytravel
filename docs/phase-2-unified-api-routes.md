# Phase 2 — Server: Unified API Routes + Cache Warming

## 1. Goal & Overview

**What this phase achieves:**
Wire up the provider abstraction from Phase 1 to the Express application. Create a single unified route file (`/api/admin/providers/*`) that replaces the separate `/api/admin/alexandria/*` and `/api/admin/orextravel/*` endpoints. Implement in-process cache warming on server startup and background refresh via `setInterval`.

After Phase 2 completes, the new unified API is live and functional. The old route files remain temporarily (deprecated, but working) so the existing client pages don't break until Phase 4 replaces them.

**What this phase does NOT touch:**
- No client-side changes
- No database schema changes
- No deletion of old route files (that's Phase 5)
- No changes to `server/src/lib/alexandria.ts` other than nothing (it stays as-is)
- No changes to public routes (`server/src/routes/alexandriaPublic.ts`)

**What this phase DOES change in `server/src/lib/orextravel.ts`:**
- Two constant values: `CONCURRENCY` and `DELAY_MS` (performance tuning)

---

## 2. Prerequisites

- Phase 1 is fully complete: all 5 files in `server/src/providers/` exist and compile without errors
- `npx tsc --noEmit` passes in `server/`
- The server starts normally with `npm run dev` and existing admin pages work

---

## 3. Files to Create

```
server/src/routes/admin/
└── providers.ts      # Unified provider route file (7 endpoints)
```

### 3.1 `providers.ts` — Unified route file

This file defines a single Express Router with 7 endpoints. All endpoints except the provider list require a `:id` URL parameter identifying the provider.

**Important pattern:** Every route handler that uses `:id` should call `getProvider(req.params.id)` at the top. Wrap this in a try-catch — if `getProvider` throws (unknown provider), return a 404 JSON response `{ error: "Unknown provider: <id>" }`.

**Endpoint specifications:**

**`GET /` (mounted as `/api/admin/providers`)**
- Purpose: List all registered providers with their metadata
- Implementation: Call `getAllProviders()` from the registry
- Response shape: `{ providers: [{ id, label, supportsStreaming, filterFields: FilterFieldDescriptor[], cacheStatus: CacheStatus }] }`
- No query parameters

**`GET /:id/regions`**
- Purpose: Get regions/countries/routes for a specific provider
- Implementation: Call `provider.getRegions()`
- Response shape: `{ items: ProviderRegion[] }`
- No query parameters

**`GET /:id/cache-status`**
- Purpose: Get current cache state for a provider (used by the UI's polling status bar)
- Implementation: Call `provider.getCacheStatus()`
- Response shape: the `CacheStatus` object directly

**`GET /:id/tours`**
- Purpose: Fetch filtered, sorted, paginated tours from a provider
- Query parameters:
  - Shared: `q`, `priceMin`, `priceMax`, `dateStart`, `dateEnd`, `sortBy`, `sortDir`, `page`, `limit`, `refresh`
  - Provider-specific: any additional query parameters NOT in the shared set are collected into a `providerFilters` bag
- Implementation:
  1. Parse shared filter params from `req.query` into a `UnifiedFilters` object
  2. Collect all remaining (unrecognized) query params into `providerFilters: Record<string, unknown>`
  3. Call `provider.fetchTours(filters)`
  4. Return the `ToursResult` directly
- How to collect provider-specific params: define a `SHARED_KEYS` set containing all known shared parameter names. Iterate `Object.keys(req.query)`, and for every key NOT in `SHARED_KEYS`, include it in `providerFilters`.
- Response shape: `{ total, filtered, uniqueDestinations, page, limit, totalPages, items: UnifiedTour[] }`

**`GET /:id/tours/stream`**
- Purpose: SSE streaming endpoint for progressive tour loading
- Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`
- Implementation:
  1. Send SSE `start` event: `event: start\ndata: {"total":0}\n\n`
  2. Check `provider.supportsStreaming`:
     - If YES: call `provider.streamTours(filters, onBatch)` where `onBatch` sends an SSE `batch` event with `{ items: UnifiedTour[], progress: { loaded: number } }`
     - If NO (fallback): call `provider.fetchTours({ ...filters, limit: 10000 })`, send all items as a single SSE `batch` event
  3. After completion, send SSE `done` event with `{ total: finalCount }`
  4. Call `res.end()`
- SSE format: each event is formatted as `event: <name>\ndata: <JSON>\n\n` (two trailing newlines)
- Important: Handle client disconnect — listen for `req.on("close", ...)` and abort the operation if possible

**`POST /:id/import`**
- Purpose: Import selected tours into the database
- Request body: `{ ids: string[], regionCtx?: Record<string, unknown> }`
  - `ids` is a list of `externalId` values to import
  - `regionCtx` optionally carries context like `{ zeme: 107 }` or `{ townFrom: 1, stateId: 5 }` so the provider knows which cache bucket to look in
- Implementation: Call `provider.importTours(body.ids, body.regionCtx || {})`
- Response shape: `ImportResult` — `{ ok, created, updated, total, message? }`
- Validate that `body.ids` is a non-empty array; return 400 if missing

**`POST /:id/refresh`**
- Purpose: Force-clear a provider's cache and rebuild it
- No request body required
- Implementation: Call `provider.refreshCache()`
- Response shape: `{ ok: true }`

---

## 4. Files to Modify

### 4.1 `server/src/routes/admin/index.ts`

**What to add:**
- Import the new providers route file
- Add `router.use("/providers", providersRoutes)` BEFORE the existing `/alexandria` and `/orextravel` lines

**What to keep:**
- Keep the existing `/alexandria` and `/orextravel` route registrations — they still serve the old client pages until Phase 4 replaces the UI

**Optional deprecation warning:**
Add `console.warn("[DEPRECATED] /api/admin/alexandria/* routes — use /api/admin/providers/alexandria/* instead")` as middleware before the old alexandria routes. Same for orextravel. This makes it visible in server logs when old endpoints are still being hit.

### 4.2 `server/src/index.ts`

**What to add — cache warming on startup:**

After the `app.listen()` callback fires (where it logs "SkyTravel API running on..."), add a fire-and-forget async block that:

1. Imports `getAllProviders` and `getProvider` from the providers module
2. Iterates all providers
3. For each provider, calls `provider.warmCache()` wrapped in a try-catch (errors are logged, not thrown — a failing provider should not crash the server)
4. Logs success: `"[Cache] <providerId> warmed: <itemCount> items in <duration>ms"`

**What to add — background refresh intervals:**

After the initial warm completes, set up `setInterval` for each provider:
1. For each provider, create a `setInterval(() => provider.warmCache().catch(err => console.error(...)), provider.refreshIntervalMs)`
2. Log the interval: `"[Cache] <providerId> will refresh every <intervalMinutes> min"`

**Implementation notes:**
- The warmCache calls MUST run inside the Express process (same Node.js instance as the HTTP server). This is the whole point — the PM2 cron runs in a separate process and its cache is useless.
- Use fire-and-forget (`void warmAll()`) — do NOT `await` it inside the `app.listen` callback, as that would delay server startup.
- Consider adding a `PROVIDERS_WARM_ON_STARTUP` env var check (default: `true`) so that cache warming can be disabled during local development for faster restarts.

**Why the PM2 cron is useless — important context:**
The `skytravel-alexandria-refresh` entry in `ecosystem.config.cjs` runs `npx tsx scripts/refresh-alexandria.ts` as a **separate Node.js process** via PM2's `cron_restart`. This process has its own memory space — it starts, runs the refresh-alexandria script, populates its own local variables, and exits. The Express server running via `skytravel-api` is an entirely different process with its own memory. The `feedCacheMap` inside the Express server's `alexandria.ts` route module is NEVER populated by the cron. This is the #1 root cause of slow admin page loads — every first load hits the Alexandria API cold regardless of the cron.

The fix in this phase: `setInterval` running inside the Express process warms the cache that the Express process actually reads from. The PM2 cron becomes redundant (removed in Phase 5).

### 4.3 `server/src/lib/orextravel.ts`

**Two small constant changes (performance tuning):**

1. Change `DELAY_MS` from `100` to `50`
   - Location: near the top of the file (line ~12)
   - Why: reduces the artificial delay between SAMO API calls, cutting total fetch time

2. Change `CONCURRENCY` from `3` to `6`
   - Location: near the top of the file (line ~11)
   - Why: doubles the number of parallel API calls, approximately halving total fetch time for a full Orextravel data pull

These two changes together cut the Orextravel full-fetch time roughly in half (tested: from ~4–6 minutes to ~2–3 minutes for a typical route set).

**Risk assessment:** The Orextravel SAMO API may have rate limits. If you see HTTP 429 or 503 errors after this change, revert `CONCURRENCY` to `3` and `DELAY_MS` to `100`. The conservative values were originally chosen to avoid hitting server limits; the new values are still well within typical API tolerances but monitor after deploying.

### 4.4 `server/src/config.ts` (optional)

**Optional:** Add a `providers` config section:
- `warmOnStartup: process.env.PROVIDERS_WARM_ON_STARTUP !== "false"` — defaults to true, set to "false" in local `.env` to skip cache warming during dev
- This is not strictly required but makes local development faster

---

## 5. Step-by-Step Instructions

1. **Create `server/src/routes/admin/providers.ts`** with all 7 endpoint handlers. Import `getProvider`, `getAllProviders` from `../../providers/index.js`. Import `asyncHandler` from `../../middleware/asyncHandler.js`.

2. **Define the `SHARED_KEYS` set** at the top of the route file — contains all known shared query parameter names:
   ```
   "q", "priceMin", "priceMax", "dateStart", "dateEnd", "sortBy", "sortDir", "page", "limit", "refresh"
   ```

3. **Implement each endpoint** following the specifications in section 3.1 above. Pay attention to:
   - Error handling: `getProvider()` throws on unknown ID — wrap every handler in try-catch for this
   - Request body validation: `/import` must validate `body.ids` exists and is an array
   - SSE format: exactly `event: <name>\ndata: <json>\n\n` (note the double newline)
   - All handlers should use `asyncHandler()` to propagate async errors to Express error middleware

4. **Update `server/src/routes/admin/index.ts`** — add the import and `router.use("/providers", providersRoutes)` line

5. **Update `server/src/index.ts`** — add the cache warming logic in the `app.listen()` callback:
   - Import the providers module
   - Fire-and-forget async warm function
   - Set up setInterval per provider
   - Add PROVIDERS_WARM_ON_STARTUP check if desired

6. **Update `server/src/lib/orextravel.ts`** — change `CONCURRENCY` from 3 to 6 and `DELAY_MS` from 100 to 50

7. **Verify compilation** — `npx tsc --noEmit` from `server/`

8. **Test the new endpoints** — start the dev server and manually test with curl or a REST client

---

## 6. Performance Impact

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Cache warming on startup | No warming — first admin page load hits APIs cold | Both providers warm in background immediately after server start | First page load is instant (cache already warm) |
| Background refresh interval | PM2 cron in separate process (useless) | setInterval in Express process (same memory) | Cache stays warm forever — no admin ever sees a cold load |
| Alexandria CACHE_TTL (via provider) | 5 minutes | 30 minutes | Browsing a country for 30 min never re-fetches |
| Orextravel CACHE_TTL (via provider) | 15 minutes | 60 minutes | Full-fetch is expensive; caching for 1 hour is safe since data doesn't change faster |
| Orextravel CONCURRENCY | 3 parallel requests | 6 parallel requests | ~2× faster full data pull |
| Orextravel DELAY_MS | 100ms between requests | 50ms | ~2× faster request throughput |
| Combined Orextravel fetch time | ~4–6 minutes | ~2–3 minutes | Admin sees streaming data twice as fast |

**Net result:** The admin search page goes from "20–60 second cold load" to "instant" on every load after server boot. The first load after a server restart may take 2–5 seconds (while cache is warming in background), but subsequent loads are always sub-second.

---

## 7. Verification Steps

### 7.1 Check server starts and warms caches

1. Start the server: `cd server && npm run dev`
2. Watch the console output for cache warming logs:
   - `[Cache] alexandria warmed: <N> items in <X>ms`
   - `[Cache] orextravel warmed: <N> items in <X>ms`
   - `[Cache] alexandria will refresh every 25 min`
   - `[Cache] orextravel will refresh every 45 min`
3. If PROVIDERS_WARM_ON_STARTUP is set to false in your .env, these logs won't appear — that's expected

### 7.2 Test all 7 new endpoints

**List providers:**
```
curl http://localhost:4000/api/admin/providers
```
Expected: JSON with `{ providers: [{ id: "alexandria", label: "Alexandria", supportsStreaming: false, filterFields: [...], cacheStatus: {...} }, { id: "orextravel", ... }] }`

**Get Alexandria regions:**
```
curl http://localhost:4000/api/admin/providers/alexandria/regions
```
Expected: `{ items: [{ id: 53, name: "Bulharsko", count: <N> }, { id: 107, name: "Chorvatsko", count: <N> }, { id: 147, name: "Itálie", count: <N> }] }`

**Get Orextravel regions:**
```
curl http://localhost:4000/api/admin/providers/orextravel/regions
```
Expected: `{ items: [...] }` with departure/destination route data

**Fetch Alexandria tours (filtered):**
```
curl "http://localhost:4000/api/admin/providers/alexandria/tours?zeme=107&limit=5&sortBy=price"
```
Expected: `{ total: <N>, filtered: <N>, page: 1, totalPages: <N>, items: [...] }`, each item has `source: "alexandria"`

**Fetch Orextravel tours:**
```
curl "http://localhost:4000/api/admin/providers/orextravel/tours?limit=5"
```
Expected: same shape, items have `source: "orextravel"` and include `nights`, `adults`, `children`, `roomType`

**Stream Orextravel tours (SSE):**
```
curl -N "http://localhost:4000/api/admin/providers/orextravel/tours/stream"
```
Expected: SSE events — `event: start`, then multiple `event: batch`, then `event: done`

**Get cache status:**
```
curl http://localhost:4000/api/admin/providers/alexandria/cache-status
```
Expected: `{ lastRefresh: <timestamp>, ttl: 1800000, itemCount: <N>, warm: true }`

**Import tours (requires auth — use session cookie):**
```
curl -X POST http://localhost:4000/api/admin/providers/alexandria/import \
  -H "Content-Type: application/json" \
  -d '{"ids": ["<externalId>"], "regionCtx": {"zeme": 107}}'
```

**Refresh cache:**
```
curl -X POST http://localhost:4000/api/admin/providers/alexandria/refresh
```
Expected: `{ ok: true }`

**Unknown provider (404):**
```
curl http://localhost:4000/api/admin/providers/nonexistent/tours
```
Expected: 404 with `{ error: "Unknown provider: nonexistent" }`

### 7.3 Verify old routes still work

- Navigate to the existing admin Alexandria page — it should load data normally using the old `/api/admin/alexandria/tours` endpoint
- Navigate to the existing admin Orextravel page — should work normally using `/api/admin/orextravel/tours`
- These old endpoints are deprecated but must keep working until Phase 4 replaces the UI

### 7.4 Verify Orextravel performance improvement

- Time a full Orextravel data fetch before and after the CONCURRENCY/DELAY_MS change
- The SSE stream should complete noticeably faster (roughly 2× improvement)

---

## 8. Rollback

1. **Delete** `server/src/routes/admin/providers.ts`
2. **Revert** `server/src/routes/admin/index.ts` — remove the providers import and `router.use("/providers", ...)` line
3. **Revert** `server/src/index.ts` — remove the cache warming block
4. **Revert** `server/src/lib/orextravel.ts` — change `CONCURRENCY` back to `3` and `DELAY_MS` back to `100`
5. **Revert** `server/src/config.ts` — remove the `providers` section if added
6. Restart the server — it behaves exactly as before Phase 2

Phase 1 files (`server/src/providers/`) can be kept or deleted — they have no effect if nothing imports them.

---

## 9. Common Gotchas & Pitfalls

1. **Session authentication on the new routes** — the new `/providers/*` routes are mounted under `/api/admin/` which has `requireAuth` middleware applied. Make sure the new route file is added AFTER the `requireAuth` middleware in `server/src/routes/admin/index.ts`. Looking at the current file, `requireAuth` is applied with `router.use(requireAuth)` before all the specific route registrations — so any route added after that line is protected. Just make sure `router.use("/providers", providersRoutes)` comes after `router.use(requireAuth)`.

2. **SSE and session cookies** — the SSE streaming endpoint uses `GET` and needs session auth. The client must send credentials with the SSE request. `EventSource` doesn't support `credentials: "include"` in all browsers — this is why Phase 3 uses `fetch()` with `ReadableStream` instead of `EventSource`. On the server side, the session middleware is already applied globally, so this just works.

3. **Provider-specific query params vs shared params** — when building `providerFilters` from `req.query`, be precise about what's in `SHARED_KEYS`. If you accidentally include a provider-specific key (like `zeme`) in `SHARED_KEYS`, it won't get passed to the provider. If you miss a shared key, it'll leak into `providerFilters` and the provider won't know what to do with it. The `SHARED_KEYS` set must exactly match the fields in `UnifiedFilters`.

4. **SSE response must not be buffered** — the `X-Accel-Buffering: no` header is important for nginx reverse proxies. Without it, nginx buffers the SSE response and the client sees nothing until the entire stream completes. Also set `Cache-Control: no-cache` and `Connection: keep-alive`.

5. **Fire-and-forget warmCache must not crash the server** — wrap every `warmCache()` call in try-catch. If the Alexandria API is down, the server should still start and serve requests (with empty cache). Log the error and continue.

6. **setInterval cleanup** — in development with hot-reloading, you may get multiple intervals stacking up. This isn't a production concern (PM2 doesn't hot-reload), but be aware during dev. Consider storing interval IDs for potential cleanup.

7. **Import body validation** — the `/import` endpoint receives `ids` in the request body. Validate that it's an array of strings. If someone sends `ids: "abc"` (string instead of array), the provider's `importTours()` will fail cryptically. Return a 400 with a clear message.

8. **The two CONCURRENCY/DELAY_MS changes are independent** — you can apply one without the other. If Orextravel's API starts returning errors with CONCURRENCY=6, revert it to 3 but keep DELAY_MS=50. Or vice versa. They're separate knobs.

9. **Duplicate caches on first deploy** — after deploying Phase 2, both the old route file's `feedCacheMap` AND the new provider's `feedCacheMap` will exist in memory. This briefly doubles memory usage but is harmless. The old route caches will stop being populated once the old client pages are removed in Phase 5.

10. **Don't forget `.js` extensions** — ESM imports require `.js` extension. If you import `../../providers/index` without `.js`, you'll get a runtime error: `ERR_MODULE_NOT_FOUND`.

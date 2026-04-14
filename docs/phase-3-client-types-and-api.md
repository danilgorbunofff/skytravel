# Phase 3 — Client: Unified Types & API Layer

## 1. Goal & Overview

**What this phase achieves:**
Create the client-side TypeScript types and API functions that mirror the unified provider system built in Phases 1–2. This gives the frontend a clean, typed interface to the new `/api/admin/providers/*` endpoints. It also creates a React hook (`useProviderTours`) that manages tour state, pagination, and SSE streaming.

After Phase 3 completes, the new client types, API functions, and hook exist and compile, but are not yet used by any page. The existing `AdminAlexandriaPage` and `AdminOrextravelPage` continue to work with their old API calls and types until Phase 4 builds the unified search page.

**What this phase does NOT touch:**
- No existing client pages are modified
- No existing API functions in `client/src/api.ts` are modified or deleted
- No existing admin service functions in `client/src/features/admin/services/adminApi.ts` are modified or deleted
- No server-side changes
- No route changes

---

## 2. Prerequisites

- Phase 2 is complete: the server has the `/api/admin/providers/*` endpoints live and testable
- Server is running and the new endpoints return correct JSON (verified in Phase 2)
- `npm install` has been run in `client/`
- Familiarity with the existing client API layer:
  - `client/src/api.ts` — contains both public feed functions (like `fetchAlexandriaLastMinute`) AND admin Alexandria/Orextravel functions (like `fetchAlexandriaTours`, `fetchOrextravelTours`, `importAlexandria`, etc.)
  - `client/src/features/admin/services/adminApi.ts` — contains DUPLICATE Alexandria types and functions (identical to those in `api.ts`)
  - Both files define their own `AlexandriaTour`, `OrextravelTour`, etc. types

---

## 3. Files to Create

```
client/src/
├── types/
│   └── providers.ts            # Unified client-side types
├── api/
│   └── providers.ts            # Unified API functions
└── hooks/
    └── useProviderTours.ts     # React hook for tour state management
```

### 3.1 `client/src/types/providers.ts` — Unified client-side types

This file mirrors the server types from `server/src/providers/types.ts` but adapted for the client:

**Key difference from server types:** `startDate` and `endDate` are `string` (ISO format), not `Date`. JSON serialization converts Date objects to strings, and the client receives JSON. Do NOT use `Date` here — the client may want to parse them into Date objects in specific places, but the base type should match what comes over the wire.

**Types to define:**

**`UnifiedTour`** — all fields matching server's UnifiedTour:
- Required fields: `externalId`, `destination`, `title`, `price`, `originalPrice`, `startDate` (string), `endDate` (string), `transport`, `image`, `description`, `photos` (string[]), `url`, `stars`, `board`, `source`
- Optional fields: `offersCount?`, `nights?`, `adults?`, `children?`, `roomType?`

**`UnifiedFilters`** — shared filter parameters plus an index signature:
- Named fields: `q?`, `priceMin?`, `priceMax?`, `dateStart?`, `dateEnd?`, `sortBy?`, `sortDir?`, `page?`, `limit?`, `refresh?`
- **Index signature: `[key: string]: unknown`** — this is critical. Provider-specific filters like `zeme`, `townFrom`, `stateId`, `groupBy`, `transport`, `board`, `stars` are all spread directly into this object. The index signature allows the type to accept arbitrary keys without needing to know every provider's filter names. This way, `buildFilters()` in the search page can do `{ ...sharedFilters, ...providerFilters }` and pass the result directly to `fetchProviderTours()` which serializes it into `URLSearchParams`.

**Why the flat index signature instead of a nested `providerFilters` object:** URLSearchParams doesn't handle nested objects. If provider-specific filters were nested like `{ providerFilters: { zeme: 107 } }`, you'd need to flatten them before building the query string. With a flat index signature, all filter keys live at the top level and can be spread directly into URLSearchParams. The server-side route handler already separates shared vs provider-specific params using the `SHARED_KEYS` set (defined in Phase 2).

**`FilterFieldDescriptor`** — describes a single provider-specific filter control:
- `key: string` — parameter name
- `label: string` — display label
- `type: "select" | "text" | "number" | "date" | "boolean"`
- `options?: Array<{ value: string | number; label: string }>`
- `dependsOn?: string` — key of another filter that must have a value before this one is enabled
- `defaultValue?: unknown`

**`ProviderRegion`** — a region/country/route:
- `id: number`
- `name: string`
- `count?: number`
- `meta?: Record<string, unknown>`

**`ProviderMeta`** — metadata for a registered provider:
- `id: string`
- `label: string`
- `supportsStreaming: boolean`
- `filterFields: FilterFieldDescriptor[]`
- `cacheStatus: CacheStatus`

**`CacheStatus`** — current cache state:
- `lastRefresh: number | null`
- `ttl: number`
- `itemCount: number`
- `warm: boolean`

**`ToursResult`** — response shape from the tours endpoint:
- `total: number`
- `filtered: number`
- `uniqueDestinations: number`
- `page: number`
- `limit: number`
- `totalPages: number`
- `items: UnifiedTour[]`

**`ImportResult`** — response from the import endpoint:
- `ok: boolean`
- `created: number`
- `updated: number`
- `total: number`
- `message?: string`

### 3.2 `client/src/api/providers.ts` — Unified API functions

**Important naming note:** This file lives in a NEW `client/src/api/` directory, separate from the existing `client/src/api.ts` file. The existing `api.ts` is a single file at the `src/` root level. The new `providers.ts` is inside a subfolder `api/`. Do NOT confuse the two. They coexist — the old `api.ts` stays unchanged until Phase 5.

**Base URL construction:** All functions use the same API base URL pattern as the existing `api.ts` file. Look at how the existing file constructs URLs (it likely uses a relative path or an environment variable). Use the same pattern for consistency.

**Credentials:** All fetch calls must include `credentials: "include"` to send the session cookie for authentication. The existing admin API functions already do this — follow the same pattern.

**Functions to implement:**

**`fetchProviders(): Promise<ProviderMeta[]>`**
- `GET /api/admin/providers`
- Returns the `providers` array from the response
- Simple fetch + JSON parse

**`fetchProviderRegions(providerId: string): Promise<ProviderRegion[]>`**
- `GET /api/admin/providers/${providerId}/regions`
- Returns the `items` array from the response

**`fetchProviderTours(providerId: string, filters: UnifiedFilters): Promise<ToursResult>`**
- `GET /api/admin/providers/${providerId}/tours?...`
- **Serializing filters to URLSearchParams:**
  1. Create a new `URLSearchParams` instance
  2. Iterate over all keys in the `filters` object
  3. For each key: if the value is `undefined`, `null`, or `""`, skip it
  4. Otherwise, convert to string and append: `params.append(key, String(value))`
  5. Append the params to the URL: `?${params.toString()}`
- This works because `UnifiedFilters` has a flat index signature — provider-specific filters are at the top level, not nested
- Returns the full `ToursResult` object

**`importProviderTours(providerId: string, ids: string[], regionCtx?: Record<string, unknown>): Promise<ImportResult>`**
- `POST /api/admin/providers/${providerId}/import`
- Body: `{ ids, regionCtx: regionCtx || {} }`
- Content-Type: `application/json`
- Returns `ImportResult`

**`refreshProviderCache(providerId: string): Promise<void>`**
- `POST /api/admin/providers/${providerId}/refresh`
- No body
- Returns nothing (or the `{ ok: true }` response — caller doesn't need it)

**`fetchProviderCacheStatus(providerId: string): Promise<CacheStatus>`**
- `GET /api/admin/providers/${providerId}/cache-status`
- Returns `CacheStatus` directly

**`streamProviderTours(providerId: string, filters: UnifiedFilters, callbacks: { onBatch: (items: UnifiedTour[], loaded: number) => void; onDone: (total: number) => void; onError: (error: Error) => void; }): () => void`**

This is the most complex function. It establishes an SSE connection and returns a cleanup function to abort it.

**Why NOT use `EventSource`:**
- `EventSource` does not support `credentials: "include"` in all browsers
- `EventSource` does not support custom headers
- The admin session authentication requires cookies, which `EventSource` may not send cross-origin
- Instead, use `fetch()` with `ReadableStream` to manually parse SSE events

**Implementation approach:**
1. Build the URL with query params (same serialization as `fetchProviderTours`)
2. Create an `AbortController` for cleanup
3. Call `fetch(url, { credentials: "include", signal: controller.signal })`
4. Get the response body as a `ReadableStream` via `response.body`
5. Create a `TextDecoder` and a buffer string
6. Read chunks from the stream in a loop using `reader.read()`
7. Append each decoded chunk to the buffer
8. Parse SSE events from the buffer:
   - Split on `\n\n` (double newline = event boundary)
   - For each complete event block, parse `event:` and `data:` lines
   - If event is `"batch"`: JSON-parse the data, extract `items` and `progress.loaded`, call `callbacks.onBatch(items, loaded)`
   - If event is `"done"`: JSON-parse the data, extract `total`, call `callbacks.onDone(total)`
   - If event is `"start"`: optional, can be used to reset state
9. Keep the incomplete last chunk in the buffer (it doesn't end with `\n\n` yet)
10. On stream end or abort, clean up

**Return value:** A function that calls `controller.abort()` — the caller uses this in a `useEffect` cleanup to cancel the stream on component unmount or filter change.

**Error handling:** If the fetch fails or the stream errors, call `callbacks.onError(error)`. If the abort controller cancels the request (normal cleanup), do NOT call onError.

### 3.3 `client/src/hooks/useProviderTours.ts` — Provider tours hook

This React hook manages all state related to loading and displaying tours from a provider. It's used by the unified search page (Phase 4).

**Parameters:**
- None (or optionally a configuration object) — the provider ID and filters are passed to the hook's methods, not to the hook itself

**State it manages:**
- `tours: UnifiedTour[]` — current page of tours
- `loading: boolean` — true while a paginated fetch or initial stream is in progress
- `error: string | null` — error message if the last operation failed
- `totalCount: number` — total tours in provider cache (before filtering)
- `filteredCount: number` — tours matching filters (after filtering, before pagination)
- `page: number` — current page number
- `totalPages: number` — total pages available
- `uniqueDestinations: number` — distinct destinations in filtered results
- `streaming: boolean` — true while SSE streaming is in progress
- `streamLoaded: number` — number of tours received so far during streaming

**Functions it exposes:**

**`loadTours(providerId: string, filters: UnifiedFilters): Promise<void>`**
- Sets `loading = true`, clears `error`
- Calls `fetchProviderTours(providerId, filters)`
- On success: updates `tours`, `totalCount`, `filteredCount`, `page`, `totalPages`, `uniqueDestinations`, sets `loading = false`
- On error: sets `error` to the error message, sets `loading = false`

**`loadToursStream(providerId: string, filters: UnifiedFilters): void`**
- Sets `streaming = true`, `streamLoaded = 0`, `tours = []`
- Calls `streamProviderTours(providerId, filters, { onBatch, onDone, onError })`
- `onBatch`: appends the batch items to the existing `tours` array, updates `streamLoaded`
- `onDone`: sets `streaming = false`, then calls `loadTours(providerId, filters)` to get the properly sorted/paginated result from the server. The streaming phase is just for showing progress — the final display uses the server's filtered/sorted/paginated response.
- `onError`: sets `streaming = false`, sets `error`
- **Returns the close function** from `streamProviderTours`

**Why call `loadTours` after streaming completes:** SSE streaming sends tours in the order they're fetched from the API (not sorted, not filtered, not paginated). The streaming is a UX improvement — it shows the user that data is loading progressively. Once streaming is done, the hook makes a regular paginated API call to get the properly sorted and filtered first page.

**`reset(): void`**
- Resets all state to initial values
- Useful when switching providers

**Cleanup:**
- The hook must clean up any active SSE connection when the component unmounts
- Use a `useRef` to store the SSE close function
- In a `useEffect` cleanup, call the close function if active
- Also clean up when `loadToursStream` is called again (cancel previous stream before starting new one)

---

## 4. Files to Modify

**None.** Phase 3 is purely additive. All new files, no changes to existing files.

Specifically, do NOT yet:
- Delete Alexandria/Orextravel types from `client/src/api.ts` — Phase 5 does this
- Delete duplicate types from `client/src/features/admin/services/adminApi.ts` — Phase 5 does this
- Modify any existing page or component

---

## 5. Step-by-Step Instructions

1. **Create `client/src/types/` directory** if it doesn't already exist.

2. **Create `client/src/types/providers.ts`** with all types specified in section 3.1. Start with `UnifiedTour` since other types reference it. Double-check that:
   - `startDate` and `endDate` are `string`, NOT `Date`
   - `UnifiedFilters` has the `[key: string]: unknown` index signature
   - All optional fields on `UnifiedTour` use `?` (not `| undefined`)

3. **Create `client/src/api/` directory.** Note: this is a new directory, NOT modifying the existing `client/src/api.ts` file.

4. **Create `client/src/api/providers.ts`** with all API functions. Follow the same URL construction and fetch patterns used in the existing `client/src/api.ts`. Specifically:
   - Look at how the existing file builds API URLs (check for a base URL constant or import)
   - Look at how `credentials: "include"` is applied
   - Look at error handling patterns (does it throw on non-ok responses? does it check `response.ok`?)
   - Mirror those patterns for consistency

5. **Implement `streamProviderTours`** carefully — this is the hardest function:
   - Create the AbortController
   - Use `fetch()` + `response.body.getReader()` + `TextDecoder`
   - Parse SSE events manually from the text stream
   - Handle the buffer correctly (incomplete events stay in buffer until more data arrives)
   - Return the `() => controller.abort()` cleanup function
   - Test edge cases: what if a chunk splits in the middle of an event? the buffer handles this

6. **Create `client/src/hooks/useProviderTours.ts`**:
   - Import types from `../types/providers`
   - Import API functions from `../api/providers`
   - Use `useState` for all state variables
   - Use `useRef` to track the SSE close function for cleanup
   - Use `useCallback` for `loadTours`, `loadToursStream`, and `reset` to avoid unnecessary re-renders
   - Implement cleanup in `useEffect` return

7. **Verify compilation:**
   ```
   cd client && npx tsc --noEmit
   ```
   All new files must compile. Existing files must still compile — specifically:
   - `client/src/pages/HomePage.tsx` must still compile (it uses `fetchAlexandriaLastMinute` from `api.ts`)
   - `client/src/pages/AdminAlexandriaPage.tsx` must still compile (it uses old types)
   - `client/src/pages/AdminOrextravelPage.tsx` must still compile (it uses old types)

---

## 6. Performance Impact

Phase 3 has **no runtime performance impact** — these are new files that aren't imported by any running component yet. They take effect when Phase 4 builds the search page.

However, the types and API layer are designed with performance in mind:
- The flat `UnifiedFilters` type avoids the overhead of deep-cloning or flattening nested objects when building URLSearchParams
- The `streamProviderTours` function uses native `ReadableStream` instead of polling, minimizing HTTP overhead
- The `useProviderTours` hook accumulates streaming batches into state without re-fetching — efficient incremental rendering

---

## 7. Verification Steps

1. **TypeScript compilation:**
   ```
   cd client && npx tsc --noEmit
   ```
   Zero errors. Both new and existing files compile.

2. **Existing pages still work:**
   - Start the dev server: `cd client && npm run dev`
   - Open the admin panel
   - Navigate to the Alexandria page — should work identically to before
   - Navigate to the Orextravel page — should work identically to before
   - Navigate to the homepage — the Alexandria last-minute feed section should still load

3. **Import verification:**
   Temporarily add a test component or console log that imports from the new modules and verifies the types are accessible:
   - `import type { UnifiedTour } from "../types/providers"` — should resolve
   - `import { fetchProviders } from "../api/providers"` — should resolve
   - `import { useProviderTours } from "../hooks/useProviderTours"` — should resolve
   Remove the test code after verification.

4. **No bundle size regression:**
   Since the new files aren't imported by any active component, they should be tree-shaken out of the production build. Run `npm run build` and verify the bundle size hasn't changed significantly.

---

## 8. Rollback

Since Phase 3 only creates new files:

1. Delete `client/src/types/providers.ts`
2. Delete `client/src/api/providers.ts` (and the `api/` directory if it's empty)
3. Delete `client/src/hooks/useProviderTours.ts`
4. That's it — no existing code was modified

---

## 9. Common Gotchas & Pitfalls

1. **Do NOT put `providers.ts` inside the existing `client/src/api.ts` file** — `api.ts` is a single file, not a directory. Create a new `api/` directory next to it. They coexist: `client/src/api.ts` (old, legacy) and `client/src/api/providers.ts` (new, unified). Some bundlers may complain about having both `api.ts` and `api/` in the same directory — if this happens, consider renaming the directory to `client/src/api-providers/` or similar.

2. **Date types: string, not Date** — the JSON responses from the server have ISO date strings. The `UnifiedTour.startDate` and `UnifiedTour.endDate` must be `string`. If you need `Date` objects in a component, parse them at the point of use: `new Date(tour.startDate)`. Do NOT add a transform step in the API layer — keep the types honest about what comes over the wire.

3. **The `[key: string]: unknown` index signature on `UnifiedFilters`** — TypeScript requires that all named properties are assignable to the index signature's value type. Since the index signature uses `unknown`, all named properties (which are `string | number | boolean | undefined`) are compatible. If you change the index signature to `string` or `number`, the named properties will conflict. Keep it as `unknown`.

4. **SSE parsing edge cases:**
   - A chunk from the ReadableStream may contain zero, one, or multiple complete SSE events
   - A chunk may split in the middle of an event (e.g. you get `event: batch\nda` in one chunk and `ta: {"items":...}\n\n` in the next)
   - Always buffer incomplete data and only process events terminated by `\n\n`
   - Some SSE events have `: comment` lines (starting with colon) — ignore them

5. **AbortController and React strict mode** — in React 18+ strict mode (dev only), effects run twice. This means `useEffect` cleanup runs once immediately, aborting the stream. Solutions:
   - The stream is started by user action (clicking a load button), not by the effect itself, so this shouldn't be an issue
   - If the stream IS started in an effect, use a ref to track whether the component is mounted

6. **`credentials: "include"` is mandatory** — without it, the session cookie isn't sent, and every request returns 401. The existing API functions in `api.ts` already use this — make sure every `fetch()` call in the new `providers.ts` does too.

7. **Error response handling** — the server returns JSON error bodies like `{ error: "..." }`. The API functions should check `response.ok` and, if false, extract the error message from the JSON body and throw a descriptive error. Don't just throw `"Request failed"` — include the server's error message for debugging.

8. **Do NOT import from `server/src/providers/types.ts`** — even though the types are similar, the client and server are separate build targets. The client types in `client/src/types/providers.ts` must be independently defined, not imported from the server. If you want to keep them in sync, that's a manual process (or use a shared package in a monorepo setup, but this project isn't a monorepo).

9. **Avoid re-exporting old types** — do NOT re-export `AlexandriaTour` or `OrextravelTour` from the new types file. The new unified system uses `UnifiedTour` exclusively. Old types continue to exist in `api.ts` for backward compatibility until Phase 5 removes them.

10. **Hook state immutability** — when appending streaming batches to the `tours` array, use `setTours(prev => [...prev, ...batch])` — never mutate the existing array. React state must be treated as immutable for correct re-rendering.

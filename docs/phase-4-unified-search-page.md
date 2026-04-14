# Phase 4 — Client: Unified Admin Search Page

## 1. Goal & Overview

**What this phase achieves:**
Build a single `AdminSearchPage` that replaces both `AdminAlexandriaPage` and `AdminOrextravelPage`. This is the user-facing payoff of all previous phases — one page to search, filter, and import tours from any registered provider.

The page uses the unified types, API functions, and hook from Phase 3. It dynamically renders provider-specific filters based on `FilterFieldDescriptor[]` from the server. It handles both paginated fetch and SSE streaming. It shows cache status, import controls, and a detail drawer.

After Phase 4 completes, the unified search page is live at `/admin/search`. The old pages remain accessible (via redirects) until Phase 5 removes them.

**What this phase does NOT touch:**
- No server-side changes
- No database changes
- No deletion of old pages (Phase 5)
- No changes to public-facing pages (HomePage, etc.)

---

## 2. Prerequisites

- Phase 3 is complete: `client/src/types/providers.ts`, `client/src/api/providers.ts`, and `client/src/hooks/useProviderTours.ts` exist and compile
- The server is running with Phase 2's unified `/api/admin/providers/*` endpoints
- All 7 endpoints have been manually verified (Phase 2 verification)
- Familiarity with the existing UI patterns:
  - `AdminAlexandriaPage.tsx` — country tabs, filter bar, tour table with pagination, detail drawer, import controls
  - `AdminOrextravelPage.tsx` — route selection, SSE streaming progress, filter bar, tour table, detail drawer, import controls
  - `AdminLayout.tsx` — sidebar nav with per-page items
  - shadcn/ui components in use: Button, Input, Select, Badge, Card, Table, Dialog, Tabs, Separator, Switch, Label
- Understanding of React Router's `useSearchParams` hook for URL state management

---

## 3. Files to Create

```
client/src/
├── pages/
│   └── AdminSearchPage.tsx              # Main unified search page
└── components/
    └── admin/
        ├── ProviderFilterRenderer.tsx    # Dynamic filter controls
        └── TourDetailDrawer.tsx          # Tour detail side panel
```

### 3.1 `client/src/pages/AdminSearchPage.tsx` — Main unified search page

This is the largest new component. It combines the UX patterns from both existing admin pages into one unified interface.

**All state this component manages:**

Provider & data loading state:
- `providers: ProviderMeta[]` — list of all available providers (fetched once on mount)
- `selectedProviderId: string` — currently active provider ID (read from URL params on mount)
- `regions: ProviderRegion[]` — regions for the selected provider
- `selectedRegion: ProviderRegion | null` — currently selected region/country/departure
- `selectedSubRegion: ProviderRegion | null` — second-level selection (used by Orextravel's departure→destination pattern)

Filter state:
- `searchQuery: string` — text search input (maps to `q` filter)
- `priceMin: string` — min price input (string for controlled input, converted to number for API)
- `priceMax: string` — max price input
- `dateStart: string` — start date input (YYYY-MM-DD format)
- `dateEnd: string` — end date input
- `sortBy: string` — sort field ("price" or "date", default "price")
- `sortDir: "asc" | "desc"` — sort direction (default "asc")
- `providerFilters: Record<string, unknown>` — provider-specific filter values (populated by ProviderFilterRenderer)
- `limit: number` — items per page (default 50)

Pagination (from useProviderTours hook):
- `page`, `totalPages`, `totalCount`, `filteredCount`, `uniqueDestinations` — all from the hook

Selection & import state:
- `selected: Set<string>` — set of selected tour `externalId` values
- `importing: boolean` — true during import operation
- `importResult: ImportResult | null` — result of last import operation

Detail drawer state:
- `detailTour: UnifiedTour | null` — tour currently shown in the detail drawer (null = closed)

Cache status:
- `cacheStatus: CacheStatus | null` — polled every 30 seconds via setInterval

**Component lifecycle & data flow:**

**On mount:**
1. Call `fetchProviders()` → store in `providers` state
2. Read `?provider=` from URL via `useSearchParams()`
3. If URL has a provider param and it matches a registered provider, select it
4. Otherwise, auto-select the first provider from the list
5. Trigger provider change (step below)

**On provider change (whenever `selectedProviderId` changes):**
1. Clear `providerFilters` to empty object — **critical**: old provider's filters must not leak to the new provider. If the user had `zeme=107` set for Alexandria and switches to Orextravel, that filter must be cleared.
2. Clear `selected` set
3. Clear `detailTour`
4. Reset pagination to page 1
5. Call `fetchProviderRegions(selectedProviderId)` → store in `regions`
6. Call `fetchProviderCacheStatus(selectedProviderId)` → store in `cacheStatus`
7. Auto-select the first region (if regions are not empty)
8. Trigger tour load (see below)
9. Update the URL search param: `setSearchParams({ provider: selectedProviderId })`

**Tour loading logic:**
- Find the selected provider's metadata to check `supportsStreaming`
- If `supportsStreaming` is true AND this is the initial load or region changed: call `loadToursStream()` from the hook, then after streaming completes, call `loadTours()` for the sorted/paginated view
- If `supportsStreaming` is false OR this is a filter/sort/page change: call `loadTours()` directly

**`buildFilters()` function:**
This function assembles the complete filter object to pass to `loadTours()` or `loadToursStream()`:
1. Start with shared filters: `q`, `priceMin`, `priceMax`, `dateStart`, `dateEnd`, `sortBy`, `sortDir`, `page`, `limit`
2. Spread provider-specific filters from `providerFilters` state
3. Add region context — this is provider-specific:
   - For Alexandria: add `zeme: selectedRegion?.id` if a region is selected
   - For Orextravel: add `townFrom: selectedRegion?.id` and `stateId: selectedSubRegion?.id` if selected
   - For future providers: use a generic fallback — check if the provider's filterFields include a region-related key and use the selected region accordingly
   - **Alternative approach (simpler):** Don't hardcode provider logic here. Instead, have the region selector automatically write to providerFilters when a region is selected. For example, when the user clicks a region tab for Alexandria, set `providerFilters.zeme = region.id`. For Orextravel, set `providerFilters.townFrom = region.id`. This way, `buildFilters()` just merges shared + providerFilters without any provider-specific code.
4. Return the assembled `UnifiedFilters` object

**UI Layout (top to bottom):**

**1. Provider selector bar (top of page)**
- Render as tab buttons (one per provider) or a dropdown
- Show `provider.label` as the button text
- Highlight the currently selected provider
- Clicking a different provider triggers the provider change flow

**2. Region selector (below provider selector)**
- **Smart rendering based on provider data pattern:**
  - If regions are flat (Alexandria pattern — each region is a standalone country): render as horizontal tab buttons with count badges. Example: `Bulharsko (45)  |  Chorvatsko (120)  |  Itálie (33)`
  - If regions have nested departure/destination structure (Orextravel pattern): render as two-level selector. First row = departure cities (e.g. "Praha", "Brno"). Second row (appears after selecting departure) = destination countries filtered by the selected departure.
- **How to detect the pattern:** Check if any region has `meta.departureName` or a similar key. Or: if the provider's filter fields include a `dependsOn` relationship (e.g. `stateId` depends on `townFrom`), render two levels. Otherwise, render one level.
- If no regions are available (provider returned empty list), show nothing.
- Selecting a region triggers a tour reload.

**3. Cache status bar**
- Show: "Refreshed X min ago" (computed from `cacheStatus.lastRefresh`), or "Not yet warmed" if `lastRefresh` is null
- Show: `cacheStatus.itemCount` items cached
- Show: "Refresh" button — calls `refreshProviderCache(selectedProviderId)` then reloads cache status and tours
- If `cacheStatus.warm` is false, show a warning indicator
- **Polling:** Set up a `setInterval` in `useEffect` that calls `fetchProviderCacheStatus()` every 30 seconds and updates `cacheStatus` state. Clean up the interval on unmount.

**4. Shared filter form**
- Search input (`q`) — debounced text input, triggers reload after 300ms of inactivity
- Price range: two number inputs (min, max)
- Date range: two date inputs (start, end)
- Sort: select for sortBy ("Cena" / "Datum") + toggle button for sortDir (asc/desc)
- All filter changes trigger a tour reload (with debounce for text inputs)

**5. Provider-specific filter area (rendered by `ProviderFilterRenderer`)**
- Pass `provider.filterFields`, current `providerFilters` values, and an `onChange` callback
- The `ProviderFilterRenderer` component (section 3.2) renders the appropriate controls
- Filter changes update `providerFilters` state and trigger a tour reload

**6. Stats bar**
- Total tours: `totalCount`
- Filtered: `filteredCount`
- Unique destinations: `uniqueDestinations`
- Cheapest price: derive from `tours[0].price` when sorted by price ascending

**7. Streaming progress bar (conditional)**
- Only show when `streaming` is true (from the hook)
- Show: "Loading tours... X loaded" with a progress indicator (can be an animated bar or just text)
- Disappears when streaming completes

**8. Tour table**
- Columns:
  - **Always visible:** Image (thumbnail or placeholder icon), Destination + Hotel name (two lines), Price (formatted with "Kč" suffix), Dates (startDate – endDate), Transport, Source badge
  - **Conditional columns** — only show if any tour in the current page has a non-undefined value for the field:
    - Nights column: show if `tours.some(t => t.nights !== undefined)`
    - Pax column (adults + children): show if `tours.some(t => t.adults !== undefined)`
    - Board column: always show (both providers have board)
    - Stars column: show if `tours.some(t => t.stars && t.stars !== "")`
- How to detect conditional columns: compute a `visibleColumns` set in a `useMemo` that scans the current `tours` array for non-undefined values in optional fields
- Row click: opens the detail drawer with that tour
- Selection checkbox: per-row checkbox, checked if `selected.has(tour.externalId)`
- Header checkbox: toggles all tours on the current page

**9. Pagination controls (below table)**
- Previous / Next buttons
- Page indicator: "Page X of Y"
- Items per page selector: 25 / 50 / 100
- Page changes trigger `loadTours()` with the new page number

**10. Bulk import bar (sticky bottom or above table)**
- Show when `selected.size > 0`
- Text: "Import selected (N)" button
- On click: call `importProviderTours(selectedProviderId, [...selected], regionContext)` where `regionContext` is `{ zeme: selectedRegion?.id }` for Alexandria or `{ townFrom: selectedRegion?.id, stateId: selectedSubRegion?.id }` for Orextravel
- Show import result: "Created X, Updated Y" badge after completion
- Clear selection after successful import

### 3.2 `client/src/components/admin/ProviderFilterRenderer.tsx` — Dynamic filter controls

**Props:**
- `fields: FilterFieldDescriptor[]` — the filter field descriptors from the provider
- `values: Record<string, unknown>` — current filter values (keyed by `field.key`)
- `onChange: (key: string, value: unknown) => void` — callback when a filter value changes

**Rendering logic:**

Render a grid (CSS grid or flex) of filter controls. For each `field` in `fields`:

- **`type: "select"`:**
  - Render a shadcn `Select` component
  - Label from `field.label`
  - Options from `field.options` — map each to a `SelectItem`
  - Include an "All" / empty option at the top to clear the filter
  - Controlled value from `values[field.key]`

- **`type: "text"`:**
  - Render a shadcn `Input` with `type="text"`
  - Label from `field.label`
  - Controlled value from `values[field.key]`

- **`type: "number"`:**
  - Render a shadcn `Input` with `type="number"`
  - Label from `field.label`
  - Controlled value from `values[field.key]`

- **`type: "date"`:**
  - Render a native `<input type="date" />` or a shadcn date input
  - Label from `field.label`

- **`type: "boolean"`:**
  - Render a shadcn `Switch` component
  - Label from `field.label`

**`dependsOn` logic:**
- If `field.dependsOn` is set AND `values[field.dependsOn]` is falsy (undefined, null, empty string, 0):
  - Render the control as **disabled** (grayed out)
  - If the control currently has a value, **clear it** by calling `onChange(field.key, undefined)` — this prevents stale dependent filter values
  - Show a tooltip or helper text like "Select [parentField.label] first"
- If `field.dependsOn` is set AND `values[field.dependsOn]` is truthy:
  - Render the control as enabled
  - If the field has dynamic options that depend on the parent value (like Orextravel's destinations filtered by departure city), the options should already be set correctly by the parent component updating the filter field options

### 3.3 `client/src/components/admin/TourDetailDrawer.tsx` — Tour detail side panel

**Props:**
- `tour: UnifiedTour | null` — the tour to display (null = drawer is closed)
- `onClose: () => void` — callback to close the drawer
- `onImport?: (externalId: string) => void` — optional callback to import this single tour

**Layout:**
- Fixed-position panel on the right side of the screen
- Semi-transparent backdrop (click backdrop to close)
- Slide-in animation (optional)
- Close button (X) in top-right corner
- Width: ~400–500px, full height

**Content sections (top to bottom):**

1. **Header:**
   - Source badge with provider-specific color (e.g. Alexandria = blue, Orextravel = green). Use `tour.source` to determine color.
   - Tour title (`tour.title`)
   - Destination (`tour.destination`)

2. **Primary image:**
   - If `tour.image` is non-empty, show the image full-width
   - If empty, show a placeholder

3. **Key details grid:**
   - Price: formatted with "Kč" suffix, show original price with strikethrough if different from current price
   - Dates: formatted range "DD.MM.YYYY – DD.MM.YYYY" (parse from ISO string)
   - Transport: transport type with icon if applicable
   - Stars: show star rating if non-empty
   - Board: board type

4. **Conditional sections** — only render if the field has a value:
   - **Nights block:** Only if `tour.nights !== undefined`. Show "X nocí" (X nights)
   - **Pax block:** Only if `tour.adults !== undefined`. Show "Adults: X" and if `tour.children !== undefined`, "Children: Y"
   - **Room type:** Only if `tour.roomType` is defined and non-empty. Show room type text.
   - **Offers count:** Only if `tour.offersCount !== undefined`. Show "X nabídek" (X offers) — appears in Alexandria group-by-destination mode
   - **Description:** Only if `tour.description` is non-empty. Show as paragraph text.

5. **Photos gallery:** Only if `tour.photos.length > 0`
   - Render as a horizontal scrollable strip or a grid
   - Click on a photo to open a lightbox/modal view (can be simple: full-screen overlay with the image)
   - Show photo count label: "Fotografie (X)"

6. **External link:** Only if `tour.url` is non-empty
   - Render as a button/link: "Zobrazit na [source name]" — opens in a new tab
   - URL should be the `tour.url` value

7. **Import button (footer):**
   - Only show if `onImport` prop is provided
   - Button text: "Importovat zájezd" (Import tour)
   - On click: calls `onImport(tour.externalId)`
   - Disable while importing

---

## 4. Files to Modify

### 4.1 `client/src/features/admin/AdminRoutes.tsx`

**What to add:**
- Lazy import for `AdminSearchPage`
- Route: `<Route path="search" element={<AdminSearchPage />} />`
- Redirect routes for backward compatibility:
  - `<Route path="alexandria" element={<Navigate to="/admin/search?provider=alexandria" replace />} />`
  - `<Route path="orextravel" element={<Navigate to="/admin/search?provider=orextravel" replace />} />`
- Import `Navigate` from `react-router-dom` if not already imported

**What to keep:**
- All existing routes (tours, settings, statistics, etc.)
- The lazy imports for `AdminAlexandriaPage` and `AdminOrextravelPage` — they still exist as files; removing them happens in Phase 5

### 4.2 `client/src/components/AdminLayout.tsx`

**What to change:**
- Remove the two separate nav items for Alexandria and Orextravel
- Add a single new nav item:
  - Label: "Vyhledávání" (Czech for "Search")
  - Icon: Search icon (from Lucide React — `import { Search } from "lucide-react"`)
  - Path: `/admin/search`
- Place it in the same position as the old Alexandria item (or wherever makes sense in the nav order)

**What to keep:**
- All other nav items (Dashboard, Tours, Leads, Campaigns, Settings, Statistics, etc.)
- The layout structure, mobile menu, header — all unchanged

---

## 5. Step-by-Step Instructions

1. **Create `client/src/components/admin/` directory** if it doesn't exist.

2. **Create `ProviderFilterRenderer.tsx` first** — it's a simple, self-contained component with no page-level dependencies. Implement all 5 field types and the `dependsOn` logic.

3. **Create `TourDetailDrawer.tsx` second** — another self-contained component. Implement all conditional sections. Use the same date formatting patterns as the existing pages.

4. **Create `AdminSearchPage.tsx` third** — this is the big one. Build it incrementally:

   a. **Start with the provider selector** — fetch providers on mount, render tab buttons, handle provider selection + URL state.

   b. **Add region selector** — fetch regions on provider change, render appropriate UI (flat tabs or two-level). Wire up region selection to trigger tour reload.

   c. **Add tour loading** — use the `useProviderTours` hook. On provider/region change, call `loadTours()` or `loadToursStream()` depending on `supportsStreaming`.

   d. **Add the tour table** — render the core columns first (destination, price, dates), then add conditional columns.

   e. **Add shared filter form** — search, price, date, sort controls. Wire up to trigger tour reload.

   f. **Add ProviderFilterRenderer** — pass the selected provider's `filterFields`, wire up value changes.

   g. **Add pagination** — page controls below the table.

   h. **Add selection + import** — checkboxes, header checkbox, import button.

   i. **Add detail drawer** — click a row to open, wire up single-tour import.

   j. **Add cache status bar** — fetch on mount, poll every 30 seconds, refresh button.

   k. **Add streaming progress** — conditional progress bar when `streaming` is true.

   l. **Add stats bar** — total, filtered, unique destinations.

5. **Update `AdminRoutes.tsx`** — add the lazy import, route, and redirect routes.

6. **Update `AdminLayout.tsx`** — swap the two nav items for the single "Vyhledávání" item.

7. **Test the full flow end-to-end** (see verification steps below).

---

## 6. Performance Impact

The unified page is designed to be **equal or faster** than the old separate pages:

| Aspect | Old (two pages) | New (unified page) |
|--------|-----------------|-------------------|
| Initial load | Cold API call every time | Cached data (warm from Phase 2) |
| Provider switch | Navigate to different page, full remount | Client-side state change, API call from warm cache |
| Filter change | Full re-render + API call | Only API call + list re-render |
| Streaming (Orextravel) | Custom SSE logic per page | Shared streaming hook, same UX |
| Bundle size | Two large page components | One page + two small components |
| Cache status | Not visible | Visible in UI, manual refresh available |

---

## 7. Verification Steps

### 7.1 Basic page load

1. Navigate to `/admin/search`
2. Confirm the provider list loads (should see Alexandria and Orextravel tabs/buttons)
3. Confirm the first provider auto-selects
4. Confirm regions load for the selected provider
5. Confirm tours appear in the table

### 7.2 Provider switching

1. Click the Orextravel tab (if Alexandria is selected, or vice versa)
2. Confirm regions change (countries → departure cities or vice versa)
3. Confirm tours reload from the new provider
4. Confirm provider-specific filter controls change
5. Confirm URL updates to `?provider=orextravel`
6. Confirm previous provider's filter values are cleared

### 7.3 Region selection

1. For Alexandria: click different country tabs, confirm tours reload for that country
2. For Orextravel: click a departure city, confirm destinations appear and are clickable, confirm tours reload for that route
3. Confirm region count badges are visible and reasonable

### 7.4 Shared filters

1. Type in the search box, confirm tours filter after debounce
2. Set a price range, confirm tours filter
3. Set a date range, confirm tours filter
4. Change sort to "Date ascending", confirm order changes
5. Clear all filters, confirm all tours return

### 7.5 Provider-specific filters

1. For Alexandria: select a transport type, confirm tours filter; select a board type, confirm
2. For Orextravel: confirm the departure selector works; confirm destination selector is disabled until departure is selected; select departure, then destination, confirm tours reload

### 7.6 Streaming (Orextravel)

1. Switch to Orextravel
2. Select a departure with many destinations
3. Confirm the streaming progress indicator appears
4. Confirm tours appear progressively as batches arrive
5. Confirm the final table shows properly sorted/paginated results after streaming completes

### 7.7 Tour detail

1. Click a tour row, confirm the detail drawer slides open on the right
2. Confirm all fields are displayed (title, destination, price, dates, transport, stars, board)
3. For Orextravel tours: confirm nights, adults, children, room type are shown
4. For tours with photos: confirm photo gallery appears
5. Click the external link, confirm it opens in a new tab
6. Close the drawer (X button or backdrop click)

### 7.8 Import

1. Select 2–3 tours via checkboxes
2. Click "Import selected (3)"
3. Confirm success message ("Created: 2, Updated: 1")
4. Navigate to the main tours page (`/admin/tours`), confirm the imported tours appear

### 7.9 Import single tour from drawer

1. Open a tour detail drawer
2. Click "Import tour" button
3. Confirm import succeeds and result is shown

### 7.10 Cache status

1. Check the cache status bar shows "Refreshed X min ago"
2. Click "Refresh" button
3. Confirm status updates and tours reload
4. Wait 30 seconds, confirm the status time updates automatically

### 7.11 Backward compatibility

1. Navigate to `/admin/alexandria` — should redirect to `/admin/search?provider=alexandria`
2. Navigate to `/admin/orextravel` — should redirect to `/admin/search?provider=orextravel`
3. Check navigation sidebar — should show single "Vyhledávání" item instead of two separate items

### 7.12 Pagination

1. Set limit to 25
2. Navigate to page 2, confirm different tours show
3. Apply a filter that reduces results to < 25, confirm pagination shows "Page 1 of 1"

---

## 8. Rollback

1. **Delete** `client/src/pages/AdminSearchPage.tsx`
2. **Delete** `client/src/components/admin/ProviderFilterRenderer.tsx`
3. **Delete** `client/src/components/admin/TourDetailDrawer.tsx`
4. **Revert** `client/src/features/admin/AdminRoutes.tsx` — remove the search route, redirect routes, and Navigate import
5. **Revert** `client/src/components/AdminLayout.tsx` — restore the two separate nav items for Alexandria and Orextravel

After rollback, the old pages work exactly as before (they were never modified).

---

## 9. Common Gotchas & Pitfalls

1. **Provider filter leakage** — when switching providers, ALL provider-specific filter state must be cleared. If the user sets `zeme=107` for Alexandria and switches to Orextravel, the `zeme` filter must not be sent to the Orextravel endpoint (it would be ignored, but it's incorrect). Reset `providerFilters` to `{}` on every provider change.

2. **Region selector pattern detection** — how does the page know whether to render one level or two levels of region tabs? Options:
   - Check the provider's `filterFields` for a `dependsOn` relationship (Orextravel has `stateId` depending on `townFrom`)
   - Check if regions have `meta.departureName` or similar
   - Hardcode by provider ID (simplest but least extensible)
   - **Recommended:** Check `filterFields` for `dependsOn` — this is part of the provider contract and works for future providers too

3. **SSE streaming + pagination conflict** — during streaming, the `tours` array accumulates all incoming data. But when streaming completes, `loadTours()` is called to get the sorted/paginated first page. The `tours` state is then overwritten with the paginated result. Make sure the UI transitions cleanly: show streaming count during stream, then show the final table.

4. **Debounced search input** — the text search filter should be debounced (300ms) to avoid hammering the API on every keystroke. Use a `useRef` with `setTimeout` / `clearTimeout`, or a `useDebouncedValue` custom hook.

5. **Selected tours persist across page changes** — the `selected` Set should be cleared when `page` changes (otherwise the user might think tours on the new page are selected when they're not visible). Or: keep selection across pages for a power-user experience, but visually distinguish "selected on another page" vs "selected and visible".

6. **Date formatting** — `UnifiedTour.startDate` is an ISO string like `"2026-07-15T00:00:00.000Z"`. Format it for display as `"15.07.2026"` (Czech date format). Use `new Date(tour.startDate).toLocaleDateString("cs-CZ")` or a manual formatter.

7. **Empty state** — handle the case where a provider has no cached data (cache not yet warm). Show a clear message: "Data se načítají..." (Loading data...) with an option to trigger a cache refresh.

8. **Large tour counts** — some providers can return thousands of tours. The table should render only the current page (50 items by default). Never render all tours at once — this will freeze the browser.

9. **Image loading** — tour images are external URLs (from Alexandria or Orextravel CDNs). Use `loading="lazy"` on `<img>` tags. Add an `onError` handler to show a placeholder if the image fails to load.

10. **Mobile responsiveness** — the existing admin pages are responsive (the `AdminLayout` handles mobile nav). The new search page should work on mobile too. Consider:
    - Stack the filter form vertically on narrow screens
    - Collapse the tour table to a card layout on mobile
    - Make the detail drawer full-width on mobile instead of side panel
    - Region tabs should scroll horizontally on narrow screens

11. **Type narrowing for tour fields** — when rendering conditional columns, use type narrowing: `if (tour.nights !== undefined)` rather than `if (tour.nights)`. A value of `0` nights would be falsy but should still be rendered (though unlikely for actual tour data).

12. **`useSearchParams` caveats** — React Router's `useSearchParams` triggers a re-render on every URL change. When setting the provider param, use `replace: true` (via `setSearchParams(params, { replace: true })`) to avoid polluting the browser history with every provider switch.

13. **Concurrent API calls on mount** — `fetchProviders()`, `fetchProviderRegions()`, `fetchProviderCacheStatus()`, and the first `loadTours()` call all happen close together. They should be sequential (each depends on the previous result), NOT parallel. Use `async/await` in a `useEffect` or a state machine pattern to orchestrate them.

14. **shadcn/ui imports** — the project uses shadcn/ui components from `client/src/components/ui/`. Import from there, not from `@shadcn/ui` or `@radix-ui` directly. Check existing pages for the correct import paths.

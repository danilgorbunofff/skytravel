# Search Flow Review — `/search` (tour search page)

Date: 2026-08-29 · Scope: search input → filters → results display
Status: **findings only, no code changed**

> Note: there is no `/tour` route. The tour search page is `src/pages/SearchPage.tsx`,
> routed at `/search` (`src/App.tsx:23`). Review covers that page and
> `src/features/search/**`.

## Architecture as built

```
SearchPage.tsx  (composition root)
 ├── useSearchFilters()   URL = source of truth (useSearchParams) + shadow local input state
 ├── useSearchResults()   fetch on debounced filter key (300 ms) + AbortController
 ├── useBootstrap()       providers + destinations (cached)
 └── useOfferGroups()     tour detail modal + offer-group fetch (aborted per key)
      ↓
 SearchHero → SearchAutocomplete        (input layer)
 SearchFilters → PriceRangeSlider etc.  (filter layer)
 SearchResultsSection → PublicTourCard  (display layer)
```

Good decisions already in place: URL as single source of truth, `AbortController` on the
main fetch and on offer-group fetches, debounce on the filter key, `memo` on
`PublicTourCard`, lazy `CompareView`, `loading="lazy"` on card images.

The problems below are mostly in the seams between those pieces.

---

# 1. Search input layer

### I-1 · Enter key is swallowed whenever suggestions are visible — CRITICAL

`src/features/search/components/SearchAutocomplete.tsx:191-196`

```ts
case "Enter":
  e.preventDefault();                      // ← always prevents submit
  if (activeIndex >= 0 && activeIndex < suggestions.length) {
    handleSelectItem(suggestions[activeIndex]);
  }
  break;
```

`onChange` resets `activeIndex` to `-1` on every keystroke (line 243). So after typing,
`activeIndex === -1`, the guard is false, **but `preventDefault()` already ran** — the form
never submits.

Impact: user types `Řecko`, waits for the dropdown, presses Enter → nothing happens. The
search only fires if they click the GO button, or if no suggestion matched. This is the
primary search affordance on the page.

Fix: only `preventDefault()` when a suggestion is actually selected; otherwise let the event
bubble so the `<form onSubmit>` runs.

### I-2 · Selecting a "recent search" populates the box but never searches — HIGH

`src/pages/SearchPage.tsx:604-609`

```ts
onDestinationSelect={(slug, label) => {
  filters.setQuery(label);
  if (slug) { filters.updateParams({ destinationSlug: slug, q: null, page: 1 }); }
}}
```

Recent-search suggestions have no `slug` (`SearchAutocomplete.tsx:143-147`), so only local
`setQuery` runs — no URL change, no fetch. Combined with I-1, clicking a recent search and
pressing Enter does nothing at all.

Fix: for slug-less suggestions commit `q` to the URL (`updateParams({ q: label, page: 1 })`).

### I-3 · Recent searches are never written — the feature is dead — MEDIUM

`src/features/search/components/SearchAutocomplete.tsx:48-60`

`saveRecentSearch()` is exported (`components/index.ts:8`) but **never called anywhere**.
`getRecentSearches()` always returns `[]`, so the recents branch never renders.

Fix: call it in `submitSearch` / on successful result, and remove it from the public barrel
if unused.

### I-4 · Suggestions recomputed on every render, including localStorage + JSON.parse — MEDIUM

`SearchAutocomplete.tsx:107-151`

The suggestion list is a bare IIFE in the render body — no `useMemo`. Each render:

- `getRecentSearches()` → `localStorage.getItem` + `JSON.parse` (line 134, called again in JSX at 326/328)
- `normalize()` (NFD + regex diacritic strip) over every destination × 2 fields

This component re-renders on every keystroke and on every parent render.

Fix: `useMemo` the suggestion computation on `[debouncedValue, destinations]`; hoist
`getRecentSearches()` out of render (or memoize on a state counter).

### I-5 · `useCallback` on `handleKeyDown` is defeated — MEDIUM

`SearchAutocomplete.tsx:171-204`

Depends on `suggestions`, which is a fresh array identity every render (I-4), so the callback
is recreated anyway. Memoization here is decorative.

Fix: resolves together with I-4.

### I-6 · `highlightMatch` slices the original string with normalized indices — LOW

`SearchAutocomplete.tsx:214-228`

`normalize()` does NFD + diacritic removal **and `.trim()`**, then the returned
`matchStart`/`matchEnd` are used to slice the _original_ text. Any length change from
normalization (leading/trailing whitespace from `.trim()`, or multi-codepoint expansions)
shifts the highlight. Czech labels are mostly safe, but it is wrong in principle.

Fix: highlight against the normalized string, or build the match on the original with a
normalization-aware index map.

### I-7 · URL-sync effect wipes in-progress hero input — HIGH

`src/features/search/hooks/useSearchFilters.ts:97-104`

```ts
useEffect(() => {
  setQuery(searchParams.get("q") ?? "");
  setDateStart(searchParams.get("dateStart") ?? "");
  setTransport(searchParams.get("transport") ?? "");
  ...
}, [searchParams]);
```

Hero fields are "local until submit", but this effect resets all of them from the URL on
**any** URL change. User types `Recko` in the hero, then clicks a preset pill or a sidebar
filter → URL changes → the typed text is silently discarded.

Fix: only sync from URL when the URL value actually differs from the committed value, or
track "dirty" flags per field and skip syncing dirty fields.

### I-8 · Header search box and hero input are two unsynced sources — MEDIUM

`src/pages/SearchPage.tsx:63`

```ts
const [topQuery, setTopQuery] = useState(filters.query);
```

Initialized **once** and never re-synced (the comment says "keep independent"). Type in the
hero, then look at the header box: stale. And vice versa.

Fix: derive both from one state, or sync `topQuery` with an effect like the hero does.

### I-9 · `adults` / `children` accept negative values from the URL — MEDIUM

`useSearchFilters.ts:93-94` and `236-239`

```ts
const [adults, setAdults] = useState(Number(searchParams.get("adults")) || DEFAULT_ADULTS);
...
if (adultCount) filters.adults = Number(adultCount);   // "0" is truthy → 0, "-5" → -5
```

`?adults=-5` passes through (`-5` is truthy, so the `||` default never kicks in). Same for
`children`. `?adults=0` yields `0` (string `"0"` is truthy). Sent straight to the API.

Fix: clamp with the same bounds the UI uses (adults 1-9, children 0-6) and reject non-finite.

### I-10 · `q` is unbounded and unescaped — LOW-MEDIUM

`useSearchFilters.ts:111` → `buildFilters` → `filtersToParams` (`src/api/publicProviders.ts:13-21`)

No length cap, no control-character stripping. `URLSearchParams` handles encoding, so this is
not an injection vector by itself, but a 10 kB query reaches the API unchallenged.

Fix: cap at ~100 chars and strip control chars client-side; validate server-side too.

### I-11 · Date validation is client-side only and half-open — LOW-MEDIUM

`SearchHero.tsx:131-157`, `useSearchFilters.ts:134-135`

`min={...}` is a UI hint only. A crafted URL can set `dateStart` in the past, or `dateEnd`
without `dateStart`. Order check (`dateStart > dateEnd`) is a string compare on ISO dates —
correct for `YYYY-MM-DD`, but only enforced on submit.

Fix: validate in `buildFilters`, drop invalid pairs before requesting.

---

# 2. Filters layer

### F-1 · `limit` is unclamped — unbounded page size from the URL — HIGH

`useSearchFilters.ts:7-10` and `:108`

```ts
const limit = getParamNumber(searchParams, "limit", DEFAULT_PAGE_SIZE);
// getParamNumber only checks Number.isFinite(v) && v > 0
```

`src/features/search/constants.ts` already defines `MAX_PUBLIC_PAGE_SIZE = 60` — **it is never
used**. `?limit=500000` requests half a million rows.

Fix: clamp `limit` to `MAX_PUBLIC_PAGE_SIZE` in `getParamNumber` or at the call site.

### F-2 · `page` unclamped — MEDIUM

`useSearchFilters.ts:107`

`?page=999999` is accepted and forwarded. Harmless to the client, wasteful on the server
(deep offset). `pageTo()` guards UI navigation but not URL-supplied values.

Fix: clamp page to a sane max (e.g. 500) and treat out-of-range as 1.

### F-3 · Inverted price range (`priceMin > priceMax`) is not corrected — MEDIUM

`useSearchResults.ts:107-116`

```ts
const priceMin =
  requestedPriceMin === null
    ? naturalPriceRange.min
    : Math.min(Math.max(requestedPriceMin, FULL_PRICE_RANGE.min), FULL_PRICE_RANGE.max);
```

Each bound is clamped independently. `?priceMin=80000&priceMax=5000` survives as an inverted
range → guaranteed empty results with no explanation, and the chip reads
"80 000 – 5 000 Kč".

Fix: `if (priceMin > priceMax) swap`, or normalize in `buildFilters`.

### F-4 · Price slider is clobbered mid-drag — MEDIUM

`src/components/PriceRangeSlider.tsx:19-24`

```ts
useEffect(() => {
  setLocalMin(clamp(valueMin, min, max));
}, [valueMin, min, max]);
```

`valueMin` comes from `naturalPriceRange`, which is recomputed whenever results arrive
(`useSearchResults.ts:92-102`). Drag the handle while a response lands → the thumb jumps back
to the server-derived value.

Fix: skip the sync effect while `pending` or while the input has focus.

### F-5 · `SearchFilters` re-renders on every parent render — MEDIUM

`SearchFilters.tsx` (no `memo`), `useSearchFilters.ts:254-295`

The hook returns a fresh object literal every render; `SearchFilters` receives it wholesale
plus ~12 callback-free props. Any parent state change (`pastHero`, share toast, compare
tray, mobile menu) re-renders the whole sidebar, including the destination list.

Fix: `React.memo` + stabilize the returned object with `useMemo`, or pass primitives.

### F-6 · `resetFilters` is inconsistent about what it preserves — LOW-MEDIUM

`useSearchFilters.ts:172-187`

Keeps `q`, `adults`, `children`; silently discards `sortBy`, `sortDir`, `limit`, and (via the
sync effect) the hero dates and transport. Documented as intentional for `q`, but the sort
reset is surprising.

Fix: define the preserved key set explicitly and document it.

### F-7 · Selecting a destination clears the free-text query — LOW

`SearchFilters.tsx:109` and `SearchPage.tsx:607` both pass `q: null`.

Text search and destination filter are mutually exclusive. Probably intended, but there is no
UI signal that picking a destination wipes what you typed.

---

# 3. Results display layer

### R-1 · Stale results are kept while refetching — HIGH

`useSearchResults.ts:64-89`

`result` is never cleared when a new fetch starts. The grid renders the previous response with
`opacity: 0.6` (`SearchResultsSection.tsx:233-237`). Concretely: on page 5, change a filter →
URL `page` becomes 1, but `result` still holds page-5 items and `result.page === 5`. For the
duration of the request the UI shows page-5 tours under a "page 1" pagination state.

Fix: clear `result` (or tag it with the request key and ignore mismatches) when the filter key
changes; keep a separate `isRefetching` flag for the dimming.

### R-2 · Mobile "load more" can skip pages — HIGH

`SearchPage.tsx:711`, `SearchResultsSection.tsx:269-281`

```tsx
onClick = { onLoadMore }; // → updateParams({ page: filters.page + 1 })
disabled = { loading };
```

`loading` only becomes `true` when the fetch effect fires, which is **300 ms after** the URL
change (debounce). In that window the button is enabled. Two quick taps → `page` goes 2 → 3,
page 2 is never displayed, and `accumulatedItems` silently misses it.

Fix: disable on "page changed but not yet fetched" — compare a `requestedPage` ref against the
`result.page` that came back, or set loading synchronously in the click handler.

### R-3 · Accumulator repopulates from a stale result after a filter change — MEDIUM

`useSearchResults.ts:43-58`

```ts
useEffect(() => { setAccumulatedItems([]); }, [filterKeyWithoutPage]);   // runs first
useEffect(() => { if (page <= 1) return result.items; ... }, [result, page]);
```

On the commit where filters change, `result` is still the old response. Effect 1 empties the
accumulator, effect 2 immediately refills it from the **stale** `result` (because `page <= 1`).
Transiently wrong list until the new response lands.

Fix: reset the accumulator and clear `result` in the same place; derive accumulation from the
result that matches the current filter key.

### R-4 · Error state has no retry and destroys the list — MEDIUM-HIGH

`SearchResultsSection.tsx:182`, `useSearchResults.ts:77-81`

On error: `setResult(null)` → grid disappears, one bare `role="alert"` div, **no retry
button**. The only recovery is to change a filter and hope. Also, an aborted request is
correctly ignored, but any real failure is terminal until navigation.

Fix: keep the last good result, render the error as a banner with a Retry action that re-runs
the fetch.

### R-5 · Empty state checks the wrong array — MEDIUM

`SearchResultsSection.tsx:188`

```tsx
{!loading && !error && result?.items.length === 0 && ( ...empty state... )}
```

Mobile renders `toursToRender = accumulatedItems`, but the empty check reads `result.items`.
When `accumulatedItems` is non-empty and `result.items` is empty, both the empty state and the
cards render at once. In favorites-only mode with zero favorites, `activeResult` is a synthetic
object with `totalPages: 0, limit: 0` (`useSearchResults.ts:127-137`) — pagination hides, but
the empty state depends on `items.length` which is `favoriteTours.length`, so it works by luck.

Fix: base the empty state on `toursToRender.length`.

### R-6 · `memo` on `PublicTourCard` is completely defeated — HIGH (perf)

`SearchResultsSection.tsx:239-257`, `PublicTourCard.tsx:86`

Every prop that matters is an inline closure:

```tsx
onToggleFavorite={() => onToggleFavorite(tour)}
onOpenDetail={() => onOpenDetail(tour)}
onToggleCompare={() => onToggleCompare(tour)}
```

New identities every render → `memo` bails out on none of them → **all 24 cards (and every
accumulated mobile card) re-render on every parent render**, including `pastHero` scroll
toggles, share toasts, and each favorite toggle.

Fix: either pass stable callbacks and let the card look up the tour by id
(`onToggleFavorite(id)`), or give the card a custom comparator. Hoist callback props out of the
map.

### R-7 · `aria-live="polite"` on the entire results grid — MEDIUM (a11y)

`SearchResultsSection.tsx:230`

A live region containing 24 cards re-announces the whole list on every filter/pagination
change. Screen-reader spam.

Fix: drop `aria-live` from the grid; put it on a small status node that reports only the count.

### R-8 · No caching of search results — MEDIUM (perf)

`src/api/` — `bootstrapCache.ts` and `destinationsCache.ts` exist; **nothing for tours**.

Every filter change, every back/forward navigation, and every re-selection of the same filter
re-issues the network request. Re-checking a checkbox you just unchecked refetches.

Fix: an in-memory keyed cache on the filter key (Map + TTL), or adopt SWR/React Query with
`keepPreviousData`.

### R-9 · JSON-LD injection via provider-controlled data — HIGH (security)

`src/pages/SearchPage.tsx:310-344`

```ts
script.textContent = JSON.stringify({ ... name: tour.title, description: tour.description ... });
```

`JSON.stringify` does **not** escape `</script>`. Tour titles come from third-party provider
feeds. A title containing `</script><script>...` terminates the JSON-LD block and executes.

Fix: escape `<`, `>`, `&` in the serialized string (e.g. `.replace(/</g, "\\u003c")`) before
assigning to `textContent`.

### R-10 · `history.replaceState` bypasses React Router — MEDIUM

`SearchPage.tsx:104-112`

The tourId deep-link param is written with raw `history.replaceState`, so
`useSearchParams()` never sees it. Consequences: `updateParams` builds from the stale
`searchParams` and silently drops `tourId` while the modal stays open; the back button does
not close the modal.

Fix: write `tourId` through `setSearchParams`, or accept the desync and stop treating the URL
as the source of truth for the modal.

### R-11 · Deep-link fetch is not aborted — LOW-MEDIUM

`SearchPage.tsx:96-100`

`fetchPublicSingleTour` takes no signal and the `.catch` swallows everything. If the user
navigates away mid-request, `offerGroups.openTourDetail` still fires.

Fix: pass an `AbortController` signal and clean up on unmount.

### R-12 · Pagination uses a stale `totalPages` while loading — LOW-MEDIUM

`SearchResultsSection.tsx:283`, `SearchPage.tsx:676`

`totalPages={results.result?.totalPages ?? 1}` comes from the previous response during a
refetch, so arrows/page numbers briefly reflect the old result set.

Fix: derive from the pending request or disable the control while `loading`.

### R-13 · Unbounded mobile list, no virtualization — MEDIUM

`SearchResultsSection.tsx:239`

Mobile keeps appending pages to `accumulatedItems` with no cap and no windowing. 20 pages =
480 DOM cards, each with images, galleries and effects. `useInfiniteScroll.ts` exists but is
**never imported** (dead code); there is no virtualization library in `package.json`.

Fix: cap accumulation (e.g. 5 pages) with a hard "show all results" link, or add windowing.

---

# Fix plan — phases

## Phase 1 · Correctness of the primary flow (highest impact, low risk)

1. **I-1** Enter key swallowed — unblock form submit in `SearchAutocomplete`
2. **I-2** Recent-search click must commit `q` to the URL
3. **F-1** Clamp `limit` to `MAX_PUBLIC_PAGE_SIZE`
4. **R-1** Clear / key-tag `result` on filter change so stale pages never render
5. **R-2** Close the load-more debounce window so pages cannot be skipped

## Phase 2 · State integrity and input validation

6. **I-7** Stop the URL-sync effect from wiping dirty hero inputs
7. **I-8** Unify header + hero search inputs
8. **I-9** Clamp `adults` / `children` from URL
9. **F-2** Clamp `page`
10. **F-3** Normalize inverted `priceMin` / `priceMax`
11. **F-4** Don't clobber the price slider mid-drag
12. **I-10 / I-11** Cap and validate `q`, dates

## Phase 3 · Failure and empty states

13. **R-4** Error banner with Retry; keep last good result
14. **R-5** Base the empty state on `toursToRender`
15. **R-9** Escape `</script>` in JSON-LD (security)
16. **R-10** Route `tourId` writes through React Router
17. **R-11** Abort the deep-link fetch on unmount

## Phase 4 · Performance and rendering

18. **R-6** Make `PublicTourCard` memo actually work (stable callbacks)
19. **I-4 / I-5** `useMemo` suggestions; hoist `localStorage` reads out of render
20. **R-8** Add a keyed in-memory cache for tour results
21. **F-5** `React.memo` + stable object for `SearchFilters`
22. **R-13** Cap mobile accumulation / add windowing
23. **I-6** Fix `highlightMatch` normalization indices
24. **R-7** Move `aria-live` off the results grid
25. **R-12** Disable pagination while `loading`

## Phase 5 · Cleanup

26. **I-3** Wire up `saveRecentSearch` or delete the recents feature
27. **R-13b** Delete unused `useInfiniteScroll.ts`
28. **F-6 / F-7** Document `resetFilters` semantics and the destination/query exclusivity
29. Add regression tests: Enter-to-submit, rapid filter switching, inverted price range,
    `?limit=` clamping, error retry.

---

## Not problems (verified, don't waste time here)

- Main fetch **does** abort correctly (`useSearchResults.ts:62-88`) — `AbortController` +
  `signal.aborted` guards in both `.catch` and `.finally`.
- Offer-group fetches **do** abort per key with an identity check
  (`useOfferGroups.ts:34-50`) — correctly avoids the classic stale-response race.
- Debounce exists on the filter key (300 ms) and on the price slider (150 ms).
- `PublicTourCard` is memoized and images use `loading="lazy" decoding="async"`.
- `useSearchFilters` / `useBootstrap` use `useCallback` / `useMemo` sensibly.
- Date order comparison on ISO strings is correct.

---

# Addendum · Self-review corrections (2026-08-29)

Re-checked the plan against the server implementation and re-read the client. **Several
findings above are wrong or overstated.** Corrected below; the originals are left in place
for traceability but should not be acted on.

## Retracted

**R-9 "JSON-LD XSS" — NOT a vulnerability. Retract.**
The code does `document.createElement("script")` → `.textContent = JSON.stringify(...)`
→ `appendChild`. No HTML parser runs, so `</script>` inside the JSON is inert text in a
script element that is never executed (`type="application/ld+json"`). Grep confirms the only
`dangerouslySetInnerHTML` in the repo is `src/components/admin/SendPreview.tsx` (admin email
preview, intentional). Escaping `<` is still cheap hardening _if_ this JSON is ever
server-rendered, but it is not a Phase 3 security item.

**R-8 "no caching, add a client cache" — WRONG, and the fix is over-engineering.**
The server already sets `Cache-Control: public, max-age=30, stale-while-revalidate=60` on the
success path (`server/src/routes/providerSearchPublic.ts:346`) **and** has a single-flight
server-side cache keyed on sorted query params (`getOrFetchPublicSearchResult(cacheKey, …)`,
line ~244). Repeat requests within 30 s hit the browser HTTP cache. A hand-rolled in-memory
cache would add staleness bugs and unbounded memory for ~zero gain. **Drop this item.**
The perceived slowness on filter change is re-render cost (R-6), not network.

## Corrected severity / mechanism

**F-1 `limit` unclamped — was HIGH, is LOW.** The server clamps it:
`parseOptionalNumber(req, res, "limit", { max: MAX_PUBLIC_LIMIT /* 60 */ })` and returns
**HTTP 400** for `limit > 60`. Not a DoS vector, not silent. A client-side clamp is still
worth having (avoids a pointless 400 round-trip) but it is cosmetic and does not belong in
Phase 1.

**F-2 `page` unclamped — was MEDIUM, is the more serious of the two, and my ordering was
backwards.** The server allows `page` up to **10,000** (`max: 10_000`), and
`perProviderLimit = Math.min(1_000, page * limit)` (line 242). So `?page=10000&limit=60`
causes every provider to fetch 1,000 rows in order to return an empty slice. Bounded, but a
real amplification vector. **F-2 outranks F-1.**

**I-9 `adults`/`children` negatives — wrong impact.** Server validates
`adults ∈ [1,9]`, `children ∈ [0,6]` and 400s otherwise. The value is not "sent straight to
the API". The real defect is that the client _renders_ the invalid value and then lands the
user in an unrecoverable error state (see R-4).

**F-3 inverted price range — wrong impact.** Server returns
**400 "priceMin cannot be greater than priceMax"** (line 87), not silent empty results.
Same conclusion: it's an error-UX problem, not a filtering bug.

**R-1 fix as written would cause regressions.** Nulling `result` on filter change breaks:
the mobile load-more block (`result && page < totalPages`), desktop pagination
(`result && totalPages > 1`), `visibleFrom`/`visibleTo`, the `hasResults` prop that gates the
price slider (`results.result !== null`), and the scroll effect's `!results.result` early
return. Every filter change would flash a skeleton and hide the price slider.
_Correct fix:_ keep `result` but tag it with the filter key it came from — store
`{ key, data }` and render only when `key === debouncedFilterKey`; drive the dimming off a
separate `isRefetching` flag.

**R-6 fix is half-wrong.** "Let the card look up the tour by id" is impossible —
`useFavorites.toggle(tour)` needs the **whole tour object** to persist it to localStorage.
Workable version: `toggle` and `compare.toggle` are already stable (`useCallback(…, [])`), so
pass them **unwrapped** and call `onToggleFavorite(tour)` inside the card. But
`offerGroups.openTourDetail` is `useCallback([buildFilters, offerGroupItems])` — **not
stable**, it changes on every URL change. Making the memo actually hold requires refactoring
`useOfferGroups` to keep `buildFilters` in a ref. My Phase 4 item did not say this.

**R-2 fix is hand-wavy.** `resultsLoading` lives inside `useSearchResults` and cannot be set
from the page. Workable: track `requestedPage` inside `useSearchResults` and expose
`pendingPage = requestedPage !== result?.page`; disable the button when
`loading || pendingPage`.

**R-3 trigger is narrower than stated.** The accumulator only refills from a stale `result`
when the filter change **also changes `page`** (the accumulate effect depends on
`[result, page]`). If page doesn't change, effect 2 never re-runs. Trigger is specifically
"page resets from >1 to 1".

## Ordering defect

**I-2 before I-3.** I-2 (recent-search click must commit `q` to the URL) is **unreachable**
until something writes to localStorage. I put I-3 in Phase 5. Fixing I-2 first is wasted work.

## Newly found (missed in the first pass)

**N-1 · Two competing recent-searches implementations, both dead.**
`SearchAutocomplete.getRecentSearches()/saveRecentSearch()` (synchronous
`localStorage.getItem` + `JSON.parse` **inside render**) and
`hooks/useRecentSearches.ts` (a correct `useSyncExternalStore` version with `save`/`clear`/`remove`).
Neither is imported anywhere. `components/RecentSearches.tsx` is exported from the barrel and
never rendered; four translation keys (`sRecentSearchesTitle`, `sRecentSearchesClear` × 4
locales) exist for it. The **worse** of the two implementations is the one wired into the
render path (feeds I-4).

**N-2 · `hotelOnly` is a dead parameter.** `buildFilters` reads
`searchParams.get("hotelOnly") === "1"` but no UI sets it. The server uses it to choose
between `excludeTransport = "car"` and including hotel-only tours, so it is permanently at
its default.

**N-3 · `q` > 120 chars → HTTP 400.** `MAX_QUERY_LENGTH = 120` server-side; the client has no
cap, so a long paste produces a hard error.

**N-4 · Favorites-only empty state shows the wrong copy.** With `showFavoritesOnly` and zero
saved tours, `activeResult` is synthetic (`items: []`), so the generic "no results — try
resetting filters" empty state renders. The reset button cannot help; the user simply has no
favorites. Needs a distinct branch.

**N-5 · `destinations` memo returns two different identities** — `bootstrap.destinations`
directly when there are no results, otherwise a fresh mapped array — so its identity flips on
every fetch, compounding the unmemoized `suggestions` recompute (I-4).

**N-6 · StrictMode is on** (`src/main.tsx`). Effects double-invoke in dev, so the mount fetch
fires twice (first aborted by cleanup). Not a prod bug, but it matters when reproducing, and
it makes the R-3 ordering bug more visible locally.

**N-7 · `useOfferGroups(filters.buildFilters)`** — `buildFilters` changes identity on every
`searchParams` change, so `openTourDetail` is recreated constantly. This is the root of the
R-6 gap, and it also makes `SearchPage`'s deep-link effect (`dep: [offerGroups]`) re-run on
every render — currently harmless only because of the `deepLinkHandled` ref guard.

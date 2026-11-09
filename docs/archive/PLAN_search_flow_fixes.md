# Search Flow Fix Plan (v2 — supersedes the phases in `REVIEW_search_flow.md`)

Date: 2026-08-29 · Scope: `/search` tour search page
Companion doc: `REVIEW_search_flow.md` (diagnosis) + its corrections addendum.
**No code changed yet.** Awaiting approval.

---

## Why v2 exists

v1's phases were built on several claims that did not survive checking the server. Corrections:

| v1 claim                            | Reality                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `?limit=` unclamped → HIGH DoS      | Server 400s `limit > 60`. Cosmetic.                                                                                  |
| `?page=` unclamped → MEDIUM         | Server allows up to 10 000; `perProviderLimit = min(1000, page×limit)` → real amplification. **Worse than `limit`.** |
| `adults=-5` reaches the API         | Server 400s it. It's an error-UX problem, not validation.                                                            |
| Inverted price range → silent empty | Server 400s it. Same.                                                                                                |
| JSON-LD `</script>` XSS             | Not exploitable. `createElement` + `textContent`, no HTML parser. **Retracted.**                                     |
| No caching, add a client cache      | Server sets `max-age=30, stale-while-revalidate=60` + single-flight cache. **Over-engineering, dropped.**            |

And three v1 fixes were unworkable as written (R-1 nulling `result`, R-6 "look up by id",
R-2 "set loading in the click handler") — all restated below.

---

## Blocking prerequisite discovered late

**`t` is not referentially stable.** `src/hooks/useLanguage.ts:44-46`:

```ts
function t(key: string): string {
  return dict?.[key] ?? key;
} // new identity every render
```

`t` is drilled into `PublicTourCard`, so `memo` is defeated by that prop **alone**. Every
card-render optimisation in v1 would have been a no-op. This must land before Phase 4.

---

# Phase 0 · Stabilise `t` (unblocks all perf work)

**0.1** `src/hooks/useLanguage.ts` — wrap `t` in `useCallback`:

```ts
const t = useCallback((key: string) => dict?.[key] ?? key, [dict]);
```

Why: single highest-leverage change on the page. `t` is drilled into `SearchHero`,
`SearchFilters`, `SearchResultsSection`, `StickySearchBar`, `TrustBar`, `MobileFilterDrawer`
and every card.

Risk check: `SearchPage`'s `activeChips` memo lists `t` in deps (line 226). It will now
recompute only when `dict` changes — which is exactly when it should. Language switching still
works because `dict` identity changes. Verify by switching language on `/search`.

Acceptance: React DevTools Profiler shows `PublicTourCard` re-render count on a filter change
drops from N to 0 for unchanged cards **after Phase 4**; before that, confirm no visual
regression and that language switching still updates all copy.

---

# Phase 1 · Correctness of the primary flow

Independent of everything else. Highest user impact. Ship first.

### 1.1 Enter key swallowed — `SearchAutocomplete.tsx:191-196`

**Change:**

```ts
case "Enter": {
  if (activeIndex >= 0 && activeIndex < suggestions.length) {
    e.preventDefault();
    handleSelectItem(suggestions[activeIndex]);
  }
  break;   // no active item → let the event bubble → <form onSubmit> fires
}
```

Why: today `preventDefault()` runs unconditionally, and `onChange` resets `activeIndex` to -1
on every keystroke, so typing a query and pressing Enter does nothing whenever suggestions are
visible. This is the page's primary search affordance.

Acceptance: type `Řecko`, wait for the dropdown, press Enter → search runs. Arrow-down to a
suggestion + Enter → selects it and does **not** also submit the form.

### 1.2 Mobile "load more" skips pages — `useSearchResults.ts` + `SearchResultsSection.tsx:275`

**Change:** inside `useSearchResults`, expose

```ts
const pendingPage = page !== (result?.page ?? page);
```

and change the button to `disabled={loading || pendingPage}`.

Why: `loading` only flips true when the debounced fetch fires — 300 ms after the URL changes.
In that window the button is live; two taps send `page` 2 → 3 and page 2 is never rendered nor
accumulated.

Do **not** try to set `resultsLoading` from the click handler; it is owned by the hook.

Acceptance: rapid double-tap on "Načíst další" advances exactly one page.

### 1.3 Stale results rendered under new pagination — `useSearchResults.ts:64-89`

**Change:** store the result together with the key that produced it.

```ts
const [result, setResult] = useState<{ key: string; data: ToursResult } | null>(null);
// on success: setResult({ key: debouncedFilterKey, data })
const data = result?.key === debouncedFilterKey ? result.data : null;
```

Expose `result: data`, plus `hasLoadedOnce: boolean` (latched on first success).

**Do not null `result` on filter change** — v1 said that, and it breaks five things: the mobile
load-more block (`result && page < totalPages`), desktop pagination (`result && totalPages > 1`),
`visibleFrom`/`visibleTo`, the `hasResults` prop gating the price slider, and the scroll effect's
`!results.result` early return.

Regressions to prevent explicitly:

- Price slider must not vanish → `SearchPage` passes `hasResults={results.hasLoadedOnce}`
  instead of `results.result !== null` (two call sites: sidebar line 660, drawer line 740).
- Dimming while refetching stays driven by `resultsLoading`, not by `result === null`.

Acceptance: from page 5, change any filter → skeletons (never page-5 items beside a "page 1"
pagination state); price slider stays mounted throughout.

### 1.4 Accumulator refills from a stale result — `useSearchResults.ts:43-58`

Resolved by 1.3 (once `result` is key-tagged, effect 2 can't read stale data). Trigger was
narrower than v1 claimed: it only fires when the filter change _also_ resets `page` from >1 to 1
(the accumulate effect depends on `[result, page]`).

Acceptance: on mobile, change a filter while on page 3 → accumulator contains only page-1 items.

---

# Phase 2 · Error and empty states — load-bearing, not cosmetic

Every 400 from the server (`limit`, `page`, `priceMin>priceMax`, `adults`, `q` too long) lands
here. Today it is a dead end. This is why v1's Phase 2 items felt like validation bugs — they
were never validation bugs, they were this.

### 2.1 Error state has no recovery — `useSearchResults.ts:77-81`, `SearchResultsSection.tsx:182`

**Change:**

- Stop `setResult(null)` on error. Keep the last good result, set `error` alongside it.
- Add `retry()` to the hook: a `reloadToken` counter bumped on demand, added to the fetch
  effect deps.
- Render the error as a dismissible banner **with a Retry button**, above the grid, keeping the
  previous results visible below it.

Acceptance: `?adults=-5` → banner reading "adults must be at least 1." (server message) with a
working Retry; previous results remain visible; user is never stuck with a blank page.

### 2.2 Empty state reads the wrong array — `SearchResultsSection.tsx:188`

**Change:** gate on `toursToRender.length === 0`, not `result?.items.length === 0`. Mobile
renders `accumulatedItems`; today both the empty state and the cards can render at once.

### 2.3 Favorites-only empty state shows the wrong copy — new (N-4)

With `showFavoritesOnly` and zero saved tours, `activeResult` is synthetic (`items: []`) and the
generic "no results — reset filters" panel renders. The reset button cannot help; the user has
no favorites. **Change:** add a distinct branch for `showFavoritesOnly && favorites.length === 0`.

---

# Phase 3 · URL hygiene (defence in depth — low payoff, do it in one pass)

Server already 400s all of these. The only reason to fix them client-side is to stop the app
from _generating_ invalid URLs and to stop rendering nonsense values.

### 3.1 Clamp numeric params — `useSearchFilters.ts:7-10`

Extend `getParamNumber(searchParams, key, fallback, min, max)` and apply:

- `limit` → 1…`MAX_PUBLIC_PAGE_SIZE` (60). The constant already exists in
  `features/search/constants.ts` and is currently unused.
- `page` → 1…500 (server allows 10 000; 500 is generous and removes the amplification vector).

### 3.2 Clamp people counts — `useSearchFilters.ts:93-94`

`Number(x) || DEFAULT` lets `-5` through (truthy) and turns `0` into `2`. Clamp adults 1-9,
children 0-6, matching `SearchHero`'s own clamps.

### 3.3 Cap `q` — `useSearchFilters.ts:111`

Server rejects > 120 chars (`MAX_QUERY_LENGTH`). Cap client-side so a long paste doesn't produce
a 400.

### 3.4 Hero inputs wiped by unrelated URL changes — `useSearchFilters.ts:97-104`

**Change:** replace the blanket `[searchParams]` dependency with the individual primitive values:

```ts
useEffect(() => {
  setQuery(urlQ);
  setDateStart(urlDateStart); /* … */
}, [urlQ, urlDateStart, urlDateEnd, urlTransport, urlAdults, urlChildren]);
```

Why: `searchParams` identity changes on _any_ param change, so typing `Recko` in the hero and
then clicking a preset pill silently discards what you typed. With primitive deps, the effect
runs only when one of those specific values changes — which is exactly the back/forward case it
exists for.

Acceptance: type in hero → click any sidebar filter → text survives. Browser back → hero
reflects the restored URL.

### 3.5 Header and hero search boxes desynced — `SearchPage.tsx:63`

`topQuery` is initialised once and never synced. Either derive both from one state or add the
same sync effect used by the hero. Pick one and delete the other's private state.

---

# Phase 4 · Rendering performance (requires Phase 0)

### 4.1 Make `PublicTourCard`'s memo actually work

Three inline arrows currently defeat it — `SearchResultsSection.tsx:248-254`.

**Change:**

- `onToggleFavorite` and `onToggleCompare`: pass `useFavorites().toggle` and `useCompare().toggle`
  **unwrapped**. Both are already `useCallback(…, [])` — stable today. Change the card's prop
  types to `onToggleFavorite: (tour: UnifiedTour) => void` and call `onToggleFavorite(tour)`
  inside the card.
  (v1 said "let the card look up the tour by id" — impossible; `toggle` needs the whole object
  to persist it to localStorage.)
- `onOpenDetail`: **not stable today** — `useOfferGroups.ts` has
  `useCallback(…, [buildFilters, offerGroupItems])`, and `buildFilters` changes on every URL
  change. Refactor `useOfferGroups` to mirror `buildFilters` and `offerGroupItems` into refs and
  give `openTourDetail` `[]` deps.
- Requires 0.1 (`t` stabilised), or the memo still never hits.

Bonus: stabilising `openTourDetail` also fixes N-7 — `SearchPage`'s deep-link effect depends on
`[offerGroups]` and currently re-runs on every render, harmless today only because of a ref guard.

Acceptance: Profiler — toggling one card's favourite re-renders 1 card, not 24.

### 4.2 Suggestions recomputed in render — `SearchAutocomplete.tsx:107-151`

**Change:** `useMemo` on `[debouncedValue, destinations]`, and hoist `getRecentSearches()` out of
the render path. Today it does a synchronous `localStorage.getItem` + `JSON.parse` on every
keystroke and every parent render, and `normalize()` over every destination twice per pass.
Folded into 5.1 (the recents rewrite), which replaces this code entirely — do them together.

### 4.3 `SearchFilters` re-renders on every parent render

`useSearchFilters` returns a fresh object literal each render and `SearchFilters` isn't memoised.
Add `React.memo` and stabilise the returned object, or pass primitives. Note the component is
mounted twice when the mobile drawer is open (drawer renders `SearchFilters` internally), so
this doubles.

### 4.4 Cap mobile accumulation

`accumulatedItems` grows unbounded — 20 pages = 480 DOM cards, no windowing, and
`useInfiniteScroll.ts` is dead code. Before adding windowing, just cap: after ~5 pages show a
"Zobrazit vše" link that switches to paginated mode. **Without that fallback the cap makes
pages 6+ unreachable** — the cap and the fallback ship together or not at all.

### 4.5 Move `aria-live` off the results grid — `SearchResultsSection.tsx:230`

A live region wrapping 24 cards re-announces the whole list on every change. Put it on a small
status node that reports only the count.

---

# Phase 5 · Dead code and leftovers

### 5.1 Recent searches — two competing implementations, both dead (N-1)

- `SearchAutocomplete.getRecentSearches()/saveRecentSearch()` — synchronous localStorage in render.
- `hooks/useRecentSearches.ts` — correct `useSyncExternalStore` version with `save/clear/remove`.
- Neither is imported. `components/RecentSearches.tsx` is exported from the barrel and never
  rendered; four translation keys × four locales exist for it.

**Change:** keep `useRecentSearches`, delete the in-render pair, call `save()` on a successful
search, and render `RecentSearches.tsx` (or delete it and its keys — your call, see open
questions).

**Ordering matters:** only after this lands does the following do anything:

### 5.2 Recent-search click must commit `q` — `SearchPage.tsx:604-609`

Recent suggestions have no `slug`, so `onDestinationSelect` only calls `setQuery` and never
searches. Change to commit `q` to the URL for slug-less suggestions.
(v1 put this in Phase 1 and the wiring in Phase 5 — unreachable until 5.1 ships.)

### 5.3 Delete `useInfiniteScroll.ts` and `useSavedSearches.ts`

Verified unused. (I have **not** verified `useInspireMe`, `useMapView`, `usePullToRefresh`,
`useRecentlyViewed` — check before deleting those.)

### 5.4 Decide on `hotelOnly` (N-2)

`buildFilters` reads `searchParams.get("hotelOnly") === "1"`; no UI sets it, so the server's
hotel-only mode is permanently off. Either ship a toggle or remove the read.

### 5.5 Regression tests

Pin: Enter-to-submit, rapid filter switching (stale-result), rapid load-more taps, error retry,
`?limit=`/`?page=` clamping, language switch after `t` stabilisation.

---

# Explicitly dropped from v1

| Item                                         | Why                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| JSON-LD escaping as a security fix           | Not exploitable. Optional one-line hardening if SSR is ever added.                                                           |
| Client-side results cache                    | Server already sends `max-age=30, stale-while-revalidate=60` and has a single-flight cache. Adds staleness bugs for no gain. |
| Custom `memo` comparator on `PublicTourCard` | Hack. Stabilise the props instead (0.1 + 4.1).                                                                               |
| Clamping as a security measure               | Server 400s everything. Kept only as UX/URL hygiene in Phase 3.                                                              |

---

# Not problems — verified, don't revisit

- Main fetch `AbortController` is correct; guards in both `.catch` and `.finally`.
- Offer-group fetches abort per key **with an identity check** — the classic stale-response race
  is already handled.
- Debounce exists on the filter key (300 ms) and the price slider (150 ms).
- `useBootstrap` memoisation and caching are fine.
- ISO date string comparison is correct.
- `MobileFilterDrawer` returns `null` when closed, so there is no duplicate-filter-state problem.

---

# Open questions before I start

1. **Recent searches** — wire it up and ship `RecentSearches.tsx`, or delete the feature and its
   8 translation entries? I recommend wiring it up; the `useSyncExternalStore` version is already
   correct and it's a real DX win on a travel site.
2. **`hotelOnly`** — ship a toggle or remove the dead read?
3. **Mobile accumulation cap** — how many pages before "Zobrazit vše"? I'd default to 5.
4. **Phase 3** — it's low user-visible payoff since the server already rejects bad input.
   Ship it, or defer to a single follow-up?

# Phase 1 — Critical Blockers

> Source plan: [`/memories/session/plan.md`](../../SEARCH_PAGE_AUDIT_PROMPT.md). Phase 1 fixes user-visible breakage that corrupts results, leaves users stranded on mobile, or silently swallows failures. Every item here must ship before Phase 2 begins.

**Files in scope**

- [client/src/pages/SearchPage.tsx](../../client/src/pages/SearchPage.tsx)
- [client/src/api/publicProviders.ts](../../client/src/api/publicProviders.ts)

**Out of scope for Phase 1**: styling polish, i18n, copy changes, refactors, and any backend route changes.

**Definition of done for the phase**

- `npm --workspace client run lint` and `npm --workspace client run build` are clean.
- Every "Verification" block below is reproduced manually by the implementer in Chrome desktop and Chrome mobile emulation (360×640).
- No regression in the existing default desktop search flow (smoke test: home → search "Egypt" → open detail → paginate).

---

## 1. Favorites filter breaks pagination

### Problem

`displayedTours` is derived client-side **after** the server has already paginated. The server returns e.g. 24 items for page 1 of 5, the client filters to the 3 favorited items, but the pager still renders "Page 1 / 5" and the totals string ("Zobrazeno 1–24 z 117") references the un-filtered counts. Clicking page 2 reissues the network call for `page=2` of the *unfiltered* result set; if those 24 tours contain no favorites, the user sees an empty page with no explanation.

### Root cause

Two sources of truth for "how many results are visible":

- `result.totalPages` / `result.filtered` — server-side, pre-favorites.
- `displayedTours.length` — client-side, post-favorites.

The pager and totals string read from the server source unconditionally.

### Approach

Treat "favorites only" as a **client-side view mode**, not a server filter. When the toggle is active:

1. Force `page` back to `1` (clear from URL params).
2. Hide the numeric pager entirely; we no longer have authoritative totals.
3. Recompute the totals string from `displayedTours.length` (e.g. `"3 uložených hotelů"`).
4. Keep the existing list rendering — no virtualisation needed since favorites lists are by definition small (UX-bounded to dozens).

Do **not** push favorites to the server; favorites are stored only in `localStorage` via [`useFavorites`](../../client/src/hooks/useFavorites.ts) and the server has no concept of them. Sending IDs over the wire would also break caching.

### Implementation steps

1. In `SearchPage.tsx`, locate the `showFavoritesOnly` toggle handler. Wrap the state update:
   ```ts
   function toggleFavoritesOnly() {
     setShowFavoritesOnly((prev) => {
       const next = !prev;
       if (next) updateParams({ page: 1 });
       return next;
     });
   }
   ```
2. Replace `result.totalPages` checks at the pager render site with `showFavoritesOnly ? 1 : (result?.totalPages ?? 1)` and guard `{!showFavoritesOnly && <Pager .../>}`.
3. Replace the `totalText` template (around L848-L855) with a branch:
   ```ts
   const totalText = showFavoritesOnly
     ? `${displayedTours.length.toLocaleString("cs-CZ")} uložených hotelů`
     : result ? /* existing template */ : /* existing fallback */;
   ```
4. Inside `resetFilters()`, additionally call `setShowFavoritesOnly(false)` (covered by Phase 1 item 5, do both at once).

### Verification

1. Search a destination that returns ≥ 2 pages of results.
2. Favorite 2–3 tours from page 1 and page 3.
3. Toggle "Uložené" — pager disappears, totals string reads `"3 uložených hotelů"`, all 3 tours are visible irrespective of original page.
4. Toggle off — pager reappears at `page=1`, original totals restored.
5. Edge case: favorite zero tours, toggle on — empty state shows, no console errors.

### Risks & mitigations

- **Risk:** users may expect favorites to persist across server filters (e.g. "favorites + Egypt only"). **Mitigation:** out of scope; current behaviour intersects favorites with the active server filters because we filter `result.items` in place. Document in PR description.

---

## 2. Offer-group race condition

### Problem

`openTourDetail()` fires `fetchPublicProviderOfferGroup()` per click. If the user clicks tour **A**, then tour **B** before A resolves, and A resolves *after* B, the modal shows A's offers under B's header. The modal displays whatever last won the `setOfferGroupItems` race.

### Root cause

No request identity tracking. The `.then()` callback updates state unconditionally, ignoring whether the request is still relevant.

### Approach

Use the same pattern already proven in [`client/src/stores/searchStore.ts`](../../client/src/stores/searchStore.ts): one `AbortController` per logical operation, cancel-on-supersede. Key the controller map by `offerGroupKey` so concurrent fetches for *different* tours can coexist (useful for prefetch hover behaviour later) while a duplicate fetch for the same key aborts the previous one.

### Implementation steps

1. Extend [`fetchPublicProviderOfferGroup`](../../client/src/api/publicProviders.ts#L90) to accept an optional `AbortSignal`:
   ```ts
   export async function fetchPublicProviderOfferGroup(
     providerId: string,
     offerGroupKey: string,
     filters: UnifiedFilters,
     signal?: AbortSignal,
   ): Promise<UnifiedTour[]> {
     // ...
     const res = await fetch(url, { signal });
     // ...
   }
   ```
2. In `SearchPage.tsx`, add a ref:
   ```ts
   const offerGroupControllers = useRef<Map<string, AbortController>>(new Map());
   ```
3. In `openTourDetail`, before fetching:
   ```ts
   const previous = offerGroupControllers.current.get(key);
   previous?.abort();
   const controller = new AbortController();
   offerGroupControllers.current.set(key, controller);
   ```
4. Pass `controller.signal` to the fetch. In `.catch`, ignore `AbortError`:
   ```ts
   .catch((err) => {
     if (err?.name === "AbortError") return;
     setOfferGroupErrors((prev) => ({ ...prev, [key]: ... }));
   })
   ```
5. In `.finally`, only flip the loading flag off if the controller is still the active one (`offerGroupControllers.current.get(key) === controller`).
6. On unmount, abort all controllers:
   ```ts
   useEffect(() => () => {
     offerGroupControllers.current.forEach((c) => c.abort());
   }, []);
   ```

### Verification

1. Throttle network to "Slow 3G" in DevTools.
2. Click a multi-offer tour A, then within 200 ms click multi-offer tour B.
3. Modal must show B's offers; no flicker showing A's data; no console errors.
4. Close modal mid-fetch — no warnings about state updates on unmounted component.

### Risks & mitigations

- **Risk:** `AbortError` shows in DevTools network panel as failed. **Mitigation:** acceptable; document in PR.

---

## 3. Mobile filter drawer not scrollable

### Problem

On viewports < 700 px tall, the mobile filter drawer renders all filter sections (search, destinations, dates, price, board, transport, nights, stars, reset/apply CTAs) inside a `fixed` overlay with `overflow: hidden` on `body`. The drawer itself has no inner scroll container, so destinations and the bottom CTAs become unreachable.

### Root cause

The body-scroll-lock effect (around `useEffect` watching `mobileFiltersOpen`) prevents the page from scrolling, but the drawer relies on the natural page scroll that no longer exists.

### Approach

Add a flex-column drawer with a sticky header (chip count + close), a scrollable body, and a sticky footer (Reset + Apply). This pattern matches the Radix Dialog content layout used elsewhere in the admin UI.

### Implementation steps

1. Locate the mobile drawer JSX in `SearchPage.tsx` (~L1003-L1074).
2. Restructure markup:
   ```tsx
   <div className="mobile-filters">
     <div className="mobile-filters__header sticky top-0 z-10 bg-white border-b">...</div>
     <div className="mobile-filters__body flex-1 overflow-y-auto overscroll-contain px-4 py-3">
       {/* all filter sections */}
     </div>
     <div className="mobile-filters__footer sticky bottom-0 z-10 bg-white border-t p-3 flex gap-2">
       <button onClick={resetFilters}>Resetovat</button>
       <button onClick={() => setMobileFiltersOpen(false)}>Zobrazit nabídky</button>
     </div>
   </div>
   ```
3. Wrapper styles: `flex flex-col h-[100dvh] max-h-[100dvh]` (use `dvh`, not `vh`, to handle mobile browser chrome shrinkage).
4. Ensure `overscroll-contain` prevents iOS rubber-band from scrolling the background.
5. Test: when the body has many destinations, the scrollable area scrolls; header/footer stay pinned.

### Verification

1. Chrome DevTools → iPhone SE (375×667) and Galaxy S5 (360×640).
2. Open `/search`, tap the filter button.
3. Confirm all sections reachable by scrolling within the drawer.
4. Confirm "Resetovat" and "Zobrazit nabídky" remain pinned at the bottom while scrolling.
5. Rotate to landscape (640×360) — still usable.

### Risks & mitigations

- **Risk:** `100dvh` not supported on Safari < 15.4. **Mitigation:** fall back via `100vh` with `max-h-screen`. Browser support is now ≥ 96% globally; acceptable.

---

## 4. Real-time date validation

### Problem

`submitSearch` checks `dateStart > dateEnd` only on form submit. Users can pick an end date earlier than the start, click search, and only then see the error rendered below the form (often below the fold). They re-pick dates and re-submit — high friction.

### Root cause

Validation is event-bound (`onSubmit`) instead of state-derived.

### Approach

Derive `validationError` reactively from `dateStart` and `dateEnd`. Disable the submit button while invalid. Render the error message **inline beside the date inputs**, not in a stray banner. Keep the explicit set on submit too (defence in depth, as `dateStart`/`dateEnd` come from controlled inputs but could theoretically be bypassed).

### Implementation steps

1. Replace the existing `validationError` state with a derived value:
   ```ts
   const dateError = useMemo(
     () => (dateStart && dateEnd && dateStart > dateEnd
       ? "Datum odjezdu nesmí být po datu návratu."
       : null),
     [dateStart, dateEnd],
   );
   ```
   *(Keep `validationError` for non-date errors if any; otherwise remove.)*
2. On each date `<input>`, set `aria-invalid={!!dateError}` and `aria-describedby="date-error"`.
3. Render the error inline:
   ```tsx
   {dateError && (
     <p id="date-error" role="alert" className="text-sm text-red-600 mt-1">
       {dateError}
     </p>
   )}
   ```
4. Disable submit button: `disabled={!!dateError}`. Update its `aria-disabled` and `cursor-not-allowed` styles.
5. In `submitSearch`, keep an early `return` if `dateError` is set (the button is disabled, but we may submit via Enter key from a focused input).
6. Add the HTML constraint: on the **end date** input, set `min={dateStart || undefined}`. This blocks most pickers from offering earlier dates as a first line of defence.

### Verification

1. Pick start = today + 7d, end = today + 3d → red error appears immediately under the date row; submit button greyed out.
2. Fix end date → error clears; button enabled.
3. Press Enter inside the start date input while invalid → no submission, focus retained.
4. Screen reader (VoiceOver/NVDA) announces the error when the end date input is committed.

### Risks & mitigations

- **Risk:** disabled button reduces discoverability if user doesn't notice the error. **Mitigation:** the inline `role="alert"` text is unambiguous and adjacent.

---

## 5. `resetFilters()` leaves stale UI state

### Problem

`resetFilters()` only clears `searchParams`. Leftover state after reset:

- `showFavoritesOnly` stays on (Phase 1 #1 hides results).
- `detailTour` stays open (modal lingers behind the cleared page).
- `validationError` / `dateError` not cleared.
- `mobileFiltersOpen` not closed (jarring on mobile reset).
- `viewMode` is intentionally preserved (user preference) — leave as-is.
- `page` not explicitly reset (already cleared via URL params but be explicit for clarity).

### Approach

Single source of truth for reset: extend `resetFilters()` to nuke all transient UI alongside the URL params.

### Implementation steps

```ts
function resetFilters() {
  setSearchParams(new URLSearchParams());
  setShowFavoritesOnly(false);
  setDetailTour(null);
  setMobileFiltersOpen(false);
  setValidationError(null);
  // dateError is derived — no setter needed
}
```

Also wire the same reset to the chip "clear all" affordance if one exists, and to the empty-state "Reset filters" CTA introduced in Phase 3 #18.

### Verification

1. Apply filters, favorite a few, open detail, open mobile drawer — click reset.
2. URL is bare `/search`; no modal; no drawer; no chips; favorites toggle off.
3. View mode (grid/list) preserved.

### Risks & mitigations

- **Risk:** users may want to keep dates after reset (common pattern on hotel sites). **Mitigation:** out of scope; current "reset all" is unambiguous. Revisit in Phase 4 if telemetry justifies a softer "Clear filters" vs "Reset everything" split.

---

## 6. Silent destination fetch failure

### Problem

When `fetchPublicDestinations()` rejects, the catch handler sets `destinations` to `[]`. The destination filter section silently renders an empty list. Users cannot retry, cannot tell whether their region "just isn't there" or whether the request failed.

### Root cause

Error swallowed without surfacing.

### Approach

Introduce a small loading/error state machine for destinations. Show:

- A skeleton row while loading.
- A retry banner on error.
- The list on success.
- An "empty" hint only when the response is genuinely empty.

### Implementation steps

1. Add state:
   ```ts
   const [destinationsState, setDestinationsState] = useState<
     | { status: "loading" }
     | { status: "error"; message: string }
     | { status: "ready"; items: PublicDestinationSummary[] }
   >({ status: "loading" });
   ```
   Replace the existing `destinations` state and consumers.
2. Extract the fetch into a callback so the retry button can call it:
   ```ts
   const loadDestinations = useCallback(() => {
     setDestinationsState({ status: "loading" });
     fetchPublicDestinations()
       .then((items) => setDestinationsState({ status: "ready", items: items.filter((i) => i.count > 0) }))
       .catch((err) => setDestinationsState({
         status: "error",
         message: err instanceof Error ? err.message : "Nepodařilo se načíst destinace.",
       }));
   }, []);
   useEffect(() => { loadDestinations(); }, [loadDestinations]);
   ```
3. In the destination panel render branch:
   ```tsx
   {destinationsState.status === "loading" && <DestinationSkeleton />}
   {destinationsState.status === "error" && (
     <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm">
       <p className="text-red-700">{destinationsState.message}</p>
       <button onClick={loadDestinations} className="mt-2 underline">Zkusit znovu</button>
     </div>
   )}
   {destinationsState.status === "ready" && destinationsState.items.length === 0 && (
     <p className="text-sm text-slate-500">Zatím nejsou dostupné žádné destinace.</p>
   )}
   {destinationsState.status === "ready" && destinationsState.items.length > 0 && (
     /* existing list */
   )}
   ```
4. Update any code reading `destinations` (e.g. `activeChips` lookup of destination name) to read from `destinationsState.status === "ready" ? destinationsState.items : []`.

### Verification

1. Block `/api/search/destinations` in DevTools → reload `/search` → retry banner appears; "Zkusit znovu" refetches.
2. Restore network → list renders.
3. Lighthouse a11y — `role="alert"` announces to screen readers.

### Risks & mitigations

- **Risk:** flicker between loading skeleton and list on fast networks. **Mitigation:** acceptable; skeleton is visually subtle.

---

## Phase 1 exit checklist

- [ ] All 6 items implemented and reviewed.
- [ ] No new `any`, no new dependencies.
- [ ] No `console.log` left in `SearchPage.tsx`.
- [ ] `npm --workspace client run lint && npm --workspace client run build` green.
- [ ] Manual verification cases above all pass in Chrome desktop + Chrome mobile emulation.
- [ ] PR description lists each fix with the verification recipe.

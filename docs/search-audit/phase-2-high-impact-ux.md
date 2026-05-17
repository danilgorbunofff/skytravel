# Phase 2 — High-Impact UX & Accessibility

> Phase 2 starts only after [Phase 1](./phase-1-critical-blockers.md) ships. This phase eliminates the most painful UX friction (preset hijacking, sluggish slider, no focus management) and brings the page in line with the project's Czech-first i18n contract.

**Files in scope**

- [client/src/pages/SearchPage.tsx](../../client/src/pages/SearchPage.tsx)
- [client/src/components/PriceRangeSlider.tsx](../../client/src/components/PriceRangeSlider.tsx)
- [client/src/components/TourDetailModal.tsx](../../client/src/components/) *(new — extracted from SearchPage; see item 9)*
- [client/src/hooks/useLanguage.ts](../../client/src/hooks/useLanguage.ts)
- [client/src/data.ts](../../client/src/data.ts)

**Definition of done**

- Phase 1 checklist still green.
- Lighthouse Accessibility on `/search` ≥ baseline + 5 points.
- Switching language to en / uk / ru via the existing language switcher leaves zero Czech strings on the public search page chrome (tour data from providers remains untranslated — out of scope).

---

## 7. Favorites chip in `activeChips`

### Problem

Every other active filter gets a removable chip in the top chip row. Favorites-only is invisible there, so users who toggled it (then scrolled) cannot tell why results shrank.

### Approach

Treat `showFavoritesOnly` as a virtual chip. Its `clear` action is a function, not a URL-param patch — so widen the chip type to allow either.

### Implementation

1. Widen `activeChips` element type:
   ```ts
   type Chip = { label: string; onClear: () => void };
   ```
2. After the existing chips are pushed, append:
   ```ts
   if (showFavoritesOnly) {
     chips.push({ label: t("chipFavorites"), onClear: () => setShowFavoritesOnly(false) });
   }
   ```
3. Update the chip render to call `chip.onClear()` instead of `updateParams(chip.clear)`. Migrate existing chips to the new shape:
   ```ts
   chips.push({ label: `"${activeQuery}"`, onClear: () => updateParams({ q: null }) });
   ```
4. Add `"chipFavorites"` translation key (see item 13).

### Verification

- Toggle favorites → chip appears, click × to clear → toggle flips off, chip disappears.

---

## 8. Hide presets when search active

### Problem

`PRESETS` pills (`⚡ Last Minute`, `🍽 All Inclusive`, …) are rendered above the form **at all times**. Mid-scroll, clicking one rewrites filters unexpectedly and the user loses their place.

### Approach

Presets are an "empty state nudge." Hide them once a search is active.

### Implementation

```tsx
{!hasActiveSearch && (
  <div className="preset-pills">
    {PRESETS.map((p) => <PresetButton key={p.label} preset={p} />)}
  </div>
)}
```

`hasActiveSearch` is already computed in the file. No extra state.

### Verification

- Land on `/search` cold → presets visible. Apply any filter → presets hidden. Reset filters → presets visible again.

---

## 9. Detail modal focus management & extraction

### Problem

The detail modal lives inline (~240 lines, L1152-L1390 in `SearchPage.tsx`) and has zero focus management:

- Focus stays on the tour card behind the overlay.
- Tab moves into the background page (sighted keyboard users get lost; screen reader users lose the announced context).
- Esc closes only because the backdrop click handler happens to be there — there's no keydown handler.
- On close, focus is dropped (lands on `<body>`).

### Approach

1. **Extract** the modal into [`client/src/components/TourDetailModal.tsx`](../../client/src/components/). Keeping ~240 lines of modal inside the page makes Phase 2 #9 risky and obscures Phase 3 refactors. This is the right moment.
2. Implement a **native focus trap** (no new dependency). Pattern:
   - On open: save `document.activeElement` as `previouslyFocused`. Focus the close button.
   - On Tab: if focused element is the last tabbable, wrap to the first (and vice versa for Shift+Tab).
   - On Esc: call `onClose`.
   - On unmount: `previouslyFocused?.focus()`.
3. Use `inert` (or `aria-hidden="true"` + tabindex pruning) on the page background while the modal is open. `inert` is supported in all evergreen browsers and is the cleanest answer.

### Implementation

1. Create `TourDetailModal.tsx`:
   ```tsx
   interface Props {
     tour: UnifiedTour;
     offerGroupItems?: UnifiedTour[];
     offerGroupLoading: boolean;
     offerGroupError?: string;
     onClose: () => void;
     onInquiry: (tour: UnifiedTour) => void;
   }
   export function TourDetailModal(props: Props) { /* ... */ }
   ```
   Move all JSX currently inside the conditional `{detailTour && <div role="dialog">...` block.
2. Inside the modal, set up refs:
   ```ts
   const containerRef = useRef<HTMLDivElement>(null);
   const closeButtonRef = useRef<HTMLButtonElement>(null);
   const previouslyFocused = useRef<HTMLElement | null>(null);
   ```
3. Effects:
   ```ts
   useEffect(() => {
     previouslyFocused.current = document.activeElement as HTMLElement | null;
     closeButtonRef.current?.focus();
     return () => previouslyFocused.current?.focus?.();
   }, []);

   useEffect(() => {
     function onKey(e: KeyboardEvent) {
       if (e.key === "Escape") { onClose(); return; }
       if (e.key !== "Tab" || !containerRef.current) return;
       const focusables = containerRef.current.querySelectorAll<HTMLElement>(
         'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
       );
       if (focusables.length === 0) return;
       const first = focusables[0];
       const last = focusables[focusables.length - 1];
       if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
       else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
     }
     document.addEventListener("keydown", onKey);
     return () => document.removeEventListener("keydown", onKey);
   }, [onClose]);
   ```
4. Mark the background `inert` via a side effect that toggles the attribute on the page's main container ref (passed down or via context). Simpler interim: add `aria-hidden="true"` to `#root > main` while the modal is open.
5. Render:
   ```tsx
   <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby="detail-title">
     <button ref={closeButtonRef} onClick={onClose} aria-label={t("close")}>×</button>
     {/* ... */}
   </div>
   ```
6. In `SearchPage.tsx`, replace the inline modal block with `<TourDetailModal ... />`.

### Verification

- Keyboard-only flow:
  1. Tab to a tour card → Enter → modal opens, focus on close button.
  2. Tab through modal — focus cycles within; never escapes to background.
  3. Esc → modal closes, focus returns to the originating card.
- Screen reader: VoiceOver announces "Detail zájezdu, dialog" on open.
- Visual: no behavioural regressions vs. inline version (image, offers list, inquiry button still functional).

### Risks & mitigations

- **Risk:** extraction breaks something subtle (analytics event, scroll lock). **Mitigation:** diff carefully; keep the body-scroll-lock effect inside the modal component.

---

## 10. Reliable scroll-to-results

### Problem

`pageTo()` uses `setTimeout(..., 0)` to scroll after `updateParams`. State updates are not guaranteed to have applied by the next macrotask tick, so on slower devices the scroll happens before the new page renders and the user lands on the wrong spot.

### Approach

Scroll inside a layout-committed effect keyed on `page` after the new `result` is in.

### Implementation

1. Remove the `setTimeout` from `pageTo`.
2. Add a ref + effect at the top level of `SearchPage`:
   ```ts
   const resultsSectionRef = useRef<HTMLDivElement>(null);
   const previousPageRef = useRef<number>(page);
   useEffect(() => {
     if (previousPageRef.current === page) return;
     previousPageRef.current = page;
     // Wait one frame so the new page's content is painted.
     requestAnimationFrame(() => {
       resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
     });
   }, [page, result]);
   ```
3. Attach `ref={resultsSectionRef}` to the results section root.

### Verification

- Throttle to "Fast 3G", paginate — scroll lands cleanly on the new page header every time. No "double scroll" where the page jumps mid-render.

---

## 11. Skeleton loaders for filter changes

### Problem

While a refetch is in flight after a filter change (`resultsLoading && result`), the page shows the *stale* result grid with no loading indication. Users assume the filter was ignored.

### Approach

Render a skeleton grid overlay on top of stale results, or dim them, while a refetch is in flight. Cheapest correct option: a lightweight overlay with `aria-busy="true"`.

### Implementation

1. Wrap the results grid:
   ```tsx
   <div aria-busy={resultsLoading} className={cn("relative", resultsLoading && "opacity-60")}>
     <ul className="tour-grid">{/* tours */}</ul>
     {resultsLoading && (
       <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-8">
         <span className="text-sm text-slate-600">Aktualizuji…</span>
       </div>
     )}
   </div>
   ```
2. Reuse the existing initial-load skeleton component if available; otherwise the dim+aria-busy combination is acceptable.
3. Ensure the pager is disabled while loading (`disabled={resultsLoading}` on each page button) to avoid double-fire.

### Verification

- Change a filter → results dim, "Aktualizuji…" appears, then results refresh. No flash of an empty grid.

---

## 12. Price slider feedback

### Problem

[`PriceRangeSlider.tsx`](../../client/src/components/PriceRangeSlider.tsx) debounces at **400 ms**. Drag feels sluggish; commit feels unresponsive. The slider also has no visual cue that a debounce is in flight.

### Approach

1. Reduce debounce to **150 ms** — fast enough to feel reactive, slow enough to absorb mid-drag micro-movements.
2. Add `aria-busy` and a subtle `opacity-90` while debounced commit is pending.
3. Add `aria-valuemin/max/now` and `aria-label` to each `<input type="range">` for screen readers.

### Implementation

```diff
- timer.current = setTimeout(() => onChange(nextMin, nextMax), 400);
+ timer.current = setTimeout(() => {
+   onChange(nextMin, nextMax);
+   setPending(false);
+ }, 150);
+ setPending(true);
```

Add `const [pending, setPending] = useState(false);`. Render container with `aria-busy={pending} className={cn("price-slider", pending && "opacity-90")}`.

Add ARIA on each input:
```tsx
<input
  type="range"
  aria-label={`Cena od ${localMin.toLocaleString("cs-CZ")} Kč`}
  /* existing props */
/>
```

### Verification

- Drag slider — values update in label immediately; results refetch within ~150 ms of release.
- Tab to slider; arrow keys adjust; VoiceOver announces the value.

---

## 13. i18n sweep of `/search`

### Problem

`SearchPage.tsx` contains dozens of hardcoded Czech strings. Switching language has no effect on:

- `TRANSPORT_OPTIONS`, `BOARD_OPTIONS`, `NIGHTS_OPTIONS` labels (L22-L42).
- `transportLabel`, `boardLabel` lookup tables (L52, L62).
- Form labels: "Kam pojedeme", "Odjezd od", "Návrat do", "Skladba osob", … (L583-L688).
- Chip prefixes: "Od ", "Do ", "Cena: ".
- Validation: "Datum odjezdu nesmí být po datu návratu."
- Empty/loading states: "Hledám zájezdy…", "Žádné nabídky", "Zadejte destinaci…".
- Pager labels, button labels, drawer labels.

This violates the [copilot-instructions.md](../../.github/copilot-instructions.md) i18n contract.

### Approach

Funnel every literal through `useLanguage().t()`. Add keys to all four locales in [client/src/data.ts](../../client/src/data.ts).

### Scope

**Only the public Search page** in this PR. Admin pages, home page, modals not on `/search`, and provider-supplied tour data stay untouched. This keeps the diff reviewable and matches Decision #2 in the parent plan.

### Implementation steps

1. Inventory: grep `SearchPage.tsx` for all Czech literals (rough heuristic: `/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/`). Build a key naming convention: `search.<area>.<thing>`, e.g.:
   - `searchTransportPlane`, `searchTransportBus`, `searchTransportCar`
   - `searchBoardAI`, `searchBoardUAI`, `searchBoardFB`, `searchBoardHB`, `searchBoardBB`, `searchBoardRO`
   - `searchNightsAny`, `searchNightsShort`, `searchNights79`, `searchNights1013`, `searchNights14plus`
   - `searchPresetLastMinute`, `searchPresetAI`, `searchPresetFamily`, `searchPresetShort`
   - `searchChipFromDate`, `searchChipToDate`, `searchChipPriceRange`
   - `searchValidationDateOrder`
   - `searchLoading`, `searchNoResults`, `searchEmptyPrompt`
   - `searchPagePrev`, `searchPageNext`, `searchPagerOfN`
   - `searchFiltersTitle`, `searchFiltersApply`, `searchFiltersReset`
   - `searchFavoritesToggleOn`, `searchFavoritesToggleOff`, `chipFavorites`
2. Add the keys to `translations.cs` first (verbatim copy of current Czech).
3. Add the same keys with translations to `translations.en`, `translations.uk`, `translations.ru`. Use professional, concise wording; ask design/marketing if in doubt rather than guessing.
4. In `SearchPage.tsx`, import `useLanguage`, destructure `t`, and replace each literal. For the option arrays, derive them inside the component:
   ```ts
   const TRANSPORT_OPTIONS = useMemo(() => [
     { value: "plane", label: t("searchTransportPlane") },
     { value: "bus", label: t("searchTransportBus") },
     { value: "car", label: t("searchTransportCar") },
   ], [t]);
   ```
   Same for `BOARD_OPTIONS`, `NIGHTS_OPTIONS`, `PRESETS`, `transportLabel`, `boardLabel`.
5. For interpolation strings ("Zobrazeno X–Y z N hotelů"), prefer a small `formatTotals(t, visibleFrom, visibleTo, total)` helper that concatenates pre-translated fragments. Avoid template parsing libraries.
6. Number formatting stays via `toLocaleString("cs-CZ")` regardless of UI language — Czech crown amounts are locale-stable in this market. Document this decision in the helper.

### Verification

1. Switch language to en → all chrome translated (form, filters, chips, pager, modal labels).
2. Switch to uk → same.
3. Switch to ru → same.
4. Zero Czech leakage on the search page chrome. Provider tour names remain in their source language (expected).
5. `npm --workspace client run build` produces no missing-key warnings.

### Risks & mitigations

- **Risk:** translation typos. **Mitigation:** for en/uk/ru, request marketing review before merge.
- **Risk:** key sprawl. **Mitigation:** namespace with `search…` prefix; one cohesive block in `translations.cs`.

---

## Phase 2 exit checklist

- [ ] All 7 items shipped.
- [ ] Lighthouse a11y on `/search` improved by ≥ 5 points vs. Phase 1 baseline.
- [ ] Keyboard-only end-to-end flow works (search → filter → open detail → close → paginate).
- [ ] Language switcher tested across cs/en/uk/ru.
- [ ] `TourDetailModal.tsx` extracted; `SearchPage.tsx` shrunk accordingly.
- [ ] No regressions in mobile drawer or favorites pagination from Phase 1.

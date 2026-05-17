# Phase 3 — Code Quality & Polish

> Phase 3 reduces accumulated tech debt around `SearchPage.tsx` and its helpers, makes the file easier to evolve, and removes the sharper UX edges that survived Phase 2. No new product surfaces in this phase — it's strictly cleanup and last-mile polish.

**Files in scope**

- [client/src/pages/SearchPage.tsx](../../client/src/pages/SearchPage.tsx)
- [client/src/components/CompareTray.tsx](../../client/src/components/CompareTray.tsx)
- [client/src/components/PriceRangeSlider.tsx](../../client/src/components/PriceRangeSlider.tsx)
- [client/src/lib/formatters.ts](../../client/src/lib/) *(new)*

**Definition of done**

- Phase 2 checklist still green.
- No duplicated helper between `SearchPage.tsx` and `CompareTray.tsx`.
- Zero ESLint warnings.
- Zero new `any`. No new dependencies.

---

## 14. Deduplicate helpers

### Problem

`fmtDate` and `starsDisplay` are defined verbatim in both:

- [`SearchPage.tsx`](../../client/src/pages/SearchPage.tsx) (~L116, L120).
- [`CompareTray.tsx`](../../client/src/components/CompareTray.tsx) (L13, L16).

Two copies = two future bugs. The Czech `toLocaleString("cs-CZ")` choice is also implicit.

### Approach

Create a shared formatters module. Keep functions tiny and pure.

### Implementation

1. Create [`client/src/lib/formatters.ts`](../../client/src/lib/):
   ```ts
   /**
    * Format an ISO date string as a Czech short date.
    * Returns the original string if parsing fails (defensive against provider data).
    */
   export function fmtDate(value: string): string {
     const date = new Date(value);
     return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("cs-CZ");
   }

   /**
    * Render a 1–5 star rating as filled/empty Unicode stars.
    * Returns "" for invalid input.
    */
   export function starsDisplay(value: string | undefined): string {
     const stars = Number(value);
     if (!Number.isFinite(stars) || stars < 1 || stars > 5) return "";
     return "★".repeat(stars) + "☆".repeat(5 - stars);
   }
   ```
2. Replace both call sites:
   ```ts
   import { fmtDate, starsDisplay } from "../lib/formatters";
   ```
3. Delete the local definitions in `SearchPage.tsx` and `CompareTray.tsx`.

### Verification

- Grep: `rg "function fmtDate" client/src` should return one match (in `lib/formatters.ts`).
- Visual diff: rendered dates and stars unchanged in both surfaces.

### Decision: `normalizeFallbackText`

Leave inline in `SearchPage.tsx`. It's used only by `getTourFallbackImage` and pulling it out doesn't help. Premature.

---

## 15. Memoize `getTourFallbackImage`

### Problem

`getTourFallbackImage(destination)` is called per tour, per render. Inside, it does an `Object.entries(...).find(...)` then an `Array.find(...)`. With 24 tours × ~6 re-renders during a typical filter session, that's hundreds of redundant traversals.

### Approach

Module-level `Map` cache keyed by the input destination string. Inputs are bounded (~dozens of distinct destinations), so unbounded memo is safe.

### Implementation

```ts
const fallbackImageCache = new Map<string, string>();

export function getTourFallbackImage(destination: string): string {
  const cached = fallbackImageCache.get(destination);
  if (cached) return cached;
  // ...existing logic...
  fallbackImageCache.set(destination, result);
  return result;
}
```

### Verification

- Add a temporary `console.log` (remove before commit): function body runs once per unique destination per session.

---

## 16. Explain `eslint-disable`

### Problem

The bootstrap `useEffect` ends with `// eslint-disable-line react-hooks/exhaustive-deps` and no explanation. Next reader assumes laziness.

### Approach

Add a one-line rationale and switch to a block comment so it's visible in diff reviews.

### Implementation

```ts
useEffect(() => {
  // One-shot bootstrap fetch on mount; deliberately runs once.
  // Re-running on dependency change would re-trigger network fetches and reset providers.
  // ...effect body...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

If the linter complains about the placement of the disable directive, hoist it above the closing `[])` or move to `eslint-disable-next-line` on the line before `}, []);`.

---

## 17. Refine `activeChips` dependencies

### Problem

```ts
useMemo(..., [activeQuery, ..., searchParams, priceRange, destinations]);
```

`searchParams` is the entire `URLSearchParams` object reference. Any param change invalidates the memo, including unrelated changes like `page`. The memo runs more often than necessary.

### Approach

Extract the two `searchParams.get` calls used in the memo (`priceMin`, `priceMax`) into scalars before the memo, depend on those scalars only.

### Implementation

```ts
const activePriceMin = searchParams.get("priceMin");
const activePriceMax = searchParams.get("priceMax");

const activeChips = useMemo(
  () => { /* use activePriceMin / activePriceMax instead of searchParams.get */ },
  [activeQuery, activeDateStart, activeDateEnd, activeTransport,
   activeDestinationSlug, activeNights, activeStars, activeBoard,
   activePriceMin, activePriceMax, priceRange, destinationsState],
);
```

Note `destinationsState` (from [Phase 1 #6](./phase-1-critical-blockers.md#6-silent-destination-fetch-failure)) replaces `destinations`.

### Verification

- React DevTools Profiler → flame chart shows `activeChips` recomputation only when one of the chip-relevant params changes.

---

## 18. Friendlier empty state

### Problem

When `hasActiveSearch && result?.filtered === 0`, the UI shows the bare string "Žádné nabídky". No guidance, no CTA, no reset, no clue what filter is too aggressive.

### Approach

Render a small empty-state component with:

- Icon (Lucide `SearchX` already in use repo-wide).
- Headline (translated).
- Subline suggesting the most likely culprit (price too low? dates too narrow?).
- "Resetovat filtry" button → calls `resetFilters()`.

### Implementation

```tsx
function ResultsEmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <SearchX className="h-12 w-12 text-slate-400" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-slate-700">{t("searchEmptyTitle")}</h3>
      <p className="max-w-md text-sm text-slate-500">{t("searchEmptyHint")}</p>
      <button
        type="button"
        onClick={onReset}
        className={cn(buttonBase, "mt-2")}
      >
        {t("searchFiltersReset")}
      </button>
    </div>
  );
}
```

Render in `SearchPage.tsx`:
```tsx
{hasActiveSearch && result && result.filtered === 0
  ? <ResultsEmptyState onReset={resetFilters} />
  : /* normal grid */}
```

Add `searchEmptyTitle` and `searchEmptyHint` translation keys (covered by Phase 2 #13 follow-up; if missed, add here).

### Verification

- Apply impossible filter combo (e.g. price max = 1 Kč) → empty state appears with CTA → CTA resets filters.

---

## 19. `PriceRangeSlider` empty fallback

### Problem

[`PriceRangeSlider.tsx`](../../client/src/components/PriceRangeSlider.tsx) currently returns `null` when `min >= max` (i.e. all current results share one price or none). Filter section silently has a gap; users on a narrow result set wonder where the slider went.

### Approach

Render a disabled, single-value placeholder strip with helper text.

### Implementation

```tsx
if (min >= max) {
  return (
    <div className="price-slider price-slider--disabled" aria-disabled="true">
      <p className="text-sm text-slate-500">
        {min > 0
          ? `${min.toLocaleString("cs-CZ")} Kč`
          : "Cenové rozpětí není dostupné"}
      </p>
    </div>
  );
}
```

Add a minimal `price-slider--disabled` style (single line of greyed track) or reuse existing utility classes via `cn()`.

### Verification

- Filter to a single result → slider shows greyed strip with the single price (or fallback text) instead of disappearing.

---

## 20. Remove dead code / document state choice

### Problem

The repo carries [`client/src/stores/searchStore.ts`](../../client/src/stores/searchStore.ts) and [`client/src/hooks/useProviderTours.ts`](../../client/src/hooks/useProviderTours.ts) but `SearchPage.tsx` uses neither. Future contributors will wonder which is canonical and may "fix" by migrating, breaking working code.

### Approach

Document the intentional split at the top of `SearchPage.tsx`.

### Implementation

Add a header comment block:
```ts
/**
 * Public search page.
 *
 * State management note:
 * - Uses component-local state + URL search params as the source of truth (see plan).
 * - Does NOT use the Zustand `searchStore` (reserved for the admin search flow) or
 *   the `useProviderTours` hook (used in admin tables). Mixing them here would
 *   duplicate the source of truth for filters and risk drift.
 *
 * See docs/search-audit/phase-3-code-quality.md item 20.
 */
```

If any unused imports remain (`useProviderTours` mentioned in the audit), delete them — they will fail lint.

### Verification

- `npm --workspace client run lint` clean.
- Grep `client/src/pages/SearchPage.tsx` for `searchStore` and `useProviderTours` → no matches.

---

## Phase 3 exit checklist

- [ ] All 7 items shipped.
- [ ] No duplicated `fmtDate` / `starsDisplay`.
- [ ] No stale eslint-disable without explanation.
- [ ] Empty-state CTA verified.
- [ ] `PriceRangeSlider` no longer collapses.
- [ ] PR description references this doc and notes any deviations.

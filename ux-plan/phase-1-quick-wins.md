# Phase 1 — Quick Wins

> **Effort:** 1–2 days | **Files touched:** `SearchPage.tsx`, `site.css`  
> **Goal:** Immediately improve perceived performance, clarity, and first-click intent without any backend changes.

---

## Step 1 — Skeleton loading cards instead of text spinner

**Why:** "Načítám nabídky…" text creates anxiety. Skeleton cards show the user what's coming and feel faster.

**Where:** `client/src/pages/SearchPage.tsx` — the `{resultsLoading && ...}` block around line 643.  
**Also:** `client/src/site.css` — add shimmer animation CSS.

**What to do:**

1. In `site.css`, add a shimmer keyframe and skeleton card styles:
   ```css
   @keyframes shimmer {
     0%   { background-position: -600px 0; }
     100% { background-position: 600px 0; }
   }
   .skeleton-card {
     border-radius: 10px;
     overflow: hidden;
     background: #fff;
     box-shadow: 0 1px 6px rgba(0,0,0,.07);
   }
   .skeleton-card__image {
     height: 180px;
     background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
     background-size: 600px 100%;
     animation: shimmer 1.4s infinite;
   }
   .skeleton-card__body { padding: 14px; }
   .skeleton-line {
     height: 12px;
     border-radius: 6px;
     margin-bottom: 10px;
     background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
     background-size: 600px 100%;
     animation: shimmer 1.4s infinite;
   }
   .skeleton-line--short { width: 55%; }
   .skeleton-line--price { width: 35%; height: 18px; margin-top: 16px; }
   ```

2. In `SearchPage.tsx`, replace:
   ```tsx
   {resultsLoading && <div className="search-loading">Načítám nabídky…</div>}
   ```
   with:
   ```tsx
   {resultsLoading && (
     <div className="public-tour-grid">
       {Array.from({ length: 6 }).map((_, i) => (
         <div key={i} className="skeleton-card">
           <div className="skeleton-card__image" />
           <div className="skeleton-card__body">
             <div className="skeleton-line skeleton-line--short" />
             <div className="skeleton-line" />
             <div className="skeleton-line" />
             <div className="skeleton-line skeleton-line--price" />
           </div>
         </div>
       ))}
     </div>
   )}
   ```

---

## Step 2 — Tour count badges on Oblast region buttons

**Why:** "Bulharsko (47)" tells the user there's content to find. An empty region with no badge feels broken.

**Where:** `client/src/pages/SearchPage.tsx` — the single-level region button list in the sidebar (the `search-region-list` div), around line 600–615.

**What to do:**

The `ProviderRegion` type (`client/src/types/providers.ts`) already has a `count?: number` field. It is populated from the API.

Find the region buttons in the sidebar:
```tsx
{[...new Map(regions.map((r) => [r.id, r])).values()].map((region) => (
  <button ...>{region.name}</button>
))}
```

Change to:
```tsx
{[...new Map(regions.map((r) => [r.id, r])).values()].map((region) => (
  <button ...>
    {region.name}
    {region.count != null && region.count > 0 && (
      <span className="region-count">({region.count})</span>
    )}
  </button>
))}
```

Add to `site.css`:
```css
.region-count {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-left: 4px;
  font-weight: 400;
}
```

---

## Step 3 — Deal badges on tour cards

**Why:** "Last Minute" and "Výhodná cena" are the top two triggers that make Czech travel buyers click.

**Where:** `client/src/pages/SearchPage.tsx` — the `PublicTourCard` component at the bottom of the file.

**What to do:**

1. Compute the price threshold once in the parent (where `result` is available) using `useMemo`:
   ```tsx
   const cheapThreshold = useMemo(() => {
     if (!result?.items.length) return Infinity;
     const sorted = [...result.items].map(t => t.price).sort((a, b) => a - b);
     return sorted[Math.floor(sorted.length * 0.25)] ?? Infinity;
   }, [result]);
   ```

2. Pass it as a prop into `PublicTourCard`:
   ```tsx
   <PublicTourCard key={...} tour={tour} cheapThreshold={cheapThreshold} />
   ```

3. Update the `PublicTourCard` function signature:
   ```tsx
   function PublicTourCard({ tour, cheapThreshold }: { tour: UnifiedTour; cheapThreshold: number }) {
   ```

4. Inside the card, compute badge flags:
   ```tsx
   const today = new Date();
   const departure = new Date(tour.startDate);
   const daysUntilDeparture = Math.floor((departure.getTime() - today.getTime()) / 86_400_000);
   const isLastMinute = daysUntilDeparture >= 0 && daysUntilDeparture <= 14;
   const isCheap = tour.price <= cheapThreshold;
   const isLastSpot = tour.offersCount != null && tour.offersCount <= 3;
   ```

5. In the card image area (`.public-tour-card__image`), add badge overlay:
   ```tsx
   <div className="public-tour-card__image">
     {tour.image ? <img src={tour.image} alt={tour.title} loading="lazy" /> : <div />}
     <span className="card-source-badge">{tour.source}</span>
     <div className="card-deal-badges">
       {isLastMinute && <span className="badge badge--urgent">Last Minute</span>}
       {isCheap && !isLastMinute && <span className="badge badge--deal">Výhodná cena</span>}
       {isLastSpot && <span className="badge badge--spot">Poslední místo</span>}
     </div>
   </div>
   ```

6. Add to `site.css`:
   ```css
   .card-deal-badges {
     position: absolute;
     top: 10px;
     left: 10px;
     display: flex;
     flex-direction: column;
     gap: 4px;
   }
   .badge {
     display: inline-block;
     padding: 3px 8px;
     border-radius: 4px;
     font-size: 0.7rem;
     font-weight: 700;
     text-transform: uppercase;
     letter-spacing: .03em;
   }
   .badge--urgent { background: #e53e3e; color: #fff; }
   .badge--deal   { background: #2f855a; color: #fff; }
   .badge--spot   { background: #c05621; color: #fff; }
   ```
   Also make `.public-tour-card__image` `position: relative` if not already.

---

## Step 4 — Tour duration always visible on cards

**Why:** Night count is the #1 data point travel buyers need. It's currently only shown `if tour.nights != null` — but many tours don't have this field. Compute it from dates as fallback.

**Where:** `PublicTourCard` in `SearchPage.tsx` — the `.public-tour-facts` section.

**What to do:**

Replace the nights span:
```tsx
{tour.nights != null && <span>{tour.nights} nocí</span>}
```
with:
```tsx
{(() => {
  const nights = tour.nights ?? Math.round(
    (new Date(tour.endDate).getTime() - new Date(tour.startDate).getTime()) / 86_400_000
  );
  return Number.isFinite(nights) && nights > 0 ? <span>{nights} nocí</span> : null;
})()}
```

---

## Step 5 — Helpful empty state

**Why:** "Nic jsme nenašli" is a dead end. An empty state should give users 3 things to try next.

**Where:** `SearchPage.tsx` — the block `{!resultsLoading && !error && result?.items.length === 0 && (...)}`

**What to do:**

Replace:
```tsx
<div className="search-empty">
  <h3>Nic jsme nenašli</h3>
  <p>Zkuste upravit destinaci, termín nebo vybrat jiného partnera.</p>
</div>
```

with:
```tsx
<div className="search-empty search-empty--results">
  <div className="search-empty__icon">🔍</div>
  <h3>Žádné nabídky nenalezeny</h3>
  <p>Pro zadané filtry jsme nic nenašli. Zkuste:</p>
  <ul className="search-empty__tips">
    <li>
      <button type="button" onClick={resetFilters}>Zrušit všechny filtry</button>
    </li>
    <li>Rozšířit datum odjezdu o ±1–2 týdny</li>
    <li>Vybrat jiný cílový region v záložce Oblast</li>
    <li>
      Nebo nás <a href="tel:+420721163860">zavolejte</a> — poradíme osobně
    </li>
  </ul>
</div>
```

Add to `site.css`:
```css
.search-empty--results { text-align: left; padding: 32px; }
.search-empty__icon { font-size: 2.5rem; margin-bottom: 12px; }
.search-empty__tips { margin-top: 12px; padding-left: 18px; }
.search-empty__tips li { margin-bottom: 8px; }
.search-empty__tips button {
  background: none;
  border: none;
  color: var(--blue);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: inherit;
}
```

---

## Step 6 — Active filter chips above results

**Why:** Users don't know what filters are active unless they scroll back to the sidebar. Chips make active state immediately visible and one-click removable.

**Where:** `SearchPage.tsx` — add immediately before the `<div className="public-tour-grid">`.

**What to do:**

1. Build a chips array from active URL params:
   ```tsx
   const activeChips = useMemo(() => {
     const chips: { label: string; clear: Record<string, null> }[] = [];
     if (activeQuery) chips.push({ label: `"${activeQuery}"`, clear: { q: null } });
     if (activeDateStart) chips.push({ label: `Od ${fmtDate(activeDateStart)}`, clear: { dateStart: null } });
     if (activeDateEnd) chips.push({ label: `Do ${fmtDate(activeDateEnd)}`, clear: { dateEnd: null } });
     if (activeTransport) chips.push({ label: transportLabel[activeTransport] ?? activeTransport, clear: { transport: null } });
     if (activeZeme) {
       const region = regions.find(r => String(r.id) === activeZeme);
       chips.push({ label: region?.name ?? activeZeme, clear: { zeme: null } });
     }
     if (activeStateId) {
       const dest = destinationCountries.find(c => String(c.id) === activeStateId);
       chips.push({ label: dest?.name ?? activeStateId, clear: { stateId: null } });
     }
     if (activeTownFrom) {
       const city = departureCities.find(c => String(c.id) === activeTownFrom);
       chips.push({ label: `Z: ${city?.name ?? activeTownFrom}`, clear: { townFrom: null, stateId: null } });
     }
     return chips;
   }, [activeQuery, activeDateStart, activeDateEnd, activeTransport, activeZeme, activeStateId, activeTownFrom, regions, destinationCountries, departureCities]);
   ```

2. Render chips row above the grid (inside `.search-results-main`, after toolbar):
   ```tsx
   {activeChips.length > 0 && (
     <div className="active-chips">
       {activeChips.map((chip) => (
         <button
           key={chip.label}
           type="button"
           className="active-chip"
           onClick={() => updateParams({ ...chip.clear, page: 1 })}
         >
           {chip.label} ✕
         </button>
       ))}
     </div>
   )}
   ```

3. Add to `site.css`:
   ```css
   .active-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
   .active-chip {
     display: inline-flex;
     align-items: center;
     gap: 6px;
     padding: 4px 10px;
     background: #ebf4ff;
     border: 1px solid #bee3f8;
     border-radius: 20px;
     font-size: 0.8rem;
     color: #2b6cb0;
     cursor: pointer;
     font-weight: 500;
   }
   .active-chip:hover { background: #bee3f8; }
   ```

---

## Step 7 — Sort button visual clarity

**Why:** Current sort buttons show "Cena ↑" but don't visually distinguish active vs inactive. Users don't know which sort is applied.

**Where:** `SearchPage.tsx` — the `.search-sort-actions` div in the toolbar.

**What to do:**

The buttons already receive `is-active` class when active. Ensure `site.css` has a clear active style:
```css
.search-sort-actions button.is-active {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}
.search-sort-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

Also make the arrow part more explicit — replace the `↑`/`↓` unicode with a styled span:
```tsx
Cena {sortBy === "price" ? <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span> : ""}
```
```css
.sort-arrow { font-size: 0.85rem; opacity: 0.9; }
```

---

## Verification Checklist

- [ ] Skeleton cards appear when loading (not text), grid shows 6 placeholders
- [ ] Region buttons with count: "Bulharsko (47)" style
- [ ] Last Minute badge appears for tours departing within 14 days
- [ ] Night count is visible on every card (computed from dates if missing)
- [ ] Empty state shows 4 actionable suggestions
- [ ] Active filter chips appear above grid when any filter is set, each chip removes its filter on click
- [ ] Sort buttons clearly highlight which is active with blue background
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)

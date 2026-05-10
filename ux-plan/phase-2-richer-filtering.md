# Phase 2 — Richer Filtering

> **Effort:** 3–5 days | **Files touched:** `SearchPage.tsx`, `site.css`, new `PriceRangeSlider.tsx`  
> **Goal:** Give users enough filter control to narrow down to exactly what they want, reducing abandonment from "too many irrelevant results".

---

## Overview of new filters

| Filter | Where applied | Source data |
|---|---|---|
| Price range slider | Sidebar | `UnifiedFilters.priceMin/Max` (API-supported) |
| Nights range | Sidebar | Client-side from `tour.nights` / date diff |
| Stars rating | Sidebar | Client-side from `tour.stars` |
| Board type | Sidebar | Client-side from `tour.board` |
| Adults + children | Hero search form | URL params `adults`/`children` |
| Departure city in hero | Hero form (OrexTravel only) | `isTwoLevel` condition |
| Filter preset pills | Above results | Preset URL param combinations |

**Important:** Steps 1–4 (nights, stars, board) filter the **already-fetched result set** on the client, not via extra API calls. This is the fastest approach — no backend changes needed.

---

## Step 1 — Price range slider

**Why:** Price is the #1 filter in travel. "Od 12 000 Kč do 35 000 Kč" is more intuitive than two text inputs.

### 1a — Create `client/src/components/PriceRangeSlider.tsx`

```tsx
import { useEffect, useRef, useState } from "react";

interface Props {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}

export function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }: Props) {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when URL params change
  useEffect(() => { setLocalMin(valueMin); }, [valueMin]);
  useEffect(() => { setLocalMax(valueMax); }, [valueMax]);

  function commit(nextMin: number, nextMax: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(nextMin, nextMax), 400);
  }

  return (
    <div className="price-slider">
      <div className="price-slider__labels">
        <span>{localMin.toLocaleString("cs-CZ")} Kč</span>
        <span>{localMax.toLocaleString("cs-CZ")} Kč</span>
      </div>
      <div className="price-slider__track">
        <input
          type="range"
          min={min} max={max} step={500}
          value={localMin}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), localMax - 500);
            setLocalMin(v);
            commit(v, localMax);
          }}
        />
        <input
          type="range"
          min={min} max={max} step={500}
          value={localMax}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), localMin + 500);
            setLocalMax(v);
            commit(localMin, v);
          }}
        />
      </div>
    </div>
  );
}
```

Add to `site.css`:
```css
.price-slider { padding: 8px 0; }
.price-slider__labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 8px;
  color: #555;
}
.price-slider__track { position: relative; }
.price-slider__track input[type=range] {
  width: 100%;
  position: absolute;
  pointer-events: none;
  -webkit-appearance: none;
  height: 4px;
  background: transparent;
}
.price-slider__track input[type=range]::-webkit-slider-thumb {
  pointer-events: all;
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--blue);
  cursor: pointer;
}
```

### 1b — Add to `SearchPage.tsx`

1. Import: `import { PriceRangeSlider } from "../components/PriceRangeSlider";`

2. Compute min/max from current results using `useMemo`:
   ```tsx
   const priceRange = useMemo(() => {
     if (!result?.items.length) return { min: 0, max: 200000 };
     const prices = result.items.map(t => t.price);
     return { min: Math.floor(Math.min(...prices) / 500) * 500,
              max: Math.ceil(Math.max(...prices) / 500) * 500 };
   }, [result]);
   ```

3. Read current filter values from URL:
   ```tsx
   const priceMin = Number(searchParams.get("priceMin")) || priceRange.min;
   const priceMax = Number(searchParams.get("priceMax")) || priceRange.max;
   ```

4. Add to sidebar (in `search-filter-block` after Oblast):
   ```tsx
   <div className="search-filter-block">
     <h2>Cena</h2>
     <PriceRangeSlider
       min={priceRange.min}
       max={priceRange.max}
       valueMin={priceMin}
       valueMax={priceMax}
       onChange={(min, max) => updateParams({ priceMin: min, priceMax: max, page: 1 })}
     />
   </div>
   ```

5. Pass `priceMin`/`priceMax` to `buildFilters()` — already supported by `UnifiedFilters` type and the backend API endpoint (`providerSearchPublic.ts` already validates these).

---

## Step 2 — Nights range filter

**Why:** A couple wants 7 nights. A family wants 14. Without this filter, they wade through irrelevant results.

**Where:** Sidebar in `SearchPage.tsx`, client-side filtering.

**What to do:**

1. Add state for `clientNights` URL param (handled via `searchParams`):
   ```tsx
   const activeNights = searchParams.get("nights") ?? "";
   ```

2. Add `nightsOptions`:
   ```tsx
   const NIGHTS_OPTIONS = [
     { value: "", label: "Libovolná délka" },
     { value: "1-6",  label: "do 6 nocí" },
     { value: "7-9",  label: "7–9 nocí" },
     { value: "10-13", label: "10–13 nocí" },
     { value: "14-99", label: "14 a více nocí" },
   ];
   ```

3. Add sidebar block:
   ```tsx
   <div className="search-filter-block">
     <h2>Délka pobytu</h2>
     <select
       value={activeNights}
       onChange={(e) => updateParams({ nights: e.target.value, page: 1 })}
     >
       {NIGHTS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
     </select>
   </div>
   ```

4. Filter results client-side. After `result` is fetched, apply client filter before passing to card grid:
   ```tsx
   const displayedTours = useMemo(() => {
     let items = result?.items ?? [];
     if (activeNights) {
       const [lo, hi] = activeNights.split("-").map(Number);
       items = items.filter(t => {
         const n = t.nights ?? Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000);
         return n >= lo && n <= hi;
       });
     }
     return items;
   }, [result, activeNights]);
   ```

5. Replace `result?.items` with `displayedTours` in the grid render.

---

## Step 3 — Stars rating filter

**Why:** 3-star vs 5-star is a fundamental decision filter for Czech holiday buyers.

**Where:** Sidebar in `SearchPage.tsx`, client-side filtering of `displayedTours`.

**What to do:**

1. Read URL param:
   ```tsx
   const activeStars = searchParams.get("stars") ?? "";
   ```

2. Add sidebar block:
   ```tsx
   <div className="search-filter-block">
     <h2>Hodnocení hotelu</h2>
     <div className="stars-filter-list">
       {["", "3", "4", "5"].map(v => (
         <button
           key={v}
           type="button"
           className={activeStars === v ? "is-active" : ""}
           onClick={() => updateParams({ stars: v, page: 1 })}
         >
           {v === "" ? "Vše" : "★".repeat(Number(v))}
         </button>
       ))}
     </div>
   </div>
   ```

3. Extend the `displayedTours` memo from Step 2 to also apply stars filter:
   ```tsx
   if (activeStars) {
     const minStars = Number(activeStars);
     items = items.filter(t => Number(t.stars) >= minStars);
   }
   ```

4. Style in `site.css`:
   ```css
   .stars-filter-list { display: flex; flex-direction: column; gap: 6px; }
   .stars-filter-list button {
     text-align: left;
     padding: 6px 10px;
     border-radius: 6px;
     border: 1px solid #e2e8f0;
     background: #fff;
     cursor: pointer;
     font-size: 0.9rem;
     letter-spacing: .05em;
   }
   .stars-filter-list button.is-active {
     background: var(--blue);
     color: #fff;
     border-color: var(--blue);
   }
   ```

---

## Step 4 — Board type filter

**Why:** All-Inclusive is a top search criterion for Czech families. Without it, they scan every card manually.

**Where:** Sidebar in `SearchPage.tsx`, client-side filtering.

**What to do:**

1. Read URL param:
   ```tsx
   const activeBoard = searchParams.get("board") ?? "";
   ```

2. Board options (use codes matching `boardLabel` map already in the file):
   ```tsx
   const BOARD_OPTIONS = [
     { value: "AI",  label: "All Inclusive" },
     { value: "UAI", label: "Ultra AI" },
     { value: "FB",  label: "Plná penze" },
     { value: "HB",  label: "Polopenze" },
     { value: "BB",  label: "Snídaně" },
     { value: "RO",  label: "Bez stravy" },
   ];
   ```

3. Add sidebar block:
   ```tsx
   <div className="search-filter-block">
     <h2>Strava</h2>
     <div className="board-filter-list">
       <button
         type="button"
         className={!activeBoard ? "is-active" : ""}
         onClick={() => updateParams({ board: null, page: 1 })}
       >Vše</button>
       {BOARD_OPTIONS.map(o => (
         <button
           key={o.value}
           type="button"
           className={activeBoard === o.value ? "is-active" : ""}
           onClick={() => updateParams({ board: o.value, page: 1 })}
         >
           {o.label}
         </button>
       ))}
     </div>
   </div>
   ```

4. Extend the `displayedTours` memo to also apply board filter:
   ```tsx
   if (activeBoard) {
     items = items.filter(t => t.board === activeBoard);
   }
   ```

5. Reuse `stars-filter-list` styles for `.board-filter-list` or make a shared `.filter-btn-list` class.

---

## Step 5 — Adults + children picker in hero search form

**Why:** "2 dospělí, 0 děti" is the industry standard. It sets context for the search and maps to `adults`/`children` fields in `UnifiedTour`.

**Where:** `SearchPage.tsx` — inside `<form className="public-search-panel">`, before the submit button.

**What to do:**

1. Add state:
   ```tsx
   const [adults, setAdults] = useState(Number(searchParams.get("adults")) || 2);
   const [children, setChildren] = useState(Number(searchParams.get("children")) || 0);
   ```

2. Sync from URL (add to the existing `useEffect` that syncs other form fields):
   ```tsx
   setAdults(Number(searchParams.get("adults")) || 2);
   setChildren(Number(searchParams.get("children")) || 0);
   ```

3. Add to `submitSearch`:
   ```tsx
   updateParams({
     ...existing params...,
     adults,
     children,
   });
   ```

4. Add to hero form JSX (before submit button):
   ```tsx
   <label>
     <span>Cestující</span>
     <div className="public-search-input guests-picker">
       <span>👤</span>
       <div className="guests-stepper">
         <div>
           <span>Dospělí</span>
           <div className="stepper">
             <button type="button" onClick={() => setAdults(a => Math.max(1, a - 1))}>−</button>
             <span>{adults}</span>
             <button type="button" onClick={() => setAdults(a => Math.min(9, a + 1))}>+</button>
           </div>
         </div>
         <div>
           <span>Děti</span>
           <div className="stepper">
             <button type="button" onClick={() => setChildren(c => Math.max(0, c - 1))}>−</button>
             <span>{children}</span>
             <button type="button" onClick={() => setChildren(c => Math.min(6, c + 1))}>+</button>
           </div>
         </div>
       </div>
     </div>
   </label>
   ```

5. Add to `site.css`:
   ```css
   .guests-stepper { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
   .stepper { display: flex; align-items: center; gap: 10px; }
   .stepper button {
     width: 26px; height: 26px;
     border-radius: 50%;
     border: 1px solid #cbd5e0;
     background: #fff;
     font-size: 1rem;
     cursor: pointer;
     display: flex; align-items: center; justify-content: center;
   }
   .stepper button:hover { background: #ebf4ff; }
   .stepper span { min-width: 20px; text-align: center; font-weight: 600; }
   ```

---

## Step 6 — Departure city in hero form (OrexTravel)

**Why:** When OrexTravel is selected, "Odjezd z" is buried in the sidebar. Moving it to the hero form puts it front-and-center.

**Where:** `SearchPage.tsx` — inside `<form className="public-search-panel">`, conditionally when `isTwoLevel`.

**What to do:**

Add this block before the submit button, wrapped in `{isTwoLevel && (...)}`:
```tsx
{isTwoLevel && (
  <label>
    <span>Odjezd z</span>
    <div className="public-search-input">
      <Plane size={18} aria-hidden="true" />
      <select
        value={searchParams.get("townFrom") ?? ""}
        onChange={(e) => updateParams({ townFrom: e.target.value, stateId: null, page: 1 })}
      >
        <option value="">Všechna města</option>
        {departureCities.map((city) => (
          <option key={city.id} value={city.id}>{city.name}</option>
        ))}
      </select>
    </div>
  </label>
)}
```

Keep the sidebar "Odjezd z" dropdown as a secondary/repeat access — do not remove it.

---

## Step 7 — Filter preset pills

**Why:** "All Inclusive" and "Last Minute" are the top two searches Czech travelers type. Presets convert intent into a single click.

**Where:** `SearchPage.tsx` — add a new row immediately above the `<div className="public-tour-grid">`, inside `.search-results-main`.

**What to do:**

1. Define presets:
   ```tsx
   const PRESETS = [
     { label: "🏖 Pláž",         params: { q: "pláž" } },
     { label: "👨‍👩‍👧 Rodina",       params: { board: "AI", nights: "7-13" } },
     { label: "⚡ Last Minute",   params: { dateStart: new Date().toISOString().slice(0,10),
                                           dateEnd: new Date(Date.now()+14*86400000).toISOString().slice(0,10) } },
     { label: "🍽 All Inclusive", params: { board: "AI" } },
     { label: "✈ Krátký výlet",  params: { nights: "1-6" } },
   ] as const;
   ```

2. Render pill row:
   ```tsx
   <div className="preset-pills">
     {PRESETS.map(preset => (
       <button
         key={preset.label}
         type="button"
         className="preset-pill"
         onClick={() => updateParams({ ...preset.params, page: 1 })}
       >
         {preset.label}
       </button>
     ))}
   </div>
   ```

3. Add to `site.css`:
   ```css
   .preset-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
   .preset-pill {
     padding: 6px 14px;
     border-radius: 20px;
     border: 1px solid #cbd5e0;
     background: #fff;
     font-size: 0.85rem;
     cursor: pointer;
     transition: background .15s, border-color .15s;
   }
   .preset-pill:hover { background: #ebf4ff; border-color: var(--blue); }
   ```

---

## Verification Checklist

- [ ] Price slider appears after first search result loads; adjusting it updates `priceMin`/`priceMax` in URL after 400ms debounce
- [ ] Nights filter correctly filters "7-9 nocí" range from displayed cards
- [ ] Stars filter ★★★★ shows only 4+ star tours
- [ ] Board filter "All Inclusive" shows only `board === "AI"` tours
- [ ] Adults/children stepper in hero form min-bounds: adults ≥ 1, children ≥ 0
- [ ] `isTwoLevel` departure city appears in hero form only when OrexTravel is selected
- [ ] Preset pills apply correct URL params, are reflected in active chips (Phase 1 Step 6)
- [ ] All client-side filters combine correctly (nights AND stars AND board)
- [ ] `npx tsc --noEmit` passes in `/client`

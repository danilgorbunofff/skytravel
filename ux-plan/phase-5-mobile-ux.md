# Phase 5 — Mobile UX

> **Effort:** 3–4 days | **Files touched:** `SearchPage.tsx`, `site.css`  
> **Goal:** Make the search page fully usable on a phone. Currently the sidebar is hidden on mobile with no clear path to filters — this kills conversion for the majority of users who browse on mobile.

---

## Current mobile problems (diagnosis)

1. **Filters are inaccessible** — The sidebar is hidden on mobile. There is no "Filtrovat" button. Users can only search by text.
2. **Hero form is long** — 5 stacked form fields take most of the viewport before results even start.
3. **Results grid is 2–3 columns** — Cards are too small to read on a phone screen.
4. **No sticky context** — When scrolling results, the user loses context of what they searched.
5. **Pagination buttons** — Small touch targets at the bottom of a long scroll.

---

## Step 1 — Sticky bottom filter button on mobile

**Why:** The #1 mobile search pattern: content fills the screen, a floating "Filter" button opens a full-screen drawer. Used by Booking.com, Airbnb, Google Flights.

**Where:** `SearchPage.tsx` — add a fixed-position button at the bottom of the screen (mobile only). Add a filter drawer overlay.

**What to do:**

1. Add state:
   ```tsx
   const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
   ```

2. Add the fixed button at the very bottom of the `return` JSX, inside the main `<div>`:
   ```tsx
   <div className="mobile-filter-fab mobile-only" aria-hidden={mobileFiltersOpen}>
     <button type="button" onClick={() => setMobileFiltersOpen(true)}>
       ⚙ Filtrovat
       {/* Show count of active filters */}
       {[activeZeme, activeStateId, activeTownFrom, activeTransport].filter(Boolean).length > 0 && (
         <span className="mobile-filter-fab__count">
           {[activeZeme, activeStateId, activeTownFrom, activeTransport].filter(Boolean).length}
         </span>
       )}
     </button>
   </div>
   ```

3. Add the drawer overlay:
   ```tsx
   {mobileFiltersOpen && (
     <div className="mobile-filter-drawer" role="dialog" aria-modal="true" aria-label="Filtry">
       <div className="mobile-filter-drawer__header">
         <h2>Filtry</h2>
         <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Zavřít">✕</button>
       </div>
       <div className="mobile-filter-drawer__body">
         {/* Paste the full sidebar content here — provider list, oblast, price slider, etc. */}
         {/* This can be extracted to a shared <SearchSidebar> component to avoid duplication */}
       </div>
       <div className="mobile-filter-drawer__footer">
         <button type="button" className="btn-primary" onClick={() => setMobileFiltersOpen(false)}>
           Zobrazit {result?.filtered ?? ""} nabídek
         </button>
       </div>
     </div>
   )}
   {mobileFiltersOpen && (
     <div className="mobile-filter-backdrop" onClick={() => setMobileFiltersOpen(false)} />
   )}
   ```

4. **Refactor sidebar into a shared component** to avoid code duplication:
   - Create `client/src/components/SearchSidebar.tsx`
   - Move all sidebar content (provider list, oblast, price slider, etc.) into it
   - Accept props: `{ providers, selectedProviderId, regions, ... onChange handlers }`
   - Use `<SearchSidebar />` both in the desktop `<aside>` and in the mobile drawer

5. Add to `site.css`:
   ```css
   /* Mobile FAB */
   .mobile-filter-fab {
     position: fixed;
     bottom: 20px;
     left: 50%;
     transform: translateX(-50%);
     z-index: 100;
   }
   .mobile-filter-fab button {
     display: flex;
     align-items: center;
     gap: 8px;
     padding: 12px 28px;
     background: var(--blue);
     color: #fff;
     border: none;
     border-radius: 30px;
     font-size: 1rem;
     font-weight: 700;
     cursor: pointer;
     box-shadow: 0 4px 20px rgba(0,80,200,.35);
   }
   .mobile-filter-fab__count {
     background: #e53e3e;
     color: #fff;
     border-radius: 50%;
     width: 20px; height: 20px;
     font-size: 0.72rem;
     display: flex; align-items: center; justify-content: center;
     font-weight: 900;
   }

   /* Mobile drawer */
   .mobile-filter-backdrop {
     position: fixed; inset: 0;
     background: rgba(0,0,0,.4);
     z-index: 200;
   }
   .mobile-filter-drawer {
     position: fixed;
     bottom: 0; left: 0; right: 0;
     max-height: 85vh;
     background: #fff;
     border-radius: 20px 20px 0 0;
     z-index: 201;
     display: flex; flex-direction: column;
     box-shadow: 0 -4px 30px rgba(0,0,0,.15);
     animation: slideUp .25s ease;
   }
   @keyframes slideUp {
     from { transform: translateY(100%); }
     to   { transform: translateY(0); }
   }
   .mobile-filter-drawer__header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     padding: 16px 20px;
     border-bottom: 1px solid #e2e8f0;
   }
   .mobile-filter-drawer__header h2 { font-size: 1.1rem; margin: 0; }
   .mobile-filter-drawer__header button {
     background: none; border: none;
     font-size: 1.3rem; cursor: pointer; color: #718096;
   }
   .mobile-filter-drawer__body {
     overflow-y: auto;
     padding: 16px 20px;
     flex: 1;
   }
   .mobile-filter-drawer__footer {
     padding: 16px 20px;
     border-top: 1px solid #e2e8f0;
   }
   .mobile-filter-drawer__footer .btn-primary {
     width: 100%;
     padding: 14px;
     background: var(--blue);
     color: #fff;
     border: none;
     border-radius: 10px;
     font-size: 1rem;
     font-weight: 700;
     cursor: pointer;
   }

   /* Hide FAB on desktop */
   @media (min-width: 769px) {
     .mobile-filter-fab { display: none; }
   }
   /* Hide desktop sidebar on mobile */
   @media (max-width: 768px) {
     .search-sidebar { display: none; }
   }
   ```

---

## Step 2 — Compact hero form on mobile (collapsible)

**Why:** A 5-field form takes 70% of the mobile viewport before the user sees any results.

**Where:** `SearchPage.tsx` — `.search-hero-section` + `.public-search-panel`.

**What to do:**

1. Add state:
   ```tsx
   const [heroExpanded, setHeroExpanded] = useState(!hasActiveSearch);
   ```

2. Wrap the form fields (all except destination input) in a collapsible:
   ```tsx
   <form className="public-search-panel" onSubmit={submitSearch}>
     {/* Destination always visible */}
     <label>
       <span>Kam pojedeme</span>
       <div className="public-search-input">
         <MapPin size={18} aria-hidden="true" />
         <input ... />
       </div>
     </label>

     {/* Collapsible section on mobile */}
     <div className={`search-panel-extra ${heroExpanded ? "is-open" : ""}`}>
       {/* date + transport + guests fields */}
     </div>

     {/* Toggle button on mobile */}
     <button
       type="button"
       className="search-panel-toggle mobile-only"
       onClick={() => setHeroExpanded(v => !v)}
     >
       {heroExpanded ? "Méně možností ▲" : "Termín a doprava ▼"}
     </button>

     <button className="public-search-submit" type="submit">
       <Search size={18} aria-hidden="true" />
       Vyhledat
     </button>
   </form>
   ```

3. Add to `site.css`:
   ```css
   .search-panel-extra {
     display: contents; /* Desktop: always visible */
   }
   @media (max-width: 768px) {
     .search-panel-extra {
       display: none;
       flex-direction: column;
       gap: 12px;
     }
     .search-panel-extra.is-open {
       display: flex;
     }
     .search-panel-toggle {
       background: none;
       border: none;
       color: var(--blue);
       font-size: 0.85rem;
       cursor: pointer;
       padding: 4px 0;
       text-align: left;
     }
   }
   ```

---

## Step 3 — Single-column card grid on mobile

**Why:** The current grid tries to fit 2–3 cards per row on mobile, making them too small to read the title or price.

**Where:** `site.css` — the `.public-tour-grid` media query.

**What to do:**

Ensure this exists in `site.css`:
```css
@media (max-width: 480px) {
  .public-tour-grid {
    grid-template-columns: 1fr !important;
  }
  .public-tour-card__image {
    height: 200px;
  }
}
@media (min-width: 481px) and (max-width: 768px) {
  .public-tour-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## Step 4 — Sticky compact search bar on scroll

**Why:** When a user scrolls down through 24 cards, they lose sight of what they searched. A compact sticky bar keeps context and lets them modify the search without scrolling back.

**Where:** `SearchPage.tsx` — add a sticky top bar that appears after scrolling past the hero.

**What to do:**

1. Add scroll listener:
   ```tsx
   const [pastHero, setPastHero] = useState(false);
   useEffect(() => {
     function onScroll() { setPastHero(window.scrollY > 300); }
     window.addEventListener("scroll", onScroll, { passive: true });
     return () => window.removeEventListener("scroll", onScroll);
   }, []);
   ```

2. Add a compact sticky bar (inside the main `<div>`, before the `<header>`):
   ```tsx
   <div className={`sticky-search-bar ${pastHero ? "is-visible" : ""}`}>
     <div className="container sticky-search-bar__inner">
       <span className="sticky-search-bar__query">
         {activeQuery || "Vyhledávání"}{activeDateStart && ` · ${fmtDate(activeDateStart)}`}
       </span>
       <button
         type="button"
         className="sticky-search-bar__edit"
         onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
       >
         Upravit ✎
       </button>
       {result && (
         <span className="sticky-search-bar__count">
           {result.filtered} nabídek
         </span>
       )}
     </div>
   </div>
   ```

3. Add to `site.css`:
   ```css
   .sticky-search-bar {
     position: fixed;
     top: 0; left: 0; right: 0;
     z-index: 99;
     background: #fff;
     border-bottom: 1px solid #e2e8f0;
     box-shadow: 0 2px 8px rgba(0,0,0,.08);
     transform: translateY(-100%);
     transition: transform .2s ease;
   }
   .sticky-search-bar.is-visible { transform: translateY(0); }
   .sticky-search-bar__inner {
     display: flex;
     align-items: center;
     gap: 12px;
     padding: 10px 0;
   }
   .sticky-search-bar__query {
     flex: 1;
     font-weight: 600;
     font-size: 0.9rem;
     white-space: nowrap;
     overflow: hidden;
     text-overflow: ellipsis;
   }
   .sticky-search-bar__edit {
     background: none; border: 1px solid #cbd5e0;
     border-radius: 6px; padding: 4px 10px;
     font-size: 0.8rem; cursor: pointer; color: var(--blue);
   }
   .sticky-search-bar__count {
     font-size: 0.8rem; color: #718096; white-space: nowrap;
   }

   /* Prevent sticky bar from hiding header on desktop */
   @media (min-width: 769px) {
     .sticky-search-bar { display: none; }
   }
   ```

---

## Step 5 — Larger touch targets for pagination

**Why:** Small "Předchozí / Další" buttons at the bottom of a long page are hard to tap on mobile.

**Where:** `SearchPage.tsx` — `.search-pagination`. `site.css`.

**What to do:**

Add to `site.css`:
```css
@media (max-width: 768px) {
  .search-pagination {
    flex-direction: column;
    gap: 10px;
  }
  .search-pagination button {
    width: 100%;
    padding: 14px;
    font-size: 1rem;
    justify-content: center;
  }
}
```

Also add page number pills for quick jump:
```tsx
{result && result.totalPages > 1 && result.totalPages <= 10 && (
  <div className="pagination-pills">
    {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(p => (
      <button
        key={p}
        type="button"
        className={p === page ? "is-active" : ""}
        onClick={() => pageTo(p)}
      >
        {p}
      </button>
    ))}
  </div>
)}
```
```css
.pagination-pills {
  display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
  margin-top: 8px;
}
.pagination-pills button {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer; font-size: 0.85rem;
}
.pagination-pills button.is-active {
  background: var(--blue); color: #fff; border-color: var(--blue);
}
```

---

## Step 6 — Prevent body scroll when drawer is open

**Why:** On mobile, the background scrolls behind the filter drawer — disorienting.

**Where:** `SearchPage.tsx` — `useEffect` triggered by `mobileFiltersOpen`.

**What to do:**

```tsx
useEffect(() => {
  if (mobileFiltersOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => { document.body.style.overflow = ""; };
}, [mobileFiltersOpen]);
```

---

## Verification Checklist (test at 375px width — iPhone SE)

- [ ] "Filtrovat" FAB is visible and centered at bottom when results are showing
- [ ] FAB badge shows correct count of active filters
- [ ] Filter drawer opens with slide-up animation, closes on ✕ and on backdrop tap
- [ ] Background does not scroll while drawer is open
- [ ] Drawer "Zobrazit X nabídek" button closes drawer and shows result count
- [ ] Hero form shows only destination field by default on mobile; "Termín a doprava ▼" expands the rest
- [ ] Cards show 1-per-row on phones (≤480px) and 2-per-row on tablets (481–768px)
- [ ] Sticky compact bar appears after scrolling ~300px; shows query + count
- [ ] "Upravit ✎" scrolls back to top smoothly
- [ ] Pagination buttons are full-width on mobile with large touch targets
- [ ] Desktop layout is completely unchanged (sidebar still shows, FAB hidden)

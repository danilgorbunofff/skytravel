# Phase 3 — Card & Result UX

> **Effort:** 3–5 days | **Files touched:** `SearchPage.tsx`, `site.css`, `TourModal.tsx`  
> **Goal:** Make each tour card more informative and interactive so users engage deeper and take action rather than scroll past.

---

## Step 1 — List / Grid view toggle

**Why:** Grid shows more tours at once; list shows more detail per tour. Different users prefer different modes. Booking.com, Skyscanner all offer this toggle.

**Where:** `SearchPage.tsx` — toolbar area + grid render. `site.css` — list-mode card styles.

**What to do:**

1. Add view mode state (persisted in `localStorage`):
   ```tsx
   const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
     try { return (localStorage.getItem("search-view") as "grid" | "list") || "grid"; }
     catch { return "grid"; }
   });

   function setView(mode: "grid" | "list") {
     setViewMode(mode);
     try { localStorage.setItem("search-view", mode); } catch {}
   }
   ```

2. Add toggle buttons to the toolbar (`.search-results-toolbar`):
   ```tsx
   <div className="view-toggle" aria-label="Zobrazení výsledků">
     <button
       type="button"
       className={viewMode === "grid" ? "is-active" : ""}
       onClick={() => setView("grid")}
       title="Mřížka"
     >⊞</button>
     <button
       type="button"
       className={viewMode === "list" ? "is-active" : ""}
       onClick={() => setView("list")}
       title="Seznam"
     >☰</button>
   </div>
   ```

3. Change the grid container to use a conditional CSS class:
   ```tsx
   <div className={viewMode === "grid" ? "public-tour-grid" : "public-tour-list"}>
     {displayedTours.map((tour) => (
       <PublicTourCard key={...} tour={tour} cheapThreshold={cheapThreshold} viewMode={viewMode} />
     ))}
   </div>
   ```

4. Update `PublicTourCard` props and render differently in list mode:
   ```tsx
   function PublicTourCard({ tour, cheapThreshold, viewMode }: {
     tour: UnifiedTour;
     cheapThreshold: number;
     viewMode: "grid" | "list";
   }) {
     // ... existing logic ...
     if (viewMode === "list") {
       return (
         <article className="public-tour-list-item">
           <div className="list-item__image">
             {tour.image
               ? <img src={tour.image} alt={tour.title} loading="lazy" />
               : <div className="list-item__image-placeholder" />}
             {isLastMinute && <span className="badge badge--urgent">Last Minute</span>}
           </div>
           <div className="list-item__body">
             <div className="list-item__meta">
               {stars && <span className="public-tour-stars">{stars}</span>}
               <span>{boardLabel[tour.board] ?? tour.board}</span>
               <span className="card-source-badge">{tour.source}</span>
             </div>
             <h3>{tour.title}</h3>
             <p className="list-item__dest">{tour.destination}</p>
             <div className="list-item__facts">
               <span>📅 {fmtDate(tour.startDate)} – {fmtDate(tour.endDate)}</span>
               <span>🌙 {nights} nocí</span>
               <span>✈ {transportLabel[tour.transport] ?? tour.transport}</span>
             </div>
           </div>
           <div className="list-item__price">
             <strong>od {formatPrice(tour.price)}</strong>
             <a href={tour.url} target="_blank" rel="noreferrer" className="btn-detail">
               <ExternalLink size={15} aria-hidden="true" /> Detail
             </a>
           </div>
         </article>
       );
     }
     // ... existing grid card return ...
   }
   ```

5. Add to `site.css`:
   ```css
   .public-tour-list { display: flex; flex-direction: column; gap: 12px; }

   .public-tour-list-item {
     display: grid;
     grid-template-columns: 200px 1fr auto;
     gap: 0;
     border-radius: 10px;
     overflow: hidden;
     background: #fff;
     box-shadow: 0 1px 6px rgba(0,0,0,.08);
   }
   .list-item__image { position: relative; }
   .list-item__image img { width: 200px; height: 100%; object-fit: cover; display: block; }
   .list-item__image-placeholder { width: 200px; height: 100%; background: #e2e8f0; }
   .list-item__body { padding: 16px; }
   .list-item__meta { display: flex; gap: 8px; font-size: 0.8rem; color: #666; margin-bottom: 6px; }
   .list-item__dest { color: #666; font-size: 0.9rem; margin: 4px 0 10px; }
   .list-item__facts { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: #444; }
   .list-item__price {
     display: flex; flex-direction: column; justify-content: center; align-items: flex-end;
     padding: 16px 20px; gap: 10px; background: #f7fafc;
     border-left: 1px solid #e2e8f0;
   }
   .list-item__price strong { font-size: 1.2rem; color: var(--blue); white-space: nowrap; }

   .view-toggle { display: flex; gap: 4px; }
   .view-toggle button {
     padding: 5px 10px; border-radius: 6px;
     border: 1px solid #e2e8f0; background: #fff;
     font-size: 1.1rem; cursor: pointer;
   }
   .view-toggle button.is-active { background: var(--blue); color: #fff; border-color: var(--blue); }

   @media (max-width: 640px) {
     .public-tour-list-item { grid-template-columns: 1fr; }
     .list-item__image img { width: 100%; height: 160px; }
     .list-item__price { border-left: none; border-top: 1px solid #e2e8f0; flex-direction: row; justify-content: space-between; }
   }
   ```

---

## Step 2 — Favorites / wishlist (heart icon)

**Why:** Saving tours creates emotional ownership — "I found this, it's mine". Users who save come back. Zero registration required.

**Where:** `SearchPage.tsx` — `PublicTourCard` component. New `useFavorites` hook.

**What to do:**

1. Create `client/src/hooks/useFavorites.ts`:
   ```ts
   import { useState, useCallback } from "react";

   const KEY = "skytravel:favorites";

   function load(): string[] {
     try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
     catch { return []; }
   }

   export function useFavorites() {
     const [favorites, setFavorites] = useState<string[]>(load);

     const toggle = useCallback((id: string) => {
       setFavorites(prev => {
         const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
         try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
         return next;
       });
     }, []);

     const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

     return { favorites, toggle, isFavorite };
   }
   ```

2. In `SearchPage.tsx`, call the hook at the top of the component:
   ```tsx
   const { toggle: toggleFavorite, isFavorite } = useFavorites();
   ```

3. Pass into `PublicTourCard`:
   ```tsx
   <PublicTourCard
     key={...}
     tour={tour}
     cheapThreshold={cheapThreshold}
     viewMode={viewMode}
     isFavorite={isFavorite(`${tour.source}-${tour.externalId}`)}
     onToggleFavorite={() => toggleFavorite(`${tour.source}-${tour.externalId}`)}
   />
   ```

4. Add heart button inside the card image area:
   ```tsx
   <button
     type="button"
     className={`card-heart ${isFavorite ? "is-saved" : ""}`}
     onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
     aria-label={isFavorite ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
   >
     {isFavorite ? "♥" : "♡"}
   </button>
   ```

5. Add to `site.css`:
   ```css
   .card-heart {
     position: absolute;
     top: 10px; right: 10px;
     width: 32px; height: 32px;
     border-radius: 50%;
     background: rgba(255,255,255,.85);
     border: none;
     font-size: 1.1rem;
     cursor: pointer;
     display: flex; align-items: center; justify-content: center;
     transition: transform .15s;
   }
   .card-heart:hover { transform: scale(1.15); }
   .card-heart.is-saved { color: #e53e3e; background: rgba(255,255,255,.95); }
   ```

6. **Optional sidebar block** — show count of saved tours:
   In the sidebar, add:
   ```tsx
   {favorites.length > 0 && (
     <div className="search-filter-block">
       <h2>Oblíbené</h2>
       <p>{favorites.length} uložených zájezdů</p>
       <button type="button" onClick={() => setShowFavoritesOnly(v => !v)}>
         {showFavoritesOnly ? "Zobrazit vše" : "Jen oblíbené"}
       </button>
     </div>
   )}
   ```
   Add `showFavoritesOnly` state and filter `displayedTours` by favorites when active.

---

## Step 3 — Card hover quick-inquiry CTA

**Why:** Users hover over interesting cards. A slide-up "Poptat zájezd" button at hover time catches intent at the peak moment.

**Where:** `SearchPage.tsx` — `PublicTourCard` (grid mode only). `site.css` — hover overlay.

**What to do:**

1. Add state to track hovered card (or use CSS-only approach — preferred):
   ```css
   /* In site.css */
   .public-tour-card { position: relative; overflow: hidden; }
   .public-tour-card__hover-cta {
     position: absolute;
     bottom: 0; left: 0; right: 0;
     background: linear-gradient(transparent, rgba(0,50,120,.85));
     padding: 20px 16px 14px;
     transform: translateY(100%);
     transition: transform .2s ease;
     display: flex; justify-content: center;
   }
   .public-tour-card:hover .public-tour-card__hover-cta { transform: translateY(0); }
   .public-tour-card__hover-cta button {
     background: #fff;
     color: var(--blue);
     border: none;
     border-radius: 6px;
     padding: 8px 20px;
     font-weight: 700;
     cursor: pointer;
     font-size: 0.9rem;
   }
   ```

2. Add the hover CTA div inside `PublicTourCard` (inside the card, at the very end, after `.public-tour-card__body`):
   ```tsx
   <div className="public-tour-card__hover-cta">
     <button type="button" onClick={() => window.open(tour.url, "_blank", "noreferrer")}>
       Zobrazit nabídku →
     </button>
   </div>
   ```

   > **If you want inquiry instead of external link:** Replace `window.open` with a state setter that opens a lead popup/modal with the tour pre-filled. Requires connecting with `LeadPopup` component.

---

## Step 4 — Lazy image loading with blur-up placeholder

**Why:** Tour cards with broken or missing images look unprofessional and slow perceived page load.

**Where:** `PublicTourCard` image section in `SearchPage.tsx`.

**What to do:**

1. Replace the current image render:
   ```tsx
   {tour.image ? <img src={tour.image} alt={tour.title} loading="lazy" /> : <div />}
   ```
   with:
   ```tsx
   <div className="card-img-wrap">
     {tour.image ? (
       <img
         src={tour.image}
         alt={tour.title}
         loading="lazy"
         onError={(e) => {
           (e.target as HTMLImageElement).src = "/placeholder-tour.jpg";
         }}
       />
     ) : (
       <div className="card-img-placeholder">
         <span>🏖</span>
       </div>
     )}
   </div>
   ```

2. Add `public/placeholder-tour.jpg` — a generic travel/beach stock photo (free from Unsplash, downloaded locally).

3. Add to `site.css`:
   ```css
   .card-img-wrap { position: relative; width: 100%; height: 100%; }
   .card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
   .card-img-placeholder {
     width: 100%; height: 100%;
     background: linear-gradient(135deg, #ebf4ff 0%, #bee3f8 100%);
     display: flex; align-items: center; justify-content: center;
     font-size: 2.5rem;
   }
   ```

---

## Step 5 — Share search button

**Why:** URL is already fully shareable (all filters in query params). Adding a share button makes this discoverable and enables word-of-mouth.

**Where:** `SearchPage.tsx` — toolbar area, next to view toggle.

**What to do:**

1. Add a share handler function:
   ```tsx
   async function shareSearch() {
     const url = window.location.href;
     if (navigator.share) {
       try {
         await navigator.share({
           title: "SkyTravel — výsledky hledání",
           text: `Podívej se na tyto zájezdy: ${activeQuery || ""}`,
           url,
         });
       } catch {}
     } else {
       try {
         await navigator.clipboard.writeText(url);
         // Brief visual feedback
         setShareCopied(true);
         setTimeout(() => setShareCopied(false), 2000);
       } catch {}
     }
   }
   ```

2. Add state:
   ```tsx
   const [shareCopied, setShareCopied] = useState(false);
   ```

3. Add button to toolbar (only show when there is an active search result):
   ```tsx
   {hasActiveSearch && result && (
     <button type="button" className="share-btn" onClick={shareSearch}>
       {shareCopied ? "✓ Zkopírováno!" : "🔗 Sdílet"}
     </button>
   )}
   ```

4. Add to `site.css`:
   ```css
   .share-btn {
     padding: 6px 14px;
     border-radius: 6px;
     border: 1px solid #cbd5e0;
     background: #fff;
     cursor: pointer;
     font-size: 0.85rem;
     transition: background .15s;
   }
   .share-btn:hover { background: #ebf4ff; }
   ```

---

## Verification Checklist

- [ ] Grid / list toggle works; preference survives page refresh (localStorage)
- [ ] List view shows image + full detail + price column on desktop
- [ ] List view stacks vertically on mobile (≤640px)
- [ ] Heart icon saves tour ID to localStorage; refills red on page return
- [ ] "Jen oblíbené" sidebar filter shows only saved tours
- [ ] Hover CTA appears smoothly on desktop; does not interfere with mobile tap
- [ ] Broken image URLs fall back to placeholder — no broken `<img>` icons
- [ ] Share button triggers native share on mobile; copies URL on desktop
- [ ] "✓ Zkopírováno!" confirmation shows for 2 seconds
- [ ] `npx tsc --noEmit` passes in `/client`

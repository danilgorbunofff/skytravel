# Phase 4 — Trust & Social Proof

> **Effort:** 1 day | **Files touched:** `SearchPage.tsx`, `site.css`, `data.ts`  
> **Goal:** Build buyer confidence so users feel safe making an inquiry. Trust signals are the single highest ROI conversion improvement in travel e-commerce.

---

## Step 1 — Trust bar below hero search form

**Why:** Czech travelers are cautious. They need to know: "Is this agency legitimate? What if something goes wrong?" A trust bar answers this before they even look at results.

**Where:** `SearchPage.tsx` — add a new section immediately after the closing `</section>` of `.search-hero-section`, before `.search-results-section`.

**What to do:**

1. Add this JSX block:
   ```tsx
   <div className="trust-bar">
     <div className="container trust-bar__inner">
       <div className="trust-item">
         <span className="trust-icon">✓</span>
         <span>Ověřený partner cestovních kanceláří</span>
       </div>
       <div className="trust-item">
         <span className="trust-icon">✓</span>
         <span>Pojištění vkladu zákazníka</span>
       </div>
       <div className="trust-item">
         <span className="trust-icon">✓</span>
         <span>Bez poplatků za poptávku</span>
       </div>
       <div className="trust-item">
         <span className="trust-icon">✓</span>
         <span>Osobní přístup &amp; okamžitá odezva</span>
       </div>
     </div>
   </div>
   ```

2. Add to `site.css`:
   ```css
   .trust-bar {
     background: #f0f7ff;
     border-top: 1px solid #bee3f8;
     border-bottom: 1px solid #bee3f8;
     padding: 12px 0;
   }
   .trust-bar__inner {
     display: flex;
     flex-wrap: wrap;
     gap: 16px;
     justify-content: center;
     align-items: center;
   }
   .trust-item {
     display: flex;
     align-items: center;
     gap: 7px;
     font-size: 0.85rem;
     color: #2b6cb0;
     font-weight: 500;
   }
   .trust-icon {
     width: 20px; height: 20px;
     background: #2b6cb0;
     color: #fff;
     border-radius: 50%;
     display: flex; align-items: center; justify-content: center;
     font-size: 0.7rem;
     font-weight: 900;
     flex-shrink: 0;
   }
   @media (max-width: 640px) {
     .trust-bar__inner { flex-direction: column; align-items: flex-start; padding: 0 16px; }
   }
   ```

---

## Step 2 — Popular destinations quick-access strip

**Why:** A visual strip of destinations below the hero converts "I'm not sure where to go" into a click. It also fills the page before results load — removing the jarring empty state.

**Where:** `SearchPage.tsx` — add between the trust bar and `.search-results-section`. Use data from `favorites[]` in `data.ts` which already has destinations with images and "from" prices.

**What to do:**

1. Import `favorites` from data:
   ```tsx
   import { favorites } from "../data";
   ```
   The `favorites` array has the shape `{ destination: string, image: string, priceFrom: number }` (confirm exact shape in `data.ts` and adjust).

2. Only show the strip when there is no active search result yet (`!hasActiveSearch`):
   ```tsx
   {!hasActiveSearch && favorites.length > 0 && (
     <section className="popular-destinations">
       <div className="container">
         <h2 className="popular-destinations__title">Oblíbené destinace</h2>
         <div className="popular-destinations__scroll">
           {favorites.map((dest) => (
             <button
               key={dest.destination}
               type="button"
               className="dest-thumb"
               onClick={() => {
                 setQuery(dest.destination);
                 updateParams({ q: dest.destination, page: 1 });
               }}
             >
               <div
                 className="dest-thumb__img"
                 style={{ backgroundImage: `url(${dest.image})` }}
               />
               <div className="dest-thumb__label">
                 <strong>{dest.destination}</strong>
                 {dest.priceFrom && <span>od {formatPrice(dest.priceFrom)}</span>}
               </div>
             </button>
           ))}
         </div>
       </div>
     </section>
   )}
   ```

3. Add to `site.css`:
   ```css
   .popular-destinations { padding: 28px 0 24px; background: #fff; }
   .popular-destinations__title {
     font-size: 1.1rem;
     font-weight: 700;
     margin-bottom: 16px;
     color: #1a202c;
   }
   .popular-destinations__scroll {
     display: flex;
     gap: 12px;
     overflow-x: auto;
     padding-bottom: 8px;
     scroll-snap-type: x mandatory;
     -webkit-overflow-scrolling: touch;
   }
   .popular-destinations__scroll::-webkit-scrollbar { height: 4px; }
   .popular-destinations__scroll::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 2px; }

   .dest-thumb {
     flex: 0 0 160px;
     scroll-snap-align: start;
     border-radius: 10px;
     overflow: hidden;
     border: none;
     cursor: pointer;
     background: none;
     padding: 0;
     text-align: left;
     transition: transform .15s;
   }
   .dest-thumb:hover { transform: translateY(-3px); }
   .dest-thumb__img {
     height: 110px;
     background-size: cover;
     background-position: center;
     border-radius: 10px 10px 0 0;
   }
   .dest-thumb__label {
     padding: 8px 10px;
     background: #f7fafc;
     border-radius: 0 0 10px 10px;
     display: flex; flex-direction: column; gap: 2px;
   }
   .dest-thumb__label strong { font-size: 0.9rem; color: #1a202c; }
   .dest-thumb__label span { font-size: 0.75rem; color: #718096; }
   ```

---

## Step 3 — Partner logos in provider sidebar buttons

**Why:** "Alexandria" and "Orextravel" are brand names. Logos create instant recognition and lend legitimacy to the partnership.

**Where:** `SearchPage.tsx` — provider buttons in sidebar. `data.ts` or a new config file for logo URLs.

**What to do:**

1. Add a logo map in `SearchPage.tsx` (or in `data.ts`):
   ```tsx
   const PROVIDER_LOGOS: Record<string, string> = {
     alexandria: "/logos/alexandria.png",
     orextravel: "/logos/orextravel.png",
   };
   ```

2. Download or source provider logos (check their websites for press/brand kits, or use their favicon as fallback). Place in `client/public/logos/`.

3. Update provider buttons in the sidebar:
   ```tsx
   {providers.map((provider) => (
     <button
       key={provider.id}
       type="button"
       className={provider.id === selectedProviderId ? "is-active" : ""}
       onClick={() => changeProvider(provider.id)}
     >
       {PROVIDER_LOGOS[provider.id] && (
         <img
           src={PROVIDER_LOGOS[provider.id]}
           alt=""
           className="provider-logo"
           aria-hidden="true"
         />
       )}
       {provider.label}
     </button>
   ))}
   ```

4. Add to `site.css`:
   ```css
   .provider-logo {
     height: 18px;
     width: auto;
     object-fit: contain;
     vertical-align: middle;
     margin-right: 6px;
     border-radius: 2px;
   }
   .search-provider-list button {
     display: flex;
     align-items: center;
   }
   ```

---

## Step 4 — Result count as a social signal

**Why:** "Nalezeno 47 nabídek" tells the user the search is working and there's abundance. It sets positive expectations.

**Where:** `SearchPage.tsx` — the toolbar `<h2>{totalText}</h2>`.

**What to do:**

The current `totalText` already covers this, but the label "nabídek" is generic. Make it more specific and prominent:

1. Replace the `totalText` logic with a richer version:
   ```tsx
   const totalText = result
     ? `Nalezeno ${result.filtered.toLocaleString("cs-CZ")} nabídek`
     : resultsLoading
       ? "Hledám zájezdy…"
       : hasActiveSearch
         ? "Žádné nabídky"
         : "Zadejte destinaci a spusťte vyhledávání";
   ```

2. If `result.filtered !== result.total` (some client-side filters are active), also show:
   ```tsx
   {result && result.filtered !== result.total && (
     <p className="results-sub">
       Zobrazeno {displayedTours.length.toLocaleString("cs-CZ")} z {result.total.toLocaleString("cs-CZ")} celkem
     </p>
   )}
   ```

3. Add to `site.css`:
   ```css
   .results-sub { font-size: 0.8rem; color: #718096; margin-top: 2px; }
   ```

---

## Step 5 — "Contact us" CTA in sidebar footer

**Why:** Some users browse without buying. A visible contact option converts browsers into leads.

**Where:** `SearchPage.tsx` — at the bottom of the `<aside className="search-sidebar">`, after the Reset button.

**What to do:**

Add below the reset button:
```tsx
<div className="sidebar-contact-cta">
  <p>Nenašli jste co hledáte?</p>
  <a href="tel:+420721163860" className="sidebar-contact-phone">
    📞 +420 721 163 860
  </a>
  <a href="mailto:info@skytravel.cz" className="sidebar-contact-email">
    ✉ info@skytravel.cz
  </a>
  <p className="sidebar-contact-note">Poradíme vám osobně — zdarma.</p>
</div>
```

Add to `site.css`:
```css
.sidebar-contact-cta {
  margin-top: 24px;
  padding: 16px;
  background: #f0f7ff;
  border-radius: 10px;
  border: 1px solid #bee3f8;
  font-size: 0.85rem;
}
.sidebar-contact-cta p { color: #4a5568; margin: 0 0 8px; }
.sidebar-contact-phone,
.sidebar-contact-email {
  display: block;
  font-weight: 700;
  color: var(--blue);
  margin-bottom: 6px;
  text-decoration: none;
}
.sidebar-contact-phone:hover,
.sidebar-contact-email:hover { text-decoration: underline; }
.sidebar-contact-note {
  font-size: 0.78rem;
  color: #718096;
  margin-top: 8px !important;
}
```

---

## Verification Checklist

- [ ] Trust bar renders between hero and results on all screen widths
- [ ] Trust bar wraps to vertical list on mobile without overflow
- [ ] Popular destinations strip shows on first visit (no active search); thumbnails are horizontally scrollable on mobile
- [ ] Clicking a destination thumbnail sets `q` in the form AND triggers the search
- [ ] Provider logo images load (`/logos/alexandria.png`, etc.) with fallback to text-only on error
- [ ] Result count says "Nalezeno X nabídek" instead of bare "X nabídek"
- [ ] Sidebar contact CTA is visible and links correctly to `tel:` and `mailto:`
- [ ] All links open correctly, no broken `href`s

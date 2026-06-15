# PHASE 08: Search Page UX/UI Upgrade

## Overview

Comprehensive upgrade of the search experience. Enhances existing components under `client/src/features/search/` and `client/src/pages/SearchPage.tsx` — no full rewrite, each step builds on the existing foundation.

**Risk: MEDIUM** — large surface area; prioritize steps by user impact.

---

## Current Architecture

```
SearchPage.tsx (804 lines) — composition root
├── StickySearchBar
├── site-header (logo, nav, lang toggle) — duplicates HomePage
├── SearchHero — main search form
├── TrustBar — trust signals
├── PopularDestinations — static favorites grid
├── SearchFilters (sidebar) — destination, price, nights, stars, board, saved
├── SearchResultsToolbar — sort, view mode, share, count
├── PublicTourCard — individual tour card
├── TourDetailModal (lazy) — full tour detail
├── MobileFilterDrawer — mobile filter slide-in
├── CompareTray — bottom comparison bar
└── CompareView (lazy) — full comparison table
    LeadPopup — lead capture
```

Hooks: `useSearchFilters`, `useSearchResults`, `useOfferGroups`, `useBootstrap`, `useCompare`

---

## Step 1: Component Architecture Refactor

### Audit & Extract

**Current component sizes (estimated):**
| Component | Lines | Action |
|-----------|-------|--------|
| SearchPage.tsx | 804 | Reduce to ≤400 (extract header/footer/not-search-specific) |
| SearchHero | ~200 | Already reasonable |
| SearchResultsToolbar | ~120 | Reasonable |
| PublicTourCard | ~180 | Reasonable |
| TourDetailModal | 262 | Already reasonable (well-structured) |
| SearchFilters | ~250 | Could extract sub-filters |
| CompareTray | 59 | Fine |

**Extraction candidates from SearchPage.tsx:**
- `SearchPageHeader.tsx` — lines 340–431 (site header with nav, lang toggle, top search) — note this duplicates HomePage header, make it a shared component
- `SearchResultsSection.tsx` — lines 528–711 (results toolbar, grid, pagination) — note: still needs access to SearchPage state

### Prop Documentation

Add JSDoc to all feature components:

```typescript
/**
 * PublicTourCard displays a tour result in grid or list view.
 *
 * @param tour - Tour data from search results
 * @param viewMode - "grid" or "list" layout
 * @param isFavorite - Whether the tour is saved to favorites
 * @param onToggleFavorite - Called when favorite heart is clicked
 * @param onOpenDetail - Called when card is clicked to open detail
 */
interface PublicTourCardProps {
  t: (key: string) => string;
  tour: UnifiedTour;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
  providerLabel: string;
  animationIndex: number;
  isCompared: boolean;
  onToggleCompare: () => void;
  compareFull: boolean;
}
```

### Acceptance
- No component >200 lines
- Clear data flow: hooks → components (no reverse)
- All props have TypeScript interfaces

---

## Step 2: Search Form & Filters UX

### Recent Searches

**File:** `client/src/features/search/components/RecentSearches.tsx`
- Verify this file exists and integrates with `SearchHero`
- Recent searches stored in localStorage (max 10)
- Show as chips below search input on focus
- Click to restore search params
- "Clear" button

**Integration points:**
- `SearchHero` already has `onDestinationSelect` — connect to recent searches
- `RecentSearches` component should appear when search input is focused and has recent items

### SearchAutocomplete Enhancement

**File:** `client/src/features/search/components/SearchAutocomplete.tsx`
- Add destination images to dropdown items
- Show country flag/icon next to destination name
- Show "X offers available" subtitle
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Debounce search (already exists, verify timing)

### Date Range Validation

In `useSearchFilters` hook or search form:
```typescript
function validateDates(dateStart: string, dateEnd: string): string | null {
  if (!dateStart || !dateEnd) return null;
  if (dateStart > dateEnd) return t("sValidationDateOrder");
  return null;
}
```
- Show validation error inline below date inputs
- Prevent form submission on invalid dates

### Passenger Constraints
- Max 9 adults, max 6 children (already exists in search hooks)
- Show helper text when limits reached
- Disable "+" button at max

### Transport Type Icons
- Already exists in `TourDetailModal.tsx` (Plane, Bus, Car, Ship, Train icons)
- Add same icons to `SearchHero` transport select
- Replace text options with icon + text

### Filter Chips

**File:** `client/src/features/search/components/ActiveFilterChips.tsx`
- Already exists inline in SearchPage.tsx (lines 573–586)
- Extract to separate component
- Each chip shows filter name + "×" to clear
- Add "Reset all filters" button when any filter is active
- Animate chips (enter/exit) with CSS transitions

### Acceptance
- Recent searches show on focus
- Autocomplete shows images
- Date validation prevents invalid ranges
- Passenger count respects limits
- Filter chips show/hide correctly
- Reset all filters works

---

## Step 3: Tour Cards & Results Grid Redesign

### PublicTourCard Redesign

**File:** `client/src/features/search/components/PublicTourCard.tsx`

Current design needs:
- Larger photos (increase from current size)
- Price prominence (larger font, bold)
- Duration badge (e.g., "7 nocí" top-left corner)
- Board type icon (moon icon + label)
- Hover state (subtle scale 1.02 + shadow increase)
- Favorite heart button (useFavorites hook already exists)
- "X offers available" badge (if multiples exist)

```tsx
// Card redesign structure
<article className={`tour-card tour-card--${viewMode}`}>
  <div className="tour-card__image">
    <img ... />
    <span className="tour-card__nights">{tour.nights} nocí</span>
    <button className="tour-card__fav" onClick={onToggleFavorite}>
      {isFavorite ? <Heart fill /> : <Heart />}
    </button>
  </div>
  <div className="tour-card__body">
    <h3 className="tour-card__title">{tour.title}</h3>
    <p className="tour-card__location">{tour.destination}</p>
    <div className="tour-card__meta">
      <span className="tour-card__board">
        <Moon size={12} /> {boardLabel[tour.board]}
      </span>
      {tour.offersCount > 1 && (
        <span className="tour-card__offers">{tour.offersCount} nabídek</span>
      )}
    </div>
    <div className="tour-card__footer">
      <span className="tour-card__price">
        {t("from")} {formatPrice(tour.price)}
      </span>
      <span className="tour-card__date">
        {fmtDate(tour.startDate)}
      </span>
    </div>
  </div>
</article>
```

### Grid/List Toggle

**File:** `client/src/features/search/components/SearchResultsToolbar.tsx`
- Already has `viewMode` and `onSetView` props
- Verify toggle buttons work correctly
- Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- List: single column with wider cards
- Persist preference in localStorage (already done)

### Acceptance
- Cards visually appealing with hover states
- Favorites toggle works
- Grid/list toggle works
- Responsive layout

---

## Step 4: Tour Detail Modal Overhaul

### Image Gallery

**File:** `client/src/features/search/components/TourGallery.tsx`
- Already exists, verify it handles:
  - Single image (no arrows)
  - Multiple images (prev/next navigation)
  - Thumbnail strip below main image
  - Keyboard navigation (→ next, ← prev)
  - Image loading state (skeleton)
  - Image error state (fallback)

### Tabbed Content

**File:** `client/src/features/search/components/TourDetailTabs.tsx`
- Already exists with Overview, Offers, Map tabs
- Verify:
  - Tabs switch correctly
  - Map tab shows location (if coordinates available)
  - Offers tab shows OfferComparisonTable
  - Content doesn't jump on tab switch (fixed height)

### Price Breakdown

**File:** `client/src/features/search/components/OfferComparisonTable.tsx`
- Already exists
- Verify shows: price, dates, board, transport, hotel, rating
- Select offer to see details
- Loading state for offers
- Empty state (no offers)

### Inquiry Form

**File:** `client/src/features/search/components/TourInquiryForm.tsx`
- Already exists
- Verify:
  - Email validation
  - GDPR consent checkbox
  - Submit sends inquiry
  - Success message
  - Error handling
  - Prefilled data from URL params

### Share Tour Button
Add to TourDetailModal header:
```tsx
<button onClick={handleShare} aria-label={t("sShareLabel")}>
  <Share2 size={18} />
</button>
```
- Use Web Share API on mobile
- Fallback: copy link to clipboard
- Show toast "Link copied"

### Keyboard Navigation
- Esc to close (already works)
- Tab trap within modal (already works)
- →/← for image gallery navigation

### Acceptance
- Modal shows all tour info
- Tabs work correctly
- Inquiry form submits
- Share button works
- Keyboard navigation works

---

## Step 5: Comparison Feature Upgrade

### Current State
- `CompareTray.tsx` (59 lines) — bottom bar with thumbnails
- `CompareView.tsx` — full comparison table (lazy loaded)
- `useCompare.ts` hook — manages comparison state

### Upgrade

**CompareTray (enhance):**
- Show count with proper Czech plural forms
- Sticky at bottom of viewport
- Show expands to CompareView on click
- "Remove all" button always visible
- Smooth animation when tours added/removed

**CompareView (verify):**
- Shows comparison table: price, dates, board, transport, hotel, rating
- Max 4 tours (enforce in useCompare hook)
- Drag to reorder (nice-to-have, can skip if complex)
- Remove individual tours
- "Remove all" button
- Close button returns to tray
- Mobile responsive (horizontal scroll on small screens)

### Acceptance
- Up to 4 tours compared
- Table readable on all viewports
- Add/remove works correctly
- Sticky tray at bottom

---

## Step 6: Mobile Experience Overhaul

### MobileFilterDrawer

**File:** `client/src/features/search/components/MobileFilterDrawer.tsx`
- Slide-in from bottom (full height on mobile)
- Smooth animation with gesture
- Backdrop to close
- Apply filters button
- Reset filters button
- Show active filter count in FAB (already works)
- Prevent body scroll when open (already works)

### Bottom Sheet for Tour Details

On mobile, TourDetailModal should:
- Slide up from bottom (not center modal)
- Header with tour title + close button
- Scrollable content
- Bottom sticky CTA ("Poptat zájezd")
- Height: 90% of viewport

### Touch Targets
- Minimum 44px tap targets for all interactive elements
- Check: filter chips, sort buttons, pagination
- Use Tailwind `min-h-[44px]` or `p-3` for spacing

### Swipe to Dismiss
- MobileFilterDrawer: swipe down to close
- TourDetailModal: swipe up to expand, swipe down to close (if bottom sheet pattern)

### Bottom Sticky CTA
- Tour cards: "View details" button at bottom on mobile
- Tour detail: "Poptat zájezd" sticky button at bottom

### Acceptance
- Mobile layout works at 375px width
- Touch targets ≥44px
- Drawers and sheets have smooth transitions
- No horizontal scroll on mobile

---

## Step 7: Styling & Design System Migration

### Tailwind Audit
- No inline styles (`style={}` objects) — use Tailwind classes
- No magic color values — use design tokens
- Review `client/src/features/search/**/*.tsx` for inline styles

### Design Tokens (verify usage)
Current Tailwind v4 theme should provide:
```
bg-primary, text-primary, text-primary-foreground
bg-muted, text-muted-foreground
bg-accent, text-accent-foreground
bg-destructive, text-destructive
bg-success, text-success
bg-warning, text-warning
border-border, border-input
rounded-lg, rounded-md, rounded-full
gap-4, gap-2, p-4, p-6
```

Replace any hardcoded colors:
```tsx
// BEFORE:
style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}

// AFTER:
className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
```

### Spacing Consistency
- Card padding: `p-6` (desktop), `p-4` (mobile)
- Section gap: `gap-4` (mobile), `gap-6` (desktop)
- Component gaps: `gap-2` between related items, `gap-4` between sections

### Dark Mode Consideration
- Add `dark:` variants where feasible
- Not a full dark mode implementation — just ensure Tailwind class structure supports it
- Focus on text/background contrast, not color scheme switching

### Acceptance
- No inline styles in search components
- Consistent spacing throughout
- Dark mode classes ready for future activation

---

## Step 8: Accessibility & SEO Improvements

### SkipLinks
**File:** `client/src/features/search/components/SkipLinks.tsx`
- Already exists, verify it:
  - Is the first focusable element on the page
  - Links to: "Skip to main content", "Skip to search", "Skip to results"
  - Becomes visible on Tab press
  - Navigates to correct sections

### ARIA Labels
All interactive elements should have `aria-label` or `aria-labelledby`:
- Search input: `aria-label={t("sFormWhere")}`
- Filter checkboxes: `aria-label` matching label text
- Sort buttons: `aria-label="Seřadit podle ceny"`
- Pagination: `aria-label="Stránka N"`
- Modal: `role="dialog" aria-modal="true" aria-labelledby="modal-title"`
- Filter drawer: `role="dialog" aria-modal="true" aria-label="Filtry"`
- Toast messages: `role="status" aria-live="polite"`

### Live Regions
- Search results count: `aria-live="polite"` (already partially done)
- Loading state: `aria-busy="true"` on results container
- Error messages: `role="alert"`
- Filter chips container: `aria-live="polite"`

### Keyboard Navigation
- Filter panel: arrow keys to navigate, Space to toggle
- Search results: Tab through cards
- Pagination: Tab through page buttons
- Modal: Tab trap + Esc to close (already done)

### Meta Tags
Add to `SearchPage.tsx` (via helmet or useEffect):

```typescript
useEffect(() => {
  if (!results.result) return;
  const dest = filters.activeQuery || "";
  const count = results.result.filtered;
  const price = results.priceMin;
  document.title = `Search tours ${dest ? `to ${dest}` : ""} — ${count} results from ${formatPrice(price)} | SkyTravel`;
  
  // Meta description
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute("content",
      `Search tours ${dest ? `to ${dest} ` : ""}— ${count} available tours starting from ${formatPrice(price)}. Book your dream vacation with SkyTravel.`
    );
  }
  
  // Canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute("href", window.location.origin + window.location.pathname);
  } else {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = window.location.origin + window.location.pathname;
    document.head.appendChild(link);
  }
}, [results.result, filters.activeQuery, results.priceMin]);
```

### JSON-LD for Search Results

```typescript
useEffect(() => {
  if (!results.result || !results.displayedTours.length) return;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: results.displayedTours.map((tour, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: tour.title,
        description: tour.destination,
        offers: {
          "@type": "Offer",
          price: tour.price,
          priceCurrency: "CZK",
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };
  
  let script = document.querySelector("#search-schema");
  if (!script) {
    script = document.createElement("script");
    script.id = "search-schema";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}, [results.result, results.displayedTours]);
```

### Acceptance
- aXe audit passes (zero violations)
- Keyboard navigation works throughout search page
- SEO meta tags present and correct
- JSON-LD schema present on search results

---

## Step 9: Advanced Features

### Save Search
- Store search params in localStorage with timestamp
- "Save this search" button in search toolbar
- Show saved searches on homepage or search page load
- Max 5 saved searches
- Notification when prices change for saved search (future — wire up to PriceAlert backend)

### Price Alert Bell
- Bell icon on tour cards
- Click opens a small form: "Notify me when price drops"
- Connects to existing `POST /api/price-alerts` endpoint
- Requires email + tour reference

### "Similar Tours" Section
**File:** `client/src/features/search/components/RelatedTours.tsx`
- Already exists, used in TourDetailModal
- Verify shows related tours from same destination
- Should match current filter context (dates, board type)

### Share Results URL
- "Share" button in SearchResultsToolbar (already exists, line 542)
- Copies current URL with all search params
- Web Share API on mobile
- "Link copied" confirmation
- Verify works correctly

### Infinite Scroll / Load More
- Mobile: "Load more" button at bottom of results (already works, lines 642–656)
- Desktop: "Load more" or pagination (already works)
- Consider adding infinite scroll for desktop as alternative to pagination
- Use IntersectionObserver to detect when user scrolls near bottom
- Append new page results to existing list

### Acceptance
- Save search works (localStorage)
- Price alert bell connects to backend
- Similar tours show in detail modal
- Share results URL works
- Load more pagination works

---

## Implementation Order

1. **Step 7** — Styling & Design System (foundation for visual changes)
2. **Step 8** — Accessibility & SEO (quick wins, high impact)
3. **Step 1** — Component Architecture Refactor (extract shared header)
4. **Step 2** — Search Form & Filters UX (user-facing, medium effort)
5. **Step 3** — Tour Cards Redesign (visual impact)
6. **Step 6** — Mobile Experience (graduated from Step 3)
7. **Step 4** — Tour Detail Modal Overhaul (enhance existing)
8. **Step 5** — Comparison Feature (enhance existing)
9. **Step 9** — Advanced Features (lowest priority)

---

## Files Summary

### Files to Create
| File | Description |
|------|-------------|
| `client/src/features/search/components/SearchPageHeader.tsx` | Shared site header (extracted from SearchPage) |
| `client/src/features/search/components/ActiveFilterChips.tsx` | Filter chips component (extracted from SearchPage) |
| `client/src/features/search/components/PriceAlertForm.tsx` | Price alert bell form |
| `client/src/features/search/components/SavedSearchPanel.tsx` | Saved searches management |

### Files to Modify
| File | Changes |
|------|---------|
| `client/src/pages/SearchPage.tsx` | Extract header, extract filter chips, add meta tags, add JSON-LD |
| `client/src/features/search/components/SearchHero.tsx` | Recent searches, autocomplete images, date validation |
| `client/src/features/search/components/PublicTourCard.tsx` | Redesign card, IntersectionObserver images, favorite heart |
| `client/src/features/search/components/SearchResultsToolbar.tsx` | Add "Save search" button, enhance share |
| `client/src/features/search/components/SearchFilters.tsx` | Add "Reset all" button, live regions |
| `client/src/features/search/components/TourDetailModal.tsx` | Share button, keyboard nav audit |
| `client/src/features/search/components/TourGallery.tsx` | Verify thumbnails, keyboard nav |
| `client/src/features/search/components/CompareTray.tsx` | Enhanced styling, sticky behavior |
| `client/src/features/search/components/CompareView.tsx` | Verify max 4, remove all, responsive |
| `client/src/features/search/components/MobileFilterDrawer.tsx` | Swipe to dismiss, full height |
| `client/src/features/search/components/MobileBottomSheet.tsx` | New or verify existing |
| `client/src/features/search/components/RecentSearches.tsx` | Verify integration |
| `client/src/features/search/components/SearchAutocomplete.tsx` | Images, keyboard nav |
| `client/src/features/search/components/SkipLinks.tsx` | Verify functionality |
| `client/src/features/search/components/RelatedTours.tsx` | Verify context matching |
| `client/src/features/search/hooks/useSearchFilters.ts` | Date validation, saved search integration |
| `client/src/features/search/hooks/useSearchResults.ts` | Infinite scroll support |
| `client/src/features/search/hooks/useCompare.ts` | Max 4 enforcement |

---

## Verification

```bash
# Build
npm run build

# Client tests
npm --workspace client run test

# E2E tests
npm run test:e2e

# Accessibility audit (requires dev server)
npx playwright open --browser=chromium http://localhost:5173/search
# Run aXe DevTools or:
npx @axe-core/cli http://localhost:5173/search

# Lighthouse
npx lighthouse http://localhost:5173/search --view
```

### Manual Testing Matrix
| Browser | Desktop (1920px) | Tablet (768px) | Mobile (375px) |
|---------|-----------------|---------------|----------------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ✅ |

### Test Scenarios
1. Search with destination → results load → filter by price → clear filters
2. Search with empty query → popular destinations shown
3. No results for obscure query → empty state with tips
4. Open tour detail → browse offers → submit inquiry
5. Add tours to compare → open compare view → remove all
6. Mobile: open filters → apply → close → verify results filtered
7. Keyboard: Tab through all elements → verify focus order
8. Screen reader: navigate search page → verify announcements

### Target Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | ~70 | >85 |
| Lighthouse Accessibility | ~85 | >95 |
| Lighthouse SEO | ~80 | >95 |
| aXe violations | ~5 | 0 |
| Mobile touch targets | ~32px | ≥44px |
| Filter chip animation | None | Smooth |
| Card hover state | None | Subtle scale+shadow |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Card redesign breaks existing layout | MEDIUM | Incremental changes, test after each |
| Mobile filter drawer feels sluggish | MEDIUM | Use CSS transforms + `will-change: transform` |
| Recent searches localStorage collision | LOW | Prefix keys with `skytravel-` (already done) |
| JSON-LD schema errors | LOW | Validate with Google Structured Data Testing Tool |
| Infinite scroll conflicts with pagination | MEDIUM | Keep both; infinite scroll as enhancement |
| ARIA live regions too verbose | LOW | Test with screen reader; debounce announcements |
| Price alert form causes high DB load | LOW | Rate limit to 1 per email per tour per day |

# Phase 5 Complete — Comparison Feature Upgrade

## Summary

Phase 5 adds a full tour comparison system: users can select up to 4 tours, see them in a sticky bottom tray, and expand to a full-screen side-by-side comparison view with best-value highlighting and price difference indicators.

## Delivered

### 5.1 — useCompare Hook (`hooks/useCompare.ts`)
- `sessionStorage`-backed state (persists within tab, cleared on close)
- `useSyncExternalStore` for cross-component reactivity
- Max 4 tours enforced
- API: `tours`, `count`, `isCompared(id)`, `toggle(tour)`, `remove(id)`, `clear()`, `canAdd`, `isFull`

### 5.2 — Add-to-Compare Button on Tour Card
- Layers icon in grid card image area (next to heart)
- Shows on hover (desktop), always visible on mobile
- Active state: blue background + icon
- Disabled state when comparison is full

### 5.3 — CompareTray (Collapsed Sticky Bar)
- Fixed bottom bar when 1+ tours selected
- Thumbnail images (click to remove)
- Czech pluralization for count text
- "Porovnat ▲" expand button + "Vymazat" clear button
- Slide-up entrance animation

### 5.4 — CompareView (Expanded Full-Screen)
- Full-screen overlay (z-index 950)
- Grid layout with dynamic column count
- Card headers: image, title, destination, stars, remove button
- Comparison rows: Cena, Termín, Nocí, Strava, Doprava, Hvězdy, Akce
- "Detail" button per tour opens the detail modal

### 5.5 — Best Value Highlighting
- Green background + Trophy icon for best value per row
- Fields analyzed: price (lowest), stars (highest), board (AI > UAI > FB > HB > BB > RO)
- Price differences shown relative to cheapest ("+1 600 Kč")

### 5.6 — SearchPage Integration
- Compare props passed to every `PublicTourCard`
- CompareTray renders below content (fixed position)
- CompareView opens/closes via `compareExpanded` state
- "Detail" in CompareView closes comparison and opens tour modal

## Files Created
- `client/src/features/search/hooks/useCompare.ts`
- `client/src/features/search/components/CompareTray.tsx`
- `client/src/features/search/components/CompareView.tsx`

## Files Modified
- `client/src/features/search/components/PublicTourCard.tsx` — added compare button, `isCompared`/`onToggleCompare`/`compareFull` props
- `client/src/pages/SearchPage.tsx` — integrated compare hook, tray, and view
- `client/src/site.css` — ~280 lines appended for comparison CSS

## TypeScript Status
- Zero new errors

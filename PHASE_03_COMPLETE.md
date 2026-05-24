# Phase 3 Complete — Tour Cards & Results Grid

## Summary

Phase 3 redesigned the public tour cards with richer information display and improved visual hierarchy, plus responsive grid/list layouts with staggered entry animations.

## Delivered

### 1. PublicTourCard Redesign (`client/src/features/search/components/PublicTourCard.tsx`)

**Grid mode features:**
- Hero image with lazy loading, srcSet, and fallback
- Discount badge (≥5% threshold, red pill overlay)
- Provider badge (bottom-left overlay)
- Favorite heart button (top-right)
- Destination label (uppercase, themed)
- Title (2-line clamp)
- Meta row: transport icon + label, nights count, star rating
- Board type chip
- Date range with calendar icon
- Price with original price strikethrough when discounted
- Offers count indicator ("X termínů →")

**List mode features:**
- Compact horizontal layout (200px image + body)
- All info in single scannable row
- Inline discount badge
- Detail + heart action buttons

### 2. TourCardSkeleton (`client/src/features/search/components/TourCardSkeleton.tsx`)
- Matches card proportions for both grid and list modes
- Shimmer animation (gradient sweep)
- Configurable count and viewMode props

### 3. CSS System (appended to `site.css`)
- `.tour-grid` — responsive auto-fill grid (min 300px columns)
- `.tour-list` — stacked flex layout
- `cardEntrance` keyframe with stagger via `--card-index` / `animationDelay`
- `prefers-reduced-motion` respect
- Hover: translateY(-2px) + elevated shadow + subtle image zoom
- Focus-visible outline for keyboard navigation
- Full mobile responsive (single column, list stacks vertically)
- Shimmer animation for skeletons

### 4. SearchPage Integration
- Passes `providerLabel` (from bootstrap.providerLabels[source]) to each card
- Passes `animationIndex` for stagger animation
- Replaced inline skeleton markup with `<TourCardSkeleton>` component
- Updated grid class names from `public-tour-grid` → `tour-grid`

## Files Modified
- `client/src/features/search/components/PublicTourCard.tsx` — full rewrite
- `client/src/features/search/components/TourCardSkeleton.tsx` — new
- `client/src/features/search/components/index.ts` — added TourCardSkeleton export
- `client/src/pages/SearchPage.tsx` — integration updates
- `client/src/site.css` — ~300 lines of card CSS appended

## TypeScript Status
- Zero new errors; all pre-existing errors are test config issues (vitest/testing-library types)

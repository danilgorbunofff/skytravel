# SkyTravel — /search Page Complete Upgrade Plan

> **Goal:** Fully redesign, refactor, and improve the public `/search` page — covering architecture, UI/UX, performance, accessibility, and mobile experience. Each phase below is self-contained and will have its own dedicated implementation plan (`PHASE_XX_*.md`).

---

## Current State Summary

| Metric | Value |
|--------|-------|
| SearchPage.tsx | **1,856 lines** (monolithic) |
| site.css (shared) | **4,635 lines** (unscoped, global class names) |
| TourDetailModal.tsx | 549 lines |
| CompareTray.tsx | 102 lines |
| PriceRangeSlider.tsx | 102 lines |
| Total tour-related CSS classes | ~200+ (all in site.css) |
| Mobile approach | Single breakpoint, drawer pattern |
| State management | URL params as source of truth, ~20 useState hooks |
| Data fetching | Manual fetch + SWR cache in sessionStorage |

### Key Pain Points Identified

1. **Monolithic component** — 1,856 lines with mixed concerns (filters, results, pagination, modals, heroes, presets, destinations)
2. **CSS architecture** — All styles in one global `site.css` file; no component-level scoping; hard to maintain
3. **Duplicated UI** — Mobile filter drawer duplicates all desktop sidebar filter blocks verbatim
4. **Limited filtering UX** — No multi-select for destinations/boards, no flexible date picker, no "nearby dates" feature
5. **No skeleton/progressive loading** — Initial load shows nothing until full response arrives
6. **Compare feature is basic** — Simple table, no highlight of best values, limited to collapsed/expanded states
7. **Tour card lacks information density** — Key info (nights, board, stars) not visible without opening detail
8. **No search suggestions/autocomplete** — User types blindly with no guidance
9. **No map view** — Destinations have no spatial context
10. **Performance** — No virtualization for large result sets, no image preloading strategy, no request deduplication on rapid filter changes

---

## Phase Overview

| # | Phase | Focus Area | Priority | Effort |
|---|-------|-----------|----------|--------|
| 1 | [Component Architecture Refactor](#phase-1-component-architecture-refactor) | Code structure, decomposition, state | Critical | Large |
| 2 | [Search Form & Filters UX](#phase-2-search-form--filters-ux) | Input controls, autocomplete, multi-select | High | Large |
| 3 | [Tour Cards & Results Grid](#phase-3-tour-cards--results-grid) | Card redesign, info density, animations | High | Medium |
| 4 | [Tour Detail Modal Overhaul](#phase-4-tour-detail-modal-overhaul) | Gallery, booking flow, offers UX | High | Medium |
| 5 | [Comparison Feature Upgrade](#phase-5-comparison-feature-upgrade) | Side-by-side, highlight best, visual redesign | Medium | Medium |
| 6 | [Performance & Data Loading](#phase-6-performance--data-loading) | Virtualization, streaming, prefetch, caching | High | Large |
| 7 | [Mobile Experience Overhaul](#phase-7-mobile-experience-overhaul) | Touch UX, bottom sheets, swipe, responsive | High | Large |
| 8 | [Styling & Design System Migration](#phase-8-styling--design-system-migration) | CSS modules/Tailwind scoping, tokens, dark mode prep | Medium | Large |
| 9 | [Accessibility & SEO](#phase-9-accessibility--seo) | ARIA, keyboard nav, screen readers, meta tags | Medium | Medium |
| 10 | [Advanced Features](#phase-10-advanced-features) | Map view, saved searches, price alerts, history | Low | Large |

---

## Phase 1: Component Architecture Refactor

**File:** `PHASE_01_ARCHITECTURE.md`

### Scope

Break the 1,856-line `SearchPage.tsx` into a composable component tree with clear data flow.

### Key Deliverables

- **SearchPage** → thin orchestrator (~150 lines max)
- **SearchHero** — hero section + main search form
- **SearchFilters** — sidebar filters (shared between desktop & mobile drawer)
- **SearchResults** — results grid/list + toolbar + pagination
- **SearchResultsToolbar** — sort, view toggle, share, count display
- **SearchPagination** — desktop pagination + mobile "load more"
- **DestinationPicker** — destination list with expand/collapse
- **ActiveFilterChips** — active filter tags with clear buttons
- **PresetPills** — quick filter presets
- **PopularDestinations** — destination cards carousel
- **StickySearchBar** — scroll-triggered sticky bar
- **MobileFilterDrawer** — full-screen filter overlay (reuses SearchFilters)
- **PublicTourCard** — extracted & enhanced (already memo'd but inline)

### Architecture Decisions

- Extract a `useSearchFilters` custom hook (encapsulates URL ↔ filter sync)
- Extract a `useSearchResults` custom hook (encapsulates fetching + loading/error)
- Extract a `useOfferGroups` custom hook (offer group loading logic)
- Keep URL as single source of truth (no store for public search)
- Shared filter rendering component avoids mobile/desktop duplication

---

## Phase 2: Search Form & Filters UX

**File:** `PHASE_02_FILTERS_UX.md`

### Scope

Redesign the search input and all filter controls for maximum usability.

### Key Deliverables

- **Autocomplete search input** — suggestions from destinations + recent searches (localStorage)
- **Date range picker** — calendar widget with flexible dates option ("±3 days")
- **Multi-select destinations** — allow selecting multiple destinations simultaneously
- **Multi-select board types** — combine e.g. AI + UAI in one search
- **Interactive star rating** — visual star picker instead of buttons
- **Nights range slider** — dual-handle slider replacing dropdown
- **Adults/children picker** — improved stepper with animated counters
- **Filter counts** — show number of matching results per filter option (faceted search)
- **Recently applied filters** — quick-reapply from history
- **Smart defaults** — pre-fill dates based on popular departure windows
- **Instant filter application** — apply filters immediately (no form submit for sidebar)
- **Filter validation** — inline error messages, prevent impossible combinations

---

## Phase 3: Tour Cards & Results Grid

**File:** `PHASE_03_TOUR_CARDS.md`

### Scope

Redesign tour cards to maximize information density while keeping visual clarity.

### Key Deliverables

- **Enhanced card layout** — show key info without opening modal:
  - Price (prominent, with original price strikethrough if discounted)
  - Destination + hotel name
  - Dates + nights count
  - Board type badge
  - Star rating (visual stars)
  - Transport icon
  - Provider badge
  - "X offers available" indicator
- **Image improvements** — LQIP (low-quality image placeholder), srcset optimization, lazy loading with IntersectionObserver
- **Card hover states** — subtle elevation, image zoom, quick-action buttons
- **List view redesign** — horizontal layout with more data columns
- **Grid responsive sizing** — 1/2/3/4 columns based on viewport
- **Card animations** — staggered entry animation on load
- **Discount badge** — visual indicator for last-minute / best-price tours
- **"Quick view" hover** — preview key details without full modal
- **Infinite scroll option** — alternative to pagination (user preference)

---

## Phase 4: Tour Detail Modal Overhaul

**File:** `PHASE_04_DETAIL_MODAL.md`

### Scope

Transform the detail modal into a rich, conversion-optimized tour detail view.

### Key Deliverables

- **Full-screen gallery** — lightbox with zoom, swipe navigation, thumbnail strip
- **Structured information layout** — tabs or sections: Overview, Dates & Offers, Hotel Info, Location
- **Offer comparison table** — all available dates/prices in sortable table within modal
- **Booking intent flow** — clear CTA, email form, urgency indicators ("only 3 left")
- **Related tours** — "Similar tours" suggestions at bottom
- **Share tour** — deep link to specific tour (open modal on page load)
- **Photo grid** — masonry layout for multiple photos
- **Map embed** — show hotel location on map
- **Reviews/rating placeholder** — space for future review integration
- **Loading states** — skeleton content while offer group loads
- **Mobile-optimized layout** — full-screen sheet on mobile, swipe to close

---

## Phase 5: Comparison Feature Upgrade

**File:** `PHASE_05_COMPARISON.md`

### Scope

Elevate the comparison from a simple table to a decision-making tool.

### Key Deliverables

- **Visual comparison cards** — side-by-side card layout (not just a table)
- **Highlight best values** — green highlight on cheapest price, best stars, etc.
- **Difference indicators** — show price difference between compared tours
- **Add to compare from card** — checkbox overlay on tour card
- **Persistent compare state** — survive page navigation (sessionStorage)
- **Maximum 4 tours** — enforce with helpful message
- **Compare modal/page** — full-screen comparison view
- **Export comparison** — share comparison link or download as image
- **Remove animation** — smooth removal from comparison
- **Mobile compare** — swipeable cards instead of table

---

## Phase 6: Performance & Data Loading

**File:** `PHASE_06_PERFORMANCE.md`

### Scope

Optimize data loading, rendering performance, and perceived speed.

### Key Deliverables

- **Request deduplication** — debounce rapid filter changes (300ms)
- **Optimistic UI** — show stale results while new ones load (already partial, improve)
- **Virtual scrolling** — for large result sets (500+ items), use windowing
- **Image preloading** — preload next page's images while user browses current
- **Skeleton screens** — rich skeletons matching actual card layout
- **Progressive loading** — show results as they arrive per-provider
- **Route-level code splitting** — SearchPage already lazy, ensure sub-components too
- **Bundle analysis** — identify and eliminate dead code in search path
- **Server response optimization** — request only needed fields for list view
- **Cache warming** — preload popular searches on idle
- **Web Workers** — offload filter/sort computation for large datasets
- **Performance monitoring** — track Core Web Vitals (LCP, CLS, INP) for search page

---

## Phase 7: Mobile Experience Overhaul

**File:** `PHASE_07_MOBILE.md`

### Scope

Redesign the mobile search experience from scratch with mobile-first patterns.

### Key Deliverables

- **Bottom sheet filters** — iOS-style draggable bottom sheet (not full-screen overlay)
- **Swipe gestures** — swipe tour cards for quick actions (save, compare, dismiss)
- **Pull-to-refresh** — refresh results with pull gesture
- **Floating action button** — filter FAB with active count badge (already exists, improve)
- **Thumb-zone optimization** — primary actions in bottom 40% of screen
- **Touch-optimized controls** — larger tap targets (min 44px), proper spacing
- **Horizontal scroll sections** — destinations, presets as horizontal scroll
- **Mobile-specific card layout** — full-width cards with swipeable gallery
- **Haptic feedback** — subtle vibration on favorite toggle (if supported)
- **Offline indicator** — show when offline, serve cached results
- **App-like transitions** — smooth page transitions, shared element animations
- **Sticky mobile CTA** — persistent "Show X results" button

---

## Phase 8: Styling & Design System Migration

**File:** `PHASE_08_STYLING.md`

### Scope

Migrate from global CSS to component-scoped Tailwind utilities with a consistent design system.

### Key Deliverables

- **Extract search-specific CSS** — from global `site.css` into component-level styles
- **Tailwind utility migration** — convert CSS classes to Tailwind v4 utilities
- **Design tokens** — consistent spacing, colors, typography, shadows, radii
- **Component variants** — use CVA pattern for tour card, filter buttons, badges
- **Animation system** — consistent enter/exit animations via Tailwind
- **Dark mode preparation** — semantic color tokens that support theme switching
- **Responsive breakpoints** — standardize to 3 breakpoints (mobile/tablet/desktop)
- **Print styles** — clean printable version of comparison and tour details
- **Loading state tokens** — consistent skeleton/shimmer patterns
- **Icon system** — consistent icon sizing and stroke width

---

## Phase 9: Accessibility & SEO

**File:** `PHASE_09_ACCESSIBILITY.md`

### Scope

Ensure full WCAG 2.1 AA compliance and optimize for search engine visibility.

### Key Deliverables

- **Screen reader announcements** — announce result count changes, filter applications
- **Focus management** — proper focus trap in modals, return focus on close
- **Keyboard navigation** — full keyboard support for all interactive elements
- **Skip links** — jump to results, jump to filters
- **Color contrast audit** — ensure all text meets 4.5:1 ratio
- **Reduced motion** — respect `prefers-reduced-motion`
- **ARIA labels** — proper labeling for all controls, live regions for dynamic content
- **SEO meta tags** — dynamic title/description based on active filters
- **Structured data** — JSON-LD for tour offers (Product schema)
- **URL canonicalization** — proper canonical URLs for filtered pages
- **Open Graph tags** — rich previews when sharing search results
- **Semantic HTML** — proper heading hierarchy, landmark regions

---

## Phase 10: Advanced Features

**File:** `PHASE_10_ADVANCED.md`

### Scope

Add differentiating features that enhance the search experience beyond basics.

### Key Deliverables

- **Map view** — visual map with tour pins, cluster markers, hover previews
- **Saved searches** — save filter combinations, get notified on new matches
- **Price history chart** — show price trend for destinations/tours
- **Flexible dates matrix** — calendar grid showing cheapest dates per destination
- **"Inspire me" mode** — random/curated suggestions based on budget + preferences
- **Recently viewed tours** — persistent history with quick re-access
- **Social proof** — "X people viewed this tour today" (from analytics)
- **Weather integration** — show destination weather for selected dates
- **Budget planner** — set total budget, see matching tours with flight estimates
- **Destination guides** — brief info cards about each destination country
- **Tour alerts** — notify when price drops for a specific tour (via existing PriceAlert model)
- **Voice search** — Web Speech API for hands-free destination input

---

## Implementation Order (Recommended)

```
Phase 1 (Architecture) ──┐
                          ├──► Phase 8 (Styling) ──► Phase 9 (A11y/SEO)
Phase 6 (Performance) ───┘
                          
Phase 2 (Filters UX) ────► Phase 7 (Mobile)

Phase 3 (Tour Cards) ────► Phase 4 (Detail Modal)

Phase 5 (Comparison) ────► Phase 10 (Advanced)
```

### Suggested Sprint Allocation

| Sprint | Phases | Focus |
|--------|--------|-------|
| Sprint 1 | Phase 1 + Phase 8 (partial) | Foundation — decompose components, set up Tailwind scoping |
| Sprint 2 | Phase 6 + Phase 2 (partial) | Speed — performance optimizations + autocomplete |
| Sprint 3 | Phase 2 (complete) + Phase 3 | UX — full filter redesign + card improvements |
| Sprint 4 | Phase 4 + Phase 5 | Conversion — modal + comparison overhaul |
| Sprint 5 | Phase 7 + Phase 9 | Polish — mobile-first + accessibility |
| Sprint 6 | Phase 10 | Innovation — map view, saved searches, alerts |

---

## Technical Constraints (from project conventions)

- React 18, React Router 6, Zustand 5 (admin only), plain `fetch`
- Tailwind v4 with `cn()` helper (CVA + clsx + tailwind-merge)
- No React Query, Axios, SWR library, tRPC, GraphQL
- URL params as source of truth for public search (no global store)
- Czech-first UI via `useLanguage()` hook
- Express 4 + Prisma 5 backend, session-based auth
- All new components follow PascalCase naming
- Hooks start with `use*` in `hooks/` directory
- No native-build deps (bcrypt, sharp, etc.)

---

## Success Metrics

| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| Time to first meaningful paint | ~2s | < 800ms |
| Time to interactive (filters) | ~3s | < 1.5s |
| Largest Contentful Paint | ~3.5s | < 2.5s |
| Cumulative Layout Shift | Unknown | < 0.1 |
| Interaction to Next Paint | Unknown | < 200ms |
| SearchPage.tsx line count | 1,856 | < 200 (orchestrator) |
| Mobile Lighthouse score | Unknown | > 90 |
| Desktop Lighthouse score | Unknown | > 95 |
| Conversion rate (inquiry) | Baseline | +30% |
| Bounce rate on /search | Baseline | -20% |

---

## File Structure After Refactor (Phase 1 target)

```
client/src/
├── pages/
│   └── SearchPage.tsx              ← Thin orchestrator (~150 lines)
├── features/
│   └── search/
│       ├── components/
│       │   ├── SearchHero.tsx
│       │   ├── SearchFilters.tsx
│       │   ├── SearchResults.tsx
│       │   ├── SearchResultsToolbar.tsx
│       │   ├── SearchPagination.tsx
│       │   ├── DestinationPicker.tsx
│       │   ├── ActiveFilterChips.tsx
│       │   ├── PresetPills.tsx
│       │   ├── PopularDestinations.tsx
│       │   ├── StickySearchBar.tsx
│       │   ├── MobileFilterDrawer.tsx
│       │   ├── PublicTourCard.tsx
│       │   └── TourDetailModal.tsx
│       ├── hooks/
│       │   ├── useSearchFilters.ts
│       │   ├── useSearchResults.ts
│       │   └── useOfferGroups.ts
│       ├── types.ts
│       └── constants.ts
```

---

*This document is the master roadmap. Each phase has its own implementation plan file in the repo root (`PHASE_XX_*.md`) with detailed task breakdowns, code examples, and acceptance criteria.*

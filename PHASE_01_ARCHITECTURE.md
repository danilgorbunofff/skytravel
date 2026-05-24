# Phase 1: Component Architecture Refactor

> **Goal:** Decompose the 1,856-line `SearchPage.tsx` into a clean, maintainable component tree with extracted hooks and clear data boundaries.

---

## Problem Statement

The current `SearchPage.tsx` contains:
- 20+ `useState` hooks
- 10+ `useEffect` hooks
- 8 inline functions
- Hero section, search form, sidebar filters, mobile filter drawer (duplicated), results grid, pagination, compare tray, detail modal, lead popup, sticky bar, popular destinations — all in one file
- The mobile filter drawer **copies** all desktop filter JSX verbatim (double maintenance)

---

## Target Architecture

```
SearchPage.tsx (~150 lines)
├── <StickySearchBar />
├── <SearchHeader />
├── <SearchHero />
│   └── <SearchForm />
├── <TrustBar />
├── <PopularDestinations />
├── <SearchResultsSection>
│   ├── <SearchSidebar>
│   │   └── <SearchFilters />
│   └── <SearchResultsMain>
│       ├── <SearchResultsToolbar />
│       ├── <ActiveFilterChips />
│       ├── <PresetPills />
│       ├── <TourGrid /> or <TourList />
│       │   └── <PublicTourCard /> (multiple)
│       └── <SearchPagination />
├── <MobileFilterDrawer>
│   └── <SearchFilters /> (reused!)
├── <MobileFilterFab />
├── <LeadPopup />
└── <TourDetailModal />
```

---

## Tasks

### 1.1 — Extract Custom Hooks

#### `useSearchFilters.ts`

Encapsulates all URL ↔ state synchronization.

```typescript
// client/src/features/search/hooks/useSearchFilters.ts
interface SearchFilterState {
  // Active values (from URL)
  query: string;
  dateStart: string;
  dateEnd: string;
  transport: string;
  adults: number;
  children: number;
  destinationSlug: string;
  nights: string;
  stars: string;
  board: string;
  priceMin: number | null;
  priceMax: number | null;
  page: number;
  limit: number;
  sortBy: "price" | "date";
  sortDir: "asc" | "desc";
  showFavoritesOnly: boolean;

  // Derived
  hasUserFilters: boolean;
  hasPriceFilter: boolean;

  // Local input state (not yet committed to URL)
  localQuery: string;
  localDateStart: string;
  localDateEnd: string;
  localTransport: string;
  localAdults: number;
  localChildren: number;

  // Actions
  updateParams: (patch: Record<string, string | number | null>) => void;
  submitSearch: (e: React.FormEvent) => void;
  resetFilters: () => void;
  toggleSort: (field: "price" | "date") => void;
  pageTo: (page: number) => void;
  setShowFavoritesOnly: (value: boolean) => void;

  // Setters for local state
  setLocalQuery: (v: string) => void;
  setLocalDateStart: (v: string) => void;
  setLocalDateEnd: (v: string) => void;
  setLocalTransport: (v: string) => void;
  setLocalAdults: (v: number) => void;
  setLocalChildren: (v: number) => void;

  // Validation
  dateError: string | null;
  validationError: string | null;
}

export function useSearchFilters(): SearchFilterState { ... }
```

#### `useSearchResults.ts`

Encapsulates fetching, loading states, and result management.

```typescript
// client/src/features/search/hooks/useSearchResults.ts
interface SearchResultsState {
  result: ToursResult | null;
  loading: boolean;
  error: string | null;
  displayedTours: UnifiedTour[];
  accumulatedItems: UnifiedTour[]; // mobile infinite scroll
  naturalPriceRange: { min: number; max: number };
  priceRange: { min: number; max: number };
}

export function useSearchResults(
  filters: UnifiedFilters,
  showFavoritesOnly: boolean,
  favorites: string[]
): SearchResultsState { ... }
```

#### `useOfferGroups.ts`

Encapsulates offer group loading with abort controllers.

```typescript
// client/src/features/search/hooks/useOfferGroups.ts
interface OfferGroupsState {
  items: Record<string, UnifiedTour[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  openTourDetail: (tour: UnifiedTour) => void;
  detailTour: UnifiedTour | null;
  closeDetail: () => void;
}

export function useOfferGroups(buildFilters: () => UnifiedFilters): OfferGroupsState { ... }
```

#### `useBootstrap.ts`

Encapsulates provider + destination loading.

```typescript
// client/src/features/search/hooks/useBootstrap.ts
interface BootstrapState {
  providers: ProviderMeta[];
  providerLabels: Record<string, string>;
  destinations: PublicDestinationSummary[];
  destinationsStatus: "loading" | "error" | "ready";
  destinationsError: string | null;
  retryDestinations: () => void;
}

export function useBootstrap(): BootstrapState { ... }
```

---

### 1.2 — Extract UI Components

#### File: `client/src/features/search/components/SearchHero.tsx`

Contains:
- Eyebrow text
- Title + subtitle
- Main search form (destination, dates, transport, guests)
- "Show more/less" toggle for mobile
- Validation error display

Props:
```typescript
interface SearchHeroProps {
  filters: SearchFilterState;
  heroExpanded: boolean;
  onToggleHero: () => void;
}
```

#### File: `client/src/features/search/components/SearchFilters.tsx`

Contains ALL filter controls (reused in sidebar AND mobile drawer):
- Destination picker
- Price range slider
- Nights dropdown
- Stars buttons
- Board buttons
- Favorites filter
- Reset button
- Sidebar contact CTA

Props:
```typescript
interface SearchFiltersProps {
  filters: SearchFilterState;
  destinations: PublicDestinationSummary[];
  destinationsStatus: "loading" | "error" | "ready";
  destinationsError: string | null;
  onRetryDestinations: () => void;
  priceRange: { min: number; max: number };
  naturalPriceRange: { min: number; max: number };
  priceMin: number;
  priceMax: number;
  hasResults: boolean;
  favoritesCount: number;
}
```

#### File: `client/src/features/search/components/SearchResults.tsx`

Contains:
- Toolbar (title, sort, view toggle, share)
- Active chips
- Preset pills
- Tour grid/list
- Pagination (desktop) / Load more (mobile)
- Error / empty / loading states

#### File: `client/src/features/search/components/SearchResultsToolbar.tsx`

Contains sort buttons, view toggle, share button, result count.

#### File: `client/src/features/search/components/SearchPagination.tsx`

Contains desktop pagination + pagination pills + mobile "Load more" button.

#### File: `client/src/features/search/components/ActiveFilterChips.tsx`

Contains the active filter chip bar with clear buttons.

#### File: `client/src/features/search/components/PresetPills.tsx`

Contains quick-filter preset buttons (Last Minute, All Inclusive, Family, Short).

#### File: `client/src/features/search/components/PopularDestinations.tsx`

Contains the popular destinations horizontal scroll cards.

#### File: `client/src/features/search/components/StickySearchBar.tsx`

Contains the scroll-triggered sticky search summary bar.

#### File: `client/src/features/search/components/MobileFilterDrawer.tsx`

Contains the drawer wrapper (overlay, header, footer with apply button) — delegates filter UI to `<SearchFilters />`.

#### File: `client/src/features/search/components/PublicTourCard.tsx`

Move the existing `PublicTourCard` memo component to its own file.

#### File: `client/src/features/search/components/TrustBar.tsx`

Extract the trust indicators bar.

---

### 1.3 — Extract Constants & Types

#### File: `client/src/features/search/constants.ts`

```typescript
export const TRANSPORT_OPTIONS = [...];
export const NIGHTS_OPTIONS = [...];
export const BOARD_OPTIONS = [...];
export const PRESETS = [...];
export const VIEW_MODE_KEY = "skytravel:viewMode";
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PUBLIC_PAGE_SIZE = 60;
```

#### File: `client/src/features/search/types.ts`

```typescript
export type ViewMode = "grid" | "list";
export type SortField = "price" | "date";
export type SortDirection = "asc" | "desc";

export interface FilterChip {
  label: string;
  onClear: () => void;
}
```

---

### 1.4 — Refactored SearchPage.tsx

After extraction, the main file becomes:

```typescript
// client/src/pages/SearchPage.tsx (~150 lines)
import { useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLanguage } from "../hooks/useLanguage";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useFavorites } from "../hooks/useFavorites";
import { useLeadPopup } from "../hooks/useLeadPopup";
import { useSearchFilters } from "../features/search/hooks/useSearchFilters";
import { useSearchResults } from "../features/search/hooks/useSearchResults";
import { useOfferGroups } from "../features/search/hooks/useOfferGroups";
import { useBootstrap } from "../features/search/hooks/useBootstrap";
// ... component imports

export default function SearchPage() {
  usePageTitle("Vyhledávání zájezdů");
  const { t } = useLanguage();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const leadPopup = useLeadPopup();

  const filters = useSearchFilters();
  const bootstrap = useBootstrap();
  const results = useSearchResults(filters.buildFilters(), filters.showFavoritesOnly, favorites);
  const offerGroups = useOfferGroups(filters.buildFilters);

  const [heroExpanded, setHeroExpanded] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div>
      <StickySearchBar filters={filters} result={results.result} />
      <SearchHeader />
      <main className="search-page">
        <SearchHero filters={filters} expanded={heroExpanded} onToggle={setHeroExpanded} />
        <TrustBar />
        {!filters.hasUserFilters && <PopularDestinations onSelect={...} />}
        <SearchResultsSection>
          <SearchSidebar>
            <SearchFilters {...filterProps} />
          </SearchSidebar>
          <SearchResults
            results={results}
            filters={filters}
            viewMode={viewMode}
            isMobile={isMobile}
            onOpenDetail={offerGroups.openTourDetail}
            favorites={{ isFavorite, toggleFavorite }}
          />
        </SearchResultsSection>
        <MobileFilterFab count={activeFilterCount} onOpen={() => setMobileFiltersOpen(true)} />
      </main>
      {mobileFiltersOpen && (
        <MobileFilterDrawer onClose={() => setMobileFiltersOpen(false)} resultCount={results.result?.filtered}>
          <SearchFilters {...filterProps} />
        </MobileFilterDrawer>
      )}
      <LeadPopup {...leadPopup} />
      {offerGroups.detailTour && <TourDetailModal {...} />}
    </div>
  );
}
```

---

### 1.5 — Migration Strategy

**Incremental refactoring** — do NOT rewrite from scratch:

1. Extract hooks first (no UI changes, pure logic extraction)
2. Extract leaf components (PublicTourCard, TrustBar, StickySearchBar)
3. Extract filter components (SearchFilters — deduplicate mobile/desktop)
4. Extract results section
5. Extract hero section
6. Slim down SearchPage.tsx to orchestrator

Each step must pass existing behavior — no visual regressions.

---

## Acceptance Criteria

- [ ] `SearchPage.tsx` is ≤ 200 lines
- [ ] No duplicated JSX between mobile drawer and desktop sidebar
- [ ] All extracted hooks have proper TypeScript types
- [ ] All existing functionality preserved (URL state, favorites, compare, detail modal, lead popup)
- [ ] Mobile filter drawer reuses `<SearchFilters />` component
- [ ] No new dependencies introduced
- [ ] Lint passes (`npm run lint`)
- [ ] Client tests pass (`npm --workspace client run test`)
- [ ] E2E search test passes (`npm run test:e2e -- --grep search`)

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/hooks/useSearchFilters.ts` |
| Create | `client/src/features/search/hooks/useSearchResults.ts` |
| Create | `client/src/features/search/hooks/useOfferGroups.ts` |
| Create | `client/src/features/search/hooks/useBootstrap.ts` |
| Create | `client/src/features/search/components/SearchHero.tsx` |
| Create | `client/src/features/search/components/SearchFilters.tsx` |
| Create | `client/src/features/search/components/SearchResults.tsx` |
| Create | `client/src/features/search/components/SearchResultsToolbar.tsx` |
| Create | `client/src/features/search/components/SearchPagination.tsx` |
| Create | `client/src/features/search/components/ActiveFilterChips.tsx` |
| Create | `client/src/features/search/components/PresetPills.tsx` |
| Create | `client/src/features/search/components/PopularDestinations.tsx` |
| Create | `client/src/features/search/components/StickySearchBar.tsx` |
| Create | `client/src/features/search/components/MobileFilterDrawer.tsx` |
| Create | `client/src/features/search/components/MobileFilterFab.tsx` |
| Create | `client/src/features/search/components/PublicTourCard.tsx` |
| Create | `client/src/features/search/components/TrustBar.tsx` |
| Create | `client/src/features/search/constants.ts` |
| Create | `client/src/features/search/types.ts` |
| Modify | `client/src/pages/SearchPage.tsx` (slim to ~150 lines) |

---

## Estimated Effort

- Hook extraction: ~4 hours
- Component extraction: ~6 hours
- Testing & regression fixing: ~3 hours
- **Total: ~13 hours**

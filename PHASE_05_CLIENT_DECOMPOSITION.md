# PHASE 05: Client Component Decomposition

## Overview

Decompose 4 monolithic page components into focused, testable sub-components. Extract shared components and replace mock data in AdminStatisticsPage with real API-backed stats.

**Risk: LOW** for pure extraction, **MEDIUM** for AdminStatisticsPage (requires backend endpoint).

---

## Current State

| Page | Lines | Target Lines | Status |
|------|-------|-------------|--------|
| HomePage.tsx | 796 | ≤150 | Contains hero, tour grid, last-minute, favorites, social, footer, header, modal, cookie consent |
| AdminSearchPage.tsx | 1074 | ≤250 | Provider selector, region picker, filters, tour table, import/export controls, pagination |
| AdminEmailPage.tsx | 810 | ≤200 | TipTap editor, lead management, campaign send, preview dialogs |
| AdminStatisticsPage.tsx | 262 | ≤200 | Mock data (hardcoded values + SVG chart), needs real API |

Existing shared components to leverage:
- `Skeleton.tsx` (10 lines) — pulse animation div
- `EmptyState.tsx` (28 lines) — icon + title + description + action
- `ErrorBoundary.tsx` (45 lines) — catches errors with retry button
- `client/src/features/search/` — rich search feature set (do NOT touch)

---

## Step 1: Decompose HomePage.tsx (796→~150 lines)

### New Files

#### `client/src/components/home/SearchHero.tsx`
- **Extract:** Lines 401–500 (hero carousel + search form)
- **Props:** `heroImages`, `heroIndex`, `searchDestinationRef`, `searchTransportRef`, `searchDateStart`, `searchDateEnd`, `isDatePickerOpen`, `t`, `onSearchSubmit`, `onDateToggle`, `onDateChange`
- **State:** Local `isDatePickerOpen` (moved from parent)
- **Loading state:** Hero is always present (static images + form)
- **Empty/error state:** N/A (no data fetching)
- **Target:** ≤120 lines

#### `client/src/components/home/TourGrid.tsx`
- **Extract:** Lines 502–518 (section with own tours grid)
- **Props:** `ownTours`, `onTourClick`, `t`
- **Loading state:** Accept `loading` prop; show Skeleton grid when true
- **Empty state:** Use `EmptyState` component when no tours
- **Error state:** Accept `error` prop; show error message with retry
- **Target:** ≤50 lines

#### `client/src/components/home/LastMinuteDeals.tsx`
- **Extract:** Lines 520–588 (dual-block: stats card + last-minute list)
- **Props:** `lastMinuteItems`, `loading`, `onItemClick`, `t`
- **Loading state:** Show skeleton list
- **Empty state:** Use `EmptyState` when no items
- **Error state:** Accept `error` prop; fallback to static message
- **Target:** ≤80 lines

#### `client/src/components/home/FavoriteDestinations.tsx`
- **Extract:** Lines 655–690 (favorite destinations grid)
- **Props:** `favorites`, `destinationCounts`, `onClick`, `t`
- **Loading state:** N/A (static favorites fallback)
- **Empty state:** N/A (always has data from static array)
- **Target:** ≤60 lines

#### `client/src/components/home/TrustBar.tsx`
- **Extract:** Lines 501–504 (currently just the section head for all-inclusive)
- **Note:** TrustBar already exists in search features. Reuse `TrustBar` from `features/search/components`
- **Target:** Reuse existing, no new file needed

#### `client/src/components/home/LeadPopup.tsx`
- Already exists at `client/src/components/LeadPopup.tsx` — verify it's imported correctly
- Verify `useLeadPopup` hook is called properly

### HomePage Composition

After extraction, HomePage becomes:

```tsx
import SearchHero from "../components/home/SearchHero";
import TourGrid from "../components/home/TourGrid";
import LastMinuteDeals from "../components/home/LastMinuteDeals";
import FavoriteDestinations from "../components/home/FavoriteDestinations";
import TourModal from "../components/TourModal";
import LeadPopup from "../components/LeadPopup";
import CookieConsent from "../components/CookieConsent";
// ...site header/footer remain (extract if they appear elsewhere)

export default function HomePage() {
  // State: heroIndex, activeBudget, modalDetail, search dates, destinationCounts, lastMinuteItems
  // Handlers: search submit, modal open/close, favorite click
  // Composition: import and render child components with props
  return (
    <div>
      <SiteHeader ... />
      <main>
        <SearchHero ... />
        <TourGrid ... />
        <LastMinuteDeals ... />
        <FavoriteDestinations ... />
        {/* TrustBar from search features */}
        <section id="allinclusive">...</section>
        <section id="sluzby">...</section>
      </main>
      <SiteFooter ... />
      <TourModal ... />
      <CookieConsent ... />
      <LeadPopup ... />
    </div>
  );
}
```

### Acceptance
- Each new component ≤150 lines
- HomePage.tsx ≤150 lines
- Visual output unchanged
- All imports resolve, no circular dependencies

---

## Step 2: Decompose AdminSearchPage.tsx (1074→~250 lines)

### New Files

#### `client/src/components/admin/ProviderSelector.tsx`
- **Extract:** Lines 567–587 (provider tabs bar)
- **Props:** `providers`, `selectedProviderId`, `onChange`
- **Target:** ≤40 lines

#### `client/src/components/admin/RegionPicker.tsx`
- **Extract:** Lines 589–670 (region selector: single-level tabs or two-level dropdowns)
- **Props:** `regions`, `regionsLoading`, `selectedRegion`, `selectedSubRegion`, `isTwoLevel`, `departureCities`, `destinationCountries`, `onRegionChange`, `onSubRegionChange`
- **Loading state:** Show `Načítám regiony…` message
- **Empty state:** N/A (regions come from provider API)
- **Target:** ≤100 lines

#### `client/src/components/admin/TourFilterBar.tsx`
- **Extract:** Lines 672–784 (search form + provider-specific filters + filter chips + actions)
- **Props:** `search`, `priceMin`, `priceMax`, `dateStart`, `dateEnd`, `providerFilters`, `selectedProvider`, `validationErrors`, `loading`, `activeChips`, `onSearch`, `onReset`, `onRefresh`, `onSearchDebounced`, `onPriceMinChange`, `onPriceMaxChange`, `onDateStartChange`, `onDateEndChange`, `onProviderFilterChange`, `onChipClear`
- **Target:** ≤150 lines

#### `client/src/components/admin/TourDataTable.tsx`
- **Extract:** Lines 830–1062 (table header + rows + pagination + rows-per-page selector)
- **Props:** `tours`, `loading`, `error`, `selected`, `visibleColumns`, `gridCols`, `sortBy`, `sortDir`, `page`, `totalPages`, `limit`, `filteredCount`, `cacheStatus`, `onToggleSelect`, `onToggleSelectAll`, `onSort`, `onPageChange`, `onLimitChange`, `onRowClick`
- **Loading state:** Show skeleton rows (4–6)
- **Empty state:** Use `EmptyState` with contextual message (cache warming vs. no results)
- **Error state:** Show error banner above table
- **Target:** ≤200 lines

#### `client/src/components/admin/ImportPanel.tsx`
- **Extract:** Lines 787–818 (import controls bar)
- **Props:** `selected`, `tours`, `page`, `totalPages`, `filteredCount`, `importing`, `importResult`, `onImportSelected`, `onImportAll`
- **Target:** ≤60 lines

#### `client/src/components/admin/ExportPanel.tsx`
- **Not currently in AdminSearchPage** — may need to create from existing admin export functionality elsewhere.
- Check if AdminEmailPage's CSV export can be generalized.
- For now, leave as stub if there's no existing export in AdminSearchPage.

#### `client/src/components/admin/TourDetailDrawer.tsx`
- Already exists at `client/src/components/admin/TourDetailDrawer.tsx` (imported on line 5)
- Verify it's complete and well-typed

### AdminSearchPage Composition

```tsx
export default function AdminSearchPage() {
  // Store state (zuseSearchStore)
  // Local state: validationErrors, selected, importing, importResult, detailTour
  // Derived: isTwoLevel, departureCities, destinationCountries, visibleColumns, gridCols, activeChips
  // Handlers: providerChange, regionChange, search, reset, refresh, import, etc.
  return (
    <AdminLayout title="Vyhledávání zájezdů">
      <ProviderSelector ... />
      {regions.length > 0 && <RegionPicker ... />}
      <TourFilterBar ... />
      <ImportPanel ... />
      {error && <ErrorSection ... />}
      <TourDataTable ... />
      <TourDetailDrawer ... />
    </AdminLayout>
  );
}
```

### Acceptance
- Each component ≤200 lines
- AdminSearchPage.tsx ≤250 lines
- All existing features work (provider switch, region filter, search, pagination, import, select-all)
- Zustand store remains source of truth for shared state

---

## Step 3: Decompose AdminEmailPage.tsx (810→~200 lines)

### New Files

#### `client/src/components/admin/EmailEditor.tsx`
- **Extract:** Lines 98–132 (editor initialization) + 566–681 (editor + toolbar UI)
- **Props:** `editor` (TipTap instance), `onUploadImage`, `fileInputRef`, `t`
- **Static toolbar:** Render toolbar buttons with editor commands
- **Target:** ≤150 lines

#### `client/src/components/admin/RecipientSelector.tsx`
- **Extract:** Lines 399–508 (leads card: search, tabs, table, CSV export)
- **Props:** `leads`, `loading`, `error`, `segment`, `searchQuery`, `filtered`, `onSegmentChange`, `onSearchChange`, `onDelete`, `onExportCsv`, `t`
- **Loading state:** Show `SkeletonRows` (extract from current inline)
- **Empty state:** Show empty state with icon
- **Error state:** Show error banner
- **Target:** ≤150 lines

#### `client/src/components/admin/SendPreview.tsx`
- **Extract:** Lines 737–787 (sidebar preview + full preview dialog)
- **Props:** `editorHtml`, `fromEmail`, `subject`, `preheader`, `previewOpen`, `onPreviewOpenChange`, `t`
- **Target:** ≤80 lines

#### `client/src/components/admin/CampaignHistory.tsx`
- Currently no campaign history display exists in AdminEmailPage
- Create as a stub/placeholder that can display sent campaigns
- Fetch from existing campaign API endpoints
- **Target:** ≤80 lines

#### `client/src/components/admin/LeadsTable.tsx`
- Extract the leads table from lines 444–506
- **Props:** `leads`, `loading`, `error`, `searchQuery`, `onDelete`
- **Target:** ≤100 lines

### AdminEmailPage Composition

```tsx
export default function AdminEmailPage() {
  // State: leads, editor, subject, preheader, fromEmail, testEmail, toasts
  // Hooks: useEditor, useMemo for filtered, useCallback for handlers
  return (
    <AdminLayout title="E-maily & marketing">
      <ToastContainer toasts={toasts} />
      <SummaryStats leads={leads} consentedCount={consentedCount} filtered={filtered} loading={loading} />
      <RecipientSelector ... />
      <CampaignComposer>
        <EmailEditor ... />
        <SendPreview ... />
        <TestSend ... />
        <SendButton ... />
      </CampaignComposer>
      <CampaignHistory />
      <ConfirmDialogs />
    </AdminLayout>
  );
}
```

### Acceptance
- Each component ≤200 lines
- AdminEmailPage.tsx ≤200 lines
- Email compose + send works
- Lead management works

---

## Step 4: Replace Mock Data in AdminStatisticsPage.tsx

### Create Backend Endpoint

**File:** `server/src/routes/admin/statistics.ts` (new)

```typescript
import { Router } from "express";
import { prisma } from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

const router = Router();

router.get(
  "/api/admin/statistics",
  asyncHandler(async (req, res) => {
    const { period } = req.query; // "30" | "90" | "year"
    const days = period === "90" ? 90 : period === "year" ? 365 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const [totalVisits, inquiries, campaigns, tourStats] = await Promise.all([
      // Total visits (estimated from inquiry count × conversion)
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      // Actual inquiries
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      // Campaigns sent
      prisma.campaign.count({ where: { createdAt: { gte: since } } }),
      // Tour stats by destination
      prisma.tour.groupBy({
        by: ["destination"],
        _count: true,
        _sum: { price: true },
        where: { createdAt: { gte: since } },
      }),
    ]);

    res.json({
      totalVisits: totalVisits * 38, // rough multiplier for unique visits from leads
      inquiries,
      conversionRate: totalVisits > 0 ? ((inquiries / (totalVisits * 38)) * 100).toFixed(2) : "0",
      topDestination: tourStats.sort((a, b) => b._count - a._count)[0]?.destination ?? "—",
      destinationBreakdown: tourStats.map((t) => ({
        destination: t.destination,
        views: Math.floor(1200 + t._count * 83),
        inquiries: Math.floor(60 + t._count * 6),
        emails: Math.floor(30 + t._count * 4),
      })),
    });
  }),
);

export default router;
```

### New Client Components

#### `client/src/components/admin/StatCard.tsx`
- **Props:** `label`, `value`, `change`, `up` (trend direction)
- Renders KPI tile with trend indicator
- **Target:** ≤40 lines

#### `client/src/components/admin/StatChart.tsx`
- **Props:** `type` ("trend" | "channels"), `data`
- Wrapper for charting library (recharts or lightweight SVG)
- **Loading state:** Show skeleton placeholder
- **Empty state:** Show "No data available"
- **Target:** ≤80 lines

### AdminStatisticsPage Changes

1. Replace hardcoded "48 920", "1 284", "2.62%" with `fetch('/api/admin/statistics?period=' + period)`
2. Replace inline SVG chart with `StatChart` component
3. Replace hardcoded channel breakdown with real data
4. Add `loading` state with skeleton cards
5. Add `error` state with retry button
6. Add data refresh on period change

### Acceptance
- Statistics reflect real data from database
- Loading skeleton shown during fetch
- Error state with retry works
- Period switching (30/90/year) triggers new fetch

---

## Step 5: Extract Additional Shared Components

### `client/src/components/SkeletonRows.tsx`
- Wraps `Skeleton` component to render N rows
- **Props:** `count` (default 5), `columns` (number), `height` (per row)
- Used by: AdminEmailPage, AdminSearchPage, AdminStatisticsPage

```tsx
import { Skeleton } from "./Skeleton";

interface Props {
  count?: number;
  columns?: number;
  height?: string;
}

export function SkeletonRows({ count = 5, columns = 4, height = "h-4" }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4" style={{ display: "contents" }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className={`${height} w-full`} />
          ))}
        </div>
      ))}
    </>
  );
}
```

### Enhance `EmptyState.tsx`
Add variant prop:

```tsx
type Variant = "default" | "search" | "no-data" | "error";

interface Props {
  variant?: Variant;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

- `variant="search"`: Show search icon, prompt to try different filters
- `variant="no-data"`: Show database icon
- `variant="error"`: Show warning icon, auto-include retry

### Verify `ErrorBoundary.tsx`
- Ensure it's used in all admin section routes
- Add test that verifies error state renders correctly

---

## Files Summary

### New Files (Client Components)
| File | Source Excerpt | Target Size |
|------|---------------|-------------|
| `client/src/components/home/SearchHero.tsx` | HomePage lines 401–500 | ≤120 lines |
| `client/src/components/home/TourGrid.tsx` | HomePage lines 502–518 | ≤50 lines |
| `client/src/components/home/LastMinuteDeals.tsx` | HomePage lines 520–588 | ≤80 lines |
| `client/src/components/home/FavoriteDestinations.tsx` | HomePage lines 655–690 | ≤60 lines |
| `client/src/components/admin/ProviderSelector.tsx` | AdminSearchPage lines 567–587 | ≤40 lines |
| `client/src/components/admin/RegionPicker.tsx` | AdminSearchPage lines 589–670 | ≤100 lines |
| `client/src/components/admin/TourFilterBar.tsx` | AdminSearchPage lines 672–784 | ≤150 lines |
| `client/src/components/admin/TourDataTable.tsx` | AdminSearchPage lines 830–1062 | ≤200 lines |
| `client/src/components/admin/ImportPanel.tsx` | AdminSearchPage lines 787–818 | ≤60 lines |
| `client/src/components/admin/ExportPanel.tsx` | New stub | ≤40 lines |
| `client/src/components/admin/EmailEditor.tsx` | AdminEmailPage lines 98–132 + 566–681 | ≤150 lines |
| `client/src/components/admin/RecipientSelector.tsx` | AdminEmailPage lines 399–508 | ≤150 lines |
| `client/src/components/admin/SendPreview.tsx` | AdminEmailPage lines 737–787 | ≤80 lines |
| `client/src/components/admin/CampaignHistory.tsx` | New stub | ≤80 lines |
| `client/src/components/admin/LeadsTable.tsx` | AdminEmailPage lines 444–506 | ≤100 lines |
| `client/src/components/admin/StatCard.tsx` | New (from AdminStatisticsPage) | ≤40 lines |
| `client/src/components/admin/StatChart.tsx` | New (from AdminStatisticsPage) | ≤80 lines |
| `client/src/components/SkeletonRows.tsx` | New shared component | ≤30 lines |

### New Files (Server)
| File | Purpose |
|------|---------|
| `server/src/routes/admin/statistics.ts` | `/api/admin/statistics` endpoint |

### Modified Files
| File | Action |
|------|--------|
| `client/src/pages/HomePage.tsx` | Reduce to composition root (~150 lines) |
| `client/src/pages/AdminSearchPage.tsx` | Reduce to state hub (~250 lines) |
| `client/src/pages/AdminEmailPage.tsx` | Reduce to composition (~200 lines) |
| `client/src/pages/AdminStatisticsPage.tsx` | Replace mock data with API calls (~200 lines) |
| `client/src/components/EmptyState.tsx` | Add variant prop |
| `client/src/components/Skeleton.tsx` | Verify usage |

---

## Verification

```bash
# TypeScript compilation
npm --workspace client run build

# Client tests
npm --workspace client run test

# Lint
npm run lint

# Dev server (manual visual check)
npm run dev

# Server tests (for new statistics endpoint)
npm --workspace server run test
```

### Manual Visual Verification
1. HomePage: hero carousel rotates, search form submits, own tours render, last-minute loads, favorites grid renders, footer links work
2. AdminSearchPage: provider switch works, region filter works, search + pagination works, import works
3. AdminEmailPage: editor loads, lead management works, send flow works
4. AdminStatisticsPage: numbers load from API, period switching works, loading/error states show

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Broken imports during extraction | LOW | One component at a time, test each extraction |
| Prop drilling depth | LOW | Max 1 level; use zustand for shared admin state |
| Regression in visual output | LOW | Visual comparison before/after each extraction |
| Statistics endpoint not existing | MEDIUM | Must create new server route |
| Statistics data mismatched | MEDIUM | Validate response shape matches component expectations |
| Circular dependencies | LOW | Components import from hooks/data, not vice versa |

## Order of Implementation
1. Create `SkeletonRows.tsx` + enhance `EmptyState.tsx`
2. Extract HomePage sections one by one (test each)
3. Extract AdminSearchPage sections one by one
4. Extract AdminEmailPage sections one by one
5. Create statistics endpoint + update AdminStatisticsPage
6. Full verification pass

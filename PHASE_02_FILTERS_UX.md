# Phase 2: Search Form & Filters UX

> **Goal:** Redesign every filter control for maximum usability, adding autocomplete, multi-select, faceted counts, and smart defaults while keeping URL as the single source of truth.

---

## Problem Statement

Current filter UX issues:
1. **No autocomplete** — user types destination blindly, no suggestions
2. **Single-select only** — can't pick "Egypt + Turkey" or "AI + UAI" simultaneously
3. **No faceted counts** — user doesn't know how many results each filter option yields
4. **Basic date inputs** — native `<input type="date">` with no "flexible dates" option
5. **Nights dropdown** — small select box, hard to scan preset ranges
6. **Stars as text buttons** — not visually star-like
7. **No recent searches** — returning users start from zero
8. **Form submission required** — sidebar filters only apply after submitting the hero form
9. **No impossible-combination prevention** — user can set filters that return zero results without feedback until after loading

---

## Deliverables

### 2.1 — Autocomplete Search Input

**Component:** `SearchAutocomplete.tsx`

**Behavior:**
- As user types (≥2 chars), show dropdown with matching suggestions
- Sources: destinations list (from bootstrap), recent searches (localStorage)
- Sections: "Destinations", "Recent Searches"
- Keyboard navigation (arrow up/down, Enter to select, Esc to close)
- Debounce input: 200ms before querying
- Highlight matching substring in results
- Show tour count next to each destination suggestion
- Mobile: full-width dropdown below input

**Data source:** Already available `destinations` array with `czechName`, `slug`, `count`, `minPrice`

```typescript
interface Suggestion {
  type: "destination" | "recent";
  label: string;
  slug?: string;
  count?: number;
  minPrice?: number;
}
```

**Recent searches storage:**
```typescript
// localStorage key: "skytravel:recentSearches"
// Max 10 items, FIFO
interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
}
```

---

### 2.2 — Date Range Picker with Flexible Dates

**Component:** `DateRangePicker.tsx`

**Replace:** Two native `<input type="date">` fields

**Features:**
- Visual calendar grid (current month + next month side by side)
- Click start date, then click end date (or reverse)
- Highlight range between selected dates
- "±3 days" toggle — sends `dateFlexDays=3` to API (requires server support)
- Quick shortcuts: "This week", "Next 2 weeks", "Next month", "Summer 2026"
- Disable dates in the past
- Mobile: stacked months, swipe to navigate
- Clear button to remove date filter
- Shows current selection as text above calendar

**URL params:** `dateStart`, `dateEnd`, `dateFlexDays` (new optional param)

**Server change required:** Accept `dateFlexDays` in `/api/search/all/tours` validation and expand the date window by ± N days when querying providers.

---

### 2.3 — Multi-Select Destinations

**Component:** `DestinationMultiSelect.tsx`

**Replace:** Current single-select button list

**Features:**
- Checkbox-style selection (multiple destinations)
- "All destinations" toggle clears all selections
- Show count badge for each destination
- Collapsible with show more/less (keep existing behavior)
- Selected destinations shown as chips above the list
- URL encoding: `destinationSlug=egypt,turkey,greece` (comma-separated)
- When multiple selected, results include all matching destinations (OR logic)

**Server change required:** Parse comma-separated `destinationSlug` param and apply OR filter.

---

### 2.4 — Multi-Select Board Types

**Component:** `BoardMultiSelect.tsx`

**Replace:** Current single-select button list

**Features:**
- Toggle buttons that allow multiple selection
- Visual styling: filled when active (accent color)
- "All" button deselects everything (no filter)
- URL encoding: `board=AI,UAI` (comma-separated)
- Server: accept comma-separated board values

---

### 2.5 — Interactive Star Rating Picker

**Component:** `StarRatingPicker.tsx`

**Replace:** Current text buttons ("★★★", "★★★★", "★★★★★")

**Features:**
- Visual star icons (filled/outline)
- Click = "X stars and above" (current behavior preserved)
- Hover effect shows preview
- Active state: all stars up to selected are filled
- "Any" option to clear
- Accessible: proper ARIA slider/radiogroup role

---

### 2.6 — Nights Range as Visual Buttons

**Component:** `NightsFilter.tsx`

**Replace:** Current `<select>` dropdown

**Features:**
- Horizontal button group (same style as board/stars)
- Options: "Any", "1–6 nights", "7–9", "10–13", "14+"
- Active state with accent color fill
- Optionally: dual-handle slider for custom range (advanced)
- Mobile: horizontal scroll if doesn't fit

---

### 2.7 — Faceted Filter Counts

**Enhancement** across all filter options

**How it works:**
- After each search completes, server returns facet counts in the response
- Each filter option shows `(count)` of how many results match if that option were selected
- Options with 0 results are dimmed but still clickable (with tooltip: "No results")
- Prevents user frustration from selecting impossible combinations

**Server change required:** Add `facets` field to `ToursResult`:
```typescript
interface ToursResult {
  // ... existing fields ...
  facets?: {
    destinations: { slug: string; count: number }[];
    board: { value: string; count: number }[];
    stars: { value: string; count: number }[];
    nights: { value: string; count: number }[];
    transport: { value: string; count: number }[];
  };
}
```

**Implementation approach:**
- Compute facets server-side during the main search query (one extra query per facet group, or use SQL `GROUP BY` on the full result set before pagination)
- Only return facets when `includeFacets=true` query param is set (avoids extra computation when not needed)
- Cache facet results alongside main results in `publicSearchCache`

---

### 2.8 — Recent Searches & Quick Re-apply

**Component:** `RecentSearches.tsx`

**Storage:** localStorage `skytravel:recentSearches`

**Behavior:**
- After successful search (results > 0), save filter combination
- Show max 5 recent searches below the hero form (when no filters active)
- Each item shows: destination/query + date range + result count
- Click to re-apply all filters from that search
- "Clear history" button
- Respects privacy: no tracking, purely client-side

---

### 2.9 — Instant Filter Application (Sidebar)

**Change:** Sidebar filters apply immediately without form submit

**Current behavior:** Sidebar filters (destination, price, nights, stars, board) already update URL immediately → triggers refetch. This is correct.

**Improvement needed:**
- Add debounce (300ms) for rapid consecutive filter changes
- Show "Updating..." indicator while debounce is pending
- Animate results opacity down during load (already partially done)
- Cancel in-flight request when filter changes again

---

### 2.10 — Transport Filter Enhancement

**Component:** `TransportFilter.tsx`

**Replace:** Current `<select>` in hero form + no sidebar option

**Features:**
- Add transport to sidebar filters (currently only in hero form)
- Visual icon buttons: ✈️ Plane, 🚌 Bus, 🚗 Car
- Single-select toggle (current behavior)
- Show in sidebar as icon-only buttons with tooltip labels

---

### 2.11 — Smart Defaults & Popular Presets Enhancement

**Improve current presets:**
- Add "Cheapest This Month" preset
- Add "Beach Holiday" preset (board: AI, transport: plane)
- Presets become visually richer: icon + label + subtitle
- Presets based on analytics (if available): "Trending: Turkey from 12,900 Kč"

---

## Server-Side Changes Required

| Change | File | Description |
|--------|------|-------------|
| Multi-destination support | `providerSearchPublic.ts` | Parse comma-separated `destinationSlug`, apply OR logic |
| Multi-board support | `providerSearchPublic.ts` | Parse comma-separated `board` param |
| Flexible dates | `providerSearchPublic.ts` | Accept `dateFlexDays` param, expand date range |
| Faceted counts | `providerSearchPublic.ts` | Compute facets when `includeFacets=true` |
| Facet computation | `alexandriaProvider.ts`, `orextravelProvider.ts` | Add facet aggregation queries |
| Validation update | `providerSearchPublic.ts` | Update regex/validation for new multi-value params |

---

## URL Parameter Changes

| Param | Current | New | Breaking? |
|-------|---------|-----|-----------|
| `destinationSlug` | Single value | Comma-separated | No (single still works) |
| `board` | Single value | Comma-separated | No (single still works) |
| `dateFlexDays` | N/A | New optional `1-7` | No |
| `includeFacets` | N/A | New optional boolean | No |

---

## Acceptance Criteria

- [ ] Autocomplete shows suggestions after 2 characters with ≤200ms delay
- [ ] Date picker shows calendar with range selection and flexible dates toggle
- [ ] Multiple destinations can be selected simultaneously
- [ ] Multiple board types can be selected simultaneously
- [ ] Star rating uses visual star icons with proper a11y
- [ ] Nights filter uses button group instead of dropdown
- [ ] Faceted counts display on all filter options after search
- [ ] Recent searches saved and displayed (max 5)
- [ ] All new filter interactions update URL correctly
- [ ] All new URL params are shareable (reload preserves state)
- [ ] Server validates new multi-value params safely
- [ ] Mobile experience works for all new components
- [ ] Keyboard navigation works for autocomplete and date picker
- [ ] No visual regression in existing filter behavior

---

## Component Dependencies

```
SearchAutocomplete ← destinations (from useBootstrap)
DateRangePicker ← standalone (no external deps)
DestinationMultiSelect ← destinations + facets
BoardMultiSelect ← BOARD_OPTIONS + facets
StarRatingPicker ← facets
NightsFilter ← NIGHTS_OPTIONS + facets
TransportFilter ← TRANSPORT_OPTIONS + facets
RecentSearches ← localStorage
```

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/components/SearchAutocomplete.tsx` |
| Create | `client/src/features/search/components/DateRangePicker.tsx` |
| Create | `client/src/features/search/components/DestinationMultiSelect.tsx` |
| Create | `client/src/features/search/components/BoardMultiSelect.tsx` |
| Create | `client/src/features/search/components/StarRatingPicker.tsx` |
| Create | `client/src/features/search/components/NightsFilter.tsx` |
| Create | `client/src/features/search/components/TransportFilter.tsx` |
| Create | `client/src/features/search/components/RecentSearches.tsx` |
| Create | `client/src/features/search/hooks/useRecentSearches.ts` |
| Modify | `client/src/features/search/components/SearchFilters.tsx` |
| Modify | `client/src/features/search/components/SearchHero.tsx` |
| Modify | `server/src/routes/providerSearchPublic.ts` (multi-value + facets) |
| Modify | `server/src/providers/alexandriaProvider.ts` (facets query) |
| Modify | `client/src/types/providers.ts` (ToursResult.facets) |

---

## Estimated Effort

- Autocomplete: ~4 hours
- Date range picker: ~6 hours
- Multi-select components: ~4 hours
- Faceted counts (server + client): ~6 hours
- Recent searches: ~2 hours
- Transport/stars/nights visual upgrade: ~3 hours
- Server-side multi-value support: ~3 hours
- Testing: ~4 hours
- **Total: ~32 hours**

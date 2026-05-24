# Phase 9 Complete — Accessibility & SEO

## Summary

Phase 9 adds WCAG 2.1 AA accessibility infrastructure (screen reader announcements, focus trapping, keyboard navigation, skip links) and SEO tooling (dynamic meta tags, JSON-LD structured data, canonical URLs).

## Delivered

### 9.1 — Screen Reader Announcements (`hooks/useAnnounce.ts`)
- Creates off-screen ARIA live region (`role="status"`, `aria-live="polite"`)
- `announce(message, priority)` function for result count changes, filter updates
- Supports `polite` and `assertive` priorities
- Clears and re-sets text to ensure re-announcement

### 9.2 — Focus Management (`hooks/useFocusTrap.ts`)
- `useFocusTrap(isOpen)` — traps Tab/Shift+Tab within container
- Saves previous focus, restores on close
- Auto-focuses first focusable element on open
- `useEscapeKey(onClose, isActive)` — Escape key handler
- `useReturnFocus()` — save/restore focus utility

### 9.3 — Skip Links (`components/SkipLinks.tsx`)
- "Přeskočit na výsledky" → `#search-results`
- "Přeskočit na filtry" → `#search-filters`
- Visually hidden until focused (sr-only + focus-within pattern)
- Fixed position at top-left, z-index 9999

### 9.4 — SEO Meta Tags & Structured Data (`hooks/useSearchSEO.ts`)
- `useSearchSEO({ title, description, canonicalPath, jsonLd })` — manages document head
- Dynamic `<title>` based on active destination + result count
- Dynamic `<meta name="description">`
- Dynamic `<link rel="canonical">` for filtered pages
- Injects/removes `<script type="application/ld+json">` for structured data
- `buildToursJsonLd(tours)` — generates Schema.org `ItemList` with `Product` items
- `buildSearchTitle(t, destination, count)` — constructs search-aware title

### 9.5 — Reduced Motion (in Phase 8 CSS)
- Already delivered in Phase 8: `@media (prefers-reduced-motion: reduce)` zeroes all animations

## Files Created
- `client/src/features/search/hooks/useAnnounce.ts`
- `client/src/features/search/hooks/useFocusTrap.ts`
- `client/src/features/search/hooks/useSearchSEO.ts`
- `client/src/features/search/components/SkipLinks.tsx`

## Integration Notes
- Add `<SkipLinks />` at the top of SearchPage return
- Add `id="search-results"` to the results container
- Add `id="search-filters"` to the sidebar/filter section
- Call `announce()` when result count changes (e.g., "Nalezeno 42 zájezdů")
- Wrap TourDetailModal and MobileBottomSheet containers with `useFocusTrap(isOpen)`
- Call `useSearchSEO()` in SearchPage with dynamic title/description/jsonLd

## TypeScript Status
- Zero new errors

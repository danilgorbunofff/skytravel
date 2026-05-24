# Phase 4 Complete — Tour Detail Modal Overhaul

## Summary

Phase 4 transformed the tour detail modal from a basic info panel into a rich, conversion-optimized experience with a full-featured photo gallery, structured sections, offer comparison table, enhanced inquiry form, related tours, and deep linking support.

## Delivered

### 4.1 — TourGallery + Lightbox (`TourGallery.tsx`)
- Main image with click-to-open lightbox
- Prev/next navigation arrows
- Photo counter badge ("3 / 15")
- Scrollable thumbnail strip (max 8 + "+N" overflow button)
- **Lightbox mode:** Full-screen overlay, keyboard navigation (arrows + Escape), swipe gesture support (touch start/end), click outside to close

### 4.2 — TourPriceCard (`TourPriceCard.tsx`)
- Prominent price display with green checkmark
- Original price strikethrough + savings amount
- Discount percentage badge (≥5% threshold)
- Total price for group (when adults > 1)
- Primary CTA "Nezávazná poptávka" scrolls to inquiry form
- Secondary "Nebo zavolejte" phone link
- Provider label

### 4.3 — TourDetailTabs (`TourDetailTabs.tsx`)
- Accessible tabbed interface (ARIA roles: tablist, tab, tabpanel)
- Tabs: Popis (if description available), Termíny & Ceny, Umístění
- Description tab hidden when no description data
- Location tab with placeholder (ready for future map integration)

### 4.4 — OfferComparisonTable (`OfferComparisonTable.tsx`)
- Sortable columns: Date, Nights, Board, Room, Price
- "Nejlevnější" (cheapest) badge on best price row
- Selected row highlight
- Max 10 initially shown + "Zobrazit všech X termínů" expand button
- Loading skeleton with shimmer animation
- Error and empty states

### 4.5 — TourInquiryForm (`TourInquiryForm.tsx`)
- Fields: email (required), phone (optional), message textarea (optional)
- GDPR consent checkbox with link
- Auto-fill email from localStorage on return visits
- Success state: animated checkmark + "odpovíme do 24 hodin" timeline
- Error state with retry
- Loading spinner on submit button
- "Nebo zavolejte" fallback

### 4.6 — RelatedTours (`RelatedTours.tsx`)
- Grid of up to 4 related tours (from current search results)
- Compact card: image + destination + title + price
- Click navigates within the same modal (via `onNavigateToTour`)

### 4.7 — Deep Linking
- **URL param:** `?tourId=providerId-externalId`
- On page load: detects param, fetches tour via `GET /api/search/tour/:providerId/:externalId`, opens modal
- URL updates via `history.replaceState` when modal opens/closes
- Shareable links to specific tour modals

### 4.8 — Mobile Optimization (CSS)
- Full-screen modal on mobile (no border radius, 100vh)
- Gallery fills width
- Offer table responsive (4-column grid, hides room column)
- Related tours 2-column grid

### 4.9 — TourDetailModal Composition (`TourDetailModal.tsx`)
- Composes all sub-components: Gallery → Header → Facts → PriceCard → Tabs → InquiryForm → RelatedTours
- Focus trap, Escape to close, body scroll lock
- Animate-in transition (opacity + translateY)
- Backdrop blur
- Selected offer state drives all sections

## Server Changes
- `GET /api/search/tour/:providerId/:externalId` — new endpoint in `providerSearchPublic.ts`
  - Fetches tours via provider's `fetchTours()` with query, finds by externalId

## Client API Changes
- `fetchPublicSingleTour(providerId, externalId)` added to `publicProviders.ts`
- `createInquiry` type extended with optional `phone` and `message` fields

## Files Created
- `client/src/features/search/components/TourGallery.tsx`
- `client/src/features/search/components/TourPriceCard.tsx`
- `client/src/features/search/components/TourDetailTabs.tsx`
- `client/src/features/search/components/OfferComparisonTable.tsx`
- `client/src/features/search/components/TourInquiryForm.tsx`
- `client/src/features/search/components/RelatedTours.tsx`
- `client/src/features/search/components/TourDetailModal.tsx`

## Files Modified
- `client/src/pages/SearchPage.tsx` — imports new modal, deep linking logic, URL sync
- `client/src/features/search/components/index.ts` — barrel exports for all new components
- `client/src/api/publicProviders.ts` — added `fetchPublicSingleTour`
- `client/src/api.ts` — extended `createInquiry` type
- `client/src/site.css` — ~500 lines appended for all Phase 4 components
- `server/src/routes/providerSearchPublic.ts` — single tour endpoint

## TypeScript Status
- Zero new errors on both client and server (excluding pre-existing module type issues: pino, express-mysql-session, vitest, testing-library)

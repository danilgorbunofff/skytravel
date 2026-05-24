# Phase 4: Tour Detail Modal Overhaul

> **Goal:** Transform the tour detail modal into a rich, conversion-optimized experience with full gallery, structured info sections, offer comparison, and streamlined inquiry flow.

---

## Problem Statement

Current modal issues:
1. **Basic photo carousel** — simple left/right navigation, no zoom, no fullscreen
2. **Limited info layout** — info stacked vertically, no tabs/sections for organization
3. **Offers as a flat list** — no comparison between offers, just a scrollable list
4. **No urgency indicators** — no "only 3 seats left" or "price rising" cues
5. **Inquiry form is minimal** — just email + consent checkbox, no phone, no message
6. **No related tours** — user can only see the one tour they clicked
7. **No deep linking** — can't share a link that opens a specific tour modal
8. **No hotel information** — stars shown but no hotel description, amenities, or location
9. **Mobile modal isn't optimized** — same layout as desktop, no swipe navigation
10. **No loading skeleton** — blank space while offer group loads

---

## Deliverables

### 4.1 — Full-Screen Photo Gallery

**Component:** `TourGallery.tsx`

**Features:**
- **Grid view:** Main large image + thumbnail strip (existing, improve)
- **Lightbox mode:** Click main image → full-screen overlay with black background
- **Zoom:** Pinch-to-zoom on mobile, scroll-to-zoom on desktop
- **Swipe navigation:** Left/right swipe in lightbox (touch + mouse drag)
- **Keyboard:** Arrow keys, Escape to close lightbox
- **Counter:** "3 / 15" indicator
- **Thumbnails:** Scrollable strip below main image, highlight active
- **Lazy loading:** Only load visible + adjacent 2 photos
- **Loading state:** Blur placeholder while high-res loads

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│           [Main Photo]                  │
│              (click for lightbox)        │
│                                         │
│    ← [prev]              [next] →       │
│                                         │
│    3 / 15                               │
│                                         │
├─[thumb]─[thumb]─[ACTIVE]─[thumb]─[+7]──┤
└─────────────────────────────────────────┘
```

---

### 4.2 — Structured Information Sections

**Replace:** Current single scrollable column

**New layout with visual sections:**

```
┌─────────────────────────────────────────────┐
│ [Gallery Section]                           │
├─────────────────────────────────────────────┤
│                                             │
│  HOTEL NAME              ★★★★★             │
│  Destination, Country                       │
│  [Alexandria badge]                         │
│                                             │
│  ┌── Price Card ────────────────────────┐   │
│  │  12 900 Kč / osoba                  │   │
│  │  ̶1̶5̶ ̶9̶0̶0̶ ̶K̶č̶   Ušetříte 3 000 Kč   │   │
│  │  [Nezávazná poptávka →]             │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── Key Facts ─────────────────────────┐   │
│  │ 📅 15.6. – 22.6.2026 (7 nocí)      │   │
│  │ ✈️  Letecky                          │   │
│  │ 🍽  All Inclusive                    │   │
│  │ 🛏  Dvojlůžkový pokoj               │   │
│  │ 👤  2 dospělí                        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── Tabs ──────────────────────────────┐   │
│  │ [Popis] [Termíny] [Umístění]        │   │
│  ├──────────────────────────────────────┤   │
│  │ (active tab content)                 │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── Inquiry Form ──────────────────────┐   │
│  │  ...                                 │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌── Related Tours ─────────────────────┐   │
│  │  [card] [card] [card]               │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

### 4.3 — Tabbed Content Sections

**Component:** `TourDetailTabs.tsx`

**Tabs:**

1. **Popis (Description)**
   - Tour description text (from `tour.description`)
   - Hotel amenities (if available)
   - Important notes

2. **Termíny & Ceny (Dates & Prices)**
   - Full offer comparison table
   - Sortable columns: Date, Nights, Board, Room, Price
   - Highlight cheapest offer
   - "Show price calendar" button (future Phase 10)

3. **Umístění (Location)**
   - Static map image (Google Static Maps or OpenStreetMap tile)
   - Destination description (from destination store)
   - Distance to beach/airport if available
   - Link to full map view

**Implementation:**
- Accessible tab panel with ARIA roles
- Keyboard: arrow left/right to switch tabs
- URL hash for deep link: `#tab=dates`
- Mobile: tabs stack as accordion sections

---

### 4.4 — Offer Comparison Table (within Dates Tab)

**Component:** `OfferComparisonTable.tsx`

**Replace:** Current flat offer list

**Features:**
- Sortable table columns: departure date, return date, nights, board, room type, price
- Default sort: date ascending (current behavior)
- Click column header to sort
- Highlight row on hover
- "Best price" badge on cheapest offer
- "Earliest" badge on soonest departure
- Click row → selects that offer (updates price card + gallery)
- Sticky header when scrolling long lists
- Show max 10 initially, "Show all X offers" button

**Table layout:**
```
┌──────────┬──────────┬──────┬────────────┬──────────┬──────────┐
│ Odlet    │ Přílet   │ Nocí │ Strava     │ Pokoj    │ Cena     │
├──────────┼──────────┼──────┼────────────┼──────────┼──────────┤
│ 15.6.    │ 22.6.    │ 7    │ All Incl.  │ 2-lůžko  │ 12 900   │ ← BEST PRICE
│ 22.6.    │ 29.6.    │ 7    │ All Incl.  │ 2-lůžko  │ 13 400   │
│ 29.6.    │ 6.7.     │ 7    │ Polopenze  │ 2-lůžko  │ 14 200   │
└──────────┴──────────┴──────┴────────────┴──────────┴──────────┘
```

---

### 4.5 — Enhanced Price Card

**Component:** `TourPriceCard.tsx`

**Features:**
- Prominent price display (large font)
- Original price with strikethrough (if discounted)
- Savings amount: "Ušetříte 3 000 Kč"
- Discount percentage badge
- Per-person price + total price for group
- "Price includes" note (flight, hotel, transfers — if data available)
- Primary CTA button: "Nezávazná poptávka" (non-binding inquiry)
- Secondary CTA: "Zavolat" (call link)
- Urgency indicator: "Posledních 5 míst" (if data available from provider)

---

### 4.6 — Enhanced Inquiry Form

**Component:** `TourInquiryForm.tsx`

**Improve current form:**

**Fields:**
- Email (required) — existing
- Phone (optional, new) — for callback
- Message (optional, new) — custom notes
- Preferred dates (auto-filled from selected offer)
- Number of people (auto-filled from search)
- GDPR consent checkbox (required) — existing

**UX improvements:**
- Success state: animated checkmark + "We'll contact you within 24h"
- Error state: clear error message + retry button
- Auto-fill email from localStorage (if user previously submitted)
- "Or call us directly" with phone link below form
- Loading state: submit button shows spinner

**After submission:**
- Show success message with timeline ("odpovíme do 24 hodin")
- Offer to save search as price alert
- Don't close modal (user might want to continue browsing offers)

---

### 4.7 — Related Tours Section

**Component:** `RelatedTours.tsx`

**Shows 3-4 related tours at bottom of modal:**
- Same destination, different hotels
- Same dates, different destinations  
- Similar price range

**Implementation:**
- Use existing search results to find related tours (client-side filtering)
- Show as small horizontal card row
- Click opens that tour in the same modal (replaces content)
- "Back to previous" button if navigated within modal

---

### 4.8 — Deep Linking to Tour

**Feature:** Share a link that opens a specific tour detail modal on page load.

**URL format:** `/search?...&tourId=alexandria-ABC123`

**Behavior:**
1. SearchPage detects `tourId` param
2. Fetches tour detail by ID: `GET /api/search/tour/:providerId/:externalId`
3. Opens TourDetailModal with that tour
4. URL updates when modal opens/closes (pushState, not full navigation)

**Server endpoint (new):**
```
GET /api/search/tour/:providerId/:externalId
Returns: UnifiedTour (full detail)
```

---

### 4.9 — Loading States

**Offer group loading:**
- Show 3 skeleton rows in the offers table
- Shimmer animation
- "Načítáme dostupné termíny..." text

**Photo loading:**
- Blur placeholder (LQIP) while high-res loads
- Fade-in when loaded

**Tour detail fetch (deep link):**
- Full modal skeleton with all sections shimmed
- Matches final layout proportions

---

### 4.10 — Mobile Modal Optimization

**On mobile (< 768px):**
- Modal becomes full-screen bottom sheet (slides up from bottom)
- Swipe down to close (drag handle at top)
- Gallery becomes horizontal swipeable carousel
- Tabs become accordion sections (all expanded by default)
- Price card sticks to bottom of screen (sticky CTA)
- Inquiry form moves to a separate "step" (tap CTA → scroll to form)

---

## Component API

```typescript
interface TourDetailModalProps {
  tour: UnifiedTour;
  providerLabel: string;
  offers: UnifiedTour[];
  loading: boolean;
  error?: string;
  relatedTours: UnifiedTour[];
  onClose: () => void;
  onNavigateToTour: (tour: UnifiedTour) => void;
}
```

---

## Server Changes

| Change | File | Description |
|--------|------|-------------|
| Single tour endpoint | `providerSearchPublic.ts` | `GET /api/search/tour/:providerId/:externalId` |
| Include hotel description | Provider responses | Ensure `description` field is populated |

---

## Acceptance Criteria

- [ ] Gallery supports: navigation, lightbox, zoom, swipe, keyboard
- [ ] Tabs work: Description, Dates & Prices, Location
- [ ] Offer table is sortable by date and price
- [ ] "Best price" badge highlights cheapest offer
- [ ] Inquiry form includes email, optional phone, optional message
- [ ] Success state shows confirmation with timeline
- [ ] Related tours show at bottom of modal
- [ ] Deep link `?tourId=X` opens modal on page load
- [ ] Mobile: full-screen sheet with swipe-to-close
- [ ] Mobile: sticky CTA at bottom
- [ ] Loading skeletons for all async sections
- [ ] Focus trapped in modal, Escape closes
- [ ] No scroll on body while modal open
- [ ] Back button closes modal (history.pushState)

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Rewrite | `client/src/features/search/components/TourDetailModal.tsx` |
| Create | `client/src/features/search/components/TourGallery.tsx` |
| Create | `client/src/features/search/components/TourDetailTabs.tsx` |
| Create | `client/src/features/search/components/OfferComparisonTable.tsx` |
| Create | `client/src/features/search/components/TourPriceCard.tsx` |
| Create | `client/src/features/search/components/TourInquiryForm.tsx` |
| Create | `client/src/features/search/components/RelatedTours.tsx` |
| Create | `client/src/features/search/components/TourGalleryLightbox.tsx` |
| Modify | `client/src/api/publicProviders.ts` (single tour fetch) |
| Modify | `server/src/routes/providerSearchPublic.ts` (single tour endpoint) |
| Modify | `client/src/features/search/hooks/useOfferGroups.ts` (deep link support) |

---

## Estimated Effort

- Gallery + lightbox: ~6 hours
- Tabbed layout + content: ~4 hours
- Offer comparison table: ~4 hours
- Enhanced price card: ~2 hours
- Inquiry form upgrade: ~3 hours
- Related tours: ~3 hours
- Deep linking: ~3 hours
- Mobile sheet optimization: ~4 hours
- Loading states: ~2 hours
- Testing: ~4 hours
- **Total: ~35 hours**

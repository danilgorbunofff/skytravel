# Phase 3: Tour Cards & Results Grid

> **Goal:** Redesign tour cards to maximize information density, visual appeal, and conversion, while improving the grid/list views and loading experience.

---

## Problem Statement

Current tour card issues:
1. **Low information density** — only shows title, destination, and price; user must open modal for dates, nights, board, stars, transport
2. **No discount/savings indication** — `originalPrice` field exists but is never displayed
3. **No provider identification** — user doesn't know which provider (Alexandria/Orextravel) a tour comes from
4. **No offers count on card** — grouped tours (offerGroupKey) don't indicate "12 dates available"
5. **Basic image handling** — fallback logic works but no LQIP, no skeleton shimmer during load
6. **List view is minimal** — same card layout stretched horizontally, no additional columns
7. **No entry animations** — cards appear instantly, no staggered reveal
8. **No hover preview** — desktop users must click to see any detail
9. **Grid is fixed** — always 3 columns desktop, no adaptive sizing

---

## Deliverables

### 3.1 — Enhanced Tour Card (Grid Mode)

**Component:** `PublicTourCard.tsx` (redesigned)

**New card layout:**

```
┌─────────────────────────────────┐
│  [Image]                    ♥   │
│                                 │
│  ┌─── Badge: "Last Minute" ──┐  │  ← conditional
│  └────────────────────────────┘  │
│  [Provider badge: Alexandria]    │
│                                 │
├─────────────────────────────────┤
│  DESTINATION NAME               │
│  Hotel/Tour Title               │
│                                 │
│  ✈ Plane  ·  7 nocí  ·  ★★★★  │  ← transport, nights, stars
│  🍽 All Inclusive               │  ← board type
│                                 │
│  ┌── Dates ──────────────────┐  │
│  │ 15.6. – 22.6.2026        │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌── Price ──────────────────┐  │
│  │ ██  12 900 Kč / os.      │  │  ← prominent
│  │     ̶1̶5̶ ̶9̶0̶0̶ ̶K̶č̶  -19%     │  │  ← strikethrough + discount %
│  └───────────────────────────┘  │
│                                 │
│  [12 termínů k dispozici →]     │  ← offers count indicator
└─────────────────────────────────┘
```

**New data displayed on card (no modal needed):**
- Transport icon + label
- Nights count
- Star rating (visual stars)
- Board type badge
- Date range
- Price with original price strikethrough
- Discount percentage badge
- Provider badge (small, top-right of image or below)
- Offers count ("12 termínů")
- Favorite heart (existing)

---

### 3.2 — Enhanced Tour Card (List Mode)

**New list layout:**

```
┌───────┬──────────────────────────────────────────────────────────────────┐
│       │  DESTINATION  ·  Hotel Name              ★★★★  Alexandria      │
│ Image │  ✈ Letecky  ·  7 nocí  ·  All Inclusive  ·  15.6.–22.6.2026   │
│       │                                                                 │
│       │  12 900 Kč /os.   ̶1̶5̶ ̶9̶0̶0̶  (-19%)   [12 termínů]    ♥  [→]  │
└───────┴──────────────────────────────────────────────────────────────────┘
```

**Features:**
- Compact horizontal row
- All key info visible in one line
- Price prominently placed on the right
- Action buttons: favorite, detail, compare (add to compare checkbox)
- Smaller image (thumbnail-sized)
- Hover row highlight

---

### 3.3 — Discount & Savings Display

**Logic:**
```typescript
function getDiscount(tour: UnifiedTour): { amount: number; percent: number } | null {
  if (!tour.originalPrice || tour.originalPrice <= tour.price) return null;
  const amount = tour.originalPrice - tour.price;
  const percent = Math.round((amount / tour.originalPrice) * 100);
  if (percent < 5) return null; // Don't show trivial discounts
  return { amount, percent };
}
```

**Visual:**
- Red/orange badge on image: `-19%`
- Original price with strikethrough next to current price
- Only show when discount ≥ 5%

---

### 3.4 — Provider Badge

**Component:** `ProviderBadge.tsx`

**Design:**
- Small pill badge (e.g., "Alexandria", "Orextravel")
- Provider-specific color accent
- Positioned in card body, below image
- On hover: "Zdroj: Alexandria" tooltip

---

### 3.5 — Offers Count Indicator

**On card:** When `tour.offersCount > 1`:
- Show text: "12 termínů k dispozici →"
- Subtle animation (pulsing dot or small icon)
- Indicates clicking will show a date picker / offer list

---

### 3.6 — Image Improvements

**LQIP (Low Quality Image Placeholder):**
- Use CSS `background-color` based on dominant color (computed from destination)
- Apply blur-up animation when full image loads
- Use `IntersectionObserver` for true lazy loading (not just `loading="lazy"`)

**srcSet optimization:**
- Generate multiple sizes: 320w, 640w, 960w
- Proper `sizes` attribute based on grid column count
- WebP format detection (server already serves these via CDN?)

**Error handling:**
- Keep existing fallback to destination-based placeholder
- Add retry logic (1 retry after 2s timeout)

---

### 3.7 — Responsive Grid System

**Desktop breakpoints:**
- `≥1400px`: 4 columns
- `≥1024px`: 3 columns
- `≥768px`: 2 columns
- `<768px`: 1 column (full width)

**Implementation:** CSS Grid with `auto-fill` + `minmax`:
```css
.tour-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

---

### 3.8 — Card Hover States (Desktop)

**On hover:**
- Subtle upward transform (2px lift)
- Box shadow increase
- Image zoom (scale 1.03)
- Quick-action buttons revealed (Compare, Share)
- Transition: 200ms ease-out

**On focus (keyboard):**
- Same visual treatment as hover
- Clear focus ring (outline)

---

### 3.9 — Staggered Entry Animations

**On initial load and page change:**
- Cards fade in with upward slide
- Staggered: each card delays by 50ms * index (max 300ms total)
- Use CSS `@keyframes` + `animation-delay`
- Respect `prefers-reduced-motion`

```css
@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tour-card {
  animation: cardEntrance 300ms ease-out both;
  animation-delay: calc(var(--card-index) * 50ms);
}
```

---

### 3.10 — Enhanced Skeleton Cards

**Replace** current basic skeleton with layout-accurate placeholders:

```
┌─────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← shimmer image area
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────┤
│  ░░░░░░░░░░░░░ (short)         │  ← destination
│  ░░░░░░░░░░░░░░░░░░░ (medium)  │  ← title
│  ░░░░░ · ░░░ · ░░░░ (icons)    │  ← meta row
│  ░░░░░░░░░ (price)              │
└─────────────────────────────────┘
```

**Features:**
- Shimmer animation (gradient moving left-to-right)
- Matches actual card proportions exactly
- 6 skeleton cards shown during initial load
- Fades out when real cards appear

---

### 3.11 — Quick View on Hover (Desktop Only)

**Component:** `TourQuickView.tsx`

**Behavior:**
- On hover for 500ms+, show tooltip-like popup with extra details
- Shows: description preview (first 100 chars), all photos count, full price breakdown
- Positioned above/below card depending on viewport position
- Disappears on mouseout
- Never shown on mobile/touch devices
- Optional (can be enabled/disabled in later iterations)

---

### 3.12 — "Add to Compare" on Card

**Enhancement:**
- Checkbox in top-left corner of card (opposite to heart)
- Visible on hover (desktop) or always visible (mobile list view)
- When checked, card gets colored border
- Compare tray at bottom updates count

---

## Component API

```typescript
interface PublicTourCardProps {
  tour: UnifiedTour;
  viewMode: "grid" | "list";
  isFavorite: boolean;
  isCompared: boolean;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
  onOpenDetail: () => void;
  providerLabel: string;
  animationIndex: number; // for stagger delay
}
```

---

## Acceptance Criteria

- [ ] Grid card shows: destination, title, price, original price (if different), discount %, transport, nights, stars, board, dates, provider, offers count
- [ ] List card shows all above in a compact horizontal layout
- [ ] Discount badge appears only when ≥ 5% difference
- [ ] Provider badge displays correct provider name
- [ ] Cards animate in with staggered delay on page load
- [ ] Hover state: elevation + shadow + image zoom on desktop
- [ ] Skeleton cards match actual card proportions with shimmer
- [ ] Grid adapts: 4 cols → 3 → 2 → 1 across breakpoints
- [ ] Images lazy load with LQIP blur-up effect
- [ ] Compare checkbox visible on hover, persists selection
- [ ] All interactions have proper ARIA labels
- [ ] `prefers-reduced-motion` disables animations
- [ ] No layout shift (CLS) when cards load

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Rewrite | `client/src/features/search/components/PublicTourCard.tsx` |
| Create | `client/src/features/search/components/TourCardSkeleton.tsx` |
| Create | `client/src/features/search/components/ProviderBadge.tsx` |
| Create | `client/src/features/search/components/DiscountBadge.tsx` |
| Create | `client/src/features/search/components/TourQuickView.tsx` |
| Create | `client/src/features/search/components/TourGrid.tsx` |
| Create | `client/src/features/search/components/TourList.tsx` |
| Modify | `client/src/features/search/components/SearchResults.tsx` |
| Modify | `client/src/lib/images.ts` (LQIP support) |

---

## Estimated Effort

- Card redesign (grid + list): ~6 hours
- Discount/provider/offers indicators: ~3 hours
- Image improvements (LQIP, srcSet): ~4 hours
- Responsive grid system: ~2 hours
- Animations (stagger, hover, skeleton): ~4 hours
- Quick view (optional): ~3 hours
- Compare integration: ~2 hours
- Testing: ~3 hours
- **Total: ~27 hours**

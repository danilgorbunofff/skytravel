# Phase 7: Mobile Experience Overhaul

> **Goal:** Redesign the mobile search experience from scratch using mobile-first patterns — bottom sheets, swipe gestures, thumb-zone optimization, and app-like interactions.

---

## Problem Statement

Current mobile issues:
1. **Filter drawer is a basic overlay** — no drag gesture, no smooth animation, feels like a popup not a native element
2. **Cards are desktop-first** — same layout squished into mobile viewport
3. **No swipe gestures** — tap-only interactions feel dated
4. **No pull-to-refresh** — common mobile expectation missing
5. **Filter FAB lacks feedback** — just a button, no haptic, no animation
6. **Touch targets too small** — some buttons are < 44px
7. **No horizontal scroll patterns** — destinations and presets use vertical stacking
8. **Pagination via "Load more" button** — works but has no loading state UX
9. **Header takes too much space** — reduces visible content area
10. **No app-like transitions** — page changes feel like web navigation, not app navigation

---

## Deliverables

### 7.1 — Bottom Sheet Filter Drawer

**Replace:** Current full-screen overlay (`mobile-filter-drawer`)

**Component:** `MobileFilterBottomSheet.tsx`

**Features:**
- Draggable from top handle (drag up/down)
- Three snap points: collapsed (hidden), half-screen, full-screen
- Spring physics animation (natural feel)
- Backdrop dimming proportional to sheet height
- Close on drag below threshold + release
- Close on backdrop tap
- Body scroll lock when open
- Content scroll within sheet (independent of drag)

**Implementation approach:**
```typescript
// Touch gesture tracking
const [translateY, setTranslateY] = useState(SHEET_CLOSED);
const startY = useRef(0);
const currentY = useRef(0);

function onTouchStart(e: TouchEvent) {
  startY.current = e.touches[0].clientY;
}

function onTouchMove(e: TouchEvent) {
  const deltaY = e.touches[0].clientY - startY.current;
  setTranslateY(Math.max(0, SHEET_OPEN + deltaY));
}

function onTouchEnd() {
  // Snap to nearest point
  const velocity = calculateVelocity();
  const nearest = findNearestSnap(translateY, velocity);
  animateToSnap(nearest);
}
```

**Snap points:**
- `0` → full screen (filters visible)
- `50vh` → half screen (popular filters visible, scroll for more)
- `100vh` → closed (hidden below viewport)

---

### 7.2 — Swipe Gestures on Tour Cards

**Feature:** Horizontal swipe on cards reveals quick actions.

**Left swipe reveals:** Save (heart) button — full-width slide
**Right swipe reveals:** Compare (add) button — full-width slide

**Implementation:**
```typescript
// Per-card swipe state
function useSwipeAction(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  
  function onTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  
  function onTouchMove(e: TouchEvent) {
    const deltaX = e.touches[0].clientX - startX.current;
    // Only allow horizontal swipe if delta > vertical delta
    setOffsetX(deltaX);
  }
  
  function onTouchEnd() {
    if (offsetX < -80) onSwipeLeft(); // threshold
    else if (offsetX > 80) onSwipeRight();
    setOffsetX(0); // spring back
  }
}
```

**Visual:**
- Card slides to reveal colored action area behind
- Left swipe: red background with heart icon
- Right swipe: blue background with compare icon
- Auto-spring back after action triggers

---

### 7.3 — Pull-to-Refresh

**Feature:** Pull down from top of results to refresh search.

**Component:** `PullToRefresh.tsx`

**Behavior:**
- Pull down from results scroll top
- Show pull indicator (arrow rotating to spinner)
- At threshold (60px): trigger refresh
- Spinner while loading
- Results update when done
- Haptic feedback on threshold cross (if supported)

```typescript
function usePullToRefresh(onRefresh: () => Promise<void>, containerRef: RefObject<HTMLElement>) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Only activate when scrolled to top
  // Track touch delta
  // Trigger at 60px threshold
}
```

---

### 7.4 — Thumb-Zone Optimized Layout

**Principle:** Primary actions in bottom 40% of screen where thumbs naturally reach.

**Changes:**
- **Move sort controls to bottom** — floating pill below results
- **Filter FAB at bottom-right** — already there, but enlarge to 56px
- **Sticky bottom CTA** — "Zobrazit X výsledků" always visible at bottom
- **Search input at top** — acceptable (users reach up for search)
- **Heart/Compare on bottom half of card** — not top

**Layout zones (mobile):**
```
┌─────────────────────────┐ ← easy reach (top thumb)
│  Search input            │
├─────────────────────────┤
│                         │
│  Results (scrollable)   │ ← scroll zone
│                         │
│                         │
│                         │
├─────────────────────────┤ ← easy reach (bottom thumb)
│  [Sort pill]  [Filter]  │
└─────────────────────────┘
```

---

### 7.5 — Touch-Optimized Controls

**Minimum touch targets: 44×44px** (WCAG 2.5.5)

**Current violations to fix:**
- Filter buttons in sidebar (some < 44px height)
- Pagination pills (32px currently)
- Star rating buttons
- Stepper +/- buttons
- Language switcher flags

**Enhancement:**
- All interactive elements: `min-height: 44px; min-width: 44px`
- Add padding/margin for proper spacing between targets
- Use `touch-action: manipulation` to remove 300ms tap delay

---

### 7.6 — Horizontal Scroll Sections

**Apply to:**

1. **Popular destinations** — horizontal scroll carousel (already partially done)
   - Snap scrolling: `scroll-snap-type: x mandatory`
   - Each destination card snaps to center
   - Peek next item (show 10% of next card)
   - Scroll indicators (dots or fade gradient)

2. **Preset pills** — horizontal scroll row
   - Fits 3 pills visible, scroll for more
   - Snap to nearest pill

3. **Board type buttons** — horizontal scroll when many options
   - Show all without wrapping

```css
.horizontal-scroll {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}
.horizontal-scroll > * {
  scroll-snap-align: start;
  flex-shrink: 0;
}
/* Hide scrollbar but keep functionality */
.horizontal-scroll::-webkit-scrollbar {
  display: none;
}
```

---

### 7.7 — Mobile-Specific Tour Card

**Component:** `MobileTourCard.tsx`

**Layout:**

```
┌─────────────────────────────────────────────┐
│  [Full-width image with gradient overlay]    │
│                          ♥ (save button)     │
│                                             │
│  ── Price badge (on image) ──               │
│  │  12 900 Kč  (-19%)      │               │
│  ────────────────────────────               │
├─────────────────────────────────────────────┤
│  Hotel Name                     ★★★★       │
│  Destination · 7 nocí · All Inclusive       │
│  ✈ Letecky · 15.6. – 22.6.2026            │
│                                             │
│  [12 termínů] [Porovnat]   [Detail →]      │
└─────────────────────────────────────────────┘
```

**Features:**
- Full-width image (aspect ratio 16:9)
- Price badge overlaid on image (bottom-left)
- Discount badge overlaid on image (top-right)
- Key info in 2-3 concise lines below image
- Action buttons in bottom row (large touch targets)
- Swipeable gallery if multiple images (dots indicator)

---

### 7.8 — Mobile Infinite Scroll Improvements

**Current:** "Load more" button at bottom.

**Enhancement:**
- Automatic loading when user scrolls to bottom (IntersectionObserver on sentinel)
- Show spinner at bottom while loading
- "Load more" button as fallback (if auto-load fails)
- Show "Loaded X of Y" counter
- "Back to top" floating button after scrolling 3+ pages

```typescript
function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onLoadMore();
    }, { rootMargin: '200px' });
    
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);
  
  return sentinelRef;
}
```

---

### 7.9 — Haptic Feedback

**Where to use:**
- Favorite toggle (success vibration)
- Add to compare (short vibration)
- Pull-to-refresh threshold cross
- Bottom sheet snap points
- Filter applied

**Implementation:**
```typescript
function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!('vibrate' in navigator)) return;
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: [30, 10, 30],
  };
  navigator.vibrate(patterns[style]);
}
```

---

### 7.10 — Offline Indicator

**When connection is lost:**
- Show banner: "Jste offline. Zobrazujeme naposledy načtené výsledky."
- Show cached results from sessionStorage
- Disable filter changes (show tooltip: "Filtrování není dostupné offline")
- Re-enable when connection returns
- Auto-refresh when back online

```typescript
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
}
```

---

### 7.11 — App-Like Transitions

**Between states:**
- Page load → content: fade-in (200ms)
- Filter change → results update: cross-fade (150ms)
- Modal open: slide up from bottom (300ms spring)
- Modal close: slide down (200ms ease-out)
- Card detail: shared element transition (image scales from card to modal)
- Page transitions: no visible flash

**CSS:**
```css
@media (prefers-reduced-motion: no-preference) {
  .results-enter {
    animation: slideUp 200ms ease-out;
  }
  .modal-enter {
    animation: slideFromBottom 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .modal-exit {
    animation: slideToBottom 200ms ease-in;
  }
}
```

---

### 7.12 — Mobile Header Compact Mode

**When scrolling down:**
- Header collapses to minimal bar (logo + search icon + filter count)
- Saves ~60px of vertical space
- Smooth transition
- Expands again on scroll up

```typescript
function useCompactHeader() {
  const [compact, setCompact] = useState(false);
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY;
      if (currentY > 200 && currentY > lastScrollY.current) {
        setCompact(true); // scrolling down
      } else if (currentY < lastScrollY.current - 20) {
        setCompact(false); // scrolling up
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  
  return compact;
}
```

---

## Mobile Breakpoints

| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 480px | Small phone | Single column, full-width cards, stacked everything |
| 480–767px | Large phone / small tablet | Single column, slightly more padding |
| 768–1023px | Tablet | 2-column grid, sidebar collapsed by default |
| ≥ 1024px | Desktop | Full layout with sidebar |

---

## Acceptance Criteria

- [ ] Bottom sheet filter with drag gestures and snap points
- [ ] Swipe left/right on cards for quick actions
- [ ] Pull-to-refresh at results scroll top
- [ ] All touch targets ≥ 44×44px
- [ ] Popular destinations as horizontal snap scroll
- [ ] Mobile card layout with full-width image + overlaid price
- [ ] Automatic infinite scroll with sentinel observer
- [ ] Haptic feedback on key actions (where supported)
- [ ] Offline banner with cached results
- [ ] Smooth modal slide-up/slide-down animations
- [ ] Compact header on scroll down
- [ ] No horizontal overflow (no accidental horizontal scroll)
- [ ] iOS Safari: safe area insets respected (notch, home bar)
- [ ] Android: back button closes modals/sheets

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/components/MobileFilterBottomSheet.tsx` |
| Create | `client/src/features/search/components/MobileTourCard.tsx` |
| Create | `client/src/features/search/components/PullToRefresh.tsx` |
| Create | `client/src/features/search/hooks/useSwipeAction.ts` |
| Create | `client/src/features/search/hooks/usePullToRefresh.ts` |
| Create | `client/src/features/search/hooks/useInfiniteScroll.ts` |
| Create | `client/src/features/search/hooks/useOnlineStatus.ts` |
| Create | `client/src/features/search/hooks/useCompactHeader.ts` |
| Create | `client/src/features/search/hooks/useBottomSheet.ts` |
| Create | `client/src/features/search/utils/haptics.ts` |
| Modify | `client/src/features/search/components/SearchResults.tsx` (mobile layout switch) |
| Modify | `client/src/features/search/components/PopularDestinations.tsx` (horizontal scroll) |
| Modify | `client/src/features/search/components/PresetPills.tsx` (horizontal scroll) |

---

## Estimated Effort

- Bottom sheet with drag: ~6 hours
- Swipe gestures: ~4 hours
- Pull-to-refresh: ~3 hours
- Touch target fixes: ~2 hours
- Horizontal scroll sections: ~3 hours
- Mobile tour card: ~4 hours
- Infinite scroll improvement: ~2 hours
- Haptic feedback: ~1 hour
- Offline indicator: ~2 hours
- App-like transitions: ~4 hours
- Compact header: ~2 hours
- Testing on devices: ~4 hours
- **Total: ~37 hours**

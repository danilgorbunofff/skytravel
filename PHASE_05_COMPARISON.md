# Phase 5: Comparison Feature Upgrade

> **Goal:** Elevate the compare tray from a basic table into a visual, decision-making tool with highlighted differences, richer data, and mobile-optimized swipeable layout.

---

## Problem Statement

Current comparison issues:
1. **Simple HTML table** — no visual distinction between best/worst values
2. **No "add to compare" on card** — user must somehow know the feature exists
3. **Limited data rows** — only 7 rows (price, destination, departure, nights, board, stars, transport)
4. **Collapsed by default** — user might not notice the tray
5. **No limit enforcement** — can add unlimited tours (table becomes unwieldy)
6. **Not persistent** — refreshing page loses comparison
7. **No sharing** — can't send comparison to someone
8. **Mobile: table unusable** — horizontal scrolling on small screens
9. **No visual card layout** — just raw data in cells
10. **No difference highlighting** — user must manually compare values

---

## Deliverables

### 5.1 — Add-to-Compare on Tour Card

**Integration with Phase 3 (Tour Cards):**
- Checkbox/button in card corner (opposite to favorite heart)
- Icon: layers/compare icon (Lucide `GitCompare` or `Layers`)
- Visible on hover (desktop) or always visible below card (mobile)
- When added: card gets colored left border + icon fills
- Micro-animation on add (pulse effect)
- Tooltip: "Přidat k porovnání"

---

### 5.2 — Enhanced Compare Tray (Collapsed State)

**Bottom sticky bar when 1+ tours are in comparison:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [tour1-thumb] [tour2-thumb] [tour3-thumb]  3 zájezdy k porovnání  │
│                                             [Porovnat ▲] [Vymazat] │
└─────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Shows thumbnails of compared tours
- Tour count with Czech pluralization
- Expand button
- Clear all button
- Click thumbnail → remove that tour
- Subtle entrance animation (slide up from bottom)
- Z-index above content, below modals

---

### 5.3 — Visual Comparison View (Expanded)

**Replace plain table with card-based side-by-side comparison:**

```
┌───────────────────────────────────────────────────────────────────┐
│  Porovnání zájezdů                                    [✕ Zavřít] │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   [Image]   │  │   [Image]   │  │   [Image]   │             │
│  │   Hotel A   │  │   Hotel B   │  │   Hotel C   │             │
│  │  Turecko    │  │  Egypt      │  │  Řecko      │             │
│  │  ★★★★       │  │  ★★★★★      │  │  ★★★★       │             │
│  │  [✕ Remove] │  │  [✕ Remove] │  │  [✕ Remove] │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  ── Cena ──────────────────────────────────────────────────────── │
│  │  12 900 Kč  │  │  14 500 Kč  │  │  16 200 Kč  │  ← green   │
│  │  🏆 BEST    │  │             │  │             │             │
│                                                                   │
│  ── Termín ────────────────────────────────────────────────────── │
│  │  15.6.–22.6 │  │  18.6.–25.6 │  │  20.6.–27.6 │             │
│                                                                   │
│  ── Nocí ──────────────────────────────────────────────────────── │
│  │  7          │  │  7          │  │  7          │  ← same     │
│                                                                   │
│  ── Strava ────────────────────────────────────────────────────── │
│  │  All Incl.  │  │  Polopenze  │  │  All Incl.  │             │
│                                                                   │
│  ── Doprava ───────────────────────────────────────────────────── │
│  │  ✈ Letecky  │  │  ✈ Letecky  │  │  🚌 Autobus │             │
│                                                                   │
│  ── Hvězdy ────────────────────────────────────────────────────── │
│  │  ★★★★       │  │  ★★★★★ 🏆   │  │  ★★★★       │             │
│                                                                   │
│  ── Akce ──────────────────────────────────────────────────────── │
│  │  [Detail]   │  │  [Detail]   │  │  [Detail]   │             │
│  │  [Poptávka] │  │  [Poptávka] │  │  [Poptávka] │             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

### 5.4 — Highlight Best Values

**Logic for each comparison row:**

```typescript
function findBestValue(tours: UnifiedTour[], field: string): string[] {
  // Returns IDs of tours with the "best" value for that field
  switch (field) {
    case "price": return [cheapest tour ID];
    case "stars": return [highest stars tour ID];
    case "nights": return [longest stay tour ID]; // or user preference
    case "board": return [best board (AI > UAI > FB > HB > BB > RO)];
    default: return [];
  }
}
```

**Visual indicators:**
- Green background + "🏆" badge for best value in each row
- Red/muted for worst value (optional, configurable)
- Same values get neutral styling
- Clearly readable even for color-blind users (use icon + color)

---

### 5.5 — Difference Indicators

**Show relative differences between compared tours:**
- Price: "+1 600 Kč" / "-1 600 Kč" relative to cheapest
- Nights: "+2 nocí" if different
- Stars: "+★" difference

**Example:**
```
Hotel A: 12 900 Kč (cheapest)
Hotel B: 14 500 Kč (+1 600 Kč)
Hotel C: 16 200 Kč (+3 300 Kč)
```

---

### 5.6 — Maximum 4 Tours Limit

**Enforcement:**
- Maximum 4 tours in comparison
- When trying to add 5th: show toast "Maximum 4 zájezdy k porovnání. Odeberte jeden pro přidání dalšího."
- Compare button on card becomes disabled after limit reached
- Disable state: dimmed icon + tooltip explaining limit

---

### 5.7 — Persistent Compare State

**Storage:** `sessionStorage` key `skytravel:compare`

**Format:**
```typescript
interface CompareState {
  tours: {
    id: string; // `${source}-${externalId}`
    tour: UnifiedTour; // full tour data for offline rendering
  }[];
  updatedAt: number;
}
```

**Behavior:**
- Survives page navigation within same tab
- Cleared on tab close (sessionStorage)
- Restored on SearchPage mount
- Max age: none (session lifetime)

---

### 5.8 — Share Comparison

**Feature:** Share the comparison as a link or export.

**Option A: Share link**
- URL format: `/search?compare=id1,id2,id3`
- On load: fetch tours by IDs and populate comparison
- Requires new endpoint: `GET /api/search/tours?ids=id1,id2,id3`

**Option B: Export as image**
- "Screenshot" the comparison view using `html2canvas` or `dom-to-image`
- Download as PNG
- Note: adds a dependency — consider if worth it

**Option C: Copy as text**
- Copy formatted text comparison to clipboard
- Simplest to implement, no dependencies

**Recommended: Option A (link) + Option C (text) first.**

---

### 5.9 — Removal Animation

**When removing a tour from comparison:**
- Card slides out horizontally (300ms ease-out)
- Remaining cards reflow smoothly (transition on gap)
- If last tour removed: tray slides down and disappears

**When adding:**
- Card slides in from right
- Tray slides up if first tour added

---

### 5.10 — Mobile Comparison View

**Replace table/card grid with swipeable cards:**

```
┌─────────────────────────────────┐
│  Porovnání (3)         [Zavřít] │
├─────────────────────────────────┤
│                                 │
│  ← swipe →                      │
│                                 │
│  ┌──────────────────────────┐   │
│  │       [Image]            │   │
│  │    Hotel A               │   │
│  │    Turecko  ★★★★         │   │
│  │    ─────────────────     │   │
│  │    Cena: 12 900 Kč 🏆   │   │
│  │    Termín: 15.6.–22.6.  │   │
│  │    Nocí: 7              │   │
│  │    Strava: All Inclusive │   │
│  │    Doprava: ✈ Letecky   │   │
│  │    ─────────────────     │   │
│  │    [Detail] [Poptávka]   │   │
│  │    [✕ Odebrat]           │   │
│  └──────────────────────────┘   │
│                                 │
│   ● ○ ○  (pagination dots)      │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- Full-width cards, swipe between them
- Pagination dots below
- Each card shows all comparison data
- "Best value" badges still visible per-card
- Optional: "Side by side" button shows 2 cards at once (smaller)

---

## Compare Hook

```typescript
// client/src/features/search/hooks/useCompare.ts

interface UseCompareReturn {
  tours: UnifiedTour[];
  count: number;
  isCompared: (tourId: string) => boolean;
  toggle: (tour: UnifiedTour) => void;
  remove: (tourId: string) => void;
  clear: () => void;
  canAdd: boolean; // false when at max
  isFull: boolean;
}

export function useCompare(): UseCompareReturn { ... }
```

---

## Component API

```typescript
// CompareTray (collapsed bar)
interface CompareTrayProps {
  tours: UnifiedTour[];
  onExpand: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

// CompareView (expanded full comparison)
interface CompareViewProps {
  tours: UnifiedTour[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  onOpenDetail: (tour: UnifiedTour) => void;
  onInquiry: (tour: UnifiedTour) => void;
}
```

---

## Acceptance Criteria

- [ ] "Add to compare" button visible on tour cards (hover on desktop, always on mobile)
- [ ] Maximum 4 tours enforced with user-friendly message
- [ ] Collapsed tray shows thumbnails + count at bottom
- [ ] Expanded view shows side-by-side cards with all data rows
- [ ] Best values highlighted (green + trophy icon) per row
- [ ] Price differences shown relative to cheapest
- [ ] Comparison survives navigation within tab (sessionStorage)
- [ ] Share link generates URL with compared tour IDs
- [ ] Copy as text exports readable comparison
- [ ] Remove animation: smooth slide-out
- [ ] Mobile: swipeable full-width cards with pagination dots
- [ ] "Detail" button in comparison opens TourDetailModal
- [ ] "Poptávka" button in comparison opens inquiry form
- [ ] Accessible: screen reader announces comparison changes

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Rewrite | `client/src/components/CompareTray.tsx` → `client/src/features/search/components/CompareTray.tsx` |
| Create | `client/src/features/search/components/CompareView.tsx` |
| Create | `client/src/features/search/components/CompareCard.tsx` |
| Create | `client/src/features/search/components/CompareMobileView.tsx` |
| Create | `client/src/features/search/hooks/useCompare.ts` |
| Modify | `client/src/features/search/components/PublicTourCard.tsx` (add compare button) |
| Modify | `client/src/api/publicProviders.ts` (multi-tour fetch for share links) |
| Modify | `server/src/routes/providerSearchPublic.ts` (GET /tours?ids= endpoint) |

---

## Estimated Effort

- useCompare hook + persistence: ~3 hours
- Compare tray redesign: ~3 hours
- Compare expanded view: ~5 hours
- Best value highlighting: ~2 hours
- Difference indicators: ~2 hours
- Mobile swipeable view: ~4 hours
- Share/export: ~3 hours
- Animations: ~2 hours
- Card integration: ~2 hours
- Testing: ~3 hours
- **Total: ~29 hours**

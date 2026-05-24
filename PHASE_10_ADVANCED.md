# Phase 10: Advanced Features

> **Goal:** Add differentiating features that elevate SkyTravel's search beyond basic aggregation — map view, saved searches, price alerts, flexible date matrix, and smart recommendations.

---

## Problem Statement

Current feature gaps:
1. **No spatial awareness** — users can't visualize where hotels are on a map
2. **No saved searches** — returning users restart from scratch every time
3. **No price tracking** — users have no way to know if prices dropped for destinations they care about
4. **No flexible date exploration** — users must pick exact dates, can't explore "cheapest week in June"
5. **No recommendation engine** — no personalization based on user behavior
6. **No browsing history** — recently viewed tours aren't accessible
7. **No weather context** — users choose dates blindly without knowing climate conditions
8. **No budget planning** — can't set a total budget and find matching tours

---

## Deliverables

### 10.1 — Map View

**Component:** `SearchMapView.tsx`

**Implementation:** Leaflet.js (open-source, no API key required) or Mapbox GL JS (better UX, needs key).

**Recommended:** Leaflet with OpenStreetMap tiles (zero cost, no API key).

**Features:**
- Toggle between grid/list/map views (add map icon to view toggle)
- Tour pins placed at destination coordinates
- Cluster markers when zoomed out (group by destination)
- Hover pin → show mini card (hotel name + price)
- Click pin → open tour detail modal
- Filter results update pins in real time
- Fly-to animation when selecting a destination from sidebar
- Current viewport as a filter ("Search in this area")

**Data requirement:** Destination coordinates

```typescript
// New field in PublicDestinationSummary
interface PublicDestinationSummary {
  // ... existing fields
  lat?: number;
  lng?: number;
}
```

**Server changes:**
- Add `lat`/`lng` columns to destination data (manual mapping for known countries)
- Return coordinates in `/api/search/destinations` response

**Known destination coordinates (initial set):**
```typescript
const DESTINATION_COORDS: Record<string, [number, number]> = {
  egypt: [26.82, 30.80],
  turkey: [36.89, 30.70],
  greece: [37.97, 23.73],
  tunisia: [36.80, 10.18],
  bulgaria: [42.70, 23.32],
  spain: [40.42, -3.70],
  croatia: [43.51, 16.44],
  italy: [41.90, 12.50],
  // ...
};
```

**Map card popup:**
```
┌───────────────────────────┐
│ [Thumb]  Hotel Name       │
│          Destination      │
│          12 900 Kč        │
│          [Detail →]       │
└───────────────────────────┘
```

---

### 10.2 — Saved Searches

**Feature:** Users can save filter combinations and get notified when new tours match.

**Storage options:**
- **Anonymous (localStorage):** Save searches client-side, no backend needed
- **With email:** Save to database, send notification when new matches appear

**Phase 10A — Client-side saved searches (no auth required):**

```typescript
// localStorage key: "skytravel:savedSearches"
interface SavedSearch {
  id: string; // nanoid
  name: string; // user-provided or auto-generated
  filters: UnifiedFilters;
  createdAt: number;
  lastResultCount: number;
  lastChecked: number;
}
```

**UI:**
- "Save this search" button in results toolbar (floppy disk icon)
- Prompt for name (auto-suggest: "Egypt, All Inclusive, June")
- Saved searches dropdown in header or sidebar
- Badge showing new matches since last check
- Max 10 saved searches

**Phase 10B — Email notifications (requires email):**
- "Notify me" checkbox when saving search
- Collects email (reuse existing inquiry field)
- Server job (cron) checks saved searches periodically
- Sends email when new tours match that weren't there before
- Uses existing `nodemailer` setup

**Server changes (Phase 10B):**
```typescript
// New model: SavedSearch
model SavedSearch {
  id            Int       @id @default(autoincrement())
  email         String
  filters       Json
  name          String
  lastNotified  DateTime?
  resultHash    String?   // hash of last known result set
  createdAt     DateTime  @default(now())
  active        Boolean   @default(true)
}
```

---

### 10.3 — Price Alerts (Integration with Existing Model)

**The `PriceAlert` model already exists in the schema.** Extend it for search page usage.

**Feature:** "Alert me when this tour drops below X Kč"

**UI — In TourDetailModal:**
```
┌──────────────────────────────────────────────┐
│  🔔 Hlídač ceny                              │
│                                              │
│  Aktuální cena: 12 900 Kč                   │
│                                              │
│  Upozornit, když cena klesne pod:            │
│  [  11 000  ] Kč                             │
│                                              │
│  E-mail: [ your@email.cz ]                   │
│                                              │
│  [Nastavit hlídání →]                        │
└──────────────────────────────────────────────┘
```

**Existing infrastructure:**
- `PriceAlert` model in Prisma schema
- `PriceAlertModal` component exists in client
- Integrate into the new TourDetailModal from Phase 4

**Enhancements:**
- Show price trend if historical data available
- "Price dropped!" badge on cards when alert triggers
- Email notification with direct link to tour

---

### 10.4 — Flexible Dates Matrix (Price Calendar)

**Component:** `PriceCalendar.tsx`

**Feature:** Show cheapest price for each departure date in a calendar grid.

**UI:**
```
┌──── Červen 2026 ──────────────────────────────────────┐
│  Po    Út    St    Čt    Pá    So    Ne              │
│                    1     2     3     4               │
│                         12.9k  13.2k 11.8k           │
│  5     6     7     8     9    10    11              │
│ 14.1k 13.5k 12.9k 12.9k 13.0k 11.5k 12.2k          │
│ 12    13    14    15    16    17    18              │
│ 13.8k 14.2k 13.9k 12.4k 12.1k 11.9k 12.5k          │
│ 19    20    21    22    23    24    25              │
│ 14.5k 14.8k 15.1k 14.2k 13.8k 12.9k 13.1k          │
│ 26    27    28    29    30                          │
│ 15.2k 15.8k 16.1k 15.4k 14.9k                      │
└───────────────────────────────────────────────────────┘
  🟢 Cheapest   🟡 Average   🔴 Expensive
```

**Features:**
- Color coding: green (cheap), yellow (average), red (expensive)
- Click a date → set that as departure date in filters
- Navigate months (arrows)
- Show for selected destination
- Data source: aggregated prices from provider results

**Server endpoint (new):**
```
GET /api/search/price-calendar?destinationSlug=egypt&month=2026-06
Returns: { dates: { date: string; minPrice: number; tourCount: number }[] }
```

**Implementation:**
- Server queries all tours for that destination/month
- Groups by startDate
- Returns min price per date
- Cache aggressively (5-min TTL)

---

### 10.5 — "Inspire Me" / Smart Recommendations

**Component:** `InspireMe.tsx`

**Feature:** Curated suggestions based on budget, preferences, or randomization.

**Trigger:** Button "Inspirovat se" shown when no filters are active.

**Modes:**
1. **Budget-based:** "Set your budget" → show best tours within budget
2. **Random destination:** "Surprise me" → pick random destination with available tours
3. **Seasonal:** "Summer beach" / "Winter ski" / "City break" presets
4. **Popular now:** Top tours by inquiry count (from leads table)

**UI:**
```
┌───────────────────────────────────────────────────────┐
│  ✨ Nechte se inspirovat                              │
│                                                       │
│  [Budget: ___ Kč]  [Překvapit mě]  [Léto u moře]   │
│                                                       │
│  Nebo vyberte styl:                                   │
│  [🏖 Pláž] [🏔 Hory] [🏛 Město] [🎿 Lyže]          │
└───────────────────────────────────────────────────────┘
```

---

### 10.6 — Recently Viewed Tours

**Hook:** `useRecentlyViewed.ts`

**Storage:** localStorage `skytravel:recentlyViewed`

```typescript
interface RecentlyViewed {
  tours: {
    id: string; // source-externalId
    tour: UnifiedTour; // snapshot at view time
    viewedAt: number;
  }[];
}
```

**Features:**
- Auto-save when TourDetailModal opens
- Max 20 items, FIFO
- Show in sidebar or below search form: "Nedávno prohlížené"
- Horizontal scroll carousel of thumbnails
- Click to re-open detail
- "Clear history" button
- Respect privacy: no server storage, purely client-side

---

### 10.7 — Weather Integration

**Component:** `DestinationWeather.tsx`

**Feature:** Show expected weather for selected destination + dates.

**Data source:** OpenMeteo API (free, no key required) or static monthly averages.

**Recommended:** Static monthly averages (no external dependency, always fast).

```typescript
// Pre-computed averages per destination per month
const DESTINATION_WEATHER: Record<string, Record<number, { tempHigh: number; tempLow: number; rainDays: number; seaTemp?: number }>> = {
  egypt: {
    6: { tempHigh: 37, tempLow: 24, rainDays: 0, seaTemp: 27 },
    7: { tempHigh: 39, tempLow: 26, rainDays: 0, seaTemp: 29 },
    // ...
  },
  turkey: {
    6: { tempHigh: 33, tempLow: 21, rainDays: 1, seaTemp: 25 },
    // ...
  },
};
```

**UI in TourDetailModal (Location tab):**
```
┌─────────────────────────────────┐
│  ☀️ Počasí v červnu              │
│                                 │
│  🌡️ 33°C / 21°C                │
│  🌧️ 1 deštivý den             │
│  🌊 Moře: 25°C                 │
│                                 │
│  Ideální pro koupání ✓          │
└─────────────────────────────────┘
```

---

### 10.8 — Budget Planner

**Component:** `BudgetPlanner.tsx`

**Feature:** User sets total budget → see what's available for that amount.

**Calculation:**
```typescript
interface BudgetBreakdown {
  perPerson: number;
  totalForGroup: number;
  includesFlights: boolean;
  includesHotel: boolean;
  estimatedExtras: number; // airport transfers, excursions
  matchingTours: number;
}
```

**UI:**
```
┌──────────────────────────────────────────────┐
│  💰 Rozpočet na dovolenou                     │
│                                              │
│  Celkový rozpočet: [ 30 000 ] Kč            │
│  Osoby: [2 dospělí] [0 dětí]                │
│                                              │
│  = 15 000 Kč / osoba                         │
│  📋 Nalezeno: 47 zájezdů v rozpočtu          │
│                                              │
│  [Zobrazit zájezdy v rozpočtu →]             │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Sets `priceMax` filter to `budget / persons`
- Shows count of matching tours
- Click → applies filter and shows results

---

### 10.9 — Destination Guides (Brief Info)

**Component:** `DestinationGuide.tsx`

**Feature:** Brief info card for each destination in the sidebar/detail modal.

**Data:** Static markdown content per destination, stored in client bundle.

```typescript
const DESTINATION_GUIDES: Record<string, {
  name: string;
  flag: string;
  currency: string;
  language: string;
  timezone: string;
  bestSeason: string;
  highlights: string[];
  tip: string;
}> = {
  egypt: {
    name: "Egypt",
    flag: "🇪🇬",
    currency: "Egyptská libra (EGP)",
    language: "Arabština",
    timezone: "UTC+2",
    bestSeason: "Říjen – Duben",
    highlights: ["Rudé moře", "Pyramidy", "Hurghada", "Sharm el-Sheikh"],
    tip: "Vyplatí se směnit peníze až na místě.",
  },
  // ...
};
```

**UI:**
```
┌─ Egypt 🇪🇬 ─────────────────────────┐
│  💰 Měna: Egyptská libra            │
│  🗣 Jazyk: Arabština                │
│  ⏰ Časové pásmo: UTC+2             │
│  ☀️ Nejlepší období: Říjen–Duben    │
│  📍 Rudé moře · Pyramidy · Hurghada │
│  💡 Tip: Směňte peníze na místě     │
└──────────────────────────────────────┘
```

---

### 10.10 — Voice Search (Web Speech API)

**Component:** `VoiceSearchButton.tsx`

**Feature:** Microphone button next to search input for hands-free search.

```typescript
function useVoiceSearch(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    setSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);
  
  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ'; // Czech language
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };
    
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    
    recognition.start();
    setListening(true);
  }
  
  return { listening, supported, startListening };
}
```

**UI:**
- Microphone icon button next to search input
- Pulsing animation while listening
- Only shown if browser supports Web Speech API
- Czech language recognition (`cs-CZ`)
- Result fills search input, auto-submits

---

## Priority & Dependency Map

```
10.1 (Map)           — Independent, high visual impact
10.2 (Saved Search)  — Independent, high retention value
10.3 (Price Alerts)  — Depends on existing PriceAlert model
10.4 (Price Calendar)— Depends on server endpoint
10.5 (Inspire Me)    — Independent, low effort
10.6 (Recently Viewed)— Independent, low effort
10.7 (Weather)       — Independent, static data
10.8 (Budget Planner)— Independent, UX feature
10.9 (Dest. Guides)  — Independent, static data
10.10 (Voice Search) — Independent, progressive enhancement
```

**Recommended order:**
1. 10.6 (Recently Viewed) — lowest effort, immediate value
2. 10.2 (Saved Searches — client-side) — high retention
3. 10.5 (Inspire Me) — engagement
4. 10.9 (Destination Guides) — static, easy
5. 10.7 (Weather) — static, easy
6. 10.1 (Map View) — highest visual impact but more effort
7. 10.4 (Price Calendar) — requires server work
8. 10.3 (Price Alerts) — extend existing
9. 10.8 (Budget Planner) — UX feature
10. 10.10 (Voice Search) — progressive enhancement

---

## Server Changes Required

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Map View | `GET /api/search/destinations` | Add `lat`/`lng` to response |
| Saved Searches | `POST /api/search/saved` | Create saved search (Phase 10B) |
| Saved Searches | `GET /api/search/saved` | List user's saved searches |
| Price Calendar | `GET /api/search/price-calendar` | Min price per date for destination |
| Multi-tour fetch | `GET /api/search/tours?ids=` | Fetch multiple tours by ID (for share links) |

---

## Acceptance Criteria

- [ ] Map view shows tour pins on OpenStreetMap tiles
- [ ] Cluster markers group pins when zoomed out
- [ ] Click pin opens tour detail modal
- [ ] Saved searches persist in localStorage (max 10)
- [ ] "Save this search" button in results toolbar
- [ ] Saved searches show new match count badge
- [ ] Price alert integrates with existing PriceAlert model
- [ ] Price calendar shows cheapest departure per day
- [ ] "Inspire Me" shows budget/style-based suggestions
- [ ] Recently viewed shows last 20 viewed tours
- [ ] Weather shows static monthly averages for destination
- [ ] Budget planner computes per-person price and filters
- [ ] Destination guides show key info per country
- [ ] Voice search works in Chrome/Edge with Czech language
- [ ] All features degrade gracefully (no errors if API unavailable)

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/components/SearchMapView.tsx` |
| Create | `client/src/features/search/components/MapTourPopup.tsx` |
| Create | `client/src/features/search/components/SavedSearches.tsx` |
| Create | `client/src/features/search/components/PriceCalendar.tsx` |
| Create | `client/src/features/search/components/InspireMe.tsx` |
| Create | `client/src/features/search/components/RecentlyViewed.tsx` |
| Create | `client/src/features/search/components/DestinationWeather.tsx` |
| Create | `client/src/features/search/components/BudgetPlanner.tsx` |
| Create | `client/src/features/search/components/DestinationGuide.tsx` |
| Create | `client/src/features/search/components/VoiceSearchButton.tsx` |
| Create | `client/src/features/search/hooks/useRecentlyViewed.ts` |
| Create | `client/src/features/search/hooks/useSavedSearches.ts` |
| Create | `client/src/features/search/hooks/useVoiceSearch.ts` |
| Create | `client/src/features/search/data/destinationCoords.ts` |
| Create | `client/src/features/search/data/destinationWeather.ts` |
| Create | `client/src/features/search/data/destinationGuides.ts` |
| Create | `server/src/routes/priceCalendar.ts` |
| Modify | `server/src/routes/providerSearchPublic.ts` (coordinates in destinations) |
| Modify | `client/src/features/search/components/TourDetailModal.tsx` (price alert, weather) |
| Modify | `client/src/features/search/components/SearchResultsToolbar.tsx` (save search, map toggle) |

---

## Estimated Effort

- Map view (Leaflet integration): ~8 hours
- Saved searches (client-side): ~4 hours
- Price alerts (extend existing): ~3 hours
- Price calendar: ~6 hours
- Inspire Me: ~3 hours
- Recently viewed: ~2 hours
- Weather integration: ~2 hours
- Budget planner: ~3 hours
- Destination guides: ~2 hours
- Voice search: ~2 hours
- Server endpoints: ~4 hours
- Testing: ~5 hours
- **Total: ~44 hours**

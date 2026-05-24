# Phase 6: Performance & Data Loading

> **Goal:** Optimize rendering, network requests, and perceived speed to achieve sub-1s time-to-interactive and excellent Core Web Vitals scores.

---

## Problem Statement

Current performance issues:
1. **No request debouncing** — every filter change triggers immediate API call; rapid clicking generates many concurrent requests
2. **No virtual scrolling** — all 24+ cards are rendered in DOM simultaneously (24 is manageable, but mobile accumulates via infinite scroll)
3. **No image preloading** — next-page images load only when paginated
4. **Full re-render on filter change** — the entire result set re-renders even when only one item changed
5. **Large initial bundle** — SearchPage is lazy-loaded but still ~1800 lines parsed at once
6. **No progressive results** — user waits for ALL providers to respond before seeing anything
7. **Redundant network calls** — changing sort/page triggers a full server round-trip (could be client-side for cached results)
8. **No prefetching** — hover/scroll intent not used to predict next action
9. **Heavy CSS** — 4,635-line global CSS loaded even when only search styles needed
10. **No performance monitoring** — no measurement of real user metrics

---

## Deliverables

### 6.1 — Request Debouncing & Deduplication

**Problem:** Rapid filter changes (e.g., dragging price slider) trigger many API requests.

**Solution:**

```typescript
// In useSearchResults hook:
const debouncedFilters = useDebounce(searchFilters, 300);

// Only fetch when debounced value stabilizes
useEffect(() => {
  fetchResults(debouncedFilters);
}, [debouncedFilters]);
```

**Custom hook:** `useDebounce<T>(value: T, delay: number): T`

**Abort controller pattern:**
```typescript
const abortRef = useRef<AbortController | null>(null);

function fetchResults(filters: UnifiedFilters) {
  // Cancel previous request
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  
  fetchPublicAllProviderTours(filters, { signal: controller.signal })
    .then(...)
    .catch(err => {
      if (err.name === 'AbortError') return; // silently ignore
      setError(err.message);
    });
}
```

---

### 6.2 — Optimistic UI & Stale-While-Revalidate

**Pattern:** Show previous results (dimmed) while new results load.

**Current:** Already partially implemented (opacity reduction during load).

**Enhancement:**
- Keep showing previous results until new ones arrive (never show empty state during filter change)
- Smooth transition: old results fade out, new results fade in
- If sort/direction changes, apply client-side sort to current results immediately
- Show "Aktualizuji..." indicator without hiding content

```typescript
const [displayResult, setDisplayResult] = useState<ToursResult | null>(null);
const [isStale, setIsStale] = useState(false);

// When new request starts:
setIsStale(true); // dim current results

// When response arrives:
setDisplayResult(newResult);
setIsStale(false);
```

---

### 6.3 — Client-Side Sorting & Pagination

**Opportunity:** When user only changes sort direction or page, and all data for the current filter set is already cached, avoid a server round-trip.

**Implementation:**
- Server returns total result count with first request
- If `result.filtered <= CACHE_THRESHOLD` (e.g., 200), cache all items client-side
- Sort and paginate locally for subsequent sort/page changes
- Only re-fetch from server when actual filters change

**Savings:** Eliminates 60%+ of "page 2", "page 3", "sort by date" requests.

---

### 6.4 — Virtual Scrolling for Large Result Sets

**When to activate:** Mobile infinite scroll accumulates 50+ cards.

**Implementation:** Use intersection observer + windowed rendering.

```typescript
// Simple virtual list without library dependency
function useVirtualList<T>(items: T[], containerRef: RefObject<HTMLElement>, itemHeight: number) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      // Update visible range based on scroll position
    });
    // Observe sentinel elements
  }, []);
  
  return {
    visibleItems: items.slice(visibleRange.start, visibleRange.end),
    totalHeight: items.length * itemHeight,
    offsetTop: visibleRange.start * itemHeight,
  };
}
```

**Threshold:** Only activate when `items.length > 50`. Below that, render all (simpler, no layout jumps).

---

### 6.5 — Image Optimization Strategy

#### Preloading Next Page
```typescript
// When current page loads, start preloading next page images
function preloadNextPageImages(nextPageItems: UnifiedTour[]) {
  nextPageItems.slice(0, 6).forEach(tour => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = tour.image;
    document.head.appendChild(link);
  });
}
```

#### Intersection Observer Lazy Loading
```typescript
// Replace native loading="lazy" with IntersectionObserver for more control
function useLazyImage(src: string, rootMargin = '200px') {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const ref = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCurrentSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [src, rootMargin]);
  
  return { ref, currentSrc, loaded, onLoad: () => setLoaded(true) };
}
```

#### Responsive Image Sizes
```typescript
// Correct sizes attribute based on grid columns
function getImageSizes(viewMode: ViewMode): string {
  if (viewMode === 'list') return '120px';
  return '(min-width: 1400px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw';
}
```

---

### 6.6 — Progressive Results (Per-Provider)

**Feature:** Show results from the first responding provider immediately, then merge in others.

**Implementation:**

**Option A: Client-side parallel fetches**
```typescript
// Instead of one /all/tours call, fetch each provider separately
const providerPromises = providers.map(p => 
  fetchPublicProviderTours(p.id, filters)
);

// Show results as each resolves
for (const promise of providerPromises) {
  promise.then(result => {
    setResults(prev => mergeProviderResults(prev, result));
  });
}
```

**Option B: Server sends partial responses (streaming)**
- Requires chunked transfer encoding or SSE
- More complex, but better UX for slow providers
- Server starts sending as soon as first provider responds

**Recommended:** Option A (simpler, no server changes, still gives progressive feel).

**UX:**
- Show "Načítáme od dalších poskytovatelů..." below first results
- Subtle animation when new results merge in
- Total count updates incrementally

---

### 6.7 — Route-Level Code Splitting

**Current:** SearchPage is already lazy-loaded (`React.lazy`).

**Enhancement:** Split heavy sub-components within search:

```typescript
// TourDetailModal is only needed when user clicks a tour
const TourDetailModal = lazy(() => import('../features/search/components/TourDetailModal'));

// CompareView is only needed when user expands comparison
const CompareView = lazy(() => import('../features/search/components/CompareView'));

// DateRangePicker is only needed when user opens date picker
const DateRangePicker = lazy(() => import('../features/search/components/DateRangePicker'));
```

---

### 6.8 — Bundle Size Optimization

**Actions:**
1. **Tree-shake Lucide icons** — ensure only imported icons are bundled (already should work with ESM, verify)
2. **Lazy load date utilities** — `fmtDate` and formatters are small, but date libraries aren't used so no issue
3. **Remove unused exports** — audit `data.ts`, `utils.ts` for dead code on search path
4. **Split CSS** — extract search-specific CSS into separate chunk (Phase 8 handles this)

**Measurement:**
```bash
# Analyze bundle
npx vite-bundle-visualizer
```

---

### 6.9 — Skeleton Screens with Correct Dimensions

**Prevent CLS (Cumulative Layout Shift):**
- Set fixed aspect ratio on tour card image container: `aspect-ratio: 16/10`
- Reserve space for card body with min-height
- Skeleton matches exact card dimensions

```css
.tour-card-skeleton {
  aspect-ratio: auto;
  height: 380px; /* matches real card height */
}
.tour-card-skeleton__image {
  aspect-ratio: 16/10;
}
.tour-card-skeleton__body {
  padding: 1rem;
  min-height: 140px;
}
```

---

### 6.10 — Cache Warming on Idle

**Feature:** Preload popular searches during browser idle time.

```typescript
// After initial search loads, preload common follow-up queries
function warmCache() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload popular destinations
      ['egypt', 'turecko', 'recko'].forEach(slug => {
        fetchPublicAllProviderTours({ destinationSlug: slug, limit: 1 })
          .catch(() => {}); // silent, just warming server cache
      });
    });
  }
}
```

---

### 6.11 — Performance Monitoring

**Track Core Web Vitals:**

```typescript
// client/src/features/search/utils/performance.ts
export function reportSearchMetrics() {
  if (!('PerformanceObserver' in window)) return;
  
  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lcp = entries[entries.length - 1];
    console.debug('[perf] LCP:', lcp.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  
  // CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (!entry.hadRecentInput) clsValue += entry.value;
    }
    console.debug('[perf] CLS:', clsValue);
  }).observe({ type: 'layout-shift', buffered: true });
  
  // Custom: Time from filter change to results rendered
  performance.mark('search-filter-change');
  // ... after render:
  performance.mark('search-results-rendered');
  performance.measure('search-response-time', 'search-filter-change', 'search-results-rendered');
}
```

**Server-Timing header** (already exists as `searchTimingMiddleware`):
- Verify it tracks: total time, per-provider time, cache hit/miss
- Add to browser DevTools Network panel for debugging

---

### 6.12 — Server Response Optimization

**Request only needed fields for list view:**

Add `fields` query param to reduce payload:

```
GET /api/search/all/tours?fields=compact
```

**Compact mode omits:** `description`, `photos` (array — only send first image), `url`

**Savings:** ~40% reduction in JSON payload size for list views (photos arrays are largest).

**Implementation:**
- Server checks `fields=compact` param
- Passes `omitHeavy: true` to provider `fetchTours()`
- Already supported by Alexandria provider's `buildTourSelect(omitHeavy)`!

---

## Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 1.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Interaction to Next Paint | < 200ms | Web Vitals |
| Search response (filter→render) | < 800ms | Custom metric |
| Bundle size (search route) | < 80KB gzipped | Vite analysis |
| API response (p95) | < 500ms | Server logs |

---

## Acceptance Criteria

- [ ] Rapid filter changes debounced (300ms), only last request executed
- [ ] Previous in-flight requests aborted on new filter change
- [ ] Previous results shown (dimmed) while new results load
- [ ] Client-side sort/page when all data cached locally
- [ ] Mobile infinite scroll: virtual list activates at 50+ items
- [ ] Next page images preloaded via `<link rel="prefetch">`
- [ ] No CLS from image loading (aspect ratio reserved)
- [ ] Skeleton cards match real card dimensions
- [ ] TourDetailModal and CompareView code-split (lazy)
- [ ] Progressive results: first provider shows immediately
- [ ] `fields=compact` reduces API payload by ~40%
- [ ] LCP < 2.5s on 4G simulated connection
- [ ] CLS < 0.1 on page load
- [ ] Server-Timing header present in search responses

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/hooks/useDebounce.ts` |
| Create | `client/src/features/search/hooks/useVirtualList.ts` |
| Create | `client/src/features/search/hooks/useLazyImage.ts` |
| Create | `client/src/features/search/utils/performance.ts` |
| Create | `client/src/features/search/utils/imagePreloader.ts` |
| Modify | `client/src/features/search/hooks/useSearchResults.ts` (debounce, optimistic UI, progressive) |
| Modify | `client/src/api/publicProviders.ts` (abort signal, fields param) |
| Modify | `server/src/routes/providerSearchPublic.ts` (fields=compact support) |
| Modify | `client/src/features/search/components/PublicTourCard.tsx` (lazy image hook) |
| Modify | `client/src/features/search/components/TourCardSkeleton.tsx` (correct dimensions) |

---

## Estimated Effort

- Request debouncing + abort: ~3 hours
- Optimistic UI + SWR: ~3 hours
- Client-side sort/page: ~4 hours
- Virtual scrolling: ~5 hours
- Image optimization (preload, lazy, srcSet): ~4 hours
- Progressive results: ~4 hours
- Code splitting: ~2 hours
- Skeleton CLS fix: ~2 hours
- Performance monitoring: ~3 hours
- Server compact response: ~2 hours
- Testing + measurement: ~4 hours
- **Total: ~36 hours**

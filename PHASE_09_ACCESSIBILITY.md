# Phase 9: Accessibility & SEO

> **Goal:** Achieve WCAG 2.1 AA compliance across the entire search experience and optimize for search engine visibility with structured data, dynamic meta tags, and semantic HTML.

---

## Problem Statement

Current accessibility/SEO issues:
1. **Tour cards use `role="button"`** — semantically incorrect for content-rich elements (should be links or use proper button patterns)
2. **No skip links** — keyboard users must tab through header, nav, filters before reaching results
3. **No live region announcements** — screen reader users don't know when results update
4. **Color contrast issues** — some muted text (`#94a3b8` on white) may fail 4.5:1 ratio
5. **Focus management in modals** — partially implemented but inconsistent
6. **No structured data** — tours don't emit JSON-LD for search engine product listings
7. **Static page title** — always "Vyhledávání zájezdů" regardless of active filters
8. **No canonical URLs** — filtered pages can cause duplicate content issues
9. **No Open Graph tags** — shared search links have no rich preview
10. **Heading hierarchy broken** — multiple `<h2>` without `<h1>` context in some states
11. **No `prefers-reduced-motion`** — animations play regardless of user preference
12. **Filter buttons lack proper ARIA** — no `aria-pressed`, `aria-selected` states

---

## Deliverables

### 9.1 — Skip Links

**Component:** `SkipLinks.tsx` (rendered at top of SearchPage)

```tsx
function SkipLinks() {
  return (
    <nav aria-label="Přeskočit na" className="skip-links">
      <a href="#search-form" className="skip-link">
        Přeskočit na vyhledávání
      </a>
      <a href="#search-filters" className="skip-link">
        Přeskočit na filtry
      </a>
      <a href="#search-results" className="skip-link">
        Přeskočit na výsledky
      </a>
    </nav>
  );
}
```

**CSS:**
```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  z-index: var(--z-toast);
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 var(--radius-md) 0;
}
.skip-link:focus {
  top: 0;
}
```

---

### 9.2 — Live Region Announcements

**Hook:** `useSearchAnnouncements.ts`

Announce search state changes to screen readers:

```typescript
function useSearchAnnouncements(result: ToursResult | null, loading: boolean, error: string | null) {
  const [announcement, setAnnouncement] = useState("");
  
  useEffect(() => {
    if (loading) {
      setAnnouncement("Vyhledávám zájezdy...");
      return;
    }
    if (error) {
      setAnnouncement(`Chyba vyhledávání: ${error}`);
      return;
    }
    if (result) {
      if (result.filtered === 0) {
        setAnnouncement("Žádné zájezdy neodpovídají zvoleným filtrům.");
      } else {
        setAnnouncement(
          `Nalezeno ${result.filtered} zájezdů. Zobrazuji stránku ${result.page} z ${result.totalPages}.`
        );
      }
    }
  }, [result, loading, error]);
  
  return announcement;
}
```

**Render:**
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

**Announce on:**
- Results loaded (count + page)
- Filter applied ("Filtr přidán: All Inclusive")
- Filter removed ("Filtr odebrán: All Inclusive")
- Pagination ("Stránka 2 z 15")
- Error states
- Empty results

---

### 9.3 — Focus Management

#### Modal Focus Trap (improve existing)
- On open: save `document.activeElement`, focus close button
- Tab cycles within modal only
- On close: restore focus to triggering element
- Background content gets `inert` attribute (not just `aria-hidden`)

```typescript
// Use inert attribute (better than aria-hidden for focus trap)
useEffect(() => {
  const main = document.querySelector('main');
  main?.setAttribute('inert', '');
  return () => main?.removeAttribute('inert');
}, []);
```

#### Filter Changes — Maintain Focus
- After applying a filter, don't move focus away
- After clearing all filters, focus the first result or the "no results" message
- After pagination, focus the first card of new page

#### Return Focus Pattern
```typescript
function useReturnFocus() {
  const triggerRef = useRef<HTMLElement | null>(null);
  
  function saveTrigger() {
    triggerRef.current = document.activeElement as HTMLElement;
  }
  
  function restoreFocus() {
    triggerRef.current?.focus();
    triggerRef.current = null;
  }
  
  return { saveTrigger, restoreFocus };
}
```

---

### 9.4 — Keyboard Navigation

**Tour card navigation:**
- Cards are focusable (`tabIndex={0}`)
- Enter/Space opens detail modal (existing)
- **New:** Arrow keys navigate between cards in grid
- **New:** `f` key toggles favorite on focused card
- **New:** `c` key toggles compare on focused card

```typescript
function useGridKeyboardNav(gridRef: RefObject<HTMLElement>, itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  function handleKeyDown(e: KeyboardEvent) {
    const cols = getColumnCount(gridRef.current);
    switch (e.key) {
      case 'ArrowRight': setFocusedIndex(i => Math.min(i + 1, itemCount - 1)); break;
      case 'ArrowLeft': setFocusedIndex(i => Math.max(i - 1, 0)); break;
      case 'ArrowDown': setFocusedIndex(i => Math.min(i + cols, itemCount - 1)); break;
      case 'ArrowUp': setFocusedIndex(i => Math.max(i - cols, 0)); break;
      case 'Home': setFocusedIndex(0); break;
      case 'End': setFocusedIndex(itemCount - 1); break;
    }
  }
}
```

**Filter controls:**
- Button groups: arrow keys navigate between options
- Star rating: left/right arrows
- Price slider: already uses native range (accessible)
- Autocomplete: up/down arrows, Enter to select, Escape to close

---

### 9.5 — Color Contrast Audit

**Current issues (estimated):**

| Element | Current | Required | Status |
|---------|---------|----------|--------|
| Muted text (`#94a3b8` on `#fff`) | 3.0:1 | 4.5:1 | ❌ FAIL |
| Price text (`#0f172a` on `#fff`) | 15.4:1 | 4.5:1 | ✅ PASS |
| Primary button (`#fff` on `#2563eb`) | 4.6:1 | 4.5:1 | ✅ PASS |
| Star color (`#f59e0b` on `#fff`) | 2.1:1 | 3.0:1 (decorative) | ⚠️ OK |
| Link text (`#2563eb` on `#fff`) | 4.6:1 | 4.5:1 | ✅ PASS |
| Inactive filter (`#64748b` on `#fff`) | 4.8:1 | 4.5:1 | ✅ PASS |
| Region count badge (`#94a3b8`) | 3.0:1 | 4.5:1 | ❌ FAIL |

**Fixes:**
- Muted text: change from `#94a3b8` → `#64748b` (4.8:1)
- Region count: change from `#94a3b8` → `#64748b`
- Ensure all informational text meets 4.5:1
- Decorative elements (stars, icons) exempt from contrast requirements

---

### 9.6 — Reduced Motion Support

**Already planned in Phase 8. Ensure:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**In components:**
```typescript
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

**Usage:** Skip staggered animations, disable swipe gestures (use tap instead), disable hover transforms.

---

### 9.7 — ARIA Labels & Roles

**Filter buttons:**
```tsx
<button
  type="button"
  role="radio"
  aria-checked={active}
  aria-label={`Strava: ${label}`}
>
  {label}
</button>
```

**Filter groups:**
```tsx
<div role="radiogroup" aria-labelledby="board-filter-heading">
  <h3 id="board-filter-heading">Strava</h3>
  {/* buttons */}
</div>
```

**Multi-select (destinations, board in Phase 2):**
```tsx
<div role="group" aria-labelledby="destination-heading">
  <button role="checkbox" aria-checked={selected} aria-label={`${name} (${count} zájezdů)`}>
    {name}
  </button>
</div>
```

**Tour grid:**
```tsx
<section aria-label="Výsledky vyhledávání" aria-busy={loading}>
  <div role="list" aria-label={`${count} zájezdů`}>
    <article role="listitem" aria-label={`${tour.title}, ${formatPrice(tour.price)}`}>
      ...
    </article>
  </div>
</section>
```

**Pagination:**
```tsx
<nav aria-label="Stránkování výsledků">
  <button aria-label="Předchozí stránka" aria-disabled={page <= 1}>
  <span aria-current="page">Stránka {page} z {totalPages}</span>
  <button aria-label="Další stránka" aria-disabled={page >= totalPages}>
</nav>
```

---

### 9.8 — Dynamic SEO Meta Tags

**Component:** `SearchPageMeta.tsx` (using `document.title` + meta tags)

**Dynamic title based on filters:**
```typescript
function getSearchPageTitle(filters: SearchFilterState): string {
  const parts: string[] = [];
  if (filters.query) parts.push(filters.query);
  if (filters.destinationSlug) parts.push(getDestinationName(filters.destinationSlug));
  if (filters.board) parts.push(getBoardLabel(filters.board));
  
  if (parts.length === 0) return "Vyhledávání zájezdů | SkyTravel";
  return `${parts.join(" · ")} — Zájezdy | SkyTravel`;
}
```

**Examples:**
- No filters: "Vyhledávání zájezdů | SkyTravel"
- Egypt selected: "Egypt — Zájezdy | SkyTravel"
- Egypt + All Inclusive: "Egypt · All Inclusive — Zájezdy | SkyTravel"

**Meta description:**
```typescript
function getSearchMetaDescription(result: ToursResult | null, filters: SearchFilterState): string {
  if (!result) return "Vyhledejte a porovnejte zájezdy od ověřených cestovních kanceláří.";
  return `${result.filtered} zájezdů${filters.destinationSlug ? ` do ${getDestinationName(filters.destinationSlug)}` : ''} od ${formatPrice(getMinPrice(result))}. Porovnejte nabídky od Alexandria a Orextravel.`;
}
```

**Implementation:**
```tsx
useEffect(() => {
  document.title = getSearchPageTitle(filters);
  
  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', getSearchMetaDescription(result, filters));
}, [filters, result]);
```

---

### 9.9 — JSON-LD Structured Data

**Schema:** `Product` + `AggregateOffer` for tour listings

```typescript
function generateSearchStructuredData(tours: UnifiedTour[], destination?: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": destination ? `Zájezdy do ${destination}` : "Zájezdy",
    "numberOfItems": tours.length,
    "itemListElement": tours.slice(0, 10).map((tour, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": tour.title,
        "description": tour.description || `Zájezd do ${tour.destination}`,
        "image": tour.image,
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": tour.price,
          "highPrice": tour.originalPrice || tour.price,
          "priceCurrency": "CZK",
          "availability": "https://schema.org/InStock",
          "validFrom": tour.startDate,
        },
        "brand": {
          "@type": "Organization",
          "name": "SkyTravel",
        },
      },
    })),
  };
}
```

**Render:**
```tsx
<script type="application/ld+json">
  {JSON.stringify(generateSearchStructuredData(displayedTours, activeDestination))}
</script>
```

---

### 9.10 — URL Canonicalization

**Problem:** `/search?page=1&sortBy=price&sortDir=asc` is the same as `/search` but creates duplicate content.

**Solution:** Set canonical URL to base filter state (without defaults):

```typescript
function getCanonicalUrl(filters: SearchFilterState): string {
  const params = new URLSearchParams();
  // Only include non-default params
  if (filters.query) params.set('q', filters.query);
  if (filters.destinationSlug) params.set('destinationSlug', filters.destinationSlug);
  if (filters.dateStart) params.set('dateStart', filters.dateStart);
  if (filters.dateEnd) params.set('dateEnd', filters.dateEnd);
  if (filters.board) params.set('board', filters.board);
  if (filters.stars) params.set('stars', filters.stars);
  // Omit page=1, sortBy=price, sortDir=asc (defaults)
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.sortBy !== 'price') params.set('sortBy', filters.sortBy);
  if (filters.sortDir !== 'asc') params.set('sortDir', filters.sortDir);
  
  const search = params.toString();
  return `https://sky-travel.tours/search${search ? `?${search}` : ''}`;
}
```

**Render:**
```tsx
<link rel="canonical" href={canonicalUrl} />
```

---

### 9.11 — Open Graph Tags

**For rich social media previews when sharing search results:**

```tsx
function SearchOpenGraph({ filters, result }: { filters: SearchFilterState; result: ToursResult | null }) {
  const title = getSearchPageTitle(filters);
  const description = getSearchMetaDescription(result, filters);
  const image = result?.items[0]?.image || '/og-search-default.jpg';
  
  return (
    <>
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={getCanonicalUrl(filters)} />
      <meta property="og:site_name" content="SkyTravel" />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
```

**Note:** Since this is an SPA, use server-side rendering or a prerender service for OG tags to work with social media crawlers. If SSR is not available, add a `<meta>` tag fallback in `index.html` with generic search page info.

---

### 9.12 — Semantic HTML Structure

**Proper heading hierarchy:**
```
<h1> — Page title ("Vyhledávání zájezdů") — in SearchHero
  <h2> — "Destinace" (sidebar section)
  <h2> — "Cena" (sidebar section)
  <h2> — "Počet nocí" (sidebar section)
  <h2> — Results count ("Zobrazeno 1–24 z 342 zájezdů")
    <h3> — Individual tour titles (in cards, via aria-label or visually)
```

**Landmark regions:**
```tsx
<main>
  <section aria-label="Vyhledávací formulář">...</section>
  <aside aria-label="Filtry vyhledávání">...</aside>
  <section aria-label="Výsledky vyhledávání" aria-busy={loading}>...</section>
  <nav aria-label="Stránkování">...</nav>
</main>
```

---

## Testing Approach

### Automated Accessibility Testing

```bash
# Add axe-core to Playwright E2E tests
npm install -D @axe-core/playwright

# In e2e/search.spec.ts:
import AxeBuilder from '@axe-core/playwright';

test('search page has no accessibility violations', async ({ page }) => {
  await page.goto('/search');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Manual Testing Checklist

- [ ] Navigate entire page with keyboard only (no mouse)
- [ ] Use VoiceOver (macOS) / NVDA (Windows) to complete a search
- [ ] Test with 200% zoom (no horizontal scroll)
- [ ] Test with high contrast mode
- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Verify all images have meaningful `alt` text
- [ ] Verify all forms have proper labels
- [ ] Verify error messages are announced to screen readers

---

## Acceptance Criteria

- [ ] Skip links present and functional (visible on focus)
- [ ] Screen reader announces: result count, filter changes, errors, pagination
- [ ] Focus trapped in modals, returned on close
- [ ] Arrow key navigation in tour card grid
- [ ] All text meets WCAG 2.1 AA color contrast (4.5:1)
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All filter controls have proper ARIA roles and states
- [ ] Dynamic page title reflects active filters
- [ ] JSON-LD structured data present for tour listings
- [ ] Canonical URL set (excludes default params)
- [ ] Open Graph meta tags present
- [ ] Proper heading hierarchy (single `<h1>`, logical `<h2>`–`<h3>`)
- [ ] Landmark regions defined (`main`, `aside`, `nav`, `section`)
- [ ] axe-core E2E test passes with 0 violations
- [ ] Lighthouse Accessibility score > 95

---

## Files Created/Modified

| Action | Path |
|--------|------|
| Create | `client/src/features/search/components/SkipLinks.tsx` |
| Create | `client/src/features/search/components/SearchPageMeta.tsx` |
| Create | `client/src/features/search/hooks/useSearchAnnouncements.ts` |
| Create | `client/src/features/search/hooks/useReducedMotion.ts` |
| Create | `client/src/features/search/hooks/useGridKeyboardNav.ts` |
| Create | `client/src/features/search/hooks/useReturnFocus.ts` |
| Create | `client/src/features/search/utils/structuredData.ts` |
| Create | `client/src/features/search/utils/seo.ts` |
| Modify | All search components (add ARIA attributes) |
| Modify | `client/src/pages/SearchPage.tsx` (add SkipLinks, Meta, live region) |
| Modify | `e2e/search.spec.ts` (add axe-core tests) |
| Modify | `client/package.json` (add @axe-core/playwright dev dep) |

---

## Estimated Effort

- Skip links: ~1 hour
- Live region announcements: ~3 hours
- Focus management improvements: ~4 hours
- Keyboard navigation (grid): ~3 hours
- Color contrast audit + fixes: ~2 hours
- Reduced motion support: ~2 hours
- ARIA labels/roles across all components: ~4 hours
- Dynamic SEO meta tags: ~2 hours
- JSON-LD structured data: ~3 hours
- Canonical URLs + OG tags: ~2 hours
- Semantic HTML restructure: ~2 hours
- Automated axe testing: ~2 hours
- Manual testing + fixes: ~4 hours
- **Total: ~34 hours**

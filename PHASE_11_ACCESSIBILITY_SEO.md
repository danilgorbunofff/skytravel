# Phase 11: Accessibility & SEO

> Audit and fix accessibility across all key pages. Add axe-core checks, color contrast fixes, ARIA labels, focus management, prefers-reduced-motion, keyboard navigation, screen reader announcements, semantic HTML. SEO: meta descriptions, OG tags, canonical URLs, JSON-LD, dynamic page titles, sitemap.

---

## Step 1: Run axe-core audit on all key pages

### Files to modify
- `e2e/package.json` — add `@axe-core/playwright` dependency
- `e2e/tests/accessibility.spec.ts` — new accessibility test file

### Install dependency

```bash
npm --workspace e2e install @axe-core/playwright
```

### Create accessibility test file

```typescript
// e2e/tests/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "@axe-core/playwright";

const PAGES = [
  { url: "/", name: "Homepage" },
  { url: "/search?destination=Chorvatsko", name: "Search with results" },
  { url: "/gdpr", name: "GDPR page" },
  { url: "/terms", name: "Terms page" },
  { url: "/admin-login", name: "Admin login" },
];

test.describe("Accessibility audit", () => {
  for (const page of PAGES) {
    test(`${page.name} should have no critical violations`, async ({ page: p }) => {
      await p.goto(page.url);
      await injectAxe(p);
      const results = await checkA11y(p, null, {
        includedImpacts: ["critical", "serious"],
      });
      expect(results.violations).toEqual([]);
    });
  }
});
```

### Run audit

```bash
npm run test:e2e -- --grep "Accessibility"
```

Document all violations in a `docs/accessibility-audit.md` log.

### Acceptance criteria
- axe-core runs on all 5 key pages
- Test fails on critical and serious violations
- Violations documented for tracking
- Test can be run in CI pipeline

---

## Step 2: Fix color contrast issues

### Files to examine
- `client/src/app.css` (or `globals.css`) — color palette
- Tailwind theme values (in `client/vite.config.ts` if overridden)

### Common issues to fix

| Issue | Current | Target |
|---|---|---|
| Gray text on white (`text-muted-foreground`) | `#6b7280` (gray-500) → 4.1:1 on white | `#4b5563` (gray-600) → 5.5:1 |
| Light borders (`border`) | `#e5e7eb` (gray-200) | `#d1d5db` (gray-300) |
| Disabled button text | `#9ca3af` (gray-400) → 2.5:1 | `#6b7280` (gray-500) → 4.5:1 |
| Badge success text on green bg | Check contrast | Darken or use darker green |
| Link color on hover | Ensure meets 3:1 against bg |

### Tailwind v4 approach

Tailwind v4 doesn't have a config file. Update CSS custom properties in `client/src/app.css`:

```css
@theme {
  --color-muted-foreground: #4b5563;   /* was #6b7280 */
  --color-border: #d1d5db;              /* was #e5e7eb */
  --color-destructive: #dc2626;         /* ensure minimum 4.5:1 on white */
}
```

### Verification

Use axe-core test from Step 1 to verify all contrast violations are resolved.

### Acceptance criteria
- All text meets WCAG AA contrast minimum (4.5:1 normal, 3:1 large)
- All interactive elements meet 3:1 against background
- axe-core passes color contrast checks
- No regression in visual design

---

## Step 3: Ensure skip links work everywhere

### Current state
- `SkipLinks.tsx` (22 lines) exists in search features
- Exports `<SkipLinks />` with skip to results and skip to filters

### Implementation

Add skip links to:
1. **Homepage** — skip to main content
2. **Admin pages** — "Skip to main content", "Skip to navigation"
3. **GDPR / Terms** — skip to main content

Create a shared `SkipToContent.tsx` component:

```typescript
// client/src/components/SkipToContent.tsx
export function SkipToContent({ contentId = "main-content" }: { contentId?: string }) {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-white focus:no-underline"
    >
      Přeskočit na hlavní obsah
    </a>
  );
}
```

Add `id="main-content"` to `<main>` elements on each page.

### Acceptance criteria
- Skip link is first focusable element on every page
- Tab to skip link, press Enter, focus moves to main content
- Skip link is visually hidden until focused
- Admin pages have "Skip to navigation" and "Skip to main content"

---

## Step 4: Add ARIA labels systematically

### Audit all interactive elements

| Element | Current | Fix |
|---|---|---|
| Icon buttons (trash, edit, close) | `title` attribute only | Add `aria-label` matching the title |
| Search input (admin) | `placeholder` only | Add `aria-label="Hledat zájezdy"` |
| Language switcher | `aria-label` exists | Verify |
| Pagination buttons | "← Předchozí" text | Add `aria-label="Předchozí stránka"` |
| Sort buttons (price, date) | Icon + text | Add `aria-label="Seřadit podle ceny"` |
| Filter chips (close ×) | `×` character | Add `aria-label="Odstranit filtr"` |
| Upload image button | Icon only | Add `aria-label="Nahrát obrázek"` |
| Import buttons | Text | Add `aria-label="Importovat vybrané zájezdy"` |

### Pattern

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label="Smazat kontakt"
  title="Smazat kontakt"
  onClick={handleDelete}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### Live regions for dynamic content

```tsx
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {loading ? "Načítám zájezdy…" : `Nalezeno ${count} zájezdů`}
</div>
```

### Acceptance criteria
- Every interactive element has an accessible name (via label, aria-label, or aria-labelledby)
- Screen reader announces dynamic content changes
- axe-core passes ARIA-related checks
- Form inputs have associated `<label>` elements

---

## Step 5: Fix focus management in modals/drawers

### Current state
- `ConfirmDialog.tsx` uses Radix Dialog — focus trapping built in
- `TourDetailModal.tsx` has `closeButtonRef` and `previouslyFocusedRef`
- Radix Dialog components handle Esc and focus trap natively

### Audit checklist

| Component | Focus trap | Esc close | Focus restore |
|---|---|---|---|
| ConfirmDialog (Radix) | ✅ Built-in | ✅ Built-in | ❓ Verify |
| TourDetailModal | ❓ Check | ✅ | ✅ refs exist |
| MobileFilterDrawer | ❓ Check | ❓ Check | ❓ Check |
| LeadPopup | ❓ Check | ❓ Check | ❓ Check |
| CookieConsent | `role="dialog"` | ❓ Check | ❓ Check |

### Implementation

For any non-Radix modals, ensure:

```typescript
useEffect(() => {
  if (!isOpen) return;

  const previouslyFocused = document.activeElement;

  // Trap focus
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    // Focus trap logic
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  // Focus first element
  modalRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus();

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    // Restore focus
    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  };
}, [isOpen]);
```

### Acceptance criteria
- Tab cycling never leaves an open modal
- Esc key closes modal
- Focus returns to trigger element on close
- Screen reader announces modal open/close

---

## Step 6: Add prefers-reduced-motion support

### Files to modify
- `client/src/app.css` — add media query
- Components with animations: skeleton, carousel, transition effects

### CSS

```css
/* In app.css or globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Component-level

For components that use JavaScript animations:

```typescript
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (prefersReducedMotion) {
  // Skip animation, show final state immediately
  setAnimating(false);
} else {
  // Run animation
}
```

### Components to audit

| Component | Animation | Reduced motion behavior |
|---|---|---|
| Skeleton loading | Pulse animation | Static placeholder, no pulse |
| Page transitions | Fade/slide | Instant render |
| Hover scale effects | `scale(1.05)` | Remove transform |
| Carousel autoplay | Auto-scroll | Disable autoplay |
| Toast notifications | Slide in from right | Fade in without slide |

### Acceptance criteria
- All animations disabled when system preference is set
- No functionality lost — only motion removed
- Skeleton shows static placeholder without pulse
- Carousel does not auto-advance

---

## Step 7: Ensure keyboard navigation

### Audit checklist

| Feature | Keyboard requirement | Status |
|---|---|---|
| All links and buttons | Reachable via Tab | ✅ All native elements |
| Filter dropdowns | Arrow key navigation | ❓ Check ProviderFilterRenderer |
| Date picker inputs | Native date input | ✅ Browser handles |
| Pagination | Tab through + Enter | ✅ Native buttons |
| Sort by price/date | Tab to button + Enter | ✅ Native buttons |
| Checkbox select all | Tab to checkbox + Space | ✅ |
| Modal close button | Tab to button + Enter | ✅ |
| Import buttons | Tab to button + Enter | ✅ |
| Form validation | Focus first error field | ❓ Add this |

### Focus indicator

Ensure `:focus-visible` ring is visible:

```css
/* Already in Tailwind v4 defaults — verify */
*:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

### Error focus management

```typescript
// After validation fails, focus the first error field
useEffect(() => {
  const firstError = document.querySelector('[aria-invalid="true"]');
  if (firstError instanceof HTMLElement) firstError.focus();
}, [validationErrors]);
```

### Acceptance criteria
- Entire search flow completable with keyboard only (Tab + Enter + Arrow keys)
- All interactive elements have visible focus ring
- Focus order follows visual layout
- No keyboard traps

---

## Step 8: Add screen reader announcements

### Pattern

```typescript
function ScreenReaderAnnouncement({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

### Announcements to add

| Event | Message |
|---|---|
| Search results loaded | "Načteno 24 zájezdů pro Chorvatsko" |
| Filter applied | "Filtr aktualizován, zobrazeno 18 výsledků" |
| Filter removed | "Filtr odstraněn" |
| Loading started | "Načítám zájezdy…" |
| Loading error | "Nepodařilo se načíst zájezdy, zkuste to prosím znovu" |
| Tour imported | "Zájezd #123 importován" |
| Tour deleted | "Zájezd #123 smazán" |

### Implementation in AdminEmailPage and AdminSearchPage

Add the live region near the results area:

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {announcement}
</div>
```

### Acceptance criteria
- Screen reader announces search results count after load
- Filter changes announced
- Error states announced
- Loading states announced

---

## Step 9: Verify semantic HTML

### Audit checklist

| Element | Location | Status |
|---|---|---|
| `<header>` | Top of each page | ✅ Search page |
| `<main>` | Main content area | ✅ |
| `<footer>` | Page footer | ❓ Verify on all pages |
| `<nav>` | Navigation | ✅ |
| `<aside>` | Sidebar | ✅ Filters |
| `<article>` | Tour cards | ❓ Check if used |
| `<section>` | Content sections | ✅ Admin pages |

### Heading hierarchy

| Page | h1 | h2 | h3 |
|---|---|---|---|
| Homepage | "SkyTravel" | Section titles | Card titles |
| Search | Page title | "Filtry", "Výsledky" | Tour titles |
| Admin Statistics | "Statistiky & výkon" | "Statistiky" | KPI labels |
| Admin Email | "E-maily & marketing" | "Správa kontaktů", "Nová kampaň" | — |

Fix any heading skips (e.g., h1 → h3 without h2).

### Table semantics

Admin tables already use `<Table>` component with `<TableHeader>`, `<TableBody>`, `<TableHead>`, `<TableRow>`, `<TableCell>`. Verify:

- `<th>` elements have `scope="col"` or `scope="row"`
- `AdminSearchPage.tsx` uses CSS grid, not a `<table>` — this is a design choice but consider if a `<table>` element would be more semantic

### Form semantics

Verify all forms use:
- `<form>` element (not just `<div>`)
- `<label>` associated with inputs via `htmlFor`
- `<fieldset>` + `<legend>` for grouped controls (radio groups, checkboxes)

### Acceptance criteria
- W3C HTML validator returns no errors on all pages
- No heading hierarchy skips
- Lists use `<ul>`/`<ol>` elements
- Forms use proper `<form>` + `<label>` structure

---

## Step 10: SEO improvements

### Files to modify
- `client/index.html` — meta tags (already good, update as needed)
- `client/src/pages/SearchPage.tsx` — dynamic meta tags
- `client/src/pages/HomePage.tsx` — meta tags
- `client/src/components/SEOHead.tsx` — new component for dynamic meta
- `server/src/routes/sitemap.xml.ts` — new route for sitemap

### Dynamic meta descriptions

Use `react-helmet-async` (or a simpler `<title>` + meta tag updater):

```bash
npm --workspace client install react-helmet-async
```

Wrap app in `<HelmetProvider>`:

```typescript
import { HelmetProvider } from "react-helmet-async";

// In App.tsx
<HelmetProvider>
  <BrowserRouter>...</BrowserRouter>
</HelmetProvider>
```

**Search page example:**

```typescript
import { Helmet } from "react-helmet-async";

// In SearchPage
<Helmet>
  <title>{destination ? `Dovolená ${destination} 2026 | SkyTravel` : "Vyhledávání zájezdů | SkyTravel"}</title>
  <meta name="description" content={searchMetaDescription} />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDescription} />
  <link rel="canonical" href={canonicalUrl} />
</Helmet>
```

### Canonical URLs

```typescript
const canonicalUrl = `https://sky-travel.tours/search?destination=${encodeURIComponent(destination)}`;
<Helmet>
  <link rel="canonical" href={canonicalUrl} />
</Helmet>
```

### JSON-LD structured data

**Search results (ItemList):**

```typescript
const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": tours.map((tour, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Product",
      "name": tour.title,
      "description": `${tour.destination} — ${tour.nights} nocí, ${tour.board}`,
      "offers": {
        "@type": "Offer",
        "price": tour.price,
        "priceCurrency": "CZK",
        "availability": "https://schema.org/InStock",
      },
    },
  })),
};

<Helmet>
  <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
</Helmet>
```

### Dynamic page titles

| Page | Title format |
|---|---|
| Homepage | `SkyTravel | Dovolená na míru` |
| Search (no filter) | `Vyhledávání zájezdů | SkyTravel` |
| Search (destination) | `Dovolená Chorvatsko 2026 | SkyTravel` |
| Search (destination + dates) | `Chorvatsko červenec 2026 | SkyTravel` |
| GDPR | `GDPR | SkyTravel` |
| Admin | `Admin — {page} | SkyTravel` |

### Robots meta

```typescript
// Admin pages
<Helmet>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

Add to:
- `/admin-login`
- All `/admin/*` pages
- `/gdpr`
- `/terms`

### Sitemap generation

Create `server/src/routes/sitemap.xml.ts`:

```typescript
import { Router } from "express";
import prisma from "../../prisma.js";

const router = Router();

router.get("/sitemap.xml", async (_req, res) => {
  const destinations = await prisma.destination.findMany();
  const baseUrl = "https://sky-travel.tours";

  const urls = [
    { loc: baseUrl, priority: 1.0 },
    { loc: `${baseUrl}/search`, priority: 0.8 },
    { loc: `${baseUrl}/gdpr`, priority: 0.3 },
    { loc: `${baseUrl}/terms`, priority: 0.3 },
    ...destinations.map((d) => ({
      loc: `${baseUrl}/search?destination=${encodeURIComponent(d.name)}`,
      priority: 0.7,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});
```

Register in `app.ts`:

```typescript
import sitemapRouter from "./routes/sitemap.xml.js";
app.use(sitemapRouter);
```

### Acceptance criteria
- Lighthouse SEO score ≥95
- Each page has unique, descriptive `<title>`
- Each page has `<meta name="description">`
- OG tags present on all public pages
- Canonical URL prevents duplicate content issues
- JSON-LD structured data validates in Google Rich Results Test
- `noindex` on admin, GDPR, terms pages
- `sitemap.xml` returns valid XML with all destination search pages
- Dynamic titles reflect current search filters

---

## Risk Assessment

**RISK: LOW**

- Mostly additive changes (aria-labels, skip links, meta tags)
- prefers-reduced-motion could affect animation UX on systems that don't set it (it only reduces, never adds)
- react-helmet-async is a new dependency but widely used
- Sitemap endpoint is additive

## Verification

```bash
# Run E2E tests including axe checks
npm run test:e2e -- --grep "Accessibility"

# Run client tests
npm --workspace client run test

# Build to ensure no compilation errors
npm run build

# Manual checklist:
# 1. Tab through homepage — visible focus ring on all elements
# 2. Skip link appears on Tab, works to jump to content
# 3. Open TourDetailModal — Tab trapped, Esc works, focus restored
# 4. Enable prefers-reduced-motion in system prefs — no animations
# 5. VoiceOver / NVDA reads search results announcement
# 6. W3C HTML validator: paste homepage HTML
# 7. Google Rich Results Test: sitemap.xml and JSON-LD
# 8. Lighthouse: accessibility >95, SEO >95

# Check heading hierarchy
npm run test:e2e -- --grep "headings"
```

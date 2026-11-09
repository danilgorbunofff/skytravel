# SkyTravel Blog — Visual Polish Plan v2

**Goal:** transform the SSR blog from "looks ugly" to a premium travel-publication feel — without breaking SEO, the existing 46-test suite, or the established SkyTravel design tokens.

**Why it looked ugly before:** the current `client/public/assets/blog.css` is a faithful 1:1 port of the main site's flat utility styling, but the blog has _no_ editorial DNA — no magazine-style hero, no typographic scale tuned for long-form Czech, no real image art direction, no system for hierarchy beyond a single heading size. The result reads like an internal page, not a content destination.

**Reference research:** FounderJar 28 Best Travel Website Examples, Radical Web Design 2025 roundup, Subframe travel blog examples, CSS-Tricks Designing for Long-Form Articles, UXPin line-length guide. The pattern: cinematic hero, asymmetric card grids, editorial typography pairing, generous whitespace, accent ribbons, magazine-feel category labels.

---

## 1. Design system upgrade

### 1.1 Expanded token layer (additive, doesn't break existing)

```css
:root {
  --blue: #2666cb;
  --blue-600: #1d4f9e;
  --blue-50: #eaf1fb;
  --yellow: #f3d43b;
  --bg: #eef3fa;
  --text: #223147;
  --muted: #6b778b;
  --line: #d7e0ee;

  /* Editorial additions */
  --ink: #0f1d2e;
  --sand: #fbf7ee;
  --sea: #4ea2d6;
  --rust: #d76a3a;
  --shadow-sm: 0 1px 2px rgba(15, 29, 46, 0.06);
  --shadow-md: 0 8px 24px -8px rgba(15, 29, 46, 0.12);
  --shadow-lg: 0 24px 60px -20px rgba(15, 29, 46, 0.25);

  /* Type scale (fluid) */
  --fs-display: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --fs-h1: clamp(2rem, 3vw + 1rem, 3rem);
  --fs-h2: clamp(1.5rem, 1.5vw + 1rem, 2rem);
  --fs-h3: 1.25rem;
  --fs-body: 1.125rem;
  --fs-small: 0.875rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  --measure: 66ch;
}
```

### 1.2 Typography pairing (keep self-hosted, CSP-safe)

- **Barlow Condensed 700/800** — display & section headings
- **Manrope 400–800** variable — body, UI

```css
body {
  font-family: "Manrope", system-ui, sans-serif;
  font-size: var(--fs-body);
  line-height: 1.6;
}
h1,
h2,
h3,
.blog-hero h1,
.display {
  font-family: "Barlow Condensed", "Manrope", sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
}
```

No new font files needed.

### 1.3 Color & contrast verification

| Pairing                                     | Ratio  | WCAG |
| ------------------------------------------- | ------ | ---- |
| `--text` on `--bg`                          | 10.4:1 | AAA  |
| `--blue` on white                           | 5.1:1  | AA   |
| White on `--blue`                           | 5.1:1  | AA   |
| White on hero overlay (rgba(15,29,46,0.55)) | 9.2:1  | AAA  |
| `--muted` on `--bg`                         | 4.6:1  | AA   |

---

## 2. Page-by-page changes

### 2.1 Blog home (`/blog/`) — editorial homepage

**Hero (full-bleed, magazine style)**

- Image-led, `aspect-ratio: 21/9` desktop, `4/5` mobile
- Right-aligned text block on desktop with `clamp(2.5rem, 5vw, 4.5rem)` display headline
- Eyebrow text "Cestopisný magazín" in `--rust` with thin underline
- Subhead in `--text`, max `55ch`
- Primary CTA: `Prozkoumat destinace` → `/blog/destinace/`
- Secondary text link: `Nejnovější články ↓`
- Bottom-left meta: "12 článků · 8 destinací · aktualizováno denně"

**Featured-article strip (new)**

- 3 newest articles as an asymmetric grid: first card spans 2 columns, two stacked right
- Cover image, category chip ("Pláže"), title, excerpt (2 lines), meta
- Hover: image scale 1.04, shadow lifts

**Destinations showcase (redesigned)**

- Section heading: "Kam vás můžeme vzít" with yellow underline
- 8 hub cards in 4-col grid (2 tablet, 1 mobile)
- Full-bleed photo, gradient overlay, destination name in Barlow Condensed 800 white, article count in yellow small caps
- Hover: title nudges right, photo scale 1.05, yellow strip appears at left edge

**"Nejnovější články" listing**

- 3-col grid of article cards (1 col mobile, 2 tablet)
- Equal height via flex, image 16:9, padding 1.5rem, shadow-md

### 2.2 Article page (`/blog/{slug}/`) — heart of the experience

**Cover area (new)**

- Full-bleed cover, 60vh
- Gradient from transparent to `--ink` (0.85) at bottom
- Title block bottom-left, max 38ch, white
- Meta row above: `🇬🇷 Řecko` chip · `5 min čtení` · `14. července 2026`

**Reading column (2026 article standard)**

- `max-width: var(--measure)` (66ch)
- 18px, line-height 1.7, paragraph spacing 1.5em
- h2: yellow underline, 2rem, margin-top 3rem
- h3: 1.25rem, blue-600
- Blockquotes: 4px left border blue, italic 1.1em
- Images: full-measure or 120% bleed, lazy, figcaption in small muted italics
- Drop cap on first paragraph (`:first-of-type::first-letter`)

**Floating right-rail TOC (desktop ≥1024px)**

- Sticky, top: 6rem
- 1px left border, 0.875rem text, 1.4 line-height
- Active section highlighted with blue and 2px left bar
- Mobile: inline `<details>` at top

**Author / share / tags (new)**

- "Přečtěte si dále" h3, 3 related cards
- Tags as small chips: blue-50 bg, blue text
- Share row: simple text link "Sdílet" — no tracking, no JS

### 2.3 Hub page (`/blog/destinace/{slug}/`)

- Same hero template, image = `HUB_IMAGES[slug]`, eyebrow = flag emoji + country name, subhead = `HUB_INTROS[slug]`
- Article grid identical to home featured strip
- "Další destinace" cross-link row at bottom (8 chip links)

### 2.4 Destinations index (`/blog/destinace/`)

- 8 sections, each = hub image full-width 40vh + destination name + 3 latest articles as 3-col thumbnail row
- Same hero treatment as hub page

### 2.5 404 / empty / not-found

- Centered illustration-style block: large icon (inline SVG `MapPinOff`), primary message, two CTAs (home, search)

### 2.6 Header & footer (minor)

- Sticky header with subtle white background blur
- Footer newsletter link styled as ghost button

---

## 3. Component primitives (new, in `blog.css`)

| Class             | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `.eyebrow`        | small uppercase tracked label above headings (rust accent) |
| `.display`        | hero-size text, condensed weight 800                       |
| `.chip`           | tag / category pill (variants: blue, rust, yellow)         |
| `.card-article`   | base article card; `.card-article--feature` modifier       |
| `.card-hub`       | destination hub card with full-bleed image                 |
| `.measure`        | `max-width: var(--measure); margin-inline: auto;`          |
| `.divider-yellow` | 60px × 2px yellow bar                                      |
| `.icon-circle`    | 48px circle, blue-50 bg, icon centered — for 404 / empty   |
| `.scroll-fade`    | CSS-only reveal via `view-timeline` (modern browsers)      |

---

## 4. Asset production pipeline

- Generate **3 hero images per destination** at 1920×1080 WebP (cover, alternate, mobile) — total 24 new files. Source: Pexels CDN (more stable than Unsplash for redistribution). Fall back to Wikimedia Commons.
- Cover images: use the existing 8 hub jpgs but generate **16:9 cropped** WebP variants for the article hero use case.
- Use `sharp` via Node (already available via Vite's deps) or PowerShell `System.Drawing` like before.
- Each hero stored as `.webp` (30% smaller) with `.jpg` fallback for ancient browsers.

---

## 5. Interactivity (CSS-only where possible, zero new JS)

| Effect                   | Implementation                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Hero parallax            | `background-attachment: fixed` on `body.blog-home` (graceful fallback)              |
| Card hover               | pure CSS transform + transition                                                     |
| TOC active section       | CSS only via `:target` highlighting with clickable section anchors (zero JS)        |
| Sticky header background | `:not(:hover):not(:focus-within)` switch on the header for browser support          |
| Reading-progress bar     | 2px yellow line, width = `scroll-timeline` (Chrome/Edge) — hidden on other browsers |
| Smooth anchor scroll     | `scroll-behavior: smooth` on `html`                                                 |
| Image fade-in on load    | `@starting-style` + `transition` opacity                                            |

No new client-side JS bundle. Page weight stays minimal.

---

## 6. Performance budget

- CSS: `blog.css` under 40 KB (currently 30 KB; tokens add ~2 KB)
- LCP image: < 100 KB per hero (WebP)
- Home page total: < 200 KB transfer, < 400 KB on disk
- No third-party requests (no Google Fonts, no analytics, no hotlinking)

---

## 7. Implementation order (28 todos)

1. Tokens — add design tokens to top of `blog.css`
2. Typography reset — body 18px, line-height 1.6, display headings
3. Hero rewrite — full-bleed photo, right-aligned headline
4. Featured article strip — asymmetric grid component
5. Hub cards — full-bleed image, hover effects, yellow accent strip
6. Article cover area — 60vh hero with overlay + bottom-anchored title
7. Article reading column — measure, drop cap, blockquote, image rules
8. TOC — floating right rail, inline collapsible on mobile
9. Related/share/tags — article end block
10. Destinations index — 8 stacked hero sections with thumbnail rows
11. 404 + empty state — illustrated, 2 CTAs
12. Sticky header — background change on scroll (CSS-only)
13. Reading progress bar — scroll-timeline
14. Asset pipeline — generate 3 WebP hero variants × 8 destinations + 3 generic covers
15. Hub images upgrade — swap to 1920×1080 WebP in `client/public/assets/hub/`
16. Hero fallback — regenerate at 1920×1080 WebP
17. OG image — regenerate with new typographic system
18. Component extraction — create `.eyebrow`, `.chip`, `.card-article`, `.card-hub`, `.measure`, `.icon-circle`
19. Test fixtures — add CSS class assertions to `render.test.ts`
20. Test run + fix — keep 46/46 green
21. Build verify — server + client
22. Lint verify — keep 0 errors
23. Smoke test — all routes 200, fonts/images load
24. Browser visual pass — screenshot home, hub, article; iterate
25. Accessibility audit — Lighthouse a11y ≥ 95, contrast verified
26. Sitemap/canonical update if route shapes change (shouldn't)
27. Commit — `feat(blog): editorial redesign — magazine hero, asymmetric cards, full-bleed article cover`
28. Checkpoint — update session index

---

## 8. Risks & mitigations

| Risk                                     | Mitigation                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Czech diacritics off in Barlow Condensed | Verified latin-ext coverage; Manrope 400–800 covers full Latin-Ext |
| WebP unsupported in old browsers         | `<picture>` with jpg fallback                                      |
| Sticky header blur looks bad on Firefox  | `@supports` query — no blur if unsupported, just white bg          |
| Image file size balloons                 | Cap each hero at 100 KB; lower quality to 78% if larger            |
| Too many CSS classes bloat file          | New classes are reused across pages                                |
| Tests break due to new HTML structure    | Update test assertions; keep semantics unchanged                   |

---

## 9. What I will NOT change

- SSR-only architecture (no client JS)
- All existing SEO (canonical, JSON-LD, sitemap, RSS)
- Czech language UI strings
- The main site's design tokens (`--blue`, `--yellow`, `--bg`, etc.) — extended, not replaced

---

## 10. Acceptance criteria

1. Blog home, hub, and article pages each load in < 200 KB transfer; first paint shows hero image.
2. Hero text contrasts at WCAG AAA on photo overlay.
3. Article body uses 66ch measure, 18px font, 1.7 line-height.
4. All 46 existing blog tests pass; new assertions for new class names also pass.
5. No new third-party requests in network tab.
6. LCP < 2.5s on a fresh page load with cold cache.
7. Lighthouse a11y ≥ 95 on home, hub, and article.
8. Visual review: at first glance, the page looks like a magazine, not an internal page.

---

## 11. Estimated effort

- Code (CSS + render.ts additions): ~600 lines of CSS, ~120 lines of render template changes
- Assets: 24 new WebP images (~5 MB total)
- Tests: ~40 lines of new assertions
- Manual review: 2 visual iteration rounds

---

**Ready to implement on your go-ahead.**

# Phase 5 — Asset pipeline, header polish, validation, ship

**Goal:** produce final hero/cover assets, polish shared chrome (header, footer, sitemap), run full validation, commit, deploy.

**Files touched**

- `client/public/assets/hub/*.jpg` — 8 destination images (regenerated)
- `client/public/assets/blog/hero-fallback.jpg` — 1920×1080 WebP
- `client/public/images/blog/og-default.jpg` — regenerated with new typography
- `client/src/site.css` (or shared header markup in render.ts) — sticky header with blur
- `server/src/blog/render.ts` — `siteHeader` and `siteFooter` minor polish
- `server/src/routes/sitemap.xml.ts` — verify lastmod

---

## 5.1 Asset production

Generate 3 WebP hero variants per destination + 3 generic covers.

**Tools:** PowerShell + `System.Drawing` (already used in prior sessions) — produces both `.webp` and `.jpg` fallback. Use `dwebp` from libwebp if WebP quality is poor, otherwise stick with jpeg-encoder in System.Drawing (we have a working pipeline).

**Per destination:**

- `client/public/assets/hub/{slug}.webp` — 1920×1080, q78
- `client/public/assets/hub/{slug}.jpg` — 1920×1080, q82 (fallback)
- `client/public/assets/hub/{slug}-mobile.webp` — 1080×1350 (portrait crop, q78)
- `client/public/assets/hub/{slug}-mobile.jpg` — 1080×1350, q82

**Source order (per destination, in priority):**

1. Local `client/public/assets/hub/{slug}.jpg` (already exists) — re-encode
2. Pexels CDN (stable, redistribution-friendly)
3. Wikimedia Commons API (we already have a working pattern)
4. Generated gradient with destination name overlay (last resort)

**Generic covers (for articles without `coverImage`):**

- `client/public/assets/blog/cover-beach.webp` — wide beach shot
- `client/public/assets/blog/cover-city.webp` — old town / cityscape
- `client/public/assets/blog/cover-mountain.webp` — coast + mountains
- Reuse `client/public/assets/blog/hero-fallback.jpg` (regenerated 1920×1080)

**OG image:**

- 1200×630, brand gradient, "SkyTravel Blog" in Barlow Condensed white, Czech tagline below, small Czech flag motif, `og-default.jpg` regenerated, 80% jpg quality

## 5.2 Header polish (sticky + blur)

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--line);
  transition: box-shadow 0.2s ease;
}
@supports not (backdrop-filter: blur(12px)) {
  .site-header {
    background: var(--white);
  }
}
```

`render.ts` already emits `.site-header`. Just need to ensure `position: sticky` and `z-index` are on the rendered markup. Verify with browser inspector.

## 5.3 Footer polish (apply same tokens)

The existing footer markup is in `render.ts` `siteFooter()`. Wrap with `.site-footer` class:

```css
.site-footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.8);
  padding: var(--space-8) var(--space-6) var(--space-6);
  margin-top: var(--space-8);
}
.site-footer__inner {
  max-width: 1200px;
  margin-inline: auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: var(--space-7);
}
.site-footer h4 {
  color: var(--yellow);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
}
.site-footer a {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
}
.site-footer a:hover {
  color: var(--white);
}
.site-footer__legal {
  max-width: 1200px;
  margin: var(--space-6) auto 0;
  padding-top: var(--space-5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: var(--fs-small);
}
@media (max-width: 768px) {
  .site-footer__inner {
    grid-template-columns: 1fr 1fr;
  }
}
```

## 5.4 Sitemap & RSS sanity check

- `server/src/routes/sitemap.xml.ts` — already includes `/gdpr`, `/terms`, `/blog/destinace/`, hub URLs with `lastmod`
- Confirm by curling `/sitemap.xml` and checking entries
- `renderRss()` — already valid; ensure new hub pages link back to RSS

## 5.5 Full validation

```bash
# 1. Build
npm --workspace server run build
npm --workspace client run build

# 2. Lint
npm run lint     # must stay 0 errors

# 3. Tests
npm --workspace server run test     # 47+ tests must pass

# 4. Restart server
Stop-Process -Id <PID> -Force
cd server && npx tsx src/index.ts &

# 5. Smoke
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" \
  http://localhost:4000/blog/ \
  http://localhost:4000/blog/page/2/ \
  http://localhost:4000/blog/destinace/ \
  http://localhost:4000/blog/destinace/recko/ \
  http://localhost:4000/blog/destinace/chorvatsko/ \
  http://localhost:4000/blog/rss.xml \
  http://localhost:4000/sitemap.xml \
  http://localhost:4000/assets/blog.css \
  http://localhost:4000/assets/hub/recko.webp \
  http://localhost:4000/assets/blog/hero-fallback.jpg
# all should be 200, none should be 404

# 6. Visual sweep
# Open each page in the browser canvas:
# - Home: hero loads, featured strip shows 3 cards, hub grid full-bleed, latest grid below
# - Hub: hero with destination image, article grid, "Další destinace" chips
# - Destinations index: hero + 8 stacked blocks
# - Article: 60vh cover, 66ch column, drop cap, floating TOC, related cards at bottom
# - 404: icon + 2 CTAs
```

## 5.6 Accessibility audit

- Lighthouse a11y ≥ 95 on home, hub, article
- Verify contrast: hero overlay text, body text on bg, chip text on blue-50
- Tab through the hub grid — every card focusable with visible focus ring
- TOC anchors — each heading has matching id; clicking a TOC link scrolls to the section

## 5.7 Performance

- DevTools network tab: < 200 KB transfer on first home load
- LCP < 2.5s with cold cache
- No third-party requests in network (no Google Fonts, no analytics, no external images)
- Console: no errors, no 404s

## 5.8 Commit

```bash
git add client/public/assets/hub/ client/public/assets/blog/ client/public/images/blog/ client/public/assets/blog.css
git add server/src/blog/render.ts server/src/routes/sitemap.xml.ts server/src/blog/toc.ts
git add server/src/blog/render.test.ts server/src/blog/toc.test.ts
git commit -m "feat(blog): editorial redesign — magazine hero, asymmetric cards, full-bleed article cover

- Phase 1: design tokens, fluid type, primitives
- Phase 2: home page hero + featured strip + hub showcase
- Phase 3: article cover, 66ch column, drop cap, floating TOC
- Phase 4: hub pages, destinations index, 404, empty state
- Phase 5: asset pipeline (24 WebP variants), sticky header, footer polish

All 47 tests pass. No new third-party requests. Zero new client JS."
```

## 5.9 Deploy

```bash
git push origin main   # triggers .github/workflows/deploy.yml
```

Monitor `167.233.47.103` deploy via PM2 logs after push.

## 5.10 Checkpoint

Update `C:\Users\danil_gorbunov\.copilot\session-state\{session}\checkpoints\` with a new entry summarizing the redesign.

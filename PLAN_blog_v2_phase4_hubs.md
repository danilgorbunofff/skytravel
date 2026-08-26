# Phase 4 — Hub, destinations index, 404, empty states

**Goal:** consistent visual treatment for the secondary navigation pages. Each destination should feel like its own magazine issue.

**Files touched**

- `client/public/assets/blog.css` — hub & index rules (light)
- `server/src/blog/render.ts` — `renderHubPage`, `renderDestinationsIndexPage`, `renderNotFoundPage`, `renderEmptyList` rewrites

---

## 4.1 Hub hero (re-uses `.blog-hero`)

No new CSS — the existing `.blog-hero` class is now general purpose. Just call `blogHero()` from `renderHubPage` with:

- eyebrow: `🇬🇷 {destinationName}` (uses the flag emoji from a `HUB_FLAGS` map)
- title: `Průvodce {destinationName}` (or a `HUB_TAGLINES[slug]` override)
- sub: `HUB_INTROS[name]`
- bg: `HUB_IMAGES[slug]` (local)

Add a `HUB_FLAGS` map at top of `render.ts`:

```ts
const HUB_FLAGS: Record<string, string> = {
  bulharsko: "🇧🇬",
  chorvatsko: "🇭🇷",
  italie: "🇮🇹",
  albanie: "🇦🇱",
  "cerna-hora": "🇲🇪",
  recko: "🇬🇷",
  turecko: "🇹🇷",
  spanelsko: "🇪🇸",
};
const HUB_TAGLINES: Record<string, string> = {
  recko: "Ostrovy, pláže a antické památky",
  bulharsko: "Zlaté písky, Sluneční břeh a černomořské pobřeží",
  // …
};
```

## 4.2 Hub article list

Reuse `.blog-latest` and `.card-article` from home. Wrap with:

```html
<section class="blog-latest">
  <div class="blog-latest__head">
    <h2 class="blog-latest__title">Články o {destinationName}</h2>
  </div>
  <div class="blog-latest__grid">
    <!-- 3-col cards -->
  </div>
</section>
```

## 4.3 Other destinations row (bottom of hub page)

```css
.blog-other-hubs {
  background: var(--sand);
  padding: var(--space-7) var(--space-6);
}
.blog-other-hubs__inner {
  max-width: 1200px;
  margin-inline: auto;
}
.blog-other-hubs__title {
  font-size: var(--fs-h2);
  margin-bottom: var(--space-5);
}
.blog-other-hubs__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
```

Renders the 7 other destinations as `.chip` pill links (no need to repeat full cards).

## 4.4 Destinations index (`/blog/destinace/`)

New page-wide layout:

```css
.dests-index {
  padding-bottom: var(--space-8);
}
.dests-index__section {
  max-width: 1200px;
  margin-inline: auto;
  padding: var(--space-7) var(--space-6);
}
.dests-index__hero {
  position: relative;
  min-height: 60vh;
  color: var(--white);
  display: flex;
  align-items: end;
  overflow: hidden;
  background: var(--ink);
}
.dests-index__hero img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dests-index__hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(15, 29, 46, 0.9),
    rgba(15, 29, 46, 0.3) 60%,
    transparent
  );
}
.dests-index__hero-body {
  position: relative;
  z-index: 2;
  padding: var(--space-7);
}
.dests-index__block {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-7);
  align-items: start;
  padding: var(--space-7) var(--space-6);
  border-top: 1px solid var(--line);
  max-width: 1200px;
  margin-inline: auto;
}
.dests-index__block-thumb {
  aspect-ratio: 4/3;
  border-radius: 14px;
  overflow: hidden;
}
.dests-index__block-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dests-index__block-meta {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
}
.dests-index__block-title {
  font-size: var(--fs-h1);
  margin-bottom: var(--space-3);
}
.dests-index__block-latest {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-5);
}
@media (max-width: 900px) {
  .dests-index__block {
    grid-template-columns: 1fr;
  }
  .dests-index__block-latest {
    grid-template-columns: 1fr;
  }
}
```

`renderDestinationsIndexPage()`:

1. Full-bleed hero (cover image of first hub, eyebrow "Všechny destinace", display title "Kam vás zavést")
2. For each hub, a `.dests-index__block`: left = hub image + meta, right = destination name + intro + 3 latest cards

## 4.5 404 / empty

```css
.notfound {
  max-width: 720px;
  margin: var(--space-9) auto;
  text-align: center;
  padding: 0 var(--space-5);
}
.notfound__icon {
  margin-bottom: var(--space-5);
}
.notfound__title {
  font-size: var(--fs-h1);
  margin-bottom: var(--space-4);
}
.notfound__sub {
  color: var(--muted);
  margin-bottom: var(--space-6);
}
.notfound__ctas {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}
```

`renderNotFoundPage()`: add SVG `MapPinOff` inline icon, "Článek nebyl nalezen" title, two CTAs (Zpět na blog, Hledat zájezdy).
`renderEmptyList()`: same component with "Zatím zde nic není" + same CTAs.

---

## Verification

- `/blog/destinace/recko/` — hero shows Řecko, hub article grid, "Další destinace" chips
- `/blog/destinace/` — hero + 8 stacked blocks with thumb + 3 latest
- `/blog/this-does-not-exist/` — pretty 404 with icon

## Commit

```
feat(blog): hub, destinations index, 404, empty state redesign
```

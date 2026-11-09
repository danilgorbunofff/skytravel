# Phase 2 — Home page redesign (hero, featured strip, hub showcase)

**Goal:** turn `/blog/` from a flat listing into a magazine homepage. This is the highest-visibility page and the one most likely to "look ugly" today.

**Files touched**

- `client/public/assets/blog.css` — home-specific rules
- `server/src/blog/render.ts` — `renderListPage` and `blogHero` rewritten
- `client/public/assets/blog/hero-fallback.jpg` — replaced with 1920×1080 WebP

---

## 2.1 Hero (full-bleed, magazine)

```css
.blog-hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  min-height: 88vh;
  overflow: hidden;
  background: var(--ink);
}
.blog-hero__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}
.blog-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    rgba(15, 29, 46, 0.85) 0%,
    rgba(15, 29, 46, 0.55) 50%,
    rgba(15, 29, 46, 0.2) 100%
  );
}
.blog-hero__content {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-7);
  align-items: end;
  padding: var(--space-9) var(--space-6) var(--space-7);
  color: var(--white);
}
.blog-hero__title {
  font-size: var(--fs-display);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--white);
  max-width: 18ch;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.blog-hero__sub {
  color: rgba(255, 255, 255, 0.85);
  max-width: 48ch;
}
.blog-hero__meta {
  font-size: var(--fs-small);
  color: var(--yellow);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: var(--space-5);
}
@media (max-width: 768px) {
  .blog-hero__content {
    grid-template-columns: 1fr;
  }
  .blog-hero__title {
    font-size: clamp(2rem, 8vw, 3rem);
  }
}
```

## 2.2 Featured strip (asymmetric 3-up)

```css
.blog-featured {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-5);
  padding: var(--space-7) var(--space-6);
  max-width: 1200px;
  margin-inline: auto;
}
.blog-featured__main {
  grid-row: span 2;
}
.card-article {
  background: var(--white);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}
.card-article:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.card-article__img {
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--blue-50);
}
.card-article__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.card-article:hover .card-article__img img {
  transform: scale(1.05);
}
.card-article__body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}
.card-article__title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: var(--fs-h3);
  font-weight: 800;
  color: var(--ink);
}
.card-article__excerpt {
  color: var(--muted);
  font-size: 0.95rem;
}
.card-article__meta {
  margin-top: auto;
  font-size: var(--fs-small);
  color: var(--muted);
}
@media (max-width: 900px) {
  .blog-featured {
    grid-template-columns: 1fr 1fr;
  }
  .blog-featured__main {
    grid-column: span 2;
    grid-row: auto;
  }
}
@media (max-width: 560px) {
  .blog-featured {
    grid-template-columns: 1fr;
  }
  .blog-featured__main {
    grid-column: auto;
  }
}
```

## 2.3 Hub showcase (4-col)

```css
.blog-hubs {
  background: var(--sand);
  padding: var(--space-8) var(--space-6);
}
.blog-hubs__head {
  max-width: 1200px;
  margin: 0 auto var(--space-6);
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
}
.blog-hubs__title {
  font-size: var(--fs-h1);
}
.blog-hubs__grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
}
.card-hub {
  position: relative;
  aspect-ratio: 4/5;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: block;
  text-decoration: none;
  color: var(--white);
}
.card-hub::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 29, 46, 0.85) 0%, rgba(15, 29, 46, 0.1) 60%);
  z-index: 1;
}
.card-hub__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.card-hub:hover .card-hub__img {
  transform: scale(1.08);
}
.card-hub__body {
  position: relative;
  z-index: 2;
  height: 100%;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  justify-content: end;
}
.card-hub__name {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--white);
  transition: transform 0.25s ease;
}
.card-hub:hover .card-hub__name {
  transform: translateX(4px);
}
.card-hub__count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--yellow);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: var(--space-2);
}
@media (max-width: 1024px) {
  .blog-hubs__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .blog-hubs__grid {
    grid-template-columns: 1fr;
  }
}
```

## 2.4 Listing section (the "Nejnovější články" grid)

```css
.blog-latest {
  padding: var(--space-8) var(--space-6);
  max-width: 1200px;
  margin-inline: auto;
}
.blog-latest__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  gap: var(--space-5);
  flex-wrap: wrap;
}
.blog-latest__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
@media (max-width: 900px) {
  .blog-latest__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 560px) {
  .blog-latest__grid {
    grid-template-columns: 1fr;
  }
}
```

## 2.5 Render template changes (in `render.ts`)

- `blogHero()` → emits new `.blog-hero` structure with `<div class="blog-hero__bg">` (full-bleed `hero-fallback.jpg`), overlay, content grid with eyebrow, display title, subhead, primary CTA + secondary scroll cue, meta line
- `renderListPage()` → wraps the page in three sections:
  1. hero (replaces current mini hero)
  2. `.blog-featured` with first 3 posts (first takes `.blog-featured__main` and uses larger image variant)
  3. `.blog-hubs` (only on page 1) — destination cards
  4. `.blog-latest` — remaining posts as 3-col grid
- Add `articleCategory(p)` helper — pick first non-destination tag

## 2.6 Asset

- `client/public/assets/blog/hero-fallback.jpg` — regenerate at 1920×1080, optimized JPEG 78% quality; or use WebP with `.jpg` fallback in `<picture>`

---

## Verification

- `npm --workspace server run build`
- `npm --workspace server run test`
- Restart server, open `http://localhost:4000/blog/` — hero full-bleed, 3-up featured, hub grid with photos visible, latest grid below

## Commit

```
feat(blog): magazine home — full-bleed hero, featured strip, hub showcase
```

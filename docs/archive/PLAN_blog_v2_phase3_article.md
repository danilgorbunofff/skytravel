# Phase 3 — Article page (cover, reading column, TOC, related, end block)

**Goal:** make individual articles feel like a real publication — proper cover, magazine reading column, accessible navigation, and a finished end block.

**Files touched**

- `client/public/assets/blog.css` — article-specific rules
- `server/src/blog/render.ts` — `renderArticlePage` rewrite of header area + body wrappers + end block
- `server/src/blog/toc.ts` — `renderTocNav()` extended with floating-rail class

---

## 3.1 Article cover (60vh full-bleed)

```css
.article-cover {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: end;
  overflow: hidden;
  background: var(--ink);
  color: var(--white);
}
.article-cover__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.95;
}
.article-cover__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(15, 29, 46, 0.92) 0%,
    rgba(15, 29, 46, 0.4) 60%,
    transparent 100%
  );
}
.article-cover__inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding: var(--space-7) var(--space-6);
}
.article-cover__chips {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.article-cover__title {
  font-size: var(--fs-display);
  color: var(--white);
  max-width: 22ch;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.article-cover__meta {
  margin-top: var(--space-4);
  display: flex;
  gap: var(--space-4);
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--fs-small);
  flex-wrap: wrap;
  align-items: center;
}
.article-cover__meta .chip {
  background: rgba(255, 255, 255, 0.15);
  color: var(--white);
}
```

## 3.2 Reading column (66ch, 18px, 1.7)

```css
.article-body {
  max-width: var(--measure);
  margin-inline: auto;
  padding: var(--space-8) var(--space-5);
  font-size: 1.125rem;
  line-height: 1.7;
  color: var(--ink);
}
.article-body h2 {
  font-size: var(--fs-h2);
  margin-top: var(--space-8);
  margin-bottom: var(--space-4);
  position: relative;
  padding-bottom: var(--space-3);
}
.article-body h2::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 50px;
  height: 3px;
  background: var(--yellow);
}
.article-body h3 {
  font-size: var(--fs-h3);
  color: var(--blue-600);
  margin-top: var(--space-6);
  font-family: "Manrope", sans-serif;
  font-weight: 800;
}
.article-body p {
  margin: 0 0 var(--space-5);
}
.article-body a {
  color: var(--blue);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
.article-body a:hover {
  color: var(--blue-600);
}
.article-body ul,
.article-body ol {
  margin: 0 0 var(--space-5);
  padding-left: var(--space-6);
}
.article-body li {
  margin-bottom: var(--space-2);
}
.article-body blockquote {
  margin: var(--space-6) 0;
  padding: var(--space-2) var(--space-5);
  border-left: 4px solid var(--blue);
  background: var(--blue-50);
  font-style: italic;
  color: var(--ink-soft);
  font-size: 1.1em;
}
.article-body blockquote p:last-child {
  margin-bottom: 0;
}
.article-body img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: var(--space-6) auto;
  box-shadow: var(--shadow-md);
}
.article-body figure {
  margin: var(--space-6) 0;
}
.article-body figcaption {
  text-align: center;
  font-size: var(--fs-small);
  color: var(--muted);
  margin-top: var(--space-2);
  font-style: italic;
}
.article-body > p:first-of-type::first-letter {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 4.5em;
  float: left;
  line-height: 0.85;
  margin: 0.05em var(--space-3) 0 0;
  color: var(--blue);
}
.article-body code {
  background: var(--blue-50);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--ink-soft);
}
```

## 3.3 Floating right-rail TOC

```css
.article-layout {
  position: relative;
  max-width: 1200px;
  margin-inline: auto;
  padding: 0 var(--space-5);
}
.toc {
  position: sticky;
  top: 6rem;
  float: right;
  width: 240px;
  margin-left: var(--space-6);
  padding: var(--space-4) 0 var(--space-4) var(--space-4);
  border-left: 1px solid var(--line);
  font-size: var(--fs-small);
}
.toc__title {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink);
  margin: 0 0 var(--space-3);
  font-size: 0.8125rem;
}
.toc__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc__item {
  margin: 0.4em 0;
}
.toc__item a {
  color: var(--muted);
  text-decoration: none;
}
.toc__item a:hover {
  color: var(--blue);
}
.toc__item--l3 {
  padding-left: var(--space-3);
}
@media (max-width: 1023px) {
  .toc {
    position: static;
    float: none;
    width: auto;
    margin: 0 0 var(--space-6);
    border-left: 0;
    border-top: 1px solid var(--line);
    padding-top: var(--space-4);
  }
}
```

In `toc.ts`, add `toc--rail` class to the outer `<nav>` so CSS targets it.

## 3.4 End block (related, tags, share, prev/next)

```css
.article-end {
  max-width: 1200px;
  margin: var(--space-8) auto 0;
  padding: var(--space-7) var(--space-6);
  border-top: 1px solid var(--line);
  display: grid;
  gap: var(--space-7);
}
.article-end__related h3,
.article-end__tags h3 {
  font-size: var(--fs-h2);
  margin-bottom: var(--space-5);
}
.article-end__related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
}
@media (max-width: 768px) {
  .article-end__related-grid {
    grid-template-columns: 1fr;
  }
}
.article-end__tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.article-end__share {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  color: var(--muted);
}
.article-end__share a {
  color: var(--blue);
  text-decoration: none;
  font-weight: 600;
}
```

`renderArticlePage` adds:

- After the cover: `<div class="article-layout">` containing the TOC (if ≥3 entries) and `<article class="article-body">`
- After body: `<section class="article-end">` with `.article-end__related`, `.article-end__tags`, `.article-end__share` (text link only), and existing prev/next nav

## 3.5 Reading progress bar (CSS-only, modern browsers)

```css
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--yellow);
  z-index: 60;
  transform-origin: left center;
  animation: reading-progress linear;
  animation-timeline: scroll(root);
  width: 100%;
}
@keyframes reading-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
```

Add `<div class="reading-progress"></div>` to `htmlShell` before `</body>` on article pages only.

---

## Verification

- Restart server, open an article page (e.g. `http://localhost:4000/blog/{slug}/`)
- Cover full-bleed, title 4rem+, reading column 66ch wide, drop cap on first paragraph, blockquotes styled, TOC floats right
- 47 tests still pass

## Commit

```
feat(blog): article page — cover hero, reading column, floating TOC, end block
```

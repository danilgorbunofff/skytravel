# Phase 1 — Design tokens, typography reset, component primitives

**Goal:** lay the editorial design system on top of the existing brand tokens. No visual change to the page yet, but every component written in later phases can rely on these tokens.

**Files touched**

- `client/public/assets/blog.css` — add tokens, reset, primitives
- `server/src/blog/render.test.ts` — add assertions for new class names

---

## 1.1 Token additions (top of `blog.css`, after existing `:root`)

```css
:root {
  /* ... existing brand tokens unchanged ... */

  /* Editorial ink & surface */
  --ink: #0f1d2e;
  --ink-soft: #1a2c44;
  --sand: #fbf7ee;
  --sea: #4ea2d6;
  --rust: #d76a3a;
  --blue-50: #eaf1fb;
  --blue-100: #d3e2f5;
  --blue-600: #1d4f9e;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(15, 29, 46, 0.06);
  --shadow-md: 0 8px 24px -8px rgba(15, 29, 46, 0.12);
  --shadow-lg: 0 24px 60px -20px rgba(15, 29, 46, 0.25);

  /* Fluid type scale */
  --fs-display: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --fs-h1: clamp(2rem, 3vw + 1rem, 3rem);
  --fs-h2: clamp(1.5rem, 1.5vw + 1rem, 2rem);
  --fs-h3: 1.25rem;
  --fs-body: 1.125rem;
  --fs-small: 0.875rem;

  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  /* Reading measure */
  --measure: 66ch;
}
```

## 1.2 Typography reset (replace `body` and heading rules)

```css
body {
  font-family:
    "Manrope",
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    sans-serif;
  font-size: var(--fs-body);
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2,
h3,
h4,
h5,
h6,
.blog-hero h1,
.display {
  font-family: "Barlow Condensed", "Manrope", sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--ink);
}
```

## 1.3 Primitives

```css
.eyebrow {
  display: inline-block;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rust);
  border-bottom: 2px solid var(--yellow);
  padding-bottom: 0.15em;
  margin-bottom: var(--space-3);
}

.display {
  font-size: var(--fs-display);
  letter-spacing: -0.015em;
}

.measure {
  max-width: var(--measure);
  margin-inline: auto;
}

.divider-yellow {
  width: 60px;
  height: 2px;
  background: var(--yellow);
  border: 0;
  margin: var(--space-5) 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.25em 0.7em;
  border-radius: 999px;
  background: var(--blue-50);
  color: var(--blue-600);
  text-decoration: none;
  white-space: nowrap;
}
.chip--rust {
  background: rgba(215, 106, 58, 0.12);
  color: var(--rust);
}
.chip--yellow {
  background: var(--yellow);
  color: var(--ink);
}
.chip a,
.chip a:hover {
  color: inherit;
  text-decoration: none;
}

.icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--blue-50);
  color: var(--blue);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

## 1.4 Test additions

Append to `render.test.ts`:

```ts
it("uses editorial primitives in headings and chips", () => {
  const p = renderListPage({
    heading: "Blog",
    intro: "i",
    canonicalPath: "/blog/",
    posts: [meta({ tags: ["Řecko", "pláže"] })],
    page: 1,
    totalPages: 1,
  });
  assert.ok(p.includes('class="eyebrow"'));
  assert.ok(p.includes('class="chip'));
  assert.ok(p.includes('class="measure"'));
});
```

---

## Verification

```bash
npm --workspace server run build
npm --workspace server run test -- --test src/blog/render.test.ts
```

Expected: all 46 existing tests + 1 new = 47 pass. No visual change yet.

## Commit

```
chore(blog): add editorial design tokens and primitives
```

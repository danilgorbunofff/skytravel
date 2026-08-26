# Phase 14 — Blog Visual Unification (Redesign to Main-Site System)

Status: **PLANNED** · Depends on: Phase 13 (SSR blog at `/blog`) · Owner: —

## 1. Goal

The blog (Phase 13) shipped functionally but visually detached: its own palette (`--sky-blue #0369a1`), `Segoe UI` typography, narrow `1080px` container, teal gradient header and soft cards bear no family resemblance to `sky-travel.tours` (blue `#123d8c`→`#2666cb`, yellow `#f3d43b`, `Barlow Condensed` + `Manrope`, `1340px` container, card radius `16px`, lift + yellow price-pill).

**This phase makes `/blog` feel “native”** — same header, same footer, same cards, same type scale and motion as the homepage, while preserving Phase 13’s SEO/SSR wins (no JS, CSP-safe, crawlable, filesystem-driven). No route or content-model changes; only HTML shell + CSS.

Non-goals: new frameworks, JS for blog pages, admin UI, content migration.

## 2. Audit — where we are vs. where we should be

| Area              | Current blog (`/assets/blog.css` + `render.ts`)                               | Main site (`site.css` + `index.css` + `index.html`)                                                                                                                                                                                                            | Delta to fix                                                                            |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Palette**       | `--sky-blue #0369a1`, `--sky-dark #0c4a6e`, `--sand #fef3c7`, `--ink #0f172a` | `--blue-900 #123d8c`, `--blue-800 #1b4da8`, `--blue-700/#blue #2666cb`, `--yellow #f3d43b`, `--bg #eef3fa`, `--text #223147`, `--muted #6b778b`, `--line #d7e0ee`, `--white #fff`; Tailwind `--color-primary #1e40af`, `--radius-lg .75rem / --radius-xl 1rem` | Blog uses teal/sky that never appears on homepage; yellow is pale sand not brand yellow |
| **Typography**    | `Segoe UI/system-ui`, blog `h1 clamp 1.8–2.5rem`, prose `1.05rem/1.65`        | Body `Manrope` (fallback `Segoe UI`), headings + `.logo` + `.main-nav` = `Barlow Condensed` `0.02em` tracking, hero `h1 clamp 2.6–4.9rem 800`, section `h2 clamp 2.1–3.6rem 800`, label `Barlow 0.95rem 800 uppercase`                                         | Headings feel “generic editorial” on blog vs. condensed travel brand on main            |
| **Layout**        | `.blog-container max 1080px/20px`, `.blog-main pb 48px`                       | `.container min(1340px, 92vw)` everywhere, sections `2rem 0`, sticky header split (84px top + 64px nav)                                                                                                                                                        | Blog feels cramped, different gutters                                                   |
| **Header**        | Custom `.blog-header` teal gradient, logo 1.5rem, nav 2 links (Zájezdy/Blog)  | `.site-header sticky` white, `border line`, `.header-top grid 240px 1fr auto` (logo `2.8rem` Barlow, `sky #2666cb` / `travel #e6a11c`), `.main-nav Barlow 1.5rem 800 blue-900` with lift hover; mobile drawer `site-nav-wrapper`                               | Users don’t recognise it as same site; mobile has no drawer                             |
| **Cards**         | `.post-card` 12px radius, `bg-soft #f8fafc + line border`, subtle shadow      | `.hotel-card`/`.destination-card`/`.favorite-card`: 16px radius, `shadow 0 16-24px rgba(27,39,59,.18)`, hover `translateY(-4px)`, yellow `.price-pill`, image `object-cover`                                                                                   | Blog cards look “bootstrap”, not “OTA”                                                  |
| **Hub/nav chips** | Pill `line border → e0f2fe on hover`                                          | Not directly but `.budget-filters button` pattern: pill `9-12px`, `d8e6ff` bg, `yellow` active indicator, or category chips in footer `1652b2→123f8f`                                                                                                          | Inconsistent affordance                                                                 |
| **CTA**           | `.cta-box gradient sky-dark→sky-blue`, `.cta-btn sand #fef3c7`                | `.hero__btn blue-900 / yellow`, `.hero-search__footer button yellow 14px`, `.hotel-price yellow Barlow 1.95rem`                                                                                                                                                | CTA doesn’t pop same way                                                                |
| **Prose**         | `.prose` 1.05rem, `blockquote line blue`, `code bg-soft`, table `line`        | No editorial prose elsewhere, but modal `.detail-modal__description 1rem/1.5 #2d456e` + general `line-height 1.35`. Blog needs richer spec that still uses Manrope + blue-900 headings                                                                         | Too airy vs. tight main-site density                                                    |
| **Footer**        | One-line `bg-soft #f8fafc`, `line` top, muted text                            | `.footer #dfe7f2`, `.footer-top-cats gradient #1652b2→#123f8f 16px`, `.footer-main 3col grid`, `.footer-bottom bed0ea`                                                                                                                                         | Feels unfinished / different domain                                                     |
| **Motion**        | `0.15s ease`                                                                  | `220ms ease` lift + `popover-in 220ms cubic-bezier(.18,.89,.32,1.28)`, hero `900ms`                                                                                                                                                                            | Minor but contributes to “other site” feel                                              |
| **Fonts loaded**  | None (system)                                                                 | `preconnect googleapis+gstatic+unsplash`, `Barlow Condensed 600/700/800 + Manrope 400-800 + Noto Sans`                                                                                                                                                         | Blog FOIT/FOUT mismatch if we just inherit system                                       |

See: `client/src/site.css:1-12` (`:root` tokens), `:28-56` (Barlow+Manrope), `92-225` (header+nav), `534-596` (section/card tokens), `1285-1410` (footer), `client/index.html:44-50` (font links), `client/public/assets/blog.css` (entire file), `server/src/blog/render.ts:143-159` (`siteHeader/siteFooter`).

## 3. Design-system source of truth (what the blog must now import)

Reuse — do not fork. Blog CSS becomes a thin extension of `site.css` foundations:

- **Tokens:** `site.css :root` (`--blue-*`, `--yellow`, `--bg`, `--text`, `--muted`, `--line`, `--white`) + `index.css @theme` (`--color-primary #1e40af`, `--radius-*`, `--color-ring #3b82f6`). Remove every `--sky-* / --sand`. Map: `sky-blue→blue-700`, `sky-dark→blue-900`, `sand→yellow`, `ink→text`, `bg-soft→#f6f7f9` (section-white) or `#fff`.
- **Typography:** `Barlow Condensed 800` for every blog `h1/h2/h3`, logo, nav, price-pill, tag (`0.02em` tracking). `Manrope 400/600/700/800` for body, meta, prose, buttons. Keep `Noto Sans` fallback for `html[lang="uk"/"ru"]` headings. Sizes: list `h1 clamp 2.1-3.6rem` (same as `.section-head h2`), article `h1 clamp 2.2-3.2rem` (slightly smaller than hero, larger than current 2.5rem), prose `1rem/1.55`.
- **Layout:** `.container` everywhere (`min(1340px,92vw)`), `.section` padding `2rem 0`, `.section-white` vs `.section-soft` backgrounds to group blocks (mirrors homepage alternating). Max reading width `760px` stays but _inside_ a container, not replacing it.
- **Radius/shadow/motion:** `16px` for cards/hero/CTA, `12px` for pills/inputs, `10-14px` for buttons; `box-shadow 0 16px 24px rgba(27,39,59,.18)` → hover `0 20px 28px`; `transform 220ms ease`, `filter 180ms`.
- **Fonts:** add same `<link>` to Google Fonts in SSR `head()` (`Barlow Condensed 600/700/800` + `Manrope 400-800`), keep existing `preconnect` hints.

## 4. UX decisions (blog-only)

| Decision                  | Choice                                                                                                                                                                                                                                                                                                                                     | Why it matches main site                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Header reuse              | Replace `blog-header` with verbatim `site-header` markup from `HomePage.tsx:398-577` (logo 2-color, `.top-search` hidden on blog? keep empty slot; `.header-contact` phone/email; `.lang-toggle`; `.main-nav` with `is-active` on Blog). SSR renders desktop + mobile drawer already open via `site-nav-wrapper` classes, no JS needed.    | Users get identical chrome; active Blog link highlighted `blue-700` like main nav hover                             |
| Footer reuse              | Replace one-line `blog-footer` with full `.footer` (`footer-top-cats` 4col gradient + `footer-main` 3col + `footer-bottom` + `newsletter`). Hardcode same Czech content as homepage footer, links to `/search?destination=…`, `/blog`, anchors.                                                                                            | Closes the “orphan” feel; also gives 4 extra internal links per page for SEO                                        |
| Blog hero (list+hub only) | Thin `section.hero--blog` (no carousel): `min-height 360px` (not 700), same `hero__overlay` gradient, `hero__content` h1 + p, but reuse `site.css .hero` shell so blog pages share the “blue over photo” language. Photo = per-hub Unsplash or generic `photo-146947…` from `social-banner`. Overlaps option: keep hero-search-wrap empty. | Hub pages gain emotional photo like homepage; listing pages get recognisable hero rhythm without duplicating search |
| Layout mode               | `site.css` already handles 12-col grids and stacks at `768px`. Blog reuses: list = `.hotel-grid` (4col) re-skinned; alternate: keep `post-grid auto-fill 300px` but set gap `1rem` and radius `16px` to converge. Decision: keep `post-grid` for simplicity but restyle to hotel-card language (16px, yellow price-pill for date, lift).   | Keeps diff small, but visual convergence high                                                                       |
| Post card language        | `post-card` → `hotel-card` variant: white body, image `height 180px object-cover 16/9`, `hotel-topline` stars→date, `price-pill` repurposed as `dest-pill yellow?` Actually keep `dest-badge blue-900` (like `own-badge`) + `time` muted; excerpt `Manrope 0.96rem #4a5e7b`; `h2 1.9rem blue-900 Barlow`                                   | Cards become indistinguishable from last-minute/hotel cards                                                         |
| Prose language            | Inside `.detail-modal__description` style + `.prose` merged: `max-width 760px`, `color #2d456e`, `h2 blue-900 Barlow 1.9rem`, `a blue-700 underline-offset`, `blockquote line blue-700 + bg #f6f7f9`, `code #f1f5fb`, table `line #d7e0ee`                                                                                                 | Editorial still distinct but inherits brand                                                                         |
| CTA                       | Replace teal `cta-box` with `hotel-price`/`hero__btn` language: `background var(--yellow)`, `color var(--blue-900)`, `Barlow 1.8rem 800`, `border-radius 14px`, shadow `0 12px 22px rgba(23,43,76,.28)`. Wrap in `section.section-soft` so it breathes like homepage banners                                                               | Single yellow CTA = main-site action colour                                                                         |
| Pagination                | Replace pill `38px` with `.budget-filters` language: `gap .55rem`, `indicator yellow` via active class, button `is-active transparent`. Keep semantic `nav.pagination` but style as pill row                                                                                                                                               | Familiar segmented control                                                                                          |
| Breadcrumbs               | Keep semantic `<nav breadcrumb>` but style as `Manrope .85rem muted #6b778b`, separator `›` (not `/`), link `blue-700`, current `blue-900 700`                                                                                                                                                                                             | Lighter than current `/` which feels file-system                                                                    |

No changes to routes, slugs, loader, sitemap/RSS, or rate-limiting; purely `render.ts` HTML strings + `blog.css`.

## 5. Page-level redesign (information unchanged, chrome unified)

### 5.1 `/blog` (list, page 1+)

```
[site-header sticky] (logo 2-color + main-nav Blog=is-active)
[hero--blog 360px + overlay + photo (generic beach) ]
  h1 “SkyTravel Blog”  Barlow 3.6rem blue-900 / white if over hero
  p  list-intro muted  (same 1.2rem #4e6281)
[.section .section-white] post-grid (4col→2→1) hotel-card variants, 12/page, pagination
[.section .section-soft] hub-grid h2 Barlow 2.1rem + pills (budget-filters pattern)
[footer full]
```

_Hero photo suggestion:_ same Unsplash as `social-banner` (`photo-1469474968028…`) so blog and social section rhyme.

### 5.2 `/blog/destinace/:slug` (hub)

Same chrome + hero but photo per destination (Bulharsko→ Zlaté písky, Chorvatsko→ Istrie, etc — `heroImages[0]` mapping). Title `h1` = CzechName (`Barlow`), intro `section-subtitle`. Grid = filtered posts only. `other-hubs` chips below grid. CTA `section.section-blue` yellow button “Hledat zájezdy do {Name}”.

### 5.3 `/blog/:slug` (article)

```
[site-header]
[breadcrumb white on soft bg]
[.section .section-white ]
  article.blog-article max 760px centred:
    dest-badge blue-900 pill  (own-badge language)
    h1 Barlow 2.6rem blue-900  (#223147 in site.css but use blue-900 for editorial punch)
    meta  Manrope .9rem muted + dot separators + reading time
    cover  16px radius, 1200×675, shadow 0 12px 22px
    .prose  (see §7)
    .tag-list muted small
    .cta-box  → yellow button in section-soft
    related-posts  h2 Barlow + ul li hotel-card mini? keep simple list but style as card row for 768+
```

No author page, no comments. Keep `BlogPosting` + `BreadcrumbList` JSON-LD untouched; OG image stays `/images/blog/og-default.jpg` until per-article OG generated.

### 5.4 `/blog/rss.xml`, `/sitemap.xml`, `404`

No visual change for machine endpoints. `renderNotFoundPage()` restyled to `section 4rem 0`, `h1 Barlow 3rem blue-900`, two yellow buttons (Blog, Hledání zájezdů).

## 6. Component catalog (what changes in code)

| Component (render.ts function) | Current                                            | Redesign spec (maps to site.css)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `head()`                       | Hardcoded `<link stylesheet /blog.css>` + raw meta | Add `<link href="https://fonts.googleapis.com/css2?...Barlow+Condensed...Manrope...">`, two `<link rel="preconnect">` (googleapis, gstatic) like `index.html:44-50`. Keep `canonical`, `og:locale cs_CZ`, `BlogPosting` JSON-LD. Keep href `/assets/blog.css` (no hash). Add `color-scheme light` meta.                                                                                                                                                                                                                                           |
| `siteHeader()`                 | `<header.blog-header gradient teal>` 2 links       | Full `HomePage.tsx` header clone: `div.site-header > div.container.header-top` (logo 2 spans `logo__sky/blue-700` + `logo__travel #e6a11c`, `top-search` placeholder disabled `aria-hidden`, `header-contact` phone/email from footer, `lang-toggle` 2 buttons inactive) **plus** `div.site-nav-wrapper > nav.main-nav` with `a is-active` on Blog. Include mobile burger button markup (no JS, `hidden md` via CSS). SSR renders both desktop and collapsed markup; CSS hides drawer at `>768px` exactly as site.css `desktop-only/mobile-only`. |
| `siteFooter()`                 | One-line `bg-soft`                                 | Full `.footer`: `footer-top-cats 4col` (hardcoded same 4 categories as HomePage footer), `footer-main 3col` (newsletter input + yellow button, social, contact), `footer-bottom bed0ea` with © + links to `/blog` + `/sitemap.xml`. Copies wording from `site.css 1285-1410` and `HomePage` footer block.                                                                                                                                                                                                                                         |
| `breadcrumbNav()`              | `/` sep, `sky-blue` links                          | Separator `›` (U+203A), container `max-width 1340px` via `.container`, font `Manrope .85rem`, link `blue-700`, current `blue-900 700`, padding `12px 0` on `section-white` bg. No background card.                                                                                                                                                                                                                                                                                                                                                |
| `postCard()`                   | `bg-soft` + line + 12px + soft hover               | Base on `.hotel-card`: `background #f3f4f7→#fff` (use `#fff` for blog to stay editorial), `radius 16px`, `shadow 0 12px 22px rgba(23,43,76,.15)` → hover `0 18px 26px`, `img height 180px object-cover`, `body padding .9rem`, `h2 Barlow 1.9rem blue-900`, `p.excerpt Manrope .95rem #4a5e7b line 1.5`, `dest-badge blue-900 pill` top-left of card? Keep under date. Footer link `→ Čist dále` becomes `hotel-price`-style `yellow 1.1rem Barlow`? Actually keep text link `blue-700 600 .9rem` + underline on hover to stay editorial.         |
| `hub-grid / other-hubs`        | `999px pill line→e0f2fe`                           | `budget-filters` pattern: `display inline-flex gap .55rem p .55rem radius 12px bg #fff`, indicator `yellow 9px` via `a.is-active` (count chip). Or simpler: keep 999px but bg `d8e6ff` inactive → `yellow` active, text `blue-900 800`.                                                                                                                                                                                                                                                                                                           |
| `.list-header`                 | `clamp 1.7-2.4rem`                                 | Use `section-head`: `h1 clamp 2.1-3.6rem 800 Barlow blue-900`, `p.section-subtitle 1.2rem #4e6281 700`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `.prose`                       | `Segoe 1.05/1.65` generic                          | `font Manrope 1rem/1.55 #2d456e`, `h2 Barlow 1.9rem blue-900 mt 2em`, `h3 1.25rem`, `a blue-700 underline-offset .12em`, `blockquote 4px blue-700 + bg #f6f7f9 + muted`, `table header #f6f7f9`, `code #f1f5fb line var(--line)`, `img radius 12px`, `pre 8px`. Max width 760, measure 70ch, keep `overflow-wrap break-word`.                                                                                                                                                                                                                     |
| `ctaBox()`                     | `gradient teal` + `sand` button                    | `.cta-box` → `.section.section-soft` card: `background #fff border 1px line radius 16px p 1.4rem shadow`, title `Barlow 1.6rem blue-900`, text `Manrope muted`, button `hero__btn yellow` (`min-height 62px min-width 180px 14px Barlow 1.8rem`). Full-width on mobile.                                                                                                                                                                                                                                                                           |
| `pagination`                   | `38px pill line→e0f2fe`                            | `.budget-filters` pill row rendered as `nav.pagination` plus `budget-indicator` for active page; fallback simple pill if JS-less indicator impossible: active `background yellow border yellow blue-900`, inactive `d8e6ff` like filters. Keep `rel prev/next` + `aria-current`. Info `pagination-info muted .85rem`.                                                                                                                                                                                                                             |
| `related-posts`                | `li border-bottom + blue link`                     | Render as `hotel-grid` row of 2-3 mini cards (`hotel-card` compact) when ≥2 related, else list. Title `Barlow 1.95rem` like `.footer-main h5`.                                                                                                                                                                                                                                                                                                                                                                                                    |

All strings stay Czech; no `any`, strict `import type` kept.

## 7. Responsive & a11y

- Breakpoints mirror `site.css`: `768px` (1col grids, stacked hero-search, hide `lm-nav`, show `mobile-only`), `900px` (allinc carousel arrows outside), `1340px` container. Blog hero 360px → 260px at `768px`.
- `prefers-reduced-motion` disables card lift (like `site.css:46-56`, `878-885`).
- Focus: `index.css:41-44` `:focus-visible 2px solid --color-ring #3b82f6` already covers SSR pages because they use same tokens.
- Breadcrumb `aria-label Drobečková navigace`, pagination `aria-label Stránkování`, `aria-current=page`.
- Colour contrast reuses main-site combos already at `4.5:1`+ (`muted #4b5563 on white` override in index.css:36-38; `blue-900 #123d8c` on yellow `#f3d43b` AA).

## 8. Technical plan (files)

- **Overwrite** `client/public/assets/blog.css` (also `client/public/blog.css` copy for legacy `/blog.css` fallback) — full replacement, ~450-550 LOC. Starts with `:root` copy from `site.css:1-12` plus fonts import, then `.site-header/.main-nav/.container/.section/.hotel-card/...` subset copied verbatim, then blog-only `.blog-article/.prose/.breadcrumb--blog/cta-box--blog` extensions. No `@import "tailwindcss"` — plain CSS.
- **Edit** `server/src/blog/render.ts`: `head()` add Google Fonts links + preconnect; `siteHeader()/siteFooter()` expand to full chrome (see table); `postCard()` restyle strings; `list-header` class → `section-head`; `ctaBox()` new markup; `htmlShell()` wraps `body` content with `.section.section-white/soft` like homepage sections rather than bare `<main>`. Keep `escapeHtml`, `jsonLd`, `formatDateCs` untouched. Keep `renderRss()` unstyled.
- **No change** `server/src/blog/loader.ts`, `slug.ts`, `types.ts`, `server/src/routes/blog.ts` (maybe pagination links keep `?page=` query — styling only), `server/src/routes/sitemap.xml.ts` (already fixed for DB timeout + trailing slash), `server/src/app.ts` CSS serving (already serves `/assets/blog.css` + fallback), `client/vite.config.ts` proxy, `HomePage.tsx` navBlog (already merged).
- **Assets:** single hero fallback photo URL (reuse `https://images.unsplash.com/photo-1469474968028…` already in `social-banner`). No new binary assets this phase.
- **Build:** Still `npm --workspace server run build` copies no CSS (CSS stays under `client/public` → `client/dist/assets/blog.css` via Vite copy). `client build` already copies `public/assets/blog.css` to `dist/assets/blog.css`.

## 9. Implementation steps

| #   | Step                   | Touches                                                                            | DoD                                                                                                                                                                                                                                                                                |
| --- | ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Token-align stylesheet | `client/public/assets/blog.css` + duplicate `client/public/blog.css`               | `grep` shows no `--sky-*`/`--sand` remaining; `--blue-900 / --yellow / --bg / --line` present; `Barlow Condensed` + `Manrope` declared; `.site-header/.main-nav/.container/.footer` rules copied from `site.css` verbatim (visual diff = identical)                                |
| 2   | SSR chrome             | `server/src/blog/render.ts` `head/siteHeader/siteFooter`                           | View-source of `/blog/` shows full sticky header + 4-col footer, fonts preconnect, no inline JS; header `Blog` link has `class=is-active`/`aria-current`; Lighthouse “no CSP violation” still zero inline scripts                                                                  |
| 3   | List & hub pages       | `render.ts` `renderListPage/renderHubPage/postCard/hubGrid` + blog.css grid tweaks | `/blog/` + `/blog/destinace/bulharsko/` grids render 4→2→1 like hotel-grid; section-head typography matches homepage `h2 clamp`; hub hero 360px image visible                                                                                                                      |
| 4   | Article page           | `render.ts` `renderArticlePage/ctaBox/prose`                                       | `/blog/<slug>/` shows `max 760px` centred prose, Barlow h2, yellow CTA `Barlow 1.8rem`, related as mini-cards (or list), breadcrumb `›` ; SEO head/meta/JSON-LD unchanged (curl asserts)                                                                                           |
| 5   | Polish & parity        | Pagination, 404, hover/motion, reduced-motion, focus ring                          | `/blog/page/2/` pagination pills yellow-active; `/blog/neexistuje` 404 styled with two yellow buttons; `prefers-reduced-motion` disables lift; keyboard tab shows `2px ring #3b82f6`                                                                                               |
| 6   | Validation             | —                                                                                  | `npm run lint`, `npm --workspace server run build`, `npm --workspace client run build` all 0 warnings new; manual `curl` against `:4000` and `5173` for each route (200, hasCss, has breadcrumb JSON-LD, no `Access denied`); optional `npm --workspace client run test` unchanged |

Size: ~350 LOC CSS replace + ~180 LOC render.ts edits, no new deps.

## 10. Out of scope (explicitly not this phase)

- Hero carousel JS, search form inside hero (keep `/search` link via CTA only)
- Per-article cover generation / OG image pipeline (`/images/blog/og-default.jpg` stays)
- Programmatic `lastmod` images, author bylines, reading-progress bar
- Moving blog CSS into Tailwind build (keep standalone `/assets/blog.css` for cache stability)
- Content work (new `.md` files) — covered by editorial, not code

## 11. Risks

- **Header duplication drift** — `site-header` copied as string literal will drift when homepage evolves. Mitigation: add `// SYNC: keep in sync with HomePage.tsx header` comment + a `render.test.ts` asserting `siteHeader()` contains `logo__sky`, `main-nav`, `site-header` tokens. Future extraction to shared EJS/partial if repeated.
- **Payload size** — full header+footer per blog page ≈ +4 KB HTML. Acceptable; `gzip` + `cache max-age 300 swr 600` already set on blog router.
- **Font double-load** — homepage and blog each `<link>` the same Google Fonts URL; browser caches, no extra cost. Keep identical `href` to maximise hit.
- **Nginx shadowing of `/sitemap.xml`** — already documented in Phase 13 §6; no change here but verify after deploy.

---

_Evidence used:_ `client/src/site.css:1-12,28-56,92-260,303-510,534-670,1033-1150,1285-1410` and `client/index.html:44-50` for main-site system; `server/src/blog/render.ts` and `client/public/assets/blog.css` for current blog; `PHASE_13_CZECH_BLOG_SEO.md` for route/SEO contracts.

# Phase 13 — Czech Travel Blog (SEO Funnel)

Status: **PLANNED** · Owner: — · Target domain: `https://sky-travel.tours`

## 1. Goal

Build a Czech-language blog under `/blog` on the same domain that ranks in Google for
informational travel queries ("dovolená Bulharsko", "pláže Řecko", "co sbalit na Krétu"…)
and funnels readers into the tour search (`/search?destination=…`).

**Why SSR from Express:** the SPA renders empty HTML for crawlers. Blog pages must return
complete HTML (meta tags, headings, content) in the initial response — no JS required.
We render template-literal HTML straight from Express. No new framework.

**Non-goals (this phase):** admin editing UI, comments, multi-language content,
newsletter integrations.

## 2. Decisions made

| Decision         | Choice                                                           | Rationale                                                               |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Content source   | Markdown files in repo (`server/content/blog/*.md`)              | Versioned, deploys with git pull; author workflow = commit + deploy     |
| Rendering        | SSR template literals in Express                                 | Crawlers get full HTML; zero client JS; works under existing helmet CSP |
| Markdown parsing | `marked` + `gray-matter` (server workspace)                      | Pure-JS, tiny, no native builds                                         |
| Loading          | Read `.md` at request time with bounded in-memory cache          | No build-step wiring; editing locally shows instantly                   |
| Styling          | Standalone `client/public/blog.css`, stable URL                  | SSR pages must not depend on hashed Vite bundles                        |
| URL scheme       | `/blog`, `/blog/:slug`, `/blog/destinace/:slug`, `/blog/rss.xml` | Clean, Czech-friendly slugs (ASCII-folded)                              |

## 3. Content model

Each article: `server/content/blog/<ascii-slug>.md`

```markdown
---
title: "Dovolená v Bulharsku 2026: kompletní průvodce"
description: "Kam jet, kolik to stojí, nejlepší plže a letoviska. Praktický průvodce dovolenou v Bulharsku na rok 2026."
destination: Bulharsko # must match Destination.czechName; omit for general posts
tags: [pruvodce, bulharsko]
published: 2026-03-15
updated: 2026-04-02 # optional
draft: false # true = hidden everywhere
cover: /images/blog/bulharsko-pruvodce/cover.jpg # optional, served from client/public
---

## Text článku v češtině …

Obsah s nadpisy, seznamy, odkazy na vyhledávání …
```

Rules enforced by the loader + a validation test:

- Filename = slug: lowercase ASCII, Czech diacritics folded (`ě→e`, `ř→r`, `ť→t`…),
  words joined with `-`.
- Slug uniqueness (duplicate ⇒ loader warns and keeps the newer post).
- `title` ≤ 60 chars, `description` ≤ 160 chars (SEO limits, warning only).
- `destination`, when set, must exist in `KNOWN_DESTINATIONS` (validation test fails otherwise).
- `draft: true` posts are excluded from lists, sitemap, RSS and return 404 on direct URL.

## 4. Routes & rendering

All mounted in `server/src/app.ts` via a new `server/src/routes/blog.ts` **before** the
404 handler. No rate limiting on blog routes (must stay crawlable; existing limiters only
cover `/api/*`).

| Route                       | Renders                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /blog`                 | Listing, newest first, paginated (`?page=N`, 12/page), rel=`prev/next`, self-canonical                                                                          |
| `GET /blog/:slug`           | Full article: `<article>` prose, breadcrumb, JSON-LD `BlogPosting` + `BreadcrumbList`, OG/Twitter meta, CTA box „Hledat zájezdy do X" → `/search?destination=X` |
| `GET /blog/destinace/:slug` | Hub page per country (~16 hubs): intro paragraph + all articles for that destination + strong CTA into search                                                   |
| `GET /blog/rss.xml`         | RSS 2.0, newest 30 published posts, `lastBuildDate`                                                                                                             |

HTML responses: `Cache-Control: public, max-age=300, stale-while-revalidate=600`;
RSS/sitemap: `max-age=600`. Compression applies automatically (existing middleware).

### New/changed server files

```
server/src/blog/
  types.ts            # BlogPost, BlogMeta interfaces
  slug.ts             # diacritic folding + slug helpers (+ .test.ts)
  loader.ts           # read/parse/validate/cached access, listByDestination, paginate (+ .test.ts)
  render.ts           # layout(), articlePage(), listPage(), hubPage() templates, escapeHtml (+ .test.ts)
server/src/routes/
  blog.ts             # Router mounting the four routes
  sitemap.xml.ts      # EXTEND: append /blog, hubs, all published posts with <lastmod>
client/public/
  blog.css            # standalone stylesheet for SSR pages (header/footer/prose/CTA)
server/content/blog/
  *.md                # 3 seed articles (Bulharsko, Řecko, Chorvatsko) + 1 general
```

Dependencies added to **server** workspace only: `marked`, `gray-matter`
(both pure JS — safe for production installs).

### XSS safety

All interpolated strings (title, description, plain-text fields) pass through
`escapeHtml`. Markdown body is rendered by `marked`; `marked` output is sanitized by
disabling raw HTML (`sanitize` via `marked` option `mangle:false` + we strip `<script>`
— content is authored by us, but the renderer stays defensive). Unit test asserts
malicious frontmatter values render escaped.

## 5. SPA & dev-server integration

1. Header nav (`HomePage.tsx`): new link „Blog" → `/blog` (plain anchor, full page load
   is correct here). Add `navBlog` key to `useLanguage` translations (cs + en).
2. `client/vite.config.ts`: dev-server proxy `"/blog"` → `http://localhost:4000`
   so local `npm run dev` serves SSR pages seamlessly.

## 6. Ops prerequisite (outside repo)

nginx on the VPS currently routes `/api` → :4000 and everything else → :4173 (UI).
Required addition:

```nginx
location /blog {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Also verify `/sitemap.xml` reaches the **dynamic Express route** (port 4000), not a stale
static file — otherwise new blog URLs never reach Google. Deployed via manual nginx edit;
not part of `deploy.yml`.

## 7. SEO checklist (implemented in this phase)

- [x] Full HTML SSR, semantic markup (`article`, `nav[aria-breadcrumb]`, heading hierarchy h1→h2→h3)
- [x] Unique `<title>` (≤60 chars) and meta description (≤155 chars) per page
- [x] Canonical URLs (self-referencing; page-1 listings omit `?page`)
- [x] Open Graph + Twitter card meta, `og:locale: cs_CZ`
- [x] JSON-LD: `BlogPosting` (headline, datePublished, dateModified, author=Publisher, image) and `BreadcrumbList`
- [x] Dynamic `sitemap.xml` includes blog index, hubs and every published post with `<lastmod>`
- [x] RSS feed + `<link rel="alternate" type="application/rss+xml">` discovery
- [x] Internal linking: every article links to its destination hub and into `/search?destination=…`; hubs cross-link sibling articles
- [x] Hub-and-spoke structure: 16 country hubs ↔ spoke articles
- [ ] After deploy: submit sitemap in Google Search Console (manual, owner task)

## 8. Implementation steps

| #   | Step                    | Files                                           | Acceptance criteria                                                                                                                                                                                            |
| --- | ----------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Slug + loader utilities | `server/src/blog/slug.ts`, `loader.ts` + tests  | Folding table covers full Czech alphabet; drafts hidden; sorted newest-first; destination filter works; duplicate slugs resolved deterministically                                                             |
| 2   | HTML rendering layer    | `server/src/blog/render.ts` + tests             | All templates escape interpolated text; valid HTML head/meta/JSON-LD; Czech UI strings centralized in one object                                                                                               |
| 3   | Router + app mount      | `server/src/routes/blog.ts`, `app.ts`           | 4 routes respond 200; unknown slug → 404 (JSON-free HTML 404 page); draft → 404; no rate limiter applied                                                                                                       |
| 4   | Stylesheet              | `client/public/blog.css`                        | Responsive, matches brand colors/logo; readable prose typography; no dependency on hashed assets                                                                                                               |
| 5   | Sitemap + RSS           | `sitemap.xml.ts`, `render.ts`/route             | Sitemap contains blog URLs + hubs with lastmod; RSS validates (w3c feed validator)                                                                                                                             |
| 6   | Seed content            | 4 `.md` files + cover images                    | Loader validation test passes; pages visually verified                                                                                                                                                         |
| 7   | SPA link + vite proxy   | `HomePage.tsx`, `useLanguage`, `vite.config.ts` | Nav shows „Blog"; local dev serves `/blog` through proxy; client lint/tests pass                                                                                                                               |
| 8   | Validation run          | —                                               | `npm --workspace server run test`, `npm --workspace client run test`, `npm run lint`, `npm run build` all green; curl checks against dev server: status codes, presence of title/description/JSON-LD/canonical |

Estimated size: ~700–900 LOC including tests. Steps 1–3 are the core; 4–7 polish.

## 9. Testing strategy

- **Unit (Node runner, server workspace):** slug folding, loader (parsing/validation/filtering/cache bounds), render escaping, sitemap XML shape.
- **Manual smoke:** `npm run dev` → visit `/blog`, one article, one hub, `/blog/rss.xml`, `/sitemap.xml`.
- **Optional Playwright:** one spec asserting `/blog` returns rendered `<article>` elements (runs against dev server like existing E2E).

## 10. Risks & mitigations

| Risk                                          | Mitigation                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Server memory limit (450 MB)                  | Only parsed metadata kept in a bounded Map; bodies cached with LRU cap; typical total < 5 MB even at 500 articles   |
| nginx misconfig hides blog in prod            | Step 8 includes curl check against production URL after deploy; documented in RUNBOOK update                        |
| Static `/sitemap.xml` shadowing dynamic route | Explicit verification + fix in nginx (§6); robots.txt already points to the right URL                               |
| Thin/duplicate AI content ranking poorly      | Editorial guideline in §3 (min length, unique value, real local knowledge); quality gate is human review at PR time |
| Publishing latency (commit+deploy)            | Accepted for this phase; admin CRUD on top of same loader is a natural Phase 14 if needed                           |

## 11. Future extensions (out of scope now)

- Admin CRUD reusing TipTap editor writing back to Markdown/DB
- Article schema: FAQ blocks with `FAQPage` JSON-LD (rich results)
- Programmatic landing pages per region/resort once destinations gain granularity
- WebSub/Pingback, IndexNow ping on publish

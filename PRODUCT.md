# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Client: React 18 SPA, Vite 8 (Rolldown), Tailwind v4 (`@tailwindcss/vite`, no config file), TypeScript strict, React Router 6, Zustand 5, Radix UI, Lucide icons, TipTap (admin only).
- Server: Express 4 REST API, Prisma 7 + MySQL, `express-session` cookie sessions, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `multer`, `nodemailer`, `fast-xml-parser`, `pino`, `zod`, TypeScript strict, ESM.
- Tests: Node test runner + tsx (server), Vitest + Testing Library + jsdom (client), Playwright (E2E).
- Tooling: ESLint 9 flat config + Prettier, Husky + lint-staged, npm workspaces (Node ≥ 20).
- Deploy: Hetzner VPS, PM2-managed, CI/CD via `.github/workflows/deploy.yml` (SSH from GitHub Actions).

## Users

Primary visitor: a **Czech traveller comparing package tours** and ultimately writing a lead. They arrive from search engines, scan destination / price / date combinations across multiple tour operators, read enough editorial to feel confident, and submit a contact request to receive concrete offers.

Secondary: an **admin operator** logging in to manage tours, leads, price alerts, email campaigns, and statistics (separate `/admin` area, session-authenticated).

Tertiary: a **travel-trade / lead-handling partner** who receives and processes leads the admin has forwarded.

## Product Purpose

sky-travel.tours is a Czech tour aggregator. It pulls offers from external tour-operator providers (currently Alexandria) and exposes them through a single search interface, so a Czech traveller can compare dates, prices, and destinations across many operators without visiting each one. Success means: a visitor finds a trip they want, leaves a lead, and the operator can act on it.

## Positioning

The product is **an alternative aggregator**, not a unique mechanism. A Czech traveller chooses sky-travel.tours because it offers another path to the same tour-operator inventory the big aggregators (Invia, Dovolena.cz, CK Port, etc.) carry. Offer depth and editorial context (destination guides, "na co si dát pozor" content) are competitive inputs, not a unique mechanism. The brand does not claim to be the only place or the cheapest place; it is one credible option among several.

## Operating Context

- **Visitor flow:** land → search by destination / dates / travellers → browse results → read blog/guide content for confidence → submit lead (name, email, phone, trip) → receive offers via follow-up email.
- **Admin flow:** session-authenticated back-office at `/admin` for managing tour catalogue, viewing lead inbox, sending email campaigns, monitoring statistics, configuring price alerts.
- **Provider flow:** server-side scheduled jobs ingest Alexandria XML feed into `Tour` / `ProviderTour` / `ProviderRegion` tables (`prisma migrate deploy` + provider refresh script on deploy).
- **Channels:** public web for travellers, admin SPA for operators, transactional email (`nodemailer`) for lead and campaign delivery.
- **Languages:** Czech first; the in-house `useLanguage` hook is the only i18n mechanism (no i18next / react-intl).

## Capabilities and Constraints

- Tour search via the `searchStore` Zustand store + `client/src/api/providers.ts` against `VITE_API_URL/api/*`.
- Provider abstraction: each external supplier implements `TourProvider` from `server/src/providers/types.ts` and is registered in `server/src/providers/registry.ts`. Provider HTTP lives in the provider file only.
- Static pages (home, blog, destinations, lead form) are server-rendered HTML from `server/src/pages/**` rendered through `server/src/blog/render.ts` and related renderers; admin SPA is React.
- Auth: session-based admin auth (`express-session` + MySQL-backed cookies, `bcryptjs` 12 rounds, no JWT). Admin routes guarded by `requireAuth` middleware.
- Rate-limited per group: auth, public, admin — new endpoints must reuse existing limiters.
- Inputs validated at route boundary with `zod`; provider XML hardened via `fast-xml-parser` config; uploads go through `multer` with size + mime limits.
- Deployment is PM2-managed on a Hetzner VPS with `--max-old-space-size=450`; the LRU cache is capped at 2000 entries for memory reasons.
- Dependency constraint: pure-JS packages only. Native-build deps (`bcrypt`, `sharp`, etc.) are forbidden because they break production install.
- Stack discipline (no tRPC, GraphQL, Next.js, Redux, React Query, Axios, or SWR).

## Brand Commitments

- **Name:** `SkyTravel` / `sky-travel.tours` — binding.
- **Copy language:** Czech first, natural and concise. The current `useLanguage` hook is the only i18n mechanism. AI-driven variant generation must produce idiomatic Czech without losing diacritics.
- **Color identity:** the existing yellow + blue palette visible in the current site (the yellow CTAs, the deep-blue header, the cream destination panel) is binding. Future visual work anchors to these tokens; major re-palette requires explicit instruction.
- **Voice:** factual, traveller-facing, direct. No marketing hyperbole.

## Evidence on Hand

- Live product at `sky-travel.tours` with blog (`/blog`), destinations, search, and admin.
- ~16 hardcoded destination countries in `server/src/providers/destinationStore.ts` (`KNOWN_DESTINATIONS`) — sidebar filter and autocomplete derive from `listPublicDestinations()`.
- Provider data refreshed via `tsx server/scripts/refresh-alexandria.ts` (not on hot path).
- Health checks at `/api/health` and `/api/health/ready` (liveness / readiness).
- **No fabricated testimonials, customer counts, pricing claims, or benchmarks.** The product currently has no marketing-grade social proof assets committed; future work must not invent them.

## Product Principles

1. **One credible option among several.** Don't over-claim. The brand is a real, working alternative — not the only or the cheapest. Every surface should reinforce "another way to find your trip," not "we are the best."
2. **Editorial earns trust, search converts it.** The blog and destination guides exist to give a Czech traveller enough context to commit; the search and lead form exist to capture that intent. Don't let visual work blur which surface serves which job.
3. **Czech-first means idiomatic Czech, not literal translation.** Diacritics, declension, punctuation, and reading-time estimates must read native. The current article has known copy issues ("do Bulharsko," missing diacritics) that future work must fix, not propagate.
4. **Identity is yellow + blue + clean Czech copy.** The palette and language are binding. Visual work extends them — it does not replace them. Any re-palette or rebranding requires explicit instruction.
5. **Stack is fixed, not negotiable.** Express + Prisma + MySQL on the server, React + Vite + Tailwind v4 on the client, session cookies for admin, REST under `/api/*`. No alternative frameworks or data layers.

## Accessibility & Inclusion

- Czech-language content targeted at Czech-speaking adults planning leisure travel; no specialized accessibility requirements beyond standard semantic HTML, contrast, and keyboard reachability.
- Admin and public surfaces both must remain keyboard-navigable; the existing `.blog-article__cover`, `.cta-box`, `.prev-next` etc. should preserve focus-visible and semantic structure.

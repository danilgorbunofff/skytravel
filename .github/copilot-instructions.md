# SkyTravel — Copilot Instructions

These instructions apply workspace-wide. Follow them when generating, refactoring, or reviewing code in this repo.

## Project overview

SkyTravel is a Czech travel-aggregation site (`sky-travel.tours`). It exposes tours from third-party providers (Alexandria, Orextravel) through a unified search UI plus an admin back-office for leads, statistics, email campaigns, and price alerts.

Monorepo layout (npm workspaces, Node ≥ 20):

- `client/` — React 18 SPA (Vite, Tailwind v4, TypeScript strict).
- `server/` — Express 4 REST API (TypeScript strict, ESM, Prisma 5 + MySQL).
- `scripts/deploy-remote.sh` — production deploy via SSH to the Oracle VM (PM2-managed).
- `.github/workflows/deploy.yml` — CI/CD; do not modify without explicit instruction.

## Tech stack (do not introduce alternatives without asking)

- **Client:** React 18, React Router 6, Zustand 5, Radix UI primitives, `class-variance-authority` + `clsx` + `tailwind-merge`, Tailwind v4 (`@tailwindcss/vite`), TipTap (admin rich-text), Lucide icons.
- **Server:** Express 4, Prisma 5, `express-session` (cookie sessions, NOT JWT), `bcryptjs` (NOT native `bcrypt` — broke deploys), `helmet`, `cors`, `express-rate-limit`, `multer` (uploads), `nodemailer`, `fast-xml-parser`.
- **Build:** Vite 8 (client), `tsc` + `prisma generate` (server). Both sides ESM (`"type": "module"`).
- **Data fetching:** plain `fetch` against `VITE_API_URL/api/*`. No tRPC, GraphQL, React Query, Axios, or SWR.

## Architecture

- Client → server via REST under `/api/*`. Helpers live in [client/src/api.ts](client/src/api.ts), [client/src/api/providers.ts](client/src/api/providers.ts), [client/src/api/publicProviders.ts](client/src/api/publicProviders.ts), [client/src/api/bootstrapCache.ts](client/src/api/bootstrapCache.ts).
- Provider abstraction: each external supplier implements the contract in [server/src/providers/types.ts](server/src/providers/types.ts) and registers in [server/src/providers/registry.ts](server/src/providers/registry.ts). Add new providers as `*Provider.ts` siblings; never inline provider HTTP calls in routes.
- Admin UI is lazy-loaded behind [client/src/components/RequireAdmin.tsx](client/src/components/RequireAdmin.tsx); admin routes live under [client/src/pages/Admin*.tsx](client/src/pages/) and [client/src/components/admin/](client/src/components/admin/).
- Routes split by resource in [server/src/routes/](server/src/routes/); admin-only routes under [server/src/routes/admin/](server/src/routes/admin/).

## Coding conventions

- **Naming:** PascalCase for React components and types; camelCase for hooks, stores, utilities, and route files. Hooks must start with `use*` and live in [client/src/hooks/](client/src/hooks/).
- **Styling:** Tailwind v4 utility classes. For component variants use the CVA + `clsx` + `tailwind-merge` pattern via the `cn()` helper in [client/src/lib/utils.ts](client/src/lib/utils.ts). Do not add CSS-in-JS or styled-components.
- **State:**
  - Use the Zustand store in [client/src/stores/searchStore.ts](client/src/stores/searchStore.ts) only for the provider search flow.
  - Public pages and admin pages keep state component-local; call `api.ts` directly.
  - Persist user-specific UI state through the existing hooks ([useFavorites](client/src/hooks/useFavorites.ts), [useCookieConsent](client/src/hooks/useCookieConsent.ts), [useLeadPopup](client/src/hooks/useLeadPopup.ts)).
- **Server handlers:** wrap every async route in [`asyncHandler`](server/src/middleware/asyncHandler.ts). Do not write per-route `try/catch` — let errors propagate to the central error middleware in [server/src/index.ts](server/src/index.ts).
- **One file per resource** under `server/src/routes/`; mount in [server/src/index.ts](server/src/index.ts).
- **TypeScript:** strict mode on both sides. Prefer `import type` for type-only imports. Avoid `any`; use generated Prisma types where possible.

## Auth & security

- Session-based admin auth via `express-session` + MySQL-backed cookies. The session cookie is `httpOnly`, `secure`, `sameSite: 'none'` in production.
- Admin endpoints must be guarded by [`requireAuth`](server/src/middleware/requireAuth.ts), which checks `req.session.adminUserId`.
- Passwords: hash with `bcryptjs` (10 rounds). Never log raw credentials, session IDs, or provider API keys.
- Apply the existing per-group `express-rate-limit` instances (auth, public, admin) when adding new endpoints — don't create unbounded routes.
- Validate and sanitize all user input at the route boundary; treat provider responses as untrusted (`fast-xml-parser` config already hardens this).
- Uploads go through [server/src/middleware/upload.ts](server/src/middleware/upload.ts) (multer with size + mime limits); don't bypass it.

## Database (Prisma + MySQL)

- Schema: [server/prisma/schema.prisma](server/prisma/schema.prisma). Key models: `Tour`, `ProviderTour`, `ProviderSync`, `ProviderRegion`, `Lead`, `AdminUser`, `EmailCampaign`, `PriceAlert`.
- Tours carry an `i18nJson` field for localized strings — read/write through helpers, do not duplicate columns.
- Migrations live in [server/prisma/migrations/](server/prisma/migrations/). Locally use `prisma migrate dev`; in production the deploy runs `prisma migrate deploy` (never `dev`). New migrations follow the existing `YYYYMMDDHHMMSS_migration_NN_*` naming.
- Always run `prisma generate` (or `npm --workspace server run build`) after schema edits.

## i18n

- Czech-first UI. Translations are handled by the in-house [`useLanguage`](client/src/hooks/useLanguage.ts) hook; do not add `i18next`, `react-intl`, or similar.

## Commands

- Dev: `npm run dev` (root) — runs server + client concurrently.
- Build: `npm run build`.
- Lint: `npm run lint`.
- Provider refresh: `tsx server/scripts/refresh-alexandria.ts`.
- Deploy (manual): `bash scripts/deploy-remote.sh`. Requires the SSH key in repo root; the script handles `git pull`, `npm ci`, `prisma migrate deploy`, `pm2 reload`.

## Things to avoid

- Native-build dependencies (`bcrypt`, `sharp`, etc.) — they break the production install. Prefer pure-JS alternatives.
- Switching to JWT, tRPC, GraphQL, Next.js, Redux, or React Query.
- Introducing new global state stores when component-local state suffices.
- Editing `.github/workflows/`, `ecosystem.config.cjs`, or `scripts/deploy-remote.sh` unless explicitly requested.
- Generating documentation files (`*.md`) unless asked.

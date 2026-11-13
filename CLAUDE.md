# CLAUDE.md

SkyTravel (`sky-travel.tours`): Czech-first tour aggregator. Pulls tours from third-party providers (Alexandria) into a search UI, plus an admin back-office (leads, email campaigns, price alerts, blog) and Telegram bots.

Read first: `AGENTS.md` (operational gotchas) and `.github/copilot-instructions.md` (full stack, architecture, conventions). Don't duplicate them here; follow them.

## Stack

npm workspaces, Node >=20 (CI/prod use 20, see `.nvmrc`), ESM everywhere.

- `client/` React 18 + Vite 8 + Tailwind v4 (no config file) + Zustand + Radix + TipTap, Vitest
- `server/` Express 4 + Prisma 7 + MySQL (MariaDB adapter), cookie sessions, pino, zod, Node test runner
- `bots/` grammy Telegram bots + node-cron, Prisma client (own schema in `bots/prisma`)
- `e2e/` Playwright (7 specs incl. axe a11y); `scripts/` deploy; `docs/` architecture, API, runbook; `docs/archive/` old plans

## Commands (run from repo root)

| Task                              | Command                                                               |
| --------------------------------- | --------------------------------------------------------------------- |
| Dev (server :4000 + client :5173) | `npm run dev`                                                         |
| Bots dev                          | `npm run dev:bots`                                                    |
| Build all                         | `npm run build`                                                       |
| Lint / autofix                    | `npm run lint` / `npm run lint:fix`                                   |
| Typecheck all workspaces          | `npm run typecheck`                                                   |
| Format check / write              | `npm run format:check` / `npm run format`                             |
| Unit tests (server + client)      | `npm test`                                                            |
| One workspace                     | `npm --workspace server run test`, `npm --workspace client run test`  |
| E2E                               | `npm run test:e2e` (starts dev servers itself or reuses running ones) |
| Prisma generate / migrate         | `npm --workspace server run prisma:generate` / `prisma:migrate`       |

Server tests need MySQL: `mysql -u root -e "CREATE DATABASE IF NOT EXISTS skytravel_test"` then set `DATABASE_URL=mysql://root:password@localhost:3306/skytravel_test`.

## Conventions already used (match them)

- Server relative imports end in `.js` even though files are `.ts`.
- Every async route is wrapped in `asyncHandler`; no per-route try/catch.
- Server logs via `logger` (pino), never `console.*`.
- Providers: `server/src/providers/*Provider.ts`, implement `TourProvider`, register in `registry.ts`. HTTP logic only there.
- Destinations are countries only (`KNOWN_DESTINATIONS`).
- Client: PascalCase components, `use*` hooks in `src/hooks/`, `cn()` from `src/lib/utils.ts` (CVA + clsx + tailwind-merge), `@` alias = `client/src`.
- State: Zustand only for provider search (`stores/searchStore.ts`); everything else component-local. i18n via in-house `useLanguage`.
- TypeScript strict, `import type` for types, no `any`.
- Prettier: double quotes, semicolons, width 100, trailing commas.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`); Husky runs lint-staged + commitlint. Never bypass hooks.

## Rules

- Before saying a task is done run: `npm run lint`, `npm run typecheck`, `npm test` (and `npm run build` for build-affecting changes). Report failures honestly.
- Match existing patterns; don't restructure working code or mass-reformat.
- Ask before adding dependencies. Avoid native-build deps (`bcrypt`, `sharp`): they break the production install. No JWT/Redux/React Query/i18next.
- Never commit secrets. `.env*` (except `.env.example`), `*.key*`, `*.pem`, `server-api-access.md` are gitignored; keep it so. Never print real values from `.env`.
- Don't edit `.github/workflows/`, `ecosystem.config.cjs`, `scripts/deploy-remote.sh` without explicit request.
- Pushing to `main` deploys to production. Don't push without being asked.
- Prisma: `migrate dev` locally, `migrate deploy` in prod; run `prisma generate` after schema edits.
- Server memory is tight (`--max-old-space-size=450`); avoid loading big datasets.

## Gotchas

- Lint is scoped to `client/src server/src bots/src e2e` (root `eslint .` crawled vendored tooling and was extremely slow).
- Project lives under `~/Desktop`; if tooling is mysteriously slow, iCloud Desktop sync may be the cause.
- Known lint warnings (3): react-refresh/only-export-components in ui/badge, ui/button, PublicTourCard.

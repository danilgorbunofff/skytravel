# AGENTS.md

Read `.github/copilot-instructions.md` first — it covers the full tech stack, architecture, and conventions. This file adds operational gotchas not obvious from config alone.

## ESM `.js` imports (server)

Server uses `"type": "module"` — **all relative imports must end in `.js`**, even though the source file is `.ts`:

```ts
// Correct (file is ./app.ts)
import { createApp } from "./app.js";
// Wrong
import { createApp } from "./app";
```

The compiler target is `ES2022` with `moduleResolution: "Bundler"`. This only applies to server code; client uses Vite which resolves extensions automatically.

## Node memory constraints

Server runs with `--max-old-space-size=450` (PM2 restarts at 512 MB). Avoid loading large datasets into memory in server code. The LRU cache has a 2000-entry cap for this reason.

## Routes: no raw try/catch

Wrap every async route handler in `asyncHandler` from `../middleware/asyncHandler.ts`. Errors propagate to the central error middleware — individual `try/catch` in routes is not the pattern.

## `process.send("ready")` — PM2 readiness signal

`server/src/index.ts` calls `process.send("ready")` after `app.listen()`. PM2 uses `wait_ready: true` with an 8-second timeout. If you modify the startup sequence, keep this working.

## Tests need MySQL

**Server tests** connect to a real MySQL database. Before running:
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS skytravel_test"
DATABASE_URL=mysql://root:password@localhost:3306/skytravel_test npm --workspace server run test
```
CI uses `mysql:8.0` service container with `MYSQL_ROOT_PASSWORD=test`.

**E2E tests** require the dev server running (`npm run dev` first).

## Destinations are countries only

`KNOWN_DESTINATIONS` in `server/src/providers/destinationStore.ts` is a hardcoded array of ~16 countries. There are no city-level, resort-level, or hotel-level destinations in the system. `Destination` table rows are created automatically from this array via `ensureKnownDestinations()`. The sidebar filter and autocomplete both derive from the same `listPublicDestinations()` call.

## Provider registration

New providers go in `server/src/providers/` as `*Provider.ts`, implement the `TourProvider` interface from `types.ts`, and are registered in `registry.ts`. Provider HTTP logic lives only in the provider file — never in routes.

## E2E test reliability

Due to server `--max-old-space-size=450`, the API server may be tight on memory. When running E2E tests, ensure only one instance of the dev server is active.

## Commit conventions

Conventional commits only: `feat:`, `fix:`, `chore:`, `docs:`. Husky runs `lint-staged` on commit (Prettier + ESLint fix on staged `.ts/.tsx` files). If the hook fails, fix the lint issues; don't bypass.

## Development commands (quick reference)

| Action | Command |
|---|---|
| Dev | `npm run dev` |
| Lint | `npm run lint` |
| Format check | `npm run format:check` |
| Server tests | `npm --workspace server run test` |
| Client tests | `npm --workspace client run test` |
| Single client test | `npm --workspace client run test -- -t "test name pattern"` |
| E2E tests | `npm run test:e2e` |
| Provider refresh | `npx tsx server/scripts/refresh-alexandria.ts` |
| Prisma generate | `npm --workspace server run prisma:generate` |

## Tailwind v4 — no config file

Tailwind is configured via the `@tailwindcss/vite` plugin in `client/vite.config.ts`. There is no `tailwind.config.js`. Add custom theme values through CSS custom properties or the Vite plugin config.

## Deploy

Push to `main` triggers `deploy.yml` → SSH into Oracle VM → `npm ci` → Prisma migrate → build → PM2 restart. Manual deploy: `bash scripts/deploy-remote.sh` (requires `ssh-key-2026-04-03.key` in repo root).

# SkyTravel

Czech travel aggregation platform — unified tour search from multiple providers (Alexandria) with admin back-office for leads, email campaigns, and price alerts.

**Live:** [sky-travel.tours](https://sky-travel.tours)

## Quick Start

### Prerequisites

- Node.js ≥ 20 (CI and production use 20; `nvm use` reads `.nvmrc`)
- MySQL 8.0
- npm (comes with Node)

### Setup

```bash
git clone <repo-url> && cd skytravel
npm ci
cp server/.env.example server/.env   # fill in DATABASE_URL, provider keys
npm --workspace server run prisma:generate
npm --workspace server run prisma:migrate
npm run dev
```

Open http://localhost:5173 (client) / http://localhost:4000 (API).

### Available Scripts

| Script                            | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Start dev server (client + server concurrently) |
| `npm run build`                   | Production build (server tsc + client Vite)     |
| `npm run lint` / `lint:fix`       | Lint client, server, bots, e2e (ESLint 9)       |
| `npm run typecheck`               | `tsc` for client, server and bots               |
| `npm test`                        | Server + client unit tests                      |
| `npm run format`                  | Format all files (Prettier)                     |
| `npm run format:check`            | Check formatting without writing                |
| `npm --workspace server run test` | Server unit + integration tests                 |
| `npm --workspace client run test` | Client unit tests (Vitest)                      |
| `npm run test:e2e`                | End-to-end tests (Playwright)                   |

## Architecture

```
skytravel/
├── client/          React 18 SPA (Vite, Tailwind v4, TypeScript)
├── server/          Express 4 REST API (TypeScript, Prisma 7, MySQL)
├── bots/            Telegram bots (grammy)
├── scripts/         Deploy & backup scripts
├── docs/            Architecture, API, and operations docs
├── e2e/             Playwright E2E tests
└── ecosystem.config.cjs   PM2 process manager config
```

- **Client → Server** via REST under `/api/*`
- **Provider abstraction:** each external supplier implements `TourProvider` interface
- **Admin UI** lazy-loaded behind auth; admin routes under `/api/admin/*`
- **Structured logging** with pino (JSON in prod, pretty in dev)
- **Health checks** at `/api/health` and `/api/health/ready`

See [docs/architecture.md](docs/architecture.md) for detailed diagrams.

## Documentation

| Document                                     | Description                        |
| -------------------------------------------- | ---------------------------------- |
| [docs/architecture.md](docs/architecture.md) | System overview & design decisions |
| [docs/api.md](docs/api.md)                   | REST API endpoint reference        |
| [docs/database.md](docs/database.md)         | Schema & data model                |
| [docs/providers.md](docs/providers.md)       | Provider integration guide         |
| [docs/operations.md](docs/operations.md)     | Production runbook                 |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Development workflow               |
| [CHANGELOG.md](CHANGELOG.md)                 | Version history                    |

## Deployment

Production deploys via `bash scripts/deploy-remote.sh` (SSH to Hetzner VPS, PM2-managed).

See [docs/operations.md](docs/operations.md) for full runbook.

## Tech Stack

- **Client:** React 18, React Router 6, Zustand 5, Tailwind v4, Radix UI, TipTap
- **Server:** Express 4, Prisma 7, pino, express-session (MySQL-backed), Zod
- **Build:** Vite 8 (client), tsc + prisma generate (server), ESM throughout
- **Test:** Node test runner (server), Vitest + Testing Library (client), Playwright (E2E)
- **CI/CD:** GitHub Actions (lint → test → build → deploy)
- **Infra:** Hetzner VPS (167.233.47.103), Nginx reverse proxy, PM2, MySQL 8.4

## Testing

Server tests need a MySQL database:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS skytravel_test"
DATABASE_URL=mysql://root:password@localhost:3306/skytravel_test npm --workspace server run test
```

E2E tests (Playwright) start the dev servers automatically, or reuse ones already running:

```bash
npx playwright install   # first time only
npm run test:e2e
```

Before opening a PR: `npm run lint && npm run typecheck && npm test`.

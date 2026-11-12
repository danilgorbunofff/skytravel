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

## SEO pages (server-rendered)

Public pages are rendered on the server so crawlers (Google, Seznam) get full HTML:

| URL                 | What                                                      |
| ------------------- | --------------------------------------------------------- |
| `/`                 | 301 → `/cs/` (query string kept, so UTM tags survive)     |
| `/cs/`, `/ru/`      | Home page in Czech / Russian                              |
| `/<lang>/<slug>/`   | Landing page from `server/content/pages/<lang>/<slug>.md` |
| `/sitemap.xml`      | All pages, both languages, with hreflang                  |
| `/robots.txt`       | Points to the sitemap                                     |
| `/indexnow-key.txt` | IndexNow key (set `INDEXNOW_KEY`)                         |

How it works: `npm run build` also builds `client/dist-ssr/entry-server.js`. Express
(`server/src/routes/ssrPages.ts`) loads it, renders the React page with live deals and
injects title, description, canonical, hreflang, Open Graph and JSON-LD
(`client/src/seo/head.ts`). The browser then hydrates the same React app. `/search` and
`/admin` stay client-only. `npm run dev` still works as before (client-rendered).

Check what a crawler sees:

```bash
curl -s -A "Googlebot" https://sky-travel.tours/cs/ | grep -o "<h1.*</h1>"
```

### Adding a landing page (no code)

1. Copy an existing file, e.g. `server/content/pages/ru/egipet.md` →
   `server/content/pages/ru/turciya.md`. The file name becomes the URL (`/ru/turciya/`):
   lowercase ASCII, digits and `-` only. Sub-pages go into a folder:
   `ru/egipet/hurgada.md` → `/ru/egipet/hurgada/` (breadcrumbs are built automatically).
2. Edit the front-matter:
   - `title` (50–60 chars), `description` (150–160 chars), `h1`, `intro`, `breadcrumb`
   - `alternates:` the same page in the other language (`cs: turecko`) → hreflang + language switcher
   - `deals.destinationSlug`: a country slug the search knows (`bulharsko`, `chorvatsko`,
     `italie`, `albanie`, `cerna-hora`, `recko`, `turecko`, `spanelsko`); empty = all.
     `deals.lastMinute: true` = departures in the next 21 days.
   - `faq:` question/answer pairs (also emitted as FAQPage schema)
   - `related:` links to other pages; `showOnHome: true` + `homeLabel` links it from the home page
3. Write 600–1,000 words of Markdown below the front-matter (use `##` / `###` headings —
   the H1 comes from `h1`).
4. Deploy. The server warns in its log if a title/description is out of range; `npm test`
   fails on it too. Then ping search engines: `npm --workspace server run indexnow -- /ru/turciya/`.

Egypt is not in the Alexandria feed yet, so the Egypt pages show a "write us in Telegram"
box instead of live deals.

### SEO: TODO values

| What                               | Where                                                               |
| ---------------------------------- | ------------------------------------------------------------------- |
| GA4 measurement ID (`G-…`)         | `client/src/config/site.ts` → `ga4Id`                               |
| Google Search Console verification | `client/src/config/site.ts` → `googleSiteVerification`              |
| Seznam Webmaster verification      | `client/src/config/site.ts` → `seznamVerification`                  |
| Phone / postal code / logo         | `client/src/config/site.ts` (`phone`, `address`, `logoUrl`)         |
| Client reviews                     | `client/src/components/public/TrustBlock.tsx`                       |
| Home page intro text               | `client/src/components/public/HomeSeoSection.tsx`                   |
| Lead → Telegram bot                | `server/.env`: `TELEGRAM_LEADS_BOT_TOKEN`, `TELEGRAM_LEADS_CHAT_ID` |
| IndexNow key                       | `server/.env`: `INDEXNOW_KEY` (any 8–128 chars `[a-zA-Z0-9-]`)      |

Client values are compiled in, so rebuild + deploy after changing them.

**Lead form → @skytravel_tours_bot:** put the bot's token (the one from `bots/.env` if it
is the same bot) into `TELEGRAM_LEADS_BOT_TOKEN`. Send `/start` to the bot from your
Telegram account, open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy
`message.chat.id` into `TELEGRAM_LEADS_CHAT_ID` (comma-separate several chats). Each lead
arrives with destination, dates, people, budget, contact, page and UTM source. E-mail
contacts are also saved to the admin Leads list.

**Analytics events** (GA4, after `ga4Id` is set; Consent Mode — cookieless until the visitor
accepts analytics cookies): `generate_lead`, `telegram_click`, `deal_click`. UTM tags of the
first visit are kept for 30 days and attached to every lead.

### nginx (production)

nginx currently serves `client/dist` for everything except `/api` and `/blog`. Add these
locations so the HTML pages come from Express (static `/assets` keep coming from `dist`):

```nginx
location = /                 { proxy_pass http://127.0.0.1:4000; include proxy_params; }
location ~ ^/(cs|ru)(/|$)    { proxy_pass http://127.0.0.1:4000; include proxy_params; }
location = /sitemap.xml      { proxy_pass http://127.0.0.1:4000; include proxy_params; }
location = /robots.txt       { proxy_pass http://127.0.0.1:4000; include proxy_params; }
location = /indexnow-key.txt { proxy_pass http://127.0.0.1:4000; include proxy_params; }
```

Until this is in place the site keeps working as before (client-rendered).

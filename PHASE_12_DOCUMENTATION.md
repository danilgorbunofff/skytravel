# Phase 12: Documentation & Developer Experience

> Comprehensive documentation: ARCHITECTURE.md, RUNBOOK.md, JSDoc on public APIs, provider development guide, API docs update, TypeScript path aliases, .vscode settings, commitlint in CI, ENV.md reference.

---

## Step 1: Create ARCHITECTURE.md

### File: `docs/ARCHITECTURE.md`

Enhance existing `docs/architecture.md` with comprehensive content.

### Contents

```markdown
# Architecture

## High-Level System Diagram

```
┌──────────────┐       ┌───────────────────┐       ┌───────────────┐
│   Browser     │  HTTP  │   Express 4 API    │  HTTP  │  Alexandria   │
│  (React 18)   │◄──────►│   (TypeScript)     │◄──────►│  API Export   │
│  Vite SPA     │  REST  │   Prisma 5 + MySQL │       └───────────────┘
└──────────────┘       │                    │       ┌───────────────┐
                       │  Provider Registry │◄──────►│  Orextravel   │
                       │  (TourProvider)    │       │  API          │
                       └────────┬──────────┘       └───────────────┘
                                │
                       ┌────────▼──────────┐
                       │   MySQL 8.0       │
                       │   (via Prisma)    │
                       └───────────────────┘
```

## Monorepo Structure

```
skytravel/
├── client/           React 18 SPA (Vite, Tailwind v4)
│   ├── src/
│   │   ├── components/   Shared UI components
│   │   ├── features/     Feature modules (search, admin)
│   │   ├── pages/        Page components
│   │   ├── hooks/        Custom React hooks
│   │   ├── stores/       Zustand stores
│   │   ├── api/          API client functions
│   │   ├── types/        TypeScript types
│   │   └── lib/          Utilities
│   └── vite.config.ts
├── server/           Express 4 REST API (TypeScript, Prisma)
│   ├── src/
│   │   ├── routes/       Route handlers
│   │   ├── providers/    TourProvider implementations
│   │   ├── middleware/   Express middleware
│   │   ├── lib/          Shared utilities
│   │   └── config.ts     Environment config
│   └── prisma/
│       └── schema.prisma  Database schema
├── e2e/              Playwright end-to-end tests
├── scripts/          Deploy and utility scripts
└── docs/             Documentation
```

## Data Flow

1. **Public search:** Browser → `/api/search?destination=...` → Provider Registry → External APIs → Unified response
2. **Tour import (admin):** Admin panel → `/api/admin/tours/import` → Provider fetches → Parses → Stores in MySQL → Returns result
3. **Email campaign:** Admin editor → `/api/admin/send` → SMTP relay → Batch send to consented leads
4. **Inquiry submission:** Public form → `/api/inquiries` → Lead stored + email notification

## Key Patterns

### Provider Pattern
- Interface: `TourProvider` in `server/src/providers/types.ts`
- Each external API has its own `*Provider.ts` implementing the interface
- Registration in `server/src/providers/registry.ts`
- HTTP logic lives ONLY in provider files, NEVER in routes

### Error Handling
- `asyncHandler` middleware wraps every async route
- `ApiError` class for typed errors with HTTP status codes
- Centralized error handler at end of middleware chain
- No raw `try/catch` in route handlers

### Response Format
```typescript
// Success
{ ok: true, data: { ... } }
// Error
{ ok: false, error: { code: "NOT_FOUND", message: "..." } }
```

## Deployment Architecture

```
Oracle Cloud VM (single VPS)
├── Nginx (reverse proxy, SSL termination)
├── PM2 (process manager)
│   ├── skytravel-api (Express, port 4000)
│   └── skytravel-ui (Vite preview, port 4173)
└── MySQL 8.0
```

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | MySQL 8.0 | Already in use by partner data source; good enough for scale |
| ORM | Prisma 5 | Type-safe queries, migrations, great DX |
| Server framework | Express 4 | Simple, well-known, sufficient for API-only server |
| Client framework | React 18 | Broad ecosystem, SPA for admin panel |
| State management | Zustand 5 | Simpler than Redux, great TypeScript support |
| Styling | Tailwind v4 | Utility-first, fast iteration, no config file needed |
| Rich text editor | TipTap | Headless, extensible, good email HTML output |
```

### Acceptance criteria
- New developer can understand the system in 15 minutes
- All key architectural patterns documented
- Design decisions with rationale
- Data flow diagrams (ASCII art)

---

## Step 2: Create RUNBOOK.md

### File: `docs/RUNBOOK.md`

```markdown
# Runbook

## Server Startup

```bash
# Development
npm run dev

# Production (PM2)
pm2 start ecosystem.config.cjs --env production
pm2 restart skytravel-api
pm2 stop skytravel-api
pm2 status
```

## Database

```bash
# Backup
mysqldump -u root skytravel | gzip > /backups/mysql/skytravel-$(date +%Y%m%d-%H%M).sql.gz

# Restore
gunzip < /backups/mysql/skytravel-20250101-120000.sql.gz | mysql -u root skytravel

# Migrations
npm --workspace server run prisma:migrate       # apply pending
npm --workspace server run prisma:migrate:dev   # create new migration
npm --workspace server run prisma:generate      # regenerate client
```

## Provider Refresh

```bash
npx tsx server/scripts/refresh-alexandria.ts
# Refreshes the Alexandria provider cache with latest offers
```

## Health Checks

```bash
# Liveness (process alive)
curl http://localhost:4000/api/health/live

# Readiness (can serve traffic)
curl http://localhost:4000/api/health/ready | jq .
# Expected: {"status":"ok","checks":{"database":"ok","alexandria":"ok",...}}
```

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| "DB connection refused" | MySQL not running | `systemctl start mysql` |
| Memory exceeded, PM2 restart | Heap OOM | Check `pm2 logs`; increase `--max-old-space-size` |
| Provider sync failed | API key expired or network issue | Check env vars; `curl` test API endpoint |
| Deploy fails at npm ci | Network timeout | Re-run deploy; check npm registry status |
| Client build OOM | Vite memory spike | Increase NODE_OPTIONS `--max-old-space-size` |

## Logs

```bash
# Real-time logs
pm2 logs skytravel-api
pm2 logs skytravel-ui

# Last 50 lines
pm2 logs skytravel-api --lines 50

# Error logs
tail -f server/logs/api-error.log
```

## Monitoring

- **Sentry:** https://sentry.io (error tracking, if configured)
- **PM2:** `pm2 monit` (CPU/memory per process)
- **Health endpoint:** `curl /api/health/ready` (JSON checks)

## Emergency Procedures

### 1. Server unresponsive
```bash
ssh root@167.233.47.103
pm2 status
pm2 restart skytravel-api
```

### 2. Rollback deploy
```bash
cd /home/ubuntu/skytravel
git log --oneline -5
git revert HEAD
git push origin main
# Or: git reset --hard <previous-commit> && pm2 restart
```

### 3. Database restore
```bash
# Find latest backup
ls -lt /backups/mysql/
# Restore it
gunzip < /backups/mysql/skytravel-2025XXXX-XXXX.sql.gz | mysql -u root skytravel
```

### 4. Scale (if needed)
```markdown
- Increase PM2 instances in ecosystem.config.cjs
- Add read replica for MySQL
- Add Redis cache layer
```

## On-Call Rotation

See `docs/oncall.md` for schedule and escalation.
```

### Acceptance criteria
- On-call developer can follow RUNBOOK for common incidents
- All PM2 commands documented
- Database backup/restore commands documented
- Health check expected response documented
- Emergency procedures clear and actionable

---

## Step 3: Add JSDoc comments

### Files to document

#### `server/src/providers/types.ts` — TourProvider interface

```typescript
/**
 * Unified tour representation after normalizing provider-specific data.
 */
export interface UnifiedTour {
  /** Unique identifier within the provider */
  externalId: string;
  /** Destination name (country-level) */
  destination: string;
  /** Tour title / hotel name */
  title: string;
  /** Price in CZK */
  price: number;
  /** Optional: original price before discount */
  originalPrice?: number;
  // ... other fields
}

/**
 * Interface all tour providers must implement.
 *
 * @example
 * ```typescript
 * class MyProvider implements TourProvider {
 *   async fetchTours(filters: UnifiedFilters): Promise<UnifiedTour[]> {
 *     // implementation
 *   }
 * }
 * ```
 */
export interface TourProvider {
  /** Unique provider identifier */
  readonly id: string;
  /** Human-readable label */
  readonly label: string;

  /**
   * Fetch tours matching the given filters.
   * @param filters - Search filters (destination, dates, price range, etc.)
   * @returns Promise resolving to an array of normalized tours
   */
  fetchTours(filters: UnifiedFilters): Promise<UnifiedTour[]>;
  // ... other methods
}
```

#### `server/src/lib/response.ts`

```typescript
/**
 * Send a success response.
 * @param res - Express response object
 * @param data - Response payload
 * @param status - HTTP status code (default 200)
 *
 * @example
 * success(res, { tours: [...] });
 * success(res, { id: 1 }, 201);
 */
export function success(res: Response, data: unknown, status = 200): void;

/**
 * Send an error response.
 * @param res - Express response object
 * @param code - Machine-readable error code (e.g., "NOT_FOUND")
 * @param message - Human-readable error description
 * @param status - HTTP status code (default 400)
 *
 * @example
 * fail(res, "NOT_FOUND", "Tour not found", 404);
 */
export function fail(res: Response, code: string, message: string, status = 400): void;

/**
 * Wraps an async route handler to catch errors and forward to error middleware.
 * @param fn - Async route handler
 * @returns Express middleware function
 *
 * @example
 * router.get("/tours", asyncHandler(async (req, res) => {
 *   const tours = await fetchTours();
 *   success(res, tours);
 * }));
 */
export function asyncHandler(fn: Function): express.RequestHandler;
```

#### Other files to document

| File | Key exports | JSDoc priority |
|---|---|---|
| `server/src/lib/mail.ts` | `sendEmail()`, `sendBatchedEmail()` | High |
| `server/src/lib/hash.ts` | `hashEmail()`, `verifyHash()` | High |
| `server/src/providers/publicSearchCache.ts` | `getCached()`, `setCached()`, `invalidate()` | Medium |
| `server/src/providers/offerGrouping.ts` | `groupOffers()`, `pickBestOffer()` | Medium |

### Generate docs

Add to `server/package.json`:

```json
{
  "scripts": {
    "docs": "typedoc --out docs/api src/lib/*.ts src/providers/*.ts"
  }
}
```

```bash
npm --workspace server install --save-dev typedoc
```

### Acceptance criteria
- All public exports in provider and lib files have JSDoc
- `@param`, `@returns`, `@throws` present on all functions
- `@example` on key functions
- `npm run docs` generates readable HTML documentation

---

## Step 4: Write provider development guide

### File: `docs/PROVIDER_GUIDE.md`

Enhance existing `docs/providers.md`.

### Contents

```markdown
# Provider Development Guide

## TourProvider Interface

Every provider must implement the `TourProvider` interface:

```typescript
interface TourProvider {
  readonly id: string;          // unique identifier (e.g., "alexandria")
  readonly label: string;       // human-readable name (e.g., "Alexandria")
  readonly filterFields: FilterField[];
  
  fetchTours(filters: UnifiedFilters): Promise<UnifiedTour[]>;
  fetchRegions(parentId?: number): Promise<ProviderRegion[]>;
  fetchCacheStatus(): Promise<CacheStatus>;
  refreshCache(): Promise<void>;
  fetchTourDetail(externalId: string, context?: Record<string, unknown>): Promise<UnifiedTour | null>;
}
```

## Step-by-Step: Adding a New Provider

### 1. Create provider file

`server/src/providers/myProvider.ts`:

```typescript
import { TourProvider, UnifiedTour, UnifiedFilters, ProviderRegion } from "./types.js";

export class MyProvider implements TourProvider {
  readonly id = "myprovider";
  readonly label = "My Provider";
  readonly filterFields = [...];
  
  async fetchTours(filters: UnifiedFilters): Promise<UnifiedTour[]> {
    // 1. Build provider-specific API request from filters
    // 2. Fetch from external API
    // 3. Parse response into UnifiedTour[]
    // 4. Return normalized tours
  }
  
  // ... implement other methods
}
```

### 2. Register in registry

`server/src/providers/registry.ts`:

```typescript
import { MyProvider } from "./myProvider.js";
registry.register("myprovider", () => new MyProvider(config));
```

### 3. Add config

`server/src/config.ts`:

```typescript
myprovider: {
  apiKey: process.env.MYPROVIDER_API_KEY,
  url: process.env.MYPROVIDER_API_URL,
}
```

### 4. Add env vars

Add to `.env.example` and `docs/ENV.md`.

### 5. Test

```bash
# Test the new provider
npx tsx server/scripts/test-provider.ts myprovider
```

## Region/Destination Mapping

- Destinations are country-level only
- `fetchRegions(parentId?)` returns available regions
- Single-level: flat list of countries
- Two-level: departure city → destination country

## Offer Grouping

Use the `offerGrouping.ts` utilities to group similar offers:

```typescript
import { groupOffers } from "./offerGrouping.js";
const grouped = groupOffers(tours); // groups by hotel + date range
```

## Testing

```typescript
// Mock external API in tests
import { MockProvider } from "./test/mockProvider.js";
const provider = new MockProvider({ tours: [...] });
const results = await provider.fetchTours({ destination: "Chorvatsko" });
expect(results).toHaveLength(3);
```
```

### Acceptance criteria
- Developer can add a new provider following the guide
- Every interface method explained with example
- Registration process documented
- Testing guidance included

---

## Step 5: Update API documentation

### File: `docs/API.md`

Enhance existing `docs/api.md` with complete route documentation.

### Format for each endpoint

```markdown
## Public Search

### `GET /api/search`

Search for tours across all providers.

**Auth:** None

**Query Parameters:**
| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| destination | string | no | — | Filter by destination country |
| dateFrom | string (ISO) | no | — | Earliest departure date |
| dateTo | string (ISO) | no | — | Latest departure date |
| priceMin | number | no | — | Minimum price (CZK) |
| priceMax | number | no | — | Maximum price (CZK) |
| page | number | no | 1 | Page number |
| limit | number | no | 25 | Results per page (max 100) |

**Response:**
```json
{
  "ok": true,
  "data": {
    "tours": [{ "externalId": "123", "destination": "Chorvatsko", ... }],
    "total": 42,
    "page": 1,
    "totalPages": 2
  }
}
```

**Error Codes:**
| Code | Status | Description |
|---|---|---|
| RATE_LIMITED | 429 | Too many requests |
| PROVIDER_ERROR | 502 | External provider unavailable |
```

### Routes to document

| Section | Routes |
|---|---|
| Public | `GET /api/search`, `GET /api/destinations`, `POST /api/inquiries` |
| Public (Alexandria) | `GET /api/alexandria/...` |
| Admin | `POST /api/admin/login`, `GET /api/admin/leads`, `GET /api/admin/tours`, `POST /api/admin/tours/import`, `POST /api/admin/send`, `POST /api/admin/test-send`, `DELETE /api/admin/leads/:id`, `GET /api/admin/statistics`, `GET /api/admin/audit-log` |
| Health | `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready` |
| GDPR | `POST /api/erasure`, `GET /api/erasure/status` |

### Include example curl commands

```bash
# Search tours
curl "http://localhost:4000/api/search?destination=Chorvatsko&priceMax=15000"

# Admin login
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"secret"}' \
  -c cookies.txt

# Health check
curl http://localhost:4000/api/health/ready | jq .
```

### Acceptance criteria
- All routes documented with method, path, auth, params, response shape, error codes
- Example curl commands for each endpoint
- Frontend developer can integrate without reading server code
- OpenAPI/Swagger format or clean markdown tables

---

## Step 6: Add TypeScript path aliases

### Files to modify
- `server/tsconfig.json` — add paths
- `client/tsconfig.json` — add paths
- `client/vite.config.ts` — add resolve.alias

### Server tsconfig

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@lib/*": ["./src/lib/*"],
      "@providers/*": ["./src/providers/*"],
      "@middleware/*": ["./src/middleware/*"],
      "@routes/*": ["./src/routes/*"]
    },
    "baseUrl": "."
  }
}
```

### Server runtime alias resolution

For `tsx` (dev) and compiled output (prod), add `tsconfig-paths`:

```bash
npm --workspace server install tsconfig-paths
```

Update `server/package.json` start script:

```json
{
  "scripts": {
    "start": "node --import tsconfig-paths/register dist/index.js",
    "dev": "tsx --tsconfig tsconfig.json -r tsconfig-paths/register src/index.ts"
  }
}
```

### Client tsconfig

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@lib/*": ["./src/lib/*"],
      "@pages/*": ["./src/pages/*"],
      "@stores/*": ["./src/stores/*"],
      "@api/*": ["./src/api/*"]
    },
    "baseUrl": "."
  }
}
```

### Client Vite config

```typescript
// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@api": path.resolve(__dirname, "./src/api"),
    },
  },
});
```

### Import migration (phased)

Convert one file at a time from:

```typescript
import { Button } from "../../../components/ui/button";
```

To:

```typescript
import { Button } from "@components/ui/button";
```

### Prettier/ESLint import order

Add `eslint-plugin-import` or `@ianvs/prettier-plugin-sort-imports` for import ordering:

```json
// .prettierrc or eslint config
{
  "importOrder": ["^@core/(.*)$", "^@server/(.*)$", "^@ui/(.*)$", "^[./]"],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true
}
```

### Acceptance criteria
- `npx tsc --noEmit` resolves all path aliases without errors
- Vite client build works with alias imports
- Server starts and resolves alias imports at runtime
- No relative imports like `../../../components/Button` remain (phased)
- IDE recognizes aliases for auto-completion

---

## Step 7: Create .vscode/settings.json

### File: `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [],
  "tailwindCSS.validate": true,
  "files.exclude": {
    "**/dist": true,
    "**/node_modules": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/dist": true,
    "**/node_modules": true,
    "**/pnpm-lock.yaml": true
  },
  "files.watcherExclude": {
    "**/dist/**": true,
    "**/node_modules/**": true
  },
  "javascript.preferences.quoteStyle": "double",
  "typescript.preferences.quoteStyle": "double"
}
```

### File: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-playwright.playwright",
    "EditorConfig.EditorConfig"
  ]
}
```

### File: `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Server (tsx)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "server/src/index.ts"],
      "cwd": "${workspaceFolder}",
      "env": { "NODE_ENV": "development" },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Client (Vite)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vite", "--port", "5173"],
      "cwd": "${workspaceFolder}/client",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "E2E Tests (Playwright)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["playwright", "test", "--config", "e2e/playwright.config.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Acceptance criteria
- Opening project in VS Code shows recommended extensions popup
- Format on save works for TypeScript/TSX files
- ESLint auto-fix on save
- Organize imports on save
- Tailwind IntelliSense provides class completions
- Debug configurations work for server and client

---

## Step 8: Add commitlint to CI

### Install commitlint

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

### Create `commitlint.config.ts`

```typescript
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "docs", "refactor", "test", "style", "perf", "ci"],
    ],
  },
};
```

### Add to Husky

```bash
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

### Add GitHub Actions workflow

Create `.github/workflows/commitlint.yml`:

```yaml
name: Commit Lint

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install commitlint
        run: |
          npm install --save-dev @commitlint/cli @commitlint/config-conventional

      - name: Lint commits
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

### Acceptance criteria
- `git commit -m "bad message"` rejected by local husky hook (if husky configured)
- `git commit -m "feat: add tour search"` accepted
- CI workflow validates all commits in a PR
- Non-conventional commits cause CI failure
- Existing conventional commits convention (from AGENTS.md) enforced programmatically

---

## Step 9: Create ENV.md reference

### File: `docs/ENV.md`

```markdown
# Environment Variables

## Required

| Variable | Description | Default | Example |
|---|---|---|---|
| `DATABASE_URL` | MySQL connection string | — | `mysql://root:password@localhost:3306/skytravel` |
| `SESSION_SECRET` | Session encryption secret (min 16 chars, required in prod) | `dev-secret` | `a8f2c9...` |

## Server

| Variable | Description | Default | Required |
|---|---|---|---|
| `PORT` | Server port | `4000` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `CLIENT_ORIGIN` | Allowed CORS origin (comma-separated for multiple) | `http://localhost:5173` | No |

## Providers

| Variable | Description | Default | Required |
|---|---|---|---|
| `ALEXANDRIA_API_URL` | Alexandria export API base URL | `http://export.alexandria.cz/export` | No |
| `ALEXANDRIA_API_KEY` | Alexandria API key | — | Yes (for Alexandria provider) |
| `ALEXANDRIA_COUNTRY` | Default country ID for Alexandria | `107` | No |
| `OREXTRAVEL_API_URL` | Orextravel export API URL | `https://search.orextravel.cz/export/default.php` | No |
| `OREXTRAVEL_TOKEN` | Orextravel API token | — | Yes (for Orextravel provider) |
| `OREXTRAVEL_TOWN_FROM` | Default departure town ID | `0` | No |

## Email (SMTP)

| Variable | Description | Default | Required |
|---|---|---|---|
| `SMTP_HOST` | SMTP server hostname | — | Yes (for email features) |
| `SMTP_PORT` | SMTP server port | `587` | No |
| `SMTP_USER` | SMTP username | — | Yes (for email features) |
| `SMTP_PASS` | SMTP password | — | Yes (for email features) |
| `SMTP_FROM` | Default sender email address | — | No |

## Admin

| Variable | Description | Default | Required |
|---|---|---|---|
| `ADMIN_LOGIN` | Admin panel login | — | No (uses default if not set) |
| `ADMIN_PASSWORD` | Admin panel password | — | No (uses default if not set) |

## Monitoring

| Variable | Description | Default | Required |
|---|---|---|---|
| `SENTRY_DSN` | Sentry error tracking DSN | — | No |

## Client (Vite)

Prefix with `VITE_`:

| Variable | Description | Required |
|---|---|---|
| `VITE_SENTRY_DSN` | Sentry DSN for client-side error tracking | No |
| `VITE_API_URL` | API base URL (defaults to same origin) | No |
```

### Create `.env.example`

```bash
# Server
DATABASE_URL=mysql://root:password@localhost:3306/skytravel
SESSION_SECRET=dev-secret-change-in-prod
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Providers
ALEXANDRIA_API_URL=http://export.alexandria.cz/export
ALEXANDRIA_API_KEY=
ALEXANDRIA_COUNTRY=107
OREXTRAVEL_API_URL=https://search.orextravel.cz/export/default.php
OREXTRAVEL_TOKEN=
OREXTRAVEL_TOWN_FROM=0

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=info@skytravel.cz

# Admin
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin123

# Monitoring
SENTRY_DSN=
```

### Acceptance criteria
- Every env variable documented with description, default, and whether required
- `.env.example` has dummy values for all variables
- Developer can set up `.env` without reading source code
- No secrets in `.env.example` (dummy values only)

---

## Risk Assessment

**RISK: LOW**

- Documentation-only changes have no runtime risk
- TypeScript path aliases may cause build issues if not configured correctly (medium risk)
  - Mitigation: verify `npx tsc --noEmit` before merging
- commitlint may reject valid commits if rules are too strict
  - Mitigation: rules match existing convention

## Verification

```bash
# TypeScript path aliases
npx tsc --noEmit --project server/tsconfig.json
npx tsc --noEmit --project client/tsconfig.json

# Client build
npm --workspace client run build

# Server build
npm --workspace server run build

# Generate API docs
npm --workspace server run docs
ls docs/api/  # should have index.html

# commitlint test
echo "feat: add tour search" | npx commitlint  # should pass
echo "bad message" | npx commitlint             # should fail

# VSCode settings syntax
python3 -c "import json; json.load(open('.vscode/settings.json'))"
python3 -c "import json; json.load(open('.vscode/extensions.json'))"

# New developer onboarding test:
# 1. git clone && npm ci
# 2. cp .env.example .env
# 3. npm --workspace server run prisma:generate
# 4. npm run dev
# 5. Open http://localhost:5173 -> working
```

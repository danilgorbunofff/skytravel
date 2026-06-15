# SkyTravel Architecture

## System Overview

```
┌──────────────┐       ┌──────────────────────────────────────┐
│   Browser    │──────>│         Oracle Cloud VPS             │
│ (React SPA)  │       │  167.233.47.103                      │
└──────────────┘       │                                      │
                       │  ┌─────────────┐  ┌──────────────┐   │
                       │  │  PM2:       │  │  PM2:        │   │
                       │  │ skytravel-ui│  │skytravel-api │   │
                       │  │ :4173       │  │ :4000        │   │
                       │  │ (Vite       │  │ (Express 4 + │   │
                       │  │  preview)   │  │  Prisma 5)   │   │
                       │  └──────┬──────┘  └──────┬───────┘   │
                       │         │                │           │
                       │         │                ▼           │
                       │         │         ┌──────────┐      │
                       │         │         │  LRU     │      │
                       │         │         │  Cache   │      │
                       │         │         │(2000entry)│     │
                       │         │         └──────────┘      │
                       │         │                │           │
                       │         ▼                ▼           │
                       │  ┌─────────────────────────────┐     │
                       │  │         MySQL 8.4            │     │
                       │  │   (local, skytravel DB)      │     │
                       │  └─────────────────────────────┘     │
                       │                                      │
                       │         ┌──────────────────┐         │
                       │         │ Provider Registry │         │
                       │         │ (in-process Map)  │         │
                       │         └────────┬─────────┘         │
                       │                  │                   │
                       │     ┌────────────┼────────────┐      │
                       │     ▼            ▼             │      │
                       │  Alexandria   Orextravel      │      │
                       │  (XML feed)   (JSON REST)     │      │
                       │     │            │            │      │
                       ▼     ▼            ▼            ▼      │
                 External External   External          ───────┘
                 APIs     APIs       APIs
                 (Alexandria export) (Orextravel search)
```

**Production architecture**: Oracle Cloud VPS → no nginx — services serve directly on ports 4000 (API) and 4173 (UI) via PM2. Both apps are managed by PM2 with `wait_ready` protocol.

---

## Monorepo Structure

```
skytravel/
├── client/                          React 18 SPA (Vite 8, Tailwind v4)
│   ├── src/
│   │   ├── api/                     API fetch helpers (api.ts, providers.ts, ...)
│   │   ├── components/              Shared UI components (Radix, CVA-based)
│   │   ├── features/admin/          Admin-only lazy-loaded feature modules
│   │   ├── hooks/                   Custom React hooks (useFavorites, useLanguage, …)
│   │   ├── lib/                     Pure utilities (cn(), date formatting)
│   │   ├── pages/                   Route-level page components
│   │   ├── stores/                  Zustand store (searchStore only)
│   │   └── types/                   TypeScript type definitions
│   ├── public/                      Static assets (robots.txt, sitemap.xml)
│   └── index.html                   Entry HTML with OG tags + JSON-LD
│
├── server/                          Express 4 REST API (ESM, TypeScript strict)
│   ├── src/
│   │   ├── lib/                     Shared utilities
│   │   │   ├── logger.ts            Pino structured logger
│   │   │   ├── ApiError.ts          Error class with code + status
│   │   │   ├── response.ts          success/paginated/fail helpers
│   │   │   ├── mail.ts              Nodemailer transporter (batched)
│   │   │   ├── sessionStore.ts      MySQL-backed session store
│   │   │   └── i18n.ts              i18n JSON field helpers
│   │   ├── middleware/
│   │   │   ├── asyncHandler.ts      Wraps async route handlers (no try/catch)
│   │   │   ├── requireAuth.ts       Session-based admin auth guard
│   │   │   ├── csrf.ts              CSRF token + validation middleware
│   │   │   ├── upload.ts            Multer config (5MB, images only)
│   │   │   ├── validate.ts          Zod schema validation middleware
│   │   │   ├── searchTiming.ts      Server-Timing header middleware
│   │   │   └── auditLog.ts          Admin action audit logger
│   │   ├── providers/               Provider abstraction layer
│   │   │   ├── types.ts             TourProvider interface + shared types
│   │   │   ├── registry.ts          Singleton provider Map
│   │   │   ├── BaseProvider.ts      Abstract base class (~60% shared code)
│   │   │   ├── alexandriaProvider.ts
│   │   │   ├── orextravelProvider.ts
│   │   │   ├── destinationStore.ts  Known destinations + mapping seeding
│   │   │   ├── regionStore.ts       DB-backed region cache
│   │   │   ├── offerGrouping.ts     Group/merge offers by title+destination
│   │   │   └── publicSearchCache.ts LRU + single-flight + stale-while-revalidate
│   │   ├── routes/
│   │   │   ├── admin/               Admin routes (auth, tours, leads, campaigns, …)
│   │   │   ├── health.ts            Liveness/readiness probes
│   │   │   ├── public.ts            Public tours + inquiries
│   │   │   ├── providerSearchPublic.ts  Unified multi-provider search
│   │   │   ├── alexandriaPublic.ts   Last-minute feed
│   │   │   ├── alerts.ts            Price alert subscriptions
│   │   │   ├── erasure.ts           GDPR Right to Erasure
│   │   │   └── sitemap.xml.ts       Dynamic sitemap generation
│   │   ├── app.ts                   Express app factory (middleware, routes, error handler)
│   │   ├── config.ts                Zod env var parsing + validation
│   │   ├── index.ts                 Entry point (admin seed, cache warm, PM2 ready)
│   │   └── prisma.ts                Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma            Database schema (11 models)
│   │   └── migrations/              Migration history (YYYYMMDDHHMMSS naming)
│   └── __tests__/                   Server tests (Node test runner + tsx)
│
├── e2e/                             Playwright E2E tests
│   ├── homepage.spec.ts
│   ├── search-flow.spec.ts
│   ├── admin-flow.spec.ts
│   └── ...
│
├── scripts/
│   ├── deploy-remote.sh             SSH-based production deploy
│   ├── backup-db.sh                 MySQL daily backup
│   └── verify-backup.sh             Backup integrity verification
│
├── docs/                            Documentation
├── ecosystem.config.cjs             PM2 process configuration
└── .github/workflows/
    ├── ci.yml                       Lint → test → build
    ├── test.yml                     Test-only workflow
    └── deploy.yml                   Production deploy (push to main)
```

---

## Data Flows

### Public Search Flow

```
Client                          API Server                         Provider Cache       MySQL / Provider API
  │                                │                                    │                     │
  │  GET /api/search/all/tours     │                                    │                     │
  │  ?destinationSlug=egypt       │                                    │                     │
  │──────────────────────────────>│                                    │                     │
  │                                │                                    │                     │
  │                                │ 1. Parse + validate query params   │                     │
  │                                │ 2. Look up destination mappings    │                     │
  │                                │───────────────────────────────────────────────────────>    │
  │                                │<────────────────────────────────────────────────────────    │
  │                                │                                    │                     │
  │                                │ 3. For each active provider:       │                     │
  │                                │    - Check query hash in LRU       │                     │
  │                                │───────────────────────────────────>│                     │
  │                                │<── HIT (serve) / MISS (fetch) ────│                     │
  │                                │                                    │                     │
  │                                │ 4. On cache miss:                  │                     │
  │                                │    - Query ProviderTour table      │                     │
  │                                │───────────────────────────────────────────────────────>    │
  │                                │<───────────────────────────────────────────────────────    │
  │                                │ 5. Group offers, apply filters,    │                     │
  │                                │    paginate, store in cache        │                     │
  │                                │                                    │                     │
  │  { tours[], total, page }      │                                    │                     │
  │  Headers: X-Cache, Server-Timing                                    │                     │
  │<──────────────────────────────│                                    │                     │
```

### Tour Import Flow (Admin)

```
Admin UI → POST /api/admin/tours → requireAuth (session check)
  → Zod validation → Prisma create/update → MySQL Tour table
  → Response { ok: true, data: { item: {...} } }
```

### Provider Sync Flow

```
Startup / Cron / Manual
  ↓
Provider.syncToDb() — per-instance mutex (coalesces parallel calls)
  ↓
Fetch external API (XML/JSON)
  ↓
Parse + normalize → UnifiedTour[]
  ↓
Upsert into ProviderTour table (source + externalId unique)
  ↓
Update ProviderSync status + itemCount
  ↓
Update ProviderRegion rows (tourCount)
  ↓
Link destinationId via DestinationMapping
  ↓
Invalidate public search cache entries for this provider
```

### Email Campaign Flow

```
Admin UI → TipTap editor → POST /api/admin/campaigns/send
  ↓
Fetch leads matching segment (e.g., marketingConsent = true)
  ↓
Batch BCC via nodemailer (50 recipients per batch)
  ↓
Create EmailCampaign record with HTML body + recipient count
  ↓
AuditLog entry written
```

### Inquiry Submission Flow

```
Public site inquiry form
  ↓
POST /api/inquiries (rate limited: 30/15min)
  ↓
Zod validation → Upsert Lead by email
  ↓
If tourId provided, associate with Tour
  ↓
Response { ok: true } (201)
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **MySQL** (not PostgreSQL) | Existing infrastructure, good enough for the workload (~5000 tours) |
| **Prisma ORM** (not raw SQL / Drizzle) | Type-safe queries, auto-generated types, migrations-as-docs |
| **Express 4** (not Fastify / Hono) | Mature ecosystem, simple middleware model, adequate perf |
| **React 18** (not Next.js / Remix) | SPA is sufficient; no SSR need; simpler deployment (static build) |
| **Zustand** (not Redux) | Minimal boilerplate, works well for a single store (search) |
| **Tailwind v4** (no CSS-in-JS) | Utility-first, fast iteration, no runtime overhead |
| **Session auth** (not JWT) | Revocable, no token refresh complexity, simpler for admin-only auth |
| **LRU cache** (not Redis) | Single-process deployment fits in 450MB; avoids extra service dependency |
| **Pino** (not Winston) | Faster, JSON-native, lower overhead for structured logging |
| **Zod** (not Joi / Yup) | TypeScript-first, tree-shakeable, smaller bundle |
| **ESM throughout** | Modern standard, better tree-shaking, native Node.js support |
| **No nginx** | Services serve directly on ports; simpler deployment for single-server setup |
| **bcryptjs** (not native bcrypt) | Pure JS avoids native compile issues on production |
| **Provider pattern** (not inline API calls) | Testable, swappable, single responsibility per provider |
| **Czech-first i18n** (not i18next) | Single market; custom `useLanguage` hook is lighter |

---

## Provider Pattern

```
TourProvider (interface in types.ts)
  ▲
  │
BaseProvider (abstract class in BaseProvider.ts)
  ▲            ▲
  │            │
AlexandriaProvider    OrextravelProvider
  │
  └── fetchTours()   — main search, returns UnifiedTour[]
  └── getRegions()    — available destinations
  └── syncToDb()      — full refresh from external API → ProviderTour table
  └── warmCache()     — called on startup
  └── getCacheStatus()— cache metadata for admin UI
```

Providers are registered in `registry.ts` (singleton `Map<string, TourProvider>`). The barrel file `providers/index.ts` registers both providers at import time.

All provider HTTP logic lives **only** in provider files — never in routes.

---

## Error Handling Pattern

```
Route handler (asyncHandler wrapper)
  ↓
  → throws ApiError(code, message, status) for known errors
  → throws ZodError for validation failures
  → throws PrismaClientKnownRequestError for DB conflicts
  ↓
Centralized error middleware (app.ts, mounted last):
  ├── ApiError          → { ok: false, error: { code, message } }   + status
  ├── ZodError          → { ok: false, error: { code: "VALIDATION_ERROR" } }  + 400
  ├── Prisma error      → { ok: false, error: { code: "DB_ERROR" } }  + 409
  └── Unhandled error   → { ok: false, error: { code: "INTERNAL_ERROR" } } + 500
```

**Response envelope**:
- Success: `{ "ok": true, "data": { ... } }`
- Paginated: `{ "ok": true, "data": [...], "meta": { total, page, pageSize, totalPages } }`
- Error: `{ "ok": false, "error": { "code": "ERROR_CODE", "message": "..." } }`

---

## Caching Strategy

- **LRU cache** (`publicSearchCache.ts`): 2000 entries, in-memory
- **Single-flight dedup**: concurrent identical requests share one fetch
- **Stale-while-revalidate**: expired entries served immediately + background refresh
- **Hot keys** (bootstrap, destinations): 5 min TTL
- **Filtered search**: 60s TTL
- **Provider-specific caches**: Alexandria and Orextravel each manage their own cache
- **Cache warming**: on startup via `warmCache()`, staggered background refresh intervals
- **Memory constraint**: `--max-old-space-size=450` in PM2; 450MB RSS triggers restart

---

## Security Layers

1. **Helmet** — CSP, HSTS, X-Frame-Options, referrer policy, nosniff
2. **CORS** — restricted to configured origins in production
3. **Rate limiting** — per-group: auth (10/15min), search (200/min), admin (300/min), inquiries (30/15min), erasure (3/15min), tours (30/15min)
4. **Session auth** — httpOnly, secure, sameSite cookies backed by MySQL store
5. **CSRF** — token generation + validation for admin routes
6. **Input validation** — Zod schemas on all route boundaries
7. **Upload restrictions** — mime type (`image/*`) + size (5MB) via multer
8. **XML hardening** — fast-xml-parser configured to prevent XXE
9. **Password hashing** — bcryptjs, 12 rounds
10. **Sensitive data redaction** — pino configured to redact cookies + auth headers from logs

---

## Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | ≥ 20 |
| **Language** | TypeScript | strict mode |
| **Module system** | ESM | `"type": "module"` |
| **API framework** | Express | 4.x |
| **ORM** | Prisma | 5.x |
| **Database** | MySQL | 8.4 |
| **Frontend** | React | 18.x |
| **Build (client)** | Vite | 8.x (Rolldown) |
| **Styling** | Tailwind CSS | 4.x (`@tailwindcss/vite`) |
| **State** | Zustand | 5.x |
| **UI primitives** | Radix UI | — |
| **Icons** | Lucide React | — |
| **Rich text** | TipTap | admin campaigns |
| **Logging** | Pino | structured JSON |
| **Email** | Nodemailer | batched BCC |
| **Validation** | Zod | input schemas |
| **Testing (server)** | Node test runner + tsx | — |
| **Testing (client)** | Vitest + Testing Library + jsdom | — |
| **E2E** | Playwright | latest |
| **Linting** | ESLint 9 (flat config) + Prettier | — |
| **Process manager** | PM2 | ecosystem.config.cjs |
| **CI/CD** | GitHub Actions | lint → test → deploy |

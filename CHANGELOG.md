# Changelog

All notable changes to SkyTravel are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Provider abstraction layer (`TourProvider` interface, registry pattern)
- Unified multi-provider search with LRU cache + single-flight + stale-while-revalidate
- Destination mapping system for cross-provider canonical search
- Price alerts with email notifications
- GDPR erasure endpoint (`POST /api/erasure`)
- ESLint 9 flat config with TypeScript strict rules
- Prettier formatting with Husky + lint-staged pre-commit hooks
- Zod input validation on all API endpoints
- Structured logging with pino (JSON in prod, pretty in dev)
- Request ID middleware for tracing
- Health check endpoints (`/api/health`, `/api/health/ready`)
- Comprehensive test suite: 51 server tests, 48 client tests, Playwright E2E setup
- CI pipeline (`ci.yml`: lint → test → build → security audit)
- Database backup automation (`scripts/backup-db.sh`)
- Skeleton loading components (`Skeleton`, `TourCardSkeleton`)
- Error/empty state components (`ErrorMessage`, `EmptyState`)
- `usePageTitle` hook for per-route document titles
- SEO: robots.txt, sitemap.xml, Open Graph meta tags, JSON-LD structured data
- Modal entrance animations (fade-in + scale)
- Global `:focus-visible` ring and `prefers-reduced-motion` support
- Web Vitals reporting (CLS, INP, LCP, FCP, TTFB)
- Bundle splitting (vendor-react, vendor-radix, vendor-tiptap chunks)
- Image optimization (lazy loading, explicit dimensions, preconnect)
- Operational runbook (`docs/operations.md`)
- Full documentation suite (API, architecture, database, providers, contributing)

### Changed

- Server entry point split into `app.ts` (factory) + `index.ts` (startup)
- All `console.*` calls replaced with `logger.*` (pino)
- PM2 config: added `wait_ready`, `kill_timeout`, `listen_timeout`, log file paths
- Password hashing upgraded from 10 to 12 bcrypt rounds
- `.env.example` expanded with all configuration variables
- README rewritten with complete setup guide

### Security

- Helmet with full CSP directives
- Session store moved from in-memory to MySQL-backed
- Hardened XML parsing (XXE prevention via fast-xml-parser config)
- Upload filename sanitization and mime-type validation
- Per-endpoint-group rate limiting (auth, search, admin, erasure)
- `npm audit` step in CI pipeline
- Cookie attributes: httpOnly, secure, sameSite in production

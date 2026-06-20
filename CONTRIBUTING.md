# Contributing to SkyTravel

## Development Setup

```bash
git clone <repo-url> && cd skytravel
npm ci
cp server/.env.example server/.env   # fill in DATABASE_URL + provider keys
npm --workspace server run prisma:generate
npm --workspace server run prisma:migrate
npm run dev
```

Requires Node.js ≥ 20 and MySQL 8.0.

## Code Standards

- **TypeScript strict mode** — no `any`, use generated Prisma types
- **ESLint 9** flat config — must pass with zero warnings
- **Prettier** — auto-formatted on commit via Husky + lint-staged
- **`import type`** for type-only imports
- **ESM** — `"type": "module"` in both workspaces

## Branch Strategy

- `main` — production (auto-deploys on push)
- `feature/description` — new features
- `fix/description` — bug fixes

## Commit Messages

Use conventional commits:

```
feat: add price alert email notifications
fix: correct date parsing for Alexandria provider
chore: update dependencies
docs: add API endpoint reference
```

## Pull Request Checklist

- [ ] Code compiles: `npm run build`
- [ ] Lints pass: `npm run lint`
- [ ] Formatted: `npm run format:check`
- [ ] Server tests pass: `npm --workspace server run test`
- [ ] Client tests pass: `npm --workspace client run test`
- [ ] New features have tests
- [ ] API changes documented in `docs/api.md`
- [ ] Migration included if schema changed
- [ ] `.env.example` updated for new env vars

## Architecture Rules

- **No JWT/tRPC/GraphQL/Next.js/Redux/React Query** — see copilot-instructions.md
- **No native-build deps** (bcrypt, sharp) — they break production installs
- **Provider logic** lives in `server/src/providers/` — never inline HTTP calls in routes
- **Async routes** wrapped in `asyncHandler` middleware — no per-route try/catch
- **State:** Zustand only for search flow; component-local state elsewhere
- **Styling:** Tailwind v4 utilities + CVA pattern. No CSS-in-JS.

## Testing

```bash
npm --workspace server run test    # Node test runner (51 tests)
npm --workspace client run test    # Vitest + Testing Library (48 tests)
npm run test:e2e                   # Playwright (requires running server)
```

When adding new features:

- Server routes → add integration test in `server/src/__tests__/`
- Client components → add test alongside in same directory
- Complex logic → add unit test for the pure function

## File Organization

| What                 | Where                                     |
| -------------------- | ----------------------------------------- |
| React page component | `client/src/pages/PageName.tsx`           |
| React hook           | `client/src/hooks/useHookName.ts`         |
| API helper           | `client/src/api/*.ts`                     |
| Server route         | `server/src/routes/resourceName.ts`       |
| Admin route          | `server/src/routes/admin/resourceName.ts` |
| Provider             | `server/src/providers/providerName.ts`    |
| Middleware           | `server/src/middleware/middlewareName.ts` |
| Shared util          | `server/src/lib/utilName.ts`              |

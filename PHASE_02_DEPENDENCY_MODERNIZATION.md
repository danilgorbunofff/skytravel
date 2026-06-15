# Phase 02 — Dependency Modernization

## Overview

Systematic dependency upgrades across the monorepo. Prisma 5→6→7 (two-step), bcryptjs 2→3, TypeScript 5→6, plus minor bumps for vite 8.x, vitest 4.x, helmet 8.2.0, zustand 5.0.14, express-rate-limit, tsx 4.22.4, and research-only evaluations of React 19 and Express 5.

## Prisma 5→6→7 Migration Strategy (HIGH RISK)

### Prisma 5→6 (Step 1)

**File:** `server/package.json`

```json
"@prisma/client": "^6.6.0",
"prisma": "^6.6.0",
```

**Breaking changes in Prisma 6:**
1. **`NotFoundError` removed** — use `PrismaClientKnownRequestError` with code `P2025` instead
   - Grep for `NotFoundError` across the server workspace
   - Replace `import { NotFoundError }` with `import { PrismaClientKnownRequestError }`
   - Replace `err instanceof NotFoundError` with `err instanceof PrismaClientKnownRequestError && err.code === "P2025"`
2. **TypeScript minimum** raised to 5.1 — already met (we're on 5.5)
3. **`fullTextSearch` on MySQL becomes GA** — if used, no change needed; if not used, no impact
4. **`prisma generate` output path changes** — may require explicit `output` in schema generator block

**Commands:**
```bash
npm install --workspace server @prisma/client@^6.6.0 prisma@^6.6.0
npx prisma generate
npx tsc --noEmit
```

**Potential file changes:**
- Search for `NotFoundError` imports: `grep -r "NotFoundError" server/src/`
- Search for `err.code === "P2025"` or `err instanceof PrismaClientKnownRequestError`

### Prisma 6→7 (Step 2 — MAJOR ARCHITECTURAL CHANGE)

**Prisma 7 fundamentally changes the client architecture:**
1. Provider changes from `prisma-client-js` to `prisma-client`
2. Datasource URL moves from `schema.prisma` to `prisma.config.ts`
3. Requires `@prisma/adapter-mariadb` for MySQL compatibility
4. Client output goes to a configurable path (e.g., `./generated/prisma/client`)
5. All imports from `@prisma/client` must be updated

**Step-by-step:**

#### A. Install Prisma 7 and adapter
```bash
npm install --workspace server @prisma/client@^7.0.0 prisma@^7.0.0 @prisma/adapter-mariadb@^7.0.0
```

#### B. Update `schema.prisma`

Change the generator provider:
```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma/client"
}
```

Remove the `datasource` block's `url` — it moves to config:
```prisma
datasource db {
  provider = "mysql"
  // url = env("DATABASE_URL")   // REMOVED — moved to prisma.config.ts
}
```

**Final `schema.prisma` `datasource` block:**
```prisma
datasource db {
  provider = "mysql"
}
```

#### C. Create `server/prisma.config.ts`

```typescript
import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL!,
  directUrl: process.env.DATABASE_DIRECT_URL, // optional, for connection pooling
});
```

#### D. Update PrismaClient instantiation in `server/src/prisma.ts`

```typescript
import { PrismaClient } from "../prisma/generated/prisma/client/index.js";
// or from the generated output path
import { PrismaClient } from "./generated/prisma/client/index.js";
```

Actually, with Prisma 7, the module resolution changes. Let me research the exact import path during implementation. But **the key change** is:

```typescript
// Before (Prisma 5/6):
import { PrismaClient } from "@prisma/client";

// After (Prisma 7):
import { PrismaClient } from "./generated/prisma/client/index.js";
```

#### E. Update all imports across the server

Search for all `from "@prisma/client"` imports and replace them. This affects:
- `server/src/prisma.ts`
- `server/src/providers/alexandriaProvider.ts` (line 6: `import { type Prisma } from "@prisma/client"`)
- `server/src/providers/orextravelProvider.ts` (line 5: `import { type Prisma } from "@prisma/client"`)
- Any other files importing from `@prisma/client`

**New import pattern:**
```typescript
import { PrismaClient, type Prisma } from "../prisma/generated/prisma/client/index.js";
```

Or better, create a re-export barrel:

Create `server/src/prisma/client.ts`:
```typescript
export * from "../../prisma/generated/prisma/client/index.js";
```

Then import from `../prisma/client.js` instead.

#### F. Generate client explicitly
```bash
npx prisma generate
```
Note: `prisma generate` no longer runs automatically on install — it must be called explicitly.

#### G. Update build scripts

In `server/package.json`, the build script already calls `prisma generate`:
```json
"build": "prisma generate && tsc -p tsconfig.json",
```

This is still correct, but ensure the generated output path is in `.gitignore`:
```gitignore
server/prisma/generated/
```

**Acceptance criteria:**
- `npx prisma generate` produces the client in `server/prisma/generated/prisma/client/`
- `npx tsc --noEmit` passes
- All Prisma queries work (test suite passes)
- All `@prisma/client` imports are updated

## TypeScript 6.0 Migration (MEDIUM RISK)

### Breaking defaults in TS 6.0

| Setting | TS 5.x default | TS 6.0 default | Impact |
|---------|---------------|----------------|--------|
| `strict` | `false` | `true` | Our tsconfig already sets `strict: true` — no change |
| `module` | varies | `esnext` | Our server uses `ES2022`, client uses `ESNext` — both fine |
| `types` | `["node"]` inferred | `[]` | **Server needs explicit `"types": ["node"]`** — already set |
| `rootDir` | inferred from `include` | `"."` | **Server explicitly sets `"rootDir": "src"` — fine**; client has `noEmit: true` so no issue |

### Server `tsconfig.json` check

Current (`server/tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

TS 6.0 compatibility:
- `"types": ["node"]` — ✅ already explicit
- `"rootDir": "src"` — ✅ already explicit
- `"moduleResolution": "Bundler"` — not deprecated, fine
- `"esModuleInterop"` and `"allowSyntheticDefaultImports"` — always enabled in TS 6, fine
- `"target": "ES2022"` — fine

**Potential issue:** In TS 6, `rootDir` defaults to `"."` when not set, but we have it explicitly. ✅

### Client `tsconfig.json` check

Current (`client/tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    ...
  }
}
```

TS 6.0 compatibility:
- `noEmit: true` — fine
- `jsx: "react-jsx"` — fine (not deprecated)
- Missing `"types": []` — now default in TS 6, so the `@types/react` etc. won't be auto-included. Need to add `"types": []` explicitly or use triple-slash directives.
  - Actually, with `skipLibCheck: true` (not set in client), this may cause issues. Add `"skipLibCheck": true`.

### Upgrade steps

1. Update TypeScript across all workspaces:
```bash
npm install --save-dev --workspace root typescript@^6.0.3
npm install --save-dev --workspace server typescript@^6.0.3
npm install --save-dev --workspace client typescript@^6.0.3
```

2. Update `@types/node` for TS 6 compatibility:
```bash
npm install --save-dev --workspace server @types/node@^22.0.0
```

3. Update client tsconfig:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "types": [],
    // ... rest unchanged
  }
}
```

4. Run typecheck:
```bash
npx tsc --noEmit --workspace server
npx tsc --noEmit --workspace client
```

**If there are TS 6 errors:**
- `ignoreDeprecations` is not needed in TS 6 (was a TS 5.x migration aid)
- Fix any new errors related to `useDefineForClassFields`, `verbatimModuleSyntax`, or `isolatedModules`

### Commands
```bash
npm install --save-dev --workspace server typescript@^6.0.3 @types/node@^22.0.0
npm install --save-dev --workspace client typescript@^6.0.3
npx tsc --noEmit --workspace server
npx tsc --noEmit --workspace client
```

**Acceptance criteria:**
- `npx tsc --noEmit` passes for both server and client workspaces
- No new TypeScript errors

## Minor Bumps

### bcryptjs 2.4.3 → 3.0.3
```bash
npm install --workspace server bcryptjs@^3.0.3
npm uninstall --workspace server @types/bcryptjs
```

bcryptjs 3.x includes its own types — remove `@types/bcryptjs` devDependency.

Verify `hash()` and `compare()` APIs are unchanged (they are — bcryptjs has maintained the same API for years).

### helmet → 8.2.0
```bash
npm install --workspace server helmet@^8.2.0
```
Drop-in, zero dependencies changed. Verify CSP headers still work.

### zustand → 5.0.14
```bash
npm install --workspace client zustand@^5.0.14
```
Same major, safe minor/patch bump. Verify store behavior unchanged.

### express-rate-limit → latest
```bash
npm install --workspace server express-rate-limit@^8.5.0
```
Already at 8.x — safe minor bump. Verify ESM import `{ rateLimit }` still works.

### tsx → 4.22.4
```bash
npm install --save-dev --workspace server tsx@^4.22.4
```
Uses esbuild, not tsc — compatible with TS 6. Verify `npm run dev` still works.

### lucide-react → latest patches
```bash
npm install --workspace client lucide-react@^1.15.0
```

### @radix-ui/* → latest patches
```bash
npm install --workspace client @radix-ui/react-dialog@latest @radix-ui/react-label@latest @radix-ui/react-select@latest @radix-ui/react-separator@latest @radix-ui/react-slot@latest @radix-ui/react-switch@latest @radix-ui/react-tabs@latest
```
Individual package bumps — verify no breaking changes in changelogs.

### @tiptap/* → latest patches
```bash
npm install --workspace client @tiptap/extension-image@latest @tiptap/extension-link@latest @tiptap/extension-placeholder@latest @tiptap/pm@latest @tiptap/react@latest @tiptap/starter-kit@latest
```

### Vite 8.x (already using) → latest patch
```bash
npm install --save-dev --workspace root vite@^8.1.0
npm install --save-dev --workspace client vite@^8.1.0
```

### vitest 4.x (already using) → latest patch
```bash
npm install --save-dev --workspace client vitest@^4.2.0
```

### rollup-plugin-visualizer
```bash
npm install --save-dev --workspace client rollup-plugin-visualizer@^7.2.0
```

### Overall minor bump command
Run after TypeScript 6 migration:
```bash
npm update --workspace server
npm update --workspace client
```

## React 19 Research (DO NOT EXECUTE — document findings)

### Key changes
1. **`forwardRef` deprecated** — `ref` is available as a regular prop now
   - Current usage: `client/src/` components using `forwardRef` need migration
   - Migration: remove `forwardRef` wrapper, access `ref` from props

2. **`<Context.Provider>` → `<Context>`**
   - `<MyContext.Provider value={x}>` → `<MyContext value={x}>`
   - Check if any context providers exist in the client codebase

3. **New hooks:**
   - `useActionState` — form state management
   - `useFormStatus` — loading state for form submissions
   - `useOptimistic` — optimistic UI updates
   - `use(Promise)` — suspend at render time

4. **Document metadata auto-hoisting**
   - `<title>`, `<meta>` tags render correctly anywhere in the component tree
   - May simplify the `usePageTitle` hook in `client/src/hooks/useLanguage.ts` or similar

5. **Breaking: ref callbacks returning cleanup functions**
   - `useRef` callback: `(el) => { /* setup */; return () => { /* cleanup */ } }`
   - Any `ref` callbacks returning functions will be treated as cleanup

6. **Zustand v5** is compatible with React 19 — no changes needed

### Migration plan for future phase
1. `npm install react@^19.0.0 react-dom@^19.0.0`
2. `npm install @types/react@^19.0.0 @types/react-dom@^19.0.0`
3. Search for `forwardRef` usage — update to prop-based refs
4. Search for `.Provider` on contexts — update to direct `<Context>` usage
5. Update `@testing-library/react` to version compatible with React 19
6. Run full test suite

## Express 5 Research (DO NOT EXECUTE — document findings)

### Key changes in `server/`

1. **`app.del()` → `app.delete()`**
   - Search for `app.del(` in server routes — replace with `app.delete(`

2. **`req.param(name)` deprecated** — use `req.params`, `req.body`, or `req.query` directly
   - Search for `req.param(` usage

3. **`res.json(obj, status)` → `res.status(status).json(obj)`**
   - The `success()` helper in `server/src/lib/response.ts` already uses `res.status(status).json(...)` — check all direct `res.json()` calls

4. **`res.send(body, status)` → `res.status(status).send(body)`**
   - Search for `res.send(` with two arguments

5. **Path route syntax changes:**
   - `*` → `/*splat` (wildcard routes)
   - `?` → `{...}` (optional params)
   - `:param?` → `:param` (optional params removed)
   - Check routes using `*` or `?` patterns

6. **`req.body` defaults to `undefined`** (was `{}`)
   - Check any code that reads `req.body.something` without checking `req.body` first

7. **Async error handlers improved**
   - Express 5 catches promise rejections from async route handlers automatically
   - The `asyncHandler` wrapper in `server/src/middleware/asyncHandler.ts` may no longer be needed
   - Keep it for Express 4 compatibility; remove after migration

### Codemod available
```bash
npx codemod@latest @expressjs/v5-migration-recipe
```

### Migration plan for future phase
1. Run the codemod
2. `npm install express@^5.0.0`
3. Fix route path syntax changes
4. Remove `asyncHandler` wrappers
5. Update error handling patterns
6. Run full test suite

## Verification

```bash
# Full typecheck
npx tsc --noEmit --workspace server
npx tsc --noEmit --workspace client

# All tests pass
npm --workspace server run test
npm --workspace client run test

# Prisma client generates
npx prisma generate --workspace server

# Dev server starts
npm run dev

# Build succeeds
npm run build
```

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Prisma 5→6 | **MEDIUM** — `NotFoundError` removal, generator output changes | Grep for `NotFoundError`; run tests after each step |
| Prisma 6→7 | **HIGH** — architectural change, new adapter, import path changes | Research exact Prisma 7 API before implementing; test thoroughly |
| TypeScript 6 | **MEDIUM** — new defaults may expose latent issues | Already have `strict: true`; add explicit `types` config |
| Minor bumps | **LOW** — same major versions | Run tests, verify typecheck |
| React 19 | **RESEARCH ONLY** — not executing | Document findings for future phase |
| Express 5 | **RESEARCH ONLY** — not executing | Document findings for future phase |

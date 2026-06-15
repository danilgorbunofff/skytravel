# Phase 04 — Server Code Quality

## Overview

Fix code quality issues identified during audit: `fail()` throw pattern verification, replace direct `process.env` references with config, replace `console.*` with logger, fix `sessionStore.ts` to use config, add LRU eviction to `alexandriaPublic.ts` cache, replace `err.constructor.name` with `instanceof` in error handler, and remove mock partner tour data from the client.

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `server/src/routes/admin/campaigns.ts` | verify | Check `fail()` call sites for dead code after throw |
| `server/src/routes/auth.ts` | verify | Check `fail()` call site (line 41) |
| `server/src/routes/erasure.ts` | verify | Check `fail()` call site (line 31) |
| `server/src/config.ts` | modify | Keep console for module-init errors; no change needed |
| `server/src/prisma.ts` | modify | Replace `console.error` with `logger.error` on line 7 |
| `server/src/lib/sessionStore.ts` | modify | Import `config` and use `config.databaseUrl` instead of parsing `process.env.DATABASE_URL` directly |
| `server/src/routes/alexandriaPublic.ts` | modify | Replace `Map<number, ...>` with `LRUCache`; replace `process.env.ALEXANDRIA_COUNTRY` with `config.alexandria.country` |
| `server/src/app.ts` | modify | Replace `err.constructor.name === "PrismaClientKnownRequestError"` with `err instanceof Prisma.PrismaClientKnownRequestError` (lines 217–223) |
| `server/src/lib/response.ts` | verify | Ensure `fail()` has correct return type `never` |
| `client/src/data.ts` | modify | Remove or deprecate `partnerTours` mock array (line 145) |
| `client/src/pages/HomePage.tsx` | modify | Remove references to `partnerTours` and `getPartnerTourDetailsFromApi` |

## Implementation Steps

### Step 1: Verify fail() throw pattern

**File:** `server/src/lib/response.ts`

Current implementation (line 16–17):
```typescript
export function fail(code: string, message: string, status = 400): never {
  throw new ApiError(code, message, status);
}
```

The return type is `never` — correct. The `throw` acts as a control flow break, so code after `fail()` is unreachable in the same function scope.

**Call sites to verify:**

#### campaigns.ts (line 28):
```typescript
const leads = await prisma.lead.findMany({ where, select: { email: true } });
if (leads.length === 0) {
  fail("NO_RECIPIENTS", "No recipients.", 400);
}
// No code after this if-block that depends on leads being non-empty
```
✅ Safe — if `leads.length === 0`, `fail()` throws. The `transporter.sendMail()` call on line 44 will not execute. No dead code follows.

#### campaigns.ts (lines 32–37):
```typescript
if (!transporter) {
  fail("SMTP_NOT_CONFIGURED", "...", 400);
}
```
✅ Safe — throw exits before `fromValue` processing.

#### campaigns.ts (lines 40–42):
```typescript
if (!fromValue || !EMAIL_RE.test(fromValue)) {
  fail("INVALID_FROM", "Missing or invalid from email.", 400);
}
```
✅ Safe.

#### campaigns.ts (lines 76–80):
```typescript
if (!transporter) {
  fail("SMTP_NOT_CONFIGURED", "...", 400);
}
```
✅ Safe.

#### campaigns.ts (lines 84–85):
```typescript
if (!fromValue || !EMAIL_RE.test(fromValue)) {
  fail("INVALID_FROM", "Missing or invalid from email.", 400);
}
```
✅ Safe.

**Search for all `fail()` call sites:**
```bash
grep -rn "fail(" server/src/ --include="*.ts"
```

Expected count: ~20 call sites. For each, verify:
1. The line after `fail()` is NOT intended to execute
2. If there IS code after `fail()` that looks like it should execute, add a `return fail(...)` pattern instead

**Specifically check** `server/src/routes/tours.ts` (if it exists — not found in initial exploration), `server/src/routes/erasure.ts`, `server/src/routes/auth.ts`:

If `fail()` is called within a `.map()`, `.filter()`, or callback, the `throw` will NOT break the outer function — it will propagate through the Promise chain but may cause unhandled rejections. Check for this pattern.

**Acceptance:** No dead code after `fail()` calls. TypeScript `never` return type ensures this at compile time — `npx tsc --noEmit` should catch any issues.

### Step 2: Fix config and env references

#### a. `server/src/config.ts` — Already canonical

The `process.env.ALEXANDRIA_COUNTRY` usage on line 44 is **already** within the config object:
```typescript
alexandria: {
  url: process.env.ALEXANDRIA_API_URL || "http://export.alexandria.cz/export",
  apiKey: process.env.ALEXANDRIA_API_KEY || "",
  country: Number(process.env.ALEXANDRIA_COUNTRY || 107),
},
```

This is correct — `config.alexandria.country` should be used everywhere else.

#### b. `server/src/routes/alexandriaPublic.ts` — Line 15

**Current:**
```typescript
const ALEXANDRIA_COUNTRY = Number(process.env.ALEXANDRIA_COUNTRY || 107);
```

**Replace with:**
```typescript
import { config } from "../config.js";

// ... at the module level:
const ALEXANDRIA_COUNTRY = config.alexandria.country;
```

#### c. `server/src/lib/alexandria.ts` — Line 7

**Current:**
```typescript
const ALEXANDRIA_COUNTRY = Number(process.env.ALEXANDRIA_COUNTRY || 107);
```

**Replace with:**
```typescript
import { config } from "../config.js";

const ALEXANDRIA_COUNTRY = config.alexandria.country;
```

#### d. Verify no remaining `process.env.ALEXANDRIA_COUNTRY`

```bash
grep -rn "ALEXANDRIA_COUNTRY" server/src/ --include="*.ts"
```

Expected result: Only `server/src/config.ts` should contain `process.env.ALEXANDRIA_COUNTRY`. All other files should use `config.alexandria.country`.

**Acceptance:** `grep` for `process.env.ALEXANDRIA_COUNTRY` returns only `config.ts`.

### Step 3: Replace console.* with logger.*

#### a. `server/src/prisma.ts` — Line 7

**Current:**
```typescript
prisma.$disconnect().catch(console.error);
```

**Replace with:**
```typescript
import { logger } from "./lib/logger.js";

prisma.$disconnect().catch((e) => logger.error(e, "prisma disconnect error"));
```

#### b. `server/src/config.ts` — Keep console for module init

Lines 4–5 and 9–10 use `console.error` at module initialization before any logger is available. This is acceptable:
```typescript
if (isProd && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET must be set in production.");
  process.exit(1);
}
```

These are fatal errors that prevent the app from starting — `console.error` is fine here since the logger may not be initialized.

Lines 77–78 and 82 also use `console.error`/`console.warn` at init time:
```typescript
if (Number.isNaN(config.port) || config.port < 1 || config.port > 65535) {
  console.error("FATAL: PORT must be a valid number between 1 and 65535.");
  process.exit(1);
}

for (const w of warnings) {
  console.warn(`[config] ⚠ ${w}`);
}
```

These are acceptable for the same reason — they run during config initialization.

**However**, consider replacing `console.warn` with `process.stderr.write` for consistency:
```typescript
for (const w of warnings) {
  process.stderr.write(`[config] ⚠ ${w}\n`);
}
```

**Acceptance:** No `console.*` in runtime code paths. Module init logging is acceptable.

### Step 4: Fix sessionStore.ts to use config

**File:** `server/src/lib/sessionStore.ts`

**Current:**
```typescript
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const msg = "FATAL: DATABASE_URL...";
  console.error(msg);
  throw new Error(msg);
}

export const sessionStore = new MySQLStore({
  ...parseDatabaseUrl(dbUrl),
  ...
});
```

**Replace with:**
```typescript
import { config } from "../config.js";

const dbUrl = config.databaseUrl; // <-- need to add databaseUrl to config
if (!dbUrl) {
  const msg = "FATAL: DATABASE_URL...";
  console.error(msg);
  throw new Error(msg);
}

export const sessionStore = new MySQLStore({
  ...parseDatabaseUrl(dbUrl),
  ...
});
```

**Also need to add `databaseUrl` to `server/src/config.ts`:**
```typescript
export const config = {
  // ... existing properties
  databaseUrl: process.env.DATABASE_URL || "",
  // ...
};
```

Wait — `DATABASE_URL` is already validated at the top of `config.ts` (lines 8–11). So we should expose it in the config object. Add it alongside `sessionSecret`:

```typescript
export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  sessionSecret: process.env.SESSION_SECRET || "dev-secret",
  databaseUrl: process.env.DATABASE_URL || "",
  // ...
};
```

**Note:** The module-level `if (!process.env.DATABASE_URL)` check on lines 8–11 already exits early, so `config.databaseUrl` will never be empty at runtime.

**Acceptance:** `sessionStore.ts` uses `config.databaseUrl` instead of parsing `process.env.DATABASE_URL` directly.

### Step 5: Add LRU eviction to alexandriaPublic.ts

**File:** `server/src/routes/alexandriaPublic.ts`

**Current (lines 13–14):**
```typescript
const feedCacheMap = new Map<number, { data: AlexandriaTourInput[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min
```

**Replace with LRUCache:**
```typescript
import { LRUCache } from "lru-cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 min

const feedCache = new LRUCache<number, { data: AlexandriaTourInput[]; ts: number }>({
  max: 10,          // max 10 countries cached
  ttl: CACHE_TTL,   // auto-expire entries after TTL
});
```

**Update `getCachedFeed` function (lines 17–25):**
```typescript
async function getCachedFeed(countryId?: number): Promise<AlexandriaTourInput[]> {
  const zeme = countryId ?? ALEXANDRIA_COUNTRY;
  const cached = feedCache.get(zeme);
  if (cached) return cached.data;
  const parsed = await fetchAlexandriaParsed(zeme);
  const mapped = extractToursFromParsed(parsed);
  feedCache.set(zeme, { data: mapped, ts: Date.now() });
  return mapped;
}
```

**Note:** `LRUCache` with `ttl` handles both max size and TTL expiration. The `fetch()` call on line 120 in `alexandriaProvider.ts` also has a `feedCacheMap` — that one should also be evaluated for LRU, but it's a separate step (Phase 03 covers provider architecture, where the AlexandriaProvider gets refactored).

**Acceptance:** Memory bounded to 10 entries, old entries evicted automatically.

### Step 6: Fix error handler instanceof check

**File:** `server/src/app.ts`, lines 217–223

**Current:**
```typescript
if (err.constructor.name === "PrismaClientKnownRequestError") {
  logger.error({ err }, "Prisma error");
  res
    .status(409)
    .json({ ok: false, error: { code: "DB_ERROR", message: "Database conflict" } });
  return;
}
```

**Replace with:**
```typescript
import { Prisma } from "@prisma/client";

// In the error handler:
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  logger.error({ err }, "Prisma error");
  res
    .status(409)
    .json({ ok: false, error: { code: "DB_ERROR", message: "Database conflict" } });
  return;
}
```

**Add Prisma import at the top of `app.ts`:**
```typescript
import { Prisma } from "@prisma/client";
```

Wait — `@prisma/client` may not export `Prisma` in all versions. In Prisma 5.x, the `Prisma` namespace is available as `@prisma/client` → `Prisma`. If the import causes issues, use:
```typescript
import type { Prisma } from "@prisma/client";
```

The `PrismaClientKnownRequestError` is a class constructor, so `instanceof` works correctly.

**Acceptance:** Error handler correctly identifies Prisma errors via `instanceof` instead of fragile `constructor.name` string check.

### Step 7: Remove mock partner tour data

#### a. `client/src/data.ts` — Line 145

**Remove the `partnerTours` export:**

```typescript
// REMOVE entire block:
export const partnerTours: PartnerTour[] = [
  { hotel: "King Tut Aqua Park Beach Resort", ... },
  ...
];
```

Also remove the `PartnerTour` type if it's no longer used elsewhere.

#### b. `client/src/pages/HomePage.tsx`

**Remove references:**

1. Line 3: Remove `partnerTours` and `PartnerTour` from import:
   ```typescript
   // Before:
   import { favorites, heroImages, partnerTours, type OwnTour, type PartnerTour } from "../data";
   // After:
   import { favorites, heroImages, type OwnTour } from "../data";
   ```

2. Lines 106–112: Remove the `filteredPartners` useMemo:
   ```typescript
   // REMOVE entirely:
   const filteredPartners = useMemo(() => {
     return partnerTours.filter((tour) => { ... });
   }, [activeBudget]);
   ```

3. Remove the `openPartnerModal` function (lines 206–219):
   ```typescript
   // REMOVE entirely:
   async function openPartnerModal(tour: PartnerTour) { ... }
   ```

4. Remove `getPartnerTourDetailsFromApi` function (lines 789–795):
   ```typescript
   // REMOVE entirely:
   function getPartnerTourDetailsFromApi(tour: PartnerTour) { ... }
   ```

5. Remove any JSX that references `filteredPartners` or `openPartnerModal`. Search the template section (lines 220–786) for references.

**If partner tours feature is still desired:**
- Keep the `PartnerTour` type and `partnerTours` data but mark them as `@deprecated` with a JSDoc comment
- Add an API endpoint stub comment suggesting future implementation

**Acceptance:**
- `partnerTours` is no longer exported from `data.ts`
- `getPartnerTourDetailsFromApi` no longer exists in `HomePage.tsx`
- No broken imports or references to removed symbols
- `npx tsc --noEmit` passes for client workspace

## Verification

```bash
# Lint passes
npm run lint

# TypeScript compiles for both workspaces
npx tsc --noEmit --workspace server
npx tsc --noEmit --workspace client

# Server tests pass
npm --workspace server run test

# Client tests pass
npm --workspace client run test

# Client build works
npm --workspace client run build
```

**Manual verification:**
- Start server, verify error responses use `instanceof` correctly
- Verify `alexandriaPublic.ts` cache is bounded (make 15 different `zeme` requests, verify only 10 cached)
- Verify no `console.error`/`console.warn` spam in runtime logs
- Verify `GET /api/alexandria/last-minute` still works
- Verify `GET /api/admin/campaigns/send` still works (session store)
- Open the homepage, verify no broken UI sections from removed partner tours

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| `fail()` pattern verification | **LOW** — `never` return type ensures safety at compile time | TypeScript catches any code after `fail()` that would execute |
| Replace `process.env` with config | **LOW** — mechanical replacement | Verify with grep after changes |
| Replace `console.*` with logger | **LOW** — well-understood pattern | Verify runtime logs |
| `sessionStore.ts` config | **LOW** — additive import | Verify session creation still works |
| LRU cache for alexandriaPublic | **LOW** — `lru-cache` already a dependency | Verify API response |
| `instanceof` error check | **LOW** — standard pattern | Verify error responses |
| Remove mock partner tours | **LOW** — removing dead code | Verify homepage renders without errors |

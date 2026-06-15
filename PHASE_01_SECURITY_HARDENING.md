# Phase 01 — Security Hardening

## Overview

Immediate security fixes addressing dependency CVEs, debug endpoint exposure, CSRF hardening, session cookie hardening, email BCC chunking, rate limiting on public tour endpoints, PII hashing for leads and price alerts, and SESSION_SECRET validation.

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `server/package.json` | modify | Update `fast-xml-parser` to `^5.8.0`, `multer` to `^2.2.0`, `express-session` to `^1.19.0` |
| `server/src/app.ts` | modify | Guard `/api/test-ip` endpoint behind `if (!config.isProd)`; add `toursLimiter` rate limiter applied to `/api/tours` routes |
| `server/src/middleware/csrf.ts` | modify | Set CSRF cookie `httpOnly: true`; change `sameSite` to `"strict"` in production (lines 16–20) |
| `server/src/config.ts` | modify | Enhance `SESSION_SECRET` validation: enforce minimum 32-char length, warn on default `"dev-secret"` in non-dev |
| `server/src/routes/admin/campaigns.ts` | modify | Add BCC chunking: split `leads.map(l => l.email)` into batches of 50, send each batch as separate `transporter.sendMail()` call (lines 44–51) |
| `server/src/lib/mail.ts` | modify | Add `sendBatchedEmail()` utility function that accepts a recipient array and chunks by configurable batch size |
| `server/prisma/schema.prisma` | modify | Add `hashedEmail` field (`String @db.VarChar(64)`) to `Lead` and `PriceAlert` models |
| `server/src/lib/hash.ts` | **create** | SHA-256 hashing utility for emails |

## Implementation Steps

### Step 1: Upgrade vulnerable dependencies

**What:** Update dependency versions in `server/package.json`.

**Changes:**
```json
"fast-xml-parser": "^5.8.0",
"multer": "^2.2.0",
"express-session": "^1.19.0",
```

Remove the `@types/multer` devDependency (multer 2.x includes its own types):
```json
// Remove this line:
"@types/multer": "^1.4.11",
```

Remove the `@types/express-rate-limit` devDependency (express-rate-limit 8.x includes its own types):
```json
// Remove this line:
"@types/express-rate-limit": "^5.1.3",
```

Also update the root `package.json` overrides if they reference multer via transitive deps — but multer 2.x drops the deprecated `package.json` config fields that caused the `node-pre-gyp` issues.

**Commands:**
```bash
npm install --workspace server fast-xml-parser@^5.8.0 multer@^2.2.0 express-session@^1.19.0
npm uninstall --workspace server @types/multer @types/express-rate-limit
```

**Acceptance criteria:**
- `npx npm audit` shows no HIGH/CRITICAL for these packages
- `npx tsc --noEmit` passes in server workspace
- multer CVEs resolved: CVE-2025-47935, CVE-2025-47944, CVE-2025-48997, CVE-2025-7338, CVE-2026-2359, CVE-2026-3304, CVE-2026-3520, CVE-2026-5038, CVE-2026-5079

### Step 2: Update multer upload middleware imports

**What:** Verify multer 2.x API compatibility in the uploads route.

**Check file:** `server/src/routes/admin/uploads.ts` (create if missing but check first).

multer 2.x API changes:
- `upload.single()`, `upload.array()`, `upload.fields()` — these core methods are unchanged
- The constructor signature is unchanged: `multer({ dest, storage, limits })`
- `Multer.Error` codes are the same

**Acceptance criteria:**
- File upload still works in admin UI
- Server tests pass

### Step 3: Guard /api/test-ip debug endpoint

**File:** `server/src/app.ts`, lines 168–176

**Current code (lines 168–176):**
```typescript
app.get("/api/test-ip", async (_req, res) => {
  try {
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = (await response.json()) as { ip: string };
    res.json({ outboundIp: data.ip });
  } catch {
    res.status(500).json({ error: "Failed to discover outbound IP" });
  }
});
```

**Replace with:**
```typescript
if (!config.isProd) {
  app.get("/api/test-ip", async (_req, res) => {
    try {
      const response = await fetch("https://api64.ipify.org?format=json");
      const data = (await response.json()) as { ip: string };
      res.json({ outboundIp: data.ip });
    } catch {
      res.status(500).json({ error: "Failed to discover outbound IP" });
    }
  });
}
```

**Acceptance criteria:**
- `GET /api/test-ip` returns `404` in production
- `GET /api/test-ip` still works in development

### Step 4: Harden CSRF cookie (httpOnly + sameSite strict in production)

**File:** `server/src/middleware/csrf.ts`, lines 16–20

**Current code:**
```typescript
res.cookie("XSRF-TOKEN", req.session.csrfToken, {
  httpOnly: false, // must be readable by JS
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});
```

**Replace with:**
```typescript
res.cookie("XSRF-TOKEN", req.session.csrfToken, {
  httpOnly: true,  // JS cannot read it; client must send via header
  sameSite: config.isProd ? "strict" : "lax",
  secure: config.isProd,
});
```

**Important:** Add the `config` import at the top of `csrf.ts`:
```typescript
import { config } from "../config.js";
```

**Why this is safe:** The CSRF protection middleware (`csrfProtectionMiddleware`, lines 24–37) already reads the token from `x-xsrf-token` or `x-csrf-token` request headers, **not** from the cookie. The client must have stored the token in sessionStorage/localStorage from a prior response and send it as a header. This is already the pattern — verify in `client/src/` that API calls send `x-xsrf-token` from storage.

**Check client code:** Search for `x-xsrf-token` in `client/src/` to confirm the header-based pattern is already implemented.

**Acceptance criteria:**
- CSRF cookie is `httpOnly: true` (not readable by JS)
- CSRF cookie has `SameSite=Strict` in production
- Admin form submissions still succeed — tokens flow via header, not cookie read
- CSRF protection still blocks forged requests

### Step 5: Set session cookie sameSite to strict in production

**File:** `server/src/app.ts`, lines 89–102 (session configuration)

**Current code (line 97):**
```typescript
sameSite: "lax",
```

**Replace with:**
```typescript
sameSite: config.isProd ? "strict" : "lax",
```

**Full session config after change:**
```typescript
app.use(
  session({
    store: sessionStore,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: config.isProd ? "strict" : "lax",
      secure: config.isProd,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  }),
);
```

**Acceptance criteria:**
- Session cookies have `SameSite=Strict` in production
- Session cookies have `SameSite=Lax` in development

### Step 6: Add rate limiting to /api/tours

**File:** `server/src/app.ts`

Add a new rate limiter after the existing ones (after line ~150):

```typescript
const toursLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: config.isProd ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many tour requests. Try again later." },
  },
});
```

Apply it to the tour endpoints. Find where tours routes are mounted — they go through `providerSearchPublicRoutes` at line 180:
```typescript
app.use("/api/search", toursLimiter, providerSearchPublicRoutes);
```

Note: The existing `publicSearchLimiter` (200 req/min) is more generous. The `toursLimiter` (30 req/15min) is per-IP and specifically for tour browsing, not search. Apply it specifically to `/api/search/providers/:id/tours` and `/api/search/all/tours` by adding them inside the route handler or as middleware.

**Simpler approach:** Apply the toursLimiter to the specific routes in `server/src/routes/providerSearchPublic.ts` by importing and using it there, or mount it as middleware at the app level for `/api/search` only (not `/api/search/bootstrap` which needs fewer limits).

**Recommended: Apply at app level, before the bootstrap route exempts itself.**
After line 155 (existing rate limiters):
```typescript
app.use("/api/search", toursLimiter);
```

But the bootstrap route at `/api/search/bootstrap` should have a higher limit. So apply it after bootstrap:

Actually, let's keep it simple. Add the limiter to the providerSearchPublicRoutes file directly on the tours routes:

In `server/src/routes/providerSearchPublic.ts`, import rateLimit and add:
```typescript
const toursLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many tour requests. Try again later." },
  },
});

// Apply to individual tour routes
router.get("/providers/:id/tours", toursLimiter, ...);
router.get("/all/tours", toursLimiter, ...);
router.get("/providers/:id/offer-group", toursLimiter, ...);
router.get("/tour/:providerId/:externalId", toursLimiter, ...);
```

**Acceptance criteria:**
- Rate limit headers (`RateLimit-*`) appear on `/api/search/providers/:id/tours` responses
- After 30 requests in 15 minutes, the endpoint returns 429
- Bootstrap and destinations endpoints are not affected

### Step 7: Chunk email BCC sends

**File:** `server/src/routes/admin/campaigns.ts`, lines 44–51

**Current code:**
```typescript
await transporter.sendMail({
  from: fromValue,
  to: fromValue,
  bcc: leads.map((lead) => lead.email),
  subject,
  html,
  headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
});
```

**Replace with batched sending:**
```typescript
const BATCH_SIZE = 50;
const recipients = leads.map((lead) => lead.email);
for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
  const batch = recipients.slice(i, i + BATCH_SIZE);
  await transporter.sendMail({
    from: fromValue,
    to: fromValue,
    bcc: batch,
    subject,
    html,
    headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
  });
}
```

**Also add `sendBatchedEmail` utility in `server/src/lib/mail.ts`:**

Add after line 15:
```typescript
export async function sendBatchedEmail(
  options: {
    from: string;
    to: string;
    bcc: string[];
    subject: string;
    html: string;
    headers?: Record<string, string>;
  },
  batchSize = 50,
): Promise<void> {
  if (!transporter) {
    throw new Error("SMTP not configured");
  }
  const { bcc, ...rest } = options;
  for (let i = 0; i < bcc.length; i += batchSize) {
    const batch = bcc.slice(i, i + batchSize);
    await transporter.sendMail({ ...rest, bcc: batch });
  }
}
```

Then update `campaigns.ts` to use the utility:
```typescript
import { transporter, EMAIL_RE, sendBatchedEmail } from "../../lib/mail.js";

// Replace the sendMail block with:
await sendBatchedEmail({
  from: fromValue,
  to: fromValue,
  bcc: leads.map((lead) => lead.email),
  subject,
  html,
  headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
});
```

**Acceptance criteria:**
- Campaigns with >50 recipients send successfully without hitting SMTP limits
- Each chunk is a separate SMTP transaction
- Campaigns with <50 recipients work exactly as before

### Step 8: Hash PII (email in Lead, PriceAlert)

**Schema changes** (`server/prisma/schema.prisma`):

Add `hashedEmail` to `Lead` model (after `gdprConsent` line 54):
```prisma
hashedEmail     String?  @db.VarChar(64)
```

Add `hashedEmail` to `PriceAlert` model (after `email` line 181):
```prisma
hashedEmail     String?  @db.VarChar(64)
```

**Create `server/src/lib/hash.ts`:**
```typescript
import crypto from "node:crypto";

export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}
```

**Update Lead creation** — search for where leads are created (likely `server/src/routes/admin/leads.ts` and the alerts routes). Add:
```typescript
import { hashEmail } from "../lib/hash.js";

// When creating a Lead:
hashedEmail: hashEmail(email),
```

**Update PriceAlert creation** — search for PriceAlert create calls. Add:
```typescript
hashedEmail: hashEmail(email),
```

**Run migration:**
```bash
npx prisma migrate dev --name add_hashed_email
```

**Acceptance criteria:**
- `hashedEmail` is populated on all new Lead and PriceAlert records
- The hash is a 64-character hex string (SHA-256)
- Existing records have `hashedEmail = null` (backfill not required in initial migration)
- GDPR compliance improved — raw email stored but hashed copy available for non-reversible lookup

### Step 9: Validate SESSION_SECRET at startup

**File:** `server/src/config.ts`

Current validation (lines 3–6):
```typescript
if (isProd && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET must be set in production.");
  process.exit(1);
}
```

**Enhance to:**
```typescript
if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  console.error("FATAL: SESSION_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

if (!isProd && process.env.SESSION_SECRET && process.env.SESSION_SECRET === "dev-secret") {
  console.warn("[config] ⚠ Using default SESSION_SECRET 'dev-secret' in non-production. Set a strong secret for realistic security.");
}
```

**Acceptance criteria:**
- Server fails at startup with clear error if `SESSION_SECRET` is missing or <32 chars in production
- Warning is printed (not fatal) if default `"dev-secret"` is used in development

## Verification

```bash
# All tests pass
npm --workspace server run test

# Lint passes
npm run lint

# No HIGH/CRITICAL vulnerabilities
npx npm audit

# TypeScript compiles
npx tsc --noEmit --workspace server

# Prisma migration is valid
npx prisma migrate dev --name add_hashed_email
```

**Manual verification checklist:**
- Deploy to staging
- Verify admin login works
- Verify CSRF-protected forms (admin campaign creation) submit successfully
- Verify session cookies have `SameSite=Strict` (in production)
- Verify `/api/test-ip` returns 404 in production, works in dev
- Verify rate limit headers on `/api/search/providers/:id/tours`
- Send a test campaign with 60+ recipients, verify all receive it (check SMTP logs)

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Dependency upgrades | **LOW** — patch/minor bumps with drop-in APIs | Verify with `tsc --noEmit` and tests |
| CSRF httpOnly change | **MEDIUM** — client must use header-based CSRF | Verify `client/src/` already sends `x-xsrf-token` header; test admin forms |
| Session sameSite strict | **LOW** — breaks cross-site redirect flows if any exist | No cross-site flows expected in this app |
| BCC chunking | **LOW** — same API, smaller batches | Verify SMTP logs show multiple transactions |
| PII hashing | **LOW** — additive field, nullable for existing rows | Verify new rows have hash populated |
| Rate limiting tours | **LOW** — user-facing, can adjust limits | Start with 30 req/15min, monitor for false positives |

# Phase 10: Production Hardening

> Production readiness: structured health checks, PM2 memory monitoring, pino-http request logging, Sentry error tracking, DB pool monitoring, deploy script fix, pre-deploy CI/CD checks, backup verification, env validation.

---

## Step 1: Structured health checks

### Files to modify
- `server/src/routes/health.ts` — enhance readiness probe, add liveness + metrics

### Current state (`server/src/routes/health.ts`)

```typescript
// liveness
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// readiness
router.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", checks: { database: "ok", uptime: process.uptime(), memory: process.memoryUsage() } });
  } catch {
    res.status(503).json({ status: "not ready", checks: { database: "failed" } });
  }
});
```

### Enhance readiness endpoint

```typescript
import { config } from "../config.js";

router.get("/health/ready", async (_req, res) => {
  const checks: Record<string, string> = {};
  let overallStatus = "ok";

  // 1. Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "failed";
    overallStatus = "down";
  }

  // 2. Alexandria API reachability
  try {
    const alexResp = await fetch(config.alexandria.url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    checks.alexandria = alexResp.ok ? "ok" : "degraded";
    if (!alexResp.ok && overallStatus === "ok") overallStatus = "degraded";
  } catch {
    checks.alexandria = "failed";
    if (overallStatus === "ok") overallStatus = "degraded";
  }

  // 4. Memory
  const mem = process.memoryUsage();
  const memRssMB = Math.round(mem.rss / 1024 / 1024);
  if (memRssMB > 400) {
    checks.memory = `high (${memRssMB}MB RSS)`;
    if (overallStatus === "ok") overallStatus = "degraded";
  } else {
    checks.memory = `ok (${memRssMB}MB RSS)`;
  }

  // 5. Uptime
  checks.uptime = `${Math.floor(process.uptime() / 3600)}h`;

  const statusCode = overallStatus === "down" ? 503 : 200;
  res.status(statusCode).json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Add liveness endpoint (no DB dependency)

```typescript
router.get("/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});
```

### Acceptance criteria
- `GET /api/health/live` returns 200 immediately, no DB dependency
- `GET /api/health/ready` returns structured JSON with individual check results
- Degraded state when external APIs unreachable
- Down state when database unreachable
- Existing `/api/health` continues to work (backward compat)

---

## Step 2: PM2 memory monitoring

### Files to modify
- `ecosystem.config.cjs`

### Current state

```javascript
// skytravel-api
{
  max_memory_restart: "512M",  // should be 450M to match --max-old-space-size
  kill_timeout: 5000,
  // no instance_var, no merge_logs (already true)
}

// skytravel-ui: no kill_timeout
```

### Updated config

```javascript
module.exports = {
  apps: [
    {
      name: "skytravel-api",
      cwd: "./server",
      script: "npm",
      args: "start",
      exec_mode: "fork",
      node_args: "--max-old-space-size=450",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "450M",            // changed from 512M to match --max-old-space-size
      wait_ready: true,
      listen_timeout: 8000,
      kill_timeout: 10000,                   // increased from 5000 for graceful shutdown
      instance_var: "INSTANCE_ID",           // added for identification
      merge_logs: true,                      // already true
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
    },
    {
      name: "skytravel-ui",
      cwd: "./client",
      script: "npm",
      args: "start",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4173,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "256M",
      kill_timeout: 5000,                    // added for UI
      instance_var: "INSTANCE_ID",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/ui-error.log",
      out_file: "./logs/ui-out.log",
    },
  ],
};
```

### Acceptance criteria
- PM2 restarts API when memory exceeds 450MB
- Graceful shutdown: SIGTERM sent, 10s wait before SIGKILL (API)
- UI process also has kill_timeout
- Instance_var set for process identification
- Logs merged per app

---

## Step 3: pino-http request logging

### Files to modify
- `server/package.json` — add `pino-http` dependency
- `server/src/app.ts` — replace manual request logging with pino-http middleware

### Current manual logging (app.ts lines 52-68)

```typescript
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  (req as unknown as Record<string, unknown>).id = requestId;
  const start = Date.now();
  res.on("finish", () => {
    if (req.path === "/api/health") return;
    logger.info({ req: { method: req.method, url: req.originalUrl, id: requestId }, statusCode: res.statusCode, duration: Date.now() - start }, "request");
  });
  next();
});
```

### Replace with pino-http

```typescript
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";

// After helmet, compression, but before CORS and body parsing
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/api/health" || req.url === "/api/health/live" || req.url === "/api/health/ready",
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        id: req.id,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customLogLevel: (res, err) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      if (res.statusCode >= 100) return "info";
      return "debug";
    },
    customSuccessMessage: (res) => `${res.statusCode} — ${res.req?.url}`,
    customErrorMessage: (error, res) => `${res.statusCode} — ${res.req?.url} — ${error.message}`,
  })
);
```

Keep `crypto.randomUUID()` for request IDs — pino-http auto-generates `req.id` but we can add it via a custom `genReqId`:

```typescript
import pinoHttp from "pino-http";
import crypto from "node:crypto";

app.use(
  pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID(),
    // ... rest
  })
);
```

### Request ID propagation

The request ID generated by pino-http is available as `req.id`. This can be used in downstream handlers for tracing.

### Acceptance criteria
- All HTTP requests logged as structured JSON in production
- Logs include: method, URL, status code, response time, request ID
- Responses >1000ms logged at warn level
- Health check endpoints excluded from logs
- Sensitive headers (cookie, authorization) redacted
- Pretty-printed in development (uses existing pino-pretty transport)

---

## Step 4: Error tracking (Sentry)

### Files to modify
- `server/package.json` — add `@sentry/node`, `@sentry/profiling-node`
- `server/src/app.ts` — initialize Sentry, add request/error handlers
- `client/package.json` — add `@sentry/react`
- `client/src/main.tsx` — initialize Sentry

### Server initialization

```typescript
// At top of app.ts, before any middleware
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.isProd ? "production" : "development",
    tracesSampleRate: config.isProd ? 0.1 : 0, // 10% sampling in prod
    profilesSampleRate: config.isProd ? 0.1 : 0,
    integrations: [Sentry.httpIntegration(), Sentry.prismaIntegration()],
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Register routes...

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Existing error handler must come AFTER Sentry error handler
```

### Client initialization

```typescript
// client/src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    integrations: [Sentry.replayIntegration()],
  });
}
```

Use Sentry's `withErrorBoundary` HOC in App.tsx:

```typescript
export default Sentry.withErrorBoundary(App, {
  fallback: <div className="flex h-screen items-center justify-center">Something went wrong</div>,
});
```

### DSN config

- `SENTRY_DSN` environment variable on server (optional — skip if not set)
- `VITE_SENTRY_DSN` env variable for client
- Add to `docs/ENV.md` as optional

### Acceptance criteria
- Errors appear in Sentry dashboard after DSN is configured
- Server startup not affected when DSN is missing (graceful skip)
- Source maps should be uploaded for readable stack traces
- Error handler middleware still works when Sentry is disabled

---

## Step 5: DB connection pool monitoring

### Files to modify
- `server/src/prisma.ts` — add pool logging and metrics
- `server/src/routes/health.ts` — include pool stats

### Prisma pool configuration

```typescript
// server/src/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") +
          "connection_limit=5&pool_timeout=10",
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Export pool metrics getter
export function getPoolMetrics() {
  // Prisma doesn't expose pool metrics directly.
  // Workaround: track manually or use Prisma's internal events.
  // For now, return connection_limit from env
  return {
    connectionLimit: 5,
    poolTimeout: 10,
  };
}
```

### Pool health in health endpoint

Add pool metrics to the readiness check response under `checks.pool`:

```typescript
checks.pool = `limit=5, timeout=10`;
```

### Pool stats logging (every 5 minutes)

```typescript
// In server/src/index.ts or a scheduled task
setInterval(() => {
  logger.info({ pool: getPoolMetrics() }, "DB pool stats");
}, 5 * 60 * 1000);
```

### Acceptance criteria
- `connection_limit=5` and `pool_timeout=10` applied to database URL
- Health endpoint includes pool configuration
- Pool stats logged every 5 minutes
- No hanging connections when DB is slow

---

## Step 6: Fix deploy script workspace symlink hack

### Files to modify
- `.github/workflows/deploy.yml` — remove symlink hack, use proper workspace install
- `scripts/deploy-remote.sh` — same fix

### Current hack (deploy.yml lines 39-44)

```yaml
echo "▸ Ensuring workspace symlinks …"
for pkg in react react-dom react-router-dom class-variance-authority clsx tailwind-merge lucide-react zustand; do
  if [ ! -e "client/node_modules/$pkg" ]; then
    ln -s "../../node_modules/$pkg" "client/node_modules/$pkg"
  fi
done
```

### Fix

```yaml
echo "▸ Installing dependencies …"
npm ci

echo "▸ Building server …"
cd server
npx prisma generate
NODE_OPTIONS="--max-old-space-size=512" npx tsc -p tsconfig.json
cd ..

echo "▸ Running database migrations …"
(cd server && npx prisma migrate deploy)

echo "▸ Building client …"
npm --workspace client run build
```

Remove the symlink block entirely. npm workspaces should resolve `node_modules` automatically when `npm ci` runs from the repo root. If there's a hoisting issue, add `--install-strategy=nested` or ensure the workspace packages are listed in the root `package.json`.

### Verify after fix

Run the deploy script in a clean checkout: `npm ci` should create all necessary symlinks via npm workspaces. Verify `client/node_modules/react` resolves properly.

### Acceptance criteria
- No manual symlink creation in deploy script
- `npm ci` from repo root correctly hoists shared dependencies
- Client build succeeds without manual symlink hacks
- Server build succeeds with Prisma generate

---

## Step 7: Pre-deploy health check in CI/CD

### Files to modify
- `.github/workflows/deploy.yml` — add pre-deploy checks

### Add steps before SSH deploy

```yaml
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: skytravel_test
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=5
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint check
        run: npm run lint

      - name: Server tests
        run: npm --workspace server run test
        env:
          DATABASE_URL: mysql://root:test@localhost:3306/skytravel_test

      - name: Client tests
        run: npm --workspace client run test

      - name: Build check
        run: npm run build

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        if: success()
        # ... existing deploy config
```

### Acceptance criteria
- Lint, server tests, client tests, and build all run before deploy
- Any failing step aborts the pipeline before SSH deploy
- MySQL service container available for tests
- Build check catches TypeScript/compilation errors early

---

## Step 8: Database backup verification

### Files to create
- `scripts/verify-backup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/mysql}"
MAX_AGE_HOURS=24
WARN_THRESHOLD_PCT=10

# Find latest backup
LATEST=$(find "$BACKUP_DIR" -name "skytravel-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST" ]; then
  echo "FAIL: No backup found in $BACKUP_DIR"
  exit 1
fi

# Check age
NOW=$(date +%s)
BACKUP_TIME=$(stat -f %m "$LATEST" 2>/dev/null || stat -c %Y "$LATEST" 2>/dev/null)
AGE_HOURS=$(( (NOW - BACKUP_TIME) / 3600 ))

if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "WARN: Latest backup is ${AGE_HOURS}h old (max ${MAX_AGE_HOURS}h)"
fi

# Check file size
SIZE_KB=$(stat -f %z "$LATEST" 2>/dev/null || stat -c %s "$LATEST" 2>/dev/null)
SIZE_KB=$((SIZE_KB / 1024))
echo "Latest backup: $LATEST (${SIZE_KB}KB, ${AGE_HOURS}h old)"

if [ "$SIZE_KB" -lt 1 ]; then
  echo "FAIL: Backup file is too small (${SIZE_KB}KB)"
  exit 1
fi

echo "PASS: Backup verification OK"
```

### Add to health endpoint

```typescript
// Add to health/ready checks
import { execSync } from "node:child_process";

try {
  const result = execSync("bash scripts/verify-backup.sh", { timeout: 5000 });
  checks.backup = "ok";
} catch {
  checks.backup = "degraded";
  if (overallStatus === "ok") overallStatus = "degraded";
}
```

### Acceptance criteria
- Backup verification script exists and is executable
- Script checks backup age (< 24h) and file size (> 1KB)
- Health endpoint reflects backup status
- Alert when backup is missing or stale

---

## Step 9: Env validation at startup

### Files to modify
- `server/src/config.ts` — add zod schema validation

### Current state

Config manually checks SESSION_SECRET and DATABASE_URL, then warns about optional config.

### Add zod validation

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16).optional(),
  CLIENT_ORIGIN: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  ALEXANDRIA_API_URL: z.string().url().default("http://export.alexandria.cz/export"),
  ALEXANDRIA_API_KEY: z.string().optional(),
  ALEXANDRIA_COUNTRY: z.coerce.number().int().default(107),

  ADMIN_LOGIN: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("FATAL: Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

// Production-only required checks
if (env.NODE_ENV === "production") {
  if (!env.SESSION_SECRET) {
    console.error("FATAL: SESSION_SECRET is required in production");
    process.exit(1);
  }
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn("[config] ⚠ SMTP not fully configured — email features disabled");
  }
  if (!env.SENTRY_DSN) {
    console.warn("[config] ⚠ SENTRY_DSN not set — error tracking disabled");
  }
}

export const config = { ...env } as const;
```

### Acceptance criteria
- Server fails fast with clear error message on any invalid env var
- Zod validation catches type errors (e.g., PORT="abc" fails)
- Detailed error output shows which fields are invalid
- Missing optional vars produce warnings, not errors (except in production for critical ones)
- `.env.example` updated with all documented variables

---

## Risk Assessment

**RISK: MEDIUM**

- Sentry adds dependencies; initialization must not crash when DSN is missing
- Health check changes must not break existing Docker/k8s probes (maintain backward-compatible `/api/health` and `/api/health/ready` paths)
- pino-http replaces manual logging — verify log format and structure aren't lost
- Env validation with zod may cause startup failures if existing env has unexpected values — test on staging first

## Verification

```bash
# Build
npm run build

# Health check
curl http://localhost:4000/api/health/ready | jq
# Expected: { status: "ok", checks: { database: "ok", alexandria: "ok", ... } }

# PM2 config syntax check
node -e "require('./ecosystem.config.cjs')"

# Env validation (intentionally break something)
PORT=abc node server/src/config.js
# Expected: fails with clear error about PORT

# PM2 status
pm2 status

# Logs
pm2 logs skytravel-api --lines 20
# Expected: structured JSON logs
```

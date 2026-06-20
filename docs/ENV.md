# SkyTravel Environment Variables

## Overview

Environment variables are loaded via `dotenv/config` at server startup (`server/src/index.ts`). Required variables are validated with Zod in `server/src/config.ts` — the server exits immediately on missing required values.

The `.env` file lives at `server/.env` (not in the root). An example file is at `server/.env.example`.

---

## Required Variables

| Variable | Description | Default | Validation |
|---|---|---|---|
| `DATABASE_URL` | MySQL connection string | — | Required, must be non-empty |
| `SESSION_SECRET` | Session signing secret | `"dev-secret"` | Min 32 chars in production |
| `NODE_ENV` | Runtime environment | `"development"` | Must be `development`, `production`, or `test` |
| `PORT` | Express listen port | `4000` | 1–65535 |

**Production requirements:**
- `SESSION_SECRET` must be ≥ 32 characters (not the default `"dev-secret"`)
- `DATABASE_URL` must point to a production MySQL 8.4 instance

### Example

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://skytravel:password@localhost:3306/skytravel
SESSION_SECRET=a-very-long-random-string-at-least-32-chars-long
```

---

## Admin Variables

| Variable | Description | Default | Required |
|---|---|---|---|
| `ADMIN_LOGIN` | Admin panel username | — | No (login disabled if missing) |
| `ADMIN_PASSWORD` | Admin panel password | — | No (login disabled if missing) |

On startup, the server creates the admin user via bcryptjs (12 rounds) if it doesn't exist. If either variable is missing, admin login is disabled.

### Example

```env
ADMIN_LOGIN=admin
ADMIN_PASSWORD=a-strong-random-password
```

---

## Alexandria Provider

| Variable | Description | Default | Required |
|---|---|---|---|
| `ALEXANDRIA_API_URL` | Alexandria XML export feed URL | `http://export.alexandria.cz/export` | No |
| `ALEXANDRIA_API_KEY` | API key passed as query parameter | — | **Yes** for provider to work |
| `ALEXANDRIA_COUNTRY` | Default country ID filter | `107` (Chorvatsko) | No |

The provider logs a warning at startup if `ALEXANDRIA_API_KEY` is not set, but the server still starts.

### Example

```env
ALEXANDRIA_API_URL=http://export.alexandria.cz/export
ALEXANDRIA_API_KEY=your-api-key-here
ALEXANDRIA_COUNTRY=107
```

---

## SMTP (Email)

| Variable | Description | Default | Required |
|---|---|---|---|
| `SMTP_HOST` | SMTP server hostname | — | No (email features disabled) |
| `SMTP_PORT` | SMTP server port | `587` | No |
| `SMTP_USER` | SMTP authentication username | — | No |
| `SMTP_PASS` | SMTP authentication password | — | No |
| `SMTP_FROM` | Default sender email address | — | No |

If `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are all set, email features are enabled (campaigns, price alerts, notifications). Otherwise, features that require sending email will fail gracefully.

For port 465, the transport uses `secure: true` (SSL). For port 587, it uses STARTTLS.

### Example

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@sky-travel.tours
```

---

## Optional Variables

| Variable | Description | Default | Notes |
|---|---|---|---|
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` | Comma-separated for multiple origins. In production, must match the actual UI URL |
| `SENTRY_DSN` | Sentry error tracking DSN for server | — | If set, enables server-side error reporting (requires `@sentry/node` to be installed in the future; currently logs a warning that the SDK isn't installed) |
| `VITE_SENTRY_DSN` | Sentry DSN for client-side error tracking | — | Passed to Vite at build time; enables client error reporting |
| `PROVIDERS_WARM_ON_STARTUP` | Control cache warming at boot | `"true"` | Set to `"false"` to skip provider cache warming on startup for faster boot |

### Example

```env
CLIENT_ORIGIN=http://localhost:4173,https://sky-travel.tours
SENTRY_DSN=https://xxxxx@sentry.io/yyyyy
PROVIDERS_WARM_ON_STARTUP=false
```

---

## Client-Side Environment (Vite)

Client-side env vars must be prefixed with `VITE_` to be exposed to the browser bundle. These are compiled at build time, not read at runtime.

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | API base URL for fetch calls | `""` (same origin) |
| `VITE_SENTRY_DSN` | Sentry DSN for client error tracking | — |

In development, set `VITE_API_URL=http://localhost:4000` to proxy API calls to the server.

---

## Production Checklist

Before deploying to production, verify these variables:

- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET` is a strong random string ≥ 32 characters (generate with `openssl rand -hex 32`)
- [ ] `DATABASE_URL` points to the production MySQL database
- [ ] `CLIENT_ORIGIN` matches the production UI URL
- [ ] `ADMIN_PASSWORD` is a strong random password
- [ ] `ALEXANDRIA_API_KEY` is set to the real API key

- [ ] SMTP variables are configured if email features are needed

---

## Environment Files

| File | Purpose | Location |
|---|---|---|
| `.env.example` | Template with defaults and placeholders | `server/.env.example` |
| `.env` | Actual environment variables (gitignored) | `server/.env` |

---

## Config Architecture

All env var parsing happens in `server/src/config.ts`:

1. Zod schema defines expected variables with defaults and types
2. `safeParse` validates `process.env` — exits on failure with descriptive messages
3. Production-specific checks run (e.g., `SESSION_SECRET` length)
4. Config object is exported as a typed `const` — used throughout the app
5. `validateConfig()` logs startup warnings for missing optional but important config (API keys, SMTP)

```typescript
// Simplified from server/src/config.ts
export const config = {
  isProd,
  port: env.PORT,
  sessionSecret: env.SESSION_SECRET,
  databaseUrl: env.DATABASE_URL,
  clientOrigin: env.CLIENT_ORIGIN,
  admin: { login: env.ADMIN_LOGIN, password: env.ADMIN_PASSWORD },
  smtp: { host, port, user, pass, from },
  alexandria: { url, apiKey, country },

} as const;
```

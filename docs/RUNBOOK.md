# SkyTravel Operations Runbook

## Server Details

| Property | Value |
|---|---|
| **Host** | `167.233.47.103` |
| **User** | `root` (default; overridable via `SSH_USER`) |
| **SSH key** | `ssh-key-new.key` (repo root) |
| **Remote path** | `/home/ubuntu/skytravel` |
| **Process manager** | PM2 (`ecosystem.config.cjs`) |
| **Processes** | `skytravel-api` (port 4000), `skytravel-ui` (port 4173) |
| **Database** | MySQL 8.4, local |
| **Memory limit** | API: 450MB, UI: 256MB |

---

## Server Startup

### Development (local)

```bash
# Start both server + client concurrently
npm run dev

# Or separately:
npm --workspace server run dev    # API on :4000
npm --workspace client run dev    # SPA on :5173
```

### Production (PM2)

```bash
# Start both apps
pm2 start ecosystem.config.cjs --env production

# Restart both apps
pm2 restart ecosystem.config.cjs --env production

# Restart individual app
pm2 restart skytravel-api
pm2 restart skytravel-ui

# Stop all
pm2 stop ecosystem.config.cjs

# Save process list (run after changes)
pm2 save
```

The API uses `wait_ready: true` with an 8-second timeout. The app signals readiness by calling `process.send("ready")` after `app.listen()`.

---

## Database

### Connection

```
DATABASE_URL=mysql://user:password@localhost:3306/skytravel
```

### Backup

```bash
# Manual backup (default: /home/ubuntu/backups/mysql/)
bash scripts/backup-db.sh

# Custom backup location
BACKUP_DIR=/custom/path bash scripts/backup-db.sh

# Verify backup integrity
bash scripts/verify-backup.sh
```

Backups use `mysqldump --single-transaction --routines --triggers`, then gzip. Retention: 14 days (configurable via `RETENTION_DAYS`).

### Restore

```bash
# List available backups
ls -la /home/ubuntu/backups/mysql/

# Restore from a specific backup
gunzip < /home/ubuntu/backups/mysql/skytravel_YYYYMMDD_HHMMSS.sql.gz | mysql skytravel
```

### Migrations

```bash
# Development — create new migration
npx --workspace server prisma migrate dev --name description_of_change

# Production — apply pending migrations (never use `dev` in production!)
npx --workspace server prisma migrate deploy

# Generate Prisma client after schema changes
npx --workspace server prisma generate

# View database in browser (dev only)
npx --workspace server prisma studio
```

Migration naming: `YYYYMMDDHHMMSS_migration_NN_description`

---

## Provider Refresh

```bash
# Refresh Alexandria feed (full catalog fetch + DB upsert)
npx tsx server/scripts/refresh-alexandria.ts

# Provider sync also runs:
# - On startup (cache warming)
# - On background intervals (set by refreshIntervalMs per provider)
# - Manually via admin UI (POST /api/admin/providers/:id/sync)
```

---

## Health Check Endpoints

### Liveness

```
GET /api/health

Response (200):
{
  "status": "ok",
  "timestamp": "2026-06-15T12:00:00.000Z"
}
```

### Liveness (alternative)

```
GET /api/health/live

Response (200):
{
  "status": "alive",
  "timestamp": "2026-06-15T12:00:00.000Z"
}
```

### Readiness

```
GET /api/health/ready

Response (200 — all healthy):
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "alexandria": "ok",
    "memory": "ok (128MB)",
    "uptime": "48h 12m",
    "backup": "ok"
  },
  "timestamp": "2026-06-15T12:00:00.000Z"
}

Response (503 — database down):
{
  "status": "down",
  "checks": {
    "database": "failed",
    "alexandria": "failed",
    "memory": "ok (128MB)",
    "uptime": "48h 12m",
    "backup": "ok"
  },
  "timestamp": "2026-06-15T12:00:00.000Z"
}
```

The readiness endpoint checks:
1. Database connectivity (`SELECT 1`)
2. External API reachability (Alexandria, best-effort HEAD request)
3. Memory usage (warning if > 400MB RSS)
4. Process uptime
5. Backup freshness (runs `scripts/verify-backup.sh`)

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| API not responding | Process crashed / OOM killed | `pm2 restart skytravel-api` → check logs |
| UI loads but API errors | Backend process issue | `curl http://localhost:4000/api/health` → check `pm2 logs skytravel-api` |
| MySQL connection error | Database process down | `systemctl status mysql` → `systemctl restart mysql` |
| Memory spike (>450MB) | Memory leak or large dataset | `pm2 monit` → identify from logs → restart |
| Deploy failed on CI | Network issue / build error | Check GitHub Actions log → fix → re-run workflow |
| Provider sync stuck | API timeout / rate limit | Reset via admin UI or `UPDATE ProviderSync SET status='idle'` |
| Disk full | Old backups / logs accumulating | `df -h` → clean backups → configure log rotation |
| "Too many connections" DB error | Connection pool exhausted | Check `pm2 logs skytravel-api` for slow queries → restart API |
| Search returning empty results | Cache stale / provider not synced | Trigger manual sync from admin UI |
| Admin login fails | Session secret changed / DB seeded wrong | Verify `SESSION_SECRET` consistency → check AdminUser table |
| CSRF token errors | Session expired | Re-login to admin panel |

---

## Log Access

```bash
# API logs
pm2 logs skytravel-api --lines 100
pm2 logs skytravel-api --lines 100 --timestamp

# UI logs
pm2 logs skytravel-ui --lines 50

# Follow live logs
pm2 logs --raw

# Log files (on server)
/home/ubuntu/skytravel/server/logs/api-error.log
/home/ubuntu/skytravel/server/logs/api-out.log
/home/ubuntu/skytravel/client/logs/ui-error.log
/home/ubuntu/skytravel/client/logs/ui-out.log

# PM2 monitoring
pm2 monit

# PM2 status
pm2 status
pm2 show skytravel-api
```

Logs are JSON-structured (pino) with auto-rotation via `pm2-logrotate` (50MB max, 7 retained).

---

## Emergency Procedures

### Server Unresponsive

```bash
# 1. SSH into server
ssh -i ssh-key-new.key -o StrictHostKeyChecking=no root@167.233.47.103

# 2. Check PM2 status
pm2 status

# 3. Force restart
pm2 kill
sleep 5
pm2 start ecosystem.config.cjs --env production

# 4. If still unresponsive, check system resources
htop
df -h
free -m
systemctl status mysql

# 5. Last resort — reboot server
reboot
```

### Rollback Deployment

```bash
# On production server:
cd /home/ubuntu/skytravel
PREVIOUS=$(git rev-parse HEAD~1)
git reset --hard $PREVIOUS
npm ci --legacy-peer-deps
npm run build
cd server && npx prisma migrate deploy && cd ..
pm2 restart ecosystem.config.cjs --env production
curl -sf http://localhost:4000/api/health || echo "ROLLBACK HEALTH CHECK FAILED"
```

### Database Restore

```bash
# 1. Stop the API (prevents writes during restore)
pm2 stop skytravel-api

# 2. Find latest backup
ls -lt /home/ubuntu/backups/mysql/

# 3. Restore
gunzip < /home/ubuntu/backups/mysql/skytravel_20260615_030000.sql.gz | mysql skytravel

# 4. Restart API
pm2 start skytravel-api

# 5. Verify
curl -sf http://localhost:4000/api/health/ready
```

### Full Recovery (new server)

```bash
# 1. Clone repo
git clone https://github.com/<REPO_OWNER>/<REPO_NAME>.git /home/ubuntu/skytravel
cd /home/ubuntu/skytravel

# 2. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs mysql-server git

# 3. Set up MySQL
mysql -e "CREATE DATABASE skytravel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -e "CREATE USER 'skytravel'@'127.0.0.1' IDENTIFIED BY '<DB_PASSWORD>'"
mysql -e "GRANT ALL PRIVILEGES ON skytravel.* TO 'skytravel'@'127.0.0.1'"

# 4. Create .env
cp server/.env.example server/.env
# Edit with production values

# 5. Install and build
npm ci --legacy-peer-deps
npm run build

# 6. Migrate
cd server && npx prisma migrate deploy && cd ..

# 7. Start
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

## Monitoring

| Tool | Purpose | Access |
|---|---|---|
| **PM2** | Process health, restart, logs | `pm2 monit`, `pm2 status` |
| **Health endpoint** | Liveness + readiness | `GET /api/health`, `GET /api/health/ready` |
| **GitHub Actions** | CI/CD pipeline status | GitHub repo → Actions tab |
| **Sentry** (optional) | Error tracking | Requires `SENTRY_DSN` env var |
| **Log rotation** | Prevent disk full | `pm2 install pm2-logrotate` |

### Set Up Log Rotation (one-time)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

### Cron Jobs (production)

```bash
# Database backup — daily at 3 AM
0 3 * * * /home/ubuntu/skytravel/scripts/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1
```

---

## Deploy Procedures

### Option A: Auto-deploy (push to main)

Push to `main` → GitHub Actions runs `deploy.yml` → SSH into server → build + PM2 restart. No manual steps.

### Option B: Manual deploy

```bash
# Requires SSH key in repo root
bash scripts/deploy-remote.sh
```

The deploy script (same as CI) performs:
1. `git fetch origin main` + `git reset --hard origin/main`
2. `npm ci --legacy-peer-deps`
3. `prisma generate` + `tsc` (server build)
4. `prisma migrate deploy`
5. `npm --workspace client run build`
6. `pm2 start ecosystem.config.cjs` (restart)
7. `npx tsx server/scripts/refresh-alexandria.ts` (fire-and-forget)

### Verify Deployment

```bash
curl -sf http://localhost:4000/api/health           # API liveness
curl -sf http://localhost:4000/api/health/ready      # API readiness
curl -sf http://localhost:4173/                       # UI
```

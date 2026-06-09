# SkyTravel — Operations Runbook

## Server Details

- **Host:** `<PRODUCTION_SERVER_IP>`
- **User:** `root`
- **SSH key:** `<SSH_KEY_FILE>` (in repo root)
- **Remote path:** `/home/ubuntu/skytravel`
- **Process Manager:** PM2 (`ecosystem.config.cjs`)
- **Apps:** `skytravel-api` (port 4000), `skytravel-ui` (port 4173)
- **Database:** MySQL 8.4, local
- **Git remote:** `https://github.com/<REPO_OWNER>/<REPO_NAME>.git` (main branch)
- **No nginx** — services serve directly on ports 4000 and 4173

---

## How to Deploy

### Option A: Auto-deploy (push to main)

Push to `main` on GitHub → `.github/workflows/deploy.yml` runs via GitHub Actions → SSH into server → pull → build → restart.

No manual steps needed. Check action status on GitHub after push.

### Option B: Manual deploy from local machine

```bash
# 1. Commit and push your changes
git add .
git commit -m "feat: your change description"
git push origin main

# 2. SSH into server
ssh -i <SSH_KEY_FILE> -o StrictHostKeyChecking=no root@<PRODUCTION_SERVER_IP>

# 3. On server — pull, build, restart
cd /home/ubuntu/skytravel
git fetch origin main
git reset --hard origin/main
npm ci --legacy-peer-deps

# Build server
cd server
npx prisma generate
npx tsc -p tsconfig.json
cd ..

# Run DB migrations (if schema changed)
cd server && npx prisma migrate deploy && cd ..

# Build client
npm --workspace client run build

# Restart PM2
pm2 restart ecosystem.config.cjs --env production
pm2 save
```

### Option C: Using deploy script

```bash
# Edit scripts/deploy-remote.sh first — change SSH_HOST and SSH_USER
bash scripts/deploy-remote.sh
```

---

## Verify Deployment

```bash
# From your machine:
curl http://<PRODUCTION_SERVER_IP>:4173/          # UI
curl http://<PRODUCTION_SERVER_IP>:4000/api/health # API

# On server:
curl -sf http://localhost:4000/api/health
curl -sf http://localhost:4000/api/health/ready
```

---

## Common Operations

```bash
# SSH into server
ssh -i <SSH_KEY_FILE> root@<PRODUCTION_SERVER_IP>

# Check PM2 status
pm2 status

# View logs
pm2 logs skytravel-api --lines 100
pm2 logs skytravel-ui --lines 50

# Restart apps
pm2 restart skytravel-api
pm2 restart skytravel-ui
pm2 restart ecosystem.config.cjs --env production  # both at once

# Monitor resources
pm2 monit
```

---

## Troubleshooting

| Scenario | Diagnosis | Action |
|---|---|---|
| App not responding | `pm2 status` → check if running | `pm2 restart skytravel-api` |
| UI loads, API errors | `curl http://localhost:4000/api/health` | Check `pm2 logs skytravel-api` |
| MySQL connection error | Database down | `systemctl status mysql` |
| Memory spike | `pm2 monit` → RSS growing | Identify leak in logs → restart |
| Deploy failed | Check GitHub Actions log | Fix issue → re-run workflow |
| Database full | `df -h` + check table sizes | Archive old ProviderSync records |
| Provider sync stuck | Admin UI → ProviderSync table | Reset status via admin panel |

---

## Rollback

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

---

## Backups

```bash
# Manual backup
bash scripts/backup-db.sh

# Restore from backup
gunzip < /home/ubuntu/backups/mysql/skytravel_YYYYMMDD_HHMMSS.sql.gz | mysql skytravel

# Cron (production) — set up on server
# 0 3 * * * /home/ubuntu/skytravel/scripts/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1
```

---

## Environment Variables

See `server/.env.example` for full list. Production `.env` is on server at `/home/ubuntu/skytravel/server/.env`.

Required in production:
- `DATABASE_URL` — MySQL connection string
- `SESSION_SECRET` — min 32 chars, random
- `CLIENT_ORIGIN` — e.g. `http://<PRODUCTION_SERVER_IP>:4173`
- `ALEXANDRIA_API_KEY` — provider API key
- `OREXTRAVEL_TOKEN` — provider token

---

## Full Setup Guide (fresh server)

If setting up a new server from scratch:

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs mysql-server git

# 2. Clone repo
git clone https://github.com/<REPO_OWNER>/<REPO_NAME>.git /home/ubuntu/skytravel
cd /home/ubuntu/skytravel

# 3. Set up MySQL
mysql -e "CREATE DATABASE skytravel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER 'skytravel'@'127.0.0.1' IDENTIFIED BY '<DB_PASSWORD>';"
mysql -e "GRANT ALL PRIVILEGES ON skytravel.* TO 'skytravel'@'127.0.0.1';"

# 4. Create .env (copy from .env.example, fill in real values)
cp server/.env.example server/.env
# ... edit server/.env with real values ...

# 5. Install deps and build
npm ci --legacy-peer-deps
npm run build

# 6. Run migrations
cd server && npx prisma migrate deploy && cd ..

# 7. Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # configure PM2 to start on boot

# 8. Verify
curl -sf http://localhost:4000/api/health
```

---

## Monitoring

- **Health endpoint:** `GET /api/health` (liveness), `GET /api/health/ready` (readiness)
- **External:** Optional — set UptimeRobot or similar to ping `http://<PRODUCTION_SERVER_IP>:4000/api/health`
- **PM2 logs:** JSON structured (pino), rotated via pm2-logrotate

### Set up log rotation (one-time on server)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

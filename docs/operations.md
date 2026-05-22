# SkyTravel — Operations Runbook

## Server Details

- **Host:** Oracle Cloud VM (Ubuntu)
- **Process Manager:** PM2 (`ecosystem.config.cjs`)
- **Apps:** `skytravel-api` (port 4000), `skytravel-ui` (port 4173)
- **Database:** MySQL 8.0, local

---

## Common Operations

### Deploy

```bash
bash scripts/deploy-remote.sh
```

Or manually on server:

```bash
cd ~/skytravel
git pull origin main
npm ci
npm run build
cd server && npx prisma migrate deploy && cd ..
pm2 reload ecosystem.config.cjs --env production
```

### Verify health after deploy

```bash
curl -sf http://localhost:4000/api/health
curl -sf http://localhost:4000/api/health/ready
```

### Restart app

```bash
pm2 restart skytravel-api
pm2 restart skytravel-ui
```

### View logs

```bash
pm2 logs skytravel-api --lines 100
pm2 logs skytravel-ui --lines 50
```

### Monitor resources

```bash
pm2 monit
```

---

## Troubleshooting

| Scenario                | Diagnosis                       | Action                                    |
| ----------------------- | ------------------------------- | ----------------------------------------- |
| App not responding      | `pm2 status` → check if running | `pm2 restart skytravel-api`               |
| 503 on /health/ready    | Database connection lost        | Check MySQL: `systemctl status mysql`     |
| Memory spike            | `pm2 monit` → RSS growing       | Identify leak in logs → restart           |
| Deploy failed           | Check GitHub Actions log        | Fix issue → re-run workflow               |
| Database full           | `df -h` + check table sizes     | Archive old ProviderSync records          |
| Provider sync stuck     | Admin UI → ProviderSync table   | Reset status via admin panel              |
| SSL certificate expired | Check nginx/certbot             | `certbot renew && systemctl reload nginx` |
| Rate limiting users     | Legit traffic spike             | Temporarily increase limits in app.ts     |

---

## Rollback

```bash
# On production server:
cd ~/skytravel
PREVIOUS=$(git rev-parse HEAD~1)
git reset --hard $PREVIOUS
npm ci
npm run build
cd server && npx prisma migrate deploy && cd ..
pm2 reload ecosystem.config.cjs --env production
curl -sf http://localhost:4000/api/health || echo "ROLLBACK HEALTH CHECK FAILED"
```

---

## Backups

### Manual backup

```bash
bash scripts/backup-db.sh
```

### Restore from backup

```bash
gunzip < /home/ubuntu/backups/mysql/skytravel_YYYYMMDD_HHMMSS.sql.gz | mysql skytravel
```

### Cron (production)

```
0 3 * * * /home/ubuntu/skytravel/scripts/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1
```

---

## Environment Variables

See `server/.env.example` for full list. Required in production:

- `DATABASE_URL` — MySQL connection string
- `SESSION_SECRET` — min 32 chars, random
- `CLIENT_ORIGIN` — e.g. `https://sky-travel.tours`
- `ALEXANDRIA_API_KEY` — provider API key
- `OREXTRAVEL_TOKEN` — provider token

---

## Monitoring

- **Health endpoint:** `GET /api/health` (liveness), `GET /api/health/ready` (readiness)
- **External:** Set up UptimeRobot to ping `https://sky-travel.tours/api/health` every 5 min
- **PM2 logs:** JSON structured (pino) in production, rotated via pm2-logrotate

### Set up log rotation (one-time on server)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

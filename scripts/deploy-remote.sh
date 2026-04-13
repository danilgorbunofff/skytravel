#!/usr/bin/env bash
set -euo pipefail

# ── Remote deploy script for SkyTravel ────────────────────────────────
# Connects to the production server via SSH, pulls latest code, builds
# both server and client, runs DB migrations, and restarts PM2 apps.
#
# Usage:
#   ./scripts/deploy-remote.sh                # uses defaults from env or fallback
#   SSH_HOST=1.2.3.4 ./scripts/deploy-remote.sh  # override host
# ──────────────────────────────────────────────────────────────────────

SSH_USER="${SSH_USER:-ubuntu}"
SSH_HOST="${SSH_HOST:-141.147.40.156}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_PATH="${REMOTE_PROJECT_PATH:-/home/ubuntu/skytravel}"

# Resolve SSH key: env var → repo-local key → ~/.ssh default
if [[ -n "${SSH_KEY_PATH:-}" ]]; then
  KEY_FLAG="-i ${SSH_KEY_PATH}"
elif [[ -f "$(dirname "$0")/../ssh-key-2026-04-03.key" ]]; then
  KEY_PATH="$(cd "$(dirname "$0")/.." && pwd)/ssh-key-2026-04-03.key"
  chmod 600 "$KEY_PATH"
  KEY_FLAG="-i ${KEY_PATH}"
else
  KEY_FLAG=""
fi

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -p ${SSH_PORT} ${KEY_FLAG}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SkyTravel — Remote Deploy                                  ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Host:   ${SSH_HOST}                                        "
echo "║  User:   ${SSH_USER}                                        "
echo "║  Path:   ${REMOTE_PATH}                                     "
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# shellcheck disable=SC2029
ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE_SCRIPT
set -euo pipefail

echo "▸ Pulling latest code …"
cd "${REMOTE_PATH}"
git fetch origin main
git reset --hard origin/main

echo "▸ Installing dependencies …"
npm ci --prefer-offline 2>/dev/null || npm install

echo "▸ Building server …"
npm --workspace server run build

echo "▸ Running database migrations …"
cd server
npx prisma migrate deploy
cd ..

echo "▸ Building client …"
npm --workspace client run build

echo "▸ Restarting PM2 apps …"
if pm2 describe skytravel-api > /dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs --env production
fi
pm2 save

echo "▸ Running Alexandria feed refresh …"
cd server
npx tsx scripts/refresh-alexandria.ts || echo "  ⚠ Alexandria refresh failed (non-critical)"
cd ..

echo ""
echo "✅ Deploy complete!"
REMOTE_SCRIPT

echo ""
echo "✅ Remote deploy finished successfully."

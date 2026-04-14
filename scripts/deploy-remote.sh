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
  KEY_PATH="${SSH_KEY_PATH}"
elif [[ -f "$(dirname "$0")/../ssh-key-2026-04-03.key" ]]; then
  KEY_PATH="$(cd "$(dirname "$0")/.." && pwd)/ssh-key-2026-04-03.key"
  chmod 600 "$KEY_PATH"
else
  KEY_PATH=""
fi

if [[ -n "$KEY_PATH" ]]; then
  SSH_CMD=(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -p "${SSH_PORT}" -i "$KEY_PATH")
else
  SSH_CMD=(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -p "${SSH_PORT}")
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SkyTravel — Remote Deploy                                  ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Host:   ${SSH_HOST}                                        "
echo "║  User:   ${SSH_USER}                                        "
echo "║  Path:   ${REMOTE_PATH}                                     "
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# shellcheck disable=SC2029
"${SSH_CMD[@]}" "${SSH_USER}@${SSH_HOST}" bash -s <<REMOTE_SCRIPT
set -euo pipefail

echo "▸ Pulling latest code …"
cd "${REMOTE_PATH}"
git fetch origin main
git reset --hard origin/main

# Kill PM2 and any node processes first to release file locks in node_modules
echo "▸ Stopping running services …"
pm2 kill 2>/dev/null || true
sleep 2

echo "▸ Installing dependencies …"
# Clean node_modules only after services are stopped (no open file handles)
rm -rf node_modules client/node_modules server/node_modules

echo "  Installing root + workspace packages …"
# First pass: extract all packages without running postinstall scripts
# (avoids @prisma/engines postinstall failing when @prisma/debug isn't extracted yet)
npm install --ignore-scripts
# Second pass: run native rebuilds / postinstall scripts now that all files exist
npm rebuild

echo "▸ Building server …"
(cd server && npm run build)

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building client …"
(cd client && npm install && npm run build)

echo "▸ Restarting PM2 apps …"
pm2 start ecosystem.config.cjs
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

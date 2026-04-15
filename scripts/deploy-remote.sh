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

# Kill PM2 and all node processes first to release file locks in node_modules
echo "▸ Stopping running services …"
pm2 kill 2>/dev/null || true
pkill -9 node 2>/dev/null || true
pkill -9 esbuild 2>/dev/null || true
# Wait until no node/esbuild processes remain (up to 15s)
for i in {1..15}; do
  pgrep -x node >/dev/null 2>&1 || pgrep -x esbuild >/dev/null 2>&1 || break
  sleep 1
done

echo "▸ Installing dependencies …"
# Delete node_modules per-package to avoid ENOTEMPTY on deep dirs
if [[ -d node_modules ]]; then
  find node_modules -mindepth 1 -maxdepth 1 -print0 | xargs -0 rm -rf 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || true
fi
# Two-pass: postinstall scripts (Prisma engines) can fail on first attempt after cache invalidation
npm install || npm install

echo "▸ Building server …"
(cd server && npm run build)

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building client …"
(cd client
  if [[ -d node_modules ]]; then
    find node_modules -mindepth 1 -maxdepth 1 -print0 | xargs -0 rm -rf 2>/dev/null || true
    rm -rf node_modules 2>/dev/null || true
  fi
  npm install || npm install
  npm run build)

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

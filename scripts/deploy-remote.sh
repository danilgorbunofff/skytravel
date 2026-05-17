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

# Kill PM2 and all node/esbuild processes to release file locks
echo "▸ Stopping running services …"
pm2 kill 2>/dev/null || true
pkill -9 node 2>/dev/null || true
pkill -9 esbuild 2>/dev/null || true
sleep 5

echo "▸ Installing dependencies …"
# Maximum aggressive cleanup for corrupted node_modules
pkill -9 -f "npm|node|esbuild|yarn" 2>/dev/null || true
sleep 15
# Multiple passes of removal to ensure everything is gone
for i in {1..3}; do
  rm -rf node_modules server/node_modules client/node_modules 2>/dev/null || true
  find . -maxdepth 3 -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
  find . -maxdepth 4 -type f -path "*/node_modules/*" -delete 2>/dev/null || true
done
# Clear npm cache multiple times
npm cache clean --force 2>/dev/null || true
npm cache verify 2>/dev/null || true
sleep 5
# Install with minimal flags to avoid corruption issues
npm install 2>&1 | grep -E "(added|up to date|packages)" | head -5
# Explicitly reinstall each workspace to ensure devDependencies
cd client && npm install 2>&1 | grep -E "(added|up to date|packages)" | head -2 && cd ..
cd server && npm install 2>&1 | grep -E "(added|up to date|packages)" | head -2 && cd ..
# Ensure root node_modules/.bin is on PATH for prisma, tsc, etc.
export PATH="${REMOTE_PATH}/node_modules/.bin:\$PATH"

echo "▸ Building server …"
# Limit tsc heap to avoid OOM kill on low-memory VMs (tsc is very memory-hungry).
(cd server && ../node_modules/.bin/prisma generate && NODE_OPTIONS="--max-old-space-size=512" ../node_modules/.bin/tsc -p tsconfig.json)

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building client …"
# Ensure vite is available in root node_modules for @vitejs/plugin-react to find it
npm install vite@8.0.8 --save-dev 2>&1 | tail -2
export NODE_PATH="$(pwd)/node_modules:\${NODE_PATH:-}"
echo "  Checking vite…"
which vite || ls -la node_modules/.bin/vite || echo "vite not found"
echo "  Running build from client directory…"
(cd client && npm run build)

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

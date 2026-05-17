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
# Wipe node_modules completely before installing to avoid ENOTEMPTY on Linux.
# Use find + xargs to force removal of all files/dirs in one pass.
if [[ -d node_modules ]]; then
  find node_modules -mindepth 1 -type f -delete 2>/dev/null || true
  find node_modules -mindepth 1 -type d -empty -delete 2>/dev/null || true
  find node_modules -mindepth 1 -type d -delete 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || true
fi
for subdir in server/node_modules client/node_modules; do
  if [[ -d "\$subdir" ]]; then
    find "\$subdir" -mindepth 1 -type f -delete 2>/dev/null || true
    find "\$subdir" -mindepth 1 -type d -empty -delete 2>/dev/null || true
    find "\$subdir" -mindepth 1 -type d -delete 2>/dev/null || true
    rm -rf "\$subdir" 2>/dev/null || true
  fi
done
npm cache clean --force 2>/dev/null || true
sleep 3
# Install with explicit workspace configuration
npm install --legacy-peer-deps 2>&1 || true
# If first attempt had issues, do full cleanup and retry
if [[ ! -f node_modules/.package-lock.json ]]; then
  echo "  (Retrying npm install after cleanup)"
  for dir in node_modules server/node_modules client/node_modules; do
    find "\$dir" -mindepth 1 -type f -delete 2>/dev/null || true
    find "\$dir" -mindepth 1 -type d -delete 2>/dev/null || true
  done
  npm install --legacy-peer-deps
fi
# Ensure root node_modules/.bin is on PATH for prisma, tsc, etc.
export PATH="${REMOTE_PATH}/node_modules/.bin:\$PATH"

echo "▸ Building server …"
# Limit tsc heap to avoid OOM kill on low-memory VMs (tsc is very memory-hungry).
(cd server && ../node_modules/.bin/prisma generate && NODE_OPTIONS="--max-old-space-size=512" ../node_modules/.bin/tsc -p tsconfig.json)

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building client …"
npm --workspace client run build

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

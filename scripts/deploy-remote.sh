#!/usr/bin/env bash
set -euo pipefail

# ── Remote deploy script for SkyTravel ────────────────────────────────
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
"${SSH_CMD[@]}" "${SSH_USER}@${SSH_HOST}" bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_PATH="/home/ubuntu/skytravel"
cd "$REMOTE_PATH"

echo "▸ Pulling latest code …"
git fetch origin main
git reset --hard origin/main

echo "▸ Stopping running services …"
pm2 kill 2>/dev/null || true
pkill -9 -f "node|esbuild" 2>/dev/null || true
sleep 5

echo "▸ Cleaning node_modules …"
rm -rf node_modules client/node_modules server/node_modules
npm cache clean --force 2>/dev/null || true

echo "▸ Installing dependencies …"
# Root npm install covers all workspaces. vite is now a root devDep so
# @vitejs/plugin-react can resolve it from root node_modules.
npm install --legacy-peer-deps
export PATH="$REMOTE_PATH/node_modules/.bin:$PATH"

echo "▸ Building server …"
cd server
../node_modules/.bin/prisma generate
NODE_OPTIONS="--max-old-space-size=512" ../node_modules/.bin/tsc -p tsconfig.json
cd ..

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building client …"
npm --workspace client run build

echo "▸ Restarting PM2 apps …"
pm2 start ecosystem.config.cjs
pm2 save

echo "▸ Refreshing Alexandria feed …"
(cd server && npx tsx scripts/refresh-alexandria.ts) || echo "  ⚠ Alexandria refresh failed (non-critical)"

echo ""
echo "✅ Deploy complete!"
REMOTE_SCRIPT

echo ""
echo "✅ Remote deploy finished successfully."

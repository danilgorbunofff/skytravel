#!/usr/bin/env bash
set -euo pipefail

# ── Remote deploy script for SkyTravel ────────────────────────────────
# Required env vars: SSH_HOST, SSH_KEY_PATH
SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-167.233.47.103}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_PATH="${REMOTE_PROJECT_PATH:-/home/ubuntu/skytravel}"

# Resolve SSH key: env var → repo-local key → ~/.ssh default
if [[ -n "${SSH_KEY_PATH:-}" ]]; then
  KEY_PATH="${SSH_KEY_PATH}"
elif [[ -f "$(dirname "$0")/../ssh-key-new.key" ]]; then
  KEY_PATH="$(cd "$(dirname "$0")/.." && pwd)/ssh-key-new.key"
  chmod 600 "$KEY_PATH"
else
  echo "ERROR: No SSH key found. Set SSH_KEY_PATH or place ssh-key-new.key in repo root."
  exit 1
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
sudo rm -rf node_modules client/node_modules server/node_modules
npm cache clean --force 2>/dev/null || true

echo "▸ Extracting DATABASE_URL from server/.env …"
DB_URL=$(grep ^DATABASE_URL server/.env | head -1 | sed 's/^DATABASE_URL=//;s/^"//;s/"$//')
export DATABASE_URL="$DB_URL"

if [ ! -f bots/.env ]; then
  echo "▸ Creating bots/.env from template …"
  cp bots/.env.example bots/.env
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" bots/.env
  echo "  ⚠ Please fill TELEGRAM_BOT_TOKEN and other secrets in bots/.env manually"
else
  # Ensure DATABASE_URL is correct even if file exists
  if grep -q "^DATABASE_URL=" bots/.env; then
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" bots/.env
  else
    echo "DATABASE_URL=\"${DB_URL}\"" >> bots/.env
  fi
fi

echo "▸ Injecting DATABASE_URL into PM2 config …"
sed -i "s|PORT: 4000,|PORT: 4000,\n        DATABASE_URL: \"${DB_URL}\",|" ecosystem.config.cjs

echo "▸ Installing dependencies …"
# npm ci ensures we install exactly what's in the lockfile.
npm ci --legacy-peer-deps
export PATH="$REMOTE_PATH/node_modules/.bin:$PATH"

echo "▸ Building server …"
cd server
../node_modules/.bin/prisma generate
NODE_OPTIONS="--max-old-space-size=512" ../node_modules/.bin/tsc -p tsconfig.json
../node_modules/.bin/tsc-alias -p tsconfig.json --resolve-full-paths -fe .js
cd ..

echo "▸ Running database migrations …"
(cd server && ../node_modules/.bin/prisma migrate deploy)

echo "▸ Building bots …"
(cd bots && ../node_modules/.bin/prisma generate && ../node_modules/.bin/tsc -p tsconfig.json)

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

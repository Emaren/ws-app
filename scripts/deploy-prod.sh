#!/usr/bin/env bash
# scripts/deploy-prod.sh
# Safe, idempotent production deploy for Wheat & Stone.

set -Eeuo pipefail

APP_DIR="/var/www/ws-app"
APP_NAME="ws-app"
PORT="${PORT:-3011}"                       # prod port used by Next/PM2
HEALTH_URL="http://localhost:${PORT}/api/health"

trap 'echo "❌ Deploy failed. Recent logs:"; pm2 logs "'"${APP_NAME}"'" --lines 120 || true' ERR

cd "$APP_DIR"

# 0) Load prod env so build + runtime share the same values
if [[ -f ".env.production" ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
else
  echo "❌ Missing .env.production in ${APP_DIR}"
  exit 1
fi

# Warn if a local-only file exists on server (can override prod!)
if [[ -f ".env.production.local" ]]; then
  echo "⚠️  Found .env.production.local on server. This can override prod values."
  echo "    Consider removing it: rm -f .env.production.local"
fi

# Sanity: required envs
for v in NEXTAUTH_URL NEXTAUTH_SECRET DATABASE_URL; do
  if [[ -z "${!v:-}" ]]; then
    echo "❌ Missing required env ${v} (check .env.production)"
    exit 1
  fi
done

echo "▶ Installing dependencies (frozen lockfile)…"
pnpm install --frozen-lockfile

echo "▶ Generating Prisma client…"
pnpm prisma generate

echo "▶ Applying Prisma migrations…"
pnpm prisma migrate deploy

echo "▶ Building Next.js (production)…"
# Explicitly pass envs so they take precedence over any *.local files
NEXT_PUBLIC_SITE_ORIGIN="${NEXT_PUBLIC_SITE_ORIGIN:-$NEXTAUTH_URL}" \
NEXTAUTH_URL="${NEXTAUTH_URL}" \
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
DATABASE_URL="${DATABASE_URL}" \
NODE_ENV=production \
pnpm build

echo "▶ (Re)starting PM2 app…"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  PORT="${PORT}" NODE_ENV=production pm2 restart "${APP_NAME}" --update-env
else
  # First run: start from ecosystem file
  PORT="${PORT}" NODE_ENV=production pm2 start ecosystem.config.js --only "${APP_NAME}" --update-env
fi

echo "▶ Saving PM2 process list…"
pm2 save

echo "▶ Health check ${HEALTH_URL} …"
# Retry up to ~20s, suppress curl noise
if curl -fsS --retry 20 --retry-delay 1 --retry-connrefused "${HEALTH_URL}" >/dev/null 2>&1; then
  echo "✅ Deploy complete and healthy."
else
  echo "❌ Health check failed after retries."
  pm2 logs "${APP_NAME}" --lines 120
  exit 1
fi

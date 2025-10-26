#!/usr/bin/env bash
# scripts/deploy-prod.sh
# Safe, idempotent production deploy for Wheat & Stone.

set -euo pipefail

APP_DIR="/var/www/ws-app"
cd "$APP_DIR"

# Load production environment variables (DATABASE_URL, NEXTAUTH_URL, etc.)
if [[ -f ".env.production" ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
else
  echo "❌ Missing .env.production in $APP_DIR"
  exit 1
fi

echo "▶ Installing dependencies (frozen lockfile)…"
pnpm install --frozen-lockfile

echo "▶ Applying Prisma migrations…"
pnpm prisma migrate deploy --schema=prisma/schema.prisma

echo "▶ Building Next.js (production)…"
# If this fails, the script exits here and PM2 is NOT restarted.
NODE_ENV=production pnpm build

echo "▶ Restarting PM2 app…"
pm2 restart ws-app --update-env

echo "▶ Saving PM2 process list…"
pm2 save

echo "✅ Deploy complete."

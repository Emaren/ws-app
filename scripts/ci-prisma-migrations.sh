#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?Set DATABASE_URL explicitly before running migrations}"
export DATABASE_URL

echo "[ci:migrations] applying Prisma migrations..."
pnpm exec prisma migrate deploy

echo "[ci:migrations] validating migration status..."
pnpm exec prisma migrate status

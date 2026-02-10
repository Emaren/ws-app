#!/usr/bin/env bash
set -Eeuo pipefail

DATABASE_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:5432/wheatandstone?schema=public"
export DATABASE_URL="${DATABASE_URL:-$DATABASE_URL_DEFAULT}"

echo "[ci:migrations] applying Prisma migrations..."
pnpm exec prisma migrate deploy

echo "[ci:migrations] validating migration status..."
pnpm exec prisma migrate status

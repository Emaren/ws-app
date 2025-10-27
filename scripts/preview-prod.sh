#!/usr/bin/env bash
set -Eeuo pipefail

# --- repo root ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_ROOT"

# --- config knobs ---
HOST="${HOST:-0.0.0.0}"                 # bind host
DESIRED_PORT="${PORT:-3111}"            # target port (3111 == prod-parity)
DB_DEFAULT="file:${APP_ROOT}/prisma/prod.db"
USE_PROD_URLS="${PREVIEW_USE_PROD_URLS:-0}"   # 1 = use prod URLs from .env.production
KILL_PORT_IN_USE="${KILL_PORT_IN_USE:-0}"     # 1 = kill any process on DESIRED_PORT

# isolate preview build dir so it never clashes with dev/prod
export NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next-preview}"

# --- load prod env (allow local overrides) ---
if [[ -f ".env.production" ]]; then
  set -a
  # shellcheck source=/dev/null
  source ".env.production"
  set +a
fi

# --- helpers ---
port_in_use() {
  ss -ltnp 2>/dev/null | grep -q ":$1 " \
    || lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

kill_port() {
  local p="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "$p"/tcp 2>/dev/null || true
    sleep 0.5
    fuser -k -KILL "$p"/tcp 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -t -i:"$p" || true)"
    [[ -n "$pids" ]] && kill $pids 2>/dev/null || true
  fi
}

pick_free_near() {
  local base="$1"
  for i in $(seq 0 40); do
    local try=$(( base + i ))
    if ! port_in_use "$try"; then
      echo "$try"; return 0
    fi
  done
  echo "$base"
}

# --- required env (export once so ALL commands see them) ---
export NODE_ENV=production
export DATABASE_URL="${DATABASE_URL:-$DB_DEFAULT}"

if [[ "$USE_PROD_URLS" == "1" ]]; then
  : "${NEXT_PUBLIC_SITE_ORIGIN:?}" "${NEXTAUTH_URL:?}"
else
  export NEXT_PUBLIC_SITE_ORIGIN="http://localhost:${DESIRED_PORT}"
  export NEXTAUTH_URL="$NEXT_PUBLIC_SITE_ORIGIN"
fi

echo "🔧 Preview (prod parity)"
echo "   dist dir:     $NEXT_DIST_DIR"
echo "   database_url: $DATABASE_URL"
echo "   origin:       $NEXT_PUBLIC_SITE_ORIGIN"
echo "   desired port: $DESIRED_PORT"

# --- port handling ---
if port_in_use "$DESIRED_PORT" && [[ "$KILL_PORT_IN_USE" == "1" ]]; then
  echo "⚠️  Port $DESIRED_PORT busy — killing holder…"
  kill_port "$DESIRED_PORT"
  sleep 0.3
fi

PORT="$DESIRED_PORT"
if port_in_use "$PORT"; then
  PORT="$(pick_free_near "$DESIRED_PORT")"
  if [[ "$USE_PROD_URLS" != "1" ]]; then
    export NEXT_PUBLIC_SITE_ORIGIN="http://localhost:${PORT}"
    export NEXTAUTH_URL="$NEXT_PUBLIC_SITE_ORIGIN"
  fi
  echo "   chosen port:  $PORT"
fi

# --- clean & build (fixes stale vendor-chunk issues) ---
rm -rf "$NEXT_DIST_DIR"
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build

echo "▶️  Starting Next on ${HOST}:${PORT}"
exec npx next start -H "$HOST" -p "$PORT"

#!/usr/bin/env bash
# scripts/deploy-prod.sh
# Safe, idempotent production deploy for Wheat & Stone with robust port handling.

set -Eeuo pipefail

APP_DIR="/var/www/ws-app"
APP_NAME="ws-app"
PORT="${PORT:-3011}"                        # nginx expects this
FORCE_KILL="${FORCE_KILL:-0}"               # 1 = kill unknown holders of $PORT
HEALTH_URL="http://localhost:${PORT}/api/health"
# <<< NEW: allow temporarily looser CSP in prod until we lock it down >>>
PREVIEW_LOOSER_CSP="${PREVIEW_LOOSER_CSP:-1}"

say()  { printf "▶ %s\n" "$*"; }
ok()   { printf "✅ %s\n" "$*"; }
warn() { printf "⚠️  %s\n" "$*"; }

trap 'echo "❌ Deploy failed. Recent logs:"; pm2 logs "'"${APP_NAME}"'" --lines 120 || true' ERR

cd "$APP_DIR"

# -------------------- load prod env --------------------
if [[ -f ".env.production" ]]; then
  set -a
  # shellcheck source=/dev/null
  . ./.env.production
  set +a
else
  echo "❌ Missing .env.production in ${APP_DIR}"
  exit 1
fi

[[ -f ".env.production.local" ]] && warn ".env.production.local exists and can override prod values."

for v in NEXTAUTH_URL NEXTAUTH_SECRET DATABASE_URL; do
  [[ -n "${!v:-}" ]] || { echo "❌ Missing required env ${v} (check .env.production)"; exit 1; }
done

# -------------------- helpers --------------------
port_in_use() { ss -ltnp 2>/dev/null | grep -q ":$1 " || lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
pids_on_port() { lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | sort -u || true; }
pid_cmdline() { tr '\0' ' ' <"/proc/$1/cmdline" 2>/dev/null || true; }
pid_exe()     { readlink -f "/proc/$1/exe" 2>/dev/null || true; }
pid_cwd()     { readlink -f "/proc/$1/cwd" 2>/dev/null || true; }

describe_port_holders() {
  local p="$1"
  local out=""
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    out+="\n  • pid=$pid exe=$(pid_exe "$pid") cwd=$(pid_cwd "$pid") cmd=\"$(pid_cmdline "$pid")\""
  done < <(pids_on_port "$p")
  echo -e "$out"
}

graceful_kill_pid() {
  local pid="$1"
  kill -TERM "$pid" 2>/dev/null || true
  for _ in {1..20}; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.15
  done
  kill -KILL "$pid" 2>/dev/null || true
}

kill_port_holders_if_ours() {
  local p="$1"
  local killed_any=0
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    local exe cwd cmd
    exe="$(pid_exe "$pid")"
    cwd="$(pid_cwd "$pid")"
    cmd="$(pid_cmdline "$pid")"

    if [[ "$cwd" == "$APP_DIR" ]] || [[ "$cmd" == *"$APP_DIR"*next* ]] || [[ "$exe" == *"/node" && "$cmd" == *"next start"* && "$cmd" == *"$APP_DIR"* ]]; then
      say "Killing our own leftover process pid=$pid on port $p (cwd=$cwd)…"
      graceful_kill_pid "$pid"
      killed_any=1
    fi
  done < <(pids_on_port "$p")
  return $killed_any
}

force_kill_port() {
  local p="$1"
  say "FORCE_KILL=1 — terminating any process on $p…"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "$p"/tcp 2>/dev/null || true
    sleep 0.4
    fuser -k -KILL "$p"/tcp 2>/dev/null || true
  else
    while IFS= read -r pid; do
      [[ -n "$pid" ]] && graceful_kill_pid "$pid"
    done < <(pids_on_port "$p")
  fi
}

ensure_port_free() {
  local p="$1"
  pm2 describe "${APP_NAME}" >/dev/null 2>&1 && pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
  sleep 0.3

  if port_in_use "$p"; then
    say "Port $p is busy; checking holders…$(describe_port_holders "$p")"
    if kill_port_holders_if_ours "$p"; then
      sleep 0.4
    fi
  fi

  if port_in_use "$p"; then
    if [[ "$FORCE_KILL" == "1" ]]; then
      force_kill_port "$p"
      sleep 0.4
    else
      echo "❌ Port $p still in use by: $(describe_port_holders "$p")"
      echo "   Re-run with FORCE_KILL=1 to force free it:"
      echo "     FORCE_KILL=1 PORT=$p bash scripts/deploy-prod.sh"
      exit 1
    fi
  fi

  for _ in {1..10}; do
    port_in_use "$p" || return 0
    sleep 0.2
  done
  port_in_use "$p" && { echo "❌ Port $p still occupied after kill attempts."; exit 1; }
}

# -------------------- free port if needed --------------------
ensure_port_free "$PORT"

# -------------------- install / prisma / build --------------------
say "Installing dependencies (frozen lockfile)…"
pnpm install --frozen-lockfile

say "Generating Prisma client…"
pnpm prisma generate

say "Applying Prisma migrations…"
pnpm prisma migrate deploy

say "Building Next.js (production)…"
PREVIEW_LOOSER_CSP="${PREVIEW_LOOSER_CSP}" \
NEXT_PUBLIC_SITE_ORIGIN="${NEXT_PUBLIC_SITE_ORIGIN:-$NEXTAUTH_URL}" \
NEXTAUTH_URL="${NEXTAUTH_URL}" \
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
DATABASE_URL="${DATABASE_URL}" \
NODE_ENV=production \
pnpm build

# -------------------- PM2 start (fresh env) --------------------
say "(Re)starting PM2 app on port ${PORT}…"
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
PORT="${PORT}" NODE_ENV=production \
PREVIEW_LOOSER_CSP="${PREVIEW_LOOSER_CSP}" \
NEXT_PUBLIC_SITE_ORIGIN="${NEXT_PUBLIC_SITE_ORIGIN:-$NEXTAUTH_URL}" \
NEXTAUTH_URL="${NEXTAUTH_URL}" \
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
DATABASE_URL="${DATABASE_URL}" \
pm2 start ecosystem.config.js --only "${APP_NAME}" --update-env

pm2 save

# -------------------- health check --------------------
say "Health check ${HEALTH_URL} …"
if curl -fsS --retry 30 --retry-delay 1 --retry-connrefused "${HEALTH_URL}" >/dev/null 2>&1; then
  ok "Deploy complete and healthy."
else
  echo "❌ Health check failed."
  pm2 logs "${APP_NAME}" --lines 120
  exit 1
fi

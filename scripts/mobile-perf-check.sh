#!/usr/bin/env bash
set -Eeuo pipefail

PORT="${PORT:-3311}"
BASE_URL="http://127.0.0.1:${PORT}"
REPORT_DIR="${REPORT_DIR:-.lighthouse}"
TMP_LOG="/tmp/ws-app-mobile-perf.log"

mkdir -p "${REPORT_DIR}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[perf] Building ws-app..."
pnpm build >/dev/null

echo "[perf] Starting ws-app on ${BASE_URL}"
PORT="${PORT}" pnpm start >"${TMP_LOG}" 2>&1 &
SERVER_PID=$!

for _ in {1..60}; do
  if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  echo "[perf] ws-app did not become healthy"
  tail -n 120 "${TMP_LOG}" || true
  exit 1
fi

echo "[perf] Running Lighthouse mobile checks..."
npx --yes lighthouse "${BASE_URL}" \
  --only-categories=performance,pwa,accessibility,best-practices \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --throttling-method=simulate \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
  --output=json --output=html \
  --output-path="${REPORT_DIR}/ws-app-mobile"

REPORT_JSON="${REPORT_DIR}/ws-app-mobile.report.json"
node scripts/mobile-perf-gate.mjs "${REPORT_JSON}"

echo "[perf] Done. Reports saved under ${REPORT_DIR}/"

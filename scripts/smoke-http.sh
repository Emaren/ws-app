#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT:-3010}}"
PUBLIC_URL="${PUBLIC_URL:-https://wheatandstone.ca}"
RUN_PUBLIC_SMOKE="${RUN_PUBLIC_SMOKE:-1}"
tmp_file="$(mktemp)"

cleanup() {
  rm -f "$tmp_file"
}
trap cleanup EXIT

check_endpoint() {
  local label="$1"
  local url="$2"
  local expected_code="$3"
  local expected_text="${4:-}"

  local status
  status="$(curl -sS -o "$tmp_file" -w "%{http_code}" "$url")"

  if [[ "$status" != "$expected_code" ]]; then
    echo "[smoke][FAIL] ${label}: expected ${expected_code}, got ${status} (${url})"
    cat "$tmp_file"
    exit 1
  fi

  if [[ -n "$expected_text" ]] && ! grep -q "$expected_text" "$tmp_file"; then
    echo "[smoke][FAIL] ${label}: response missing expected text '${expected_text}' (${url})"
    cat "$tmp_file"
    exit 1
  fi

  echo "[smoke][PASS] ${label}: ${url}"
}

echo "[smoke] ws-app base: ${BASE_URL}"
check_endpoint "local health" "${BASE_URL}/api/health" "200" "\"ok\":true"
check_endpoint "local home" "${BASE_URL}/" "200" "Wheat"
check_endpoint "local articles" "${BASE_URL}/articles" "200"

if [[ "${RUN_PUBLIC_SMOKE}" == "1" ]]; then
  echo "[smoke] ws-app public: ${PUBLIC_URL}"
  check_endpoint "public health" "${PUBLIC_URL}/api/health" "200" "\"ok\":true"
  check_endpoint "public home" "${PUBLIC_URL}/" "200" "Wheat"
  check_endpoint "public articles" "${PUBLIC_URL}/articles" "200"
fi

echo "[smoke] ws-app smoke passed."

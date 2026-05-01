#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

usage() {
  cat <<'EOF'
Usage:
  scripts/post-deploy-check.sh <base_url>

Examples:
  scripts/post-deploy-check.sh https://zkredit-ai.vercel.app
  DEPLOY_URL=https://zkredit-ai.vercel.app scripts/post-deploy-check.sh

Optional environment variables:
  REQUIRED_ENV_VARS   Comma or space-separated variable names to validate in current shell.
                      Example: REQUIRED_ENV_VARS="VITE_API_URL,VITE_WS_URL"

What this script verifies:
  - Required local environment variables are present (if configured)
  - Core HTTP endpoints respond with expected status codes
  - Basic response shape checks for JSON endpoints

Exit codes:
  0 -> all checks passed
  1 -> one or more checks failed
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[FAIL] curl is required but not installed."
  exit 1
fi

BASE_URL="${1:-${DEPLOY_URL:-}}"
if [[ -z "${BASE_URL}" ]]; then
  echo "[FAIL] Missing base URL."
  usage
  exit 1
fi

# Trim trailing slash for consistent URL assembly.
BASE_URL="${BASE_URL%/}"

declare -i FAILURES=0
declare -i PASSES=0

pass() {
  echo "[PASS] $1"
  PASSES+=1
}

fail() {
  echo "[FAIL] $1"
  FAILURES+=1
}

header() {
  echo
  echo "=== $1 ==="
}

check_required_env_vars() {
  local raw required normalized var
  raw="${REQUIRED_ENV_VARS:-}"

  if [[ -z "${raw}" ]]; then
    echo "[INFO] REQUIRED_ENV_VARS not set. Skipping local env var presence checks."
    return
  fi

  normalized="${raw//,/ }"
  for var in ${normalized}; do
    if [[ -z "${!var:-}" ]]; then
      fail "Environment variable '${var}' is not set in current shell"
    else
      pass "Environment variable '${var}' is set"
    fi
  done
}

request_endpoint() {
  local url output_file status
  url="$1"
  output_file="$2"

  status="$(curl -sS -o "${output_file}" -w "%{http_code}" "${url}" || true)"
  if [[ ! "${status}" =~ ^[0-9]{3}$ ]]; then
    echo "000"
    return
  fi

  echo "${status}"
}

assert_status() {
  local path expected status body_file url
  path="$1"
  expected="$2"
  body_file="$3"
  url="${BASE_URL}${path}"

  status="$(request_endpoint "${url}" "${body_file}")"
  if [[ "${status}" == "${expected}" ]]; then
    pass "${path} returned HTTP ${status}"
  else
    fail "${path} returned HTTP ${status} (expected ${expected})"
  fi
}

assert_contains() {
  local file pattern label
  file="$1"
  pattern="$2"
  label="$3"

  if grep -Eq "${pattern}" "${file}"; then
    pass "${label}"
  else
    fail "${label}"
  fi
}

tmp_root="$(mktemp -d)"
trap 'rm -rf "${tmp_root}"' EXIT

header "Zkredit Post-Deploy Verification"
echo "Base URL: ${BASE_URL}"

header "1) Local Environment Presence"
check_required_env_vars

header "2) Endpoint Availability"
assert_status "/" "200" "${tmp_root}/root.body"
assert_status "/health" "200" "${tmp_root}/health.body"
assert_status "/api/dashboard/stats" "200" "${tmp_root}/stats.body"
assert_status "/api/agent/status" "200" "${tmp_root}/agent_status.body"
assert_status "/api/trades/history" "200" "${tmp_root}/trades.body"
assert_status "/api/conversation/latest" "200" "${tmp_root}/conversation_latest.body"
assert_status "/docs" "200" "${tmp_root}/docs.body"
assert_status "/openapi.json" "200" "${tmp_root}/openapi.body"

header "3) Response Shape Checks"
assert_contains "${tmp_root}/health.body" '"status"\s*:\s*"healthy"' "Health endpoint reports healthy status"
assert_contains "${tmp_root}/stats.body" '"totalBalance"' "Stats payload contains totalBalance"
assert_contains "${tmp_root}/stats.body" '"activeLoans"' "Stats payload contains activeLoans"
assert_contains "${tmp_root}/agent_status.body" '"status"' "Agent status payload contains status"
assert_contains "${tmp_root}/conversation_latest.body" '"conversation_id"' "Conversation payload contains conversation_id"
assert_contains "${tmp_root}/openapi.body" '"openapi"' "OpenAPI schema is exposed"

header "Summary"
echo "Passes: ${PASSES}"
echo "Failures: ${FAILURES}"

if (( FAILURES > 0 )); then
  echo "\nDeployment verification failed."
  exit 1
fi

echo "\nDeployment verification passed."
exit 0

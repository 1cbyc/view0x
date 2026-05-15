#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:${WEB_PORT:-18088}}"
PASSWORD="${SMOKE_PASSWORD:-StrongPass123!}"
EMAIL="smoke-$(date +%s)@example.com"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

json_get() {
  node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const j = JSON.parse(d); const path = process.argv[1].split('.'); let v = j; for (const p of path) v = v?.[p]; if (v == null) process.exit(2); process.stdout.write(String(v)); });" "$1"
}

need curl
need node

echo "==> Health: ${BASE_URL}/health"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "==> Public analysis"
public_response="$(
  curl -fsS -X POST "${BASE_URL}/api/analysis/public" \
    -H "Content-Type: application/json" \
    --data '{"contractCode":"pragma solidity ^0.8.19; contract T { address public owner; function bad() public { require(tx.origin == owner, \"no\"); } }"}'
)"
public_success="$(printf '%s' "$public_response" | json_get success)"
[ "$public_success" = "true" ]

echo "==> Register smoke user"
register_response="$(
  curl -fsS -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"Smoke Test\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
)"
token="$(printf '%s' "$register_response" | json_get data.tokens.accessToken)"

echo "==> Queue authenticated analysis"
job_response="$(
  curl -fsS -X POST "${BASE_URL}/api/analysis" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    --data '{"contractName":"SmokeTest","contractCode":"// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\ncontract T { address public owner; constructor(){ owner = msg.sender; } function bad() public { require(tx.origin == owner, \"no\"); } }"}'
)"
job_id="$(printf '%s' "$job_response" | json_get data.jobId)"

echo "==> Wait for job ${job_id}"
for _ in $(seq 1 20); do
  status_response="$(curl -fsS -H "Authorization: Bearer ${token}" "${BASE_URL}/api/analysis/${job_id}/status")"
  status="$(printf '%s' "$status_response" | json_get data.status)"
  echo "    status=${status}"
  if [ "$status" = "completed" ]; then
    echo "Smoke test passed."
    exit 0
  fi
  if [ "$status" = "failed" ]; then
    echo "Analysis failed during smoke test." >&2
    curl -fsS -H "Authorization: Bearer ${token}" "${BASE_URL}/api/analysis/${job_id}" >&2
    exit 1
  fi
  sleep 3
done

echo "Timed out waiting for analysis job ${job_id}" >&2
exit 1

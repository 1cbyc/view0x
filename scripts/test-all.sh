#!/usr/bin/env bash
set -euo pipefail

echo "==> Backend build"
npm --prefix backend run build

echo "==> Frontend build"
npm --prefix frontend run build

echo "==> Python syntax check"
python3 -m compileall python

echo "==> Backend tests"
npm --prefix backend test

echo "==> Focused frontend tests"
npm --prefix frontend test -- --run src/__tests__/components/Button.test.tsx src/__tests__/pages/ContractAnalyzer.test.tsx

if docker compose ps web --format json >/dev/null 2>&1; then
  if docker compose ps web --format json | grep -q '"State":"running"'; then
    echo "==> Smoke test against running Docker web service"
    bash scripts/smoke-test.sh
  else
    echo "==> Docker web service is not running; skipping smoke test"
  fi
else
  echo "==> Docker Compose unavailable; skipping smoke test"
fi

echo "All verification checks passed."

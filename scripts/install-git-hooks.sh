#!/bin/sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for name in prepare-commit-msg commit-msg; do
  cp "$ROOT/scripts/hooks/$name" "$ROOT/.git/hooks/$name"
  chmod +x "$ROOT/.git/hooks/$name" "$ROOT/scripts/hooks/$name"
done
echo "Installed git hooks (strip + block cursoragent co-author lines)."

#!/usr/bin/env bash
# Generate secrets for production .env (run on server, not committed).
set -euo pipefail

jwt_secret="$(openssl rand -base64 48)"
refresh_secret="$(openssl rand -base64 48)"
db_password="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

cat <<EOF
# Paste into repo-root .env (chmod 600) — or run: ./scripts/rotate-env-secrets.sh
JWT_SECRET=${jwt_secret}
REFRESH_TOKEN_SECRET=${refresh_secret}
POSTGRES_PASSWORD=${db_password}
DATABASE_URL=postgresql://view0x_user:${db_password}@postgres:5432/view0x_db
EOF

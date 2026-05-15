#!/usr/bin/env bash
# Rotate JWT, refresh token, and Postgres password in repo-root .env (in place).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.example to .env first." >&2
  exit 1
fi

jwt_secret="$(openssl rand -base64 48)"
refresh_secret="$(openssl rand -base64 48)"
db_password="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

# Preserve POSTGRES_USER / POSTGRES_DB from existing file or defaults
postgres_user="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
postgres_db="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
postgres_user="${postgres_user:-view0x_user}"
postgres_db="${postgres_db:-view0x_db}"

database_url="postgresql://${postgres_user}:${db_password}@postgres:5432/${postgres_db}"

set_kv() {
  local key="$1" val="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    if [[ "$(uname)" == Darwin ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$file"
    fi
  else
    echo "${key}=${val}" >>"$file"
  fi
}

set_kv JWT_SECRET "$jwt_secret" "$ENV_FILE"
set_kv REFRESH_TOKEN_SECRET "$refresh_secret" "$ENV_FILE"
set_kv POSTGRES_PASSWORD "$db_password" "$ENV_FILE"
set_kv DATABASE_URL "$database_url" "$ENV_FILE"

chmod 600 "$ENV_FILE" 2>/dev/null || true

echo "Rotated JWT_SECRET, REFRESH_TOKEN_SECRET, POSTGRES_PASSWORD, DATABASE_URL in $ENV_FILE"
echo "Restart services: docker compose up -d --build"
echo "If Postgres already has data with the old password, update the DB role or recreate the volume."

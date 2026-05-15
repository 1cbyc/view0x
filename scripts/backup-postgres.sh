#!/usr/bin/env bash
# Daily Postgres backup — install in cron on VPS:
# 0 3 * * * /home/view0x/app/scripts/backup-postgres.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/view0x/app}"
BACKUP_DIR="${BACKUP_DIR:-/home/view0x/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/view0x_db_${STAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-view0x_user}" "${POSTGRES_DB:-view0x_db}" | gzip > "$FILE"
find "$BACKUP_DIR" -name 'view0x_db_*.sql.gz' -mtime +"$RETAIN_DAYS" -delete

echo "Backup written: $FILE"

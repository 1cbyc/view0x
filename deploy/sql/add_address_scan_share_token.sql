-- Run on VPS Postgres (once):
-- docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f - < deploy/sql/add_address_scan_share_token.sql

ALTER TABLE address_scans ADD COLUMN IF NOT EXISTS share_token VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS address_scans_share_token_key ON address_scans (share_token) WHERE share_token IS NOT NULL;

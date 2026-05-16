-- Run once on production Postgres (sequelize.sync uses alter: false).
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);

ALTER TABLE address_scans
  ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_analyses_guest_session_id
  ON analyses (guest_session_id)
  WHERE guest_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_address_scans_guest_session_id
  ON address_scans (guest_session_id)
  WHERE guest_session_id IS NOT NULL;

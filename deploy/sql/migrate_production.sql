-- Idempotent schema updates for production (sequelize.sync uses alter: false).
-- Applied automatically by .github/workflows/deploy-vps.yml

-- Address scan share links
ALTER TABLE address_scans ADD COLUMN IF NOT EXISTS share_token VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS address_scans_share_token_key
  ON address_scans (share_token) WHERE share_token IS NOT NULL;

-- Guest session (claim pre-sign-in work after login)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);
ALTER TABLE address_scans ADD COLUMN IF NOT EXISTS guest_session_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_analyses_guest_session_id
  ON analyses (guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_address_scans_guest_session_id
  ON address_scans (guest_session_id) WHERE guest_session_id IS NOT NULL;

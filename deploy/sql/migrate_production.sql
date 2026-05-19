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

-- In-app notifications inbox
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_read_at
  ON notifications (user_id, read_at);

-- Public Rekt Database incidents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rekt_incident_severity') THEN
    CREATE TYPE rekt_incident_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rekt_incident_status') THEN
    CREATE TYPE rekt_incident_status AS ENUM ('confirmed', 'disputed', 'recovered', 'partial_recovery');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS rekt_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(160) NOT NULL UNIQUE,
  project_name VARCHAR(160) NOT NULL,
  title VARCHAR(220) NOT NULL,
  incident_date DATE NOT NULL,
  disclosed_at TIMESTAMPTZ,
  amount_lost_usd NUMERIC(20, 2),
  amount_recovered_usd NUMERIC(20, 2),
  severity rekt_incident_severity NOT NULL DEFAULT 'HIGH',
  status rekt_incident_status NOT NULL DEFAULT 'confirmed',
  chains TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  attack_types TEXT[] NOT NULL DEFAULT '{}',
  auditor_names TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  root_cause TEXT,
  technical_details TEXT,
  remediation TEXT,
  affected_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  transaction_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rekt_incidents_incident_date
  ON rekt_incidents (incident_date DESC);
CREATE INDEX IF NOT EXISTS rekt_incidents_amount_lost_usd
  ON rekt_incidents (amount_lost_usd DESC);
CREATE INDEX IF NOT EXISTS rekt_incidents_severity
  ON rekt_incidents (severity);
CREATE INDEX IF NOT EXISTS rekt_incidents_chains_gin
  ON rekt_incidents USING GIN (chains);
CREATE INDEX IF NOT EXISTS rekt_incidents_categories_gin
  ON rekt_incidents USING GIN (categories);
CREATE INDEX IF NOT EXISTS rekt_incidents_attack_types_gin
  ON rekt_incidents USING GIN (attack_types);

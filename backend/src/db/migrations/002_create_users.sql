-- Migration 002: Create users table

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE,
  phone               TEXT UNIQUE,
  password_hash       TEXT,                    -- NULL for OTP-only users
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN (
                        'community_reporter',
                        'drone_operator',
                        'phi',
                        'ndcu_admin'
                      )),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'si', 'ta')),
  assigned_zone_id    UUID,                    -- FK added after zones table exists (migration 003)
  google_oauth_id     TEXT UNIQUE,             -- for FR-04 OAuth
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At least one contact method must exist
  CONSTRAINT users_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Index for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration 003: Create zones table (requires PostGIS from migration 001)

CREATE TABLE IF NOT EXISTS zones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  district            TEXT NOT NULL,
  province            TEXT NOT NULL,
  geom                GEOMETRY(MultiPolygon, 4326),  -- WGS84 geographic coordinates
  risk_score          NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level          TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  active_report_count INTEGER NOT NULL DEFAULT 0 CHECK (active_report_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for PostGIS queries (ST_Within, ST_Contains, ST_Distance)
CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zones_risk_level ON zones (risk_level);
CREATE INDEX IF NOT EXISTS idx_zones_district ON zones (district);

-- Now add FK from users → zones (safe since zones now exists)
ALTER TABLE users
  ADD CONSTRAINT fk_users_assigned_zone
  FOREIGN KEY (assigned_zone_id) REFERENCES zones (id) ON DELETE SET NULL;

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

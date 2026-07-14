-- Migration 005: Create reports table
-- Depends on: users (002), zones (003), drone_missions (004)

CREATE TABLE IF NOT EXISTS reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         TEXT NOT NULL CHECK (source_type IN ('community', 'drone')),
  reporter_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  zone_id             UUID REFERENCES zones (id) ON DELETE SET NULL,
  drone_mission_id    UUID REFERENCES drone_missions (id) ON DELETE SET NULL,

  -- Location
  latitude            NUMERIC(10, 7),
  longitude           NUMERIC(10, 7),
  geom                GEOMETRY(Point, 4326),   -- derived from lat/lng for spatial queries

  -- Image
  image_url           TEXT NOT NULL,
  image_key           TEXT,                    -- storage provider key (S3 object key or local path)

  -- Processing status
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending',
                        'processing',
                        'complete',
                        'needs_human_review',
                        'failed'
                      )),

  -- AI analysis output
  site_type           TEXT CHECK (site_type IN (
                        'plastic_container', 'drain', 'tyre',
                        'construction_water', 'flower_pot', 'roof_gutter', 'other'
                      )),
  risk_level          TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score    NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ai_analysis         JSONB,                   -- full raw JSON from Gemini
  guidance_text       TEXT,                    -- English guidance
  guidance_text_si    TEXT,                    -- Sinhala translation
  guidance_text_ta    TEXT,                    -- Tamil translation
  breeding_indicators TEXT[],                  -- list of detected indicators
  remediation_action  TEXT,

  -- Human review / notes
  notes               TEXT,
  reviewed_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A drone report must reference a mission; a community report must have a reporter
  CONSTRAINT reports_community_has_reporter CHECK (
    source_type != 'community' OR reporter_id IS NOT NULL
  ),
  CONSTRAINT reports_drone_has_mission CHECK (
    source_type != 'drone' OR drone_mission_id IS NOT NULL
  )
);

-- Spatial index for lat/lng proximity queries
CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_reports_zone_id ON reports (zone_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_risk_level ON reports (risk_level);
CREATE INDEX IF NOT EXISTS idx_reports_source_type ON reports (source_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_drone_mission ON reports (drone_mission_id) WHERE drone_mission_id IS NOT NULL;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration 007: Create drone_missions and drone_image_reports tables
-- Depends on: users (002), zones (003)
-- NOTE: drone_missions table was created in migration 004 but without image-report sub-table.
-- This migration adds the drone_image_reports table for per-frame AI analysis results.

CREATE TABLE IF NOT EXISTS drone_image_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id       UUID NOT NULL REFERENCES drone_missions (id) ON DELETE CASCADE,
  report_id        UUID REFERENCES reports (id) ON DELETE SET NULL,  -- linked community report

  image_url        TEXT NOT NULL,
  image_key        TEXT,
  frame_index      INTEGER,         -- Sequential frame number within the mission
  latitude         NUMERIC(10, 7),
  longitude        NUMERIC(10, 7),
  altitude_m       NUMERIC(8, 3),   -- Drone altitude in metres
  geom             GEOMETRY(Point, 4326),

  -- AI analysis results (mirrors reports table)
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                     'pending', 'processing', 'complete', 'needs_human_review', 'failed'
                   )),
  site_type        TEXT,
  risk_level       TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score NUMERIC(4, 3),
  ai_analysis      JSONB,
  breeding_indicators TEXT[],

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drone_img_mission ON drone_image_reports (mission_id);
CREATE INDEX IF NOT EXISTS idx_drone_img_geom    ON drone_image_reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_drone_img_status  ON drone_image_reports (status);
CREATE INDEX IF NOT EXISTS idx_drone_img_risk    ON drone_image_reports (risk_level);

CREATE TRIGGER drone_image_reports_updated_at
  BEFORE UPDATE ON drone_image_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

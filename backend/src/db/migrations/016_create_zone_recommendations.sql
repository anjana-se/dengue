-- Migration 016: Create zone_recommendations table


CREATE TABLE IF NOT EXISTS zone_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  rank            INTEGER NOT NULL,
  action          TEXT NOT NULL,
  reasoning       TEXT NOT NULL,
  confidence      INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  suggested_teams INTEGER NOT NULL DEFAULT 1,
  priority_score  NUMERIC(8, 2) NOT NULL,   -- engine score; can exceed 100 when convergence applies
  tier            TEXT NOT NULL CHECK (tier IN ('auto_dispatch', 'human_approval', 'monitor')),
  risk_level      TEXT NOT NULL,
  open_orders     INTEGER NOT NULL DEFAULT 0,
  active_reports  INTEGER NOT NULL DEFAULT 0,
  trace           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- engine breakdown (normalized signals, spiking sources)
  weight_version  TEXT NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_recs_computed ON zone_recommendations (computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_recs_zone     ON zone_recommendations (zone_id, computed_at DESC);

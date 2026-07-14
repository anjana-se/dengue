-- Migration 004: Create drone_missions table (requires users + zones)

CREATE TABLE IF NOT EXISTS drone_missions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID NOT NULL REFERENCES zones (id) ON DELETE RESTRICT,
  operator_id   UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
                  'planned',
                  'in_progress',
                  'completed',
                  'aborted'
                )),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT drone_missions_completed_after_started CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  )
);

CREATE INDEX IF NOT EXISTS idx_drone_missions_zone_id ON drone_missions (zone_id);
CREATE INDEX IF NOT EXISTS idx_drone_missions_operator_id ON drone_missions (operator_id);
CREATE INDEX IF NOT EXISTS idx_drone_missions_status ON drone_missions (status);

CREATE TRIGGER drone_missions_updated_at
  BEFORE UPDATE ON drone_missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

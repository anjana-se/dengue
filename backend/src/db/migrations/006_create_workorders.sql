-- Migration 006: Create work_orders table
-- Depends on: reports (005), users (002)

CREATE TABLE IF NOT EXISTS work_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  assigned_to           UUID REFERENCES users (id) ON DELETE SET NULL,   -- PHI officer
  assigned_by           UUID REFERENCES users (id) ON DELETE SET NULL,   -- NDCU admin who assigned

  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                          'open', 'accepted', 'resolved', 'cancelled'
                        )),
  priority_score        INTEGER NOT NULL DEFAULT 0 CHECK (priority_score >= 0),
  remediation_action    TEXT,

  follow_up_image_url   TEXT,         -- proof of remediation (photo)
  follow_up_image_key   TEXT,         -- storage provider key

  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one open work order per report at a time
  CONSTRAINT one_open_workorder_per_report UNIQUE (report_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_work_orders_report_id ON work_orders (report_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders (created_at DESC);

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

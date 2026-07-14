-- Migration 008: Create audit_log table
-- Satisfies "immutable audit log, 7-year retention" security requirement.
-- Written to by audit.middleware.ts on every POST/PATCH/DELETE request.

CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,                  -- NULL for unauthenticated actions
  action       TEXT NOT NULL,         -- e.g. 'report.create', 'workorder.resolve'
  entity_type  TEXT NOT NULL,         -- e.g. 'report', 'workorder', 'user'
  entity_id    TEXT,                  -- ID of the affected row (UUID as text)
  old_values   JSONB,                 -- previous state (for updates)
  new_values   JSONB,                 -- new state (for creates/updates)
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — audit records are immutable
);

-- Index for compliance queries: "who did what to this record?"
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);

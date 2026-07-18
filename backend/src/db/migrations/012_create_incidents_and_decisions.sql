-- Migration 012: Create incidents and duplicate_decisions tables
CREATE TABLE IF NOT EXISTS incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) NOT NULL UNIQUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'open', -- open, verified, resolved, closed
    risk_level          VARCHAR(20) NOT NULL DEFAULT 'medium',
    location            GEOMETRY(Point, 4326) NOT NULL,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    zone_id             UUID REFERENCES zones(id) ON DELETE SET NULL,
    zone_name           VARCHAR(100),
    confirmation_count  INTEGER DEFAULT 1,
    report_count        INTEGER DEFAULT 1,
    primary_report_id   UUID,
    site_type           VARCHAR(50) NOT NULL DEFAULT 'other',
    merged_into         UUID REFERENCES incidents(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at         TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(zone_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

-- Add incident_id to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS duplicate_decisions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    new_report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    matched_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    confidence          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    decision            VARCHAR(50) NOT NULL, -- auto_attached, flagged_review, new_incident
    status              VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, overridden
    ai_reasoning        TEXT,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    override_reason     TEXT,
    gps_distance_m      DOUBLE PRECISION DEFAULT 0.0,
    time_diff_h         DOUBLE PRECISION DEFAULT 0.0,
    new_lat             DOUBLE PRECISION NOT NULL,
    new_lng             DOUBLE PRECISION NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dup_decisions_report ON duplicate_decisions(new_report_id);
CREATE INDEX IF NOT EXISTS idx_dup_decisions_incident ON duplicate_decisions(matched_incident_id);

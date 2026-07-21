-- Migration 015: Create forecasts table (14-day outbreak forecast per zone)
-- Requires zones (003) and PostGIS (001). Modelled on the frontend Prediction
-- type (ndcu/src/types.ts) with contributing_factors flattened into columns.
CREATE TABLE IF NOT EXISTS forecasts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id               UUID REFERENCES zones(id) ON DELETE CASCADE,
    zone_name             VARCHAR(100) NOT NULL,
    prediction_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    forecast_horizon_days INTEGER NOT NULL DEFAULT 14,
    outbreak_probability  DOUBLE PRECISION NOT NULL,                 -- 0..1
    risk_trend            VARCHAR(20) NOT NULL,                      -- rising | stable | falling
    confidence            DOUBLE PRECISION NOT NULL,                 -- 0..1
    breeding_site_density DOUBLE PRECISION NOT NULL DEFAULT 0,       -- 0..1
    recent_case_count     INTEGER NOT NULL DEFAULT 0,
    rainfall_mm_forecast  DOUBLE PRECISION NOT NULL DEFAULT 0,
    temperature_avg_c     DOUBLE PRECISION NOT NULL DEFAULT 0,
    humidity_percent      DOUBLE PRECISION NOT NULL DEFAULT 0,
    recommended_action    TEXT NOT NULL DEFAULT '',
    alert_level           VARCHAR(20) NOT NULL,                      -- watch | warning | emergency
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One current forecast per zone (also makes seeding idempotent via ON CONFLICT).
CREATE UNIQUE INDEX IF NOT EXISTS idx_forecasts_zone ON forecasts(zone_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_alert_level ON forecasts(alert_level);

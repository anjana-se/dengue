-- Migration 011: Create cases, iot_traps, and trap_readings tables
CREATE TABLE IF NOT EXISTS cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         VARCHAR(50) NOT NULL UNIQUE,
    zone_id         UUID REFERENCES zones(id) ON DELETE SET NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    district        VARCHAR(100) NOT NULL,
    zone_name       VARCHAR(100) NOT NULL,
    reported_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    age_group       VARCHAR(20) NOT NULL,
    severity        VARCHAR(20) NOT NULL, -- mild, moderate, severe
    hospital        VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, recovered
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_location ON cases USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_cases_zone ON cases(zone_id);
CREATE INDEX IF NOT EXISTS idx_cases_reported_date ON cases(reported_date DESC);

CREATE TABLE IF NOT EXISTS iot_traps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number   VARCHAR(100) NOT NULL UNIQUE,
    location        GEOMETRY(Point, 4326) NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    zone_id         UUID REFERENCES zones(id) ON DELETE SET NULL,
    district        VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, offline, maintenance
    battery_percent INTEGER DEFAULT 100,
    last_sync_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traps_location ON iot_traps USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_traps_zone ON iot_traps(zone_id);

CREATE TABLE IF NOT EXISTS trap_readings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trap_id             UUID NOT NULL REFERENCES iot_traps(id) ON DELETE CASCADE,
    mosquito_count_24h  INTEGER DEFAULT 0,
    mosquito_count_7d   INTEGER DEFAULT 0,
    species_detected    VARCHAR(50)[] DEFAULT '{}'::VARCHAR[],
    larvae_detected     BOOLEAN DEFAULT FALSE,
    water_temp_c        DOUBLE PRECISION DEFAULT 25.0,
    humidity_percent    DOUBLE PRECISION DEFAULT 70.0,
    trap_fill_percent   DOUBLE PRECISION DEFAULT 10.0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trap_readings_trap ON trap_readings(trap_id);
CREATE INDEX IF NOT EXISTS idx_trap_readings_created ON trap_readings(created_at DESC);

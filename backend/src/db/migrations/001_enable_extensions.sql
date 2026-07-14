-- Migration 001: Enable required PostgreSQL extensions
-- PostGIS: spatial queries (zone geometry, lat/lng lookups)
-- pgcrypto: gen_random_uuid() for UUIDs
-- uuid-ossp: alternative UUID generation (belt-and-suspenders)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

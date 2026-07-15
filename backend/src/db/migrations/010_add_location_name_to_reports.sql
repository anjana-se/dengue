-- Migration 010: Add location_name column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS location_name TEXT;

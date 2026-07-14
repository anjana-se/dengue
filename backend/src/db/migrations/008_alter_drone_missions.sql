-- Migration 008: Alter drone_missions table to match queries
ALTER TABLE drone_missions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Unnamed Mission';
ALTER TABLE drone_missions ADD COLUMN IF NOT EXISTS planned_area TEXT;
ALTER TABLE drone_missions ALTER COLUMN zone_id DROP NOT NULL;

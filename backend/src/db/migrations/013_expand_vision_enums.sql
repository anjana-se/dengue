-- Migration 013: Expand vision-analysis enums
-- Widens the site_type taxonomy (7 -> 17 values) and adds a 'none' risk_level.
-- The new AI fields (water_present, larvae_visible, reasoning, needs_human_review)
-- ride inside the existing ai_analysis JSONB column, so no new columns are added.
-- Depends on: reports (005), drone_image_reports (007).

-- ── 1. Drop the old site_type CHECK constraint FIRST ──
--    The data-migration UPDATEs below rename values to ones the OLD constraint
--    rejects (e.g. 'blocked_drain'), so the old constraint must be gone before
--    the UPDATEs run — otherwise the UPDATE itself violates the old CHECK.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_site_type_check;

-- ── 2. Data-migrate existing synthetic rows to the renamed site_type values ──
UPDATE reports SET site_type = 'discarded_tire'          WHERE site_type = 'tyre';
UPDATE reports SET site_type = 'blocked_drain'           WHERE site_type = 'drain';
UPDATE reports SET site_type = 'construction_site_water' WHERE site_type = 'construction_water';
UPDATE reports SET site_type = 'flower_pot_or_saucer'    WHERE site_type = 'flower_pot';
-- (plastic_container, roof_gutter, other are unchanged)

-- ── 3. Add the widened reports.site_type CHECK constraint (17-value taxonomy) ──
ALTER TABLE reports ADD CONSTRAINT reports_site_type_check CHECK (site_type IN (
  'discarded_tire',
  'plastic_container',
  'metal_container',
  'water_storage_tank_barrel',
  'flower_pot_or_saucer',
  'roof_gutter',
  'blocked_drain',
  'construction_site_water',
  'coconut_shell',
  'tree_hole',
  'ornamental_pond',
  'ac_or_fridge_tray',
  'bird_bath',
  'tarpaulin_sheeting',
  'unused_well',
  'refuse_or_food_container',
  'other'
));

-- ── 4. Add 'none' to the risk_level CHECK on reports + drone_image_reports ──
--    (zones.risk_level is intentionally left unchanged: zones aggregate scores
--     and never resolve to 'none'.)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_risk_level_check;
ALTER TABLE reports ADD CONSTRAINT reports_risk_level_check
  CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical'));

ALTER TABLE drone_image_reports DROP CONSTRAINT IF EXISTS drone_image_reports_risk_level_check;
ALTER TABLE drone_image_reports ADD CONSTRAINT drone_image_reports_risk_level_check
  CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical'));

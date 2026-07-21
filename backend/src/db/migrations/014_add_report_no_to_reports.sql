-- Migration 014: human-friendly sequential display number for reports.
-- The UUID id stays the primary key / foreign key; report_no is display-only.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_no INTEGER;

-- Backfill existing rows in creation order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM reports
)
UPDATE reports r SET report_no = o.rn FROM ordered o WHERE r.id = o.id;

-- Sequence owned by the column, continuing after the current max
CREATE SEQUENCE IF NOT EXISTS reports_report_no_seq OWNED BY reports.report_no;
SELECT setval('reports_report_no_seq', COALESCE((SELECT MAX(report_no) FROM reports), 0) + 1, false);

ALTER TABLE reports ALTER COLUMN report_no SET DEFAULT nextval('reports_report_no_seq');
ALTER TABLE reports ALTER COLUMN report_no SET NOT NULL;

-- UNIQUE auto-creates the supporting index; no separate CREATE INDEX needed
ALTER TABLE reports ADD CONSTRAINT reports_report_no_unique UNIQUE (report_no);

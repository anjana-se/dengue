import { query } from '../client';
import { Report } from '../../types/domain.types';

/**
 * db/queries/reports.queries.ts — Typed SQL functions for the reports table.
 * No business logic — only SQL access. Services import from here.
 */

export interface CreateReportInput {
  source_type: string;
  reporter_id?: string | null;
  zone_id?: string | null;
  drone_mission_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  image_url: string;
  image_key?: string | null;
  notes?: string | null;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  // If coordinates are provided, also build the PostGIS Point geometry
  const result = await query<Report>(
    `INSERT INTO reports (
       source_type, reporter_id, zone_id, drone_mission_id,
       latitude, longitude, geom, location_name,
       image_url, image_key, status, notes
     )
     VALUES (
       $1, $2, $3, $4,
       $5::double precision, $6::double precision,
       CASE WHEN $5 IS NOT NULL AND $6 IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint($6::double precision, $5::double precision), 4326)
            ELSE NULL END,
       $7, $8, $9, 'pending', $10
     )
     RETURNING *`,
    [
      input.source_type,
      input.reporter_id ?? null,
      input.zone_id ?? null,
      input.drone_mission_id ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.location_name ?? null,
      input.image_url,
      input.image_key ?? null,
      input.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function findReportById(id: string): Promise<Report | null> {
  const result = await query<Report>(
    `SELECT r.*,
            z.name AS zone_name,
            z.district AS zone_district,
            ST_AsGeoJSON(r.geom)::json AS geom_json
     FROM reports r
     LEFT JOIN zones z ON r.zone_id = z.id
     WHERE r.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface ListReportsFilter {
  zone_id?: string;
  status?: string;
  risk_level?: string;
  source_type?: string;
  reporter_id?: string;
  limit: number;
  offset: number;
}

export async function listReports(
  filter: ListReportsFilter,
): Promise<{ rows: Report[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.zone_id) {
    conditions.push(`r.zone_id = $${idx++}`);
    params.push(filter.zone_id);
  }
  if (filter.status) {
    conditions.push(`r.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.risk_level) {
    conditions.push(`r.risk_level = $${idx++}`);
    params.push(filter.risk_level);
  }
  if (filter.source_type) {
    conditions.push(`r.source_type = $${idx++}`);
    params.push(filter.source_type);
  }
  if (filter.reporter_id) {
    conditions.push(`r.reporter_id = $${idx++}`);
    params.push(filter.reporter_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports r ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<Report>(
    `SELECT r.*,
            z.name AS zone_name,
            z.district AS zone_district
     FROM reports r
     LEFT JOIN zones z ON r.zone_id = z.id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, filter.limit, filter.offset],
  );

  return { rows: dataResult.rows, total };
}

export interface UpdateReportAnalysisInput {
  report_id: string;
  status: string;
  site_type?: string | null;
  risk_level?: string | null;
  confidence_score?: number | null;
  ai_analysis?: Record<string, unknown> | null;
  guidance_text?: string | null;
  guidance_text_si?: string | null;
  guidance_text_ta?: string | null;
  breeding_indicators?: string[] | null;
  remediation_action?: string | null;
}

export async function updateReportAnalysis(input: UpdateReportAnalysisInput): Promise<Report> {
  const result = await query<Report>(
    `UPDATE reports SET
       status = $1,
       site_type = $2,
       risk_level = $3,
       confidence_score = $4,
       ai_analysis = $5,
       guidance_text = $6,
       guidance_text_si = $7,
       guidance_text_ta = $8,
       breeding_indicators = $9,
       remediation_action = $10,
       updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [
      input.status,
      input.site_type ?? null,
      input.risk_level ?? null,
      input.confidence_score ?? null,
      input.ai_analysis ? JSON.stringify(input.ai_analysis) : null,
      input.guidance_text ?? null,
      input.guidance_text_si ?? null,
      input.guidance_text_ta ?? null,
      input.breeding_indicators ?? null,
      input.remediation_action ?? null,
      input.report_id,
    ],
  );
  return result.rows[0];
}

export async function updateReportStatus(
  reportId: string,
  status: string,
): Promise<void> {
  await query(
    `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, reportId],
  );
}

export async function reviewReport(
  reportId: string,
  reviewedBy: string,
  notes?: string,
): Promise<Report> {
  const result = await query<Report>(
    `UPDATE reports SET
       status = 'complete',
       reviewed_by = $1,
       reviewed_at = NOW(),
       notes = COALESCE($2, notes),
       updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [reviewedBy, notes ?? null, reportId],
  );
  return result.rows[0];
}

export async function getReportCountByZone(
  zoneId: string,
  status?: string,
): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports
     WHERE zone_id = $1 ${status ? 'AND status = $2' : ''}`,
    status ? [zoneId, status] : [zoneId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function updateReportIncident(
  reportId: string,
  incidentId: string | null,
): Promise<Report> {
  const result = await query<Report>(
    `UPDATE reports SET
       incident_id = $1,
       updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [incidentId, reportId],
  );
  return result.rows[0];
}


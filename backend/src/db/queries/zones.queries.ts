import { query } from '../client';
import { Zone } from '../../types/domain.types';

/**
 * db/queries/zones.queries.ts — Typed SQL functions for the zones table.
 * Also includes the spatial query to find a zone by lat/lng coordinates.
 */

export async function findZoneById(id: string): Promise<Zone | null> {
  const result = await query<Zone>(
    `SELECT id, name, district, province, risk_score, risk_level,
            active_report_count, ST_AsGeoJSON(geom) AS geom_json,
            ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lng,
            created_at, updated_at
     FROM zones WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listZones(filters?: {
  risk_level?: string;
  district?: string;
  active_only?: boolean;
}): Promise<Zone[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (filters?.risk_level) {
    conditions.push(`risk_level = $${paramIdx++}`);
    params.push(filters.risk_level);
  }
  if (filters?.district) {
    conditions.push(`LOWER(district) LIKE $${paramIdx++}`);
    params.push(`%${filters.district.toLowerCase()}%`);
  }
  if (filters?.active_only) {
    conditions.push(`(risk_score > 0 OR active_report_count > 0)`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<Zone>(
    `SELECT id, name, district, province, risk_score, risk_level,
            active_report_count, ST_AsGeoJSON(geom) AS geom_json,
            ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lng,
            created_at, updated_at
     FROM zones
     ${whereClause}
     ORDER BY risk_score DESC, active_report_count DESC`,
    params,
  );
  return result.rows;
}

/**
 * Finds the zone that contains the given lat/lng point using PostGIS ST_Within.
 * Returns null if no zone covers the coordinates (e.g. point is outside all zones).
 */
export async function findZoneByCoordinates(
  latitude: number,
  longitude: number,
): Promise<Zone | null> {
  const result = await query<Zone>(
    `SELECT id, name, district, province, risk_score, risk_level,
            active_report_count, ST_AsGeoJSON(geom) AS geom_json,
            ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lng,
            created_at, updated_at
     FROM zones
     WHERE ST_Within(
       ST_SetSRID(ST_MakePoint($1, $2), 4326),
       geom
     )
     LIMIT 1`,
    [longitude, latitude], // PostGIS MakePoint takes (lng, lat)
  );
  return result.rows[0] ?? null;
}

export interface UpdateZoneRiskInput {
  zone_id: string;
  risk_score: number;
  risk_level: string;
  active_report_count: number;
}

export async function updateZoneRisk(input: UpdateZoneRiskInput): Promise<Zone> {
  const result = await query<Zone>(
    `UPDATE zones SET
       risk_score = $1,
       risk_level = $2,
       active_report_count = $3,
       updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, district, province, risk_score, risk_level,
               active_report_count, created_at, updated_at`,
    [input.risk_score, input.risk_level, input.active_report_count, input.zone_id],
  );
  return result.rows[0];
}

export async function getZoneReportStats(zoneId: string): Promise<{
  total: number;
  pending: number;
  high: number;
  critical: number;
}> {
  const result = await query<{
    total: string;
    pending: string;
    high: string;
    critical: string;
  }>(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) AS pending,
       COUNT(*) FILTER (WHERE risk_level = 'high') AS high,
       COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical
     FROM reports
     WHERE zone_id = $1 AND status NOT IN ('failed')`,
    [zoneId],
  );
  const row = result.rows[0];
  return {
    total: parseInt(row?.total ?? '0', 10),
    pending: parseInt(row?.pending ?? '0', 10),
    high: parseInt(row?.high ?? '0', 10),
    critical: parseInt(row?.critical ?? '0', 10),
  };
}

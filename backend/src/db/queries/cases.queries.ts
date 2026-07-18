import { query } from '../client';

export interface CreateCaseInput {
  case_id: string;
  zone_id?: string;
  latitude: number;
  longitude: number;
  district: string;
  zone_name: string;
  reported_date: string;
  age_group: string;
  severity: 'mild' | 'moderate' | 'severe';
  hospital: string;
  status: 'active' | 'recovered';
}

export async function createCase(input: CreateCaseInput) {
  const {
    case_id, zone_id, latitude, longitude, district, zone_name,
    reported_date, age_group, severity, hospital, status
  } = input;

  const result = await query(
    `INSERT INTO cases (
       case_id, zone_id, location, latitude, longitude, district, zone_name,
       reported_date, age_group, severity, hospital, status
     ) VALUES (
       $1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6,
       $7, $8, $9, $10, $11
     ) RETURNING *`,
    [case_id, zone_id || null, latitude, longitude, district, zone_name,
     reported_date, age_group, severity, hospital, status]
  );
  return result.rows[0];
}

export async function listCases(filters: {
  zone_id?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) {
  const { zone_id, severity, page = 1, limit = 100 } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (zone_id) {
    conditions.push(`zone_id = $${paramIdx++}`);
    params.push(zone_id);
  }
  if (severity) {
    conditions.push(`severity = $${paramIdx++}`);
    params.push(severity);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM cases ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT *,
            ST_X(location) AS lng,
            ST_Y(location) AS lat
     FROM cases
     ${whereClause}
     ORDER BY reported_date DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { data: dataResult.rows, total, page, limit };
}

export async function getCaseHeatmap() {
  const result = await query(
    `SELECT id, latitude AS lat, longitude AS lng, severity, status
     FROM cases
     WHERE status = 'active'`
  );
  return result.rows;
}

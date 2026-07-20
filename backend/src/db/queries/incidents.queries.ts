import { query } from '../client';

export interface CreateIncidentInput {
  code: string;
  status: 'open' | 'verified' | 'resolved' | 'closed';
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  zone_id?: string;
  zone_name?: string;
  primary_report_id?: string;
  site_type: string;
}

export interface CreateDecisionInput {
  new_report_id: string;
  matched_incident_id?: string;
  confidence: number;
  decision: 'auto_attached' | 'flagged_review' | 'new_incident';
  status: 'pending' | 'approved' | 'overridden';
  ai_reasoning?: string;
  gps_distance_m?: number;
  time_diff_h?: number;
  new_lat: number;
  new_lng: number;
}

export async function createIncident(input: CreateIncidentInput) {
  const {
    code, status, risk_level, latitude, longitude, zone_id, zone_name,
    primary_report_id, site_type
  } = input;

  const result = await query(
    `INSERT INTO incidents (
       code, status, risk_level, location, latitude, longitude, zone_id, zone_name,
       primary_report_id, site_type
     ) VALUES (
       $1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, $6, $7,
       $8, $9
     ) RETURNING *`,
    [code, status, risk_level, latitude, longitude, zone_id || null, zone_name || null,
     primary_report_id || null, site_type]
  );
  return result.rows[0];
}

export async function getIncidentById(id: string) {
  const result = await query(
    `SELECT *,
            ST_X(location) AS lng,
            ST_Y(location) AS lat
     FROM incidents
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function listIncidents(filters: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM incidents ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query(
    `SELECT *,
            ST_X(location) AS lng,
            ST_Y(location) AS lat
     FROM incidents
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { data: dataResult.rows, total, page, limit };
}

// Find nearby open incident within time window (7 days) and maxDistanceMeters (usually 30-50m)
export async function findNearbyIncident(latitude: number, longitude: number, maxDistanceMeters: number = 50) {
  const result = await query(
    `SELECT *,
            ST_X(location) AS lng,
            ST_Y(location) AS lat,
            ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance
     FROM incidents
     WHERE status = 'open'
       AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
       AND created_at >= NOW() - INTERVAL '7 days'
     ORDER BY distance ASC
     LIMIT 1`,
    [latitude, longitude, maxDistanceMeters]
  );
  return result.rows[0] || null;
}

export async function createDecision(input: CreateDecisionInput) {
  const {
    new_report_id, matched_incident_id, confidence, decision, status,
    ai_reasoning, gps_distance_m, time_diff_h, new_lat, new_lng
  } = input;

  const result = await query(
    `INSERT INTO duplicate_decisions (
       new_report_id, matched_incident_id, confidence, decision, status,
       ai_reasoning, gps_distance_m, time_diff_h, new_lat, new_lng
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
     ) RETURNING *`,
    [new_report_id, matched_incident_id || null, confidence, decision, status,
     ai_reasoning || null, gps_distance_m || 0.0, time_diff_h || 0.0, new_lat, new_lng]
  );
  return result.rows[0];
}

export async function getDuplicateDecisions(incidentId: string) {
  const result = await query(
    `SELECT * FROM duplicate_decisions
     WHERE matched_incident_id = $1
     ORDER BY created_at DESC`,
    [incidentId]
  );
  return result.rows;
}

export async function getDecisionById(id: string) {
  const result = await query(
    `SELECT * FROM duplicate_decisions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateDecision(
  id: string,
  update: {
    status: string;
    reviewed_by?: string;
    override_reason?: string;
  }
) {
  const { status, reviewed_by, override_reason } = update;
  const result = await query(
    `UPDATE duplicate_decisions SET
       status = $2,
       reviewed_by = $3,
       override_reason = $4,
       reviewed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, reviewed_by || null, override_reason || null]
  );
  return result.rows[0] || null;
}

export async function updateIncidentStats(incidentId: string) {
  // Calculate report count, and count verified/analysed reports for confirmation count
  const statsResult = await query<{ total_reports: string; confirmed_reports: string }>(
    `SELECT COUNT(*) AS total_reports,
            COUNT(*) FILTER (WHERE status IN ('analysed', 'complete', 'verified')) AS confirmed_reports
     FROM reports
     WHERE incident_id = $1`,
    [incidentId]
  );
  
  const { total_reports, confirmed_reports } = statsResult.rows[0];
  
  const result = await query(
    `UPDATE incidents SET
       report_count = $2,
       confirmation_count = $3,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [incidentId, parseInt(total_reports, 10), parseInt(confirmed_reports, 10)]
  );
  return result.rows[0];
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  const result = await query(
    `UPDATE incidents SET
       status = $2,
       updated_at = NOW(),
       verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE verified_at END,
       resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END
     WHERE id = $1
     RETURNING *`,
    [incidentId, status]
  );
  return result.rows[0];
}

export async function listDecisions(filters: { status?: string }) {
  const { status } = filters;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT * FROM duplicate_decisions ${whereClause} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}


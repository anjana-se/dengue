import { query } from '../client';

/**
 * db/queries/droneMissions.queries.ts — Typed SQL for drone_missions table.
 * Includes LEFT JOIN aggregation with reports table for frame stats & risk summary.
 */

export interface MissionRiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DroneMissionRow {
  id: string;
  operator_id: string;
  zone_id: string | null;
  name: string;
  status: string;
  planned_area: string | null;
  notes: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  total_images?: number;
  processed_images?: number;
  summary?: MissionRiskSummary;
}

export async function createMission(input: {
  operator_id: string;
  zone_id?: string | null;
  name: string;
  planned_area?: string | null;
  notes?: string | null;
}): Promise<DroneMissionRow> {
  const result = await query<DroneMissionRow>(
    `INSERT INTO drone_missions (operator_id, zone_id, name, status, planned_area, notes)
     VALUES ($1, $2, $3, 'in_progress', $4, $5)
     RETURNING *,
       0 AS total_images,
       0 AS processed_images,
       '{"critical":0,"high":0,"medium":0,"low":0}'::json AS summary`,
    [input.operator_id, input.zone_id ?? null, input.name, input.planned_area ?? null, input.notes ?? null],
  );
  return result.rows[0];
}

export async function findMissionById(id: string): Promise<DroneMissionRow | null> {
  const result = await query<DroneMissionRow>(
    `SELECT 
       dm.*,
       COALESCE(r_stats.total_images, 0)::int AS total_images,
       COALESCE(r_stats.processed_images, 0)::int AS processed_images,
       JSON_BUILD_OBJECT(
         'critical', COALESCE(r_stats.critical_count, 0)::int,
         'high', COALESCE(r_stats.high_count, 0)::int,
         'medium', COALESCE(r_stats.medium_count, 0)::int,
         'low', COALESCE(r_stats.low_count, 0)::int
       ) AS summary
     FROM drone_missions dm
     LEFT JOIN (
       SELECT 
         drone_mission_id,
         COUNT(*)::int AS total_images,
         COUNT(*) FILTER (WHERE status NOT IN ('pending', 'processing'))::int AS processed_images,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'critical')::int AS critical_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'high')::int AS high_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'medium')::int AS medium_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'low')::int AS low_count
       FROM reports
       WHERE drone_mission_id IS NOT NULL
       GROUP BY drone_mission_id
     ) r_stats ON r_stats.drone_mission_id = dm.id
     WHERE dm.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listMissions(filter: {
  status?: string;
  zone_id?: string;
  operator_id?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: DroneMissionRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status)      { conditions.push(`dm.status = $${idx++}`);      params.push(filter.status); }
  if (filter.zone_id)     { conditions.push(`dm.zone_id = $${idx++}`);     params.push(filter.zone_id); }
  if (filter.operator_id) { conditions.push(`dm.operator_id = $${idx++}`); params.push(filter.operator_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM drone_missions dm ${where}`, params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<DroneMissionRow>(
    `SELECT 
       dm.*,
       COALESCE(r_stats.total_images, 0)::int AS total_images,
       COALESCE(r_stats.processed_images, 0)::int AS processed_images,
       JSON_BUILD_OBJECT(
         'critical', COALESCE(r_stats.critical_count, 0)::int,
         'high', COALESCE(r_stats.high_count, 0)::int,
         'medium', COALESCE(r_stats.medium_count, 0)::int,
         'low', COALESCE(r_stats.low_count, 0)::int
       ) AS summary
     FROM drone_missions dm
     LEFT JOIN (
       SELECT 
         drone_mission_id,
         COUNT(*)::int AS total_images,
         COUNT(*) FILTER (WHERE status NOT IN ('pending', 'processing'))::int AS processed_images,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'critical')::int AS critical_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'high')::int AS high_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'medium')::int AS medium_count,
         COUNT(*) FILTER (WHERE LOWER(risk_level) = 'low')::int AS low_count
       FROM reports
       WHERE drone_mission_id IS NOT NULL
       GROUP BY drone_mission_id
     ) r_stats ON r_stats.drone_mission_id = dm.id
     ${where}
     ORDER BY dm.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, filter.limit, filter.offset],
  );

  return { rows: dataResult.rows, total };
}

export async function updateMissionStatus(
  id: string,
  status: string,
  extra: { started_at?: Date; completed_at?: Date; notes?: string } = {},
): Promise<DroneMissionRow> {
  const sets = ['status = $1', 'updated_at = NOW()'];
  const params: unknown[] = [status];
  let idx = 2;

  if (extra.started_at)   { sets.push(`started_at = $${idx++}`);   params.push(extra.started_at); }
  if (extra.completed_at) { sets.push(`completed_at = $${idx++}`); params.push(extra.completed_at); }
  if (extra.notes)        { sets.push(`notes = $${idx++}`);        params.push(extra.notes); }

  params.push(id);
  const result = await query<DroneMissionRow>(
    `UPDATE drone_missions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );

  // Return with latest aggregated stats
  const updated = await findMissionById(id);
  return updated || result.rows[0];
}

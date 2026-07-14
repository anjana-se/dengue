import { query } from '../client';

/**
 * db/queries/droneMissions.queries.ts — Typed SQL for drone_missions table.
 */

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
     VALUES ($1, $2, $3, 'planned', $4, $5)
     RETURNING *`,
    [input.operator_id, input.zone_id ?? null, input.name, input.planned_area ?? null, input.notes ?? null],
  );
  return result.rows[0];
}

export async function findMissionById(id: string): Promise<DroneMissionRow | null> {
  const result = await query<DroneMissionRow>(
    `SELECT * FROM drone_missions WHERE id = $1`,
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

  if (filter.status)      { conditions.push(`status = $${idx++}`);      params.push(filter.status); }
  if (filter.zone_id)     { conditions.push(`zone_id = $${idx++}`);     params.push(filter.zone_id); }
  if (filter.operator_id) { conditions.push(`operator_id = $${idx++}`); params.push(filter.operator_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM drone_missions ${where}`, params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<DroneMissionRow>(
    `SELECT * FROM drone_missions ${where}
     ORDER BY created_at DESC
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
  return result.rows[0];
}

import { query } from '../client';

/**
 * db/queries/workorders.queries.ts — Typed SQL functions for work_orders table.
 * Full implementation is in Step 5. This stub provides the createWorkOrder()
 * function needed by the AI worker in Step 4.
 */

export interface CreateWorkOrderInput {
  report_id: string;
  priority_score: number;
  remediation_action?: string | null;
}

export interface WorkOrderRow {
  id: string;
  report_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  status: string;
  priority_score: number;
  remediation_action: string | null;
  follow_up_image_url: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrderRow> {
  const result = await query<WorkOrderRow>(
    `INSERT INTO work_orders (report_id, priority_score, remediation_action, status)
     VALUES ($1, $2, $3, 'open')
     RETURNING *`,
    [input.report_id, input.priority_score, input.remediation_action ?? null],
  );
  return result.rows[0];
}

export async function findWorkOrderById(id: string): Promise<WorkOrderRow | null> {
  const result = await query<WorkOrderRow>(
    `SELECT * FROM work_orders WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listWorkOrders(filter: {
  status?: string;
  assigned_to?: string;
  zone_id?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: WorkOrderRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`wo.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.assigned_to) {
    conditions.push(`wo.assigned_to = $${idx++}`);
    params.push(filter.assigned_to);
  }
  if (filter.zone_id) {
    conditions.push(`r.zone_id = $${idx++}`);
    params.push(filter.zone_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joinClause = filter.zone_id ? 'JOIN reports r ON wo.report_id = r.id' : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM work_orders wo ${joinClause} ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<WorkOrderRow>(
    `SELECT wo.* FROM work_orders wo ${joinClause} ${where}
     ORDER BY wo.priority_score DESC, wo.created_at ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, filter.limit, filter.offset],
  );

  return { rows: dataResult.rows, total };
}

export async function updateWorkOrderStatus(
  id: string,
  status: string,
  updates: Partial<{
    assigned_to: string;
    assigned_by: string;
    resolved_at: Date;
    resolution_notes: string;
    follow_up_image_url: string;
  }> = {},
): Promise<WorkOrderRow> {
  const setClauses = ['status = $1', 'updated_at = NOW()'];
  const params: unknown[] = [status];
  let idx = 2;

  if (updates.assigned_to !== undefined) { setClauses.push(`assigned_to = $${idx++}`); params.push(updates.assigned_to); }
  if (updates.assigned_by !== undefined) { setClauses.push(`assigned_by = $${idx++}`); params.push(updates.assigned_by); }
  if (updates.resolved_at !== undefined) { setClauses.push(`resolved_at = $${idx++}`); params.push(updates.resolved_at); }
  if (updates.resolution_notes !== undefined) { setClauses.push(`resolution_notes = $${idx++}`); params.push(updates.resolution_notes); }
  if (updates.follow_up_image_url !== undefined) { setClauses.push(`follow_up_image_url = $${idx++}`); params.push(updates.follow_up_image_url); }

  params.push(id);
  const result = await query<WorkOrderRow>(
    `UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );
  return result.rows[0];
}

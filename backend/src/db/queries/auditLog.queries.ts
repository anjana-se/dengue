import { query } from '../client';
import type { AuditLog } from '../../types/domain.types';

/**
 * db/queries/auditLog.queries.ts — Typed SQL functions for audit_log table.
 */

export interface CreateAuditLogInput {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export async function createAuditEntry(input: CreateAuditLogInput): Promise<void> {
  await query(
    `INSERT INTO audit_log
       (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.user_id ?? null,
      input.action,
      input.entity_type,
      input.entity_id ?? null,
      input.old_values ? JSON.stringify(input.old_values) : null,
      input.new_values ? JSON.stringify(input.new_values) : null,
      input.ip_address ?? null,
      input.user_agent ?? null,
    ],
  );
}

export async function listAuditLog(filter: {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: AuditLog[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(filter.entity_type); }
  if (filter.entity_id)   { conditions.push(`entity_id = $${idx++}`);   params.push(filter.entity_id); }
  if (filter.user_id)     { conditions.push(`user_id = $${idx++}`);      params.push(filter.user_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM audit_log ${where}`, params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<AuditLog>(
    `SELECT * FROM audit_log ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, filter.limit, filter.offset],
  );

  return { rows: dataResult.rows, total };
}

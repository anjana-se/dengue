import { Request, Response, NextFunction } from 'express';
import { query } from '../db/client';
import { logger } from '../shared/logger';

/**
 * middleware/audit.middleware.ts — Immutable audit log for mutating operations.
 * Satisfies the "7-year retention" security requirement from the tech doc.
 * Wraps POST / PATCH / DELETE routes to record who did what, when, and from where.
 *
 * Usage:
 *   router.post('/workorders/:id/resolve', authenticate, auditLog('workorder.resolve'), handler);
 */

export function auditLog(action: string, entityType?: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub ?? null;
      const entityId = (req.params.id ?? req.params.missionId ?? null) as string | null;
      const ipAddress = req.ip ?? req.socket?.remoteAddress ?? null;
      const userAgent = req.headers['user-agent'] ?? null;

      await query(
        `INSERT INTO audit_log
           (user_id, action, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          action,
          entityType ?? req.baseUrl.split('/').filter(Boolean)[0] ?? 'unknown',
          entityId,
          ipAddress,
          userAgent,
        ],
      );
    } catch (err) {
      // Audit failure must never block the primary request
      logger.error('Audit log write failed', { action, error: (err as Error).message });
    }

    next();
  };
}

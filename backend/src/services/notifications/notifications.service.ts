import { logger } from '../../shared/logger';

/**
 * services/notifications/notifications.service.ts — Stub (Step 6).
 *
 * Emit helpers used by the AI worker and other services.
 * Full Socket.IO implementation is in Step 6.
 * These stubs allow the consumer to compile and run without Socket.IO being wired.
 */

export interface ReportAnalysedPayload {
  report_id: string;
  zone_id: string | null;
  risk_level: string | null;
  status: string;
}

export interface WorkOrderCreatedPayload {
  workorder_id: string;
  report_id: string;
  zone_id: string | null;
  priority_score: number;
}

export interface ZoneUpdatedPayload {
  zone_id: string;
  risk_level: string;
  risk_score: number;
  active_report_count: number;
}

// These will be replaced with real Socket.IO emits in Step 6
export function emitReportAnalysed(payload: ReportAnalysedPayload): void {
  logger.debug('[Notification stub] report:analysed', payload);
}

export function emitWorkOrderCreated(payload: WorkOrderCreatedPayload): void {
  logger.debug('[Notification stub] workorder:created', payload);
}

export function emitZoneUpdated(payload: ZoneUpdatedPayload): void {
  logger.debug('[Notification stub] zone:updated', payload);
}

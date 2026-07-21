import { logger } from '../../shared/logger';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../config/constants';

/**
 * services/notifications/notifications.service.ts
 *
 * Real emit helpers — replaces the Step 4 stub.
 * Every other service calls into these functions rather than touching
 * socket.server.ts directly, keeping the event contract in one place.
 *
 * Uses a lazy getBroadcaster() import so the module compiles even if Socket.IO
 * hasn't been initialised yet. The broadcaster is the real io server in the API
 * process, or a Redis emitter in the worker process — either way, emits reach
 * connected clients through the shared Redis adapter.
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

export interface WorkOrderAssignedPayload {
  workorder_id: string;
  assigned_to: string;   // PHI user ID
  report_id: string;
}

export interface ZoneUpdatedPayload {
  zone_id: string;
  risk_level: string;
  risk_score: number;
  active_report_count: number;
}

function tryGetBroadcaster() {
  try {
    const { getBroadcaster } = require('./socket.server') as typeof import('./socket.server');
    return getBroadcaster();
  } catch {
    return null;
  }
}

export function emitReportAnalysed(payload: ReportAnalysedPayload): void {
  const io = tryGetBroadcaster();
  if (io) {
    // Broadcast to all NDCU admins and to the zone's PHI officers
    io.to(SOCKET_ROOMS.NDCU_ADMINS).emit(SOCKET_EVENTS.REPORT_ANALYSED, payload);
    if (payload.risk_level === 'high' || payload.risk_level === 'critical') {
      logger.info('[Socket] report:analysed emitted to ndcu_admins', { reportId: payload.report_id });
    }
  } else {
    logger.debug('[Socket stub] report:analysed', payload);
  }
}

export function emitWorkOrderCreated(payload: WorkOrderCreatedPayload): void {
  const io = tryGetBroadcaster();
  if (io) {
    io.to(SOCKET_ROOMS.NDCU_ADMINS).emit(SOCKET_EVENTS.WORKORDER_CREATED, payload);
    logger.info('[Socket] workorder:created emitted', { workorderId: payload.workorder_id });
  } else {
    logger.debug('[Socket stub] workorder:created', payload);
  }
}

export function emitWorkOrderAssigned(payload: WorkOrderAssignedPayload): void {
  const io = tryGetBroadcaster();
  if (io) {
    const phiRoom = SOCKET_ROOMS.phiRoom(payload.assigned_to);
    io.to(phiRoom).emit(SOCKET_EVENTS.WORKORDER_ASSIGNED, payload);
    io.to(SOCKET_ROOMS.NDCU_ADMINS).emit(SOCKET_EVENTS.WORKORDER_ASSIGNED, payload);
    logger.info('[Socket] workorder:assigned emitted', { workorderId: payload.workorder_id });
  } else {
    logger.debug('[Socket stub] workorder:assigned', payload);
  }
}

export function emitZoneUpdated(payload: ZoneUpdatedPayload): void {
  const io = tryGetBroadcaster();
  if (io) {
    // Broadcast zone updates to all privileged users
    io.to(SOCKET_ROOMS.NDCU_ADMINS).emit(SOCKET_EVENTS.ZONE_UPDATED, payload);
    logger.debug('[Socket] zone:updated emitted', { zoneId: payload.zone_id });
  } else {
    logger.debug('[Socket stub] zone:updated', payload);
  }
}

export function emitIncidentUpdated(payload: { incident_id: string }): void {
  const io = tryGetBroadcaster();
  if (io) {
    io.emit('incident:updated', payload);
    logger.debug('[Socket] incident:updated emitted', payload);
  } else {
    logger.debug('[Socket stub] incident:updated', payload);
  }
}


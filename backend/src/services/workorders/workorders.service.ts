import {
  createWorkOrder,
  findWorkOrderById,
  listWorkOrders,
  updateWorkOrderStatus,
} from '../../db/queries/workorders.queries';
import { findReportById, updateReportAnalysis } from '../../db/queries/reports.queries';
import { findZoneById } from '../../db/queries/zones.queries';
import { recomputeZoneRisk } from '../zones/zones.service';
import {
  emitWorkOrderCreated,
  emitZoneUpdated,
} from '../notifications/notifications.service';
import { computePriorityScore } from './priority.util';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import { config } from '../../config/env';
import { getStorage } from '../../storage';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../shared/httpErrors';
import { logger } from '../../shared/logger';
import type {
  ListWorkordersQuery,
  CreateWorkorderInput,
  AcceptWorkorderInput,
  ResolveWorkorderInput,
  AssignWorkorderInput,
} from './workorders.schemas';
import type { RiskLevel } from '../../types/domain.types';
import type { WorkOrderRow } from '../../db/queries/workorders.queries';

export async function resolveWorkOrderImageUrl(wo: WorkOrderRow): Promise<WorkOrderRow> {
  if (config.STORAGE_DRIVER === 's3' && wo.follow_up_image_key) {
    const storage = getStorage();
    try {
      const freshUrl = await storage.getUrl(wo.follow_up_image_key);
      return { ...wo, follow_up_image_url: freshUrl };
    } catch (err: any) {
      logger.warn('Failed to generate fresh signed URL for work order', { workOrderId: wo.id, error: err.message });
    }
  }
  return wo;
}

export async function resolveWorkOrdersImageUrls(wos: WorkOrderRow[]): Promise<WorkOrderRow[]> {
  if (config.STORAGE_DRIVER === 's3') {
    return Promise.all(wos.map(resolveWorkOrderImageUrl));
  }
  return wos;
}

/**
 * services/workorders/workorders.service.ts
 *
 * Manages the full work-order lifecycle:
 *   create → accept → resolve  (or cancel)
 *
 * Resolution triggers three downstream effects per the spec's sequence diagram:
 *   1. Write outcome as feedback label (risk level override on the report)
 *   2. Recompute zone risk score
 *   3. Push realtime notification
 */

// ─── List ──────────────────────────────────────────────────────────────────────

export async function listWorkordersService(
  queryParams: ListWorkordersQuery,
  requestingUserRole: string,
  requestingUserId: string,
) {
  const { page, limit, offset } = parsePaginationParams(queryParams.page, queryParams.limit);

  // PHI officers can only see work orders assigned to them (or unassigned in their zone)
  const assignedTo =
    requestingUserRole === 'phi' ? requestingUserId : queryParams.assigned_to;

  const { rows, total } = await listWorkOrders({
    status: queryParams.status,
    zone_id: queryParams.zone_id,
    assigned_to: requestingUserRole === 'phi' ? assignedTo : queryParams.assigned_to,
    limit,
    offset,
  });

  const resolvedRows = await resolveWorkOrdersImageUrls(rows);
  return buildPaginatedResult(resolvedRows, total, { page, limit, offset });
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getWorkorderByIdService(
  id: string,
  requestingUserId: string,
  requestingUserRole: string,
) {
  const wo = await findWorkOrderById(id);
  if (!wo) throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');

  // PHI can only view their own assigned work orders
  if (requestingUserRole === 'phi' && wo.assigned_to !== requestingUserId) {
    throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');
  }

  return resolveWorkOrderImageUrl(wo);
}

// ─── Create (manual — NDCU admin) ────────────────────────────────────────────

export async function createWorkorderService(
  input: CreateWorkorderInput,
  requestingUserRole: string,
) {
  if (requestingUserRole !== 'ndcu_admin') {
    throw new ForbiddenError('Only NDCU admins can manually create work orders', 'FORBIDDEN');
  }

  const report = await findReportById(input.report_id);
  if (!report) {
    throw new NotFoundError(`Report ${input.report_id} not found`, 'REPORT_NOT_FOUND');
  }

  // Compute priority score if not explicitly provided
  let priorityScore = input.priority_score ?? 50;
  if (report.risk_level && report.created_at) {
    const hoursOld = (Date.now() - new Date(report.created_at).getTime()) / 3_600_000;
    // Fetch active work order count in the zone for burden calculation
    let activeZoneWorkorders = 0;
    if (report.zone_id) {
      const { total } = await listWorkOrders({
        zone_id: report.zone_id,
        status: 'open',
        limit: 1,
        offset: 0,
      });
      activeZoneWorkorders = total;
    }
    priorityScore = computePriorityScore({
      riskLevel: report.risk_level as RiskLevel,
      hoursOld,
      activeZoneWorkorders,
    });
  }

  const workOrder = await createWorkOrder({
    report_id: input.report_id,
    priority_score: priorityScore,
    remediation_action: input.remediation_action ??
      ((report.ai_analysis as Record<string, unknown>)?.remediation_action as string | undefined) ??
      null,
  });

  // Assign immediately if specified
  if (input.assigned_to) {
    await updateWorkOrderStatus(workOrder.id, 'open', {
      assigned_to: input.assigned_to,
    });
  }

  logger.info('Work order created manually', { workOrderId: workOrder.id, reportId: input.report_id });

  if (report.zone_id) {
    emitWorkOrderCreated({
      workorder_id: workOrder.id,
      report_id: input.report_id,
      zone_id: report.zone_id,
      priority_score: priorityScore,
    });
  }

  return resolveWorkOrderImageUrl(workOrder);
}

// ─── Accept (PHI) ─────────────────────────────────────────────────────────────

export async function acceptWorkorderService(
  id: string,
  _input: AcceptWorkorderInput,
  acceptingUserId: string,
  acceptingUserRole: string,
) {
  if (!['phi', 'ndcu_admin'].includes(acceptingUserRole)) {
    throw new ForbiddenError('Only PHI officers and NDCU admins can accept work orders', 'FORBIDDEN');
  }

  const wo = await findWorkOrderById(id);
  if (!wo) throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');

  if (wo.status !== 'open') {
    throw new BadRequestError(
      `Work order is '${wo.status}'; only 'open' work orders can be accepted`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await updateWorkOrderStatus(id, 'accepted', {
    assigned_to: acceptingUserId,
    assigned_by: acceptingUserId,
  });

  logger.info('Work order accepted', { workOrderId: id, assignedTo: acceptingUserId });
  return resolveWorkOrderImageUrl(updated);
}

// ─── Assign (NDCU admin) ──────────────────────────────────────────────────────

export async function assignWorkorderService(
  id: string,
  input: AssignWorkorderInput,
  requestingUserRole: string,
  requestingUserId: string,
) {
  if (requestingUserRole !== 'ndcu_admin') {
    throw new ForbiddenError('Only NDCU admins can assign work orders', 'FORBIDDEN');
  }

  const wo = await findWorkOrderById(id);
  if (!wo) throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');

  if (!['open', 'accepted'].includes(wo.status)) {
    throw new BadRequestError(
      `Work order is '${wo.status}'; cannot assign a ${wo.status} work order`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await updateWorkOrderStatus(id, wo.status, {
    assigned_to: input.assigned_to,
    assigned_by: requestingUserId,
  });

  logger.info('Work order assigned', { workOrderId: id, assignedTo: input.assigned_to });
  return resolveWorkOrderImageUrl(updated);
}

// ─── Resolve (PHI) ───────────────────────────────────────────────────────────

export async function resolveWorkorderService(
  id: string,
  input: ResolveWorkorderInput,
  resolvingUserId: string,
  resolvingUserRole: string,
  followUpImageUrl?: string,
  followUpImageKey?: string,
) {
  if (!['phi', 'ndcu_admin'].includes(resolvingUserRole)) {
    throw new ForbiddenError('Only PHI officers and NDCU admins can resolve work orders', 'FORBIDDEN');
  }

  const wo = await findWorkOrderById(id);
  if (!wo) throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');

  if (!['open', 'accepted'].includes(wo.status)) {
    throw new BadRequestError(
      `Work order is '${wo.status}'; only open or accepted work orders can be resolved`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  // PHI can only resolve work orders assigned to them
  if (resolvingUserRole === 'phi' && wo.assigned_to !== resolvingUserId) {
    throw new ForbiddenError('You can only resolve work orders assigned to you', 'FORBIDDEN');
  }

  // ── 1. Mark work order as resolved ───────────────────────────────────────
  const resolved = await updateWorkOrderStatus(id, 'resolved', {
    resolved_at: new Date(),
    resolution_notes: input.resolution_notes,
    ...(followUpImageUrl ? { follow_up_image_url: followUpImageUrl } : {}),
    ...(followUpImageKey ? { follow_up_image_key: followUpImageKey } : {}),
  });

  logger.info('Work order resolved', { workOrderId: id, resolvedBy: resolvingUserId });

  // ── 2. Write feedback label back to the report ───────────────────────────
  // If PHI overrode the AI risk level after field inspection, update the report
  const report = await findReportById(wo.report_id);
  if (report && input.verified_risk_level) {
    await updateReportAnalysis({
      report_id: wo.report_id,
      status: report.status,
      risk_level: input.verified_risk_level,
      // Preserve all existing AI analysis fields
      site_type: report.site_type ?? undefined,
      confidence_score: report.confidence_score ?? undefined,
      ai_analysis: {
        ...((report.ai_analysis as Record<string, unknown>) ?? {}),
        human_verified_risk_level: input.verified_risk_level,
        verified_by: resolvingUserId,
        verified_at: new Date().toISOString(),
      },
      guidance_text: report.guidance_text ?? undefined,
    });
    logger.info('Report risk level updated by PHI', {
      reportId: wo.report_id,
      verifiedRiskLevel: input.verified_risk_level,
    });
  }

  // ── 3. Recompute zone risk ────────────────────────────────────────────────
  if (report?.zone_id) {
    await recomputeZoneRisk(report.zone_id);

    const zone = await findZoneById(report.zone_id);
    if (zone) {
      emitZoneUpdated({
        zone_id: zone.id,
        risk_level: zone.risk_level,
        risk_score: zone.risk_score,
        active_report_count: zone.active_report_count,
      });
    }
  }

  return resolveWorkOrderImageUrl(resolved);
}

// ─── Cancel (NDCU admin) ──────────────────────────────────────────────────────

export async function cancelWorkorderService(
  id: string,
  requestingUserRole: string,
) {
  if (requestingUserRole !== 'ndcu_admin') {
    throw new ForbiddenError('Only NDCU admins can cancel work orders', 'FORBIDDEN');
  }

  const wo = await findWorkOrderById(id);
  if (!wo) throw new NotFoundError(`Work order ${id} not found`, 'WORKORDER_NOT_FOUND');

  if (wo.status === 'resolved' || wo.status === 'cancelled') {
    throw new BadRequestError(
      `Work order is already '${wo.status}'`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const cancelled = await updateWorkOrderStatus(id, 'cancelled');
  logger.info('Work order cancelled', { workOrderId: id });
  return resolveWorkOrderImageUrl(cancelled);
}

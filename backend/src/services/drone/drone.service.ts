import path from 'path';
import {
  createMission,
  findMissionById,
  listMissions,
  updateMissionStatus,
} from '../../db/queries/droneMissions.queries';
import { getStorage } from '../../storage';
import { resizeImage, cleanupProcessedFile } from '../../imageProcessing/resize.util';
import { extractGps, isWithinSriLanka } from '../reports/exif.util';
import { findZoneByCoordinates } from '../../db/queries/zones.queries';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/httpErrors';
import { logger } from '../../shared/logger';
import type {
  CreateMissionInput,
  UpdateMissionStatusInput,
  ListMissionsQuery,
} from './drone.schemas';

/**
 * services/drone/drone.service.ts
 *
 * Drone mission lifecycle + per-frame image analysis.
 * Frame image upload: GPS preserved (keepGps: true), then AI-analysed
 * exactly like community reports (reuses the ai/queue/producer).
 */

// ─── Create mission ───────────────────────────────────────────────────────────

export async function createMissionService(
  input: CreateMissionInput,
  operatorUserId: string,
  operatorRole: string,
) {
  if (!['drone_operator', 'ndcu_admin'].includes(operatorRole)) {
    throw new ForbiddenError('Only drone operators and NDCU admins can create missions', 'FORBIDDEN');
  }

  const mission = await createMission({
    operator_id: operatorUserId,
    zone_id: input.zone_id ?? null,
    name: input.name,
    planned_area: input.planned_area ?? null,
    notes: input.notes ?? null,
  });

  logger.info('Drone mission created', { missionId: mission.id, operatorId: operatorUserId });
  return mission;
}

// ─── List missions ────────────────────────────────────────────────────────────

export async function listMissionsService(
  queryParams: ListMissionsQuery,
  requestingUserRole: string,
  requestingUserId: string,
) {
  const { page, limit, offset } = parsePaginationParams(queryParams.page, queryParams.limit);

  // Drone operators see only their own missions
  const operatorId =
    requestingUserRole === 'drone_operator'
      ? requestingUserId
      : queryParams.operator_id;

  const { rows, total } = await listMissions({
    status: queryParams.status,
    zone_id: queryParams.zone_id,
    operator_id: operatorId,
    limit,
    offset,
  });

  return buildPaginatedResult(rows, total, { page, limit, offset });
}

// ─── Get mission ──────────────────────────────────────────────────────────────

export async function getMissionByIdService(
  missionId: string,
  requestingUserId: string,
  requestingUserRole: string,
) {
  const mission = await findMissionById(missionId);
  if (!mission) throw new NotFoundError(`Mission ${missionId} not found`, 'MISSION_NOT_FOUND');

  // Drone operators can only view their own missions
  if (requestingUserRole === 'drone_operator' && mission.operator_id !== requestingUserId) {
    throw new NotFoundError(`Mission ${missionId} not found`, 'MISSION_NOT_FOUND');
  }

  return mission;
}

// ─── Update mission status ────────────────────────────────────────────────────

export async function updateMissionStatusService(
  missionId: string,
  input: UpdateMissionStatusInput,
  requestingUserId: string,
  requestingUserRole: string,
) {
  const mission = await findMissionById(missionId);
  if (!mission) throw new NotFoundError(`Mission ${missionId} not found`, 'MISSION_NOT_FOUND');

  if (requestingUserRole === 'drone_operator' && mission.operator_id !== requestingUserId) {
    throw new ForbiddenError('You can only update your own missions', 'FORBIDDEN');
  }

  const extra: Parameters<typeof updateMissionStatus>[2] = {};
  if (input.status === 'in_progress' && !mission.started_at) {
    extra.started_at = new Date();
  }
  if (input.status === 'complete' || input.status === 'aborted') {
    extra.completed_at = new Date();
  }
  if (input.notes) extra.notes = input.notes;

  const updated = await updateMissionStatus(missionId, input.status, extra);
  logger.info('Drone mission status updated', { missionId, status: input.status });
  return updated;
}

// ─── Upload drone frame image ─────────────────────────────────────────────────

export async function uploadDroneFrameService(
  missionId: string,
  filePath: string,
  mimeType: string,
  requestingUserId: string,
  requestingUserRole: string,
) {
  const mission = await findMissionById(missionId);
  if (!mission) throw new NotFoundError(`Mission ${missionId} not found`, 'MISSION_NOT_FOUND');

  if (requestingUserRole === 'drone_operator' && mission.operator_id !== requestingUserId) {
    throw new ForbiddenError('You can only upload frames to your own missions', 'FORBIDDEN');
  }

  if (mission.status !== 'in_progress') {
    throw new BadRequestError(
      `Mission status is '${mission.status}'; frames can only be uploaded to in_progress missions`,
      'MISSION_NOT_IN_PROGRESS',
    );
  }

  // ── Extract GPS from EXIF (drone images have GPS baked in) ───────────────
  let latitude: number | null = null;
  let longitude: number | null = null;
  const gps = await extractGps(filePath);
  if (gps && isWithinSriLanka(gps.latitude, gps.longitude)) {
    latitude = gps.latitude;
    longitude = gps.longitude;
  }

  // ── Auto-assign zone ──────────────────────────────────────────────────────
  let zoneId = mission.zone_id;
  if (!zoneId && latitude && longitude) {
    const zone = await findZoneByCoordinates(latitude, longitude);
    if (zone) zoneId = zone.id;
  }

  // ── Resize — keep GPS EXIF for drone frames ────────────────────────────────
  const resized = await resizeImage(filePath, { keepGps: true });

  // ── Upload to storage ─────────────────────────────────────────────────────
  const storage = getStorage();
  const ext = path.extname(resized.outputPath);
  const destKey = `drone/${missionId}/frames/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const uploadResult = await storage.upload(resized.outputPath, destKey, mimeType);

  await cleanupProcessedFile(resized.outputPath).catch(() => {});

  // ── Create report row + enqueue AI analysis ───────────────────────────────
  // NOTE: We pass the original filePath (pre-resize) because createReportService
  // handles its own upload. The already-uploaded frame is intentionally not
  // re-uploaded — createReportService will overwrite the key which is acceptable
  // for drone frames where GPS EXIF is preserved separately.
  const { createReportService } = await import('../reports/reports.service');
  const report = await createReportService({
    filePath,
    mimeType,
    sourceType: 'drone',
    droneMissionId: missionId,
    zone_id: zoneId ?? undefined,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    language: 'en',
    isDroneImage: true,
  });

  logger.info('Drone frame uploaded and queued for analysis', {
    missionId,
    reportId: report.id,
    imageUrl: uploadResult.url,
  });

  return { report_id: report.id, image_url: uploadResult.url, zone_id: zoneId };
}

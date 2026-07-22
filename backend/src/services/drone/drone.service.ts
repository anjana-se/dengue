import path from 'path';
import {
  createMission,
  findMissionById,
  listMissions,
  updateMissionStatus,
} from '../../db/queries/droneMissions.queries';
import { getStorage } from '../../storage';
import { resizeImage, cleanupProcessedFile } from '../../imageProcessing/resize.util';
import { extractExifMetadata } from '../reports/exif.util';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import { NotFoundError, ForbiddenError } from '../../shared/httpErrors';
import { logger } from '../../shared/logger';
import type {
  CreateMissionInput,
  UpdateMissionStatusInput,
  ListMissionsQuery,
} from './drone.schemas';

/**
 * services/drone/drone.service.ts
 *
 * Drone mission lifecycle + per-frame image analysis & EXIF zone alignment validation.
 * Frame image upload: GPS preserved (keepGps: true), validated against target zone bounds,
 * then AI-analysed using the ai/queue/producer.
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

  let statusToSave = input.status;
  if (statusToSave === 'complete') statusToSave = 'completed';

  const extra: Parameters<typeof updateMissionStatus>[2] = {};
  if (statusToSave === 'in_progress' && !mission.started_at) {
    extra.started_at = new Date();
  }
  if (statusToSave === 'completed') {
    extra.completed_at = new Date();
  }
  if (input.notes) extra.notes = input.notes;

  const updated = await updateMissionStatus(missionId, statusToSave, extra);
  logger.info('Drone mission status updated', { missionId, status: statusToSave });
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

  // ── Extract & Validate GPS EXIF + Spatial Zone Alignment ──────────────────
  const exifMeta = await extractExifMetadata(filePath);
  let latitude: number | null = null;
  let longitude: number | null = null;
  let exifValid = false;
  let validationStatus = exifMeta.validationStatus;
  let validationError: string | undefined;

  if (exifMeta.isValidGps && exifMeta.isSriLanka && exifMeta.gps) {
    latitude = exifMeta.gps.latitude;
    longitude = exifMeta.gps.longitude;

    // Spatial check: verify if EXIF coordinates align with target mission zone
    if (mission.zone_id) {
      const { findZoneById, findZoneByCoordinates } = await import('../../db/queries/zones.queries');
      const targetZone = await findZoneById(mission.zone_id);
      const detectedZone = await findZoneByCoordinates(latitude, longitude);

      if (detectedZone && detectedZone.id === mission.zone_id) {
        exifValid = true;
        validationStatus = 'valid';
        logger.info('Drone EXIF GPS validated & aligned with target zone', {
          missionId,
          zoneId: mission.zone_id,
          lat: latitude,
          lng: longitude,
          altitude: exifMeta.gps.altitude,
        });
      } else {
        exifValid = false;
        validationStatus = 'zone_mismatch';
        const detectedName = detectedZone ? `'${detectedZone.name}'` : 'Outside Defined Zones';
        const targetName = targetZone ? `'${targetZone.name}'` : mission.zone_id;
        validationError = `EXIF location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is located in ${detectedName} instead of target mission zone ${targetName}.`;
        logger.warn('Drone frame EXIF zone mismatch', {
          missionId,
          targetZoneId: mission.zone_id,
          detectedZoneId: detectedZone?.id,
          validationError,
        });
      }
    } else {
      const { findZoneByCoordinates } = await import('../../db/queries/zones.queries');
      const detectedZone = await findZoneByCoordinates(latitude, longitude);
      if (detectedZone) {
        exifValid = true;
        validationStatus = 'valid';
      } else {
        exifValid = false;
        validationStatus = 'out_of_zone_bounds';
        validationError = `EXIF location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) is outside defined zone boundaries.`;
      }
    }
  } else {
    exifValid = false;
    validationError = exifMeta.isValidGps
      ? `EXIF location (${exifMeta.gps?.latitude}, ${exifMeta.gps?.longitude}) is outside Sri Lanka.`
      : 'Image EXIF header contains no GPS coordinates.';
  }

  // Auto-assign zone if mission had no target zone initially
  let zoneId = mission.zone_id;
  if (!zoneId && latitude && longitude) {
    const { findZoneByCoordinates } = await import('../../db/queries/zones.queries');
    const zone = await findZoneByCoordinates(latitude, longitude);
    if (zone) zoneId = zone.id;
  }

  // Fallback coordinates to target zone centroid if EXIF GPS is missing or misaligned
  if ((latitude == null || longitude == null) && zoneId) {
    const { findZoneById } = await import('../../db/queries/zones.queries');
    const zone = await findZoneById(zoneId);
    if (zone && zone.lat != null && zone.lng != null) {
      latitude = Number(zone.lat);
      longitude = Number(zone.lng);
      logger.info('Drone frame fallback to zone centroid coordinates', { missionId, zoneId, lat: latitude, lng: longitude });
    }
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
    notes: validationError ? `[EXIF VALIDATION FAILED] ${validationError}` : undefined,
  });

  // Flag misaligned frame for human review so invalid GPS does not corrupt zone risk
  if (!exifValid) {
    const { updateReportStatus } = await import('../../db/queries/reports.queries');
    await updateReportStatus(report.id, 'needs_human_review');
  }

  logger.info('Drone frame uploaded and queued for analysis', {
    missionId,
    reportId: report.id,
    imageUrl: uploadResult.url,
    exifValid,
    validationStatus,
  });

  return {
    report_id: report.id,
    image_url: uploadResult.url,
    zone_id: zoneId,
    latitude,
    longitude,
    exif_valid: exifValid,
    exif_status: validationStatus,
    exif_error: validationError,
  };
}

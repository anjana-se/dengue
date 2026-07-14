import path from 'path';
import {
  createReport as dbCreateReport,
  findReportById,
  listReports,
  reviewReport,
  updateReportStatus,
  type CreateReportInput as DbCreateReportInput,
} from '../../db/queries/reports.queries';
import { findZoneByCoordinates } from '../../db/queries/zones.queries';
import { extractGps, isWithinSriLanka } from './exif.util';
import { getStorage } from '../../storage';
import { logger } from '../../shared/logger';
import { BadRequestError, NotFoundError } from '../../shared/httpErrors';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import type { CreateReportInput, ListReportsQuery, ReviewReportInput } from './reports.schemas';
import type { Report } from '../../types/domain.types';

/**
 * services/reports/reports.service.ts
 *
 * Handles:
 *  - createReport()  — used by this module AND drone.service (re-exported)
 *  - listReports()
 *  - getReportById()
 *  - reviewReport()
 *
 * After a report is inserted, it hands off to the AI queue producer.
 * The actual enqueueing is done via a lazy import to avoid circular deps
 * (reports.service → producer → queue → consumer → reports.service would circle).
 */

// ─── Shared report-creation logic (called by community and drone paths) ───────

export interface CreateReportServiceInput extends CreateReportInput {
  /** Absolute path to the uploaded file (from multer) */
  filePath: string;
  /** MIME type of the uploaded file */
  mimeType: string;
  /** The reporter's user ID (community reporter) */
  reporterId?: string;
  /** Drone mission ID (drone path only) */
  droneMissionId?: string;
  /** Source type */
  sourceType: 'community' | 'drone';
  /** For drone images, preserve GPS in EXIF */
  isDroneImage?: boolean;
}

export async function createReportService(input: CreateReportServiceInput): Promise<Report> {
  const storage = getStorage();

  // ── Step 1: Resolve GPS coordinates ─────────────────────────────────────
  let latitude = input.latitude ?? null;
  let longitude = input.longitude ?? null;

  if (latitude == null || longitude == null) {
    // Attempt EXIF extraction if user didn't supply coordinates
    const gps = await extractGps(input.filePath);
    if (gps && isWithinSriLanka(gps.latitude, gps.longitude)) {
      latitude = gps.latitude;
      longitude = gps.longitude;
      logger.debug('GPS extracted from EXIF', { lat: latitude, lng: longitude });
    }
  }

  // ── Step 2: Auto-assign zone from coordinates (PostGIS lookup) ───────────
  let zoneId = input.zone_id ?? null;
  if (!zoneId && latitude != null && longitude != null) {
    const zone = await findZoneByCoordinates(latitude, longitude);
    if (zone) {
      zoneId = zone.id;
      logger.debug('Zone auto-assigned from GPS', { zoneId, zoneName: zone.name });
    }
  }

  // ── Step 3: Upload image to storage ─────────────────────────────────────
  const ext = path.extname(input.filePath) || '.jpg';
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const destKey = `reports/${datePrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const uploadResult = await storage.upload(input.filePath, destKey, input.mimeType);

  // ── Step 4: Insert report row ────────────────────────────────────────────
  const dbInput: DbCreateReportInput = {
    source_type: input.sourceType,
    reporter_id: input.reporterId ?? null,
    zone_id: zoneId,
    drone_mission_id: input.droneMissionId ?? null,
    latitude,
    longitude,
    image_url: uploadResult.url,
    image_key: uploadResult.key,
    notes: input.notes ?? null,
  };

  const report = await dbCreateReport(dbInput);
  logger.info('Report created', { reportId: report.id, source: input.sourceType, zoneId });

  // ── Step 5: Enqueue AI analysis job ─────────────────────────────────────
  try {
    const { enqueueAnalysis } = await import('../../ai/queue/producer');
    await enqueueAnalysis({
      report_id: report.id,
      image_url: uploadResult.url,
      language: input.language ?? 'en',
    });
    logger.info('AI analysis job enqueued', { reportId: report.id });
  } catch (err) {
    // Queue failure must not fail the report creation — status stays 'pending'
    // and an operator or scheduler can retry the job later.
    logger.error('Failed to enqueue AI analysis job', {
      reportId: report.id,
      error: (err as Error).message,
    });
  }

  return report;
}

// ─── List reports ─────────────────────────────────────────────────────────────

export async function listReportsService(query: ListReportsQuery, requestingUserRole: string, requestingUserId: string) {
  const { page, limit, offset } = parsePaginationParams(query.page, query.limit);

  // Community reporters can only see their own reports
  const reporterId =
    requestingUserRole === 'community_reporter' ? requestingUserId : undefined;

  const { rows, total } = await listReports({
    zone_id: query.zone_id,
    status: query.status,
    risk_level: query.risk_level,
    source_type: query.source_type,
    reporter_id: reporterId,
    limit,
    offset,
  });

  return buildPaginatedResult(rows, total, { page, limit, offset });
}

// ─── Get report by ID ─────────────────────────────────────────────────────────

export async function getReportByIdService(reportId: string, requestingUserId: string, requestingUserRole: string): Promise<Report> {
  const report = await findReportById(reportId);
  if (!report) throw new NotFoundError(`Report ${reportId} not found`, 'REPORT_NOT_FOUND');

  // Community reporters can only see their own reports
  if (
    requestingUserRole === 'community_reporter' &&
    report.reporter_id !== requestingUserId
  ) {
    throw new NotFoundError(`Report ${reportId} not found`, 'REPORT_NOT_FOUND');
  }

  return report;
}

// ─── Review report (PHI human review) ────────────────────────────────────────

export async function reviewReportService(
  reportId: string,
  input: ReviewReportInput,
  reviewerUserId: string,
): Promise<Report> {
  const existing = await findReportById(reportId);
  if (!existing) throw new NotFoundError(`Report ${reportId} not found`, 'REPORT_NOT_FOUND');

  if (existing.status !== 'needs_human_review') {
    throw new BadRequestError(
      `Report status is '${existing.status}'; only 'needs_human_review' reports can be reviewed`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  await updateReportStatus(reportId, 'processing');
  const updated = await reviewReport(reportId, reviewerUserId, input.notes);

  logger.info('Report reviewed', { reportId, reviewedBy: reviewerUserId });
  return updated;
}

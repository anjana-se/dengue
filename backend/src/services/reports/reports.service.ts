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
import { recomputeZoneRisk } from '../zones/zones.service';
import { query as dbQuery } from '../../db/client';
import { extractGps, isWithinSriLanka } from './exif.util';
import { getStorage } from '../../storage';
import { config } from '../../config/env';
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

/**
 * Mint a fresh, publicly-fetchable URL for a stored object key.
 * In S3 mode this is a short-lived presigned GET URL; otherwise (local driver)
 * the stored fallback URL is returned unchanged. Shared by the reports and
 * incidents services so the STORAGE_DRIVER guard lives in exactly one place.
 */
export async function resolveImageUrl(
  imageKey: string | null | undefined,
  fallbackUrl: string,
): Promise<string> {
  if (config.STORAGE_DRIVER === 's3' && imageKey) {
    try {
      return await getStorage().getUrl(imageKey);
    } catch (err: any) {
      logger.warn('Failed to generate fresh signed URL', { imageKey, error: err.message });
    }
  }
  return fallbackUrl;
}

export async function resolveReportImageUrl(report: Report): Promise<Report> {
  const freshUrl = await resolveImageUrl(report.image_key, report.image_url);
  return freshUrl === report.image_url ? report : { ...report, image_url: freshUrl };
}

export async function resolveReportsImageUrls(reports: Report[]): Promise<Report[]> {
  if (config.STORAGE_DRIVER === 's3') {
    return Promise.all(reports.map(resolveReportImageUrl));
  }
  return reports;
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

  // ── Step 2: Auto-assign zone from coordinates (NSDI MapServer / PostGIS) ───
  let zoneId = input.zone_id ?? null;
  if (!zoneId && latitude != null && longitude != null) {
    zoneId = await resolveZoneFromCoordinates(Number(latitude), Number(longitude));
  }

  // ── Step 3: Upload image to storage ─────────────────────────────────────
  const ext = path.extname(input.filePath) || '.jpg';
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const destKey = `reports/${datePrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const uploadResult = await storage.upload(input.filePath, destKey, input.mimeType);

  // ── Step 3.5: Geocode coordinates for location name ─────────────────
  let locationName: string | null = null;
  if (latitude != null && longitude != null) {
    locationName = await geocodeCoordinatesService(Number(latitude), Number(longitude));
  }

  // ── Step 4: Insert report row ────────────────────────────────────────────
  const dbInput: DbCreateReportInput = {
    source_type: input.sourceType,
    reporter_id: input.reporterId ?? null,
    zone_id: zoneId,
    drone_mission_id: input.droneMissionId ?? null,
    latitude,
    longitude,
    location_name: locationName,
    image_url: uploadResult.url,
    image_key: uploadResult.key,
    notes: input.notes ?? null,
  };

  const report = await dbCreateReport(dbInput);
  logger.info('Report created', { reportId: report.id, source: input.sourceType, zoneId, locationName });

  if (zoneId) {
    await recomputeZoneRisk(zoneId).catch((err) => {
      logger.error('Failed to recompute zone risk on report creation', { zoneId, error: err.message });
    });
  }

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

  return resolveReportImageUrl(report);
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

  const resolvedRows = await resolveReportsImageUrls(rows);
  return buildPaginatedResult(resolvedRows, total, { page, limit, offset });
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

  return resolveReportImageUrl(report);
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

  if (updated.zone_id) {
    await recomputeZoneRisk(updated.zone_id).catch(() => {});
  }

  logger.info('Report reviewed', { reportId, reviewedBy: reviewerUserId });
  return resolveReportImageUrl(updated);
}

const geocodeCache = new Map<string, string>();
const inflightGeocodes = new Map<string, Promise<string>>();

export async function geocodeCoordinatesService(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  // 1. Check cache
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  // 2. Check inflight promises (deduplication)
  if (inflightGeocodes.has(key)) {
    return inflightGeocodes.get(key)!;
  }

  const promise = (async () => {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    // Try NSDI MapServer identify endpoint first (Layer 1: Grama Niladhari Division)
    try {
      const geom = `${lng},${lat}`;
      const url = `https://gisapps.nsdi.gov.lk/server/rest/services/Srilanka/Boundaries/MapServer/identify`
        + `?geometry=${geom}`
        + `&geometryType=esriGeometryPoint`
        + `&sr=4326`
        + `&layers=all:1`
        + `&tolerance=8`
        + `&mapExtent=${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}`
        + `&imageDisplay=800,600,96`
        + `&returnGeometry=false`
        + `&f=json`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DengueGuard-App/1.0.0',
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data && data.results && data.results.length > 0) {
          const feature = data.results[0];
          const attrs = feature.attributes || {};
          const gndName = attrs["GND Name"] || attrs.gnd_name || feature.value;
          const district = attrs["District Name"] || attrs.district_name || 'COLOMBO';
          
          if (gndName) {
            let finalName = gndName;
            const cleanDistrict = toTitleCase(district);
            if (finalName.toLowerCase() === 'fort' && cleanDistrict.toLowerCase() === 'colombo') {
              finalName = 'Colombo Fort';
            } else {
              finalName = toTitleCase(finalName);
            }
            
            const result = `${cleanDistrict} — ${finalName}`;
            geocodeCache.set(key, result);
            return result;
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to geocode via NSDI MapServer, falling back to Nominatim', { lat, lng, error: (err as Error).message });
    }

    // Fallback to Nominatim
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '16');

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DengueGuard-App/1.0.0 (contact: support@dengueguard.gov.lk)',
        },
      });

      if (!res.ok) return fallback;
      const data: any = await res.json();
      const a = data.address ?? {};
      const locality =
        a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || data.name;
      const region = a.city || a.state_district || a.state;
      
      let result = fallback;
      if (locality && region && locality !== region) {
        result = `${region} — ${locality}`;
      } else if (locality || region) {
        result = locality || region;
      }

      geocodeCache.set(key, result);
      return result;
    } catch (err) {
      logger.warn('Failed to reverse geocode coordinates on backend proxy', { lat, lng, error: (err as Error).message });
      return fallback;
    } finally {
      inflightGeocodes.delete(key);
    }
  })();

  inflightGeocodes.set(key, promise);
  return promise;
}

/**
 * Resolves a coordinate to a specific Grama Niladhari zone by querying the NSDI Survey Department MapServer.
 * If the zone doesn't exist in the database, it inserts it dynamically with its geometries.
 */
export async function resolveZoneFromCoordinates(lat: number, lng: number): Promise<string | null> {
  const NSDI_SERVICE = 'https://gisapps.nsdi.gov.lk/server/rest/services/Srilanka/Boundaries/MapServer';
  
  const geom = `${lng},${lat}`;
  const url = `${NSDI_SERVICE}/identify`
    + `?geometry=${geom}`
    + `&geometryType=esriGeometryPoint`
    + `&sr=4326`
    + `&layers=all:1`
    + `&tolerance=8`
    + `&mapExtent=${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}`
    + `&imageDisplay=800,600,96`
    + `&returnGeometry=true`
    + `&f=json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DengueGuard-App/1.0.0',
      },
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.results && data.results.length > 0) {
        const feature = data.results[0];
        const geometry = feature.geometry;
        const attrs = feature.attributes || {};
        
        const gndName = attrs["GND Name"] || attrs.gnd_name || feature.value;
        const district = attrs["District Name"] || attrs.district_name || 'COLOMBO';
        const province = attrs["Province Name"] || attrs.province_name || 'WESTERN';
        
        if (gndName && geometry && geometry.rings && geometry.rings.length > 0) {
          let name = gndName;
          const cleanDistrict = toTitleCase(district);
          const cleanProvince = toTitleCase(province);
          
          if (name.toLowerCase() === 'fort' && cleanDistrict.toLowerCase() === 'colombo') {
            name = 'Colombo Fort';
          } else {
            name = toTitleCase(name);
          }

          // Check if the zone already exists in DB (case-insensitive on name & district)
          const dbResult = await dbQuery<{ id: string }>(
            `SELECT id FROM zones WHERE LOWER(name) = LOWER($1) AND LOWER(district) = LOWER($2) LIMIT 1`,
            [name, cleanDistrict]
          );
          
          if (dbResult.rows.length > 0) {
            return dbResult.rows[0].id;
          }
          
          // Otherwise format the rings as MultiPolygon WKT and insert
          const rings = geometry.rings as number[][][];
          const polys = rings.map(ring => {
            const points = ring.map(pt => `${pt[0]} ${pt[1]}`).join(', ');
            return `((${points}))`;
          });
          const wkt = `MULTIPOLYGON(${polys.join(', ')})`;
          
          const insertResult = await dbQuery<{ id: string }>(
            `INSERT INTO zones (name, district, province, geom, risk_score, risk_level, active_report_count)
             VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), 0, 'low', 0)
             RETURNING id`,
            [name, cleanDistrict, cleanProvince, wkt]
          );
          
          logger.info('Dynamically created new GN zone from NSDI MapServer', { zoneId: insertResult.rows[0].id, name, district: cleanDistrict });
          return insertResult.rows[0].id;
        }
      }
    }
  } catch (err: any) {
    logger.warn('Failed to resolve GN zone from NSDI MapServer', { lat, lng, error: err.message });
  }

  // Fallback to PostGIS database lookup
  try {
    const zone = await findZoneByCoordinates(lat, lng);
    if (zone) return zone.id;
  } catch (err: any) {
    logger.error('Fallback PostGIS zone lookup failed', { error: err.message });
  }

  return null;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (m) => m.toUpperCase());
}

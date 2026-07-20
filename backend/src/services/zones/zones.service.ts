import { query } from '../../db/client';
import { findZoneById, listZones, updateZoneRisk } from '../../db/queries/zones.queries';
import { listReports } from '../../db/queries/reports.queries';
import { scoreToRiskLevel } from './riskScoring.util';
import { logger } from '../../shared/logger';
import { NotFoundError } from '../../shared/httpErrors';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import type { Zone } from '../../types/domain.types';
import type { ListZonesQuery, ZoneReportsQuery } from './zones.schemas';

/**
 * services/zones/zones.service.ts — Full zones service.
 *
 * Exports:
 *  - listZonesService()        — filtered zone list
 *  - getZoneByIdService()      — single zone
 *  - getZoneReportsService()   — reports scoped to a zone
 *  - recomputeZoneRisk()       — risk recompute (called from AI worker, workorders, scheduler)
 */

// ─── List zones ───────────────────────────────────────────────────────────────

export async function listZonesService(queryParams: ListZonesQuery): Promise<Zone[]> {
  return listZones(queryParams);
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getZoneByIdService(zoneId: string): Promise<Zone> {
  const zone = await findZoneById(zoneId);
  if (!zone) throw new NotFoundError(`Zone ${zoneId} not found`, 'ZONE_NOT_FOUND');
  return zone;
}

// ─── Zone reports sub-resource ────────────────────────────────────────────────

export async function getZoneReportsService(
  zoneId: string,
  queryParams: ZoneReportsQuery,
) {
  // Verify zone exists
  const zone = await findZoneById(zoneId);
  if (!zone) throw new NotFoundError(`Zone ${zoneId} not found`, 'ZONE_NOT_FOUND');

  const { page, limit, offset } = parsePaginationParams(queryParams.page, queryParams.limit);

  const { rows, total } = await listReports({
    zone_id: zoneId,
    status: queryParams.status,
    risk_level: queryParams.risk_level,
    limit,
    offset,
  });

  return {
    zone: { id: zone.id, name: zone.name, risk_level: zone.risk_level },
    ...buildPaginatedResult(rows, total, { page, limit, offset }),
  };
}

// ─── Risk recompute (called from AI worker, workorders service, scheduler) ────

/**
 * Recomputes a zone's risk_score, risk_level, and active_report_count.
 *
 * Score formula (0–100):
 *   rawWeight = critical_count × 30 + high_count × 15 + other_count × 5
 *   riskScore = min(100, round(rawWeight / 300 × 100))
 *
 * active_report_count = high/critical risk reports not yet resolved.
 */
import { emitZoneUpdated } from '../notifications/notifications.service';

/**
 * Recomputes a zone's risk_score, risk_level, and active_report_count.
 *
 * Score formula (0–100):
 *   activeReportCount = count of non-failed reports (pending, processing, complete, needs_human_review)
 *   rawWeight = critical × 35 + high × 20 + medium × 10 + low/other × 5 + larvae × 10
 *   riskScore = min(100, round(rawWeight))
 *   riskLevel = scoreToRiskLevel(riskScore)
 */
export async function recomputeZoneRisk(zoneId: string): Promise<void> {
  const zone = await findZoneById(zoneId);
  if (!zone) {
    logger.warn('recomputeZoneRisk called for unknown zone', { zoneId });
    return;
  }

  // Fetch active report counts and risk levels for this zone
  const activeResult = await query<{
    active_count: string;
    critical_count: string;
    high_count: string;
    medium_count: string;
    other_count: string;
    larvae_count: string;
  }>(
    `SELECT
       COUNT(*) AS active_count,
       COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical_count,
       COUNT(*) FILTER (WHERE risk_level = 'high') AS high_count,
       COUNT(*) FILTER (WHERE risk_level = 'medium') AS medium_count,
       COUNT(*) FILTER (WHERE risk_level = 'low' OR risk_level IS NULL) AS other_count,
       COUNT(*) FILTER (WHERE (ai_analysis->>'larvae_visible')::boolean = true OR 'larvae' = ANY(breeding_indicators)) AS larvae_count
     FROM reports
     WHERE zone_id = $1
       AND status IN ('pending', 'processing', 'complete', 'needs_human_review')`,
    [zoneId],
  );

  const row = activeResult.rows[0];
  const activeReportCount = parseInt(row?.active_count ?? '0', 10);
  const criticalCount = parseInt(row?.critical_count ?? '0', 10);
  const highCount = parseInt(row?.high_count ?? '0', 10);
  const mediumCount = parseInt(row?.medium_count ?? '0', 10);
  const otherCount = parseInt(row?.other_count ?? '0', 10);
  const larvaeCount = parseInt(row?.larvae_count ?? '0', 10);

  // Weighted score formula (0 - 100)
  const rawWeight = criticalCount * 35 + highCount * 20 + mediumCount * 10 + otherCount * 5 + larvaeCount * 10;
  const riskScore = Math.min(100, Math.round(rawWeight));
  const riskLevel = scoreToRiskLevel(riskScore);

  await updateZoneRisk({
    zone_id: zoneId,
    risk_score: riskScore,
    risk_level: riskLevel,
    active_report_count: activeReportCount,
  });

  emitZoneUpdated({
    zone_id: zoneId,
    risk_level: riskLevel,
    risk_score: riskScore,
    active_report_count: activeReportCount,
  });

  logger.info('Zone risk recomputed & broadcast', {
    zoneId,
    zoneName: zone.name,
    riskScore,
    riskLevel,
    activeReportCount,
  });
}

// ─── Bulk recompute (used by scheduler) ──────────────────────────────────────

export async function recomputeAllZoneRisks(): Promise<void> {
  const zones = await listZones({ active_only: true });
  logger.info('Starting bulk zone risk recompute', { zoneCount: zones.length });

  // Process sequentially to avoid hammering the DB with concurrent queries
  for (const zone of zones) {
    await recomputeZoneRisk(zone.id).catch((err) => {
      logger.error('Zone risk recompute failed', { zoneId: zone.id, error: (err as Error).message });
    });
  }

  logger.info('Bulk zone risk recompute complete');
}

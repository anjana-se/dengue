import { query } from '../../db/client';
import { findZoneById, listZones, updateZoneRisk, getZoneReportStats } from '../../db/queries/zones.queries';
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
  let zones = await listZones();

  if (queryParams.risk_level) {
    zones = zones.filter((z) => z.risk_level === queryParams.risk_level);
  }
  if (queryParams.district) {
    zones = zones.filter((z) =>
      z.district.toLowerCase().includes(queryParams.district!.toLowerCase()),
    );
  }

  return zones;
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
export async function recomputeZoneRisk(zoneId: string): Promise<void> {
  const zone = await findZoneById(zoneId);
  if (!zone) {
    logger.warn('recomputeZoneRisk called for unknown zone', { zoneId });
    return;
  }

  const stats = await getZoneReportStats(zoneId);

  // Active report count: high/critical risk reports that are open or pending
  const activeResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports
     WHERE zone_id = $1
       AND risk_level IN ('high', 'critical')
       AND status IN ('pending', 'processing', 'complete', 'needs_human_review')`,
    [zoneId],
  );
  const activeReportCount = parseInt(activeResult.rows[0]?.count ?? '0', 10);

  // Weighted score formula
  const otherCount = Math.max(0, stats.total - stats.high - stats.critical);
  const rawWeight = stats.critical * 30 + stats.high * 15 + otherCount * 5;
  const riskScore = Math.min(100, Math.round((rawWeight / 300) * 100));
  const riskLevel = scoreToRiskLevel(riskScore);

  await updateZoneRisk({
    zone_id: zoneId,
    risk_score: riskScore,
    risk_level: riskLevel,
    active_report_count: activeReportCount,
  });

  logger.info('Zone risk recomputed', {
    zoneId,
    zoneName: zone.name,
    riskScore,
    riskLevel,
    activeReportCount,
    stats,
  });
}

// ─── Bulk recompute (used by scheduler) ──────────────────────────────────────

export async function recomputeAllZoneRisks(): Promise<void> {
  const zones = await listZones();
  logger.info('Starting bulk zone risk recompute', { zoneCount: zones.length });

  // Process sequentially to avoid hammering the DB with concurrent queries
  for (const zone of zones) {
    await recomputeZoneRisk(zone.id).catch((err) => {
      logger.error('Zone risk recompute failed', { zoneId: zone.id, error: (err as Error).message });
    });
  }

  logger.info('Bulk zone risk recompute complete');
}

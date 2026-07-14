import { query } from '../../db/client';
import { findZoneById, updateZoneRisk, getZoneReportStats } from '../../db/queries/zones.queries';
import { RISK_THRESHOLDS, RISK_LEVELS } from '../../config/constants';
import { logger } from '../../shared/logger';
import type { RiskLevel } from '../../types/domain.types';

/**
 * services/zones/zones.service.ts (partial — recomputeZoneRisk only)
 *
 * recomputeZoneRisk() is called from three places:
 *  1. AI worker after a new report analysis is written
 *  2. workorders.service after a work order is resolved
 *  3. jobs/zoneRiskRecompute.job.ts on its 15-minute schedule
 *
 * Full zones service (list, get, reports-by-zone) is in Step 5.
 */

/**
 * Converts a 0–100 risk score to a risk level string per FR-20 thresholds.
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return RISK_LEVELS.CRITICAL;
  if (score >= RISK_THRESHOLDS.HIGH)     return RISK_LEVELS.HIGH;
  if (score >= RISK_THRESHOLDS.MEDIUM)   return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

/**
 * Recomputes a zone's risk score and active_report_count from current report data.
 *
 * Score formula:
 *   base    = (critical_count × 30 + high_count × 15 + medium_count × 5) / max_weight × 100
 *   clamped to [0, 100]
 *
 * The formula weights critical/high reports heavily. A single critical report
 * in an otherwise quiet zone still pushes the score toward 'high'.
 */
export async function recomputeZoneRisk(zoneId: string): Promise<void> {
  const zone = await findZoneById(zoneId);
  if (!zone) {
    logger.warn('recomputeZoneRisk called for unknown zone', { zoneId });
    return;
  }

  const stats = await getZoneReportStats(zoneId);

  // Count open/pending reports as the active_report_count
  const activeCount = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports
     WHERE zone_id = $1 AND status IN ('pending', 'processing', 'complete', 'needs_human_review')
       AND risk_level IN ('high', 'critical')`,
    [zoneId],
  );
  const activeReportCount = parseInt(activeCount.rows[0]?.count ?? '0', 10);

  // Score formula — max reasonable weight is 10 critical reports = 300 pts
  const rawWeight = stats.critical * 30 + stats.high * 15 + Math.max(0, stats.total - stats.high - stats.critical) * 5;
  const maxWeight = 300; // Normalise against 10 critical reports
  const riskScore = Math.min(100, Math.round((rawWeight / maxWeight) * 100));
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
  });
}

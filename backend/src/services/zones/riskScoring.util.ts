import { RISK_THRESHOLDS } from '../../config/constants';
import type { RiskLevel } from '../../types/domain.types';

/**
 * services/zones/riskScoring.util.ts
 *
 * Single place that converts a 0–100 score to low/medium/high/critical per FR-20.
 * Imported by zones.service, workorders.service, and jobs/zoneRiskRecompute.job.ts.
 *
 *   critical : score >= 80
 *   high     : score >= 60
 *   medium   : score >= 40
 *   low      : score <  40
 */

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH)     return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM)   return 'medium';
  return 'low';
}

/**
 * Formats a risk level as a Bootstrap/Tailwind-friendly colour token.
 * Used in dashboard aggregation helpers.
 */
export function riskLevelToColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    critical: '#dc2626',   // red-600
    high:     '#ea580c',   // orange-600
    medium:   '#ca8a04',   // yellow-600
    low:      '#16a34a',   // green-600
  };
  return colors[level];
}

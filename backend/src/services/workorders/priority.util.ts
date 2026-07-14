import { RISK_THRESHOLDS } from '../../config/constants';
import type { RiskLevel } from '../../types/domain.types';

/**
 * services/workorders/priority.util.ts
 *
 * Computes a priority_score (0–100) for a work order from three inputs:
 *   1. risk_level     — the AI-assessed severity of the breeding site
 *   2. recency        — how recently the report was submitted (hours)
 *   3. zone_burden    — how many active reports are already in the zone
 *
 * Formula (additive, capped at 100):
 *   base     = risk base score (critical=60, high=40, medium=20, low=5)
 *   recency  = max(0, 20 - floor(hours_old / 6))  — decays by 5 pts per 6h, max 20
 *   burden   = min(20, active_count × 2)           — up to 20 pts for busy zones
 *   score    = min(100, base + recency + burden)
 *
 * The score matches the sort order of the PHI work-order list endpoint.
 */

const RISK_BASE: Record<RiskLevel, number> = {
  critical: 60,
  high:     40,
  medium:   20,
  low:       5,
};

export interface PriorityInputs {
  riskLevel: RiskLevel;
  /** Age of the report in hours at the time of work order creation */
  hoursOld: number;
  /** Number of active (open/accepted) work orders in the same zone */
  activeZoneWorkorders: number;
}

export function computePriorityScore(inputs: PriorityInputs): number {
  const base = RISK_BASE[inputs.riskLevel] ?? RISK_BASE.medium;

  // Recency component: full 20 pts when fresh, decays 5 pts per 6 hours (stops at 0)
  const recencyPts = Math.max(0, 20 - Math.floor(inputs.hoursOld / 6) * 5);

  // Zone burden: 2 pts per existing open work order, max 20
  const burdenPts = Math.min(20, inputs.activeZoneWorkorders * 2);

  return Math.min(100, base + recencyPts + burdenPts);
}

/**
 * Converts a 0–100 risk score to a RiskLevel.
 * Exported here so both zones.service and workorders.service import from one place.
 * (zones.service re-exports it for the zone risk recompute path.)
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH)     return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM)   return 'medium';
  return 'low';
}

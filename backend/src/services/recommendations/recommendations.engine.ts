/**
 * services/recommendations/recommendations.engine.ts
 *
 * Deterministic recommendation engine (ported from the standalone
 * dengueguard-recommendation-service domain layer).
 *
 * Pure functions, no I/O: same zone signals in -> same recommendation out.
 * Every number is arithmetic on real data — score, convergence multiplier,
 * tier, team count, and confidence are all reproducible and traceable.
 * NOT an LLM: Gemini is never involved in these numbers.
 *
 * Four weighted signal sources per zone:
 *   incidents (active breeding-site reports)  30%
 *   iotTraps  (larvae-positive traps)         25%
 *   cases     (active dengue cases)           25%
 *   forecast  (outbreak probability 0-1)      20%
 */

// ─── Config constants (versionable) ──────────────────────────────────────────

export const WEIGHT_VERSION = 'w-2026-07-22';

/** Raw value that maps to a normalized 1.0 for each source. */
const NORMALIZATION_CAPS = {
  incidents: 20,   // active reports in a zone
  iotTraps: 6,     // larvae-positive traps in a zone
  cases: 20,       // active dengue cases in a zone
  forecast: 1,     // already a 0-1 probability
} as const;

/** Source weights — must sum to 1.0 (score stays on a 0-100 scale). */
const WEIGHTS = { incidents: 0.3, iotTraps: 0.25, cases: 0.25, forecast: 0.2 } as const;

/** Convergence: 3+ sources spiking above the threshold applies a 1.5x multiplier. */
const CONVERGENCE = { threshold: 0.6, minSources: 3, multiplier: 1.5 } as const;

/** Routing tiers by (post-convergence) score. */
const TIERS = { autoDispatch: 80, humanApproval: 50 } as const;

/** Per-tier staffing curve: teams = clamp(ceil(reports / perTeam), floor, cap). */
const TEAM_CONFIG = {
  auto_dispatch: { perTeam: 8, floor: 2, cap: 8 },
  human_approval: { perTeam: 12, floor: 1, cap: 5 },
  monitor: { perTeam: 20, floor: 0, cap: 1 },
} as const;

/** Confidence = 0.5·sufficiency + 0.5·agreement (data volume + source corroboration). */
const CONFIDENCE = { sufficiencyTarget: 30, totalSources: 4 } as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoutingTier = 'auto_dispatch' | 'human_approval' | 'monitor';

export interface ZoneSignals {
  activeReports: number;       // incidents source + team sizing + confidence sufficiency
  larvaePositiveTraps: number; // iotTraps source
  activeCases: number;         // cases source
  outbreakProbability: number; // forecast source, 0-1 (0 when no forecast exists)
}

export interface EngineResult {
  score: number;               // final priority score (post-convergence, 2dp)
  baseScore: number;           // pre-convergence weighted sum (2dp)
  tier: RoutingTier;
  suggestedTeams: number;
  confidence: number;          // 0-1 (3dp)
  convergenceApplied: boolean;
  spikingSources: string[];    // which sources exceeded the convergence threshold
  normalized: Record<keyof typeof WEIGHTS, number>; // per-source 0-1 values (trace)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

// ─── Engine ──────────────────────────────────────────────────────────────────

export function computeRecommendation(signals: ZoneSignals): EngineResult {
  // 1. Normalize each source to 0-1 against its cap.
  const normalized = {
    incidents: clamp01(signals.activeReports / NORMALIZATION_CAPS.incidents),
    iotTraps: clamp01(signals.larvaePositiveTraps / NORMALIZATION_CAPS.iotTraps),
    cases: clamp01(signals.activeCases / NORMALIZATION_CAPS.cases),
    forecast: clamp01(signals.outbreakProbability / NORMALIZATION_CAPS.forecast),
  };

  // 2. Weighted sum -> 0-100 base score.
  const baseScore = round2(
    (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
      (sum, k) => sum + normalized[k] * WEIGHTS[k] * 100,
      0,
    ),
  );

  // 3. Convergence: 3+ sources strictly above the threshold -> 1.5x.
  const spikingSources = (Object.keys(normalized) as (keyof typeof WEIGHTS)[]).filter(
    (k) => normalized[k] > CONVERGENCE.threshold,
  );
  const convergenceApplied = spikingSources.length >= CONVERGENCE.minSources;
  const score = round2(baseScore * (convergenceApplied ? CONVERGENCE.multiplier : 1));

  // 4. Routing tier.
  const tier: RoutingTier =
    score >= TIERS.autoDispatch ? 'auto_dispatch'
    : score >= TIERS.humanApproval ? 'human_approval'
    : 'monitor';

  // 5. Suggested teams from report load + tier staffing curve.
  const tc = TEAM_CONFIG[tier];
  const rawTeams = Math.ceil(signals.activeReports / tc.perTeam);
  const suggestedTeams = Math.min(tc.cap, Math.max(tc.floor, rawTeams));

  // 6. Confidence: data sufficiency + cross-source agreement — never invented.
  const sufficiency = clamp01(signals.activeReports / CONFIDENCE.sufficiencyTarget);
  const agreement = spikingSources.length / CONFIDENCE.totalSources;
  const confidence = round3(0.5 * sufficiency + 0.5 * agreement);

  return {
    score,
    baseScore,
    tier,
    suggestedTeams,
    confidence,
    convergenceApplied,
    spikingSources,
    normalized,
  };
}

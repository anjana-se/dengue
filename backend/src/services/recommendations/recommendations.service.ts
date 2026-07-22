import { query, transaction } from '../../db/client';
import { logger } from '../../shared/logger';
import { computeRecommendation, WEIGHT_VERSION, type RoutingTier } from './recommendations.engine';

/**
 * services/recommendations/recommendations.service.ts
 *
 * Builds the ranked AI Recommendations list served to the NDCU dashboard.
 * Replaces the old client-side heuristic in ndcu AiRecommendations.tsx: the
 * numbers (score, teams, confidence, ranking) now come from the deterministic
 * engine over real zone signals — reports, larvae-positive IoT traps, active
 * cases, and the outbreak forecast — instead of being fabricated in the browser.
 *
 * Read-only: aggregates current data on each request; nothing is mutated.
 */

// Mirror of ndcu utils/format SITE_TYPE_LABELS so action text matches the UI vocabulary.
const SITE_TYPE_LABELS: Record<string, string> = {
  discarded_tire: 'Discarded Tyre',
  plastic_container: 'Plastic Container',
  metal_container: 'Metal Container',
  water_storage_tank_barrel: 'Water Storage Tank / Barrel',
  flower_pot_or_saucer: 'Flower Pot / Saucer',
  roof_gutter: 'Roof Gutter',
  blocked_drain: 'Blocked Drain',
  construction_site_water: 'Construction Site Water',
  coconut_shell: 'Coconut Shell',
  tree_hole: 'Tree Hole',
  ornamental_pond: 'Ornamental Pond',
  ac_or_fridge_tray: 'AC / Fridge Tray',
  bird_bath: 'Bird Bath',
  tarpaulin_sheeting: 'Tarpaulin Sheeting',
  unused_well: 'Unused Well',
  refuse_or_food_container: 'Refuse / Food Container',
  other: 'Other',
};
const siteTypeLabel = (v: string): string =>
  SITE_TYPE_LABELS[v] ??
  v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Engine breakdown stored alongside each recommendation for the audit trail.
export interface EngineTrace {
  base_score: number;
  convergence_applied: boolean;
  spiking_sources: string[];
  normalized: Record<string, number>;
}

// Shape consumed by ndcu AiRecommendations.tsx (kept identical to the old
// client-side builder so the panel renders unchanged).
export interface Recommendation {
  rank: number;
  zone_id: string;
  zone_name: string;
  action: string;
  reasoning: string;
  confidence: number;        // 0-100 integer for display
  suggested_teams: number;
  risk_score: number;        // engine priority score (post-convergence)
  risk_level: string;        // zone risk level (drives the badge colour)
  open_orders: number;
  active_reports: number;
  tier: RoutingTier;
  weight_version: string;
  trace: EngineTrace;
  computed_at: string;       // ISO timestamp of the cycle that produced this row
}

interface ZoneRow {
  id: string;
  name: string;
  district: string;
  risk_level: string;
}

interface ReportAggRow {
  zone_id: string;
  active_count: string;
  larvae_count: string;
  drone_count: string;
  review_count: string;
}

interface SiteTypeRow { zone_id: string; site_type: string; count: string }
interface CountRow { zone_id: string; count: string }
interface TrapRow { zone_id: string; positive_count: string; trap_count: string }
interface ForecastRow { zone_id: string; outbreak_probability: number; risk_trend: string }

const ACTIVE_REPORT_STATUSES = ['pending', 'processing', 'complete', 'needs_human_review'];

// ─── Data gathering (one query per source, grouped by zone) ──────────────────

async function fetchSignals() {
  const [zones, reportAgg, siteTypes, openOrders, traps, cases, forecasts] = await Promise.all([
    query<ZoneRow>(`SELECT id, name, district, risk_level FROM zones`),

    query<ReportAggRow>(
      `SELECT zone_id,
              COUNT(*)                                                        AS active_count,
              COUNT(*) FILTER (WHERE ai_analysis->>'larvae_visible' = 'yes')  AS larvae_count,
              COUNT(*) FILTER (WHERE source_type = 'drone')                   AS drone_count,
              COUNT(*) FILTER (WHERE status = 'needs_human_review')           AS review_count
       FROM reports
       WHERE zone_id IS NOT NULL AND status = ANY($1)
       GROUP BY zone_id`,
      [ACTIVE_REPORT_STATUSES],
    ),

    query<SiteTypeRow>(
      `SELECT zone_id, site_type, COUNT(*) AS count
       FROM reports
       WHERE zone_id IS NOT NULL AND site_type IS NOT NULL AND status = ANY($1)
       GROUP BY zone_id, site_type`,
      [ACTIVE_REPORT_STATUSES],
    ),

    query<CountRow>(
      `SELECT r.zone_id, COUNT(*) AS count
       FROM work_orders w
       JOIN reports r ON r.id = w.report_id
       WHERE r.zone_id IS NOT NULL AND w.status IN ('open', 'accepted')
       GROUP BY r.zone_id`,
    ),

    // Latest reading per trap decides whether that trap is currently positive.
    query<TrapRow>(
      `SELECT t.zone_id,
              COUNT(*) FILTER (WHERE lr.larvae_detected) AS positive_count,
              COUNT(*)                                   AS trap_count
       FROM iot_traps t
       LEFT JOIN LATERAL (
         SELECT larvae_detected FROM trap_readings tr
         WHERE tr.trap_id = t.id ORDER BY tr.created_at DESC LIMIT 1
       ) lr ON TRUE
       WHERE t.zone_id IS NOT NULL
       GROUP BY t.zone_id`,
    ),

    query<CountRow>(
      `SELECT zone_id, COUNT(*) AS count
       FROM cases
       WHERE zone_id IS NOT NULL AND status = 'active'
       GROUP BY zone_id`,
    ),

    query<ForecastRow>(
      `SELECT zone_id, outbreak_probability, risk_trend FROM forecasts WHERE zone_id IS NOT NULL`,
    ),
  ]);

  const byZone = <T extends { zone_id: string }>(rows: T[]): Map<string, T> =>
    new Map(rows.map((r) => [r.zone_id, r]));

  const siteTypesByZone = new Map<string, { site_type: string; count: number }[]>();
  for (const row of siteTypes.rows) {
    const list = siteTypesByZone.get(row.zone_id) ?? [];
    list.push({ site_type: row.site_type, count: Number(row.count) });
    siteTypesByZone.set(row.zone_id, list);
  }

  return {
    zones: zones.rows,
    reportAgg: byZone(reportAgg.rows),
    siteTypesByZone,
    openOrders: byZone(openOrders.rows),
    traps: byZone(traps.rows),
    cases: byZone(cases.rows),
    forecasts: byZone(forecasts.rows),
  };
}

// ─── Deterministic guidance text (same voice as the old panel) ───────────────

function buildTexts(args: {
  tier: RoutingTier;
  activeReports: number;
  larvaeReports: number;
  droneReports: number;
  reviewCount: number;
  openOrders: number;
  score: number;
  topSiteLabels: string[];
  positiveTraps: number;
  trapCount: number;
  activeCases: number;
  outbreakProbability: number;
  riskTrend: string | null;
  convergenceApplied: boolean;
  spikingCount: number;
}): { action: string; reasoning: string } {
  const {
    tier, activeReports, larvaeReports, droneReports, reviewCount, openOrders,
    score, topSiteLabels, positiveTraps, trapCount, activeCases,
    outbreakProbability, riskTrend, convergenceApplied, spikingCount,
  } = args;

  let action: string;
  if (tier === 'auto_dispatch') {
    action = 'Deploy teams for emergency source reduction sweep';
    if (topSiteLabels.length) action += ` — focus on ${topSiteLabels.join(', ')}`;
  } else if (tier === 'human_approval') {
    action = topSiteLabels.length
      ? `Priority larviciding — focus on ${topSiteLabels.join(', ')}`
      : 'Priority larviciding and source reduction';
  } else {
    action = 'Increase inspection frequency and community messaging';
  }

  const parts: string[] = [];
  parts.push(`${activeReports} active report${activeReports === 1 ? '' : 's'} in zone${larvaeReports > 0 ? `, ${larvaeReports} with visible larvae` : ''}.`);
  if (positiveTraps > 0) parts.push(`${positiveTraps} of ${trapCount} IoT traps detecting larvae.`);
  if (activeCases > 0) parts.push(`${activeCases} active dengue case${activeCases === 1 ? '' : 's'}.`);
  if (outbreakProbability > 0) parts.push(`Outbreak forecast at ${Math.round(outbreakProbability * 100)}%${riskTrend ? ` (${riskTrend})` : ''}.`);
  if (droneReports > 0) parts.push(`${droneReports} drone survey frame${droneReports === 1 ? '' : 's'} confirm breeding sites.`);
  if (convergenceApplied) parts.push(`${spikingCount} independent signals spiking together — priority reinforced.`);
  if (reviewCount > 0) parts.push(`${reviewCount} report${reviewCount === 1 ? '' : 's'} awaiting human review.`);
  parts.push(openOrders > 0
    ? `${openOrders} open work order${openOrders === 1 ? '' : 's'} pending remediation.`
    : 'No open work orders — proactive action recommended.');
  parts.push(`Priority score ${score}.`);

  return { action, reasoning: parts.join(' ') };
}

// ─── Compute (pure read of current signals) ──────────────────────────────────

export async function computeRecommendationsNow(
  limit = 5,
  computedAt: Date = new Date(),
): Promise<Recommendation[]> {
  const data = await fetchSignals();

  const computed = data.zones.map((zone) => {
    const agg = data.reportAgg.get(zone.id);
    const traps = data.traps.get(zone.id);
    const forecast = data.forecasts.get(zone.id);

    const activeReports = Number(agg?.active_count ?? 0);
    const larvaeReports = Number(agg?.larvae_count ?? 0);
    const positiveTraps = Number(traps?.positive_count ?? 0);
    const activeCases = Number(data.cases.get(zone.id)?.count ?? 0);
    const outbreakProbability = Number(forecast?.outbreak_probability ?? 0);
    const openOrders = Number(data.openOrders.get(zone.id)?.count ?? 0);

    const engine = computeRecommendation({
      activeReports,
      larvaePositiveTraps: positiveTraps,
      activeCases,
      outbreakProbability,
    });

    const topSiteLabels = (data.siteTypesByZone.get(zone.id) ?? [])
      .sort((a, b) => b.count - a.count || a.site_type.localeCompare(b.site_type))
      .slice(0, 2)
      .map((s) => siteTypeLabel(s.site_type));

    const { action, reasoning } = buildTexts({
      tier: engine.tier,
      activeReports,
      larvaeReports,
      droneReports: Number(agg?.drone_count ?? 0),
      reviewCount: Number(agg?.review_count ?? 0),
      openOrders,
      score: engine.score,
      topSiteLabels,
      positiveTraps,
      trapCount: Number(traps?.trap_count ?? 0),
      activeCases,
      outbreakProbability,
      riskTrend: forecast?.risk_trend ?? null,
      convergenceApplied: engine.convergenceApplied,
      spikingCount: engine.spikingSources.length,
    });

    return {
      zone,
      engine,
      rec: {
        rank: 0, // assigned after sorting
        zone_id: zone.id,
        zone_name: zone.district ? `${zone.district} — ${zone.name}` : zone.name,
        action,
        reasoning,
        confidence: Math.round(engine.confidence * 100),
        suggested_teams: engine.suggestedTeams,
        risk_score: engine.score,
        risk_level: zone.risk_level,
        open_orders: openOrders,
        active_reports: activeReports,
        tier: engine.tier,
        weight_version: WEIGHT_VERSION,
        trace: {
          base_score: engine.baseScore,
          convergence_applied: engine.convergenceApplied,
          spiking_sources: engine.spikingSources,
          normalized: engine.normalized,
        },
        computed_at: computedAt.toISOString(),
      } satisfies Recommendation,
    };
  });

  // Rank by engine score (deterministic tie-break by zone name), keep zones
  // with any signal at all, and return the top N.
  return computed
    .filter((c) => c.engine.score > 0)
    .sort((a, b) => b.engine.score - a.engine.score || a.rec.zone_name.localeCompare(b.rec.zone_name))
    .slice(0, limit)
    .map((c, i) => ({ ...c.rec, rank: i + 1 }));
}

// ─── Persist one recompute cycle (called by the 15-min cron job) ─────────────

const STORED_PER_CYCLE = 10; // store a few more than the panel shows, for flexibility

export async function persistRecommendationCycle(): Promise<number> {
  const computedAt = new Date();
  const recs = await computeRecommendationsNow(STORED_PER_CYCLE, computedAt);
  if (recs.length === 0) {
    logger.debug('Recommendation cycle produced no rows (no zones with signal)');
    return 0;
  }

  await transaction(async (client) => {
    for (const r of recs) {
      await client.query(
        `INSERT INTO zone_recommendations
           (zone_id, rank, action, reasoning, confidence, suggested_teams,
            priority_score, tier, risk_level, open_orders, active_reports,
            trace, weight_version, computed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)`,
        [
          r.zone_id, r.rank, r.action, r.reasoning, r.confidence, r.suggested_teams,
          r.risk_score, r.tier, r.risk_level, r.open_orders, r.active_reports,
          JSON.stringify(r.trace), r.weight_version, computedAt,
        ],
      );
    }
  });

  logger.info('Recommendation cycle persisted', { rows: recs.length, computedAt });
  return recs.length;
}

// ─── Read the latest stored cycle ────────────────────────────────────────────

interface StoredRow {
  zone_id: string;
  rank: number;
  action: string;
  reasoning: string;
  confidence: number;
  suggested_teams: number;
  priority_score: string;   // NUMERIC comes back as string
  tier: RoutingTier;
  risk_level: string;
  open_orders: number;
  active_reports: number;
  trace: EngineTrace;
  weight_version: string;
  computed_at: Date;
  name: string;
  district: string;
}

async function getStoredRecommendations(limit: number): Promise<Recommendation[]> {
  const { rows } = await query<StoredRow>(
    `SELECT zr.*, z.name, z.district
     FROM zone_recommendations zr
     JOIN zones z ON z.id = zr.zone_id
     WHERE zr.computed_at = (SELECT MAX(computed_at) FROM zone_recommendations)
     ORDER BY zr.rank
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    rank: r.rank,
    zone_id: r.zone_id,
    zone_name: r.district ? `${r.district} — ${r.name}` : r.name,
    action: r.action,
    reasoning: r.reasoning,
    confidence: r.confidence,
    suggested_teams: r.suggested_teams,
    risk_score: Number(r.priority_score),
    risk_level: r.risk_level,
    open_orders: r.open_orders,
    active_reports: r.active_reports,
    tier: r.tier,
    weight_version: r.weight_version,
    trace: r.trace,
    computed_at: new Date(r.computed_at).toISOString(),
  }));
}

// ─── Public service (what the controller calls) ──────────────────────────────

/**
 * Serves the latest cron-computed cycle (read-mostly and fast). If no cycle has
 * been stored yet — e.g. the worker process isn't running — falls back to
 * computing live so the panel never comes up empty.
 */
export async function listRecommendationsService(limit = 5): Promise<Recommendation[]> {
  const stored = await getStoredRecommendations(limit);
  if (stored.length > 0) return stored;

  logger.info('No stored recommendation cycle found — computing live as fallback');
  return computeRecommendationsNow(limit);
}

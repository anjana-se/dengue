import { query } from '../../db/client';
import { listZones } from '../../db/queries/zones.queries';
import { logger } from '../../shared/logger';

/**
 * services/chat/contextBuilder.ts
 *
 * Assembles the always-on platform context JSON injected into every chat system
 * prompt. Gives the model real numbers for common "big picture" questions so it
 * doesn't need a tool call for them; anything more specific is served by the
 * read-only tools in ./tools.
 *
 * Kept aggregate-only: NO raw PII, NO per-record detail. A short in-memory cache
 * avoids rebuilding on rapid back-to-back turns.
 */

const CACHE_TTL_MS = 30_000;
let cache: { json: string; expires: number } | null = null;

export async function buildChatContext(): Promise<string> {
  if (cache && cache.expires > Date.now()) {
    return cache.json;
  }

  try {
    const [zones, reportStats, workorderStats, trapStats, incidentStats, forecastStats] = await Promise.all([
      listZones(),
      query<{
        critical_open: string;
        pending: string;
        last_24h: string;
        last_7d: string;
      }>(`
        SELECT
          COUNT(*) FILTER (WHERE risk_level = 'critical' AND status NOT IN ('failed')) AS critical_open,
          COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))                  AS pending,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')            AS last_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')              AS last_7d
        FROM reports
      `),
      query<{ open: string; accepted: string; resolved: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'open')     AS open,
          COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
        FROM work_orders
      `),
      query<{ total: string; offline: string; low_battery: string }>(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE status = 'offline')          AS offline,
          COUNT(*) FILTER (WHERE battery_percent < 20)        AS low_battery
        FROM iot_traps
      `),
      query<{ open: string }>(`
        SELECT COUNT(*) FILTER (WHERE status = 'open') AS open FROM incidents
      `),
      query<{ total: string; emergency: string; warning: string; top_zone: string | null; top_prob: string | null }>(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(*) FILTER (WHERE alert_level = 'emergency') AS emergency,
          COUNT(*) FILTER (WHERE alert_level = 'warning')   AS warning,
          (SELECT zone_name FROM forecasts ORDER BY outbreak_probability DESC LIMIT 1)           AS top_zone,
          (SELECT outbreak_probability FROM forecasts ORDER BY outbreak_probability DESC LIMIT 1) AS top_prob
        FROM forecasts
      `),
    ]);

    const rs = reportStats.rows[0];
    const ws = workorderStats.rows[0];
    const ts = trapStats.rows[0];
    const is = incidentStats.rows[0];
    const fs = forecastStats.rows[0];
    const n = (v: string | undefined) => parseInt(v ?? '0', 10);

    const context = {
      timestamp: new Date().toISOString(),
      platform: 'DengueGuard Sri Lanka',
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        district: z.district,
        risk_level: z.risk_level,
        risk_score: z.risk_score,
        active_reports: z.active_report_count,
      })),
      national_summary: {
        total_zones: zones.length,
        critical_zones: zones.filter((z) => z.risk_level === 'critical').length,
        high_zones: zones.filter((z) => z.risk_level === 'high').length,
        reports_critical_open: n(rs?.critical_open),
        reports_pending_analysis: n(rs?.pending),
        reports_last_24h: n(rs?.last_24h),
        reports_last_7d: n(rs?.last_7d),
        work_orders: { open: n(ws?.open), accepted: n(ws?.accepted), resolved: n(ws?.resolved) },
        traps: { total: n(ts?.total), offline: n(ts?.offline), low_battery: n(ts?.low_battery) },
        incidents_open: n(is?.open),
        forecasts: {
          total: n(fs?.total),
          emergency_zones: n(fs?.emergency),
          warning_zones: n(fs?.warning),
          highest_risk_zone: fs?.top_zone ?? null,
          highest_outbreak_probability: fs?.top_prob != null ? Number(fs.top_prob) : null,
        },
      },
    };

    const json = JSON.stringify(context, null, 2);
    cache = { json, expires: Date.now() + CACHE_TTL_MS };
    return json;
  } catch (err) {
    logger.error('Failed to build chat context', { error: (err as Error).message });
    return JSON.stringify({ error: 'Context unavailable', timestamp: new Date().toISOString() });
  }
}

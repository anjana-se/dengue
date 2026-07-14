import { query } from '../../db/client';
import { listZones } from '../../db/queries/zones.queries';

/**
 * services/dashboard/dashboard.service.ts
 *
 * Aggregated stats for the NDCU dashboard.
 * All queries are intentionally simple window/aggregate queries
 * — no ORM, no N+1, single round-trips.
 */

export async function getDashboardSummaryService() {
  const [
    zones,
    reportStats,
    workorderStats,
    recentCritical,
    trendRows,
  ] = await Promise.all([
    listZones(),

    query<{
      total: string;
      pending: string;
      complete: string;
      needs_review: string;
      high_risk: string;
      critical_risk: string;
    }>(`
      SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))   AS pending,
        COUNT(*) FILTER (WHERE status = 'complete')                   AS complete,
        COUNT(*) FILTER (WHERE status = 'needs_human_review')         AS needs_review,
        COUNT(*) FILTER (WHERE risk_level = 'high')                   AS high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'critical')               AS critical_risk
      FROM reports
    `),

    query<{
      open: string;
      accepted: string;
      resolved: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')     AS open,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
      FROM work_orders
    `),

    // Last 10 critical/high-risk reports for the alert feed
    query<{
      id: string;
      zone_id: string | null;
      risk_level: string;
      site_type: string | null;
      created_at: Date;
      status: string;
    }>(`
      SELECT id, zone_id, risk_level, site_type, created_at, status
      FROM reports
      WHERE risk_level IN ('critical', 'high')
      ORDER BY created_at DESC
      LIMIT 10
    `),

    // 7-day daily report trend
    query<{ day: string; count: string; critical: string; high: string }>(`
      SELECT
        DATE_TRUNC('day', created_at)::DATE::TEXT AS day,
        COUNT(*)                                   AS count,
        COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical,
        COUNT(*) FILTER (WHERE risk_level = 'high')     AS high
      FROM reports
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1
    `),
  ]);

  const rs = reportStats.rows[0];
  const ws = workorderStats.rows[0];

  return {
    reports: {
      total:       parseInt(rs?.total ?? '0', 10),
      pending:     parseInt(rs?.pending ?? '0', 10),
      complete:    parseInt(rs?.complete ?? '0', 10),
      needs_review: parseInt(rs?.needs_review ?? '0', 10),
      high_risk:   parseInt(rs?.high_risk ?? '0', 10),
      critical_risk: parseInt(rs?.critical_risk ?? '0', 10),
    },
    workorders: {
      open:     parseInt(ws?.open ?? '0', 10),
      accepted: parseInt(ws?.accepted ?? '0', 10),
      resolved: parseInt(ws?.resolved ?? '0', 10),
    },
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      district: z.district,
      risk_level: z.risk_level,
      risk_score: z.risk_score,
      active_reports: z.active_report_count,
    })),
    recent_critical_reports: recentCritical.rows,
    seven_day_trend: trendRows.rows.map((r) => ({
      day: r.day,
      total: parseInt(r.count, 10),
      critical: parseInt(r.critical, 10),
      high: parseInt(r.high, 10),
    })),
  };
}

export async function exportReportsCsvService(filter: {
  zone_id?: string;
  risk_level?: string;
  date_from?: string;
  date_to?: string;
}): Promise<string> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.zone_id)   { conditions.push(`zone_id = $${idx++}`);                       params.push(filter.zone_id); }
  if (filter.risk_level){ conditions.push(`risk_level = $${idx++}`);                    params.push(filter.risk_level); }
  if (filter.date_from) { conditions.push(`created_at >= $${idx++}::TIMESTAMPTZ`);      params.push(filter.date_from); }
  if (filter.date_to)   { conditions.push(`created_at <= $${idx++}::TIMESTAMPTZ`);      params.push(filter.date_to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{
    id: string; source_type: string; zone_id: string | null;
    latitude: number | null; longitude: number | null;
    site_type: string | null; risk_level: string | null;
    confidence_score: number | null; status: string;
    created_at: Date;
  }>(`
    SELECT id, source_type, zone_id, latitude, longitude,
           site_type, risk_level, confidence_score, status, created_at
    FROM reports ${where}
    ORDER BY created_at DESC
    LIMIT 10000
  `, params);

  const headers = ['id', 'source_type', 'zone_id', 'latitude', 'longitude',
                   'site_type', 'risk_level', 'confidence_score', 'status', 'created_at'];

  const rows = result.rows.map((r) => [
    r.id, r.source_type, r.zone_id ?? '', r.latitude ?? '', r.longitude ?? '',
    r.site_type ?? '', r.risk_level ?? '', r.confidence_score ?? '', r.status,
    new Date(r.created_at).toISOString(),
  ].map(String).join(','));

  return [headers.join(','), ...rows].join('\n');
}

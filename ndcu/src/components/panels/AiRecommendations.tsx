import { PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import type { Report, Zone } from '../../types';

/**
 * Generate ranked recommendations from live data:
 * - Sorts zones by risk_score descending
 * - Correlates with active reports count
 * - Produces actionable guidance text based on risk level and site types
 */
function buildRecommendations(zones: Zone[], reports: Report[]) {
  if (!zones.length) return [];

  const zoneReports: Record<string, Report[]> = {};
  reports.forEach((r) => {
    if (!zoneReports[r.zone_id]) zoneReports[r.zone_id] = [];
    zoneReports[r.zone_id].push(r);
  });

  const sorted = [...zones]
    .filter((z) => z.risk_level === 'critical' || z.risk_level === 'high' || z.risk_level === 'medium')
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  return sorted.map((z, i) => {
    const zReports = zoneReports[z.zone_id] || [];
    const larvaeReports = zReports.filter((r) => r.larvae_visible).length;
    const droneReports = zReports.filter((r) => r.source_type === 'drone').length;
    const siteTypes = [...new Set(zReports.map((r) => r.site_type).filter(Boolean))].slice(0, 3);
    const openOrders = z.open_orders || 0;
    const needsReview = zReports.filter((r) => r.needs_human_review).length;

    const isCritical = z.risk_level === 'critical';
    const isHigh = z.risk_level === 'high';

    let action = '';
    let reasoning = '';
    let teams = 1;

    if (isCritical) {
      action = `Deploy ${larvaeReports > 3 ? '3' : '2'} teams for emergency source reduction sweep`;
      reasoning = `${z.active_report_count} active reports, ${larvaeReports} with visible larvae. Risk score ${z.risk_score}/100. ${droneReports > 0 ? `${droneReports} drone survey frames confirm breeding sites.` : ''} ${openOrders} open work orders pending remediation.`;
      teams = larvaeReports > 3 ? 3 : 2;
    } else if (isHigh) {
      action = siteTypes.length > 0
        ? `Priority larviciding — focus on ${siteTypes.join(', ')}`
        : 'Priority larviciding and source reduction';
      reasoning = `${z.active_report_count} reports in zone. ${larvaeReports > 0 ? `${larvaeReports} sites confirmed larvae.` : ''} ${needsReview > 0 ? `${needsReview} reports need human review.` : ''} Upward risk trend warrants immediate action.`;
      teams = 2;
    } else {
      action = 'Increase inspection frequency and community messaging';
      reasoning = `${z.active_report_count} breeding site reports. Risk score at ${z.risk_score}. ${openOrders > 0 ? `${openOrders} existing work orders in progress.` : 'No open work orders — proactive inspection recommended.'}`;
      teams = 1;
    }

    const confidence = isCritical ? 88 + Math.min(10, z.active_report_count) :
                       isHigh ? 76 + Math.min(12, z.active_report_count) :
                       62 + Math.min(15, z.active_report_count);

    return {
      rank: i + 1,
      zone_id: z.zone_id,
      zone_name: z.name,
      action,
      reasoning,
      confidence: Math.min(98, confidence),
      suggested_teams: teams,
      risk_score: z.risk_score,
      risk_level: z.risk_level,
      open_orders: openOrders,
      active_reports: z.active_report_count,
    };
  });
}

export default function AiRecommendations() {
  const zones = useStore((s) => s.zones);
  const reports = useStore((s) => s.reports);
  const createWO = useStore((s) => s.createWO);

  const recs = buildRecommendations(zones, reports);

  if (recs.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', padding: '20px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>AI Recommendations</div>
        <div style={{ fontSize: 13, color: '#94a29d', textAlign: 'center', padding: '20px 0' }}>
          No high-risk zones detected. All zones are at acceptable risk levels.
        </div>
      </div>
    );
  }

  // Get a high-risk report for a zone to create a work order from
  const zoneReports: Record<string, Report[]> = {};
  reports.forEach((r) => {
    if (!zoneReports[r.zone_id]) zoneReports[r.zone_id] = [];
    zoneReports[r.zone_id].push(r);
  });

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>AI Recommendations</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>· live data · priority order</span>
      </div>

      {recs.map((r) => {
        const zReps = zoneReports[r.zone_id] || [];
        const topReport = zReps.sort((a, b) => b.confidence - a.confidence)[0];

        const facts: [string, string][] = [
          ['🦟', `${r.active_reports} active reports`],
          ['📋', `${r.open_orders} work orders`],
          ['📊', `Risk score ${r.risk_score}`],
          ['👥', `${r.suggested_teams} team${r.suggested_teams > 1 ? 's' : ''} suggested`],
        ];

        return (
          <div key={r.rank} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: '1px solid #f2f5f4' }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: r.risk_level === 'critical' ? '#DC2626' : r.risk_level === 'high' ? '#F59E0B' : PRIMARY,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {r.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.zone_name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0b6b57' }}>{r.confidence}% confidence</span>
              </div>
              <div style={{ fontSize: 13, color: '#334b45', marginTop: 2 }}>{r.action}</div>
              <div style={{ fontSize: 12, color: '#6b7c77', marginTop: 3, lineHeight: 1.45 }}>{r.reasoning}</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', marginTop: 7 }}>
                {facts.map(([ic, lbl]) => (
                  <span
                    key={lbl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      color: '#334b45',
                      background: '#f4f7f6',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    <span>{ic}</span>
                    {lbl}
                  </span>
                ))}
              </div>

              {topReport && r.open_orders === 0 && (
                <button
                  onClick={() => createWO(topReport)}
                  style={{
                    marginTop: 10,
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 7,
                    background: PRIMARY,
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  + Create work order
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

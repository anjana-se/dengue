import { useRef } from 'react';
import { AMBER, PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import PredAlert from './PredAlert';
import CaseStats from './CaseStats';
import AiRecommendations from './AiRecommendations';
import ZoneRiskTable from './ZoneRiskTable';
import Weather from './Weather';

export default function Dashboard() {
  const casesOn = useStore((s) => s.layers.cases);
  const reports = useStore((s) => s.reports);
  const zones = useStore((s) => s.zones);
  const orders = useStore((s) => s.orders);
  const dashboardSummary = useStore((s) => s.dashboardSummary);
  const exportCsv = useStore((s) => s.exportCsv);
  const recRef = useRef<HTMLDivElement | null>(null);

  const scrollToRec = () => recRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Live counts from store
  const reportsCount = dashboardSummary?.reports?.total ?? reports.length;
  const highRiskZones = zones.filter((z) => z.risk_level === 'high' || z.risk_level === 'critical').length;
  const criticalZones = zones.filter((z) => z.risk_level === 'critical').length;
  const openOrders = dashboardSummary?.workorders
    ? (dashboardSummary.workorders.open + dashboardSummary.workorders.accepted)
    : orders.filter((o) => o.status !== 'resolved').length;
  const unassignedOrders = orders.filter((o) => o.status === 'new').length;
  const needsReview = dashboardSummary?.reports?.needs_review ?? reports.filter((r) => r.needs_human_review).length;
  const avgRiskScore = zones.length
    ? Math.round(zones.reduce((s, z) => s + z.risk_score, 0) / zones.length)
    : 0;

  const KPIS: [string, string | number, string, string][] = [
    ['Total reports', reportsCount, `${needsReview} need review`, PRIMARY],
    ['High-risk zones', highRiskZones, `${criticalZones} critical`, AMBER],
    ['Open work orders', openOrders, `${unassignedOrders} unassigned`, '#3B82F6'],
    ['Avg risk score', avgRiskScore, `Across ${zones.length} zones`, '#DC2626'],
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {KPIS.map(([l, v, s, c]) => (
          <div
            key={l}
            style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8e5', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: c, borderRadius: '12px 0 0 12px' }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ fontSize: 12.5, color: '#6b7c77', fontWeight: 500 }}>{l}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: c, margin: '2px 0 0', letterSpacing: '-.02em' }}>{v}</div>
              <div style={{ fontSize: 11.5, color: '#94a29d', marginTop: 1 }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Export CSV */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => exportCsv()}
          style={{
            padding: '7px 14px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            color: '#334b45',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⬇ Export CSV
        </button>
      </div>

      <PredAlert onViewPredictions={scrollToRec} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          gap: 12,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 2,
        }}
      >
        {casesOn && <CaseStats />}
        <div ref={recRef}>
          <AiRecommendations />
        </div>
        <ZoneRiskTable />
        <Weather />
      </div>
    </div>
  );
}

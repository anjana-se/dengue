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
  const toggleLayer = useStore((s) => s.toggleLayer);
  const reports = useStore((s) => s.reports);
  const zones = useStore((s) => s.zones);
  const orders = useStore((s) => s.orders);
  const dashboardSummary = useStore((s) => s.dashboardSummary);
  const exportCsv = useStore((s) => s.exportCsv);
  const fetchData = useStore((s) => s.fetchData);
  const recRef = useRef<HTMLDivElement | null>(null);

  const scrollToRec = () => recRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // KPI counts — prefer dashboardSummary when available (richer aggregation)
  const reportsCount = dashboardSummary?.reports?.total ?? reports.length;
  const pendingReports = dashboardSummary?.reports?.pending ?? reports.filter((r) => r.status === 'processing').length;
  const needsReview = dashboardSummary?.reports?.needs_review ?? reports.filter((r) => r.needs_human_review).length;
  const highRiskZones = zones.filter((z) => z.risk_level === 'high' || z.risk_level === 'critical').length;
  const criticalZones = zones.filter((z) => z.risk_level === 'critical').length;
  const openOrders = dashboardSummary?.workorders
    ? dashboardSummary.workorders.open + dashboardSummary.workorders.accepted
    : orders.filter((o) => o.status !== 'resolved').length;
  const resolvedOrders = dashboardSummary?.workorders?.resolved
    ?? orders.filter((o) => o.status === 'resolved').length;
  const unassignedOrders = orders.filter((o) => o.status === 'new').length;
  const avgRiskScore = zones.length
    ? Math.round(zones.reduce((s, z) => s + z.risk_score, 0) / zones.length)
    : 0;

  const KPIS: { label: string; value: string | number; sub: string; color: string; detail?: string }[] = [
    {
      label: 'Total reports',
      value: reportsCount,
      sub: needsReview > 0 ? `⚠ ${needsReview} need review` : `${pendingReports} processing`,
      color: PRIMARY,
      detail: pendingReports > 0 ? 'includes processing' : '',
    },
    {
      label: 'High-risk zones',
      value: highRiskZones,
      sub: criticalZones > 0 ? `${criticalZones} critical 🚨` : 'No critical zones',
      color: criticalZones > 0 ? '#DC2626' : AMBER,
    },
    {
      label: 'Open work orders',
      value: openOrders,
      sub: unassignedOrders > 0 ? `${unassignedOrders} unassigned` : `${resolvedOrders} resolved`,
      color: '#3B82F6',
    },
    {
      label: 'Avg risk score',
      value: avgRiskScore,
      sub: `${zones.length} zone${zones.length !== 1 ? 's' : ''} monitored`,
      color: avgRiskScore >= 70 ? '#DC2626' : avgRiskScore >= 50 ? AMBER : '#10B981',
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {KPIS.map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '14px 16px 12px',
              border: '1px solid #e2e8e5',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: color,
                borderRadius: '12px 0 0 12px',
              }}
            />
            <div style={{ paddingLeft: 10 }}>
              <div style={{ fontSize: 12, color: '#6b7c77', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color, margin: '1px 0', letterSpacing: '-.03em', lineHeight: 1.1 }}>
                {value}
              </div>
              <div style={{ fontSize: 11.5, color: '#94a29d' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => fetchData()}
          style={{
            padding: '7px 13px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            color: '#334b45',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => exportCsv()}
          style={{
            padding: '7px 13px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            color: '#334b45',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={() => toggleLayer('cases')}
          style={{
            padding: '7px 13px',
            border: `1px solid ${casesOn ? PRIMARY : '#d5ddda'}`,
            borderRadius: 8,
            background: casesOn ? '#E7F7F0' : '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            color: casesOn ? '#0b6b57' : '#334b45',
            fontWeight: casesOn ? 700 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {casesOn ? '✓' : '◯'} Case layer
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

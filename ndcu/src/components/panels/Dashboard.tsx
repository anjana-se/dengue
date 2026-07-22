import { useRef } from 'react';
import { AMBER, PRIMARY } from '../../theme';
import { pendingDecisions, useStore } from '../../store/useStore';
import PredAlert from './PredAlert';
import CaseStats from './CaseStats';
import AiRecommendations from './AiRecommendations';
import ZoneRiskTable from './ZoneRiskTable';
import Weather from './Weather';
import IotStats from './IotStats';

type Kpi = [string, string, string, string, (() => void)?];

export default function Dashboard() {
  const casesOn = useStore((s) => s.layers.cases);
  const trapsOn = useStore((s) => s.layers.traps);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const incidents = useStore((s) => s.incidents);
  const decisions = useStore((s) => s.decisions);
  const traps = useStore((s) => s.traps);
  const zones = useStore((s) => s.zones);
  const orders = useStore((s) => s.orders);
  const dashboardSummary = useStore((s) => s.dashboardSummary);
  const exportCsv = useStore((s) => s.exportCsv);
  const fetchData = useStore((s) => s.fetchData);
  const setView = useStore((s) => s.setView);
  const setReportFilter = useStore((s) => s.setReportFilter);
  const setDupReviewOpen = useStore((s) => s.setDupReviewOpen);
  const recRef = useRef<HTMLDivElement | null>(null);

  const scrollToRec = () => recRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // KPI counts — prefer dashboardSummary when available (richer aggregation)
  const today = new Date().toDateString();
  const incToday = incidents.filter((i) => new Date(i.created_at).toDateString() === today).length;
  const pend = pendingDecisions(decisions).length;
  const activeRiskZones = zones.filter((z) => z.risk_score > 0 || z.active_report_count > 0);
  const highRiskZones = activeRiskZones.filter((z) => z.risk_level === 'high' || z.risk_level === 'critical').length;
  const criticalZones = activeRiskZones.filter((z) => z.risk_level === 'critical').length;
  const openOrders = dashboardSummary?.workorders
    ? dashboardSummary.workorders.open + dashboardSummary.workorders.accepted
    : orders.filter((o) => o.status !== 'resolved').length;
  const unassignedOrders = orders.filter((o) => o.status === 'new').length;
  const avgRiskScore = activeRiskZones.length
    ? Math.round(activeRiskZones.reduce((s, z) => s + z.risk_score, 0) / activeRiskZones.length)
    : 0;

  const at = traps.filter((t) => t.status === 'active');
  const det = at.reduce((a, t) => a + t.readings.mosquito_count_24h, 0);
  const base = Math.round(traps.reduce((a, t) => a + t.readings.mosquito_count_7d / 7, 0));

  const kpis: Kpi[] = [
    ['Incidents today', String(incToday), incToday > 0 ? 'Live tracking' : 'No incidents today', PRIMARY],
    ['High-risk zones', String(highRiskZones), criticalZones > 0 ? criticalZones + ' critical 🚨' : 'No critical zones', criticalZones > 0 ? '#DC2626' : AMBER],
    ['Open work orders', String(openOrders), unassignedOrders > 0 ? unassignedOrders + ' unassigned' : 'all assigned', '#3B82F6'],
    ['Avg risk score', String(avgRiskScore) + ' / 100', avgRiskScore >= 70 ? 'High risk · ▲' : avgRiskScore >= 50 ? 'Elevated ·▲' : 'Normal', avgRiskScore >= 70 ? '#DC2626' : avgRiskScore >= 50 ? AMBER : '#10B981'],
    [
      'Pending reviews',
      String(pend),
      pend ? 'duplicate matches to review' : 'all reviewed',
      pend ? AMBER : '#0F6E56',
      () => {
        setView('reports');
        setReportFilter('needs_review');
        setDupReviewOpen(true);
      },
    ],
    [
      'Mosquito detections',
      String(det),
      (det >= base ? '▲ ' : '▼ ') + Math.abs(det - base) + ' vs prev · ' + at.length + ' traps',
      '#0F6E56',
    ],
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {kpis.map(([l, v, s, c, onC]) => (
          <div
            key={l}
            onClick={onC}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '13px 15px',
              border: '1px solid ' + (onC && s !== 'all reviewed' ? '#F3D9A6' : '#e2e8e5'),
              cursor: onC ? 'pointer' : 'default',
            }}
          >
            <div style={{ fontSize: 12.5, color: '#6b7c77', fontWeight: 500 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c, margin: '3px 0 1px', letterSpacing: '-.02em' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: '#94a29d' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      {/* <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => fetchData()}
          style={{ padding: '7px 13px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, color: '#334b45', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => exportCsv()}
          style={{ padding: '7px 13px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, color: '#334b45', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={() => toggleLayer('cases')}
          style={{ padding: '7px 13px', border: `1px solid ${casesOn ? PRIMARY : '#d5ddda'}`, borderRadius: 8, background: casesOn ? '#E7F7F0' : '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, color: casesOn ? '#0b6b57' : '#334b45', fontWeight: casesOn ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {casesOn ? '✓' : '◯'} Case layer
        </button>
        <button
          onClick={() => toggleLayer('traps')}
          style={{ padding: '7px 13px', border: `1px solid ${trapsOn ? '#0F6E56' : '#d5ddda'}`, borderRadius: 8, background: trapsOn ? '#E7F7F0' : '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, color: trapsOn ? '#0b6b57' : '#334b45', fontWeight: trapsOn ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {trapsOn ? '✓' : '◯'} IoT traps
        </button>
      </div> */}

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
        {trapsOn && <IotStats />}
      </div>
    </div>
  );
}

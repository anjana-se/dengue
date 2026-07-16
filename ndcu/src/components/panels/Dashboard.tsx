import { useRef } from 'react';
import { AMBER, PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import PredAlert from './PredAlert';
import CaseStats from './CaseStats';
import AiRecommendations from './AiRecommendations';
import ZoneRiskTable from './ZoneRiskTable';
import Weather from './Weather';

const KPIS: [string, string, string, string][] = [
  ['Reports today', '37', '+8 vs yesterday', PRIMARY],
  ['High-risk zones', '4', '2 critical', AMBER],
  ['Open work orders', '19', '6 unassigned', '#3B82F6'],
  ['Avg risk score', '52', '▲ 4.2', '#DC2626'],
];

export default function Dashboard() {
  const casesOn = useStore((s) => s.layers.cases);
  const recRef = useRef<HTMLDivElement | null>(null);

  const scrollToRec = () => recRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {KPIS.map(([l, v, s, c]) => (
          <div key={l} style={{ background: '#fff', borderRadius: 12, padding: '13px 15px', border: '1px solid #e2e8e5' }}>
            <div style={{ fontSize: 12.5, color: '#6b7c77', fontWeight: 500 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c, margin: '3px 0 1px', letterSpacing: '-.02em' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: '#94a29d' }}>{s}</div>
          </div>
        ))}
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

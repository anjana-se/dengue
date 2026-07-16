import { PRIMARY, RISK } from '../../theme';
import Badge from '../common/Badge';
import { useStore } from '../../store/useStore';

export default function ZonePopup() {
  const z = useStore((s) => s.selZone);
  const selectZone = useStore((s) => s.selectZone);
  const setView = useStore((s) => s.setView);
  if (!z) return null;
  const r = RISK[z.risk_level];

  const stat = (value: number, label: string, color: string) => (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a29d', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        zIndex: 500,
        width: 250,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 6px 22px rgba(0,0,0,.2)',
        overflow: 'hidden',
        animation: 'dg-in .2s',
      }}
    >
      <div style={{ height: 4, background: r.c }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2d27' }}>{z.name}</div>
          <button
            onClick={() => selectZone(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a29d', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
          {stat(z.risk_score, 'Risk score', r.c)}
          {stat(z.active_report_count, 'Reports', '#0f2d27')}
          {stat(z.open_orders, 'Orders', '#0f2d27')}
        </div>
        <Badge level={z.risk_level} />
        <button
          onClick={() => {
            setView('reports');
            selectZone(null);
          }}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 12,
            padding: '8px',
            border: 'none',
            borderRadius: 7,
            background: PRIMARY,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          View reports
        </button>
      </div>
    </div>
  );
}

import { PRIMARY, RISK } from '../../theme';
import { timf } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import Drawer from '../common/Drawer';

export default function OrderDrawer() {
  const o = useStore((s) => s.activeOrder);
  const setActiveOrder = useStore((s) => s.setActiveOrder);
  const setDispatchOrder = useStore((s) => s.setDispatchOrder);
  const resolveWO = useStore((s) => s.resolveWO);
  if (!o) return null;

  const rk = RISK[o.risk_level];
  const meta: [string, string][] = [
    ['Assigned to', o.assigned_to ? o.assigned_to.name : 'Unassigned'],
    ['Confidence', o.confidence + '%'],
    ['Larvae visible', o.larvae_visible ? 'Yes ⚠' : 'No'],
    ['Created', timf(o.created_at)],
  ];

  return (
    <Drawer title={'Work order ' + o.wo_id} onClose={() => setActiveOrder(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{o.zone_name}</span>
        <Badge level={o.risk_level} />
      </div>
      <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 16 }}>
        {o.site_type} · Priority {o.priority_score}
      </div>

      <div
        style={{
          background: '#f4f7f6',
          borderRadius: 9,
          padding: '11px 13px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#94a29d' }}>Site GPS</div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {o.lat.toFixed(5)}, {o.lng.toFixed(5)}
          </div>
        </div>
        <a
          href={'https://maps.google.com/?q=' + o.lat + ',' + o.lng}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12.5, fontWeight: 600, color: PRIMARY }}
        >
          Open map →
        </a>
      </div>

      <div
        style={{
          background: rk.bg,
          borderLeft: '3px solid ' + rk.c,
          borderRadius: 8,
          padding: '11px 13px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: rk.c,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 4,
          }}
        >
          AI Guidance
        </div>
        <div style={{ fontSize: 13, color: '#334b45', lineHeight: 1.5 }}>{o.guidance_text}</div>
      </div>

      {o.ndcu_instructions && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94a29d',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 5,
            }}
          >
            NDCU Instructions
          </div>
          <div style={{ fontSize: 13, color: '#334b45', lineHeight: 1.5 }}>{o.ndcu_instructions}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {meta.map(([k, v]) => (
          <div key={k} style={{ background: '#f4f7f6', borderRadius: 8, padding: '8px 11px' }}>
            <div style={{ fontSize: 11, color: '#94a29d' }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {o.status !== 'resolved' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setDispatchOrder(o)}
            style={{
              flex: 1,
              padding: '11px',
              border: 'none',
              borderRadius: 9,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Assign team
          </button>
          <button
            onClick={() => resolveWO(o.wo_id)}
            style={{
              flex: 1,
              padding: '11px',
              border: '1px solid #10B981',
              borderRadius: 9,
              background: '#fff',
              color: '#0b6b57',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Mark resolved
          </button>
        </div>
      )}
    </Drawer>
  );
}

import { INC_STATUS, PRIMARY, RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';

export default function IncidentPopup() {
  const inc = useStore((s) => s.selIncident);
  const orders = useStore((s) => s.orders);
  const selectIncident = useStore((s) => s.selectIncident);
  const setActiveIncident = useStore((s) => s.setActiveIncident);
  const createWOFromIncident = useStore((s) => s.createWOFromIncident);
  if (!inc) return null;

  const st = INC_STATUS[inc.status];
  const hasWO = orders.some(
    (o) => o.incident_id === inc.incident_id || o.report_id === inc.primary_report_id,
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        zIndex: 500,
        width: 272,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 6px 22px rgba(0,0,0,.2)',
        overflow: 'hidden',
        animation: 'dg-in .2s',
      }}
    >
      <div style={{ height: 4, background: RISK[inc.risk_level].c }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d' }}>{inc.code}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f2d27', marginTop: 1 }}>{inc.zone_name}</div>
          </div>
          <button
            onClick={() => selectIncident(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a29d', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '9px 0' }}>
          <span style={{ padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.c, fontSize: 11, fontWeight: 700 }}>
            {st.label}
          </span>
          <Badge level={inc.risk_level} />
        </div>
        <div style={{ fontSize: 12.5, color: '#334b45', fontWeight: 600, marginBottom: 3 }}>
          {inc.confirmation_count > 1 ? inc.confirmation_count + ' reports confirm this site' : '1 report submitted'}
        </div>
        <div style={{ fontSize: 11.5, color: '#94a29d', marginBottom: 12 }}>First reported {tago(inc.created_at)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setActiveIncident(inc.incident_id);
              selectIncident(null);
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 7,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            View incident
          </button>
          {!hasWO && (
            <button
              onClick={() => createWOFromIncident(inc)}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid ' + PRIMARY,
                borderRadius: 7,
                background: '#fff',
                color: PRIMARY,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Create work order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

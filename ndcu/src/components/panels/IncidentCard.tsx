import { INC_STATUS, RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import type { Incident } from '../../types';

export default function IncidentCard({ inc }: { inc: Incident }) {
  const decisions = useStore((s) => s.decisions);
  const setActiveIncident = useStore((s) => s.setActiveIncident);
  const st = INC_STATUS[inc.status];
  const rk = RISK[inc.risk_level];
  const hasPending = decisions.some((d) => d.matched_incident_id === inc.incident_id && d.status === 'pending');

  return (
    <div
      onClick={() => setActiveIncident(inc.incident_id)}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #f2f5f4',
        cursor: 'pointer',
        opacity: inc.status === 'closed' ? 0.65 : 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 9,
          background: rk.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: rk.c, lineHeight: 1 }}>{inc.confirmation_count}</span>
        <span style={{ fontSize: 8.5, color: rk.c, fontWeight: 600 }}>{inc.confirmation_count > 1 ? 'reports' : 'report'}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f2d27' }}>{inc.code}</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {hasPending && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#b5730a', background: '#FEF5E6', padding: '1px 6px', borderRadius: 9 }}>
                review
              </span>
            )}
            <Badge level={inc.risk_level} />
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: '#6b7c77', marginTop: 2 }}>{inc.zone_name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, padding: '1px 8px', borderRadius: 10 }}>
            {st.label}
          </span>
          <span style={{ fontSize: 11.5, color: '#94a29d' }}>{tago(inc.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

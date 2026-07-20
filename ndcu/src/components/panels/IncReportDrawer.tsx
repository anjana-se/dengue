import { PRIMARY, RISK } from '../../theme';
import { datef } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import Drawer from '../common/Drawer';

/** Detail slide-over for a single report attached to an incident. */
export default function IncReportDrawer() {
  const r = useStore((s) => s.incReport);
  const incidents = useStore((s) => s.incidents);
  const setIncReport = useStore((s) => s.setIncReport);
  const setActiveIncident = useStore((s) => s.setActiveIncident);

  if (!r) return null;
  const rk = RISK[r.risk_level];
  const inc = incidents.find((x) => x.incident_id === r.incident_id);

  const row = (k: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f2f5f4' }}>
      <span style={{ fontSize: 12.5, color: '#94a29d' }}>{k}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27', textAlign: 'right' }}>{v}</span>
    </div>
  );

  return (
    <Drawer title={'Report ' + r.report_id} onClose={() => setIncReport(null)}>
      <div
        style={{
          height: 180,
          borderRadius: 12,
          background: 'linear-gradient(135deg,#cddbd6,#b3c9c2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 42,
          color: '#7c968e',
          marginBottom: 14,
        }}
      >
        {r.source_type === 'drone' ? '✈' : '📷'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f2d27' }}>{r.role}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: r.primary ? PRIMARY : '#94a29d',
              background: r.primary ? '#E7F7F0' : '#f2f5f4',
              padding: '2px 9px',
              borderRadius: 11,
            }}
          >
            {r.primary ? 'First report' : 'Confirmation ' + r.report_id.split('-C')[1]}
          </span>
          <Badge level={r.risk_level} />
        </div>
      </div>

      {inc && (
        <div style={{ fontSize: 12.5, color: '#6b7c77', marginBottom: 14 }}>
          Part of incident{' '}
          <a
            href="javascript:void(0)"
            onClick={() => {
              setIncReport(null);
              setActiveIncident(inc.incident_id);
            }}
            style={{ color: PRIMARY, fontWeight: 600 }}
          >
            {inc.code}
          </a>{' '}
          · {r.zone_name}
        </div>
      )}

      <div style={{ background: '#f7f9f8', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            AI analysis
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>{r.confidence}%</span>
        </div>
        <div style={{ height: 6, background: '#e6ece9', borderRadius: 4, overflow: 'hidden', marginBottom: 9 }}>
          <div style={{ width: r.confidence + '%', height: '100%', background: PRIMARY }} />
        </div>
        <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>
          {'Detected a ' +
            rk.label.toLowerCase() +
            '-risk ' +
            r.site_type.toLowerCase() +
            '. ' +
            (r.larvae_visible
              ? 'Larvae visible in standing water — active breeding site.'
              : r.water_present
                ? 'Standing water present; monitor for larval development.'
                : 'No standing water at time of capture.')}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
          Report details
        </div>
        {row('Report ID', r.report_id)}
        {row('Source', r.source_type === 'drone' ? 'Drone capture' : 'Community report')}
        {row('Site type', r.site_type)}
        {row('Larvae visible', r.larvae_visible ? 'Yes' : 'No')}
        {row('Standing water', r.water_present ? 'Yes' : 'No')}
        {row('Submitted', datef(r.submitted_at))}
        {row('Location', r.lat.toFixed(4) + ', ' + r.lng.toFixed(4))}
      </div>

      {r.notes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
            Field notes
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#334b45',
              lineHeight: 1.5,
              fontStyle: 'italic',
              background: '#f7f9f8',
              borderLeft: '3px solid #d5ddda',
              borderRadius: 6,
              padding: '9px 12px',
            }}
          >
            “{r.notes}”
          </div>
        </div>
      )}
    </Drawer>
  );
}

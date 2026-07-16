import { RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import ReportDrawer from './ReportDrawer';

export default function Reports() {
  const reports = useStore((s) => s.reports);
  const activeReport = useStore((s) => s.activeReport);
  const setActiveReport = useStore((s) => s.setActiveReport);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8e5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid #eef1f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>Report Feed</span>
        <span style={{ fontSize: 12, color: '#94a29d' }}>{reports.length} reports</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {reports.map((r) => (
          <div
            key={r.report_id}
            onClick={() => setActiveReport(r)}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid #f2f5f4',
              cursor: 'pointer',
              animation: r._new ? 'dg-in .4s' : 'none',
              background: r._new ? '#fbfdfc' : '#fff',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 9,
                background: 'linear-gradient(135deg,#dbe7e3,#c4d6d0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
                color: '#5c7a72',
              }}
            >
              {r.source_type === 'drone' ? '✈' : '📷'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.site_type}</span>
                <Badge level={r.risk_level} />
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7c77', marginTop: 2 }}>
                {r.zone_name} · {r.confidence}% conf.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 11.5, color: '#94a29d' }}>
                  {r.status === 'processing' ? '⏳ Processing…' : r.source_type === 'drone' ? 'Drone capture' : 'Community report'}
                </span>
                <span style={{ fontSize: 11.5, color: '#94a29d' }}>{tago(r.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeReport && <ReportDrawer />}
    </div>
  );
}

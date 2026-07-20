import { RISK } from '../../theme';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';

const HEADERS = ['Zone', 'Risk', 'Score', 'Reports', 'Orders'];

export default function ZoneRiskTable() {
  const zones = useStore((s) => s.zones);
  const selectZone = useStore((s) => s.selectZone);

  const sorted = zones
    .filter((z) => z.risk_score > 0 || z.active_report_count > 0)
    .sort((a, b) => b.risk_score - a.risk_score);

  if (sorted.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', padding: '20px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Zone Risk Ranking</div>
        <div style={{ fontSize: 13, color: '#94a29d', textAlign: 'center', padding: '12px 0' }}>
          No active risk zones detected. All monitored zones are clear.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Zone Risk Ranking</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>click to inspect on map</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#94a29d', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {HEADERS.map((c, i) => (
              <th key={c} style={{ textAlign: i > 1 ? 'right' : 'left', padding: '8px 16px', fontWeight: 600 }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((z) => {
            const r = RISK[z.risk_level] || RISK.low;
            return (
              <tr
                key={z.zone_id}
                onClick={() => selectZone(z)}
                style={{ cursor: 'pointer', borderTop: '1px solid #f2f5f4' }}
                title={`Click to highlight ${z.name} on the map`}
              >
                <td style={{ padding: '9px 16px', fontWeight: 600 }}>{z.name}</td>
                <td style={{ padding: '9px 16px' }}>
                  <Badge level={z.risk_level} />
                </td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                    <div style={{ width: 44, height: 6, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: z.risk_score + '%', height: '100%', background: r.c }} />
                    </div>
                    <span style={{ fontWeight: 700, color: r.c, width: 22 }}>{z.risk_score}</span>
                  </div>
                </td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}>{z.active_report_count}</td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                  <span style={{ color: z.open_orders > 0 ? '#EF4444' : '#94a29d', fontWeight: z.open_orders > 0 ? 700 : 400 }}>
                    {z.open_orders}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

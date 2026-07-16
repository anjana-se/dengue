import { PRIMARY, RISK } from '../../theme';
import Badge from '../common/Badge';
import { useStore } from '../../store/useStore';

export default function ZonePopup() {
  const z = useStore((s) => s.selZone);
  const selectZone = useStore((s) => s.selectZone);
  const setView = useStore((s) => s.setView);
  const setDispatchOrder = useStore((s) => s.setDispatchOrder);
  const orders = useStore((s) => s.orders);
  const role = useStore((s) => s.role);

  if (!z) return null;
  const r = RISK[z.risk_level] || RISK.low;

  // Check if there are open unassigned orders in this zone
  const zoneOrders = orders.filter((o) => o.zone_id === z.zone_id && o.status !== 'resolved');
  const unassignedOrders = zoneOrders.filter((o) => o.status === 'new');

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
        width: 264,
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
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2d27', lineHeight: 1.2 }}>{z.meta_name || z.name}</div>
            {z.meta_district && (
              <div style={{ fontSize: 10.5, color: '#6b7c77', marginTop: 3, fontWeight: 500 }}>
                {z.meta_district} District{z.meta_province ? ` · ${z.meta_province} Province` : ''}
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              <Badge level={z.risk_level} />
            </div>
          </div>
          <button
            onClick={() => selectZone(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a29d', lineHeight: 1, marginTop: -2 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, margin: '14px 0 12px' }}>
          {stat(z.risk_score, 'Risk score', r.c)}
          {stat(z.active_report_count, 'Reports', '#0f2d27')}
          {stat(z.open_orders, 'Open orders', z.open_orders > 0 ? '#EF4444' : '#0f2d27')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button
            onClick={() => {
              setView('reports');
              selectZone(null);
            }}
            style={{
              display: 'block',
              width: '100%',
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

          {role !== 'drone_operator' && (
            <button
              onClick={() => {
                setView('workorders');
                selectZone(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                border: '1px solid #d5ddda',
                borderRadius: 7,
                background: '#fff',
                color: '#334b45',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Work orders {zoneOrders.length > 0 ? `(${zoneOrders.length})` : ''}
            </button>
          )}

          {role === 'ndcu_admin' && unassignedOrders.length > 0 && (
            <button
              onClick={() => {
                setDispatchOrder(unassignedOrders[0]);
                selectZone(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                border: `1px solid ${r.c}`,
                borderRadius: 7,
                background: r.bg,
                color: r.c,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ⚡ Dispatch team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

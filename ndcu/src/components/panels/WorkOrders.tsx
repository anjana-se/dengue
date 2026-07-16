import { RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import OrderDrawer from './OrderDrawer';
import type { WorkOrderStatus } from '../../types';

const STATUS_PILL: Record<WorkOrderStatus, [string, string, string]> = {
  new: ['#3B82F6', '#ECF3FE', 'New'],
  assigned: ['#8B5CF6', '#F1EDFE', 'Assigned'],
  in_progress: ['#F59E0B', '#FEF5E6', 'In progress'],
  resolved: ['#10B981', '#E7F7F0', 'Resolved'],
};

const HEADERS = ['Priority', 'Zone', 'Site type', 'Assigned', 'Status', 'Created'];

function Pill({ status }: { status: WorkOrderStatus }) {
  const m = STATUS_PILL[status];
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, background: m[1], color: m[0], fontSize: 11.5, fontWeight: 700 }}>
      {m[2]}
    </span>
  );
}

export default function WorkOrders() {
  const orders = useStore((s) => s.orders);
  const activeOrder = useStore((s) => s.activeOrder);
  const setActiveOrder = useStore((s) => s.setActiveOrder);

  const sorted = [...orders].sort((a, b) => b.priority_score - a.priority_score);

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
        <span style={{ fontSize: 15, fontWeight: 600 }}>Work Orders</span>
        <span style={{ fontSize: 12, color: '#94a29d' }}>sorted by priority</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                background: '#fff',
                color: '#94a29d',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                zIndex: 1,
              }}
            >
              {HEADERS.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600, borderBottom: '1px solid #eef1f0' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => {
              const rk = RISK[o.risk_level];
              return (
                <tr
                  key={o.wo_id}
                  onClick={() => setActiveOrder(o)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f2f5f4' }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 6, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: o.priority_score + '%', height: '100%', background: rk.c }} />
                      </div>
                      <span style={{ fontWeight: 700, color: rk.c }}>{o.priority_score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{o.zone_name}</td>
                  <td style={{ padding: '10px 14px', color: '#334b45' }}>{o.site_type}</td>
                  <td
                    style={{
                      padding: '10px 14px',
                      color: o.assigned_to ? '#334b45' : '#c0392b',
                      fontWeight: o.assigned_to ? 400 : 600,
                    }}
                  >
                    {o.assigned_to ? o.assigned_to.name : 'Unassigned'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Pill status={o.status} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a29d', fontSize: 12 }}>{tago(o.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeOrder && <OrderDrawer />}
    </div>
  );
}

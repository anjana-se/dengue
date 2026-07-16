import { useState } from 'react';
import { RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import type { WorkOrderStatus } from '../../types';

const STATUS_PILL: Record<WorkOrderStatus, [string, string, string]> = {
  new: ['#3B82F6', '#ECF3FE', 'New'],
  assigned: ['#8B5CF6', '#F1EDFE', 'Assigned'],
  in_progress: ['#F59E0B', '#FEF5E6', 'In progress'],
  resolved: ['#10B981', '#E7F7F0', 'Resolved'],
};

function Pill({ status }: { status: WorkOrderStatus }) {
  const m = STATUS_PILL[status] || STATUS_PILL.new;
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, background: m[1], color: m[0], fontSize: 11.5, fontWeight: 700 }}>
      {m[2]}
    </span>
  );
}

const HEADERS = ['Priority', 'Zone', 'Site type', 'Assigned', 'Status', 'Created', ''];

export default function WorkOrders() {
  const orders = useStore((s) => s.orders);
  const role = useStore((s) => s.role);
  const setActiveOrder = useStore((s) => s.setActiveOrder);
  const setDispatchOrder = useStore((s) => s.setDispatchOrder);
  const resolveWO = useStore((s) => s.resolveWO);
  const acceptWO = useStore((s) => s.acceptWO);

  const [filter, setFilter] = useState<'all' | 'new' | 'assigned' | 'in_progress' | 'resolved'>('all');

  const filtered = [...orders]
    .filter((o) => filter === 'all' || o.status === filter)
    .sort((a, b) => b.priority_score - a.priority_score);

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
      {/* Header */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Work Orders</span>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'new', 'assigned', 'in_progress', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 11px',
                border: `1px solid ${filter === f ? '#0b6b57' : '#d5ddda'}`,
                borderRadius: 20,
                background: filter === f ? '#E7F7F0' : '#fff',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 11.5,
                fontWeight: filter === f ? 700 : 500,
                color: filter === f ? '#0b6b57' : '#6b7c77',
              }}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: '#94a29d' }}>{filtered.length} orders</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a29d', fontSize: 14 }}>
            No work orders found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: '#fff', color: '#94a29d', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', zIndex: 1 }}>
                {HEADERS.map((c) => (
                  <th key={c} style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600, borderBottom: '1px solid #eef1f0' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const rk = RISK[o.risk_level] || RISK.low;
                return (
                  <tr
                    key={o.wo_id}
                    style={{ borderBottom: '1px solid #f2f5f4', cursor: 'pointer' }}
                    onClick={() => setActiveOrder(o)}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 40, height: 6, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: Math.min(100, o.priority_score) + '%', height: '100%', background: rk.c }} />
                        </div>
                        <span style={{ fontWeight: 700, color: rk.c }}>{o.priority_score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{o.zone_name}</td>
                    <td style={{ padding: '10px 14px', color: '#334b45' }}>{o.site_type}</td>
                    <td style={{ padding: '10px 14px', color: o.assigned_to ? '#334b45' : '#c0392b', fontWeight: o.assigned_to ? 400 : 600 }}>
                      {o.assigned_to ? o.assigned_to.name : 'Unassigned'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Pill status={o.status} />
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a29d', fontSize: 12 }}>
                      {tago(o.created_at)}
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* PHI: accept new orders */}
                        {role === 'phi' && o.status === 'new' && (
                          <button
                            onClick={() => acceptWO(o.wo_id)}
                            style={{ padding: '5px 11px', border: '1px solid #3B82F6', borderRadius: 6, background: '#EFF6FF', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', color: '#2563EB', fontWeight: 600 }}
                          >
                            Accept
                          </button>
                        )}
                        {/* PHI: resolve in-progress orders */}
                        {role === 'phi' && (o.status === 'in_progress' || o.status === 'assigned') && (
                          <button
                            onClick={() => resolveWO(o.wo_id)}
                            style={{ padding: '5px 11px', border: '1px solid #10B981', borderRadius: 6, background: '#E7F7F0', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', color: '#0b6b57', fontWeight: 600 }}
                          >
                            Resolve
                          </button>
                        )}
                        {/* Admin: dispatch unassigned */}
                        {role === 'ndcu_admin' && o.status !== 'resolved' && (
                          <button
                            onClick={() => setDispatchOrder(o)}
                            style={{ padding: '5px 11px', border: '1px solid #d5ddda', borderRadius: 6, background: '#f4f7f6', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', color: '#334b45' }}
                          >
                            Dispatch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

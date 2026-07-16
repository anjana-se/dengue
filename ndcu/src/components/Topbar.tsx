import { AMBER } from '../theme';
import { useStore } from '../store/useStore';
import type { ViewKey } from '../types';

const TITLES: Record<ViewKey, string> = {
  dashboard: 'Operations Dashboard',
  reports: 'Incoming Reports',
  workorders: 'Work Orders',
  drone: 'Drone Missions',
  chat: 'AI Assistant',
  users: 'User Management',
};

export default function Topbar() {
  const view = useStore((s) => s.view);
  const liveOn = useStore((s) => s.liveOn);
  const toggleLive = useStore((s) => s.toggleLive);
  const fetchData = useStore((s) => s.fetchData);
  const reports = useStore((s) => s.reports);
  const orders = useStore((s) => s.orders);
  const role = useStore((s) => s.role);
  const currentUser = useStore((s) => s.currentUser);

  const pendingReview = reports.filter((r) => r.needs_human_review).length;
  const openOrders = orders.filter((o) => o.status !== 'resolved').length;

  return (
    <div
      style={{
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #e2e8e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: '#94a29d', fontWeight: 500 }}>
          NDCU · Colombo District
          {currentUser?.assigned_zone_id ? ' · Zone assigned' : ''}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f2d27', letterSpacing: '-.01em' }}>
          {TITLES[view]}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Stat badges */}
        {role !== 'drone_operator' && (
          <>
            {pendingReview > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  background: '#FEF5E6',
                  border: `1px solid ${AMBER}`,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#b5730a',
                  cursor: 'default',
                }}
                title="Reports needing human review"
              >
                <span>⚠</span>
                {pendingReview} review{pendingReview !== 1 ? 's' : ''}
              </div>
            )}
            {openOrders > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#2563EB',
                  cursor: 'default',
                }}
                title="Open work orders"
              >
                <span>▤</span>
                {openOrders} open
              </div>
            )}
          </>
        )}

        {/* Manual refresh */}
        <button
          onClick={() => fetchData()}
          title="Refresh data"
          style={{
            padding: '6px 11px',
            border: '1px solid #e2e8e5',
            borderRadius: 20,
            background: '#f4f6f5',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: '#6b7c77',
          }}
        >
          ↻
        </button>

        {/* Live toggle */}
        <button
          onClick={() => toggleLive()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 12px',
            border: '1px solid #e2e8e5',
            borderRadius: 20,
            background: liveOn ? '#E7F7F0' : '#f4f6f5',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            color: liveOn ? '#0b6b57' : '#94a29d',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: liveOn ? '#10B981' : '#c3cdc9',
              display: 'inline-block',
              animation: liveOn ? 'dg-pulse 2s infinite' : 'none',
            }}
          />
          {liveOn ? 'Live' : 'Paused'}
        </button>
      </div>
    </div>
  );
}

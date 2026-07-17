import { AMBER, PRIMARY } from '../theme';
import { pendingDecisions, useStore } from '../store/useStore';
import type { DashLayout, ViewKey } from '../types';

const TITLES: Record<ViewKey, string> = {
  dashboard: 'Operations Dashboard',
  reports: 'Incoming Reports',
  workorders: 'Work Orders',
  drone: 'Drone Missions',
  chat: 'AI Assistant',
  users: 'User Management',
};

const DEMO_HELP =
  'Demo mode plays simulated live events (new reports, duplicate flags, incident updates) so you can see the portal react without real field data. Live feed shows real-time device updates — pause to freeze the view.';

export default function Topbar({ mapCapable }: { mapCapable: boolean }) {
  const view = useStore((s) => s.view);
  const dashLayout = useStore((s) => s.dashLayout);
  const demoMode = useStore((s) => s.demoMode);
  const liveOn = useStore((s) => s.liveOn);
  const setDashLayout = useStore((s) => s.setDashLayout);
  const toggleDemo = useStore((s) => s.toggleDemo);
  const toggleLive = useStore((s) => s.toggleLive);
  const fetchData = useStore((s) => s.fetchData);
  const toast = useStore((s) => s.toast);
  const currentUser = useStore((s) => s.currentUser);
  const decisions = useStore((s) => s.decisions);
  const pendingCount = pendingDecisions(decisions).length;

  const lbtn = (m: DashLayout, ic: string, tip: string) => (
    <button
      key={m}
      title={tip}
      onClick={() => setDashLayout(m)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 26,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 13,
        background: dashLayout === m ? '#fff' : 'transparent',
        color: dashLayout === m ? PRIMARY : '#94a29d',
        boxShadow: dashLayout === m ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
      }}
    >
      {ic}
    </button>
  );

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
        {/* Pending reviews badge */}
        {pendingCount > 0 && (
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
            title="AI duplicate decisions needing review"
          >
            <span>⚠</span>
            {pendingCount} review{pendingCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Map layout switcher */}
        {mapCapable && (
          <div title="Adjust layout — map-first, split, or stats-first" style={{ display: 'flex', gap: 2, background: '#f0f3f2', padding: 3, borderRadius: 8 }}>
            {lbtn('map', '▭', 'Map only')}
            {lbtn('split', '▥', 'Split view')}
            {lbtn('stats', '▤', 'Stats only')}
          </div>
        )}

        {/* Help */}
        <button
          onClick={() => toast(DEMO_HELP, 'info')}
          title="What do Demo and Live mean?"
          style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #e2e8e5', background: '#f4f6f5', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#94a29d' }}
        >
          ?
        </button>

        {/* Demo toggle */}
        <button
          onClick={() => toggleDemo()}
          title="Play simulated live events for demonstrations (mock data, not real field reports)."
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 11px',
            border: '1px solid ' + (demoMode ? AMBER : '#e2e8e5'),
            borderRadius: 20,
            background: demoMode ? '#FEF5E6' : '#f4f6f5',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 600,
            color: demoMode ? '#b5730a' : '#94a29d',
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>⚡</span>
          {demoMode ? 'Demo: on' : 'Demo'}
        </button>

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
          title="Real-time updates from field devices. Pause to freeze the current view."
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

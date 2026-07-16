import { AMBER } from '../theme';
import { useStore } from '../store/useStore';
import type { ViewKey } from '../types';

const TITLES: Record<ViewKey, string> = {
  dashboard: 'Operations Dashboard',
  reports: 'Incoming Reports',
  workorders: 'Work Orders',
  drone: 'Drone Missions',
  chat: 'AI Assistant',
};

export default function Topbar() {
  const view = useStore((s) => s.view);
  const demoMode = useStore((s) => s.demoMode);
  const liveOn = useStore((s) => s.liveOn);
  const toggleDemo = useStore((s) => s.toggleDemo);
  const toggleLive = useStore((s) => s.toggleLive);

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
        <div style={{ fontSize: 11.5, color: '#94a29d', fontWeight: 500 }}>NDCU · Colombo District</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f2d27', letterSpacing: '-.01em' }}>
          {TITLES[view]}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => toggleDemo()}
          title="Demo mode (mock data)"
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
          {demoMode ? 'Demo on' : 'Demo'}
        </button>

        <button
          onClick={() => toggleLive()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 11px',
            border: '1px solid #e2e8e5',
            borderRadius: 20,
            background: liveOn ? '#E7F7F0' : '#f4f6f5',
            cursor: 'pointer',
            fontFamily: 'Inter',
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

        <div style={{ position: 'relative', fontSize: 19, cursor: 'pointer', color: '#0f2d27' }}>
          🔔
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -4,
              width: 15,
              height: 15,
              borderRadius: '50%',
              background: AMBER,
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            3
          </span>
        </div>
      </div>
    </div>
  );
}

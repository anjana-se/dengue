import { PRIMARY } from '../theme';
import { useStore } from '../store/useStore';
import type { Role, ViewKey } from '../types';

const ITEMS: [ViewKey, string, string][] = [
  ['dashboard', 'Dashboard', '▦'],
  ['reports', 'Reports', '◉'],
  ['workorders', 'Work Orders', '▤'],
  ['drone', 'Drone Missions', '✈'],
  ['chat', 'Assistant', '✦'],
];

const ROLE_LABEL: Record<Role, string> = {
  ndcu_admin: 'NDCU Admin',
  phi: 'PHI Officer',
  drone_operator: 'Drone Operator',
};

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const role = useStore((s) => s.role);
  const setView = useStore((s) => s.setView);
  const logout = useStore((s) => s.logout);

  return (
    <div
      style={{
        width: 220,
        background: PRIMARY,
        color: '#cfe3dd',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '18px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: '#fff',
            color: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          D
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>
          DengueGuard
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {ITEMS.map(([k, lbl, ic]) => {
          const on = view === k;
          return (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                padding: '10px 12px',
                marginBottom: 3,
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: on ? 600 : 500,
                textAlign: 'left',
                background: on ? 'rgba(255,255,255,.12)' : 'transparent',
                color: on ? '#fff' : '#a7c6bd',
              }}
            >
              <span style={{ width: 18, textAlign: 'center', fontSize: 14, opacity: 0.9 }}>{ic}</span>
              {lbl}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: '#fff',
              fontSize: 13,
            }}
          >
            OA
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
              O. Abeywardena
            </div>
            <div style={{ fontSize: 11, color: '#7fb0a4' }}>{ROLE_LABEL[role]}</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          style={{
            width: '100%',
            padding: '7px',
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 7,
            background: 'transparent',
            color: '#a7c6bd',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

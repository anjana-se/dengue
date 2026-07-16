import { PRIMARY } from '../theme';
import { useStore, allowedViews } from '../store/useStore';
import type { Role, ViewKey } from '../types';

const ALL_ITEMS: { key: ViewKey; label: string; icon: string; desc: string }[] = [
  { key: 'dashboard',  label: 'Dashboard',      icon: '▦',  desc: 'Overview & analytics' },
  { key: 'reports',    label: 'Reports',         icon: '◉',  desc: 'Incoming breeding sites' },
  { key: 'workorders', label: 'Work Orders',     icon: '▤',  desc: 'Field team tasks' },
  { key: 'drone',      label: 'Drone Missions',  icon: '✈',  desc: 'Aerial surveys' },
  { key: 'chat',       label: 'AI Assistant',    icon: '✦',  desc: 'Gemini-powered guidance' },
  { key: 'users',      label: 'User Management', icon: '⊙',  desc: 'Staff accounts & roles' },
];

const ROLE_LABEL: Record<Role, string> = {
  ndcu_admin: 'NDCU Admin',
  phi: 'PHI Field Officer',
  drone_operator: 'Drone Operator',
};

const ROLE_COLOR: Record<Role, string> = {
  ndcu_admin: '#10B981',
  phi: '#3B82F6',
  drone_operator: '#F59E0B',
};

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const role = useStore((s) => s.role);
  const currentUser = useStore((s) => s.currentUser);
  const setView = useStore((s) => s.setView);
  const logout = useStore((s) => s.logout);

  const visible = ALL_ITEMS.filter((i) => allowedViews(role).includes(i.key));
  const initials = (currentUser?.full_name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      style={{
        width: 224,
        background: PRIMARY,
        color: '#cfe3dd',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: '#fff',
            color: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 17,
          }}
        >
          D
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 }}>
            DengueGuard
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
            Operations Portal
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {visible.map(({ key, label, icon }) => {
          const on = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                padding: '10px 12px',
                marginBottom: 2,
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 13.5,
                fontWeight: on ? 700 : 500,
                textAlign: 'left',
                background: on ? 'rgba(255,255,255,.13)' : 'transparent',
                color: on ? '#fff' : '#8db8ae',
                transition: 'background .15s, color .15s',
              }}
            >
              <span style={{ width: 20, textAlign: 'center', fontSize: 15, opacity: 0.9, flexShrink: 0 }}>
                {icon}
              </span>
              {label}
              {on && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#fff',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.14)',
              border: `2px solid ${ROLE_COLOR[role]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.full_name || 'Staff User'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: ROLE_COLOR[role],
                fontWeight: 600,
              }}
            >
              {ROLE_LABEL[role]}
            </div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 8,
            background: 'transparent',
            color: '#8db8ae',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12.5,
            fontWeight: 500,
            transition: 'background .15s',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

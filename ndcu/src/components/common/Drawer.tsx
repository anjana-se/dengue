import type { ReactNode } from 'react';

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Right-hand slide-over panel used for report / work-order detail. */
export default function Drawer({ title, onClose, children }: DrawerProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,30,26,.35)' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#fff',
          boxShadow: '-8px 0 30px rgba(0,0,0,.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'dg-slide .28s ease-out',
        }}
      >
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid #eef1f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#94a29d',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f2f5f4',
              width: 28,
              height: 28,
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 16,
              color: '#6b7c77',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

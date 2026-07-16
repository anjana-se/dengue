import { useStore } from '../store/useStore';
import type { ToastKind } from '../types';

const COL: Record<ToastKind, [string, string]> = {
  success: ['#10B981', '#E7F7F0'],
  error: ['#DC2626', '#FEECEC'],
  info: ['#3B82F6', '#ECF3FE'],
};

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      {toasts.map((t) => {
        const c = COL[t.kind] ?? COL.info;
        return (
          <div
            key={t.id}
            style={{
              minWidth: 240,
              maxWidth: 320,
              padding: '11px 15px',
              borderRadius: 10,
              background: '#fff',
              borderLeft: '3px solid ' + c[0],
              boxShadow: '0 6px 22px rgba(0,0,0,.15)',
              fontSize: 13,
              fontWeight: 500,
              color: '#0f2d27',
              animation: 'dg-in .25s',
            }}
          >
            {t.t}
          </div>
        );
      })}
    </div>
  );
}

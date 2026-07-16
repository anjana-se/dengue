import { useRef } from 'react';
import { PRIMARY } from '../../theme';
import { PHIS } from '../../data/zones';
import { useStore } from '../../store/useStore';

export default function DispatchModal() {
  const o = useStore((s) => s.dispatchOrder);
  const setDispatchOrder = useStore((s) => s.setDispatchOrder);
  const dispatch = useStore((s) => s.dispatch);
  const selRef = useRef<HTMLSelectElement | null>(null);
  const instrRef = useRef<HTMLTextAreaElement | null>(null);
  if (!o) return null;

  const close = () => setDispatchOrder(null);
  const confirm = () => {
    const p = PHIS.find((x) => x.user_id === selRef.current?.value) ?? PHIS[0];
    dispatch(o.wo_id, p, instrRef.current?.value ?? '');
  };

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,30,26,.45)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 430,
          background: '#fff',
          borderRadius: 14,
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
          animation: 'dg-in .25s',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Dispatch team</div>
        <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 18 }}>
          {o.zone_name} · {o.site_type}
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>
          Assign PHI officer
        </label>
        <select
          ref={selRef}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'Inter',
            marginBottom: 14,
            background: '#fff',
          }}
        >
          {PHIS.map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.name}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>
          NDCU instructions
        </label>
        <textarea
          ref={instrRef}
          rows={3}
          placeholder="Add dispatch notes for the field team…"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            fontSize: 13.5,
            fontFamily: 'Inter',
            resize: 'vertical',
            marginBottom: 18,
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{
              padding: '10px 18px',
              border: '1px solid #d5ddda',
              borderRadius: 9,
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: 600,
              color: '#334b45',
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderRadius: 9,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Confirm dispatch
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { PRIMARY } from '../../theme';
import { siteTypeLabel } from '../../utils/format';
import { useStore } from '../../store/useStore';
import type { Phi } from '../../types';

export default function DispatchModal() {
  const o = useStore((s) => s.dispatchOrder);
  const staffUsers = useStore((s) => s.staffUsers);
  const fetchStaffUsers = useStore((s) => s.fetchStaffUsers);
  const setDispatchOrder = useStore((s) => s.setDispatchOrder);
  const dispatch = useStore((s) => s.dispatch);
  const selRef = useRef<HTMLSelectElement | null>(null);
  const instrRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (o && staffUsers.length === 0) {
      fetchStaffUsers().catch(() => {});
    }
  }, [o, staffUsers.length, fetchStaffUsers]);

  if (!o) return null;

  // Only PHI officers can be assigned
  const phis: Phi[] = staffUsers
    .filter((u) => u.role === 'phi' && u.is_active)
    .map((u) => ({ user_id: u.id, name: u.full_name }));

  const close = () => setDispatchOrder(null);

  const confirm = () => {
    const selectedId = selRef.current?.value;
    const phi = phis.find((p) => p.user_id === selectedId) ?? phis[0] ?? null;
    if (!phi) {
      alert('No PHI officer selected or available.');
      return;
    }
    dispatch(o.wo_id, phi, instrRef.current?.value ?? '');
  };

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,26,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,.35)', animation: 'dg-in .25s' }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Dispatch team</div>
        <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 20 }}>
          {o.zone_name} · {siteTypeLabel(o.site_type)}
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>
          Assign PHI officer
        </label>
        {phis.length === 0 ? (
          <div style={{ padding: '12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#c0392b', marginBottom: 14 }}>
            No active PHI officers available. Create PHI accounts in User Management first.
          </div>
        ) : (
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
            {phis.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.name}</option>
            ))}
          </select>
        )}

        <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>
          NDCU instructions (optional)
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
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{ padding: '10px 18px', border: '1px solid #d5ddda', borderRadius: 9, background: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, color: '#334b45' }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={phis.length === 0}
            style={{ padding: '10px 20px', border: 'none', borderRadius: 9, background: phis.length > 0 ? PRIMARY : '#b2c8c2', color: '#fff', cursor: phis.length > 0 ? 'pointer' : 'default', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600 }}
          >
            Confirm dispatch
          </button>
        </div>
      </div>
    </div>
  );
}

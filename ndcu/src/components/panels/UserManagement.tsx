import { useState } from 'react';
import { PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import type { StaffUser, Role } from '../../types';

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ndcu_admin', label: 'NDCU Admin' },
  { value: 'phi', label: 'PHI Field Officer' },
  { value: 'drone_operator', label: 'Drone Operator' },
];

const ROLE_BADGE: Record<Role, [string, string]> = {
  ndcu_admin: ['#0b6b57', '#E7F7F0'],
  phi: ['#2563EB', '#EFF6FF'],
  drone_operator: ['#b45309', '#FEF5E6'],
};

function RoleBadge({ role }: { role: Role }) {
  const [c, bg] = ROLE_BADGE[role] || ['#94a29d', '#f4f7f6'];
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, background: bg, color: c, fontSize: 11.5, fontWeight: 700 }}>
      {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
    </span>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '9px 11px',
  border: '1.5px solid #d5ddda',
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: 'Inter, system-ui, sans-serif',
  outline: 'none',
  marginBottom: 10,
  boxSizing: 'border-box' as const,
};

interface NewUserForm {
  email: string;
  password: string;
  full_name: string;
  role: string;
  language_preference: string;
}

const EMPTY_FORM: NewUserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'phi',
  language_preference: 'en',
};

export default function UserManagement() {
  const staffUsers = useStore((s) => s.staffUsers);
  const registerStaff = useStore((s) => s.registerStaff);
  const updateStaff = useStore((s) => s.updateStaff);
  const fetchStaffUsers = useStore((s) => s.fetchStaffUsers);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) return;
    setSubmitting(true);
    try {
      await registerStaff(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleEditOpen = (u: StaffUser) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditActive(u.is_active);
    setEditPassword('');
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const data: any = { role: editRole, is_active: editActive };
      if (editPassword.length >= 8) data.password = editPassword;
      await updateStaff(editUser.id, data);
      setEditUser(null);
    } catch {}
    finally { setSubmitting(false); }
  };

  const timf = (d: string | null) => {
    if (!d) return 'Never';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 14, overflowY: 'auto' }}>

      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8e5',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2d27' }}>Staff Accounts</div>
          <div style={{ fontSize: 12.5, color: '#6b7c77', marginTop: 2 }}>
            {staffUsers.length} accounts · Manage roles and access
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fetchStaffUsers()}
            style={{ padding: '8px 14px', border: '1px solid #d5ddda', borderRadius: 8, background: '#f4f7f6', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter', color: '#334b45' }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: 'Inter',
            }}
          >
            {showForm ? '✕ Cancel' : '+ New staff'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8e5',
            padding: '20px 24px',
            animation: 'dg-in .2s',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#0f2d27' }}>
            Create new staff account
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 5 }}>Full name *</label>
              <input
                required
                placeholder="Kasun Perera"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 5 }}>Email *</label>
              <input
                required
                type="email"
                placeholder="kasun@ndcu.gov.lk"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 5 }}>Password * (min 8 chars)</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 5 }}>Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                style={{ ...fieldStyle, background: '#fff' }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 5 }}>Language</label>
              <select
                value={form.language_preference}
                onChange={(e) => setForm((f) => ({ ...f, language_preference: e.target.value }))}
                style={{ ...fieldStyle, background: '#fff' }}
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              style={{ padding: '9px 18px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, fontFamily: 'Inter', color: '#334b45' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', cursor: submitting ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter' }}
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      )}

      {/* Staff table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden', flex: 1 }}>
        {staffUsers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a29d', fontSize: 14 }}>
            No staff accounts found. Click "New staff" to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8faf9', color: '#94a29d', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {['Name', 'Email', 'Role', 'Status', 'Last login', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, borderBottom: '1px solid #eef1f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f2f5f4' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f2d27' }}>{u.full_name}</td>
                  <td style={{ padding: '12px 16px', color: '#334b45' }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <RoleBadge role={u.role as Role} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                      background: u.is_active ? '#E7F7F0' : '#fef2f2',
                      color: u.is_active ? '#0b6b57' : '#c0392b',
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7c77', fontSize: 12 }}>
                    {timf(u.last_login_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleEditOpen(u)}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid #d5ddda',
                        borderRadius: 7,
                        background: '#f4f7f6',
                        cursor: 'pointer',
                        fontFamily: 'Inter',
                        fontSize: 12.5,
                        color: '#334b45',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div
          onClick={() => setEditUser(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,26,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 440, background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,.35)', animation: 'dg-in .2s' }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Edit staff account</div>
            <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 20 }}>
              {editUser.full_name} · {editUser.email}
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              style={{ ...fieldStyle, background: '#fff' }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>Account status</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setEditActive(val)}
                  style={{
                    flex: 1,
                    padding: '9px',
                    border: `1.5px solid ${editActive === val ? (val ? '#10B981' : '#EF4444') : '#d5ddda'}`,
                    borderRadius: 8,
                    background: editActive === val ? (val ? '#E7F7F0' : '#fef2f2') : '#fff',
                    cursor: 'pointer',
                    fontSize: 13.5,
                    fontWeight: 600,
                    fontFamily: 'Inter',
                    color: editActive === val ? (val ? '#0b6b57' : '#c0392b') : '#6b7c77',
                  }}
                >
                  {val ? '✓ Active' : '✕ Inactive'}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#334b45', display: 'block', marginBottom: 6 }}>
              New password <span style={{ fontWeight: 400, color: '#94a29d' }}>(leave empty to keep current)</span>
            </label>
            <input
              type="password"
              placeholder="Min 8 characters"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              style={fieldStyle}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setEditUser(null)}
                style={{ padding: '9px 18px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13.5, fontFamily: 'Inter', color: '#334b45' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={submitting}
                style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', cursor: submitting ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: 'Inter' }}
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

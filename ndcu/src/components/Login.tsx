import { useState, type CSSProperties } from 'react';
import { PRIMARY } from '../theme';
import { useStore } from '../store/useStore';
import { DengueGuardLogo } from './common/DengueGuardLogo';

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #d5ddda',
  borderRadius: 9,
  fontSize: 15,
  fontFamily: 'Inter, system-ui, sans-serif',
  marginBottom: 14,
  outline: 'none',
  transition: 'border-color .2s',
  boxSizing: 'border-box',
};

export default function Login() {
  const login = useStore((s) => s.login);
  const loading = useStore((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0D4A3E 0%, #0a3830 60%, #071f1b 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -120, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'rgba(16,185,129,.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -80, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(16,185,129,.06)', pointerEvents: 'none' }} />

      <form
        onSubmit={handleSubmit}
        style={{
          width: 420,
          background: '#fff',
          borderRadius: 18,
          padding: '38px 36px',
          boxShadow: '0 32px 80px rgba(0,0,0,.4)',
          animation: 'dg-in .4s',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 12 }}>
          <DengueGuardLogo
            markSize={40}
            textSize={22}
            textColor={PRIMARY}
            subTitle="Operations Portal"
            subTitleColor="#7fb0a4"
          />
        </div>

        <p style={{ margin: '0 0 26px', fontSize: 13, color: '#6b7c77' }}>
          Urban dengue surveillance &amp; response · Sri Lanka
        </p>

        {/* Fields */}
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334b45', marginBottom: 6 }}>
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="officer@ndcu.gov.lk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          style={{
            ...inputStyle,
            borderColor: error && !email ? '#ef4444' : '#d5ddda',
          }}
        />

        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334b45', marginBottom: 6 }}>
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e as any); }}
          style={{
            ...inputStyle,
            marginBottom: 6,
            borderColor: error && !password ? '#ef4444' : '#d5ddda',
          }}
        />

        {error && (
          <div style={{ fontSize: 12.5, color: '#c0392b', marginBottom: 14, background: '#fef2f2', padding: '9px 12px', borderRadius: 7, border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={submitting || loading}
          style={{
            width: '100%',
            padding: '13px',
            border: 'none',
            borderRadius: 10,
            background: submitting || loading
              ? '#7fb0a4'
              : `linear-gradient(135deg, ${PRIMARY}, #0a4f3f)`,
            color: '#fff',
            cursor: submitting || loading ? 'default' : 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '.01em',
            boxShadow: submitting || loading ? 'none' : '0 4px 16px rgba(13,74,62,.35)',
            transition: 'all .2s',
            marginTop: 4,
          }}
        >
          {submitting || loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #eef1f0', fontSize: 12, color: '#94a29d', textAlign: 'center', lineHeight: 1.6 }}>
          Access is restricted to authorised NDCU staff.<br />
          Contact your administrator if you need an account.
        </div>
      </form>
    </div>
  );
}

import type { CSSProperties } from 'react';
import { PRIMARY } from '../theme';
import { useStore } from '../store/useStore';
import type { Role } from '../types';

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: '1px solid #d5ddda',
  borderRadius: 8,
  fontSize: 15,
  fontFamily: 'Inter',
  marginBottom: 12,
  outline: 'none',
};

function Field({ placeholder, type = 'text' }: { placeholder: string; type?: string }) {
  return <input type={type} placeholder={placeholder} style={fieldStyle} />;
}

export default function Login() {
  const loginTab = useStore((s) => s.loginTab);
  const setLoginTab = useStore((s) => s.setLoginTab);
  const login = useStore((s) => s.login);

  const roleBtn = (role: Role, lbl: string, sub: string) => (
    <button
      key={role}
      onClick={() => login(role)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        width: '100%',
        padding: '11px 14px',
        marginBottom: 8,
        border: '1px solid #d5ddda',
        borderRadius: 8,
        background: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'Inter',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: PRIMARY }}>{lbl}</span>
      <span style={{ fontSize: 12, color: '#6b7c77' }}>{sub}</span>
    </button>
  );

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#0D4A3E,#0a3830)',
      }}
    >
      <div
        style={{
          width: 400,
          background: '#fff',
          borderRadius: 16,
          padding: '34px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
          animation: 'dg-in .4s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            D
          </div>
          <span style={{ fontSize: 21, fontWeight: 700, color: PRIMARY, letterSpacing: '-.02em' }}>
            DengueGuard
          </span>
        </div>
        <p style={{ margin: '0 0 22px 44px', fontSize: 13, color: '#6b7c77', marginTop: -2 }}>
          Urban dengue surveillance for Sri Lanka
        </p>

        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#f0f3f2',
            padding: 4,
            borderRadius: 9,
            marginBottom: 18,
          }}
        >
          {(['email', 'otp'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLoginTab(t)}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: 600,
                background: loginTab === t ? '#fff' : 'transparent',
                color: loginTab === t ? PRIMARY : '#6b7c77',
                boxShadow: loginTab === t ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
              }}
            >
              {t === 'email' ? 'Email login' : 'OTP login'}
            </button>
          ))}
        </div>

        {loginTab === 'email' ? (
          <div>
            <Field placeholder="officer@ndcu.gov.lk" type="email" />
            <Field placeholder="Password" type="password" />
          </div>
        ) : (
          <div>
            <Field placeholder="Mobile number  +94" type="tel" />
            <div style={{ fontSize: 12, color: '#6b7c77', marginBottom: 12 }}>
              We'll send a 6-digit verification code.
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a29d',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            margin: '6px 0 8px',
          }}
        >
          Sign in as
        </div>
        {roleBtn('ndcu_admin', 'NDCU Admin', 'Dashboard, dispatch & oversight')}
        {roleBtn('phi', 'PHI Field Officer', 'Assigned work orders')}
        {roleBtn('drone_operator', 'Drone Operator', 'Mission uploads')}
      </div>
    </div>
  );
}

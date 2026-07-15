import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { Brand } from "../components/icons";
import { ctaStyle } from "../components/ui";
import { api } from "../lib/api";

type LoginTab = "mobile" | "google";
const OTP_LEN = 6;
const RESEND_SECONDS = 60;

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<LoginTab>("mobile");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [needFullName, setNeedFullName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpError, setOtpError] = useState(false);
  const [resend, setResend] = useState(RESEND_SECONDS);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResend = useCallback(() => {
    if (resendTimer.current) clearInterval(resendTimer.current);
    setResend(RESEND_SECONDS);
    resendTimer.current = setInterval(() => {
      setResend((s) => {
        if (s <= 1) {
          if (resendTimer.current) clearInterval(resendTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => void (resendTimer.current && clearInterval(resendTimer.current)), []);

  const sendCode = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.requestOtp(email.trim().toLowerCase(), needFullName ? fullName.trim() : undefined);
      setOtp(Array(OTP_LEN).fill(""));
      setOtpError(false);
      setOtpStage(true);
      startResend();
      setTimeout(() => otpRefs.current[0]?.focus(), 60);
    } catch (err: any) {
      if (err.code === "FULL_NAME_REQUIRED") {
        setNeedFullName(true);
        setError("This is your first time. Please enter your name to register.");
      } else {
        setError(err.message || "Failed to send code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setOtp(Array(OTP_LEN).fill(""));
    setOtpError(false);
    try {
      await api.requestOtp(email.trim().toLowerCase(), needFullName ? fullName.trim() : undefined);
      startResend();
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    }
  };

  const verify = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.verifyOtp(email.trim().toLowerCase(), code);
      onLogin();
    } catch (err: any) {
      setOtpError(true);
      setOtp(Array(OTP_LEN).fill(""));
      otpRefs.current[0]?.focus();
      setError(err.message || "Incorrect verification code.");
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(-1);
    const next = otp.slice();
    next[i] = v;
    setOtp(next);
    setOtpError(false);
    if (v && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) setTimeout(() => verify(next.join("")), 120);
  };

  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const tabStyle = (which: LoginTab): CSSProperties => {
    const active = tab === which;
    return {
      flex: 1,
      height: 42,
      border: "none",
      borderRadius: 9,
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      background: active ? "#fff" : "transparent",
      color: active ? "#0D4A3E" : "#6b7a74",
      boxShadow: active ? "0 1px 3px rgba(13,74,62,.12)" : "none",
    };
  };

  const otpStyle = (v: string): CSSProperties => ({
    width: 46,
    height: 56,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    color: "#0D4A3E",
    border: `2px solid ${otpError ? "#FCA5A5" : v ? "#0D4A3E" : "#dfe4e0"}`,
    borderRadius: 12,
    outline: "none",
    background: "#fff",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "24px 22px 28px",
        animation: "dgfade .4s ease",
      }}
    >
      <div style={{ marginBottom: 26 }}>
        <Brand compact />
      </div>

      <div style={{ display: "flex", background: "#EEF1EE", borderRadius: 12, padding: 4, marginBottom: 24 }}>
        <button type="button" onClick={() => setTab("mobile")} style={tabStyle("mobile")}>
          {t("login_mobile_tab")}
        </button>
        <button type="button" onClick={() => setTab("google")} style={tabStyle("google")}>
          {t("login_google_tab")}
        </button>
      </div>

      {tab === "mobile" && !otpStage && (
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#3d4c46", marginBottom: 8 }}>
            {t("mobile_label")}
          </label>
          
          {needFullName && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6b7a74", marginBottom: 6 }}>
                Full Name (required for registration)
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: "100%",
                  height: 52,
                  padding: "0 14px",
                  border: "1.5px solid #dfe4e0",
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#1c2b26",
                  outline: "none",
                  background: "#fff",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@example.com"
              aria-label={t("mobile_label")}
              style={{
                flex: 1,
                height: 52,
                padding: "0 14px",
                border: "1.5px solid #dfe4e0",
                borderRadius: 12,
                fontSize: 16,
                color: "#1c2b26",
                outline: "none",
                background: "#fff",
              }}
            />
          </div>

          {error && (
            <p style={{ margin: "-8px 0 16px", fontSize: 14, color: needFullName ? "#0D4A3E" : "#B91C1C", fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={sendCode}
            disabled={loading || !email.trim() || (needFullName && !fullName.trim())}
            style={ctaStyle(!loading && !!email.trim() && (!needFullName || !!fullName.trim()))}
          >
            {loading ? "Please wait..." : t("send_code")}
          </button>
        </div>
      )}

      {tab === "mobile" && otpStage && (
        <div style={{ animation: "dgslide .35s ease" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600, color: "#1c2b26" }}>
            {t("verify_title")}
          </h2>
          <p style={{ margin: "0 0 22px", fontSize: 15, color: "#6b7a74", lineHeight: 1.4 }}>
            {t("verify_body")} <b style={{ color: "#0D4A3E" }}>{email}</b>
          </p>
          <div style={{ display: "flex", gap: 9, marginBottom: 20 }}>
            {otp.map((v, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                value={v}
                onChange={(e) => onOtpChange(i, e.target.value)}
                onKeyDown={(e) => onOtpKey(i, e)}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                style={otpStyle(v)}
              />
            ))}
          </div>
          {error && (
            <p style={{ margin: "-8px 0 16px", fontSize: 14, color: "#B91C1C", fontWeight: 500 }}>
              {error}
            </p>
          )}
          <div style={{ textAlign: "center" }}>
            {resend === 0 ? (
              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0D4A3E",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {t("resend_code")}
              </button>
            ) : (
              <span style={{ fontSize: 15, color: "#9aa8a2" }}>{`${t("resend_in")} ${resend}s`}</span>
            )}
          </div>
        </div>
      )}

      {tab === "google" && (
        <div style={{ animation: "dgfade .3s ease" }}>
          <button
            type="button"
            onClick={onLogin}
            style={{
              width: "100%",
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 11,
              border: "1.5px solid #dfe4e0",
              borderRadius: 12,
              background: "#fff",
              fontSize: 16,
              fontWeight: 600,
              color: "#3c4043",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.5 13.3 17.7 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.6 10.6l7.9-6.2z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.9 2.1-6.3 0-11.5-3.8-13.5-9.2l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            <span>{t("google_btn")}</span>
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          paddingTop: 26,
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          color: "#8a978f",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
          <path
            d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6L12 2.5z"
            stroke="#8a978f"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 12l2 2 4-4" stroke="#8a978f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 13, lineHeight: 1.45 }}>{t("privacy_note")}</span>
      </div>
    </div>
  );
}

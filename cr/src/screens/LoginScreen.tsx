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

  useEffect(() => {
    if (tab !== "google") return;

    let active = true;

    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (active) {
          initGoogleSignIn();
        }
      };
      document.body.appendChild(script);
    } else if ((window as any).google) {
      initGoogleSignIn();
    }

    function initGoogleSignIn() {
      const google = (window as any).google;
      if (!google) return;
      try {
        const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "816940104207-sfb2caonu3n5pq48dfrehovmag4mac5i.apps.googleusercontent.com";
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        setTimeout(() => {
          if (!active) return;
          const btnParent = document.getElementById("google-signin-btn");
          if (btnParent) {
            google.accounts.id.renderButton(btnParent, {
              theme: "outline",
              size: "large",
              width: btnParent.clientWidth || 340,
              text: "signin_with",
              shape: "rectangular",
            });
          }
        }, 150);
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
      }
    }

    async function handleCredentialResponse(response: any) {
      if (!active) return;
      setLoading(true);
      setError(null);
      try {
        await api.loginWithGoogle(response.credential);
        onLogin();
      } catch (err: any) {
        setError(err.message || "Failed to log in with Google.");
      } finally {
        setLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, [tab, onLogin]);

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
        <div style={{ animation: "dgfade .3s ease", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {error && (
            <p style={{ fontSize: 14, color: "#B91C1C", fontWeight: 500, marginBottom: 16, width: "100%", textAlign: "left" }}>
              {error}
            </p>
          )}
          {loading ? (
            <div style={{ fontSize: 16, color: "#0D4A3E", fontWeight: 600, padding: "16px 0" }}>
              Authenticating with Google...
            </div>
          ) : (
            <div id="google-signin-btn" style={{ width: "100%", minHeight: 50, display: "flex", justifyContent: "center" }} />
          )}
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

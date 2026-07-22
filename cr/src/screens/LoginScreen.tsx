import { useState, useEffect, useRef } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { DengueGuardLogo } from "../components/icons";
import { heroButtonStyle } from "../components/ui";
import { type LoginMethod, DEFAULT_LOGIN_METHOD } from "../config";
import { api } from "../lib/api";

declare global {
  interface Window {
    google?: any;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_ONLY_RE = /^\d+$/;

interface LoginScreenProps {
  onSuccess: () => void;
  initialMethod?: LoginMethod;
  showToast?: (msg: string) => void;
}

export function LoginScreen({
  onSuccess,
  initialMethod = DEFAULT_LOGIN_METHOD,
  showToast,
}: LoginScreenProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<LoginMethod>(initialMethod);
  const [step, setStep] = useState<"form" | "otp">("form");

  // Input states
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [busy, setBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);

  // Resend countdown timer
  const [timerSec, setTimerSec] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && timerSec > 0) {
      interval = setInterval(() => {
        setTimerSec((prev) => prev - 1);
      }, 1000);
    } else if (timerSec === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSec]);

  // Google OAuth Initialization
  useEffect(() => {
    if (tab !== "google") return;

    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "816940104207-sfb2caonu3n5pq48dfrehovmag4mac5i.apps.googleusercontent.com";

    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            setBusy(true);
            try {
              await api.loginWithGoogle(response.credential);
              onSuccess();
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Google login failed";
              if (showToast) showToast(msg);
              else alert(msg);
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          shape: "pill",
          text: "continue_with",
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }
  }, [tab, onSuccess, showToast]);

  // Validations
  const cleanMobile = mobile.replace(/\D/g, "");
  const isMobileValid = DIGITS_ONLY_RE.test(cleanMobile) && cleanMobile.length >= 8 && cleanMobile.length <= 9;
  const isEmailValid = EMAIL_RE.test(email.trim());

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMobileValid) return;
    setBusy(true);

    const fullMobile = `+94${cleanMobile}`;
    try {
      await api.requestOtp(fullMobile);
      if (showToast) showToast(`OTP code sent to ${fullMobile}`);
    } catch (err) {
      console.warn("API requestOtp info:", err);
      if (showToast) showToast(`OTP code sent to ${fullMobile}`);
    } finally {
      setBusy(false);
      setStep("otp");
      setTimerSec(30);
      setTimerActive(true);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    setBusy(true);

    const targetEmail = email.trim();
    try {
      await api.requestOtp(targetEmail);
      if (showToast) showToast(t("email_otp_sent"));
    } catch (err) {
      console.warn("API requestOtp info:", err);
      if (showToast) showToast(t("email_otp_sent"));
    } finally {
      setBusy(false);
      setStep("otp");
      setTimerSec(30);
      setTimerActive(true);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setBusy(true);
    setOtpError(false);

    const target = tab === "mobile" ? `+94${cleanMobile}` : email.trim();
    try {
      await api.verifyOtp(target, otp);
      onSuccess();
    } catch (err) {
      console.warn("API verifyOtp warning:", err);
      setOtpError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (timerActive) return;
    setBusy(true);
    const target = tab === "mobile" ? `+94${cleanMobile}` : email.trim();
    try {
      await api.requestOtp(target);
      if (showToast) showToast(`Code resent to ${target}`);
    } catch {
      if (showToast) showToast(`Code resent to ${target}`);
    } finally {
      setBusy(false);
      setTimerSec(30);
      setTimerActive(true);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 24px calc(24px + env(safe-area-inset-bottom))",
        animation: "dgfade .35s ease",
        background: "#FAFAF8",
      }}
    >
      {/* Top logo & header */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <DengueGuardLogo style={{ width: 156, height: 44, margin: "0 auto 20px" }} />

        {step === "form" ? (
          <>
            <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#0D4A3E" }}>
              {t("welcome_headline")}
            </h1>
            <p style={{ margin: "0 auto", fontSize: 15, lineHeight: 1.5, color: "#4b5a54", maxWidth: 320 }}>
              {t("welcome_body")}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#0D4A3E" }}>
              {t("verify_title")}
            </h1>
            <p style={{ margin: "0 auto", fontSize: 15, lineHeight: 1.45, color: "#4b5a54" }}>
              {t("verify_body")}{" "}
              <strong style={{ color: "#1c2b26" }}>
                {tab === "mobile" ? `+94 ${cleanMobile}` : email}
              </strong>
            </p>
          </>
        )}
      </div>

      {/* Center content */}
      <div style={{ margin: "24px 0" }}>
        {step === "form" ? (
          <>
            {/* Login Method Tabs */}
            <div
              style={{
                display: "flex",
                background: "#eef2ef",
                borderRadius: 14,
                padding: 4,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setTab("mobile")}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 11,
                  fontSize: 13.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background: tab === "mobile" ? "#fff" : "transparent",
                  color: tab === "mobile" ? "#0D4A3E" : "#6b7a74",
                  boxShadow: tab === "mobile" ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                  transition: "all .15s ease",
                }}
              >
                {t("login_mobile_tab")}
              </button>

              <button
                type="button"
                onClick={() => setTab("email")}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 11,
                  fontSize: 13.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background: tab === "email" ? "#fff" : "transparent",
                  color: tab === "email" ? "#0D4A3E" : "#6b7a74",
                  boxShadow: tab === "email" ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                  transition: "all .15s ease",
                }}
              >
                {t("email_tab")}
              </button>

              <button
                type="button"
                onClick={() => setTab("google")}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  borderRadius: 11,
                  fontSize: 13.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background: tab === "google" ? "#fff" : "transparent",
                  color: tab === "google" ? "#0D4A3E" : "#6b7a74",
                  boxShadow: tab === "google" ? "0 2px 8px rgba(0,0,0,.06)" : "none",
                  transition: "all .15s ease",
                }}
              >
                {t("login_google_tab")}
              </button>
            </div>

            {/* Mobile Tab Form */}
            {tab === "mobile" && (
              <form onSubmit={handleMobileSubmit}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4b5a54", marginBottom: 8 }}>
                  {t("mobile_label")}
                </label>
                <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                  <div
                    style={{
                      height: 52,
                      padding: "0 14px",
                      borderRadius: 14,
                      background: "#fff",
                      border: "1.5px solid #dfe4e0",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#1c2b26",
                    }}
                  >
                    +94
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="77 123 4567"
                    style={{
                      flex: 1,
                      height: 52,
                      padding: "0 16px",
                      borderRadius: 14,
                      background: "#fff",
                      border: "1.5px solid #dfe4e0",
                      fontSize: 16,
                      color: "#1c2b26",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isMobileValid || busy}
                  style={heroButtonStyle(
                    "#0D4A3E",
                    "0 6px 20px rgba(13,74,62,.25)",
                    !isMobileValid || busy
                  )}
                >
                  {busy ? "Sending…" : t("send_code")}
                </button>
              </form>
            )}

            {/* Email Tab Form */}
            {tab === "email" && (
              <form onSubmit={handleEmailSubmit}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4b5a54", marginBottom: 8 }}>
                  {t("email_label")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("email_placeholder")}
                  style={{
                    width: "100%",
                    height: 52,
                    padding: "0 16px",
                    borderRadius: 14,
                    background: "#fff",
                    border: "1.5px solid #dfe4e0",
                    fontSize: 16,
                    color: "#1c2b26",
                    outline: "none",
                    marginBottom: 18,
                  }}
                />
                <button
                  type="submit"
                  disabled={!isEmailValid || busy}
                  style={heroButtonStyle(
                    "#0D4A3E",
                    "0 6px 20px rgba(13,74,62,.25)",
                    !isEmailValid || busy
                  )}
                >
                  {busy ? "Sending…" : t("email_send_code")}
                </button>
              </form>
            )}

            {/* Google Tab */}
            {tab === "google" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "24px 0",
                  minHeight: 80,
                  animation: "dgfade .3s ease",
                }}
              >
                <div ref={googleBtnRef} style={{ display: "inline-block" }} />
              </div>
            )}
          </>
        ) : (
          /* OTP Verification Step */
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setOtpError(false);
              }}
              placeholder="000000"
              style={{
                width: "100%",
                height: 56,
                letterSpacing: 12,
                textAlign: "center",
                fontSize: 26,
                fontWeight: 700,
                borderRadius: 14,
                border: otpError ? "2px solid #EF4444" : "1.5px solid #dfe4e0",
                background: "#fff",
                outline: "none",
                marginBottom: 12,
                color: "#1c2b26",
              }}
            />

            {otpError && (
              <div style={{ fontSize: 13, color: "#DC2626", textAlign: "center", marginBottom: 12, fontWeight: 500 }}>
                {t("otp_error")}
              </div>
            )}

            <button
              type="submit"
              disabled={otp.length < 6 || busy}
              style={{
                ...heroButtonStyle("#0D4A3E", "0 6px 20px rgba(13,74,62,.25)", otp.length < 6 || busy),
                marginBottom: 16,
              }}
            >
              {busy ? "Verifying…" : t("get_started")}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setStep("form")}
                style={{ background: "none", border: "none", color: "#6b7a74", fontSize: 14, cursor: "pointer" }}
              >
                {t("back")}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={timerActive || busy}
                style={{
                  background: "none",
                  border: "none",
                  color: timerActive ? "#9aa8a2" : "#0D4A3E",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: timerActive ? "default" : "pointer",
                }}
              >
                {timerActive ? `${t("resend_in")} ${timerSec}s` : t("resend_code")}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Privacy note */}
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: "#8a978f", textAlign: "center" }}>
        {t("privacy_note")}
      </p>
    </div>
  );
}

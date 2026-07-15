import { useRef, type RefObject } from "react";
import { useI18n } from "../../i18n/LanguageProvider";
import type { CameraErrorCode } from "../../lib/camera";
import type { GpsStatus } from "./types";

const GPS_COLOR: Record<GpsStatus, string> = {
  idle: "#F59E0B",
  acquiring: "#F59E0B",
  confirmed: "#65A30D",
  failed: "#EF4444",
};

const gridLine = (pos: string, axis: "x" | "y"): React.CSSProperties =>
  axis === "x"
    ? { position: "absolute", top: 0, bottom: 0, left: pos, width: 1, background: "rgba(255,255,255,.14)" }
    : { position: "absolute", left: 0, right: 0, top: pos, height: 1, background: "rgba(255,255,255,.14)" };

interface CameraStepProps {
  videoRef: RefObject<HTMLVideoElement>;
  cameraError: CameraErrorCode | null;
  gps: GpsStatus;
  instruction: string;
  stepLabelText: string;
  onShoot: () => void;
  onPickFile: (file: File) => void;
}

export function CameraStep({
  videoRef,
  cameraError,
  gps,
  instruction,
  stepLabelText,
  onShoot,
  onPickFile,
}: CameraStepProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0b0f0d",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        animation: "dgfade .3s ease",
      }}
    >
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", background: "#0b0f0d" }}
        />

        {cameraError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 28,
              textAlign: "center",
              color: "rgba(255,255,255,.85)",
              background: "radial-gradient(120% 90% at 50% 40%,#2a3d33,#0b0f0d)",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="3" stroke="#fff" strokeWidth="1.6" opacity=".8" />
              <path d="M4 4l16 16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 15, fontWeight: 600, maxWidth: 260, lineHeight: 1.4 }}>
              {cameraError === "denied"
                ? "Camera access was blocked. You can still choose a photo from your gallery."
                : "Camera unavailable on this device. Choose a photo from your gallery instead."}
            </div>
          </div>
        )}

        {/* Composition overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg,rgba(0,0,0,.5),transparent 22%,transparent 72%,rgba(0,0,0,.55))",
            pointerEvents: "none",
          }}
        />
        <div style={gridLine("33.3%", "x")} />
        <div style={gridLine("66.6%", "x")} />
        <div style={gridLine("33.3%", "y")} />
        <div style={gridLine("66.6%", "y")} />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 130,
            height: 130,
            border: "2px solid rgba(255,255,255,.55)",
            borderRadius: 14,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(0,0,0,.4)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: 999,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <span>{stepLabelText}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{instruction}</span>
          </div>
        </div>
      </div>

      {/* Shutter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px 34px",
          background: "#0b0f0d",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label={t("gallery_pick")}
          onClick={() => fileRef.current?.click()}
          style={{
            width: 52,
            height: 52,
            borderRadius: 13,
            border: "1.5px solid rgba(255,255,255,.3)",
            background: "rgba(255,255,255,.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#fff" strokeWidth="1.7" />
            <circle cx="8.5" cy="10" r="1.6" fill="#fff" />
            <path d="M4 17l5-4 4 3 3-2.5 4 3.5" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Capture"
          onClick={onShoot}
          disabled={!!cameraError}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#fff",
            border: "none",
            cursor: cameraError ? "not-allowed" : "pointer",
            opacity: cameraError ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 4px rgba(255,255,255,.25)",
          }}
        >
          <span style={{ width: 60, height: 60, borderRadius: "50%", background: "#0D4A3E", border: "3px solid #fff" }} />
        </button>

        <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: GPS_COLOR[gps], fontSize: 12, fontWeight: 600 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: GPS_COLOR[gps],
                animation: gps === "confirmed" || gps === "acquiring" ? "dgpulse 1.4s infinite" : "none",
              }}
            />
            GPS
          </span>
        </div>
      </div>
    </div>
  );
}

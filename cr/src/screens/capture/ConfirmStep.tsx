import { useState } from "react";
import { useI18n } from "../../i18n/LanguageProvider";
import { LeafletMap } from "../../components/LeafletMap";
import { SitePhotoArt } from "../../components/icons";
import { ctaStyle } from "../../components/ui";
import type { GeoPoint, ResolvedLocation } from "../../types";
import type { GpsStatus } from "./types";

interface ConfirmStepProps {
  photo: string | null;
  gps: GpsStatus;
  location: ResolvedLocation | null;
  /** Original GPS-detected location, or null if GPS was unavailable. */
  autoLocation: ResolvedLocation | null;
  description: string;
  onDescChange: (v: string) => void;
  stepLabelText: string;
  onRetake: () => void;
  onEnableLocation: () => void;
  onLocationChange: (point: GeoPoint) => void;
  onResetLocation: () => void;
  onSubmit: () => void;
}

const editBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 12px",
  background: "rgba(13,74,62,.08)",
  border: "none",
  borderRadius: 999,
  color: "#0D4A3E",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const editHintStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.4,
  color: "#6b7a74",
};

export function ConfirmStep({
  photo,
  gps,
  location,
  autoLocation,
  description,
  onDescChange,
  stepLabelText,
  onRetake,
  onEnableLocation,
  onLocationChange,
  onResetLocation,
  onSubmit,
}: ConfirmStepProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const submitDisabled = !location;
  // The pin has been moved away from the original GPS-detected coordinates.
  const adjusted =
    !!autoLocation &&
    !!location &&
    (location.lat !== autoLocation.lat || location.lng !== autoLocation.lng);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", animation: "dgfade .35s ease" }}>
      <div style={{ padding: "12px 16px 4px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#65A30D" }}>{stepLabelText}</span>
      </div>

      {/* Photo preview */}
      <div
        style={{
          position: "relative",
          margin: "6px 16px 0",
          borderRadius: 16,
          overflow: "hidden",
          height: 210,
          background: "#12343a",
        }}
      >
        {photo ? (
          <img src={photo} alt="Captured breeding site" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <SitePhotoArt style={{ width: "100%", height: "100%" }} />
        )}
        <button
          type="button"
          onClick={onRetake}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "rgba(11,15,13,.62)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "none",
            borderRadius: 999,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4v5h5M20 20v-5h-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 9a7.5 7.5 0 0 0-13-3M5 15a7.5 7.5 0 0 0 13 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {t("retake")}
        </button>
      </div>

      {/* Location */}
      <div style={{ padding: "16px 16px 0" }}>
        {gps === "confirmed" && location && (
          <>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(13,74,62,.1)" }}>
              <LeafletMap point={location} editable={editing} onPointChange={onLocationChange} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              {adjusted ? (
                <button type="button" onClick={onResetLocation} style={editBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 4v5h5M20 20v-5h-5" stroke="#0D4A3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M19 9a7.5 7.5 0 0 0-13-3M5 15a7.5 7.5 0 0 0 13 3" stroke="#0D4A3E" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {t("reset_to_auto")}
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="5" y="10" width="14" height="10" rx="2" fill="#0D4A3E" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#0D4A3E" strokeWidth="1.8" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#8a978f" }}>{t("auto_detected_location")}</span>
                </div>
              )}
              <button type="button" onClick={() => setEditing((v) => !v)} style={editBtnStyle}>
                {!editing && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="#0D4A3E" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M13.5 6.5l4 4" stroke="#0D4A3E" strokeWidth="1.8" />
                  </svg>
                )}
                {editing ? t("location_done") : t("adjust_location")}
              </button>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1c2b26", marginTop: 3 }}>{location.zone}</div>
            {editing && <div style={editHintStyle}>{t("location_edit_hint")}</div>}
          </>
        )}

        {(gps === "acquiring" || gps === "idle") && (
          <div
            style={{
              height: 170,
              borderRadius: 14,
              background: "linear-gradient(135deg,#eef2ef,#e2e9e4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              border: "1px solid rgba(13,74,62,.08)",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "3px solid #cbd6cf",
                borderTopColor: "#0D4A3E",
                animation: "dgspin .9s linear infinite",
              }}
            />
            <span style={{ fontSize: 14, color: "#6b7a74", fontWeight: 500 }}>{t("location_acquiring")}</span>
          </div>
        )}

        {gps === "failed" && location && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1.4, color: "#991B1B" }}>{t("location_manual_prompt")}</span>
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(13,74,62,.1)" }}>
              <LeafletMap point={location} editable onPointChange={onLocationChange} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#1c2b26" }}>{location.zone}</span>
              <button type="button" onClick={onEnableLocation} style={editBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4v5h5M20 20v-5h-5" stroke="#0D4A3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 9a7.5 7.5 0 0 0-13-3M5 15a7.5 7.5 0 0 0 13 3" stroke="#0D4A3E" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {t("retry_gps")}
              </button>
            </div>
            <div style={editHintStyle}>{t("location_edit_hint")}</div>
          </>
        )}

        {gps === "failed" && !location && (
          <div
            style={{
              padding: 20,
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.45, color: "#991B1B" }}>
              {t("location_failed")}
            </p>
            <button
              type="button"
              onClick={onEnableLocation}
              style={{
                height: 44,
                padding: "0 20px",
                border: "none",
                borderRadius: 11,
                background: "#0D4A3E",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("enable_location")}
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <textarea
            value={description}
            onChange={(e) => onDescChange(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={2}
            placeholder={t("description_placeholder")}
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1.5px solid #dfe4e0",
              borderRadius: 13,
              fontSize: 16,
              lineHeight: 1.4,
              color: "#1c2b26",
              outline: "none",
              resize: "none",
              background: "#fff",
            }}
          />
          <span style={{ position: "absolute", bottom: 9, right: 12, fontSize: 12, color: "#a5b0aa" }}>
            {description.length}/200
          </span>
        </div>
      </div>

      {/* Sticky submit */}
      <div
        style={{
          marginTop: "auto",
          padding: "18px 16px calc(20px + env(safe-area-inset-bottom))",
          position: "sticky",
          bottom: 0,
          background: "linear-gradient(180deg,rgba(250,250,248,0),#FAFAF8 30%)",
        }}
      >
        <button type="button" onClick={onSubmit} disabled={submitDisabled} style={ctaStyle(!submitDisabled)}>
          {submitDisabled ? t("submit_waiting_location") : t("submit_report")}
        </button>
      </div>
    </div>
  );
}

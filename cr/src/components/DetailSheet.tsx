import { ReactNode } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { RiskBadge, StatusBadge } from "./Badges";
import { SitePhotoArt } from "./icons";
import { RISK } from "../theme";
import { GUIDE } from "../lib/risk";
import { timeAgo } from "../lib/mock";
import type { StringKey } from "../i18n/strings";
import type { Report, ReportStatus } from "../types";

interface WorkOrder {
  text: string;
  bg: string;
  color: string;
  iconBg: string;
  icon: ReactNode;
}

function workOrder(status: ReportStatus, T: (k: StringKey) => string): WorkOrder {
  if (status === "flagged") {
    return {
      text: T("work_order_assigned"),
      bg: "#EEF2FF",
      color: "#4338CA",
      iconBg: "#4338CA",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="3" stroke="#fff" strokeWidth="1.8" />
          <path d="M5 20a7 7 0 0 1 14 0" stroke="#fff" strokeWidth="1.8" />
        </svg>
      ),
    };
  }
  if (status === "complete") {
    return {
      text: T("work_order_resolved"),
      bg: "#ECFDF5",
      color: "#059669",
      iconBg: "#10B981",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12l4.5 4.5L19 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    };
  }
  return {
    text: T("work_order_review"),
    bg: "#FEF3C7",
    color: "#B45309",
    iconBg: "#D97706",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="1.8" />
        <path d="M12 8v4l2.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };
}

export function DetailSheet({ report, onClose }: { report: Report; onClose: () => void }) {
  const { t } = useI18n();
  const wo = workOrder(report.status, t);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,15,13,.42)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        animation: "dgfade .25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={report.zone}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "88%",
          background: "#FAFAF8",
          borderRadius: "22px 22px 0 0",
          overflowY: "auto",
          animation: "dgsheet .32s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div style={{ position: "sticky", top: 0, background: "#FAFAF8", padding: "12px 0 4px", display: "flex", justifyContent: "center", zIndex: 2 }}>
          <span style={{ width: 42, height: 5, borderRadius: 3, background: "#d5ddd7" }} />
        </div>

        <div
          style={{
            height: 200,
            background: RISK[report.risk].thumb,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 16px",
            borderRadius: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {report.imageUrl ? (
            <img
              src={report.imageUrl}
              alt={report.zone}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <SitePhotoArt style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
          )}
        </div>

        <div style={{ padding: "18px 20px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 14 }}>
            <RiskBadge risk={report.risk} size="md" />
            <StatusBadge status={report.status} size="md" />
          </div>
          <h2 style={{ margin: "0 0 3px", fontSize: 19, fontWeight: 700, color: "#0D4A3E" }}>{report.zone}</h2>
          {report.latitude != null && report.longitude != null && (
            <div style={{ fontSize: 12, color: "#8a978f", marginBottom: 6 }}>
              {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#8a978f", marginBottom: 18 }}>{timeAgo(report)}</div>

          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, padding: 12, background: "#fff", border: "1px solid rgba(13,74,62,.08)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "#8a978f", marginBottom: 3 }}>{t("site_type_label")}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1c2b26" }}>{report.siteType}</div>
            </div>
            <div style={{ flex: 1, padding: 12, background: "#fff", border: "1px solid rgba(13,74,62,.08)", borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: "#8a978f", marginBottom: 3 }}>{t("confidence_label")}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1c2b26" }}>{report.confidence}%</div>
            </div>
          </div>

          <div
            style={{
              padding: "14px 14px 14px 16px",
              background: "#F0F6F2",
              borderLeft: "4px solid #0D4A3E",
              borderRadius: "0 12px 12px 0",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".4px",
                color: "#0D4A3E",
                marginBottom: 6,
              }}
            >
              {t("guidance_label")}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#33433c" }}>{report.guidanceText || GUIDE[report.risk]}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: 14, background: wo.bg, borderRadius: 13 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: wo.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              {wo.icon}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: wo.color, lineHeight: 1.35 }}>{wo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

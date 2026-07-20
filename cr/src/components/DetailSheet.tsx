import { useI18n } from "../i18n/LanguageProvider";
import type { Report } from "../types";
import { RiskBadge, StatusBadge } from "./Badges";
import { timeAgo } from "../lib/mock";
import { siteTypeLabel } from "../lib/format";

interface DetailSheetProps {
  report: Report | null;
  onClose: () => void;
}

export function DetailSheet({ report, onClose }: DetailSheetProps) {
  const { lang, t } = useI18n();
  if (!report) return null;

  const guidance =
    lang === "si" && report.guidanceTextSi
      ? report.guidanceTextSi
      : lang === "ta" && report.guidanceTextTa
        ? report.guidanceTextTa
        : report.guidanceText;

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(11,15,13,.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        animation: "dgfade .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "85%",
          background: "#FAFAF8",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
          boxShadow: "0 -10px 40px rgba(0,0,0,.2)",
          overflowY: "auto",
          animation: "dgslideup .25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "#cbd6cf",
            margin: "0 auto 16px",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "#8a978f", fontWeight: 500 }}>{timeAgo(report)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1c2b26", marginTop: 2 }}>{report.zone}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "#eef2ef",
              color: "#4b5a54",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <RiskBadge risk={report.risk} />
          <StatusBadge status={report.status} />
        </div>

        {report.imageUrl && (
          <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", height: 160, background: "#12343a" }}>
            <img src={report.imageUrl} alt={report.siteType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: "#fff",
            border: "1px solid rgba(13,74,62,.08)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7a74" }}>{t("site_type_label")}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1c2b26" }}>{siteTypeLabel(report.siteType)}</span>
          </div>
          <div style={{ height: 1, background: "#f0f4f1" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b7a74" }}>{t("confidence_label")}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1c2b26" }}>{report.confidence}%</span>
          </div>
        </div>

        {guidance && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#E8F3EC",
              border: "1px solid rgba(13,74,62,.15)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0D4A3E", marginBottom: 4 }}>{t("guidance_label")}</div>
            <p style={{ margin: 0, fontSize: 13.5, color: "#1c2b26", lineHeight: 1.45 }}>{guidance}</p>
          </div>
        )}

        {report.status === "flagged" && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: 13.5,
              color: "#991B1B",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            {t("work_order_assigned")}
          </div>
        )}
      </div>
    </div>
  );
}

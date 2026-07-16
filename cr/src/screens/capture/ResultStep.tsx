import { useI18n } from "../../i18n/LanguageProvider";
import { RiskBadge } from "../../components/Badges";
import { heroButtonStyle } from "../../components/ui";
import { GUIDE } from "../../lib/risk";
import type { RiskLevel } from "../../types";

interface ResultStepProps {
  risk: RiskLevel;
  guidanceText?: string;
  guidanceTextSi?: string;
  guidanceTextTa?: string;
  onReportAnother: () => void;
  onViewReports: () => void;
}

export function ResultStep({
  risk,
  guidanceText,
  guidanceTextSi,
  guidanceTextTa,
  onReportAnother,
  onViewReports,
}: ResultStepProps) {
  const { t, lang } = useI18n();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 22px", animation: "dgfade .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
        <RiskBadge risk={risk} size="lg" />
      </div>
      <h2 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 23, fontWeight: 700, color: "#0D4A3E" }}>
        {t("submit_success_headline")}
      </h2>
      <p style={{ margin: "0 0 22px", textAlign: "center", fontSize: 15, color: "#6b7a74", lineHeight: 1.45 }}>
        {t("submit_success_body")}
      </p>
      <div
        style={{
          padding: "16px 16px 16px 18px",
          background: "#F0F6F2",
          borderLeft: "4px solid #0D4A3E",
          borderRadius: "0 12px 12px 0",
          marginBottom: 26,
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
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#33433c" }}>
          {(lang === "si" ? guidanceTextSi : lang === "ta" ? guidanceTextTa : guidanceText) || guidanceText || GUIDE[risk]}
        </p>
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 11 }}>
        <button type="button" onClick={onReportAnother} style={heroButtonStyle("#65A30D", "0 6px 16px rgba(101,163,13,.26)")}>
          {t("report_another")}
        </button>
        <button
          type="button"
          onClick={onViewReports}
          style={{
            width: "100%",
            height: 52,
            border: "1.5px solid #cdd6d0",
            borderRadius: 14,
            background: "#fff",
            color: "#0D4A3E",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("view_my_reports")}
        </button>
      </div>
    </div>
  );
}

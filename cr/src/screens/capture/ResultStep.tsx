import { useI18n } from "../../i18n/LanguageProvider";
import { heroButtonStyle } from "../../components/ui";
import { siteTypeLabel } from "../../lib/format";
import type { AnalysisResult } from "../../types";

interface ResultStepProps {
  result?: AnalysisResult | null;
  guidanceText?: string;
  onReportAnother: () => void;
  onViewReports: () => void;
}

export function ResultStep({ result, guidanceText, onReportAnother, onViewReports }: ResultStepProps) {
  const { t } = useI18n();

  const isNoRisk = result?.risk === "none" || (guidanceText && (
    guidanceText.toLowerCase().includes("no mosquito") ||
    guidanceText.toLowerCase().includes("no breeding") ||
    guidanceText.toLowerCase().includes("not appear")
  ));

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 24px calc(24px + env(safe-area-inset-bottom))",
        animation: "dgfade .35s ease",
      }}
    >
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            background: isNoRisk ? "#FEF3C7" : "#E8F3EC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: isNoRisk ? "2px solid #F59E0B" : "2px solid #65A30D",
              animation: "dgring 2s ease-out infinite",
            }}
          />
          {isNoRisk ? (
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="2.5" />
              <path d="M12 8v4m0 4h.01" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 6L9 17l-5-5"
                stroke="#0D4A3E"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <h1 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800, color: isNoRisk ? "#B45309" : "#0D4A3E" }}>
          {isNoRisk ? t("no_breeding_site_headline") : t("submit_success_headline")}
        </h1>
        <p style={{ margin: "0 auto 24px", fontSize: 15, lineHeight: 1.5, color: "#4b5a54", maxWidth: 320 }}>
          {isNoRisk ? t("no_breeding_site_body") : t("submit_success_body")}
        </p>

        {/* Async status indicator pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: isNoRisk ? "rgba(217,119,6,.1)" : "rgba(13,74,62,.07)",
            color: isNoRisk ? "#B45309" : "#0D4A3E",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isNoRisk ? "#F59E0B" : "#65A30D",
              animation: "dgpulse 1.4s infinite",
            }}
          />
          {result ? `${siteTypeLabel(result.siteType)} (${result.confidence}%)` : t("status_processing")}
        </div>

        {guidanceText && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 16,
              background: isNoRisk ? "#FFFBEB" : "#fff",
              border: isNoRisk ? "1px solid #FCD34D" : "1px solid rgba(13,74,62,.12)",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: isNoRisk ? "#B45309" : "#0D4A3E", marginBottom: 6 }}>
              {t("guidance_label")}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: isNoRisk ? "#78350F" : "#1c2b26" }}>
              {guidanceText}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          type="button"
          onClick={onReportAnother}
          style={heroButtonStyle("#0D4A3E", "0 6px 20px rgba(13,74,62,.25)")}
        >
          {t("report_another")}
        </button>
        <button
          type="button"
          onClick={onViewReports}
          style={{
            height: 54,
            borderRadius: 16,
            border: "1.5px solid #dfe4e0",
            background: "#fff",
            color: "#1c2b26",
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

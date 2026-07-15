import { useI18n } from "../i18n/LanguageProvider";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { RISK } from "../theme";
import { MOCK_REPORTS, timeAgo } from "../lib/mock";
import type { Report } from "../types";

function ReportCard({ report, onOpen }: { report: Report; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(report.id)}
      style={{
        display: "flex",
        gap: 13,
        alignItems: "center",
        width: "100%",
        textAlign: "left",
        padding: 11,
        background: "#fff",
        border: "1px solid rgba(13,74,62,.07)",
        borderRadius: 15,
        boxShadow: "0 1px 3px rgba(13,74,62,.05)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 12,
          flex: "none",
          background: RISK[report.risk].thumb,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3c0 6-6 8.5-6 13a6 6 0 0 0 12 0c0-4.5-6-7-6-13z" fill="rgba(255,255,255,.85)" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1c2b26",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {report.zone}
        </div>
        <div style={{ fontSize: 13, color: "#8a978f", margin: "2px 0 7px" }}>{timeAgo(report)}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <RiskBadge risk={report.risk} size="sm" />
          <StatusBadge status={report.status} size="sm" />
        </div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }} aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="#c2ccc6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function ReportsScreen({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div style={{ flex: 1, padding: "18px 16px 20px", animation: "dgfade .35s ease" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0D4A3E" }}>
        {t("my_reports_title")}
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {MOCK_REPORTS.map((r) => (
          <ReportCard key={r.id} report={r} onOpen={onOpenDetail} />
        ))}
      </div>
    </div>
  );
}

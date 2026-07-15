import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { RISK } from "../theme";
import { timeAgo } from "../lib/mock";
import type { Report } from "../types";
import { api } from "../lib/api";

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
          overflow: "hidden",
        }}
      >
        {report.imageUrl ? (
          <img
            src={report.imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3c0 6-6 8.5-6 13a6 6 0 0 0 12 0c0-4.5-6-7-6-13z" fill="rgba(255,255,255,.85)" />
          </svg>
        )}
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
        {report.latitude != null && report.longitude != null && (
          <div style={{ fontSize: 11, color: "#8a978f", marginTop: 1 }}>
            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#8a978f", margin: "2px 0 7px" }}>{timeAgo(report)}</div>
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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getReports()
      .then((data) => {
        if (active) {
          setReports(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load reports.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ flex: 1, padding: "18px 16px 20px", display: "flex", flexDirection: "column", animation: "dgfade .35s ease" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0D4A3E" }}>
        {t("my_reports_title")}
      </h1>

      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "3px solid #cbd6cf",
              borderTopColor: "#0D4A3E",
              animation: "dgspin .9s linear infinite",
            }}
          />
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: 16, textAlign: "center", color: "#B91C1C", fontSize: 15 }}>
          {error}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#6b7a74", fontSize: 15 }}>
          No reports submitted yet.
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onOpen={onOpenDetail} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useI18n } from "../i18n/LanguageProvider";
import { RISK, STATUS_STYLE } from "../theme";
import type { ReportStatus, RiskLevel } from "../types";
import type { StringKey } from "../i18n/strings";

type Size = "sm" | "md" | "lg";

const SIZING: Record<Size, { padding: string; fontSize: number; dot: number; weight: number }> = {
  sm: { padding: "3px 9px", fontSize: 12, dot: 6, weight: 600 },
  md: { padding: "5px 12px", fontSize: 14, dot: 8, weight: 700 },
  lg: { padding: "11px 20px", fontSize: 16, dot: 10, weight: 700 },
};

const RISK_KEY: Record<RiskLevel, StringKey> = {
  critical: "risk_critical",
  high: "risk_high",
  medium: "risk_medium",
  low: "risk_low",
};

const STATUS_KEY: Record<ReportStatus, StringKey> = {
  complete: "status_complete",
  processing: "status_processing",
  flagged: "status_flagged",
};

export function RiskBadge({ risk, size = "sm" }: { risk: RiskLevel; size?: Size }) {
  const { t } = useI18n();
  const rk = RISK[risk];
  const s = SIZING[size];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 5 : 6,
        padding: s.padding,
        borderRadius: 999,
        background: rk.bg,
        color: rk.color,
        fontSize: s.fontSize,
        fontWeight: s.weight,
      }}
    >
      <span style={{ width: s.dot, height: s.dot, borderRadius: "50%", background: rk.color }} />
      {t(RISK_KEY[risk])}
    </span>
  );
}

export function StatusBadge({ status, size = "sm" }: { status: ReportStatus; size?: Size }) {
  const { t } = useI18n();
  const st = STATUS_STYLE[status];
  const s = SIZING[size];
  return (
    <span
      style={{
        padding: s.padding,
        borderRadius: 999,
        background: st.bg,
        color: st.color,
        fontSize: size === "md" ? 13 : s.fontSize,
        fontWeight: 600,
      }}
    >
      {t(STATUS_KEY[status])}
    </span>
  );
}

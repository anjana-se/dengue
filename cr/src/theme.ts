/**
 * Design tokens ported verbatim from the DengueGuard design file.
 * Keeping them in one place lets every screen share the exact palette.
 */
export const color = {
  forest: "#0D4A3E", // primary brand
  forestDark: "#0a3a30",
  leaf: "#65A30D", // accent / call-to-action
  ink: "#1c2b26", // body text
  inkSoft: "#33433c",
  muted: "#6b7a74",
  faint: "#8a978f",
  hairline: "rgba(13,74,62,.08)",
  surface: "#FAFAF8", // app canvas
  page: "#e6e9e6", // page behind the phone frame
  fieldBg: "#fff",
  fieldBorder: "#dfe4e0",
  chipBg: "#EEF1EE",
  panel: "#F0F6F2",
} as const;

export type RiskLevel = "critical" | "high" | "medium" | "low";

export const RISK: Record<RiskLevel, { color: string; bg: string; thumb: string }> = {
  critical: { color: "#B91C1C", bg: "#FEE2E2", thumb: "linear-gradient(135deg,#991B1B,#B91C1C)" },
  high: { color: "#C2410C", bg: "#FFEDD5", thumb: "linear-gradient(135deg,#C2410C,#EA580C)" },
  medium: { color: "#A16207", bg: "#FEF3C7", thumb: "linear-gradient(135deg,#A16207,#CA8A04)" },
  low: { color: "#4D7C0F", bg: "#ECFCCB", thumb: "linear-gradient(135deg,#3F6212,#65A30D)" },
};

/** Status → badge palette (see reportVM in the design). */
export const STATUS_STYLE = {
  complete: { bg: "#ECFDF5", color: "#059669" },
  processing: { bg: "#FEF3C7", color: "#B45309" },
  flagged: { bg: "#EEF2FF", color: "#4338CA" },
} as const;

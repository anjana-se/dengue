import type { Report } from "../types";

/**
 * Seed reports for "My reports". In production these come from the reports
 * API for the signed-in user; the shape here matches the design fixture.
 */
export const MOCK_REPORTS: Report[] = [
  { id: "r1", risk: "critical", status: "flagged", zone: "Colombo 3 — Kollupitiya", days: 0, hours: 2, siteType: "Discarded tyre", confidence: 96 },
  { id: "r2", risk: "critical", status: "complete", zone: "Colombo 6 — Wellawatte", days: 1, siteType: "Blocked drain", confidence: 93 },
  { id: "r3", risk: "high", status: "processing", zone: "Colombo 5 — Narahenpita", days: 2, siteType: "Water container", confidence: 88 },
  { id: "r4", risk: "high", status: "complete", zone: "Gampaha — Kadawatha", days: 5, siteType: "Uncovered tank", confidence: 84 },
  { id: "r5", risk: "high", status: "flagged", zone: "Colombo 8 — Borella", days: 9, siteType: "Plant pot tray", confidence: 79 },
  { id: "r6", risk: "medium", status: "complete", zone: "Colombo 4 — Bambalapitiya", days: 14, siteType: "Roof gutter", confidence: 71 },
  { id: "r7", risk: "medium", status: "complete", zone: "Gampaha — Ja-Ela", days: 21, siteType: "Bucket", confidence: 66 },
  { id: "r8", risk: "low", status: "complete", zone: "Colombo 7 — Cinnamon Gardens", days: 28, siteType: "Bird bath", confidence: 58 },
];

/**
 * Render a relative-time label for a report age.
 * Ported from the design's `timeAgo`, made locale-parameterised.
 */
export function timeAgo(report: Pick<Report, "days" | "hours" | "createdAt">, locale = "en-GB"): string {
  if (report.createdAt) {
    const diffMs = Math.max(0, new Date().getTime() - new Date(report.createdAt).getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      if (diffSec <= 1) return "1 second ago";
      return `${diffSec} seconds ago`;
    }
    if (diffMin < 60) {
      if (diffMin === 1) return "1 minute ago";
      return `${diffMin} minutes ago`;
    }
    if (diffHr < 24) {
      if (diffHr === 1) return "1 hour ago";
      return `${diffHr} hours ago`;
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return new Date(report.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  if (report.days === 0) {
    const h = report.hours ?? 1;
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  if (report.days === 1) return "Yesterday";
  if (report.days < 7) return `${report.days} days ago`;
  const d = new Date();
  d.setDate(d.getDate() - report.days);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

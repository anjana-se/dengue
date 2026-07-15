function timeAgo(report, locale = "en-GB") {
  if (report.createdAt) {
    // Mock new Date().getTime() to be 2026-07-15T09:37:43.000Z
    const mockNow = new Date("2026-07-15T09:37:43.000Z").getTime();
    const diffMs = Math.max(0, mockNow - new Date(report.createdAt).getTime());
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    console.log({ diffMs, diffSec, diffMin, diffHr, diffDays });

    if (diffSec < 60) {
      return diffSec <= 5 ? "5 seconds ago" : `${diffSec} seconds ago`;
    }
    if (diffMin < 60) {
      return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
    }
    if (diffHr < 24) {
      return diffHr === 1 ? "1 hour ago" : `${diffHr} hours ago`;
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

const res = timeAgo({ createdAt: "2026-07-15T08:57:32.984Z", days: 0, hours: 1 });
console.log('Result of timeAgo:', res);

/** "just now" / "5m ago" / "3h ago" / "2d ago" */
export function tago(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 1) return 'just now';
  if (d < 60) return Math.floor(d) + 'm ago';
  if (d < 1440) return Math.floor(d / 60) + 'h ago';
  return Math.floor(d / 1440) + 'd ago';
}

/** Verbose relative time: "5 minutes ago" / "3 hours ago" / "Yesterday" / "2 days ago". */
export function tagoLong(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = ms / 60000;
  if (m < 1) return 'just now';
  if (m < 60) {
    const n = Math.round(m);
    return n + ' minute' + (n === 1 ? '' : 's') + ' ago';
  }
  const hh = m / 60;
  if (hh < 24) {
    const n = Math.round(hh);
    return n + ' hour' + (n === 1 ? '' : 's') + ' ago';
  }
  const dd = hh / 24;
  if (dd < 2) return 'Yesterday';
  return Math.round(dd) + ' days ago';
}

/** "14:03, 12 Jul" */
export function timf(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

/** "12 Jul 2026" */
export function datef(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

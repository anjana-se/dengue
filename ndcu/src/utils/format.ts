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

/** "RPT-000042" from a sequential report number.
 *  Falls back to the raw id for mock/legacy data lacking report_no. */
export function reportRef(no?: number | string | null, fallbackId?: string): string {
  if (no == null || no === '') return fallbackId ?? '—';
  const n = Number(no);
  if (!Number.isFinite(n)) return fallbackId ?? String(no);
  return 'RPT-' + String(n).padStart(6, '0');
}

/**
 * Human-readable labels for the AI `site_type` enum. The stored/queried value
 * stays the raw enum (e.g. "blocked_drain"); this is display-only.
 */
const SITE_TYPE_LABELS: Record<string, string> = {
  discarded_tire: 'Discarded Tyre',
  plastic_container: 'Plastic Container',
  metal_container: 'Metal Container',
  water_storage_tank_barrel: 'Water Storage Tank / Barrel',
  flower_pot_or_saucer: 'Flower Pot / Saucer',
  roof_gutter: 'Roof Gutter',
  blocked_drain: 'Blocked Drain',
  construction_site_water: 'Construction Site Water',
  coconut_shell: 'Coconut Shell',
  tree_hole: 'Tree Hole',
  ornamental_pond: 'Ornamental Pond',
  ac_or_fridge_tray: 'AC / Fridge Tray',
  bird_bath: 'Bird Bath',
  tarpaulin_sheeting: 'Tarpaulin Sheeting',
  unused_well: 'Unused Well',
  refuse_or_food_container: 'Refuse / Food Container',
  other: 'Other',
};

/** "blocked_drain" -> "Blocked Drain". Falls back to Title-Case for any unknown/legacy value. */
export function siteTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const mapped = SITE_TYPE_LABELS[value.toLowerCase()];
  if (mapped) return mapped;
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

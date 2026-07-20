/**
 * Display helpers for the Community Reporter app.
 *
 * The AI `site_type` is a controlled enum on the backend (e.g. "blocked_drain").
 * This maps it to a human-readable label for display only — stored/queried
 * values stay the raw enum. Legacy/mock pretty-strings pass through the fallback.
 */
const SITE_TYPE_LABELS: Record<string, string> = {
  discarded_tire: "Discarded Tyre",
  plastic_container: "Plastic Container",
  metal_container: "Metal Container",
  water_storage_tank_barrel: "Water Storage Tank / Barrel",
  flower_pot_or_saucer: "Flower Pot / Saucer",
  roof_gutter: "Roof Gutter",
  blocked_drain: "Blocked Drain",
  construction_site_water: "Construction Site Water",
  coconut_shell: "Coconut Shell",
  tree_hole: "Tree Hole",
  ornamental_pond: "Ornamental Pond",
  ac_or_fridge_tray: "AC / Fridge Tray",
  bird_bath: "Bird Bath",
  tarpaulin_sheeting: "Tarpaulin Sheeting",
  unused_well: "Unused Well",
  refuse_or_food_container: "Refuse / Food Container",
  other: "Other",
};

/** "blocked_drain" -> "Blocked Drain". Falls back to Title-Case for unknown/legacy values. */
export function siteTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const mapped = SITE_TYPE_LABELS[value.toLowerCase()];
  if (mapped) return mapped;
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

import type { RiskLevel } from "../types";

/**
 * Action guidance shown on the result screen and in report detail.
 *
 * NOTE: kept English-only to match the design. When productionising, move
 * these into the i18n string table (keys guide_critical … guide_low) so
 * guidance is localised alongside the rest of the UI.
 */
export const GUIDE: Record<RiskLevel, string> = {
  critical:
    "Larvae are visible in standing water. Empty and scrub the container now, then cover or dispose of it. A field team has been notified.",
  high: "Standing water likely to breed mosquitoes. Drain it within 24 hours and remove or cover the container to prevent refilling.",
  medium:
    "Some standing water detected. Tip it out and keep the area dry. Check again after the next rain.",
  low: "Low risk, but keep the area free of standing water and check weekly during the monsoon season.",
};

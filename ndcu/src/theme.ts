import type {
  AlertLevel,
  DecisionStatus,
  DecisionType,
  IncidentStatus,
  RiskLevel,
  RiskTrend,
  Severity,
  Species,
  TrapStatus,
} from './types';

export const PRIMARY = '#0D4A3E';
export const AMBER = '#F59E0B';

export const RISK: Record<RiskLevel, { c: string; bg: string; label: string }> = {
  critical: { c: '#DC2626', bg: '#FEECEC', label: 'Critical' },
  high: { c: '#F59E0B', bg: '#FEF5E6', label: 'High' },
  medium: { c: '#3B82F6', bg: '#ECF3FE', label: 'Medium' },
  low: { c: '#10B981', bg: '#E7F7F0', label: 'Low' },
  none: { c: '#6B7280', bg: '#F3F4F6', label: 'None' },
};

export const CASE_SEV: Record<Severity, { c: string; label: string; w: number }> = {
  mild: { c: '#60A5FA', label: 'Mild', w: 0.4 },
  moderate: { c: '#F59E0B', label: 'Moderate', w: 0.7 },
  severe: { c: '#DC2626', label: 'Severe', w: 1.0 },
};

export const ALERT_LV: Record<AlertLevel, { c: string; bg: string; label: string }> = {
  watch: { c: '#3B82F6', bg: '#ECF3FE', label: 'Watch' },
  warning: { c: '#F59E0B', bg: '#FEF5E6', label: 'Warning' },
  emergency: { c: '#DC2626', bg: '#FEECEC', label: 'Emergency' },
};

export const TREND: Record<RiskTrend, { a: string; label: string; c: string }> = {
  rising: { a: '↑', label: 'Rising', c: '#DC2626' },
  stable: { a: '→', label: 'Stable', c: '#6b7c77' },
  falling: { a: '↓', label: 'Falling', c: '#10B981' },
};

export interface PredBand {
  fill: string;
  op: number;
  pulse?: boolean;
}

export const INC_STATUS: Record<IncidentStatus, { c: string; bg: string; label: string }> = {
  open: { c: '#3B82F6', bg: '#ECF3FE', label: 'Open' },
  verified: { c: '#8B5CF6', bg: '#F1EDFE', label: 'Verified' },
  resolved: { c: '#10B981', bg: '#E7F7F0', label: 'Resolved' },
  closed: { c: '#6b7c77', bg: '#eef1f0', label: 'Closed' },
};

export const DEC_TYPE: Record<DecisionType, { c: string; bg: string; label: string }> = {
  auto_attached: { c: '#10B981', bg: '#E7F7F0', label: 'Auto-attached' },
  flagged_review: { c: '#F59E0B', bg: '#FEF5E6', label: 'Flagged for review' },
  new_incident: { c: '#3B82F6', bg: '#ECF3FE', label: 'New incident' },
};

export const DEC_STATUS: Record<DecisionStatus, { c: string; bg: string; label: string }> = {
  pending: { c: '#F59E0B', bg: '#FEF5E6', label: 'Pending' },
  approved: { c: '#10B981', bg: '#E7F7F0', label: 'Approved' },
  overridden: { c: '#8B5CF6', bg: '#F1EDFE', label: 'Overridden' },
};

export const TRAP_STATUS: Record<TrapStatus, { c: string; label: string }> = {
  active: { c: '#0F6E56', label: 'Active' },
  offline: { c: '#888780', label: 'Offline' },
  maintenance: { c: '#F59E0B', label: 'Maintenance' },
};

export const SPECIES_LABEL: Record<Species, string> = {
  aedes_aegypti: 'Ae. aegypti',
  aedes_albopictus: 'Ae. albopictus',
};

/** Choropleth band for an outbreak probability, or null to draw nothing. */
export const PRED_BAND = (p: number): PredBand | null =>
  p >= 0.9
    ? { fill: '#EF4444', op: 0.45, pulse: true }
    : p >= 0.75
      ? { fill: '#FB923C', op: 0.4 }
      : p >= 0.6
        ? { fill: '#FCD34D', op: 0.35 }
        : p >= 0.4
          ? { fill: '#FEF08A', op: 0.25 }
          : null;

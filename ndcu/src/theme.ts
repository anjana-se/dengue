import type { AlertLevel, RiskLevel, RiskTrend, Severity } from './types';

export const PRIMARY = '#0D4A3E';
export const AMBER = '#F59E0B';

export const RISK: Record<RiskLevel, { c: string; bg: string; label: string }> = {
  critical: { c: '#DC2626', bg: '#FEECEC', label: 'Critical' },
  high: { c: '#F59E0B', bg: '#FEF5E6', label: 'High' },
  medium: { c: '#3B82F6', bg: '#ECF3FE', label: 'Medium' },
  low: { c: '#10B981', bg: '#E7F7F0', label: 'Low' },
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

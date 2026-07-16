import type {
  AlertLevel,
  ContributingFactors,
  LatLng,
  Phi,
  Prediction,
  Recommendation,
  RiskTrend,
  Weather,
  Zone,
} from '../types';

/** Map center (Colombo). */
export const CENTER: LatLng = [6.9271, 79.8612];

export const ZONES: Zone[] = [
  { zone_id: 'Z1', name: 'Colombo Fort', risk_score: 88, risk_level: 'critical', active_report_count: 14, open_orders: 6, c: [[6.94, 79.842], [6.94, 79.856], [6.93, 79.856], [6.93, 79.842]] },
  { zone_id: 'Z2', name: 'Pettah', risk_score: 81, risk_level: 'critical', active_report_count: 11, open_orders: 5, c: [[6.94, 79.856], [6.94, 79.87], [6.93, 79.87], [6.93, 79.856]] },
  { zone_id: 'Z3', name: 'Maradana', risk_score: 67, risk_level: 'high', active_report_count: 8, open_orders: 3, c: [[6.93, 79.856], [6.93, 79.872], [6.92, 79.872], [6.92, 79.856]] },
  { zone_id: 'Z4', name: 'Slave Island', risk_score: 59, risk_level: 'high', active_report_count: 6, open_orders: 2, c: [[6.93, 79.842], [6.93, 79.856], [6.92, 79.856], [6.92, 79.842]] },
  { zone_id: 'Z5', name: 'Kollupitiya', risk_score: 44, risk_level: 'medium', active_report_count: 4, open_orders: 1, c: [[6.92, 79.84], [6.92, 79.856], [6.908, 79.856], [6.908, 79.84]] },
  { zone_id: 'Z6', name: 'Borella', risk_score: 38, risk_level: 'medium', active_report_count: 3, open_orders: 1, c: [[6.92, 79.87], [6.92, 79.886], [6.908, 79.886], [6.908, 79.87]] },
  { zone_id: 'Z7', name: 'Bambalapitiya', risk_score: 22, risk_level: 'low', active_report_count: 1, open_orders: 0, c: [[6.908, 79.848], [6.908, 79.864], [6.895, 79.864], [6.895, 79.848]] },
  { zone_id: 'Z8', name: 'Wellawatte', risk_score: 17, risk_level: 'low', active_report_count: 1, open_orders: 0, c: [[6.895, 79.85], [6.895, 79.866], [6.882, 79.866], [6.882, 79.85]] },
];

export const SITES: string[] = [
  'Discarded tyre',
  'Blocked roof gutter',
  'Water storage tank',
  'Construction site',
  'Abandoned lot',
  'Flower pot saucer',
  'Clogged drain',
];

export const PHIS: Phi[] = [
  { user_id: 'U1', name: 'S. Fernando' },
  { user_id: 'U2', name: 'K. Perera' },
  { user_id: 'U3', name: 'M. Silva' },
  { user_id: 'U4', name: 'A. Jayasuriya' },
  { user_id: 'U5', name: 'R. Wickrama' },
];

export const RECS: Recommendation[] = [
  { rank: 1, zone_id: 'Z1', zone_name: 'Colombo Fort', action: 'Deploy 2 teams for source reduction sweep', reasoning: '14 active reports in 24h, 6 with visible larvae. Risk score up 12 points since yesterday.', confidence: 94, suggested_teams: 2 },
  { rank: 2, zone_id: 'Z2', zone_name: 'Pettah', action: 'Priority larviciding of market drainage', reasoning: 'Dense reporting cluster around market. Blocked-drain site type dominant.', confidence: 89, suggested_teams: 2 },
  { rank: 3, zone_id: 'Z3', zone_name: 'Maradana', action: 'Community awareness + tyre collection', reasoning: 'Recurring discarded-tyre reports; upward trend over 3 days.', confidence: 81, suggested_teams: 1 },
  { rank: 4, zone_id: 'Z4', zone_name: 'Slave Island', action: 'Inspect construction sites', reasoning: 'Two large construction lots with standing water flagged by drone survey.', confidence: 76, suggested_teams: 1 },
];

// ---------- Dengue cases (patient GIS layer) ----------
export const HOSPITALS: string[] = [
  'National Hospital Colombo',
  'Colombo South Teaching Hospital',
  'Gampaha District General Hospital',
  'Lady Ridgeway Hospital',
  'De Soysa Maternity Hospital',
  'Ragama Teaching Hospital',
];

export interface CaseZone {
  n: string;
  d: string;
  lat: number;
  lng: number;
  w: number;
}

export const CASE_ZONES: CaseZone[] = [
  { n: 'Colombo 1 — Fort', d: 'Colombo', lat: 6.935, lng: 79.843, w: 9 },
  { n: 'Colombo 3 — Maradana', d: 'Colombo', lat: 6.925, lng: 79.862, w: 10 },
  { n: 'Colombo 5 — Havelock', d: 'Colombo', lat: 6.889, lng: 79.868, w: 9 },
  { n: 'Colombo 7 — Cinnamon Gardens', d: 'Colombo', lat: 6.91, lng: 79.868, w: 8 },
  { n: 'Colombo 2 — Slave Island', d: 'Colombo', lat: 6.92, lng: 79.848, w: 5 },
  { n: 'Colombo 6 — Wellawatte', d: 'Colombo', lat: 6.876, lng: 79.862, w: 4 },
  { n: 'Gampaha Town', d: 'Gampaha', lat: 7.087, lng: 79.999, w: 8 },
  { n: 'Ragama', d: 'Gampaha', lat: 7.029, lng: 79.922, w: 4 },
  { n: 'Ja-Ela', d: 'Gampaha', lat: 7.074, lng: 79.892, w: 3 },
];

export const AGES: string[] = ['0-14', '15-34', '35-59', '60+'];

// ---------- Weather (drives predictions) ----------
export const WEATHER: Weather = {
  temp: 31,
  humidity: 84,
  rain7d: 96,
  updated: new Date().toISOString(),
  forecast: [
    { d: 'Mon', min: 27, max: 32, rain: 12 },
    { d: 'Tue', min: 27, max: 31, rain: 22 },
    { d: 'Wed', min: 26, max: 30, rain: 38 },
    { d: 'Thu', min: 26, max: 30, rain: 41 },
    { d: 'Fri', min: 27, max: 31, rain: 18 },
    { d: 'Sat', min: 27, max: 32, rain: 9 },
    { d: 'Sun', min: 28, max: 33, rain: 6 },
  ],
};

// ---------- Outbreak predictions (forecast layer) ----------
type PredTune = [number, RiskTrend, AlertLevel];

const PRED_TUNE: Record<string, PredTune> = {
  Z1: [0.91, 'rising', 'emergency'],
  Z2: [0.83, 'rising', 'warning'],
  Z3: [0.78, 'rising', 'warning'],
  Z4: [0.63, 'stable', 'watch'],
  Z5: [0.55, 'stable', 'watch'],
  Z6: [0.47, 'falling', 'watch'],
  Z7: [0.3, 'falling', 'watch'],
  Z8: [0.22, 'stable', 'watch'],
};

export const PREDICTIONS: Prediction[] = ZONES.map((z) => {
  const t = PRED_TUNE[z.zone_id] ?? ([0.3, 'stable', 'watch'] as PredTune);
  const prob = t[0];
  const contributing_factors: ContributingFactors = {
    breeding_site_density: Math.min(1, 0.35 + prob * 0.6),
    recent_case_count: Math.round(4 + prob * 22),
    rainfall_mm_forecast: Math.round(20 + prob * 60),
    temperature_avg_c: Math.round((27 + prob * 5) * 10) / 10,
    humidity_percent: Math.round(70 + prob * 18),
  };
  return {
    zone_id: z.zone_id,
    zone_name: z.name,
    prediction_date: new Date().toISOString(),
    forecast_horizon_days: 14,
    outbreak_probability: prob,
    risk_trend: t[1],
    confidence: 0.7 + Math.round((0.95 - 0.7) * prob * 100) / 100,
    contributing_factors,
    recommended_action:
      prob >= 0.9
        ? 'Immediate multi-team source reduction + emergency fogging'
        : prob >= 0.75
          ? 'Deploy priority larviciding and intensify surveillance'
          : prob >= 0.6
            ? 'Increase inspection frequency and community messaging'
            : 'Maintain routine monitoring',
    alert_level: t[2],
    c: z.c,
  };
});

// ---------- Domain types for the DengueGuard Operations Portal ----------

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type Role = 'ndcu_admin' | 'phi' | 'drone_operator';
export type ViewKey = 'dashboard' | 'reports' | 'workorders' | 'drone' | 'chat' | 'users';
export type LoginTab = 'email' | 'otp';
export type SourceType = 'community' | 'drone';
export type ReportStatus = 'processing' | 'analysed';
export type WorkOrderStatus = 'new' | 'assigned' | 'in_progress' | 'resolved';
export type Severity = 'mild' | 'moderate' | 'severe';
export type CaseStatus = 'active' | 'recovered';
export type AlertLevel = 'watch' | 'warning' | 'emergency';
export type RiskTrend = 'rising' | 'stable' | 'falling';
export type CaseView = 'cluster' | 'heatmap';
export type ToastKind = 'success' | 'error' | 'info';
export type MissionStatus = 'open' | 'processing' | 'complete';

/** [lat, lng] tuple as consumed by Leaflet. */
export type LatLng = [number, number];

export interface Zone {
  zone_id: string;
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  active_report_count: number;
  open_orders: number;
  /** Polygon ring. */
  c: LatLng[];
}

export interface AiAnalysis {
  water_present: boolean;
  site_type: string;
  larvae_visible: boolean;
  reasoning: string;
}

export interface Report {
  report_id: string;
  source_type: SourceType;
  lat: number;
  lng: number;
  description: string;
  status: ReportStatus;
  risk_level: RiskLevel;
  confidence: number;
  needs_human_review: boolean;
  remediation_action: string;
  site_type: string;
  larvae_visible: boolean;
  guidance_text: string;
  ai_analysis: AiAnalysis;
  zone_id: string;
  zone_name: string;
  created_at: string;
  /** Set on freshly streamed-in reports so the feed can animate them. */
  _new?: boolean;
}

export interface Phi {
  user_id: string;
  name: string;
}

export interface WorkOrder {
  wo_id: string;
  status: WorkOrderStatus;
  priority_score: number;
  assigned_to: Phi | null;
  lat: number;
  lng: number;
  zone_name: string;
  zone_id: string;
  risk_level: RiskLevel;
  confidence: number;
  site_type: string;
  remediation_action: string;
  guidance_text: string;
  larvae_visible: boolean;
  image_url: string | null;
  description: string;
  ndcu_instructions: string;
  notes: string;
  outcome: string | null;
  created_at: string;
  resolved_at?: string;
}

export interface Recommendation {
  rank: number;
  zone_id: string;
  zone_name: string;
  action: string;
  reasoning: string;
  confidence: number;
  suggested_teams: number;
}

export interface DengueCase {
  case_id: string;
  lat: number;
  lng: number;
  district: string;
  zone_name: string;
  reported_date: string;
  age_group: string;
  severity: Severity;
  hospital: string;
  status: CaseStatus;
}

export interface ContributingFactors {
  breeding_site_density: number;
  recent_case_count: number;
  rainfall_mm_forecast: number;
  temperature_avg_c: number;
  humidity_percent: number;
}

export interface Prediction {
  zone_id: string;
  zone_name: string;
  prediction_date: string;
  forecast_horizon_days: number;
  outbreak_probability: number;
  risk_trend: RiskTrend;
  confidence: number;
  contributing_factors: ContributingFactors;
  recommended_action: string;
  alert_level: AlertLevel;
  c: LatLng[];
}

export interface WeatherForecastDay {
  d: string;
  min: number;
  max: number;
  rain: number;
}

export interface Weather {
  temp: number;
  humidity: number;
  rain7d: number;
  updated: string;
  forecast: WeatherForecastDay[];
}

export interface MissionSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Mission {
  mission_id: string;
  mission_name: string;
  status: MissionStatus;
  image_count: number;
  processed_count: number;
  summary: MissionSummary;
}

export interface Toast {
  id: number;
  t: string;
  kind: ToastKind;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  lang: string;
}

export interface Layers {
  zones: boolean;
  community: boolean;
  drone: boolean;
  cases: boolean;
  forecast: boolean;
}

export type LayerKey = keyof Layers;

/** Staff user for the user management panel (NDCU Admin only). */
export interface StaffUser {
  id: string;
  email: string | null;
  full_name: string;
  role: Role;
  is_active: boolean;
  language_preference: string;
  assigned_zone_id: string | null;
  last_login_at: string | null;
  created_at: string;
}

/** Current logged-in user profile. */
export interface CurrentUser {
  id: string;
  email: string | null;
  full_name: string;
  role: Role;
  language_preference: string;
  assigned_zone_id: string | null;
  is_active: boolean;
}

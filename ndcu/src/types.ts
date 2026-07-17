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
export type IncidentStatus = 'open' | 'verified' | 'resolved' | 'closed';
export type DecisionType = 'auto_attached' | 'flagged_review' | 'new_incident';
export type DecisionStatus = 'pending' | 'approved' | 'overridden';
export type TrapStatus = 'active' | 'offline' | 'maintenance';
export type TrapView = 'traps' | 'heatmap';
export type Species = 'aedes_aegypti' | 'aedes_albopictus';
export type DashLayout = 'map' | 'split' | 'stats';
export type ReportFilter = 'all' | 'open' | 'verified' | 'needs_review';

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
  meta_name?: string;
  meta_district?: string;
  meta_province?: string;
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
  incident_id?: string;
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
  incident_id?: string;
  confirmation_count?: number;
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
  traps: boolean;
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

// ---------- Incidents & duplicate handling ----------
export interface Incident {
  incident_id: string;
  code: string;
  status: IncidentStatus;
  risk_level: RiskLevel;
  lat: number;
  lng: number;
  zone_id: string;
  zone_name: string;
  confirmation_count: number;
  report_count: number;
  primary_report_id: string;
  created_at: string;
  verified_at: string | null;
  resolved_at: string | null;
  site_type: string;
  mergedInto?: string;
}

export interface Decision {
  decision_id: string;
  new_report_id: string;
  matched_incident_id: string | null;
  confidence: number;
  decision: DecisionType;
  status: DecisionStatus;
  ai_reasoning: string;
  reviewed_by: string | null;
  override_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  gps_distance_m: number;
  time_diff_h: number;
  new_lat: number;
  new_lng: number;
}

/** A report row derived for an incident's detail view. */
export interface IncidentReport {
  report_id: string;
  role: string;
  submitted_at: string;
  risk_level: RiskLevel;
  confidence: number;
  primary: boolean;
  site_type: string;
}

export interface IncidentDetail {
  inc: Incident;
  reports: IncidentReport[];
  decisions: Decision[];
}

// ---------- IoT mosquito traps ----------
export interface TrapReadings {
  mosquito_count_24h: number;
  mosquito_count_7d: number;
  species_detected: Species[];
  larvae_detected: boolean;
  water_temp_c: number;
  humidity_percent: number;
  trap_fill_percent: number;
}

export interface Trap {
  trap_id: string;
  serial_number: string;
  lat: number;
  lng: number;
  zone_id: string;
  zone_name: string;
  district: string;
  status: TrapStatus;
  battery_percent: number;
  last_sync_at: string;
  installed_at: string;
  readings: TrapReadings;
}

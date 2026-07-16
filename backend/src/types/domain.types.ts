import { Role, RiskLevel, SiteType, Language, WorkOrderStatus, ReportStatus, SourceType } from '../config/constants';

/**
 * types/domain.types.ts — Shared TypeScript domain types.
 * These mirror the database row shapes and are used across services and queries.
 * Re-exports string-literal types derived from constants.ts.
 */

export type { Role, RiskLevel, SiteType, Language, WorkOrderStatus, ReportStatus, SourceType };

// ─── Database row types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: Role;
  is_active: boolean;
  language_preference: Language;
  assigned_zone_id: string | null;
  google_oauth_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Zone {
  id: string;
  name: string;
  district: string;
  province: string;
  geom: string;            // GeoJSON string or WKT from PostGIS
  risk_score: number;
  risk_level: RiskLevel;
  active_report_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DroneMission {
  id: string;
  zone_id: string;
  operator_id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'aborted';
  started_at: Date | null;
  completed_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: string;
  source_type: SourceType;
  reporter_id: string | null;
  zone_id: string | null;
  drone_mission_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  image_url: string;
  image_key: string | null;
  status: ReportStatus;
  site_type: SiteType | null;
  risk_level: RiskLevel | null;
  confidence_score: number | null;
  ai_analysis: Record<string, unknown> | null;   // full JSON from Gemini
  guidance_text: string | null;
  guidance_text_si: string | null;
  guidance_text_ta: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkOrder {
  id: string;
  report_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  status: WorkOrderStatus;
  priority_score: number;
  remediation_action: string | null;
  follow_up_image_url: string | null;
  follow_up_image_key: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  language: Language;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ─── AI analysis result (Gemini response, post-parse) ────────────────────────

export interface AiAnalysisResult {
  site_type: SiteType;
  risk_level: RiskLevel;
  confidence_score: number;
  breeding_indicators: string[];
  guidance_text: string;
  remediation_action: string;
  needs_human_review: boolean;
  raw_response: Record<string, unknown>;
}

// ─── BullMQ job data ─────────────────────────────────────────────────────────

export interface AiAnalysisJobData {
  report_id: string;
  image_url: string;
  language: Language;
}

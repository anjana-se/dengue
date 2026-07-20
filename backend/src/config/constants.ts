/**
 * constants.ts — Application-wide enums and threshold values.
 * Defined once here and imported everywhere — never copy-pasted.
 */

// ─── Risk scoring thresholds (FR-20) ────────────────────────────────────────
export const RISK_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  // < MEDIUM = LOW
} as const;

// ─── Site-type taxonomy ──────────────────────────────────────────────────────
export const SITE_TYPES = [
  'discarded_tire',
  'plastic_container',
  'metal_container',
  'water_storage_tank_barrel',
  'flower_pot_or_saucer',
  'roof_gutter',
  'blocked_drain',
  'construction_site_water',
  'coconut_shell',
  'tree_hole',
  'ornamental_pond',
  'ac_or_fridge_tray',
  'bird_bath',
  'tarpaulin_sheeting',
  'unused_well',
  'refuse_or_food_container',
  'other',
] as const;

export type SiteType = (typeof SITE_TYPES)[number];

// ─── Roles ───────────────────────────────────────────────────────────────────
export const ROLES = {
  COMMUNITY_REPORTER: 'community_reporter',
  DRONE_OPERATOR: 'drone_operator',
  PHI: 'phi',
  NDCU_ADMIN: 'ndcu_admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Languages (FR-33) ───────────────────────────────────────────────────────
export const LANGUAGES = {
  SINHALA: 'si',
  TAMIL: 'ta',
  ENGLISH: 'en',
} as const;

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES];

// ─── Report status ───────────────────────────────────────────────────────────
export const REPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  NEEDS_HUMAN_REVIEW: 'needs_human_review',
  FAILED: 'failed',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

// ─── Work-order status ───────────────────────────────────────────────────────
export const WORK_ORDER_STATUS = {
  OPEN: 'open',
  ACCEPTED: 'accepted',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
} as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUS)[keyof typeof WORK_ORDER_STATUS];

// ─── Risk levels ─────────────────────────────────────────────────────────────
export const RISK_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

// ─── Report source ───────────────────────────────────────────────────────────
export const SOURCE_TYPES = {
  COMMUNITY: 'community',
  DRONE: 'drone',
} as const;

export type SourceType = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];

// ─── Remediation actions ─────────────────────────────────────────────────────
export const REMEDIATION_ACTIONS = [
  'drain_water',
  'remove_container',
  'apply_larvicide',
  'cover_container',
  'clear_drain',
  'spray_insecticide',
  'public_notice',
  'no_action_needed',
  'other',
] as const;

export type RemediationAction = (typeof REMEDIATION_ACTIONS)[number];

// ─── Larvae visibility (vision analysis) ─────────────────────────────────────
export const LARVAE_VISIBILITY = ['yes', 'no', 'unclear'] as const;

export type LarvaeVisibility = (typeof LARVAE_VISIBILITY)[number];

// ─── AI analysis confidence gate ─────────────────────────────────────────────
export const DEFAULT_CONFIDENCE_GATE = 0.7;

// ─── BullMQ queue names ───────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  AI_ANALYSIS: 'ai-analysis',
} as const;

// ─── Socket.IO room names ─────────────────────────────────────────────────────
export const SOCKET_ROOMS = {
  NDCU_ADMINS: 'ndcu_admins',
  phiRoom: (userId: string) => `phi_user_${userId}`,
} as const;

// ─── Socket event names ───────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  REPORT_ANALYSED: 'report:analysed',
  ZONE_UPDATED: 'zone:updated',
  WORKORDER_ASSIGNED: 'workorder:assigned',
  WORKORDER_CREATED: 'workorder:created',
} as const;

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

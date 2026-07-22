import { listZones, getZoneReportStats } from '../../../db/queries/zones.queries';
import { listReports } from '../../../db/queries/reports.queries';
import { listWorkOrders } from '../../../db/queries/workorders.queries';
import { listTraps } from '../../../db/queries/traps.queries';
import { listIncidents } from '../../../db/queries/incidents.queries';
import { listCases } from '../../../db/queries/cases.queries';
import { listForecasts } from '../../../db/queries/forecasts.queries';
import { getDashboardSummaryService } from '../../dashboard/dashboard.service';
import type { ChatToolDef } from '../../../integrations/chatAssistant';
import type { ChatTool, ToolContext } from './types';

/**
 * services/chat/tools/index.ts
 *
 * The chat assistant's READ-ONLY tool registry. Every handler delegates to an
 * existing parameterized query helper — no raw SQL, no writes, no actions.
 *
 * PII posture: handlers return aggregate / operational fields only. Patient
 * clinical data (`cases`) is reduced to counts by severity/status — hospital,
 * age group, case IDs, and precise coordinates are never returned. Report and
 * incident rows are scrubbed of image keys, raw AI analysis, reporter IDs, and
 * free-text notes. Widening any of this in a real deployment must be reviewed by
 * qualified legal/compliance counsel (PDPA / health-PII).
 */

const RISK_LEVELS = ['none', 'low', 'medium', 'high', 'critical'];
const REPORT_STATUSES = ['pending', 'processing', 'complete', 'needs_human_review', 'failed'];
const WORK_ORDER_STATUSES = ['open', 'accepted', 'resolved', 'cancelled'];
const MAX_ROWS = 25;

function clampLimit(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(n, MAX_ROWS);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export const chatTools: ChatTool[] = [
  {
    name: 'list_zones',
    description:
      'List surveillance zones with their current risk level, risk score, and active report count. Optionally filter by risk_level or district. Use this to answer questions about which zones are high-risk.',
    parameters: {
      type: 'object',
      properties: {
        risk_level: { type: 'string', enum: RISK_LEVELS, description: 'Filter to a single risk level.' },
        district: { type: 'string', description: 'Filter by district name (partial match).' },
        active_only: { type: 'boolean', description: 'Only zones with active reports or non-zero risk.' },
      },
    },
    handler: async (args) => {
      const zones = await listZones({
        risk_level: asString(args.risk_level),
        district: asString(args.district),
        active_only: args.active_only === true,
      });
      return zones.map((z) => ({
        id: z.id,
        name: z.name,
        district: z.district,
        risk_level: z.risk_level,
        risk_score: z.risk_score,
        active_reports: z.active_report_count,
      }));
    },
  },
  {
    name: 'get_zone_report_stats',
    description:
      'Get report counts (total, pending, high-risk, critical) for a single zone. Requires the zone_id, which you can get from list_zones or the platform context.',
    parameters: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'The UUID of the zone.' },
      },
      required: ['zone_id'],
    },
    handler: async (args) => {
      const zoneId = asString(args.zone_id);
      if (!zoneId) return { error: 'zone_id is required' };
      return getZoneReportStats(zoneId);
    },
  },
  {
    name: 'list_reports',
    description:
      'List breeding-site reports (community photos + drone imagery), most recent first. Filter by zone_id, status, risk_level, or source_type. Returns operational fields only — no images or personal data.',
    parameters: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Filter by zone UUID.' },
        status: { type: 'string', enum: REPORT_STATUSES },
        risk_level: { type: 'string', enum: RISK_LEVELS },
        source_type: { type: 'string', enum: ['community', 'drone'] },
        limit: { type: 'number', description: `Max rows (1-${MAX_ROWS}, default 10).` },
      },
    },
    handler: async (args) => {
      const limit = clampLimit(args.limit);
      const { rows, total } = await listReports({
        zone_id: asString(args.zone_id),
        status: asString(args.status),
        risk_level: asString(args.risk_level),
        source_type: asString(args.source_type),
        limit,
        offset: 0,
      });
      return {
        total,
        returned: rows.length,
        reports: rows.map((r) => ({
          report_no: (r as { report_no?: number }).report_no ?? null,
          source_type: r.source_type,
          zone_id: r.zone_id,
          location_name: (r as { location_name?: string | null }).location_name ?? null,
          site_type: r.site_type,
          risk_level: r.risk_level,
          status: r.status,
          confidence_score: r.confidence_score,
          created_at: r.created_at,
        })),
      };
    },
  },
  {
    name: 'list_work_orders',
    description:
      'List PHI remediation work orders, highest priority first. Filter by status or zone_id. Use this for questions about outstanding field work.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: WORK_ORDER_STATUSES },
        zone_id: { type: 'string', description: 'Filter by the report zone UUID.' },
        limit: { type: 'number', description: `Max rows (1-${MAX_ROWS}, default 10).` },
      },
    },
    handler: async (args) => {
      const limit = clampLimit(args.limit);
      const { rows, total } = await listWorkOrders({
        status: asString(args.status),
        zone_id: asString(args.zone_id),
        limit,
        offset: 0,
      });
      return {
        total,
        returned: rows.length,
        work_orders: rows.map((w) => ({
          id: w.id,
          report_id: w.report_id,
          status: w.status,
          priority_score: w.priority_score,
          remediation_action: w.remediation_action,
          created_at: w.created_at,
          resolved_at: w.resolved_at,
        })),
      };
    },
  },
  {
    name: 'list_traps',
    description:
      'List IoT mosquito traps with their status, battery level, last sync time, and latest readings. Filter by zone_id or status (active/offline/maintenance). Use for questions about sensor health or mosquito activity.',
    parameters: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Filter by zone UUID.' },
        status: { type: 'string', enum: ['active', 'offline', 'maintenance'] },
      },
    },
    handler: async (args) => {
      const traps = await listTraps({
        zone_id: asString(args.zone_id),
        status: asString(args.status),
      });
      return traps.map((t) => ({
        serial_number: t.serial_number,
        zone_name: t.zone_name,
        district: t.district,
        status: t.status,
        battery_percent: t.battery_percent,
        last_sync_at: t.last_sync_at,
        readings: t.readings,
      }));
    },
  },
  {
    name: 'list_incidents',
    description:
      'List deduplicated breeding-site incidents (clusters of confirming reports), most recent first. Filter by status (open/verified/resolved/closed).',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'verified', 'resolved', 'closed'] },
        limit: { type: 'number', description: `Max rows (1-${MAX_ROWS}, default 10).` },
      },
    },
    handler: async (args) => {
      const limit = clampLimit(args.limit);
      const { data, total } = await listIncidents({
        status: asString(args.status),
        page: 1,
        limit,
      });
      return {
        total,
        returned: data.length,
        incidents: data.map((i: Record<string, unknown>) => ({
          code: i.code,
          status: i.status,
          risk_level: i.risk_level,
          zone_name: i.zone_name,
          site_type: i.site_type,
          report_count: i.report_count,
          confirmation_count: i.confirmation_count,
          created_at: i.created_at,
        })),
      };
    },
  },
  {
    name: 'get_case_summary',
    description:
      'Get an AGGREGATE summary of clinical dengue cases: counts by severity (mild/moderate/severe) and status (active/recovered). Optionally filter by zone_id or severity. Returns counts only — no patient-identifying details.',
    parameters: {
      type: 'object',
      properties: {
        zone_id: { type: 'string', description: 'Filter by zone UUID.' },
        severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
      },
    },
    handler: async (args) => {
      const { data, total } = await listCases({
        zone_id: asString(args.zone_id),
        severity: asString(args.severity),
        page: 1,
        limit: 1000,
      });
      const by_severity = { mild: 0, moderate: 0, severe: 0 };
      const by_status = { active: 0, recovered: 0 };
      for (const c of data as Array<{ severity?: string; status?: string }>) {
        if (c.severity && c.severity in by_severity) by_severity[c.severity as keyof typeof by_severity]++;
        if (c.status && c.status in by_status) by_status[c.status as keyof typeof by_status]++;
      }
      return {
        total_cases: total,
        counted: data.length,
        truncated: total > data.length,
        by_severity,
        by_status,
        note: 'Aggregate counts only — patient identifiers are intentionally not exposed.',
      };
    },
  },
  {
    name: 'get_outbreak_forecast',
    description:
      'Get 14-day dengue outbreak forecasts per zone: outbreak probability (0-1), alert level (watch/warning/emergency), risk trend (rising/stable/falling), confidence, and contributing factors (rainfall, temperature, humidity, breeding-site density, recent case count). Optionally filter by alert_level or a minimum outbreak probability. Use for questions about predicted risk or which zones to prioritise.',
    parameters: {
      type: 'object',
      properties: {
        alert_level: { type: 'string', enum: ['watch', 'warning', 'emergency'], description: 'Filter to a single alert level.' },
        min_probability: { type: 'number', description: 'Only forecasts with outbreak probability at or above this value (0-1).' },
      },
    },
    handler: async (args) => {
      const minProb =
        typeof args.min_probability === 'number' ? args.min_probability : undefined;
      const forecasts = await listForecasts({
        alert_level: asString(args.alert_level),
        min_probability: minProb,
      });
      return forecasts.map((f) => ({
        zone_name: f.zone_name,
        forecast_horizon_days: f.forecast_horizon_days,
        outbreak_probability: f.outbreak_probability,
        alert_level: f.alert_level,
        risk_trend: f.risk_trend,
        confidence: f.confidence,
        contributing_factors: f.contributing_factors,
        recommended_action: f.recommended_action,
      }));
    },
  },
  {
    name: 'get_dashboard_summary',
    description:
      'Get the national NDCU dashboard rollup: report totals by status/risk, work-order counts, and the 7-day report trend. Use for broad "how are we doing nationally" questions.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      const s = await getDashboardSummaryService();
      return {
        reports: s.reports,
        workorders: s.workorders,
        seven_day_trend: s.seven_day_trend,
        recent_critical_reports: s.recent_critical_reports.map((r) => ({
          zone_id: r.zone_id,
          risk_level: r.risk_level,
          site_type: r.site_type,
          status: r.status,
          created_at: r.created_at,
        })),
      };
    },
  },
];

const TOOL_MAP = new Map<string, ChatTool>(chatTools.map((t) => [t.name, t]));

/** Tool definitions handed to the provider (no handlers). */
export const chatToolDefs: ChatToolDef[] = chatTools.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.parameters,
}));

/**
 * Validates the requested tool + arguments and runs its handler. Only argument
 * keys declared in the tool's schema are forwarded — anything else the model
 * emits is dropped (defense against prompt-injected filters). Throws on an
 * unknown tool; handler errors propagate to the caller.
 */
export async function runChatTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = TOOL_MAP.get(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);

  const allowed = Object.keys(
    (tool.parameters as { properties?: Record<string, unknown> }).properties ?? {},
  );
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (args && key in args) clean[key] = args[key];
  }

  return tool.handler(clean, ctx);
}

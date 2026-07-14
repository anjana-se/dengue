import { query } from '../../db/client';
import { listZones } from '../../db/queries/zones.queries';
import { logger } from '../../shared/logger';

/**
 * services/chat/contextBuilder.ts
 *
 * Assembles the live platform context JSON injected into every Gemini chat
 * system prompt. Gives the model real numbers to answer questions about.
 *
 * Kept lightweight: only aggregate stats, no raw PII or full report details.
 */

export async function buildChatContext(): Promise<string> {
  try {
    const [zones, criticalReports, pendingReports] = await Promise.all([
      listZones(),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM reports WHERE risk_level = 'critical' AND status NOT IN ('failed')`,
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM reports WHERE status IN ('pending', 'processing')`,
      ),
    ]);

    const context = {
      timestamp: new Date().toISOString(),
      platform: 'DengueGuard Sri Lanka',
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        district: z.district,
        risk_level: z.risk_level,
        risk_score: z.risk_score,
        active_reports: z.active_report_count,
      })),
      national_summary: {
        total_zones: zones.length,
        critical_zones: zones.filter((z) => z.risk_level === 'critical').length,
        high_zones: zones.filter((z) => z.risk_level === 'high').length,
        critical_reports_open: parseInt(criticalReports.rows[0]?.count ?? '0', 10),
        reports_pending_analysis: parseInt(pendingReports.rows[0]?.count ?? '0', 10),
      },
    };

    return JSON.stringify(context, null, 2);
  } catch (err) {
    logger.error('Failed to build chat context', { error: (err as Error).message });
    return JSON.stringify({ error: 'Context unavailable', timestamp: new Date().toISOString() });
  }
}

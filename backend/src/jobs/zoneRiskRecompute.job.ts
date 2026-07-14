import cron from 'node-cron';
import { config } from '../config/env';
import { logger } from '../shared/logger';
import { recomputeAllZoneRisks } from '../services/zones/zones.service';

/**
 * jobs/zoneRiskRecompute.job.ts
 *
 * Cron job: refreshes zones.active_report_count + risk_score on a schedule.
 * Default: every 15 minutes — ZONE_RISK_RECOMPUTE_CRON env var (e.g. "0,15,30,45 * * * *")
 *
 * This is a safety net — the primary triggers are:
 *   1. AI worker (after each new report analysis)
 *   2. workorders.service.resolve() (after each field resolution)
 *
 * The cron ensures drift does not accumulate if those triggers miss.
 * Runs inside the worker process (src/worker.ts) to avoid duplicating
 * DB connections across the api process.
 */

let _task: cron.ScheduledTask | null = null;

export function startZoneRiskRecomputeJob(): void {
  if (_task) return;

  const cronExpr = config.ZONE_RISK_RECOMPUTE_CRON;

  if (!cron.validate(cronExpr)) {
    logger.error('Invalid ZONE_RISK_RECOMPUTE_CRON expression, scheduler not started', {
      cronExpr,
    });
    return;
  }

  _task = cron.schedule(cronExpr, async () => {
    logger.debug('Zone risk recompute job triggered');
    try {
      await recomputeAllZoneRisks();
    } catch (err) {
      logger.error('Zone risk recompute job failed', { error: (err as Error).message });
    }
  });

  logger.info('Zone risk recompute job scheduled', { cron: cronExpr });
}

export function stopZoneRiskRecomputeJob(): void {
  if (_task) {
    _task.stop();
    _task = null;
    logger.info('Zone risk recompute job stopped');
  }
}

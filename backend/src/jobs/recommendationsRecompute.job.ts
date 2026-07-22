import cron from 'node-cron';
import { config } from '../config/env';
import { logger } from '../shared/logger';
import { persistRecommendationCycle } from '../services/recommendations/recommendations.service';

/**
 * jobs/recommendationsRecompute.job.ts
 *
 * Cron job: recomputes the dispatch recommendations for every zone and
 * persists the cycle to zone_recommendations. The API then serves the stored
 * cycle (read-mostly and fast) instead of aggregating on every request.
 *
 * Shares ZONE_RISK_RECOMPUTE_CRON with the zone-risk job (default: every
 * 15 minutes) — the two recomputes describe the same operational heartbeat.
 * Also runs once at worker startup so the panel has data immediately.
 *
 * Runs inside the worker process (src/worker.ts).
 */

let _task: cron.ScheduledTask | null = null;

export function startRecommendationsRecomputeJob(): void {
  if (_task) return;

  const cronExpr = config.ZONE_RISK_RECOMPUTE_CRON;

  if (!cron.validate(cronExpr)) {
    logger.error('Invalid cron expression, recommendations scheduler not started', { cronExpr });
    return;
  }

  const runCycle = async (label: string) => {
    try {
      const rows = await persistRecommendationCycle();
      logger.debug(`Recommendations recompute (${label}) complete`, { rows });
    } catch (err) {
      logger.error(`Recommendations recompute (${label}) failed`, {
        error: (err as Error).message,
      });
    }
  };

  // Immediate cycle on boot, then on the cron schedule.
  void runCycle('startup');
  _task = cron.schedule(cronExpr, () => void runCycle('cron'));

  logger.info('Recommendations recompute job scheduled', { cron: cronExpr });
}

export function stopRecommendationsRecomputeJob(): void {
  if (_task) {
    _task.stop();
    _task = null;
    logger.info('Recommendations recompute job stopped');
  }
}

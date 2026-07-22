import { logger } from './shared/logger';
// Trigger reload for config update
import { pool } from './db/client';
import { startWorker, stopWorker } from './ai/queue/consumer';
import { startZoneRiskRecomputeJob, stopZoneRiskRecomputeJob } from './jobs/zoneRiskRecompute.job';
import { startRecommendationsRecomputeJob, stopRecommendationsRecomputeJob } from './jobs/recommendationsRecompute.job';
import { initSocketEmitter } from './services/notifications/socket.server';

/**
 * src/worker.ts — BullMQ worker process entry point.
 * Starts the AI analysis consumer and handles graceful shutdown.
 */

async function bootstrap() {
  logger.info('🔧 DengueGuard Worker starting...');

  // Redis-backed emitter so worker-produced socket events reach connected clients
  // (the worker has no HTTP server, so it can't run a Socket.IO server directly).
  initSocketEmitter();

  // Start the AI analysis worker
  startWorker();

  // Start the zone risk recompute cron job
  startZoneRiskRecomputeJob();

  // Start the AI recommendations recompute cron job (runs once at boot, then every cycle)
  startRecommendationsRecomputeJob();

  logger.info('✅ AI analysis worker running. Listening for jobs on queue: ai-analysis');

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}. Shutting down gracefully...`);
    await stopWorker();
    stopZoneRiskRecomputeJob();
    stopRecommendationsRecomputeJob();
    await pool.end();
    logger.info('Worker shut down. DB pool drained.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Worker: Unhandled Promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Worker: Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start Worker:', err);
  process.exit(1);
});



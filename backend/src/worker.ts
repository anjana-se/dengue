import { logger } from './shared/logger';
import { pool } from './db/client';

/**
 * src/worker.ts — BullMQ worker process entry point.
 * Pulls jobs off the 'ai-analysis' queue, runs Gemini vision analysis,
 * and writes results back to Postgres.
 *
 * The actual worker logic lives in ai/queue/consumer.ts.
 * This file handles process lifecycle only.
 */

async function bootstrap() {
  logger.info('🔧 DengueGuard Worker starting...');

  // Import consumer — will be implemented in Step 4 (AI queue module)
  // const { startWorker } = await import('./ai/queue/consumer');
  // startWorker();

  logger.info('⏳ Worker is running. Waiting for AI analysis jobs...');
  logger.warn('AI queue consumer not yet wired — implement ai/queue/consumer.ts (Step 4)');

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}. Shutting down gracefully...`);
    // worker.close() will be called here once consumer.ts is built
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

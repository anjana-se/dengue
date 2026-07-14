import http from 'http';
import { createApp, config } from './app';
import { logger } from './shared/logger';
import { pool } from './db/client';
import { initSocketServer } from './services/notifications/socket.server';

/**
 * src/index.ts — API process entry point.
 * Creates the HTTP server, attaches Socket.IO, starts listening,
 * and handles graceful shutdown.
 */

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Attach Socket.IO to the same http.Server instance
  initSocketServer(server);

  // ─── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      logger.info('HTTP server closed. DB pool drained. Exiting.');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  // ─── Start listening ────────────────────────────────────────────────────────
  server.listen(config.PORT, () => {
    logger.info(`🚀 DengueGuard API running on port ${config.PORT}`, {
      env: config.NODE_ENV,
      basePath: config.API_BASE_PATH,
    });
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});

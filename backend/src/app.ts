import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config, corsOrigins } from './config/env';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { checkDbConnection } from './db/client';
import { logger } from './shared/logger';
import { authRouter } from './services/auth/auth.routes';
import { reportsRouter } from './services/reports/reports.routes';
import { workordersRouter } from './services/workorders/workorders.routes';
import { zonesRouter } from './services/zones/zones.routes';
import { droneRouter } from './services/drone/drone.routes';
import { chatRouter } from './services/chat/chat.routes';
import { dashboardRouter } from './services/dashboard/dashboard.routes';
import casesRouter from './services/cases/cases.routes';
import trapsRouter from './services/traps/traps.routes';
import incidentsRouter from './services/incidents/incidents.routes';

/**
 * app.ts — Express application assembly.
 * - Middleware stack (cors, helmet, morgan, rate limiting)
 * - Route mounting (all routers are mounted here)
 * - Health check endpoint
 * - Global error handler (must be last)
 *
 * The HTTP server itself is created in src/index.ts so that the
 * Socket.IO server can attach to the same http.Server instance.
 */

export function createApp() {
  const app = express();

  // Trust proxy headers from reverse proxy (Nginx)
  app.set('trust proxy', true);

  // ─── Core middleware ─────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  // ─── Health check (no auth, no rate limit) ──────────────────────────────────
  app.get('/health', async (_req: Request, res: Response) => {
    const dbOk = await checkDbConnection();
    const status = dbOk ? 'ok' : 'degraded';
    res.status(dbOk ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      services: { database: dbOk ? 'ok' : 'error' },
    });
  });

  // ─── Static file serving (local storage driver only) ─────────────────────
  if (config.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(path.resolve(config.UPLOADS_DIR)));
  }

  // ─── API routes ──────────────────────────────────────────────────────────
  // Mounted as each service module is built. Uncomment as you go.

  app.use(`${config.API_BASE_PATH}/auth`, authRouter);              // ✅ Step 2
  app.use(`${config.API_BASE_PATH}/reports`, reportsRouter);        // ✅ Step 3
  app.use(`${config.API_BASE_PATH}/workorders`, workordersRouter);  // ✅ Step 5
  app.use(`${config.API_BASE_PATH}/zones`, zonesRouter);            // ✅ Step 5
  app.use(`${config.API_BASE_PATH}/drone`, droneRouter);            // ✅ Step 7
  app.use(`${config.API_BASE_PATH}/chat`, chatRouter);              // ✅ Step 8
  app.use(`${config.API_BASE_PATH}/dashboard`, dashboardRouter);    // ✅ Step 9
  app.use(`${config.API_BASE_PATH}/cases`, casesRouter);
  app.use(`${config.API_BASE_PATH}/traps`, trapsRouter);
  app.use(`${config.API_BASE_PATH}/incidents`, incidentsRouter);


  // ─── 404 fallback ────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ─── Global error handler (must be last) ─────────────────────────────────────
  app.use(errorHandler);

  return app;
}

export { config };

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { handleDashboardSummary, handleExportCsv } from './dashboard.controller';

/**
 * services/dashboard/dashboard.routes.ts — Mounted at /api/v1/dashboard
 *
 *   GET /dashboard/summary   — Aggregate stats (phi, ndcu_admin)
 *   GET /dashboard/export    — CSV export of reports (ndcu_admin only)
 */

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/summary',
  requireRole('phi', 'ndcu_admin'),
  handleDashboardSummary,
);

dashboardRouter.get(
  '/export',
  requireRole('ndcu_admin'),
  handleExportCsv,
);

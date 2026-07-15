import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createReportSchema,
  listReportsSchema,
  reviewReportSchema,
} from './reports.schemas';
import {
  handleCreateReport,
  handleListReports,
  handleGetReport,
  handleReviewReport,
  handleGeocode,
} from './reports.controller';

/**
 * services/reports/reports.routes.ts
 *
 * Mounted at: /api/v1/reports
 *
 * Routes:
 *   POST   /reports            — Submit community report (community_reporter only)
 *   GET    /reports            — List reports (phi, ndcu_admin see all; reporter sees own)
 *   GET    /reports/:id        — Get single report
 *   PATCH  /reports/:id/review — PHI human review (phi, ndcu_admin only)
 */

export const reportsRouter = Router();

// All report routes require authentication
reportsRouter.use(authenticate);

// Submit a new community report (multipart/form-data)
reportsRouter.post(
  '/',
  requireRole('community_reporter'),
  uploadSingle,
  validate(createReportSchema),
  auditLog('report.create', 'report'),
  handleCreateReport,
);

// List reports — reporters see only their own; PHI/NDCU see all
reportsRouter.get(
  '/',
  requireRole('community_reporter', 'phi', 'ndcu_admin', 'drone_operator'),
  validate(listReportsSchema, 'query'),
  handleListReports,
);

// Geocode coordinates (proxies OSM Nominatim with a proper User-Agent)
reportsRouter.get(
  '/geocode',
  requireRole('community_reporter', 'phi', 'ndcu_admin', 'drone_operator'),
  handleGeocode,
);

// Get a single report
reportsRouter.get(
  '/:id',
  requireRole('community_reporter', 'phi', 'ndcu_admin', 'drone_operator'),
  handleGetReport,
);

// PHI human review — overrides AI result
reportsRouter.patch(
  '/:id/review',
  requireRole('phi', 'ndcu_admin'),
  validate(reviewReportSchema),
  auditLog('report.review', 'report'),
  handleReviewReport,
);

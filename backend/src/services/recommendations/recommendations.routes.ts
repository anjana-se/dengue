import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { handleListRecommendations } from './recommendations.controller';

/**
 * services/recommendations/recommendations.routes.ts
 *
 * Mounted at: /api/v1/recommendations
 *
 * Routes:
 *   GET /recommendations?limit=5 — Ranked dispatch recommendations for the
 *                                  NDCU dashboard AI Recommendations panel.
 *
 * Read-only, computed from current zone signals on each request.
 */

export const recommendationsRouter = Router();

recommendationsRouter.use(authenticate);

recommendationsRouter.get(
  '/',
  requireRole('phi', 'ndcu_admin'),
  handleListRecommendations,
);

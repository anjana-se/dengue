import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { listZonesSchema, zoneReportsSchema } from './zones.schemas';
import {
  handleListZones,
  handleGetZone,
  handleGetZoneReports,
} from './zones.controller';

/**
 * services/zones/zones.routes.ts
 *
 * Mounted at: /api/v1/zones
 *
 * Routes:
 *   GET /zones              — List all zones (with optional filters)
 *   GET /zones/:id          — Get single zone
 *   GET /zones/:id/reports  — Get reports scoped to a zone (with pagination)
 *
 * Read-only — zones are managed via DB migrations + seed data.
 * All authenticated roles can read zones.
 */

export const zonesRouter = Router();

zonesRouter.use(authenticate);

zonesRouter.get(
  '/',
  requireRole('community_reporter', 'phi', 'ndcu_admin', 'drone_operator'),
  validate(listZonesSchema, 'query'),
  handleListZones,
);

zonesRouter.get(
  '/:id',
  requireRole('community_reporter', 'phi', 'ndcu_admin', 'drone_operator'),
  handleGetZone,
);

zonesRouter.get(
  '/:id/reports',
  requireRole('phi', 'ndcu_admin', 'drone_operator'),
  validate(zoneReportsSchema, 'query'),
  handleGetZoneReports,
);

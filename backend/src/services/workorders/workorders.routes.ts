import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  listWorkordersSchema,
  createWorkorderSchema,
  acceptWorkorderSchema,
  resolveWorkorderSchema,
  assignWorkorderSchema,
} from './workorders.schemas';
import {
  handleListWorkorders,
  handleGetWorkorder,
  handleCreateWorkorder,
  handleAcceptWorkorder,
  handleAssignWorkorder,
  handleResolveWorkorder,
  handleCancelWorkorder,
} from './workorders.controller';

/**
 * services/workorders/workorders.routes.ts
 *
 * Mounted at: /api/v1/workorders
 *
 * Routes:
 *   GET    /workorders              — List (phi sees own; ndcu_admin sees all)
 *   GET    /workorders/:id          — Get single
 *   POST   /workorders              — Manual create (ndcu_admin only)
 *   PATCH  /workorders/:id/accept   — Accept (phi, ndcu_admin)
 *   PATCH  /workorders/:id/assign   — Assign to PHI officer (ndcu_admin only)
 *   PATCH  /workorders/:id/resolve  — Resolve with notes + optional photo (phi, ndcu_admin)
 *   PATCH  /workorders/:id/cancel   — Cancel (ndcu_admin only)
 */

export const workordersRouter = Router();

workordersRouter.use(authenticate);

workordersRouter.get(
  '/',
  requireRole('phi', 'ndcu_admin'),
  validate(listWorkordersSchema, 'query'),
  handleListWorkorders,
);

workordersRouter.get(
  '/:id',
  requireRole('phi', 'ndcu_admin'),
  handleGetWorkorder,
);

workordersRouter.post(
  '/',
  requireRole('ndcu_admin'),
  validate(createWorkorderSchema),
  auditLog('workorder.create', 'workorder'),
  handleCreateWorkorder,
);

workordersRouter.patch(
  '/:id/accept',
  requireRole('phi', 'ndcu_admin'),
  validate(acceptWorkorderSchema),
  auditLog('workorder.accept', 'workorder'),
  handleAcceptWorkorder,
);

workordersRouter.patch(
  '/:id/assign',
  requireRole('ndcu_admin'),
  validate(assignWorkorderSchema),
  auditLog('workorder.assign', 'workorder'),
  handleAssignWorkorder,
);

workordersRouter.patch(
  '/:id/resolve',
  requireRole('phi', 'ndcu_admin'),
  uploadSingle,        // optional follow-up image
  validate(resolveWorkorderSchema),
  auditLog('workorder.resolve', 'workorder'),
  handleResolveWorkorder,
);

workordersRouter.patch(
  '/:id/cancel',
  requireRole('ndcu_admin'),
  auditLog('workorder.cancel', 'workorder'),
  handleCancelWorkorder,
);

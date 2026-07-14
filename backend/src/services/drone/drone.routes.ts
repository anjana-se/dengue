import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { createMissionSchema, updateMissionStatusSchema, listMissionsSchema } from './drone.schemas';
import {
  handleCreateMission,
  handleListMissions,
  handleGetMission,
  handleUpdateMissionStatus,
  handleUploadDroneFrame,
} from './drone.controller';

/**
 * services/drone/drone.routes.ts — Mounted at /api/v1/drone
 *
 *   POST   /drone/missions               — Create mission (drone_operator, ndcu_admin)
 *   GET    /drone/missions               — List missions
 *   GET    /drone/missions/:id           — Get mission
 *   PATCH  /drone/missions/:id/status    — Update status
 *   POST   /drone/missions/:id/frames    — Upload frame image (multipart)
 */

export const droneRouter = Router();

droneRouter.use(authenticate);

droneRouter.post(
  '/missions',
  requireRole('drone_operator', 'ndcu_admin'),
  validate(createMissionSchema),
  auditLog('drone.mission.create', 'drone_mission'),
  handleCreateMission,
);

droneRouter.get(
  '/missions',
  requireRole('drone_operator', 'ndcu_admin', 'phi'),
  validate(listMissionsSchema, 'query'),
  handleListMissions,
);

droneRouter.get(
  '/missions/:id',
  requireRole('drone_operator', 'ndcu_admin', 'phi'),
  handleGetMission,
);

droneRouter.patch(
  '/missions/:id/status',
  requireRole('drone_operator', 'ndcu_admin'),
  validate(updateMissionStatusSchema),
  auditLog('drone.mission.status', 'drone_mission'),
  handleUpdateMissionStatus,
);

droneRouter.post(
  '/missions/:id/frames',
  requireRole('drone_operator', 'ndcu_admin'),
  uploadSingle,
  auditLog('drone.frame.upload', 'drone_mission'),
  handleUploadDroneFrame,
);

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './incidents.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listIncidents);
router.get('/decisions', ctrl.listDecisions);
router.get('/:id', ctrl.getIncidentById);
router.get('/:id/decisions', ctrl.fetchDuplicateDecisions);
router.patch('/decisions/:id/resolve', ctrl.resolveDuplicateDecision);
router.patch('/:id/status', ctrl.updateIncidentStatus);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './traps.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listTraps);
router.get('/:id', ctrl.getTrapById);
router.get('/:id/readings', ctrl.getTrapReadings);

export default router;

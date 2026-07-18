import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './cases.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listCases);
router.get('/heatmap', ctrl.getCaseHeatmap);

export default router;

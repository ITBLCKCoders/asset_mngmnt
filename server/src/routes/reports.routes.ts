import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMaintenanceAndRepairHistoryHandler } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate);

router.get(
  '/maintenance-repair-history',
  getMaintenanceAndRepairHistoryHandler
);

export default router;

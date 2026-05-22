import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMaintenanceAndRepairHistoryHandler, getFinanceReportsHandler } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate);

router.get(
  '/maintenance-repair-history',
  getMaintenanceAndRepairHistoryHandler
);

router.get(
  '/finance-reports',
  getFinanceReportsHandler
);

export default router;

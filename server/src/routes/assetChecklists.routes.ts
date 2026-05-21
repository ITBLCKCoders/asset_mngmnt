import { Router } from 'express';
import {
  approveChecklistsDeptHeadHandler,
  getChecklistsApprovedByDeptHeadMeHandler,
  getPendingChecklistApprovalsHandler,
} from '../controllers/assetChecklistApprovals.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/pending-approvals', getPendingChecklistApprovalsHandler);
router.get('/approved-by-dept-head-me', getChecklistsApprovedByDeptHeadMeHandler);
router.post('/dept-head-approve', approveChecklistsDeptHeadHandler);

export default router;

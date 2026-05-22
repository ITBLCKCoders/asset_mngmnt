import { Router } from 'express';
import {
  approveChecklistsDeptHeadHandler,
  getChecklistsApprovedByDeptHeadMeHandler,
  getPendingChecklistApprovalsHandler,
  getReceivePendingChecklistApprovalsHandler,
  receiveChecklistsItManagerHandler,
} from '../controllers/assetChecklistApprovals.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/pending-approvals', getPendingChecklistApprovalsHandler);
router.get('/approved-by-dept-head-me', getChecklistsApprovedByDeptHeadMeHandler);
router.get(
  '/receive-pending-approvals',
  getReceivePendingChecklistApprovalsHandler
);
router.post('/dept-head-approve', approveChecklistsDeptHeadHandler);
router.post('/it-manager-receive', receiveChecklistsItManagerHandler);

export default router;

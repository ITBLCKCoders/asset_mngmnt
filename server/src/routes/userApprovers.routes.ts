import { Router } from 'express';
import {
  getUserApproversHandler,
  setUserApproverHandler,
  removeUserApproverHandler,
  getEligibleApproversHandler,
} from '../controllers/userApprovers.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireUsersManage } from '../middleware/requirePermission.js';

const router = Router();

// Read endpoints: readable by any authenticated user (used by the Users page)
router.get('/:userId/approvers', authenticate, getUserApproversHandler);
router.get(
  '/:userId/approvers/eligible/:approverType',
  authenticate,
  getEligibleApproversHandler
);

// Mutations: Users:edit permission OR Local Admin of the same company
router.post(
  '/:userId/approvers',
  authenticate,
  requireUsersManage(),
  setUserApproverHandler
);
router.delete(
  '/:userId/approvers/:approverType',
  authenticate,
  requireUsersManage(),
  removeUserApproverHandler
);

export default router;
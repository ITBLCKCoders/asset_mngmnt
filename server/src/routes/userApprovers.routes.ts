import { Router } from 'express';
import {
  getUserApproversHandler,
  setUserApproverHandler,
  removeUserApproverHandler,
  getEligibleApproversHandler,
} from '../controllers/userApprovers.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

// Read endpoints: readable by any authenticated user (used by the Users page)
router.get('/:userId/approvers', authenticate, getUserApproversHandler);
router.get(
  '/:userId/approvers/eligible/:approverType',
  authenticate,
  getEligibleApproversHandler
);

// Mutations: restricted to users with Users:edit permission
router.post(
  '/:userId/approvers',
  authenticate,
  requirePermission('Users', 'edit'),
  setUserApproverHandler
);
router.delete(
  '/:userId/approvers/:approverType',
  authenticate,
  requirePermission('Users', 'edit'),
  removeUserApproverHandler
);

export default router;
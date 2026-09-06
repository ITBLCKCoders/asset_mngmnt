import { Router } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireUsersManage } from '../middleware/requirePermission.js';
import {
  getCompanyApproversHandler,
  setCompanyApproverHandler,
  removeCompanyApproverHandler,
  getEligibleApproversHandler,
} from '../controllers/companyApprovers.controller.js';

const router = Router();

// Reads require authentication (used by the Users page dropdowns).
// Mutations require Users:edit permission OR Local Admin of the same company.
router.use(authenticate);

// GET /api/companies/:companyId/approvers - Get all designated approvers for a company
router.get('/:companyId/approvers', getCompanyApproversHandler);

// POST /api/companies/:companyId/approvers - Set designated approver
router.post('/:companyId/approvers', requireUsersManage(), setCompanyApproverHandler);

// DELETE /api/companies/:companyId/approvers/:approverType - Remove designated approver
router.delete(
  '/:companyId/approvers/:approverType',
  requireUsersManage(),
  removeCompanyApproverHandler
);

// GET /api/companies/:companyId/approvers/eligible/:approverType - Get eligible users for dropdown
router.get('/:companyId/approvers/eligible/:approverType', getEligibleApproversHandler);

export default router;
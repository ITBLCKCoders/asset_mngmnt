import { Router } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  getCompanyApproversHandler,
  setCompanyApproverHandler,
  removeCompanyApproverHandler,
  getEligibleApproversHandler,
} from '../controllers/companyApprovers.controller.js';

const router = Router();

// All routes require authentication and Admin/Global Admin permissions
router.use(authenticate);
router.use(requirePermission('Users', 'edit'));

// GET /api/companies/:companyId/approvers - Get all designated approvers for a company
router.get('/:companyId/approvers', getCompanyApproversHandler);

// POST /api/companies/:companyId/approvers - Set designated approver
router.post('/:companyId/approvers', setCompanyApproverHandler);

// DELETE /api/companies/:companyId/approvers/:approverType - Remove designated approver
router.delete('/:companyId/approvers/:approverType', removeCompanyApproverHandler);

// GET /api/companies/:companyId/approvers/eligible/:approverType - Get eligible users for dropdown
router.get('/:companyId/approvers/eligible/:approverType', getEligibleApproversHandler);

export default router;
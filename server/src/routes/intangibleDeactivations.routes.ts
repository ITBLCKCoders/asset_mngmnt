import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  createDeactivationHandler,
  listDeactivationsHandler,
  getMyDeactivationsHandler,
  getDeactivationByIdHandler,
  getPendingApprovalsHandler,
  getPendingHrApprovalsHandler,
  getApprovedByMeHandler,
  approveDeptHeadHandler,
  approveHrHandler,
  declineHandler,
} from '../controllers/intangibleDeactivation.controller.js';

const router = express.Router();

router.post('/', authenticate, createDeactivationHandler);
router.get('/', authenticate, listDeactivationsHandler);
router.get('/my', authenticate, getMyDeactivationsHandler);
router.get('/forms/pending-approvals', authenticate, getPendingApprovalsHandler);
router.get('/forms/pending-hr-approvals', authenticate, getPendingHrApprovalsHandler);
router.get('/forms/approved-by-me', authenticate, getApprovedByMeHandler);
router.get('/:formId', authenticate, getDeactivationByIdHandler);
router.post('/forms/:formId/approve', authenticate, approveDeptHeadHandler);
router.post('/forms/:formId/hr-approve', authenticate, approveHrHandler);
router.post('/forms/:formId/decline', authenticate, declineHandler);

export default router;

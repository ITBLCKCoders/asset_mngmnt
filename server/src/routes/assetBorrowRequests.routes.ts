import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validateDto } from '../utils/validation.js';
import { CreateAssetBorrowRequestDtoSchema } from '../dtos/assetBorrowRequests/CreateAssetBorrowRequestDto.js';
import {
  approveDeptHeadBorrowRequest,
  createAssetBorrowRequest,
  declineDeptHeadBorrowRequest,
  listBorrowRequestAvailableAssets,
  listApprovedByDeptHeadMeBorrowRequests,
  listAssetBorrowRequests,
  listMyAssetBorrowRequests,
  listPendingDeptHeadBorrowRequests,
  processBorrowReturn,
  staffDeclineBorrowRequest,
  staffApproveBorrowRequest,
} from '../controllers/assetBorrowRequests.controller.js';
import { DeptHeadApproveBorrowRequestDtoSchema } from '../dtos/assetBorrowRequests/DeptHeadApproveBorrowRequestDto.js';
import { StaffApproveBorrowRequestDtoSchema } from '../dtos/assetBorrowRequests/StaffApproveBorrowRequestDto.js';
import { StaffDeclineBorrowRequestDtoSchema } from '../dtos/assetBorrowRequests/StaffDeclineBorrowRequestDto.js';
import { ProcessBorrowReturnDtoSchema } from '../dtos/assetBorrowRequests/ProcessBorrowReturnDto.js';

const router = Router();

router.get('/mine', authenticate, listMyAssetBorrowRequests);
router.get(
  '/pending-dept-approvals',
  authenticate,
  listPendingDeptHeadBorrowRequests
);
router.get(
  '/approved-by-dept-head-me',
  authenticate,
  listApprovedByDeptHeadMeBorrowRequests
);
router.get(
  '/',
  authenticate,
  requirePermission('Borrow Request Management', 'view'),
  listAssetBorrowRequests
);
router.post(
  '/',
  authenticate,
  requirePermission('Asset Borrowing', 'create'),
  validateDto(CreateAssetBorrowRequestDtoSchema),
  createAssetBorrowRequest
);
router.post(
  '/:borrowRequestId/dept-head-approve',
  authenticate,
  requirePermission('Borrow Request Management', 'edit'),
  validateDto(DeptHeadApproveBorrowRequestDtoSchema),
  approveDeptHeadBorrowRequest
);
router.post(
  '/:borrowRequestId/dept-head-decline',
  authenticate,
  requirePermission('Borrow Request Management', 'edit'),
  declineDeptHeadBorrowRequest
);

router.get(
  '/:borrowRequestId/available-assets',
  authenticate,
  listBorrowRequestAvailableAssets
);

router.post(
  '/:borrowRequestId/staff-approve',
  authenticate,
  requirePermission('Borrow Request Management', 'edit'),
  validateDto(StaffApproveBorrowRequestDtoSchema),
  staffApproveBorrowRequest
);
router.post(
  '/:borrowRequestId/staff-decline',
  authenticate,
  requirePermission('Borrow Request Management', 'edit'),
  validateDto(StaffDeclineBorrowRequestDtoSchema),
  staffDeclineBorrowRequest
);
router.post(
  '/:borrowRequestId/process-return',
  authenticate,
  validateDto(ProcessBorrowReturnDtoSchema),
  processBorrowReturn
);

export default router;

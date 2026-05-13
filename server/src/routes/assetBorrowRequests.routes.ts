import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
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
router.get('/', authenticate, listAssetBorrowRequests);
router.post(
  '/',
  authenticate,
  validateDto(CreateAssetBorrowRequestDtoSchema),
  createAssetBorrowRequest
);
router.post(
  '/:borrowRequestId/dept-head-approve',
  authenticate,
  validateDto(DeptHeadApproveBorrowRequestDtoSchema),
  approveDeptHeadBorrowRequest
);
router.post(
  '/:borrowRequestId/dept-head-decline',
  authenticate,
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
  validateDto(StaffApproveBorrowRequestDtoSchema),
  staffApproveBorrowRequest
);
router.post(
  '/:borrowRequestId/staff-decline',
  authenticate,
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

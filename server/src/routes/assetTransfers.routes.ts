import express from 'express';
import multer from 'multer';
import {
  createAssetTransferHandler,
  createHeldTransferHandler,
  submitTransferRequestHandler,
  getApprovedForExecutionHandler,
  executeTransferFormHandler,
  getAssetTransferFormsByUserHandler,
  getAllAssetTransferFormsHandler,
  getTransferPendingApprovalsHandler,
  getTransferReceivePendingApprovalsHandler,
  getTransferApprovedByMeHandler,
  approveTransferFormHandler,
  declineTransferFormHandler,
  receiveTransferFormHandler,
  getTransferHistoryHandler,
  signAssetTransferFormHandler,
  uploadTransferConditionPhotoHandler,
  getCompanyTransferEligibleAssetsHandler,
  createCompanyTransferHandler,
} from '../controllers/assetTransfers.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyFileMagicBytes } from '../middleware/verifyFileMagicBytes.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    fields: 50,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  },
});


router.post(
  '/upload-condition-photo',
  authenticate,
  upload.single('image'),
  verifyFileMagicBytes('image'),
  uploadTransferConditionPhotoHandler
);

router.post('/', authenticate, createAssetTransferHandler);
router.post('/create-held', authenticate, createHeldTransferHandler);
router.post('/submit-request', authenticate, submitTransferRequestHandler);
router.get('/company-assets', authenticate, getCompanyTransferEligibleAssetsHandler);
router.post('/company-transfer', authenticate, createCompanyTransferHandler);

router.get('/history', authenticate, getTransferHistoryHandler);
router.get(
  '/forms/approved-for-execution',
  authenticate,
  getApprovedForExecutionHandler
);

router.get('/forms', authenticate, getAllAssetTransferFormsHandler);
router.get(
  '/forms/pending-approvals',
  authenticate,
  getTransferPendingApprovalsHandler
);
router.get(
  '/forms/receive-pending-approvals',
  authenticate,
  getTransferReceivePendingApprovalsHandler
);
router.get(
  '/forms/approved-by-me',
  authenticate,
  getTransferApprovedByMeHandler
);
router.post('/forms/:formId/approve', authenticate, approveTransferFormHandler);
router.post('/forms/:formId/decline', authenticate, declineTransferFormHandler);
router.post('/forms/:formId/receive', authenticate, receiveTransferFormHandler);
router.post('/forms/:formId/execute', authenticate, executeTransferFormHandler);

router.get('/user/:userId', authenticate, getAssetTransferFormsByUserHandler);

router.post('/forms/:formId/sign', authenticate, signAssetTransferFormHandler);

export default router;

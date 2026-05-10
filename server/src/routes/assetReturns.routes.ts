import express from 'express';
import multer from 'multer';
import {
  createAssetReturnHandler,
  getAssetReturnsHandler,
  getAssetReturnByIdHandler,
  signAssetReturnFormHandler,
  submitAssetReturnRequestHandler,
  getPendingApprovalsHandler,
  getApprovedByMeHandler,
  getPendingStaffHandler,
  getReceivePendingApprovalsHandler,
  receiveReturnFormHandler,
  processReturnFormHandler,
  approveReturnFormHandler,
  declineReturnFormHandler,
  declineReturnFormByProcessorHandler,
  uploadConditionPhotoHandler,
} from '../controllers/assetReturns.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
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
  uploadConditionPhotoHandler
);

/**
 * @swagger
 * /api/asset-returns/submit-request:
 *   post:
 *     tags: [Asset Returns]
 *     summary: Submit return request (returner signature only; form goes to Approvals)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               returnConditions:
 *                 type: object
 *                 description: object or array of { assignmentId, condition, notes }
 *               returnNotes:
 *                 type: string
 *     responses:
 *       201: { description: Return request submitted }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/submit-request',
  authenticate,
  requirePermission('Return Request', 'create'),
  submitAssetReturnRequestHandler
);

/**
 * @swagger
 * /api/asset-returns:
 *   post:
 *     tags: [Asset Returns]
 *     summary: Create an asset return
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignmentId: { type: string }
 *               returnDate: { type: string, format: date }
 *               condition: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Asset return created }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  authenticate,
  requirePermission('Return Form', 'create'),
  createAssetReturnHandler
);

/**
 * @swagger
 * /api/asset-returns:
 *   get:
 *     tags: [Asset Returns]
 *     summary: Get all asset returns (admin/supervisor)
 *     responses:
 *       200: { description: List of asset returns }
 *       401: { description: Unauthorized }
 */
router.get(
  '/',
  authenticate,
  requirePermission('Return Form', 'view'),
  getAssetReturnsHandler
);

/**
 * @swagger
 * /api/asset-returns/user/{userId}:
 *   get:
 *     tags: [Asset Returns]
 *     summary: Get asset returns for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of asset returns for user }
 *       401: { description: Unauthorized }
 */
router.get('/user/:userId', authenticate, getAssetReturnsHandler);

/**
 * @swagger
 * /api/asset-returns/forms/{formId}/sign:
 *   post:
 *     tags: [Asset Returns]
 *     summary: Sign asset return form
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature: { type: string }
 *     responses:
 *       200: { description: Form signed }
 *       401: { description: Unauthorized }
 *       404: { description: Form not found }
 */
router.post('/forms/:formId/sign', authenticate, signAssetReturnFormHandler);

/**
 * @swagger
 * /api/asset-returns/forms/pending-approvals:
 *   get:
 *     tags: [Asset Returns]
 *     summary: Get return forms pending Department Head approval (filtered by user company)
 *     responses:
 *       200: { description: List of pending approval forms }
 *       401: { description: Unauthorized }
 */
router.get(
  '/forms/pending-approvals',
  authenticate,
  requirePermission('Return Request', 'view'),
  getPendingApprovalsHandler
);

/**
 * @swagger
 * /api/asset-returns/forms/approved-by-me:
 *   get:
 *     tags: [Asset Returns]
 *     summary: Get return forms approved by the current user (Dept Head)
 *     responses:
 *       200: { description: List of forms approved by current user }
 *       401: { description: Unauthorized }
 */
router.get('/forms/approved-by-me', authenticate, getApprovedByMeHandler);

router.get('/forms/pending-staff', authenticate, getPendingStaffHandler);

router.get(
  '/forms/receive-pending-approvals',
  authenticate,
  getReceivePendingApprovalsHandler
);

router.post('/forms/:formId/process', authenticate, processReturnFormHandler);

router.post(
  '/forms/:formId/processor-decline',
  authenticate,
  declineReturnFormByProcessorHandler
);

router.post('/forms/:formId/receive', authenticate, receiveReturnFormHandler);

/**
 * @swagger
 * /api/asset-returns/forms/{formId}/approve:
 *   post:
 *     tags: [Asset Returns]
 *     summary: Approve return form as Department Head
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               digitalSignature: { type: string }
 *     responses:
 *       200: { description: Form approved }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Form not found }
 */
router.post(
  '/forms/:formId/approve',
  authenticate,
  requirePermission('Return Request', 'edit'),
  approveReturnFormHandler
);
router.post(
  '/forms/:formId/decline',
  authenticate,
  requirePermission('Return Request', 'edit'),
  declineReturnFormHandler
);

/**
 * @swagger
 * /api/asset-returns/{id}:
 *   get:
 *     tags: [Asset Returns]
 *     summary: Get asset return by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset return details }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('Return Form', 'view'),
  getAssetReturnByIdHandler
);

export default router;

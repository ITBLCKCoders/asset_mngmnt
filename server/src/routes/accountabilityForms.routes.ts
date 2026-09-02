import { Router } from 'express';
import {
  createAccountabilityFormHandler,
  getAccountabilityFormsHandler,
  signAccountabilityFormHandler,
  declineAccountabilityFormHandler,
  signReceivedCopyHandler,
  getAccountabilityFormByIdHandler,
  getAccountabilityFormMovementHandler,
  getAccountabilityFormChecklistsHandler,
  signAccountabilityFormChecklistsHandler,
  getAccountabilityFormsByAssetIdHandler,
  checkUnsignedAccountabilityFormsHandler,
  getClearanceEligibilityHandler,
  createClearanceHandler,
} from '../controllers/accountabilityForms.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/accountability-forms:
 *   get:
 *     tags: [Accountability Forms]
 *     summary: Get all accountability forms for current user
 *     responses:
 *       200: { description: List of accountability forms }
 *       401: { description: Unauthorized }
 */
router.get('/', getAccountabilityFormsHandler);

/**
 * @swagger
 * /api/accountability-forms/asset/{assetId}:
 *   get:
 *     tags: [Accountability Forms]
 *     summary: Get accountability forms by asset ID
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of forms for asset }
 *       401: { description: Unauthorized }
 */
router.get('/asset/:assetId', getAccountabilityFormsByAssetIdHandler);

router.get('/clearance/eligibility', getClearanceEligibilityHandler);
router.post('/clearance', createClearanceHandler);

router.get('/:formId/checklists', getAccountabilityFormChecklistsHandler);
router.post(
  '/:formId/checklists/sign',
  signAccountabilityFormChecklistsHandler
);

/**
 * @swagger
 * /api/accountability-forms/{formId}/movement:
 *   get:
 *     tags: [Accountability Forms]
 *     summary: Get asset movement tree for a form (return/transfer/new accountability forms per asset)
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset movement tree for the form }
 *       401: { description: Unauthorized }
 *       404: { description: Form not found }
 */
router.get('/:formId/movement', getAccountabilityFormMovementHandler);

/**
 * @swagger
 * /api/accountability-forms/{formId}:
 *   get:
 *     tags: [Accountability Forms]
 *     summary: Get specific accountability form
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Accountability form details }
 *       401: { description: Unauthorized }
 *       404: { description: Form not found }
 */
router.get('/:formId', getAccountabilityFormByIdHandler);

/**
 * @swagger
 * /api/accountability-forms:
 *   post:
 *     tags: [Accountability Forms]
 *     summary: Create an accountability form
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId: { type: string }
 *               assigneeId: { type: string }
 *     responses:
 *       201: { description: Form created }
 *       401: { description: Unauthorized }
 */
router.post('/', createAccountabilityFormHandler);

/**
 * @swagger
 * /api/accountability-forms/{formId}/sign:
 *   post:
 *     tags: [Accountability Forms]
 *     summary: Sign an accountability form
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
router.post('/:formId/sign', signAccountabilityFormHandler);

router.post('/:formId/decline', declineAccountabilityFormHandler);

/**
 * @swagger
 * /api/accountability-forms/{formId}/sign-received-copy:
 *   post:
 *     tags: [Accountability Forms]
 *     summary: Sign Received Copy for 201 File (HR Copy)
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
 *       200: { description: Received copy signed }
 *       401: { description: Unauthorized }
 *       404: { description: Form not found }
 */
router.post('/:formId/sign-received-copy', signReceivedCopyHandler);

/**
 * @swagger
 * /api/accountability-forms/check-unsigned/{userId}:
 *   get:
 *     tags: [Accountability Forms]
 *     summary: Check if user has unsigned accountability forms
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Check result with unsigned forms list }
 *       401: { description: Unauthorized }
 */
router.get('/check-unsigned/:userId', checkUnsignedAccountabilityFormsHandler);

export default router;

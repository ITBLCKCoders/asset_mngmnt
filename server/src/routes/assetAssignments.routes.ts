import { Router } from 'express';
import {
  createAssetAssignmentHandler,
  getAssetAssignmentsHandler,
  getFilteredAssetAssignmentsHandler,
  getMyAssignmentsHandler,
  returnAssetHandler,
  createAssetChecklistHandler,
  getChecklistByAssignmentIdHandler,
  getAssetChecklistsHandler,
} from '../controllers/assetAssignments.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/asset-assignments/me:
 *   get:
 *     tags: [Asset Assignments]
 *     summary: Get current user's active assignments (for return request page)
 *     responses:
 *       200: { description: List of assignments for current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', getMyAssignmentsHandler);

/**
 * @swagger
 * /api/asset-assignments:
 *   get:
 *     tags: [Asset Assignments]
 *     summary: Get all asset assignments
 *     responses:
 *       200: { description: List of asset assignments }
 *       401: { description: Unauthorized }
 */
router.get(
  '/',
  requirePermission('Asset Assignment', 'view'),
  getAssetAssignmentsHandler
);

/**
 * @swagger
 * /api/asset-assignments/filtered:
 *   get:
 *     tags: [Asset Assignments]
 *     summary: Get filtered asset assignments (by user permissions and custodian role)
 *     responses:
 *       200: { description: Filtered list of asset assignments }
 *       401: { description: Unauthorized }
 */
router.get(
  '/filtered',
  requirePermission('Asset Assignment', 'view'),
  getFilteredAssetAssignmentsHandler
);

/**
 * @swagger
 * /api/asset-assignments:
 *   post:
 *     tags: [Asset Assignments]
 *     summary: Create an asset assignment
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId: { type: string }
 *               userId: { type: string }
 *               assignDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Assignment created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Asset Assignment', 'create'),
  createAssetAssignmentHandler
);

/**
 * @swagger
 * /api/asset-assignments/{assignmentId}/return:
 *   put:
 *     tags: [Asset Assignments]
 *     summary: Return an asset
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset returned }
 *       401: { description: Unauthorized }
 *       404: { description: Assignment not found }
 */
router.put(
  '/:assignmentId/return',
  requirePermission('Asset Assignment', 'edit'),
  returnAssetHandler
);

/**
 * @swagger
 * /api/asset-assignments/checklist:
 *   post:
 *     tags: [Asset Assignments]
 *     summary: Create an asset checklist for computer-type assets
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignmentId: { type: string }
 *               employeeId: { type: string }
 *               employeeName: { type: string }
 *               employeeDesignation: { type: string }
 *               employeeDepartment: { type: string }
 *               employeeCompany: { type: string }
 *               typeOnboarding: { type: boolean }
 *               typeOffboarding: { type: boolean }
 *               receivedBy: { type: string }
 *               checklistData: { type: object }
 *               remarks: { type: string }
 *     responses:
 *       201: { description: Checklist created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/checklist',
  requirePermission('Checklist Form', 'create'),
  createAssetChecklistHandler
);

router.get(
  '/checklists',
  requirePermission('Checklist Form', 'view'),
  getAssetChecklistsHandler
);

/**
 * @swagger
 * /api/asset-assignments/checklist/:assignmentId:
 *   get:
 *     tags: [Asset Assignments]
 *     summary: Get asset checklist by assignment ID
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Checklist data }
 *       404: { description: Checklist not found }
 *       401: { description: Unauthorized }
 */
router.get(
  '/checklist/:assignmentId',
  requirePermission('Checklist Form', 'view'),
  getChecklistByAssignmentIdHandler
);

export default router;

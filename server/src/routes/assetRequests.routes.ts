import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import AssetRequestsController from '../controllers/assetRequests.controller.js';

const router = Router();

/**
 * @swagger
 * /api/asset-requests/all:
 *   get:
 *     tags: [Asset Requests]
 *     summary: Get all asset requests (admin only)
 *     responses:
 *       200: { description: List of all asset requests }
 *       401: { description: Unauthorized }
 */
router.get('/all', authenticate, AssetRequestsController.getAll);

/**
 * @swagger
 * /api/asset-requests:
 *   get:
 *     tags: [Asset Requests]
 *     summary: Get asset requests for current user
 *     responses:
 *       200: { description: List of user's asset requests }
 *       401: { description: Unauthorized }
 */
router.get('/', authenticate, AssetRequestsController.getByCurrentUser);

/**
 * @swagger
 * /api/asset-requests/{id}:
 *   get:
 *     tags: [Asset Requests]
 *     summary: Get asset request by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset request details }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, AssetRequestsController.getById);

/**
 * @swagger
 * /api/asset-requests:
 *   post:
 *     tags: [Asset Requests]
 *     summary: Create an asset request
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Asset request created }
 *       401: { description: Unauthorized }
 */
router.post('/', authenticate, AssetRequestsController.create);

/**
 * @swagger
 * /api/asset-requests/{id}/approve:
 *   put:
 *     tags: [Asset Requests]
 *     summary: Approve asset request (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request approved }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.put('/:id/approve', authenticate, AssetRequestsController.approve);

/**
 * @swagger
 * /api/asset-requests/{id}/reject:
 *   put:
 *     tags: [Asset Requests]
 *     summary: Reject asset request (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Request rejected }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.put('/:id/reject', authenticate, AssetRequestsController.reject);

/**
 * @swagger
 * /api/asset-requests/{id}:
 *   delete:
 *     tags: [Asset Requests]
 *     summary: Delete an asset request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.delete('/:id', authenticate, AssetRequestsController.delete);

export default router;

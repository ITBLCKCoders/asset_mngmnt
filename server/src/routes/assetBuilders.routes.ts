import { Router } from 'express';
import {
  createAssetBuilderHandler,
  getAssetBuildersHandler,
  matchAssetBuildersHandler,
  updateAssetBuilderHandler,
  deleteAssetBuilderHandler,
  getAssetBuilderFormsHandler,
} from '../controllers/assetBuilders.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/asset-builders:
 *   get:
 *     tags: [Asset Builders]
 *     summary: Get all asset builders for user's company
 *     responses:
 *       200: { description: List of asset builders }
 *       401: { description: Unauthorized }
 */
router.get('/', getAssetBuildersHandler);

/**
 * @swagger
 * /api/asset-builders:
 *   post:
 *     tags: [Asset Builders]
 *     summary: Create an asset builder
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Asset builder created }
 *       401: { description: Unauthorized }
 */
router.post('/', createAssetBuilderHandler);

/**
 * @swagger
 * /api/asset-builders/match:
 *   post:
 *     tags: [Asset Builders]
 *     summary: Match builders whose component assets include the given asset codes
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetCodes:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: List of matching asset builders }
 *       400: { description: Invalid assetCodes }
 *       401: { description: Unauthorized }
 */
router.post('/match', matchAssetBuildersHandler);

/**
 * @swagger
 * /api/asset-builders/{builderId}:
 *   put:
 *     tags: [Asset Builders]
 *     summary: Update an asset builder
 *     parameters:
 *       - in: path
 *         name: builderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: Asset builder updated }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.put('/:builderId', updateAssetBuilderHandler);

/**
 * @swagger
 * /api/asset-builders/{builderId}:
 *   delete:
 *     tags: [Asset Builders]
 *     summary: Delete an asset builder
 *     parameters:
 *       - in: path
 *         name: builderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset builder deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.delete('/:builderId', deleteAssetBuilderHandler);

/**
 * @swagger
 * /api/asset-builders/{builderId}/forms:
 *   get:
 *     tags: [Asset Builders]
 *     summary: Get all forms (accountability, return, transfer, borrow) for assets in a builder
 *     parameters:
 *       - in: path
 *         name: builderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of all forms for assets in the builder }
 *       401: { description: Unauthorized }
 *       404: { description: Builder not found }
 */
router.get('/:builderId/forms', getAssetBuilderFormsHandler);

export default router;

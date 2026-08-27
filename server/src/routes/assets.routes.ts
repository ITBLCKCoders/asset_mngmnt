import { Router } from 'express';
import {
  getAssetsHandler,
  createAssetHandler,
  getAssetByCodeHandler,
  getAssetPublicHandler,
  updateAssetHandler,
  assignAssetHandler,
  getMyAssetsHandler,
  getAllFormsByAssetIdHandler,
} from '../controllers/assets.controller.js';
import { getAssetMovementHandler } from '../controllers/accountabilityForms.controller.js';
import { importAssetsHandler } from '../controllers/assetImport.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

/**
 * Public lookup by asset code (QR / asset details page). No auth — must stay
 * above router.use(authenticate). Path is /api/assets/public/:assetCode.
 *
 * SECURITY: This endpoint uses a SEPARATE handler (`getAssetPublicHandler`)
 * that returns a strictly whitelisted, PII-free subset of asset fields.
 * Do NOT change this to `getAssetByCodeHandler` — that handler is the
 * authenticated full-detail variant and would leak assignment user info,
 * financials, and audit metadata to anyone scanning a QR code.
 */
router.get('/public/:assetCode', getAssetPublicHandler);

// Apply authentication to all routes registered below
router.use(authenticate);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     tags: [Assets]
 *     summary: Get all assets
 *     responses:
 *       200: { description: List of assets }
 *       401: { description: Unauthorized }
 */
router.get('/', getAssetsHandler);

/**
 * @swagger
 * /api/assets/my-assets:
 *   get:
 *     tags: [Assets]
 *     summary: Get assets assigned to current user
 *     responses:
 *       200: { description: List of assigned assets }
 *       401: { description: Unauthorized }
 */
router.get('/my-assets', getMyAssetsHandler);

/**
 * @swagger
 * /api/assets/{assetCode}:
 *   get:
 *     tags: [Assets]
 *     summary: Get asset by code
 *     parameters:
 *       - in: path
 *         name: assetCode
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset details }
 *       401: { description: Unauthorized }
 *       404: { description: Asset not found }
 */
router.get('/:assetCode', getAssetByCodeHandler);

/**
 * @swagger
 * /api/assets:
 *   post:
 *     tags: [Assets]
 *     summary: Create a new asset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, categoryId]
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               categoryId: { type: string }
 *               supplier: { type: string, nullable: true }
 *               typeId: { type: string, nullable: true }
 *               brand: { type: string, nullable: true }
 *               model: { type: string, nullable: true }
 *               serial: { type: string, nullable: true }
 *               purchaseDate: { type: string, nullable: true }
 *               assetValue: { type: number, nullable: true }
 *               salvageValue: { type: number }
 *               condition: { type: string, enum: [Excellent, Good, Fair, Poor, Damaged] }
 *               status: { type: string, enum: [Available, In Use, Under Maintenance, Retired, Disposed, Lost] }
 *               companyId: { type: string, nullable: true }
 *               locationId: { type: string, nullable: true }
 *               departmentId: { type: string, nullable: true }
 *     responses:
 *       201: { description: Asset created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', createAssetHandler);

/**
 * @swagger
 * /api/assets/import:
 *   post:
 *     tags: [Assets]
 *     summary: Bulk import assets from Excel data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assets: { type: array }
 *               builders: { type: array }
 *     responses:
 *       201: { description: Import completed }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/import', importAssetsHandler);

/**
 * @swagger
 * /api/assets/{assetId}:
 *   put:
 *     tags: [Assets]
 *     summary: Update an asset
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId]
 *             properties:
 *               assetId: { type: string }
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               categoryId: { type: string }
 *               status: { type: string }
 *               condition: { type: string }
 *     responses:
 *       200: { description: Asset updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Asset not found }
 */
router.put('/:assetId', updateAssetHandler);

/**
 * @swagger
 * /api/assets/{assetId}/assign:
 *   post:
 *     tags: [Assets]
 *     summary: Assign asset to a user
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               assignDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Asset assigned }
 *       400: { description: Validation error or asset not available }
 *       401: { description: Unauthorized }
 *       404: { description: Asset not found }
 */
router.post('/:assetId/assign', assignAssetHandler);

/**
 * @swagger
 * /api/assets/{assetId}/forms:
 *   get:
 *     tags: [Assets]
 *     summary: Get all forms (accountability, return, transfer, borrow) for an asset
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of all forms for the asset }
 *       401: { description: Unauthorized }
 *       404: { description: Asset not found }
 */
router.get('/:assetId/forms', getAllFormsByAssetIdHandler);

/**
 * @swagger
 * /api/assets/{assetId}/movement:
 *   get:
 *     tags: [Assets]
 *     summary: Get asset movement chain (accountability forms + return/transfer/replacement links)
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asset movement data }
 *       401: { description: Unauthorized }
 */
router.get('/:assetId/movement', getAssetMovementHandler);

export default router;

// src/routes/intangibleAssetTypes.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateIntangibleAssetTypeDtoSchema,
  UpdateIntangibleAssetTypeDtoSchema,
} from '../dtos/intangibleAssetTypes/IntangibleAssetTypeDto.js';
import {
  getAllIntangibleAssetTypes,
  createIntangibleAssetType,
  updateIntangibleAssetType,
  deleteIntangibleAssetType,
} from '../controllers/intangibleAssetTypes.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/intangible-asset-types:
 *   get:
 *     tags: [Intangible Asset Types]
 *     summary: Get all intangible asset types
 *     responses:
 *       200: { description: List of intangible asset types }
 *       401: { description: Unauthorized }
 */
router.get('/', getAllIntangibleAssetTypes);

/**
 * @swagger
 * /api/intangible-asset-types:
 *   post:
 *     tags: [Intangible Asset Types]
 *     summary: Create an intangible asset type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, departmentId]
 *             properties:
 *               name: { type: string }
 *               prefix: { type: string, nullable: true }
 *               departmentId: { type: string }
 *     responses:
 *       201: { description: Intangible asset type created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  validateDto(CreateIntangibleAssetTypeDtoSchema),
  createIntangibleAssetType
);

/**
 * @swagger
 * /api/intangible-asset-types/{id}:
 *   patch:
 *     tags: [Intangible Asset Types]
 *     summary: Update an intangible asset type
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
 *               name: { type: string }
 *               prefix: { type: string, nullable: true }
 *               departmentId: { type: string }
 *     responses:
 *       200: { description: Intangible asset type updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Intangible asset type not found }
 */
router.patch(
  '/:id',
  validateDto(UpdateIntangibleAssetTypeDtoSchema),
  updateIntangibleAssetType
);

/**
 * @swagger
 * /api/intangible-asset-types/{id}:
 *   delete:
 *     tags: [Intangible Asset Types]
 *     summary: Delete an intangible asset type
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Intangible asset type deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Intangible asset type not found }
 */
router.delete('/:id', deleteIntangibleAssetType);

export default router;

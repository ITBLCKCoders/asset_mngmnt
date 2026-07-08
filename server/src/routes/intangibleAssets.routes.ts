// src/routes/intangibleAssets.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateIntangibleAssetDtoSchema,
  UpdateIntangibleAssetDtoSchema,
  CreateIntangibleAssetsBulkDtoSchema,
} from '../dtos/intangibleAssets/IntangibleAssetDto.js';
import {
  getAllIntangibleAssets,
  createIntangibleAsset,
  createIntangibleAssetsBulk,
  updateIntangibleAsset,
  assignIntangibleAsset,
  unassignIntangibleAsset,
  batchAssignIntangibleAssets,
} from '../controllers/intangibleAssets.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/intangible-assets:
 *   get:
 *     tags: [Intangible Assets]
 *     summary: Get all intangible assets
 *     responses:
 *       200: { description: List of intangible assets }
 *       401: { description: Unauthorized }
 */
router.get('/', getAllIntangibleAssets);

/**
 * @swagger
 * /api/intangible-assets:
 *   post:
 *     tags: [Intangible Assets]
 *     summary: Create a single intangible asset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               remarks: { type: string, nullable: true }
 *               type: { type: string, enum: ['IT scope', 'Admin scope'] }
 *               status: { type: string, enum: ['available', 'assigned'] }
 *     responses:
 *       201: { description: Intangible asset created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', validateDto(CreateIntangibleAssetDtoSchema), createIntangibleAsset);

/**
 * @swagger
 * /api/intangible-assets/bulk:
 *   post:
 *     tags: [Intangible Assets]
 *     summary: Create multiple intangible assets in bulk
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assets]
 *             properties:
 *               assets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, type]
 *                   properties:
 *                     name: { type: string }
 *                     description: { type: string, nullable: true }
 *                     remarks: { type: string, nullable: true }
 *                     type: { type: string, enum: ['IT scope', 'Admin scope'] }
 *                     status: { type: string, enum: ['available', 'assigned'] }
 *     responses:
 *       201: { description: Intangible assets created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/bulk',
  validateDto(CreateIntangibleAssetsBulkDtoSchema),
  createIntangibleAssetsBulk
);

/**
 * @swagger
 * /api/intangible-assets/{id}:
 *   patch:
 *     tags: [Intangible Assets]
 *     summary: Update an intangible asset
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
 *               description: { type: string, nullable: true }
 *               remarks: { type: string, nullable: true }
 *               type: { type: string, enum: ['IT scope', 'Admin scope'] }
 *               status: { type: string, enum: ['available', 'assigned'] }
 *     responses:
 *       200: { description: Intangible asset updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Intangible asset not found }
 */
router.patch(
  '/:id',
  validateDto(UpdateIntangibleAssetDtoSchema),
  updateIntangibleAsset
);

/**
 * @swagger
 * /api/intangible-assets/{id}/assign:
 *   post:
 *     tags: [Intangible Assets]
 *     summary: Assign an intangible asset to a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignedTo, assignmentId]
 *             properties:
 *               assignedTo: { type: string }
 *               assignmentId: { type: string }
 *     responses:
 *       200: { description: Intangible asset assigned }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Intangible asset not found }
 */
router.post('/batch-assign', batchAssignIntangibleAssets);
router.post('/:id/assign', assignIntangibleAsset);

/**
 * @swagger
 * /api/intangible-assets/{id}/unassign:
 *   post:
 *     tags: [Intangible Assets]
 *     summary: Unassign an intangible asset from a specific user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: Intangible asset unassigned }
 *       401: { description: Unauthorized }
 *       404: { description: Intangible asset not found }
 */
router.post('/:id/unassign', unassignIntangibleAsset);

export default router;

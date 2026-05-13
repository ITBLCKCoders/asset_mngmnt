// src/routes/types.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateTypeDtoSchema,
  UpdateTypeDtoSchema,
} from '../dtos/types/TypeDto.js';
import {
  getAllTypes,
  createType,
  updateType,
  deleteType,
} from '../controllers/types.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/types:
 *   get:
 *     tags: [Types]
 *     summary: Get all asset types
 *     responses:
 *       200: { description: List of types }
 *       401: { description: Unauthorized }
 */
router.get('/', getAllTypes);

/**
 * @swagger
 * /api/types:
 *   post:
 *     tags: [Types]
 *     summary: Create an asset type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201: { description: Type created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', validateDto(CreateTypeDtoSchema), createType);

/**
 * @swagger
 * /api/types/{id}:
 *   patch:
 *     tags: [Types]
 *     summary: Update an asset type
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
 *     responses:
 *       200: { description: Type updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Type not found }
 */
router.patch(
  '/:id',
  validateDto(UpdateTypeDtoSchema),
  updateType
);

/**
 * @swagger
 * /api/types/{id}:
 *   delete:
 *     tags: [Types]
 *     summary: Delete an asset type
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Type deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Type not found }
 */
router.delete('/:id', deleteType);

export default router;

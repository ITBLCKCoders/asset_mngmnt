// src/routes/brands.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateBrandDtoSchema,
  UpdateBrandDtoSchema,
} from '../dtos/brands/BrandDto.js';
import {
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../controllers/brands.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/brands:
 *   get:
 *     tags: [Brands]
 *     summary: Get all brands
 *     responses:
 *       200: { description: List of brands }
 *       401: { description: Unauthorized }
 */
router.get('/', requirePermission('Asset Brands', 'view'), getAllBrands);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     tags: [Brands]
 *     summary: Create a brand
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
 *       201: { description: Brand created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Asset Brands', 'create'),
  validateDto(CreateBrandDtoSchema),
  createBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     tags: [Brands]
 *     summary: Update a brand
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
 *       200: { description: Brand updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Brand not found }
 */
router.patch(
  '/:id',
  requirePermission('Asset Brands', 'edit'),
  validateDto(UpdateBrandDtoSchema),
  updateBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     tags: [Brands]
 *     summary: Delete a brand
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Brand deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Brand not found }
 */
router.delete('/:id', requirePermission('Asset Brands', 'delete'), deleteBrand);

export default router;

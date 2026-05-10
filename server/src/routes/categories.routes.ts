// src/routes/categories.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateCategoryDtoSchema,
  UpdateCategoryDtoSchema,
} from '../dtos/categories/CategoryDto.js';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     responses:
 *       200: { description: List of categories }
 *       401: { description: Unauthorized }
 */
router.get(
  '/',
  requirePermission('Asset Categories', 'view'),
  getAllCategories
);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, prefix, gl_code, departmentId]
 *             properties:
 *               name: { type: string }
 *               prefix: { type: string, minLength: 2, maxLength: 10 }
 *               gl_code: { type: string }
 *               departmentId: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201: { description: Category created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Asset Categories', 'create'),
  validateDto(CreateCategoryDtoSchema),
  createCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
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
 *               prefix: { type: string }
 *               gl_code: { type: string }
 *               departmentId: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       200: { description: Category updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Category not found }
 */
router.patch(
  '/:id',
  requirePermission('Asset Categories', 'edit'),
  validateDto(UpdateCategoryDtoSchema),
  updateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Category deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Category not found }
 */
router.delete(
  '/:id',
  requirePermission('Asset Categories', 'delete'),
  deleteCategory
);

export default router;

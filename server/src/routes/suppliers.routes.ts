// src/routes/suppliers.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateSupplierDtoSchema,
  UpdateSupplierDtoSchema,
} from '../dtos/suppliers/SupplierDto.js';
import {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/suppliers.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get all suppliers
 *     responses:
 *       200: { description: List of suppliers }
 *       401: { description: Unauthorized }
 */
router.get('/', requirePermission('Suppliers', 'view'), getAllSuppliers);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a supplier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contact: { type: string, nullable: true }
 *               address: { type: string, nullable: true }
 *     responses:
 *       201: { description: Supplier created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Suppliers', 'create'),
  validateDto(CreateSupplierDtoSchema),
  createSupplier
);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   patch:
 *     tags: [Suppliers]
 *     summary: Update a supplier
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
 *               contact: { type: string, nullable: true }
 *               address: { type: string, nullable: true }
 *     responses:
 *       200: { description: Supplier updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Supplier not found }
 */
router.patch(
  '/:id',
  requirePermission('Suppliers', 'edit'),
  validateDto(UpdateSupplierDtoSchema),
  updateSupplier
);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Supplier deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Supplier not found }
 */
router.delete('/:id', requirePermission('Suppliers', 'delete'), deleteSupplier);

export default router;

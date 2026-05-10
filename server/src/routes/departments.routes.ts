import { Router } from 'express';
import {
  getDepartmentsHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
} from '../controllers/departments.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

/**
 * @swagger
 * /api/departments:
 *   get:
 *     tags: [Departments]
 *     summary: Get all departments (public for registration)
 *     security: []
 *     responses:
 *       200: { description: List of departments }
 */
router.get('/', getDepartmentsHandler);

// All other routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create a department
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               companyId: { type: string }
 *     responses:
 *       201: { description: Department created }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Departments', 'create'),
  createDepartmentHandler
);

/**
 * @swagger
 * /api/departments/{id}:
 *   patch:
 *     tags: [Departments]
 *     summary: Update a department
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
 *     responses:
 *       200: { description: Department updated }
 *       401: { description: Unauthorized }
 *       404: { description: Department not found }
 */
router.patch(
  '/:id',
  requirePermission('Departments', 'edit'),
  updateDepartmentHandler
);

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     tags: [Departments]
 *     summary: Soft delete a department
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Department deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Department not found }
 */
router.delete(
  '/:id',
  requirePermission('Departments', 'delete'),
  deleteDepartmentHandler
);

export default router;

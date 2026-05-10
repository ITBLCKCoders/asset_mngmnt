import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  getPositionsHandler,
  getPositionsByDepartmentHandler,
  createPositionHandler,
  updatePositionHandler,
  deletePositionHandler,
} from '../controllers/positions.controller.js';

const router = Router();

/**
 * @swagger
 * /api/positions:
 *   get:
 *     tags: [Positions]
 *     summary: Get all positions (public for registration)
 *     security: []
 *     responses:
 *       200: { description: List of positions }
 */
router.get('/', getPositionsHandler);

// All other routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/positions/department/{departmentId}:
 *   get:
 *     tags: [Positions]
 *     summary: Get positions by department
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of positions }
 *       401: { description: Unauthorized }
 */
router.get('/department/:departmentId', getPositionsByDepartmentHandler);

/**
 * @swagger
 * /api/positions:
 *   post:
 *     tags: [Positions]
 *     summary: Create a position
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               departmentId: { type: string }
 *     responses:
 *       201: { description: Position created }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Departments', 'create'),
  createPositionHandler
);

/**
 * @swagger
 * /api/positions/{id}:
 *   patch:
 *     tags: [Positions]
 *     summary: Update a position
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
 *               departmentId: { type: string }
 *     responses:
 *       200: { description: Position updated }
 *       401: { description: Unauthorized }
 *       404: { description: Position not found }
 */
router.patch(
  '/:id',
  requirePermission('Departments', 'edit'),
  updatePositionHandler
);

/**
 * @swagger
 * /api/positions/{id}:
 *   delete:
 *     tags: [Positions]
 *     summary: Soft delete a position
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Position deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Position not found }
 */
router.delete(
  '/:id',
  requirePermission('Departments', 'delete'),
  deletePositionHandler
);

export default router;

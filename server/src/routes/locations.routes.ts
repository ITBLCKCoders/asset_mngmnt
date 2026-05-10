import { Router } from 'express';
import {
  getLocationsHandler,
  createLocationHandler,
  updateLocationHandler,
  deleteLocationHandler,
} from '../controllers/locations.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

/**
 * @swagger
 * /api/locations:
 *   get:
 *     tags: [Locations]
 *     summary: Get all locations (public for asset forms)
 *     security: []
 *     responses:
 *       200: { description: List of locations }
 */
router.get('/', getLocationsHandler);

// All other routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     tags: [Locations]
 *     summary: Create a location
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               companyId: { type: string }
 *     responses:
 *       201: { description: Location created }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  requirePermission('Locations', 'create'),
  createLocationHandler
);

/**
 * @swagger
 * /api/locations/{id}:
 *   patch:
 *     tags: [Locations]
 *     summary: Update a location
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
 *               address: { type: string }
 *     responses:
 *       200: { description: Location updated }
 *       401: { description: Unauthorized }
 *       404: { description: Location not found }
 */
router.patch(
  '/:id',
  requirePermission('Locations', 'edit'),
  updateLocationHandler
);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     tags: [Locations]
 *     summary: Soft delete a location
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Location deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Location not found }
 */
router.delete(
  '/:id',
  requirePermission('Locations', 'delete'),
  deleteLocationHandler
);

export default router;

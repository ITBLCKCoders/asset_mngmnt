import { Router } from 'express';
import {
  getRolesHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
} from '../controllers/roles.controller.js';
import {
  getRolePermissionsHandler,
  updateRolePermissionsHandler,
} from '../controllers/permissions.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles
 *     responses:
 *       200: { description: List of roles }
 *       401: { description: Unauthorized }
 */
router.get('/', getRolesHandler);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a role
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Role created }
 *       401: { description: Unauthorized }
 */
router.post('/', createRoleHandler);

router.get('/:roleID/permissions', getRolePermissionsHandler);
router.put('/:roleID/permissions', updateRolePermissionsHandler);

/**
 * @swagger
 * /api/roles/{roleID}:
 *   put:
 *     tags: [Roles]
 *     summary: Update a role
 *     parameters:
 *       - in: path
 *         name: roleID
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Role updated }
 *       401: { description: Unauthorized }
 *       404: { description: Role not found }
 */
router.put('/:roleID', updateRoleHandler);

/**
 * @swagger
 * /api/roles/{roleID}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role
 *     parameters:
 *       - in: path
 *         name: roleID
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Role not found }
 */
router.delete('/:roleID', deleteRoleHandler);

export default router;

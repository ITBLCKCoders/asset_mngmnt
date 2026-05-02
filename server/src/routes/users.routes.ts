import { Router } from 'express';
import {
  getUsersHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  removeUserLockoutHandler,
  changeUserPasswordHandler,
} from '../controllers/users.controller.js';
import {
  getUserPermissionsHandler,
  updateUserPermissionsHandler,
  applyRolePermissionsHandler,
} from '../controllers/permissions.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateDto } from '../utils/validation.js';
import {
  UserDtoSchema,
  UpdateUserDtoSchema,
} from '../utils/userValidationSchemas.js';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (public for asset forms)
 *     security: []
 *     responses:
 *       200: { description: List of users }
 */
router.get('/', getUsersHandler);

// All other user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, department_id, company_id]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               department_id: { type: string }
 *               company_id: { type: string }
 *               roleId: { type: string, nullable: true }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', validateDto(UserDtoSchema), createUserHandler);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user
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
 *               email: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               department_id: { type: string }
 *               roleId: { type: string, nullable: true }
 *     responses:
 *       200: { description: User updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.patch('/:id', validateDto(UpdateUserDtoSchema), updateUserHandler);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.delete('/:id', deleteUserHandler);

/**
 * @swagger
 * /api/users/{userId}/permissions:
 *   get:
 *     tags: [Users]
 *     summary: Get user permissions
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User permissions }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.get('/:userId/permissions', getUserPermissionsHandler);

/**
 * @swagger
 * /api/users/{userId}/permissions:
 *   put:
 *     tags: [Users]
 *     summary: Update user permissions
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Permissions updated }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.put('/:userId/permissions', updateUserPermissionsHandler);

/**
 * @swagger
 * /api/users/{userId}/apply-role-permissions:
 *   post:
 *     tags: [Users]
 *     summary: Apply role default permissions to user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role permissions applied }
 *       401: { description: Unauthorized }
 */
router.post('/:userId/apply-role-permissions', applyRolePermissionsHandler);

/**
 * @swagger
 * /api/users/{id}/remove-lockout:
 *   post:
 *     tags: [Users]
 *     summary: Remove user lockout
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lockout removed }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.post('/:id/remove-lockout', removeUserLockoutHandler);

/**
 * @swagger
 * /api/users/{id}/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Change user password (admin)
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
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password changed }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */
router.post('/:id/change-password', changeUserPasswordHandler);

export default router;

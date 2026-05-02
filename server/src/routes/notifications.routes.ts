import { Router } from 'express';
import {
  getNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  getUnreadCountHandler,
  clearNotificationHandler,
  clearAllNotificationsHandler,
  sendUnsignedAccountabilityNotificationHandler,
} from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notifications
 *     responses:
 *       200: { description: List of notifications }
 *       401: { description: Unauthorized }
 */
router.get('/', getNotificationsHandler);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     responses:
 *       200: { description: Unread count }
 *       401: { description: Unauthorized }
 */
router.get('/unread-count', getUnreadCountHandler);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.patch('/:id/read', markAsReadHandler);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200: { description: All notifications marked as read }
 *       401: { description: Unauthorized }
 */
router.patch('/mark-all-read', markAllAsReadHandler);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Clear/delete a specific notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification cleared }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.delete('/:id', clearNotificationHandler);

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     tags: [Notifications]
 *     summary: Clear/delete all notifications
 *     responses:
 *       200: { description: All notifications cleared }
 *       401: { description: Unauthorized }
 */
router.delete('/', clearAllNotificationsHandler);

/**
 * @swagger
 * /api/notifications/accountability-unsigned:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification about unsigned accountability forms
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               unsignedForms:
 *                 type: array
 *     responses:
 *       200: { description: Notification sent successfully }
 *       401: { description: Unauthorized }
 */
router.post('/accountability-unsigned', sendUnsignedAccountabilityNotificationHandler);

export default router;

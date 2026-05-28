import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

const NOTIFICATIONS_FETCH_LIMIT = 10000;

export async function getNotificationsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    logger.info(`Fetching notifications for user ${userId}`);
    const { status } = req.query;

    const validStatuses = ['unread', 'read'];
    let validatedStatus = status;
    logger.debug(`Status parameter received:`, {
      status,
      type: typeof status,
      validatedStatus,
    });

    if (status && !validStatuses.includes(status as string)) {
      logger.warn(`Invalid status parameter: ${status}, ignoring`);
      validatedStatus = undefined;
    }

    try {
      await pool.execute('SELECT 1 FROM notifications LIMIT 1');
    } catch (tableError: any) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        logger.warn(
          'Notifications table does not exist, returning empty array'
        );
        return res.json({ notifications: [] });
      }
      throw tableError;
    }

    const [countResult] = (await pool.execute(
      'CALL sp_get_notifications_count(?)',
      [userId]
    )) as any[];
    const countRows = Array.isArray(countResult[0])
      ? countResult[0]
      : countResult;
    const notificationCount = countRows[0]?.count ?? 0;

    logger.info(`User ${userId} has ${notificationCount} notifications total`);

    if (notificationCount === 0) {
      logger.info(
        `No notifications found for user ${userId}, returning empty array`
      );
      return res.json({ notifications: [] });
    }

    const [rowsResult] = (await pool.execute(
      'CALL sp_get_notifications(?, ?, ?, ?)',
      [userId, validatedStatus ?? null, NOTIFICATIONS_FETCH_LIMIT, 0]
    )) as any[];
    const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
    logger.info(
      `Query returned ${rows.length} notifications for user ${userId}`
    );

    const notifications = rows.map((row: any) => {
      let data = {};
      if (row.data && typeof row.data === 'string') {
        try {
          data = JSON.parse(row.data);
        } catch (parseError) {
          logger.warn(
            `Failed to parse notification data for notification ${row.id}:`,
            parseError
          );
          data = {};
        }
      } else if (row.data) {
        data = row.data;
      }

      let timestamp;
      try {
        timestamp = new Date(row.timestamp);
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date();
        }
      } catch (dateError) {
        logger.warn(`Invalid timestamp for notification ${row.id}:`, dateError);
        timestamp = new Date();
      }

      const notification: any = {
        id: row.id,
        title: row.title || 'Notification',
        description: row.description || 'No description available',
        time: 'Loaded from server',
        read: row.status === 'read',
        type:
          row.type === 'asset_assignment'
            ? 'asset_assigned'
            : (row.type as any),
        timestamp,
        ...data,
      };

      if (notification.type === 'asset_assigned') {
        notification.assetId = notification.assetId || null;
        notification.assetName = notification.assetName || 'Unknown Asset';
        notification.assignedBy = notification.assignedBy || 'System';
      }

      return notification;
    });

    return res.json({ notifications });
  } catch (error: any) {
    logger.error('Get notifications failed:', {
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      errno: error.errno,
      stack: error.stack,
    });

    // Check if it's a table not found error
    if (error.code === 'ER_NO_SUCH_TABLE') {
      logger.warn('Notifications table does not exist, returning empty array');
      return res.json({ notifications: [] });
    }

    // Check for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.error('Database connection failed');
      return res.status(503).json({ error: 'Database connection failed' });
    }

    // Handle JSON parsing errors more gracefully
    if (error.message && error.message.includes('JSON')) {
      logger.error('JSON parsing error in notifications');
      return res
        .status(500)
        .json({ error: 'Failed to process notifications data' });
    }

    // Handle query execution errors
    if (error.code && error.code.startsWith('ER_')) {
      logger.error('Database query error:', error.message);

      // Implement fallback mechanism - return empty array for database errors
      // to prevent complete failure of the notification system
      return res.json({
        notifications: [],
        warning: 'Database operation failed, returning empty notifications',
        errorDetails: error.message,
      });
    }

    // Generic error handler with fallback
    logger.error('Unexpected error fetching notifications:', error.message);

    // Return empty array as fallback for any unexpected errors
    return res.json({
      notifications: [],
      warning: 'Failed to fetch notifications due to unexpected error',
      errorDetails: error.message,
    });
  }
}

export async function markAsReadHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    const { id } = req.params;

    const [result] = (await pool.execute(
      'UPDATE notifications SET status = "read", updated_at = NOW() WHERE notificationID = ? AND user_id = ?',
      [id, userId]
    )) as any[];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await createAuditLog({
      userId,
      action: 'mark_notification_as_read',
      resourceType: 'notification',
      resourceId: String(id),
      details: `Marked notification as read: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    logger.error('Mark as read failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to mark notification as read' });
  }
}

export async function markAllAsReadHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;

    const [result] = (await pool.execute(
      "UPDATE notifications SET read_at = NOW(), status = 'read' WHERE user_id = ? AND status = 'unread' AND deleted_at IS NULL",
      [userId]
    )) as any[];

    const updatedCount = result?.affectedRows ?? 0;

    await createAuditLog({
      userId,
      action: 'mark_all_notifications_as_read',
      resourceType: 'notification',
      resourceId: 'all',
      details: `Marked ${updatedCount} notification(s) as read`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'All notifications marked as read',
      updatedCount,
    });
  } catch (error: any) {
    logger.error('Mark all as read failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to mark all notifications as read' });
  }
}

export async function getUnreadCountHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;

    const [rows] = (await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = "unread" AND deleted_at IS NULL',
      [userId]
    )) as any[];

    return res.json({ count: rows[0].count });
  } catch (error: any) {
    logger.error('Get unread count failed:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
}

export async function clearNotificationHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const { id } = req.params;

    const [result] = (await pool.execute(
      'DELETE FROM notifications WHERE notificationID = ? AND user_id = ?',
      [id, userId]
    )) as any[];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await createAuditLog({
      userId,
      action: 'clear_notification',
      resourceType: 'notification',
      resourceId: String(id),
      details: `Cleared notification with ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Notification cleared' });
  } catch (error: any) {
    logger.error('Clear notification failed:', error);
    return res.status(500).json({ error: 'Failed to clear notification' });
  }
}

export async function clearAllNotificationsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;

    await pool.execute(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );

    await createAuditLog({
      userId,
      action: 'clear_all_notifications',
      resourceType: 'notification',
      details: 'Cleared all notifications for user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'All notifications cleared' });
  } catch (error: any) {
    logger.error('Clear all notifications failed:', error);
    return res.status(500).json({ error: 'Failed to clear all notifications' });
  }
}

/**
 * Send notification to user about unsigned accountability forms
 * This is used when blocking asset assignment due to unsigned forms
 */
export async function sendUnsignedAccountabilityNotificationHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId, unsignedForms } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!unsignedForms || !Array.isArray(unsignedForms) || unsignedForms.length === 0) {
      return res.status(400).json({ error: 'Unsigned forms data is required' });
    }

    // Get the first unsigned form to include in the notification
    const firstForm = unsignedForms[0];
    const formCount = unsignedForms.length;

    // Create notification data
    const notificationData = {
      type: 'accountability_form',
      title: 'Unsigned Accountability Form',
      description: `You have ${formCount} accountability form${formCount > 1 ? 's' : ''} that ${formCount > 1 ? 'have' : 'has'} not been signed yet. Please sign it${formCount > 1 ? ' them' : ''} before receiving new assets.`,
      formId: firstForm.formId,
      formNumber: firstForm.formNumber,
      actionTarget: 'accountability_form',
      route: '/profile?tab=documents',
    };

    // Insert notification into database
    const [result] = (await pool.execute(
      `INSERT INTO notifications (user_id, title, description, type, data, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'unread', NOW())`,
      [
        userId,
        notificationData.title,
        notificationData.description,
        notificationData.type,
        JSON.stringify(notificationData),
      ]
    )) as any[];

    // Emit socket notification to the user
    try {
      const { getIoInstance } = await import('../utils/socketManager.js');
      const io = getIoInstance();
      if (io) {
        io.to(`user:${userId}`).emit('notification', notificationData);
        logger.info(`Notification sent to user ${userId} via socket`);
      }
    } catch (socketError) {
      logger.warn('Failed to send socket notification:', socketError);
    }

    await createAuditLog({
      userId: req.user!.userID,
      action: 'send_unsigned_accountability_notification',
      resourceType: 'notification',
      resourceId: String((result as any).insertId),
      details: `Sent unsigned accountability notification to user ${userId} for ${formCount} form(s)`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ 
      message: 'Notification sent successfully',
      notificationId: (result as any).insertId 
    });
  } catch (error: any) {
    logger.error('Send unsigned accountability notification failed:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}

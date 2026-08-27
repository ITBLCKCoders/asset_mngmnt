import { Notification, NotificationModel } from '../models/notification.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    try {
      logger.info('Fetching all notifications from database');
      const notifications = await NotificationModel.findAll();
      logger.info(`Found ${notifications.length} notifications`);
      return notifications;
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  static async getNotificationById(
    notificationID: string
  ): Promise<Notification | null> {
    try {
      logger.info(`Fetching notification by ID: ${notificationID}`);
      const notification = await NotificationModel.findById(notificationID);

      if (notification) {
        logger.info(`Found notification: ${notification.title}`);
        return notification;
      }

      logger.warn(`Notification not found: ${notificationID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching notification ${notificationID}:`, error);
      throw new Error('Failed to fetch notification');
    }
  }

  static async getNotificationsByUserId(
    user_id: string
  ): Promise<Notification[]> {
    try {
      logger.info(`Fetching notifications by user ID: ${user_id}`);
      const notifications = await NotificationModel.findByUserId(user_id);
      logger.info(
        `Found ${notifications.length} notifications for user ${user_id}`
      );
      return notifications;
    } catch (error) {
      logger.error(`Error fetching notifications by user ${user_id}:`, error);
      throw new Error('Failed to fetch notifications');
    }
  }

  static async createNotification(
    notificationData: Partial<Notification>,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Notification | null> {
    try {
      logger.info('Creating new notification:', {
        title: notificationData.title,
        user_id: notificationData.user_id,
      });

      // Validate required fields
      if (
        !notificationData.user_id ||
        !notificationData.title ||
        !notificationData.message
      ) {
        throw new Error('User ID, title, and message are required');
      }

      // Set default status if not provided
      if (!notificationData.status) {
        notificationData.status = 'unread';
      }

      // Create the notification
      const newNotification = await NotificationModel.create(
        notificationData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Notification',
        resourceType: 'notification',
        resourceId: newNotification?.notificationID || '',
        resourceName: newNotification?.title || '',
        details: `Created notification: ${newNotification?.title}`,
        newValues: {
          user_id: newNotification?.user_id,
          title: newNotification?.title,
          message: newNotification?.message,
          type: newNotification?.type,
          status: newNotification?.status,
        },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      logger.info(
        `Notification created successfully: ${newNotification?.notificationID}`
      );
      return newNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create notification');
    }
  }

  static async updateNotification(
    notificationID: string,
    notificationData: Partial<Notification>,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Notification | null> {
    try {
      logger.info(`Updating notification: ${notificationID}`);

      // Check if notification exists
      const existingNotification =
        await NotificationModel.findById(notificationID);

      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      // Update the notification
      const updatedNotification = await NotificationModel.update(
        notificationID,
        notificationData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Notification',
        resourceType: 'notification',
        resourceId: existingNotification.notificationID,
        resourceName: existingNotification.title,
        details: 'Updated notification details',
        oldValues: {
          user_id: existingNotification.user_id,
          title: existingNotification.title,
          message: existingNotification.message,
          type: existingNotification.type,
          status: existingNotification.status,
        },
        newValues: {
          user_id: updatedNotification?.user_id,
          title: updatedNotification?.title,
          message: updatedNotification?.message,
          type: updatedNotification?.type,
          status: updatedNotification?.status,
        },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      logger.info(`Notification updated successfully: ${notificationID}`);
      return updatedNotification;
    } catch (error) {
      logger.error(`Error updating notification ${notificationID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update notification');
    }
  }

  static async deleteNotification(
    notificationID: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      logger.info(`Deleting notification: ${notificationID}`);

      // Check if notification exists
      const existingNotification =
        await NotificationModel.findById(notificationID);

      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      await NotificationModel.delete(notificationID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Notification',
        resourceType: 'notification',
        resourceId: existingNotification.notificationID,
        resourceName: existingNotification.title,
        details: `Deleted notification: ${existingNotification.title}`,
        oldValues: {
          user_id: existingNotification.user_id,
          title: existingNotification.title,
          message: existingNotification.message,
          type: existingNotification.type,
          status: existingNotification.status,
        },
        newValues: null,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      });

      logger.info(`Notification deleted successfully: ${notificationID}`);
    } catch (error) {
      logger.error(`Error deleting notification ${notificationID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete notification');
    }
  }

  static async markNotificationAsRead(
    notificationID: string,
    userId: string
  ): Promise<Notification | null> {
    try {
      logger.info(`Marking notification as read: ${notificationID}`);

      const updatedNotification = await NotificationModel.markAsRead(
        notificationID,
        userId
      );

      logger.info(`Notification marked as read: ${notificationID}`);
      return updatedNotification;
    } catch (error) {
      logger.error(
        `Error marking notification as read ${notificationID}:`,
        error
      );
      throw new Error('Failed to mark notification as read');
    }
  }

  static async markAllUserNotificationsAsRead(
    user_id: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Marking all notifications as read for user: ${user_id}`);

      const notifications = await NotificationModel.findByUserId(user_id);
      for (const notification of notifications) {
        if (notification.status !== 'read') {
          await NotificationModel.markAsRead(
            notification.notificationID,
            userId
          );
        }
      }

      logger.info(`All notifications marked as read for user: ${user_id}`);
    } catch (error) {
      logger.error(
        `Error marking all notifications as read for user ${user_id}:`,
        error
      );
      throw new Error('Failed to mark all notifications as read');
    }
  }
}

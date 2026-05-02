import { pool } from '../db.js';

export interface Notification {
  notificationID: string;
  user_id: string;
  title: string;
  message: string;
  type: 'asset_assignment' | 'accountability_form' | 'system' | 'reminder' | 'user_lockout';
  status: 'unread' | 'read' | 'archived';
  is_email_sent: boolean;
  email_sent_at: string | null;
  data: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class NotificationModel {
  static async findAll(): Promise<Notification[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE deleted_at IS NULL'
      );
      return rows as Notification[];
    } catch (error) {
      console.error('Error finding all notifications:', error);
      throw error;
    }
  }

  static async findById(notificationID: string): Promise<Notification | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE notificationID = ? AND deleted_at IS NULL',
        [notificationID]
      );
      const notifications = rows as Notification[];
      return notifications[0] ?? null;
    } catch (error) {
      console.error('Error finding notification by ID:', error);
      throw error;
    }
  }

  static async findByUserId(user_id: string): Promise<Notification[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE user_id = ? AND deleted_at IS NULL',
        [user_id]
      );
      return rows as Notification[];
    } catch (error) {
      console.error('Error finding notifications by user ID:', error);
      throw error;
    }
  }

  static async create(
    notificationData: Partial<Notification>,
    userId: string
  ): Promise<Notification | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, status, data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          notificationData.user_id,
          notificationData.title,
          notificationData.message,
          notificationData.type || 'system',
          notificationData.status || 'unread',
          notificationData.data || null,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async update(
    notificationID: string,
    notificationData: Partial<Notification>,
    userId: string
  ): Promise<Notification | null> {
    try {
      await pool.execute(
        'UPDATE notifications SET user_id = ?, title = ?, message = ?, type = ?, status = ?, updated_at = NOW() WHERE notificationID = ? AND deleted_at IS NULL',
        [
          notificationData.user_id,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          notificationData.status,
          notificationID,
        ]
      );
      return this.findById(notificationID);
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  static async delete(notificationID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE notifications SET deleted_at = NOW() WHERE notificationID = ? AND deleted_at IS NULL',
        [notificationID]
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  static async markAsRead(
    notificationID: string,
    userId: string
  ): Promise<Notification | null> {
    try {
      await pool.execute(
        'UPDATE notifications SET status = ?, updated_at = NOW() WHERE notificationID = ? AND deleted_at IS NULL',
        ['read', notificationID]
      );
      return this.findById(notificationID);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

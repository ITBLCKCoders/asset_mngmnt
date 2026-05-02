/**
 * Writes notifications to the `notifications` table used by GET /api/notifications.
 * Use this for all in-app notifications so they appear in the UI and can be marked as read.
 */
import { pool } from '../db.js';
import logger from '../logger.js';

export type NotificationApiType =
  | 'asset_assignment'
  | 'accountability_form'
  | 'system'
  | 'reminder'
  | 'return_form_signed'
  | 'transfer_form_signed';

export interface CreateNotificationForApiParams {
  user_id: string;
  title: string;
  message: string;
  type: NotificationApiType;
  data?: Record<string, unknown>;
}

export async function createNotificationForApi(
  params: CreateNotificationForApiParams
): Promise<void> {
  try {
    const { user_id, title, message, type, data } = params;
    if (!user_id || !title || !message) {
      throw new Error('user_id, title, and message are required');
    }
    const dataJson = data ? JSON.stringify(data) : null;
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, status, data)
       VALUES (?, ?, ?, ?, 'unread', ?)`,
      [user_id, title, message, type, dataJson]
    );
    logger.debug('Notification created for API', { user_id, title, type });
  } catch (error) {
    logger.error('createNotificationForApi failed', error);
    throw error;
  }
}

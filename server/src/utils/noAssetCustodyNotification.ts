import { pool } from '../db.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { createNotificationForApi } from './notificationsApi.js';
import { getIoInstance } from './socketManager.js';
import logger from '../logger.js';

const CLEARANCE_READY_TITLE = 'No asset remains in custody';
const CLEARANCE_READY_MESSAGE =
  'You can now generate your accountability clearance form.';
const CLEARANCE_READY_ROUTE = '/profile?tab=documents&docTab=accountability';

/**
 * Notify an employee when a completed movement/deactivation leaves no active
 * tangible or intangible assets in their custody.
 */
export async function notifyIfNoAssetsRemainInCustody(params: {
  userId: string;
  sourceType: 'return' | 'transfer' | 'intangible_deactivation';
  sourceId?: string | null;
}): Promise<boolean> {
  const { userId, sourceType, sourceId = null } = params;
  if (!userId) return false;

  const [tangibleRows] = (await pool.execute(
    `SELECT 1
       FROM asset_assignments
      WHERE user_id = ? AND status = 'Active' AND deleted_at IS NULL
      LIMIT 1`,
    [userId]
  )) as any[];
  if ((tangibleRows as any[]).length > 0) return false;

  const [intangibleRows] = (await pool.execute(
    `SELECT 1
       FROM intangible_asset_assignments
      WHERE user_id = ? AND status = 'Active' AND deleted_at IS NULL
      LIMIT 1`,
    [userId]
  )) as any[];
  if ((intangibleRows as any[]).length > 0) return false;

  const data = {
    route: CLEARANCE_READY_ROUTE,
    actionTarget: 'accountability_clearance_ready',
    sourceType,
    sourceId,
  };

  try {
    await createNotificationForApi({
      user_id: userId,
      title: CLEARANCE_READY_TITLE,
      message: CLEARANCE_READY_MESSAGE,
      type: 'system',
      data,
    });

    const io = getIoInstance();
    if (io) {
      emitNotification(io, userId, 'notification', {
        title: CLEARANCE_READY_TITLE,
        description: CLEARANCE_READY_MESSAGE,
        type: 'system',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
    return true;
  } catch (error) {
    logger.error('Failed to notify user that no assets remain in custody:', error);
    return false;
  }
}

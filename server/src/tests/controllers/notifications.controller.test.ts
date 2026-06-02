import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as notificationsController from '../../controllers/notifications.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/socketManager.js', () => ({ getIoInstance: jest.fn() }));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const { getIoInstance } = jest.requireMock('../../utils/socketManager.js') as { getIoInstance: jest.Mock };

describe('notifications.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getNotificationsHandler', () => {
    it('returns notifications', async () => {
      mockPool.pool.execute.mockResolvedValueOnce([[1]]); // SELECT 1 check
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ count: 2 }] ]]); // count SP
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ id: 'n-1', title: 'Test', description: 'Desc', status: 'unread', type: 'info', timestamp: '2024-01-01', data: null }] ]]); // data SP
      await notificationsController.getNotificationsHandler(req, res);
      expect(res._json.notifications).toHaveLength(1);
    });

    it('filters by status', async () => {
      req.query = { status: 'unread' };
      mockPool.pool.execute.mockResolvedValueOnce([[1]]);
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ count: 1 }] ]]);
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ id: 'n-1', title: 'T', description: 'D', status: 'unread', type: 'info', timestamp: '2024-01-01', data: null }] ]]);
      await notificationsController.getNotificationsHandler(req, res);
      expect(res._json.notifications).toHaveLength(1);
    });

    it('returns empty when table does not exist', async () => {
      const err = new Error('No such table') as any;
      err.code = 'ER_NO_SUCH_TABLE';
      mockPool.pool.execute.mockRejectedValueOnce(err);
      await notificationsController.getNotificationsHandler(req, res);
      expect(res._json.notifications).toEqual([]);
    });

    it('returns empty when count is 0', async () => {
      mockPool.pool.execute.mockResolvedValueOnce([[1]]);
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ count: 0 }] ]]);
      await notificationsController.getNotificationsHandler(req, res);
      expect(res._json.notifications).toEqual([]);
    });

    it('returns empty with warning on DB error', async () => {
      mockPool.pool.execute.mockRejectedValue(new Error('DB error'));
      await notificationsController.getNotificationsHandler(req, res);
      expect(res._json.notifications).toEqual([]);
      expect(res._json.warning).toBeDefined();
    });
  });

  describe('markAsReadHandler', () => {
    it('marks notification as read', async () => {
      req.params = { id: 'n-1' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      await notificationsController.markAsReadHandler(req, res);
      expect(res._json).toEqual({ message: 'Notification marked as read' });
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'n-999' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 0 }]);
      await notificationsController.markAsReadHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('markAllAsReadHandler', () => {
    it('marks all as read', async () => {
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 5 }]);
      await notificationsController.markAllAsReadHandler(req, res);
      expect(res._json).toEqual({ message: 'All notifications marked as read', updatedCount: 5 });
    });
  });

  describe('getUnreadCountHandler', () => {
    it('returns unread count', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ count: 3 }]]);
      await notificationsController.getUnreadCountHandler(req, res);
      expect(res._json).toEqual({ count: 3 });
    });
  });

  describe('clearNotificationHandler', () => {
    it('clears notification', async () => {
      req.params = { id: 'n-1' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      await notificationsController.clearNotificationHandler(req, res);
      expect(res._json).toEqual({ message: 'Notification cleared' });
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'n-999' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 0 }]);
      await notificationsController.clearNotificationHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('clearAllNotificationsHandler', () => {
    it('clears all notifications', async () => {
      await notificationsController.clearAllNotificationsHandler(req, res);
      expect(res._json).toEqual({ message: 'All notifications cleared' });
    });
  });

  describe('sendUnsignedAccountabilityNotificationHandler', () => {
    it('sends notification successfully', async () => {
      req.body = { userId: 'u-1', unsignedForms: [{ formId: 'f-1', formNumber: 'F-001' }] };
      mockPool.pool.execute.mockResolvedValue([[{ insertId: 1 }]]);
      getIoInstance.mockReturnValue({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) });
      await notificationsController.sendUnsignedAccountabilityNotificationHandler(req, res);
      expect(res._json.message).toBe('Notification sent successfully');
    });

    it('returns 400 when userId missing', async () => {
      req.body = {};
      await notificationsController.sendUnsignedAccountabilityNotificationHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when unsignedForms empty', async () => {
      req.body = { userId: 'u-1', unsignedForms: [] };
      await notificationsController.sendUnsignedAccountabilityNotificationHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});

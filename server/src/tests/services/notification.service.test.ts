import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockModel = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  markAsRead: jest.fn(),
};

jest.mock('../../models/notification.model.js', () => ({
  NotificationModel: mockModel,
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { NotificationService } = require('../../services/notification.service.js');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return all notifications', async () => {
      const expected = [{ notificationID: 'n1' }];
      mockModel.findAll.mockResolvedValue(expected);
      const result = await NotificationService.getNotifications();
      expect(result).toEqual(expected);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by id', async () => {
      const expected = { notificationID: 'n1' };
      mockModel.findById.mockResolvedValue(expected);
      const result = await NotificationService.getNotificationById('n1');
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      const result = await NotificationService.getNotificationById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getNotificationsByUserId', () => {
    it('should return notifications for user', async () => {
      const expected = [{ notificationID: 'n1' }];
      mockModel.findByUserId.mockResolvedValue(expected);
      const result = await NotificationService.getNotificationsByUserId('u1');
      expect(result).toEqual(expected);
    });
  });

  describe('createNotification', () => {
    it('should create notification with valid data', async () => {
      const data = { user_id: 'u1', title: 'Test', message: 'Test notification', type: 'system' };
      mockModel.create.mockResolvedValue({ notificationID: 'new-n1' });
      const result = await NotificationService.createNotification(data, 'u1');
      expect(result).toEqual({ notificationID: 'new-n1' });
    });

    it('should throw when data missing', async () => {
      await expect(NotificationService.createNotification({}, 'u1')).rejects.toThrow();
    });
  });

  describe('updateNotification', () => {
    it('should update existing notification', async () => {
      mockModel.findById.mockResolvedValue({ notificationID: 'n1' });
      mockModel.update.mockResolvedValue({ notificationID: 'n1', title: 'Updated' });
      const result = await NotificationService.updateNotification('n1', { title: 'Updated' }, 'u1');
      expect(result).toEqual({ notificationID: 'n1', title: 'Updated' });
    });

    it('should throw when not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(NotificationService.updateNotification('nope', {}, 'u1')).rejects.toThrow();
    });
  });

  describe('deleteNotification', () => {
    it('should delete existing notification', async () => {
      mockModel.findById.mockResolvedValue({ notificationID: 'n1' });
      await NotificationService.deleteNotification('n1', 'u1');
      expect(mockModel.delete).toHaveBeenCalledWith('n1', 'u1');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockModel.markAsRead = jest.fn().mockResolvedValue({ notificationID: 'n1', status: 'read' });
      const result = await NotificationService.markNotificationAsRead('n1', 'u1');
      expect(result).toBeDefined();
      expect(mockModel.markAsRead).toHaveBeenCalledWith('n1', 'u1');
    });
  });

  describe('markAllUserNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockModel.markAsRead = jest.fn().mockResolvedValue({});
      mockModel.findByUserId.mockResolvedValue([
        { notificationID: 'n1', status: 'unread' },
        { notificationID: 'n2', status: 'unread' },
      ]);
      await NotificationService.markAllUserNotificationsAsRead('u1', 'u1');
      expect(mockModel.markAsRead).toHaveBeenCalledTimes(2);
    });
  });
});

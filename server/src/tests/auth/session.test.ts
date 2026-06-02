import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockSettingGetValue = jest.fn();
const mockCreateAuditLog = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../models/setting.model.js', () => ({
  SettingModel: { getValue: (...args: any[]) => mockSettingGetValue(...args) },
}));
jest.mock('../../utils/audit.js', () => ({
  createAuditLog: (...args: any[]) => mockCreateAuditLog(...args),
}));

const { checkInactivity, updateActivity, verifyRefreshToken, revokeRefreshToken, logout } = require('../../auth/session.js');

describe('Auth Session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingGetValue.mockResolvedValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkInactivity', () => {
    it('should return true when no session found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[]], []]);
      const result = await checkInactivity('user-1');
      expect(result).toBe(true);
    });

    it('should return false when within timeout', async () => {
      mockSettingGetValue.mockResolvedValue(60);
      const recent = new Date(Date.now() - 1000 * 60).toISOString();
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ last_activity: recent }], []]);
      const result = await checkInactivity('user-1');
      expect(result).toBe(false);
    });

    it('should delete sessions and audit log when inactive', async () => {
      mockSettingGetValue.mockResolvedValue(1);
      const oldDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ last_activity: oldDate }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      mockCreateAuditLog.mockResolvedValue(undefined);

      const result = await checkInactivity('user-1');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_delete_sessions_by_user(?)', ['user-1']);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Auto Logout' }));
    });
  });

  describe('updateActivity', () => {
    it('should call sp_update_session_activity', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      jest.setSystemTime(100_000);
      await updateActivity('unique-user-a');
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_update_session_activity(?)', ['unique-user-a']);
    });

    it('should throttle subsequent calls within 60s', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      jest.setSystemTime(100_000);
      await updateActivity('unique-user-b');
      jest.advanceTimersByTime(30_000);
      await updateActivity('unique-user-b');
      expect(mockPool.execute).toHaveBeenCalledTimes(1);
    });

    it('should allow update after throttle window', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      jest.setSystemTime(100_000);
      await updateActivity('unique-user-c');
      jest.advanceTimersByTime(61_000);
      await updateActivity('unique-user-c');
      expect(mockPool.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyRefreshToken', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '192.168.1.1' }, userAgent: 'test-agent' } as any;

    it('should return user info when session is valid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ sessionID: 'sess-1', userID: 'u1', ip: '192.168.1.1', user_agent: 'test-agent' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1', email: 'user@test.com' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      const result = await verifyRefreshToken('valid-token', mockReq);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('u1');
      expect(result!.email).toBe('user@test.com');
    });

    it('should return null when no session found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[]], []]);
      const result = await verifyRefreshToken('bad-token', mockReq);
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ sessionID: 'sess-1', userID: 'u1', ip: '192.168.1.1', user_agent: 'test-agent' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[[]], []]);
      const result = await verifyRefreshToken('valid-token', mockReq);
      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should call sp_delete_session_by_refresh_token', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      await revokeRefreshToken('some-token');
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_delete_session_by_refresh_token(?)', ['some-token']);
    });
  });

  describe('logout', () => {
    it('should call sp_delete_sessions_by_user', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      await logout('user-1');
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_delete_sessions_by_user(?)', ['user-1']);
    });
  });
});

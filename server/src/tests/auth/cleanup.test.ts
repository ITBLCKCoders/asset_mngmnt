import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});

const { cleanupExpiredSessions } = require('../../auth/cleanup.js');

describe('Auth Cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call sp_cleanup_expired_auth_data', async () => {
    (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
    await cleanupExpiredSessions();
    expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_cleanup_expired_auth_data()');
  });

  it('should not throw when stored procedure is missing', async () => {
    const missingProcErr = new Error('sp_cleanup_expired_auth_data does not exist');
    (missingProcErr as any).code = 'ER_SP_DOES_NOT_EXIST';
    (missingProcErr as any).errno = 1305;
    (mockPool.execute as jest.Mock).mockRejectedValue(missingProcErr);
    await expect(cleanupExpiredSessions()).resolves.not.toThrow();
  });

  it('should re-throw unexpected errors', async () => {
    (mockPool.execute as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    await expect(cleanupExpiredSessions()).rejects.toThrow('DB connection lost');
  });
});

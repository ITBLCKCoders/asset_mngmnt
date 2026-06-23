import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  userHasPermission,
  requirePermission,
} = require('../../middleware/requirePermission.js');

describe('requirePermission middleware', () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    req = {
      user: { userID: 'u1' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('userHasPermission', () => {
    it('should return true when granted = 1', async () => {
      mockPool.execute.mockResolvedValue([[{ granted: 1 }], []]);
      const result = await userHasPermission('u1', 'Assets', 'view');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT granted'),
        ['u1', 'Assets', 'view']
      );
    });

    it('should return false when granted = 0', async () => {
      mockPool.execute.mockResolvedValue([[{ granted: 0 }], []]);
      const result = await userHasPermission('u1', 'Assets', 'edit');
      expect(result).toBe(false);
    });

    it('should return false when no rows returned', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      const result = await userHasPermission('u1', 'Assets', 'delete');
      expect(result).toBe(false);
    });
  });

  describe('requirePermission middleware', () => {
    it('should call next when user has permission', async () => {
      mockPool.execute.mockResolvedValue([[{ granted: 1 }], []]);
      const middleware = requirePermission('Assets', 'view');
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user lacks permission', async () => {
      mockPool.execute.mockResolvedValue([[{ granted: 0 }], []]);
      const middleware = requirePermission('Assets', 'edit');
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is missing', async () => {
      req.user = undefined;
      const middleware = requirePermission('Assets', 'view');
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 on db error', async () => {
      mockPool.execute.mockRejectedValue(new Error('DB down'));
      const middleware = requirePermission('Assets', 'view');
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

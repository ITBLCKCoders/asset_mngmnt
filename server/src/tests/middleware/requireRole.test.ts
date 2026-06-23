import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  getUserRoleName,
  requireRole,
} = require('../../middleware/requireRole.js');
const { ROLES } = require('../../constants/roles.js');

describe('requireRole middleware', () => {
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

  describe('getUserRoleName', () => {
    it('should return role name when found', async () => {
      mockPool.execute.mockResolvedValue([[{ role_name: 'Super Admin' }], []]);
      const result = await getUserRoleName('u1');
      expect(result).toBe('Super Admin');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN asset_mngmnt_roles'),
        ['u1']
      );
    });

    it('should return null when user has no role', async () => {
      mockPool.execute.mockResolvedValue([[{ role_name: null }], []]);
      const result = await getUserRoleName('u1');
      expect(result).toBeNull();
    });

    it('should return null when no rows returned', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      const result = await getUserRoleName('u1');
      expect(result).toBeNull();
    });
  });

  describe('requireRole middleware', () => {
    it('should call next when user has required role', async () => {
      mockPool.execute.mockResolvedValue([[{ role_name: 'Super Admin' }], []]);
      const middleware = requireRole(ROLES.SUPER_ADMIN);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next when user role is in allowed list', async () => {
      mockPool.execute.mockResolvedValue([[{ role_name: 'User' }], []]);
      const middleware = requireRole(ROLES.SUPER_ADMIN, ROLES.USER);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user role is not allowed', async () => {
      mockPool.execute.mockResolvedValue([[{ role_name: 'User' }], []]);
      const middleware = requireRole(ROLES.SUPER_ADMIN);
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is missing', async () => {
      req.user = undefined;
      const middleware = requireRole(ROLES.SUPER_ADMIN);
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 on db error', async () => {
      mockPool.execute.mockRejectedValue(new Error('DB down'));
      const middleware = requireRole(ROLES.SUPER_ADMIN);
      await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

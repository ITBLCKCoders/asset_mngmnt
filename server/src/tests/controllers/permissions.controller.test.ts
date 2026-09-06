import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as permissionsController from '../../controllers/permissions.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../db/ensureRolePermissionsTable.js', () => ({
  ensureRolePermissionsTable: jest.fn(),
}));

const mockPool = jest.requireMock('../../db.js') as {
  pool: { query: jest.Mock<any>; execute: jest.Mock<any> };
};

describe('permissions.controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getUserPermissionsHandler', () => {
    it('returns permissions and roleCustodian', async () => {
      req.params = { userId: 'u-1' };
      mockPool.pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ role_id: 'r-1' }]])
        .mockResolvedValueOnce([[[]]])
        .mockResolvedValueOnce([[{ asset_type: 'hardware', manager_role: 'custodian' }]]);
      await permissionsController.getUserPermissionsHandler(req, res);
      expect(res._json.permissions).toBeDefined();
      expect(res._json.roleCustodian).toBeDefined();
    });

    it('returns 500 on error', async () => {
      req.params = { userId: 'u-1' };
      mockPool.pool.execute.mockRejectedValue(new Error('DB error'));
      await permissionsController.getUserPermissionsHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('updateUserPermissionsHandler', () => {
    it('updates permissions successfully', async () => {
      req.params = { userId: 'u-1' };
      req.body = { permissions: { Assets: { view: true, create: false, edit: false, delete: false } } };
      mockPool.pool.execute
        // actor guard lookup (non-admin bypasses company check)
        .mockResolvedValueOnce([[{ role_name: 'IT Asset Manager', company_id: 'c-1' }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([['u-1', 'Assets', 'view', 1]])
        .mockResolvedValueOnce([{ insertId: 1 }]);
      await permissionsController.updateUserPermissionsHandler(req, res);
      expect(res._json.message).toBe('Permissions updated successfully');
    });

    it('returns 403 when local admin manages a user outside its company', async () => {
      req.params = { userId: 'u-1' };
      req.body = { permissions: { Assets: { view: true } } };
      mockPool.pool.execute
        .mockResolvedValueOnce([[{ role_name: 'Admin', company_id: 'c-1' }]])
        .mockResolvedValueOnce([[{ company_id: 'c-2', role_name: 'User' }]]);
      await permissionsController.updateUserPermissionsHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('returns 500 on error', async () => {
      req.params = { userId: 'u-1' };
      req.body = { permissions: {} };
      mockPool.pool.execute.mockRejectedValue(new Error('DB error'));
      await permissionsController.updateUserPermissionsHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('applyRolePermissionsHandler', () => {
    it('applies role permissions successfully', async () => {
      req.params = { userId: 'u-1' };
      mockPool.pool.execute
        // actor guard lookup (non-admin bypasses company check)
        .mockResolvedValueOnce([[{ role_name: 'IT Asset Manager', company_id: 'c-1' }]])
        .mockResolvedValueOnce([[{ role_id: 'r-1' }]])
        .mockResolvedValueOnce([[{ name: 'User', hr_accountability_receiver: 0 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);
      await permissionsController.applyRolePermissionsHandler(req, res);
      expect(res._json.message).toBe('Role permissions applied successfully');
    });

    it('returns message when user has no role', async () => {
      req.params = { userId: 'u-1' };
      mockPool.pool.execute
        .mockResolvedValueOnce([[{ role_name: 'IT Asset Manager', company_id: 'c-1' }]])
        .mockResolvedValueOnce([[]]);
      await permissionsController.applyRolePermissionsHandler(req, res);
      expect(res._json.message).toContain('No role assigned');
    });
  });

  describe('getRolePermissionsHandler', () => {
    it('returns role permissions', async () => {
      req.params = { roleID: 'r-1' };
      mockPool.pool.execute.mockResolvedValue([[]]);
      await permissionsController.getRolePermissionsHandler(req, res);
      expect(res._json.permissions).toBeDefined();
    });

    it('returns global admin default permissions with Settings/Users full and other modules view only', async () => {
      req.params = { roleID: 'r-global' };
      mockPool.pool.execute
        .mockResolvedValueOnce([[{ name: 'Global Admin' }]])
        .mockResolvedValueOnce([[]]);
      await permissionsController.getRolePermissionsHandler(req, res);
      expect(res._json.permissions.Settings).toEqual({
        view: true,
        create: true,
        edit: true,
        delete: true,
      });
      expect(res._json.permissions.Users).toEqual({
        view: true,
        create: true,
        edit: true,
        delete: true,
      });
      expect(res._json.permissions.Assets).toEqual({
        view: true,
        create: false,
        edit: false,
        delete: false,
      });
    });
  });

  describe('updateRolePermissionsHandler', () => {
    it('returns 400 when permissions missing', async () => {
      req.params = { roleID: 'r-1' };
      req.body = {};
      await permissionsController.updateRolePermissionsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when role not found', async () => {
      req.params = { roleID: 'r-999' };
      req.body = { permissions: {} };
      mockPool.pool.execute.mockResolvedValueOnce([[]]);
      await permissionsController.updateRolePermissionsHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('updates role permissions successfully', async () => {
      req.params = { roleID: 'r-1' };
      req.body = { permissions: { Assets: { view: true, create: false, edit: false, delete: false } } };
      mockPool.pool.execute
        .mockResolvedValueOnce([[{ roleID: 'r-1' }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);
      await permissionsController.updateRolePermissionsHandler(req, res);
      expect(res._json.message).toBe('Role permissions updated successfully');
    });
  });
});

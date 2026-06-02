import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as rolesController from '../../controllers/roles.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };

describe('roles.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getRolesHandler', () => {
    it('returns roles list', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ roleID: '1', name: 'Admin', description: null }]]);
      await rolesController.getRolesHandler(req, res);
      expect(res._json.roles).toHaveLength(1);
      expect(res._json.roles[0].name).toBe('Admin');
    });

    it('falls back to stored procedure on bad field error', async () => {
      const err = new Error('Bad field') as any;
      err.code = 'ER_BAD_FIELD_ERROR';
      err.errno = 1054;
      const fallbackRow = { roleID: '2', name: 'User', description: null, created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null, asset_type: null, manager_role: null, hr_accountability_receiver: 0, manager_approver_1: 0, manager_approver_2: 0, manager_approver_3: 0 };
      mockPool.pool.execute.mockRejectedValueOnce(err);
      mockPool.pool.execute.mockResolvedValueOnce([[ [fallbackRow] ]]);
      await rolesController.getRolesHandler(req, res);
      expect(res._json.roles).toHaveLength(1);
    });

    it('returns 500 on error', async () => {
      mockPool.pool.execute.mockRejectedValue(new Error('DB error'));
      await rolesController.getRolesHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createRoleHandler', () => {
    it('returns 400 when name is missing', async () => {
      req.body = {};
      await rolesController.createRoleHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('creates role successfully', async () => {
      req.body = { name: 'Manager' };
      mockPool.pool.execute.mockResolvedValueOnce([[{ roleID: 'r-1' }]]);
      mockPool.pool.execute.mockResolvedValueOnce([[{ roleID: 'r-1', name: 'Manager', description: null, created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null, asset_type: null, manager_role: null, hr_accountability_receiver: 0, manager_approver_1: 0, manager_approver_2: 0, manager_approver_3: 0 }]]);
      await rolesController.createRoleHandler(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateRoleHandler', () => {
    it('returns 400 when name is missing', async () => {
      req.params = { roleID: 'r-1' };
      req.body = {};
      await rolesController.updateRoleHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('updates role successfully', async () => {
      req.params = { roleID: 'r-1' };
      req.body = { name: 'Updated Role' };
      mockPool.pool.execute.mockResolvedValueOnce([[{ affected_rows: 1 }]]);
      mockPool.pool.execute.mockResolvedValueOnce([[{ roleID: 'r-1', name: 'Updated Role', description: null, created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null, asset_type: null, manager_role: null, hr_accountability_receiver: 0, manager_approver_1: 0, manager_approver_2: 0, manager_approver_3: 0 }]]);
      await rolesController.updateRoleHandler(req, res);
      expect(res._json.message).toBe('Role updated successfully');
    });

    it('returns 404 when role not found', async () => {
      req.params = { roleID: 'r-999' };
      req.body = { name: 'Ghost' };
      mockPool.pool.execute.mockResolvedValueOnce([[{ affected_rows: 0 }]]);
      await rolesController.updateRoleHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('deleteRoleHandler', () => {
    it('deletes role successfully', async () => {
      req.params = { roleID: 'r-1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await rolesController.deleteRoleHandler(req, res);
      expect(res._json).toEqual({ message: 'Role deleted successfully' });
    });

    it('returns 404 when role not found', async () => {
      req.params = { roleID: 'r-999' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await rolesController.deleteRoleHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

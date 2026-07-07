import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as usersController from '../../controllers/users.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn(), buildAuditContext: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn() }));
jest.mock('../../auth/password.js', () => ({ validatePassword: jest.fn() }));
jest.mock('../../auth/passwordPolicy.js', () => ({ BCRYPT_COST: 10 }));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const bcrypt = jest.requireMock('bcryptjs') as { hash: jest.Mock };
const { validatePassword } = jest.requireMock('../../auth/password.js') as { validatePassword: jest.Mock };

describe('users.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: 'admin-1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getUsersHandler', () => {
    it('returns users list', async () => {
      const mockUser = { id: 'u-1', email: 'a@b.com', first_name: 'Alice', last_name: 'Smith', department_id: 'd-1', company_id: 'c-1', role: null, department: null, company: null, is_active: 1, created_at: null, updated_at: null, hr_accountability_receiver: 0, manager_approver_1: 0, manager_approver_2: 0, manager_approver_3: 0 };
      mockPool.pool.execute.mockResolvedValue([[ [mockUser] ]]);
      mockPool.pool.query
        .mockResolvedValueOnce([[{ userID: 'u-1', digital_signature: null }]])
        .mockResolvedValueOnce([[{ userID: 'u-1', lockout_until: null, failed_login_attempts: 0 }]]);
      await usersController.getUsersHandler(req, res);
      expect(res._json.users).toHaveLength(1);
      expect(res._json.users[0].email).toBe('a@b.com');
    });

    it('returns 500 on error', async () => {
      mockPool.pool.execute.mockRejectedValue(new Error('DB error'));
      await usersController.getUsersHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createUserHandler', () => {
    it('creates user successfully', async () => {
      req.body = { email: 'a@b.com', first_name: 'Alice', last_name: 'Smith' };
      mockPool.pool.execute.mockResolvedValue([[ [{ id: 'new-u-1' }] ]]);
      await usersController.createUserHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.message).toBe('User created successfully');
    });

    it('returns 400 on validation error', async () => {
      req.body = { email: '' };
      await usersController.createUserHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('handles duplicate email error', async () => {
      req.body = { email: 'dup@b.com', first_name: 'Dup', last_name: 'User' };
      const err = new Error('Duplicate') as any;
      err.code = 'ER_DUP_ENTRY';
      mockPool.pool.execute.mockRejectedValue(err);
      await usersController.createUserHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateUserHandler', () => {
    it('updates user successfully', async () => {
      req.params = { id: 'u-1' };
      req.body = { email: 'a@b.com', first_name: 'Alice', last_name: 'Smith' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await usersController.updateUserHandler(req, res);
      expect(res._json.message).toBe('User updated successfully');
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'u-999' };
      req.body = { email: 'x@y.com', first_name: 'X', last_name: 'Y' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await usersController.updateUserHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('upserts custodian settings when provided', async () => {
      req.params = { id: 'u-1' };
      req.body = { email: 'a@b.com', first_name: 'Alice', last_name: 'Smith', hr_accountability_receiver: true };
      mockPool.pool.execute
        .mockResolvedValueOnce([[ [{ affected_rows: 1 }] ]])
        .mockResolvedValueOnce([[ [{ affected_rows: 1 }] ]]);
      await usersController.updateUserHandler(req, res);
      expect(mockPool.pool.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteUserHandler', () => {
    it('deletes user successfully', async () => {
      req.params = { id: 'u-1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await usersController.deleteUserHandler(req, res);
      expect(res._json).toEqual({ message: 'User deleted successfully' });
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'u-999' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await usersController.deleteUserHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('removeUserLockoutHandler', () => {
    it('removes user lockout', async () => {
      req.params = { id: 'u-1' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
      await usersController.removeUserLockoutHandler(req, res);
      expect(res._json).toEqual({ message: 'User lockout removed successfully' });
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'u-999' };
      mockPool.pool.execute.mockResolvedValue([{ affectedRows: 0 }]);
      await usersController.removeUserLockoutHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('changeUserPasswordHandler', () => {
    it('changes user password', async () => {
      req.params = { id: 'u-1' };
      req.body = { newPassword: 'Str0ng!Pass' };
      validatePassword.mockResolvedValue({ valid: true, error: null });
      mockPool.pool.execute
        .mockResolvedValueOnce([[{ email: 'a@b.com' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      bcrypt.hash.mockResolvedValue('hashed-pw');
      await usersController.changeUserPasswordHandler(req, res);
      expect(res._json.message).toContain('User will be required to change password');
    });

    it('returns 400 when password missing', async () => {
      req.params = { id: 'u-1' };
      req.body = {};
      await usersController.changeUserPasswordHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when password invalid', async () => {
      req.params = { id: 'u-1' };
      req.body = { newPassword: 'weak' };
      validatePassword.mockResolvedValue({ valid: false, error: 'Too weak' });
      await usersController.changeUserPasswordHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
      req.params = { id: 'u-999' };
      req.body = { newPassword: 'Str0ng!Pass' };
      validatePassword.mockResolvedValue({ valid: true, error: null });
      mockPool.pool.execute.mockResolvedValue([[]]);
      await usersController.changeUserPasswordHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

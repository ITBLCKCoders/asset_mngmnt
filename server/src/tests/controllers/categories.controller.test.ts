import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as categoriesController from '../../controllers/categories.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/activeCompany.js', () => ({
  getScopedActiveCompany: jest.fn(),
}));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js') as {
  getScopedActiveCompany: jest.Mock;
};

describe('categories.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllCategories', () => {
    it('returns categories list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Cat A', 'Cat B']]]);
      await categoriesController.getAllCategories(req, res);
      expect(res._json).toEqual(['Cat A', 'Cat B']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      mockPool.pool.query.mockResolvedValue([[{ role_name: 'User' }], []]);
      await categoriesController.getAllCategories(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await categoriesController.getAllCategories(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createCategory', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', prefix: '', gl_code: '', departmentId: '' };
      await categoriesController.createCategory(req, res);
      expect(res._status).toBe(400);
    });

    it('creates category successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Test Cat', prefix: 'TC', gl_code: 'GL-001', departmentId: 'dept-1' };
      await categoriesController.createCategory(req, res);
      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true });
    });

    it('handles duplicate prefix error', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Test', prefix: 'TC', gl_code: 'GL-001', departmentId: 'dept-1' };
      const err = new Error('Duplicate') as any;
      err.code = 'ER_DUP_ENTRY';
      mockPool.pool.query.mockRejectedValue(err);
      await categoriesController.createCategory(req, res);
      expect(res._status).toBe(400);
      expect(res._json).toEqual({ error: 'Category prefix already exists' });
    });
  });

  describe('updateCategory', () => {
    it('updates category successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Cat', prefix: 'UC', gl_code: 'GL-002', departmentId: 'dept-1' };
      await categoriesController.updateCategory(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteCategory', () => {
    it('deletes category successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await categoriesController.deleteCategory(req, res);
      expect(res._json).toEqual({ message: 'Category deleted successfully' });
    });
  });
});

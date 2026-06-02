import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as brandsController from '../../controllers/brands.controller.js';
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

describe('brands.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllBrands', () => {
    it('returns brands list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Brand A', 'Brand B']]]);
      await brandsController.getAllBrands(req, res);
      expect(res._json).toEqual(['Brand A', 'Brand B']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await brandsController.getAllBrands(req, res);
      expect(res._status).toBe(400);
      expect(res._json).toEqual({ error: 'No active company found' });
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await brandsController.getAllBrands(req, res);
      expect(res._status).toBe(500);
      expect(res._json).toEqual({ error: 'Failed to fetch brands' });
    });
  });

  describe('createBrand', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', typeId: '' };
      await brandsController.createBrand(req, res);
      expect(res._status).toBe(400);
      expect(res._json).toEqual({ error: 'Name and type ID are required' });
    });

    it('creates brand successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Test Brand', typeId: 'type-1', prefix: 'TB' };
      await brandsController.createBrand(req, res);
      expect(mockPool.pool.query).toHaveBeenCalled();
      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('updateBrand', () => {
    it('returns 400 on validation error', async () => {
      req.params = { id: '1' };
      req.body = { name: '', typeId: '' };
      await brandsController.updateBrand(req, res);
      expect(res._status).toBe(400);
    });

    it('updates brand successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Brand', typeId: 'type-1' };
      await brandsController.updateBrand(req, res);
      expect(res._json).toEqual({ success: true });
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Brand', typeId: 'type-1' };
      mockPool.pool.query.mockRejectedValue(new Error('DB error'));
      await brandsController.updateBrand(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('deleteBrand', () => {
    it('deletes brand successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await brandsController.deleteBrand(req, res);
      expect(res._json).toEqual({ message: 'Brand deleted successfully' });
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as suppliersController from '../../controllers/suppliers.controller.js';
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

describe('suppliers.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllSuppliers', () => {
    it('returns suppliers list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Supplier A', 'Supplier B']]]);
      await suppliersController.getAllSuppliers(req, res);
      expect(res._json).toEqual(['Supplier A', 'Supplier B']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      mockPool.pool.query.mockResolvedValue([[{ role_name: 'User' }], []]);
      await suppliersController.getAllSuppliers(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('createSupplier', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', categoryId: '' };
      await suppliersController.createSupplier(req, res);
      expect(res._status).toBe(400);
    });

    it('creates supplier successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Test Supplier', categoryId: 'cat-1' };
      await suppliersController.createSupplier(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateSupplier', () => {
    it('updates supplier successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Supplier', categoryId: 'cat-1' };
      await suppliersController.updateSupplier(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteSupplier', () => {
    it('deletes supplier successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await suppliersController.deleteSupplier(req, res);
      expect(res._json).toEqual({ message: 'Supplier deleted successfully' });
    });
  });
});

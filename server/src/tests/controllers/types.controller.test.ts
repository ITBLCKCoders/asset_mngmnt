import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as typesController from '../../controllers/types.controller.js';
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

describe('types.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllTypes', () => {
    it('returns types list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Type A', 'Type B']]]);
      await typesController.getAllTypes(req, res);
      expect(res._json).toEqual(['Type A', 'Type B']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      mockPool.pool.query.mockResolvedValue([[{ role_name: 'User' }], []]);
      await typesController.getAllTypes(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await typesController.getAllTypes(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createType', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', categoryId: '' };
      await typesController.createType(req, res);
      expect(res._status).toBe(400);
    });

    it('creates type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Test Type', categoryId: 'cat-1', prefix: 'TT' };
      await typesController.createType(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateType', () => {
    it('updates type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Type', categoryId: 'cat-1' };
      await typesController.updateType(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteType', () => {
    it('deletes type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await typesController.deleteType(req, res);
      expect(res._json).toEqual({ message: 'Type deleted successfully' });
    });
  });
});

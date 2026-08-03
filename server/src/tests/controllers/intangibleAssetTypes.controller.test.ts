import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as intangibleAssetTypesController from '../../controllers/intangibleAssetTypes.controller.js';
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

describe('intangibleAssetTypes.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllIntangibleAssetTypes', () => {
    it('returns list for scoped company', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Type A', 'Type B']]]);
      await intangibleAssetTypesController.getAllIntangibleAssetTypes(req, res);
      expect(res._json).toEqual(['Type A', 'Type B']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      mockPool.pool.query.mockResolvedValue([[{ role_name: 'User' }], []]);
      await intangibleAssetTypesController.getAllIntangibleAssetTypes(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await intangibleAssetTypesController.getAllIntangibleAssetTypes(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createIntangibleAssetType', () => {
    it('returns 400 on missing name', async () => {
      req.body = { name: '', departmentId: 'dept-1' };
      await intangibleAssetTypesController.createIntangibleAssetType(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 on missing department', async () => {
      req.body = { name: 'Software' };
      await intangibleAssetTypesController.createIntangibleAssetType(req, res);
      expect(res._status).toBe(400);
    });

    it('creates type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Software', prefix: 'SW', departmentId: 'dept-1' };
      await intangibleAssetTypesController.createIntangibleAssetType(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateIntangibleAssetType', () => {
    it('returns 400 on missing department', async () => {
      req.params = { id: '1' };
      req.body = { name: 'License' };
      await intangibleAssetTypesController.updateIntangibleAssetType(req, res);
      expect(res._status).toBe(400);
    });

    it('updates type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'License', prefix: 'LIC', departmentId: 'dept-1' };
      await intangibleAssetTypesController.updateIntangibleAssetType(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteIntangibleAssetType', () => {
    it('deletes type successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await intangibleAssetTypesController.deleteIntangibleAssetType(req, res);
      expect(res._json).toEqual({
        message: 'Intangible asset type deleted successfully',
      });
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as riskLevelsController from '../../controllers/riskLevels.controller.js';
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

describe('riskLevels.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllRiskLevels', () => {
    it('returns list for scoped company', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([[['Low', 'High']]]);
      await riskLevelsController.getAllRiskLevels(req, res);
      expect(res._json).toEqual(['Low', 'High']);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      mockPool.pool.query.mockResolvedValue([[{ role_name: 'User' }], []]);
      await riskLevelsController.getAllRiskLevels(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await riskLevelsController.getAllRiskLevels(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createRiskLevel', () => {
    it('returns 400 on missing name', async () => {
      req.body = { name: '' };
      await riskLevelsController.createRiskLevel(req, res);
      expect(res._status).toBe(400);
    });

    it('creates risk level successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'High', color: '#ef4444' };
      await riskLevelsController.createRiskLevel(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateRiskLevel', () => {
    it('updates risk level successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Critical', color: '#dc2626' };
      await riskLevelsController.updateRiskLevel(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteRiskLevel', () => {
    it('deletes risk level successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      mockPool.pool.query.mockResolvedValue([{}]);
      req.params = { id: '1' };
      await riskLevelsController.deleteRiskLevel(req, res);
      expect(res._json).toEqual({ message: 'Risk level deleted successfully' });
    });
  });
});

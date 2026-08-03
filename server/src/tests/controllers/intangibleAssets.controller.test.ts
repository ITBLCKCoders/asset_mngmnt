import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as intangibleAssetsController from '../../controllers/intangibleAssets.controller.js';
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
jest.mock('../../services/intangibleAssets.service.js', () => ({
  getAllIntangibleAssets: jest.fn(),
  getIntangibleAssetById: jest.fn(),
  createIntangibleAsset: jest.fn(),
  createIntangibleAssetsBulk: jest.fn(),
  updateIntangibleAsset: jest.fn(),
  assignIntangibleAsset: jest.fn(),
  unassignIntangibleAsset: jest.fn(),
  hasActiveAssignment: jest.fn(),
}));

const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js') as {
  getScopedActiveCompany: jest.Mock;
};
const intangibleAssetsService = jest.requireMock('../../services/intangibleAssets.service.js') as {
  getAllIntangibleAssets: jest.Mock;
  getIntangibleAssetById: jest.Mock;
  createIntangibleAsset: jest.Mock;
  createIntangibleAssetsBulk: jest.Mock;
  updateIntangibleAsset: jest.Mock;
  assignIntangibleAsset: jest.Mock;
  unassignIntangibleAsset: jest.Mock;
  hasActiveAssignment: jest.Mock;
};

describe('intangibleAssets.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getAllIntangibleAssets', () => {
    it('returns all intangible assets', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      intangibleAssetsService.getAllIntangibleAssets.mockResolvedValue([{ id: 'ia-1', name: 'Patent' }]);
      await intangibleAssetsController.getAllIntangibleAssets(req, res);
      expect(res._json).toEqual([{ id: 'ia-1', name: 'Patent' }]);
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await intangibleAssetsController.getAllIntangibleAssets(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      intangibleAssetsService.getAllIntangibleAssets.mockRejectedValue(new Error('DB error'));
      await intangibleAssetsController.getAllIntangibleAssets(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('createIntangibleAsset', () => {
    it('creates intangible asset successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Patent', type: 'IP', riskLevelId: 'rl-1', status: 'available' };
      intangibleAssetsService.createIntangibleAsset.mockResolvedValue('ia-1');
      await intangibleAssetsController.createIntangibleAsset(req, res);
      expect(res._status).toBe(201);
      expect(res._json).toEqual({ success: true, id: 'ia-1' });
      expect(intangibleAssetsService.createIntangibleAsset).toHaveBeenCalledWith(
        expect.objectContaining({ riskLevelId: 'rl-1', type: 'IP' })
      );
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await intangibleAssetsController.createIntangibleAsset(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateIntangibleAsset', () => {
    it('updates intangible asset successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-1' };
      req.body = { name: 'Updated Patent', type: 'IP', riskLevelId: 'rl-2', status: 'available' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue({ id: 'ia-1', name: 'Patent', status: 'available' });
      await intangibleAssetsController.updateIntangibleAsset(req, res);
      expect(res._json).toEqual({ success: true });
      expect(intangibleAssetsService.updateIntangibleAsset).toHaveBeenCalledWith(
        'ia-1',
        expect.objectContaining({ riskLevelId: 'rl-2', type: 'IP' })
      );
    });

    it('returns 404 when asset not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-999' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue(null);
      await intangibleAssetsController.updateIntangibleAsset(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when no id', async () => {
      req.body = { name: 'Test', type: 'IP', status: 'available' };
      await intangibleAssetsController.updateIntangibleAsset(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('assignIntangibleAsset', () => {
    it('assigns intangible asset successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-1' };
      req.body = { assignedTo: 'u-2', assignmentId: 'assign-1' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue({ id: 'ia-1', name: 'Patent', status: 'assigned' });
      intangibleAssetsService.hasActiveAssignment.mockResolvedValue(false);
      intangibleAssetsService.assignIntangibleAsset.mockResolvedValue({ assigned: true });
      await intangibleAssetsController.assignIntangibleAsset(req, res);
      expect(res._json).toEqual({ success: true });
    });

    it('returns 400 when already assigned to same user', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-1' };
      req.body = { assignedTo: 'u-2', assignmentId: 'assign-1' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue({ id: 'ia-1', name: 'Patent', status: 'assigned' });
      intangibleAssetsService.hasActiveAssignment.mockResolvedValue(true);
      await intangibleAssetsController.assignIntangibleAsset(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('unassignIntangibleAsset', () => {
    it('unassigns intangible asset successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-1' };
      req.body = { userId: 'u-2' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue({ id: 'ia-1', name: 'Patent' });
      await intangibleAssetsController.unassignIntangibleAsset(req, res);
      expect(res._json).toEqual({ success: true });
      expect(intangibleAssetsService.unassignIntangibleAsset).toHaveBeenCalledWith('ia-1', 'u-2', 'company-1');
    });

    it('returns 400 when userId missing', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-1' };
      await intangibleAssetsController.unassignIntangibleAsset(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when asset not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: 'ia-999' };
      req.body = { userId: 'u-2' };
      intangibleAssetsService.getIntangibleAssetById.mockResolvedValue(null);
      await intangibleAssetsController.unassignIntangibleAsset(req, res);
      expect(res._status).toBe(404);
    });
  });
});

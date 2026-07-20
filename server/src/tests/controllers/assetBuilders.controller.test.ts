import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetBuildersController from '../../controllers/assetBuilders.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), getDepartmentIdsForScope: jest.fn() }));
jest.mock('../../utils/companyTransferVisibility.js', () => ({ getTransferredOutBuildersForCompany: jest.fn(), setAssetBuilderOriginatingCompany: jest.fn() }));
jest.mock('../../repositories/accountabilityForm.repository.js', () => ({ findFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ getReturnFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({ getTransferFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetBorrowRequests.repository.js', () => ({ getBorrowFormsByAssetId: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const { getAssetScope, getDepartmentIdsForScope } = jest.requireMock('../../utils/assetScope.js');
const { getTransferredOutBuildersForCompany, setAssetBuilderOriginatingCompany } = jest.requireMock('../../utils/companyTransferVisibility.js');
const accountabilityRepo = jest.requireMock('../../repositories/accountabilityForm.repository.js');
const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
const borrowRepo = jest.requireMock('../../repositories/assetBorrowRequests.repository.js');

const mockBuilder = { builderID: '1', name: 'Test Builder', company_id: 10, created_at: '2024-01-01', created_by: '5' };
const defaultScope = { companyId: 10, departmentIds: null, isSuperAdmin: false };

describe('assetBuilders.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: '5' } };
    res = createMockRes();
  });

  describe('createAssetBuilderHandler', () => {
    it('creates builder successfully', async () => {
      req.body = { name: 'My Builder', assetIds: ['A001', 'A002'] };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT assetID')) return [[{ assetID: 1, asset_code: 'A001', name: 'Asset 1', status: 'Available' }, { assetID: 2, asset_code: 'A002', name: 'Asset 2', status: 'Available' }], []];
        if (sql.includes('SELECT company_id FROM users')) return [[{ company_id: 10 }], []];
        if (sql.includes('CALL sp_create_asset_builder')) return [[[mockBuilder]], []];
        if (sql.includes('INSERT INTO asset_builder_items')) return [{ affectedRows: 2 }, []];
        return [[], []];
      });
      await assetBuildersController.createAssetBuilderHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.builder.name).toBe('Test Builder');
    });

    it('returns 400 when name or assetIds missing', async () => {
      req.body = { name: 'My Builder' };
      await assetBuildersController.createAssetBuilderHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when assets not found', async () => {
      req.body = { name: 'My Builder', assetIds: ['A001', 'A002'] };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT assetID')) return [[{ assetID: 1, asset_code: 'A001', name: 'Asset 1', status: 'Available' }], []];
        if (sql.includes('SELECT company_id')) return [[[{ company_id: 10 }], []]];
        return [[], []];
      });
      await assetBuildersController.createAssetBuilderHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAssetBuildersHandler', () => {
    it('returns builders list', async () => {
      getAssetScope.mockResolvedValue(defaultScope);
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('CALL sp_get_asset_builders')) return [[[mockBuilder]], []];
        if (sql.includes('CALL sp_get_asset_builder_items')) return [[[{
          itemID: 10, asset_id: 1, asset_code: 'A001', asset_name: 'Asset 1',
          category_name: 'Electronics', type_name: 'Laptop', is_parent: 1,
        }]], []];
        return [[], []];
      });
      getTransferredOutBuildersForCompany.mockResolvedValue([]);
      await assetBuildersController.getAssetBuildersHandler(req, res);
      expect(res._json.builders).toHaveLength(1);
    });

    it('returns empty array when no company scope', async () => {
      getAssetScope.mockResolvedValue({ companyId: null, departmentIds: null, isSuperAdmin: false });
      await assetBuildersController.getAssetBuildersHandler(req, res);
      expect(res._json).toEqual({ builders: [] });
    });

    it('handles scope override for global admin', async () => {
      req.query.scope = 'it';
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: true });
      getDepartmentIdsForScope.mockResolvedValue([1, 2, 3]);
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('CALL sp_get_asset_builders')) return [[[mockBuilder]], []];
        if (sql.includes('CALL sp_get_asset_builder_items')) return [[[{
          itemID: 10, asset_id: 1, asset_code: 'A001', asset_name: 'Asset 1',
          category_name: 'Electronics', type_name: 'Laptop', is_parent: 1,
        }]], []];
        if (sql.includes('SELECT a.assetID, ac.department_id')) return [[[{ assetID: 1, department_id: 1 }]], []];
        return [[], []];
      });
      getTransferredOutBuildersForCompany.mockResolvedValue([]);
      await assetBuildersController.getAssetBuildersHandler(req, res);
      expect(getDepartmentIdsForScope).toHaveBeenCalledWith(pool, 'it', 10);
    });
  });

  describe('updateAssetBuilderHandler', () => {
    it('updates builder successfully', async () => {
      req.params = { builderId: '1' };
      req.body = { name: 'Updated Builder' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT ab.*, u.company_id')) return [[{ builderID: '1', name: 'Old Name', company_id: 10 }], []];
        if (sql.includes('SELECT company_id FROM users')) return [[{ company_id: 10 }], []];
        if (sql.includes('SELECT abi.asset_id')) return [[[]], []];
        if (sql.includes('CALL sp_update_asset_builder')) return [[[{ success: true }]], []];
        return [[], []];
      });
      await assetBuildersController.updateAssetBuilderHandler(req, res);
      expect(res._json.message).toContain('updated');
    });

    it('returns 404 when builder not found', async () => {
      req.params = { builderId: '999' };
      req.body = { name: 'Updated Builder' };
      pool.execute.mockResolvedValue([[], []]);
      await assetBuildersController.updateAssetBuilderHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when company mismatch', async () => {
      req.params = { builderId: '1' };
      req.body = { name: 'Updated Builder' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT ab.*, u.company_id')) return [[{ builderID: '1', name: 'Old Name', company_id: 10 }], []];
        if (sql.includes('SELECT company_id FROM users')) return [[{ company_id: 99 }], []];
        return [[], []];
      });
      await assetBuildersController.updateAssetBuilderHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('getAssetBuilderFormsHandler', () => {
    it('returns forms for builder', async () => {
      req.params = { builderId: '1' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT ab.*')) return [[{ builderID: '1', company_id: 10 }], []];
        if (sql.includes('SELECT company_id FROM users')) return [[{ company_id: 10 }], []];
        if (sql.includes('SELECT abi.asset_id')) return [[[{ asset_id: 1, asset_code: 'A001' }]], []];
        return [[], []];
      });
      accountabilityRepo.findFormsByAssetId.mockResolvedValue([]);
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([]);
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([]);
      borrowRepo.getBorrowFormsByAssetId.mockResolvedValue([]);
      await assetBuildersController.getAssetBuilderFormsHandler(req, res);
      expect(res._json.accountabilityForms).toEqual([]);
    });

    it('returns 400 when builderId missing', async () => {
      await assetBuildersController.getAssetBuilderFormsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when builder not found', async () => {
      req.params = { builderId: '999' };
      pool.execute.mockResolvedValue([[], []]);
      await assetBuildersController.getAssetBuilderFormsHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('deleteAssetBuilderHandler', () => {
    it('deletes builder successfully', async () => {
      req.params = { builderId: '1' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT ab.*')) return [[{ builderID: '1', name: 'My Builder', company_id: 10 }], []];
        if (sql.includes('SELECT company_id FROM users')) return [[{ company_id: 10 }], []];
        if (sql.includes('SELECT abi.asset_id')) return [[[]], []];
        if (sql.includes('CALL sp_delete_asset_builder')) return [[[{ success: true }]], []];
        return [[], []];
      });
      await assetBuildersController.deleteAssetBuilderHandler(req, res);
      expect(res._json.message).toContain('deleted');
    });

    it('returns 404 when builder not found', async () => {
      req.params = { builderId: '999' };
      pool.execute.mockResolvedValue([[], []]);
      await assetBuildersController.deleteAssetBuilderHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

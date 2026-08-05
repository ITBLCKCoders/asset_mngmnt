import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetsController from '../../controllers/assets.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/cloudinary.js', () => ({ uploadToCloudinary: jest.fn(), uploadDocumentToCloudinary: jest.fn() }));
jest.mock('../../utils/assetAuditDiff.js', () => ({ buildAssetUpdateAuditDiff: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), classifyDepartmentScopeByName: jest.fn(), getDepartmentIdsForScope: jest.fn() }));
jest.mock('../../utils/companyTransferVisibility.js', () => ({ getTransferredOutAssetsForCompany: jest.fn(), setAssetOriginatingCompany: jest.fn() }));
jest.mock('../../repositories/asset.repository.js', () => ({
  getActiveAssignmentAssetIdsForUser: jest.fn(),
  callGetAllAssets: jest.fn(),
  getAssetDocumentsForIds: jest.fn(),
  getCurrentAssignmentsForAssetIds: jest.fn(),
  getAssignmentHistoryForAssetIds: jest.fn(),
  getBuilderByBuilderId: jest.fn(),
  getBuilderChildrenByBuilderId: jest.fn(),
  getAccountabilityFormsForAsset: jest.fn(),
  getAssetDocumentsByAssetId: jest.fn(),
  getCurrentAssignmentForAssetId: jest.fn(),
  getAssignmentHistoryForAssetId: jest.fn(),
  getBuilderHistoryForAsset: jest.fn(),
  getBuilderByAssetId: jest.fn(),
  getAccountabilityFormsForAssetWithLike: jest.fn(),
  getAssetByCodeForAssign: jest.fn(),
  getAssetForUpdateByCode: jest.fn(),
  getDepartmentById: jest.fn(),
  getLocationById: jest.fn(),
  getUserBasicByIdSimple: jest.fn(),
  getAssetForUpdateById: jest.fn(),
  executeRawWrite: jest.fn(),
  getAssetById: jest.fn(),
  getAssetsBySearch: jest.fn(),
  upsertAssetToDepartmentAccess: jest.fn(),
}));

jest.mock('../../repositories/accountabilityForm.repository.js', () => ({ findFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ getReturnFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({ getTransferFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetBorrowRequests.repository.js', () => ({ getBorrowFormsByAssetId: jest.fn() }));

const assetRepo = jest.requireMock('../../repositories/asset.repository.js');
const { createAuditLog } = jest.requireMock('../../utils/audit.js');
const { pool } = jest.requireMock('../../db.js');
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js');
const logger = jest.requireMock('../../logger.js').default;

const mockAsset = {
  assetID: 'a1', asset_code: 'AST-001', name: 'Laptop', description: 'A laptop',
  category_name: 'IT', type_name: 'Computer', brand: 'Dell', model: 'XPS',
  serial: 'SN001', condition: 'Good', status: 'Available', is_old_unit: 0,
  warranty_months: 24, maintenance_schedule: null,
  company_name: 'Acme', company_logo_url: null,
  building: 'Bldg A', location_name: 'Main Office', room_name: '201',
  image_url: null, category_id: 'c1', type_id: 't1',
};

describe('assets.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn().mockReturnValue('test-agent'), user: { userID: 'u1' } };
    res = createMockRes();
  });

  describe('getMyAssetsHandler', () => {
    it('returns assets assigned to the current user', async () => {
      assetRepo.getActiveAssignmentAssetIdsForUser.mockResolvedValue(['a1']);
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      assetRepo.getAssetDocumentsForIds.mockResolvedValue([]);
      assetRepo.getCurrentAssignmentsForAssetIds.mockResolvedValue([]);
      assetRepo.getAssignmentHistoryForAssetIds.mockResolvedValue([]);
      assetRepo.getBuilderByBuilderId.mockRejectedValue(new Error('not found'));
      assetRepo.getAccountabilityFormsForAsset.mockRejectedValue(new Error('not found'));
      await assetsController.getMyAssetsHandler(req, res);
      expect(res._json.assets).toHaveLength(1);
      expect(res._json.assets[0].asset_code).toBe('AST-001');
    });

    it('returns empty array when no assignments', async () => {
      assetRepo.getActiveAssignmentAssetIdsForUser.mockResolvedValue([]);
      await assetsController.getMyAssetsHandler(req, res);
      expect(res._json.assets).toEqual([]);
    });

    it('returns empty array when no matching assets', async () => {
      assetRepo.getActiveAssignmentAssetIdsForUser.mockResolvedValue(['a1']);
      assetRepo.callGetAllAssets.mockResolvedValue([]);
      await assetsController.getMyAssetsHandler(req, res);
      expect(res._json.assets).toEqual([]);
    });
  });

  describe('getAssetPublicHandler', () => {
    it('returns public asset data by code', async () => {
      req.params = { assetCode: 'AST-001' };
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      assetRepo.getCurrentAssignmentForAssetId.mockResolvedValue(null);
      await assetsController.getAssetPublicHandler(req, res);
      expect(res._json.assets).toHaveLength(1);
      expect(res._json.assets[0].asset_code).toBe('AST-001');
      expect(res._json.assets[0].currentlyAssigned).toBe(false);
    });

    it('returns currentlyAssigned true when assignment exists', async () => {
      req.params = { assetCode: 'AST-001' };
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      assetRepo.getCurrentAssignmentForAssetId.mockResolvedValue({ assignmentID: 'a1' });
      await assetsController.getAssetPublicHandler(req, res);
      expect(res._json.assets[0].currentlyAssigned).toBe(true);
    });

    it('returns 400 when assetCode missing', async () => {
      await assetsController.getAssetPublicHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when asset not found', async () => {
      req.params = { assetCode: 'NOT-FOUND' };
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      await assetsController.getAssetPublicHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getAssetByCodeHandler', () => {
    it('returns asset with enrichment', async () => {
      req.params = { assetCode: 'AST-001' };
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      assetRepo.getAssetDocumentsByAssetId.mockResolvedValue([]);
      assetRepo.getCurrentAssignmentForAssetId.mockResolvedValue(null);
      assetRepo.getAssignmentHistoryForAssetId.mockResolvedValue([]);
      assetRepo.getBuilderHistoryForAsset.mockRejectedValue(new Error('not found'));
      assetRepo.getBuilderByAssetId.mockRejectedValue(new Error('not found'));
      assetRepo.getAccountabilityFormsForAssetWithLike.mockRejectedValue(new Error('not found'));
      await assetsController.getAssetByCodeHandler(req, res);
      expect(res._json.assets).toHaveLength(1);
      expect(res._json.assets[0].specifications).toEqual([]);
    });

    it('returns 400 when assetCode missing', async () => {
      await assetsController.getAssetByCodeHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when asset not found', async () => {
      req.params = { assetCode: 'NOT-FOUND' };
      assetRepo.callGetAllAssets.mockResolvedValue([mockAsset]);
      await assetsController.getAssetByCodeHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('assignAssetHandler', () => {
    it('updates asset assignment with department and location', async () => {
      req.params = { assetId: 'a1' };
      req.body = { departmentId: 'd1', locationId: 'l1', assignedTo: 'u2' };
      assetRepo.getAssetByCodeForAssign.mockResolvedValue({ assetID: 'a1' });
      assetRepo.getDepartmentById.mockResolvedValue({ departmentID: 'd1' });
      assetRepo.getLocationById.mockResolvedValue({ locationID: 'l1' });
      assetRepo.getUserBasicByIdSimple.mockResolvedValue({ userID: 'u2' });
      assetRepo.getAssetForUpdateById.mockResolvedValue({ department_id: 'old_d', location_id: 'old_l' });
      assetRepo.executeRawWrite.mockResolvedValue(undefined);
      await assetsController.assignAssetHandler(req, res);
      expect(res._json.message).toContain('assigned');
    });

    it('returns 400 when assetId missing', async () => {
      await assetsController.assignAssetHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when asset not found', async () => {
      req.params = { assetId: 'a1' };
      assetRepo.getAssetByCodeForAssign.mockResolvedValue(null);
      await assetsController.assignAssetHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when department invalid', async () => {
      req.params = { assetId: 'a1' };
      req.body = { departmentId: 'invalid' };
      assetRepo.getAssetByCodeForAssign.mockResolvedValue({ assetID: 'a1' });
      assetRepo.getDepartmentById.mockResolvedValue(null);
      await assetsController.assignAssetHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when location invalid', async () => {
      req.params = { assetId: 'a1' };
      req.body = { departmentId: 'd1', locationId: 'invalid' };
      assetRepo.getAssetByCodeForAssign.mockResolvedValue({ assetID: 'a1' });
      assetRepo.getDepartmentById.mockResolvedValue({ departmentID: 'd1' });
      assetRepo.getLocationById.mockResolvedValue(null);
      await assetsController.assignAssetHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAllFormsByAssetIdHandler', () => {
    const mockAccForm = {
      formID: 'f1', form_number: 'AF-001', status: 'Pending',
      created_at: '2024-01-01', signed_at: null, assets_data: null,
      user_id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com',
      user_department_id: 'd1', user_department_name: 'Engineering',
      location_id: 'l1', location_name: 'Main Office',
      received_copy_wet_pdf_url: null,
    };

    it('returns all forms for an asset', async () => {
      req.params = { assetId: 'a1' };
      const accFormRepo = jest.requireMock('../../repositories/accountabilityForm.repository.js');
      accFormRepo.findFormsByAssetId.mockResolvedValue([mockAccForm]);
      const retRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
      retRepo.getReturnFormsByAssetId.mockResolvedValue([]);
      const trfRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
      trfRepo.getTransferFormsByAssetId.mockResolvedValue([]);
      const brwRepo = jest.requireMock('../../repositories/assetBorrowRequests.repository.js');
      brwRepo.getBorrowFormsByAssetId.mockResolvedValue([]);
      await assetsController.getAllFormsByAssetIdHandler(req, res);
      expect(res._json.accountabilityForms).toHaveLength(1);
      expect(res._json.returnForms).toEqual([]);
      expect(res._json.transferForms).toEqual([]);
      expect(res._json.borrowForms).toEqual([]);
    });

    it('returns 400 when assetId missing', async () => {
      await assetsController.getAllFormsByAssetIdHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});

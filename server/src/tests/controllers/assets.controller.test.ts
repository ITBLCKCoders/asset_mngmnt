import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EventEmitter } from 'events';
import * as assetsController from '../../controllers/assets.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/cloudinary.js', () => ({ uploadToCloudinary: jest.fn(), uploadDocumentToCloudinary: jest.fn() }));
jest.mock('../../utils/assetAuditDiff.js', () => ({
  buildAssetUpdateAuditDiff: jest.fn(),
  mergeAssignmentIntoDiff: jest.fn(),
}));
jest.mock('busboy', () => ({ __esModule: true, default: jest.fn() }));
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
  getCompanyIdByIdOrName: jest.fn(),
  getLocationIdById: jest.fn(),
  getRoomIdByIdOrName: jest.fn(),
  getDepartmentIdByIdOrName: jest.fn(),
  getCategoryIdsByDepartmentIds: jest.fn(),
  resolveAssetIdByCodeOrId: jest.fn(),
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

    it('filters by IT/Admin scope when scope param is provided', async () => {
      req.query = { scope: 'admin' };
      const { getDepartmentIdsForScope } = jest.requireMock('../../utils/assetScope.js');
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      getDepartmentIdsForScope.mockResolvedValue(['d1']);
      assetRepo.getCategoryIdsByDepartmentIds.mockResolvedValue(['c1']);
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

    it('excludes assets whose category is outside the requested scope', async () => {
      req.query = { scope: 'admin' };
      const { getDepartmentIdsForScope } = jest.requireMock('../../utils/assetScope.js');
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      getDepartmentIdsForScope.mockResolvedValue(['d1']);
      assetRepo.getCategoryIdsByDepartmentIds.mockResolvedValue(['c1']);
      assetRepo.getActiveAssignmentAssetIdsForUser.mockResolvedValue(['a1', 'a2']);
      assetRepo.callGetAllAssets.mockResolvedValue([
        mockAsset,
        { ...mockAsset, assetID: 'a2', asset_code: 'AST-002', category_id: 'c2' },
      ]);
      assetRepo.getAssetDocumentsForIds.mockResolvedValue([]);
      assetRepo.getCurrentAssignmentsForAssetIds.mockResolvedValue([]);
      assetRepo.getAssignmentHistoryForAssetIds.mockResolvedValue([]);
      assetRepo.getBuilderByBuilderId.mockRejectedValue(new Error('not found'));
      assetRepo.getAccountabilityFormsForAsset.mockRejectedValue(new Error('not found'));
      await assetsController.getMyAssetsHandler(req, res);
      expect(res._json.assets).toHaveLength(1);
      expect(res._json.assets[0].asset_code).toBe('AST-001');
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
      assetRepo.resolveAssetIdByCodeOrId.mockResolvedValue('a1');
      const accFormRepo = jest.requireMock('../../repositories/accountabilityForm.repository.js');
      accFormRepo.findFormsByAssetId.mockResolvedValue([mockAccForm]);
      const retRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
      retRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf1', formNumber: 'RF-001', status: 'Processed' },
      ]);
      const trfRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
      trfRepo.getTransferFormsByAssetId.mockResolvedValue([
        { id: 'tf1', formNumber: 'TF-001', status: 'Completed' },
      ]);
      const brwRepo = jest.requireMock('../../repositories/assetBorrowRequests.repository.js');
      brwRepo.getBorrowFormsByAssetId.mockResolvedValue([]);
      await assetsController.getAllFormsByAssetIdHandler(req, res);
      expect(res._json.accountabilityForms).toHaveLength(1);
      expect(res._json.returnForms).toEqual([
        { id: 'rf1', formNumber: 'RF-001', status: 'Processed' },
      ]);
      expect(res._json.transferForms).toEqual([
        { id: 'tf1', formNumber: 'TF-001', status: 'Completed' },
      ]);
      expect(res._json.borrowForms).toEqual([]);
    });

    it('returns 400 when assetId missing', async () => {
      await assetsController.getAllFormsByAssetIdHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateAssetHandler audit logging', () => {
    const mockBusboy = jest.requireMock('busboy').default;
    const { buildAssetUpdateAuditDiff, mergeAssignmentIntoDiff } =
      jest.requireMock('../../utils/assetAuditDiff.js');

    const oldRow = {
      assetID: 'a1',
      asset_code: 'AST-001',
      name: 'Laptop',
      description: null,
      category_id: 'c1',
      type_id: 't1',
      supplier: null,
      brand: null,
      model: null,
      serial: null,
      image_url: null,
      purchase_date: null,
      asset_value: null,
      salvage_value: 0,
      depreciation_method: null,
      useful_life_years: null,
      annual_depreciation: null,
      depreciation_start_date: null,
      company_id: 'co1',
      location_id: 'lo1',
      location_room_id: 'r1',
      department_id: 'd1',
      location_notes: null,
      warranty_months: null,
      condition: 'Good',
      maintenance_schedule: 'None',
      status: 'Available',
      is_old_unit: 0,
    };

    function makeReq(): { req: any; busboy: EventEmitter } {
      const busboy = new EventEmitter();
      mockBusboy.mockReturnValue(busboy);
      const req: any = {
        params: { assetId: 'AST-001' },
        headers: { 'content-type': 'multipart/form-data; boundary=test' },
        pipe: jest.fn(),
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
        user: { userID: 'u1' },
      };
      return { req, busboy };
    }

    function emitFields(
      busboy: EventEmitter,
      fields: Record<string, string>
    ): void {
      for (const [k, v] of Object.entries(fields)) {
        busboy.emit('field', k, v);
      }
      busboy.emit('finish');
    }

    function setupCommon(): void {
      assetRepo.getAssetForUpdateByCode.mockResolvedValue(oldRow);
      assetRepo.getCompanyIdByIdOrName.mockResolvedValue(null);
      assetRepo.getLocationIdById.mockResolvedValue(null);
      assetRepo.getRoomIdByIdOrName.mockResolvedValue(null);
      assetRepo.getDepartmentIdByIdOrName.mockResolvedValue(null);
      const conn = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn().mockResolvedValue([[[oldRow]], []]),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };
      pool.getConnection.mockResolvedValue(conn);
    }

    it('logs assigned_to old → new when only the assignment changes', async () => {
      const { req, busboy } = makeReq();
      setupCommon();
      assetRepo.getCurrentAssignmentForAssetId.mockResolvedValue({
        assigned_user_name: 'Jane Doe',
      });
      assetRepo.getUserBasicByIdSimple.mockResolvedValue({
        first_name: 'John',
        last_name: 'Smith',
      });
      buildAssetUpdateAuditDiff.mockReturnValue({
        oldValues: {},
        newValues: {},
        changeCount: 0,
      });
      mergeAssignmentIntoDiff.mockReturnValue({
        oldValues: { assigned_to: 'Jane Doe' },
        newValues: { assigned_to: 'John Smith' },
        changeCount: 1,
      });

      const pending = assetsController.updateAssetHandler(req, res);
      emitFields(busboy, {
        name: 'Laptop',
        categoryId: 'c1',
        typeId: 't1',
        condition: 'Good',
        status: 'Available',
        isOldUnit: '0',
        maintenanceSchedule: 'None',
        salvageValue: '0',
        assignedUser: 'u2',
      });
      await pending;

      expect(mergeAssignmentIntoDiff).toHaveBeenCalledWith(
        expect.objectContaining({ changeCount: 0 }),
        'Jane Doe',
        'John Smith'
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Updated Asset',
          details: 'Updated 1 field(s)',
          oldValues: { assigned_to: 'Jane Doe' },
          newValues: { assigned_to: 'John Smith' },
        })
      );
    });

    it('skips the audit entry when there are no field changes', async () => {
      const { req, busboy } = makeReq();
      setupCommon();
      assetRepo.getCurrentAssignmentForAssetId.mockResolvedValue(null);
      buildAssetUpdateAuditDiff.mockReturnValue({
        oldValues: {},
        newValues: {},
        changeCount: 0,
      });

      const pending = assetsController.updateAssetHandler(req, res);
      emitFields(busboy, {
        name: 'Laptop',
        categoryId: 'c1',
        typeId: 't1',
        condition: 'Good',
        status: 'Available',
        isOldUnit: '0',
        maintenanceSchedule: 'None',
        salvageValue: '0',
      });
      await pending;

      expect(mergeAssignmentIntoDiff).not.toHaveBeenCalled();
      expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('scopes room and department lookups to the resolved company', async () => {
      const { req, busboy } = makeReq();
      setupCommon();
      assetRepo.getCompanyIdByIdOrName.mockResolvedValue('company-uuid');
      assetRepo.getRoomIdByIdOrName.mockResolvedValue('room-uuid');
      assetRepo.getDepartmentIdByIdOrName.mockResolvedValue('dept-uuid');
      buildAssetUpdateAuditDiff.mockReturnValue({
        oldValues: {},
        newValues: {},
        changeCount: 0,
      });

      const pending = assetsController.updateAssetHandler(req, res);
      emitFields(busboy, {
        name: 'Laptop',
        categoryId: 'c1',
        typeId: 't1',
        condition: 'Good',
        status: 'Available',
        isOldUnit: '0',
        maintenanceSchedule: 'None',
        salvageValue: '0',
        companyId: 'company-uuid',
        locationRoomId: 'room-uuid',
        departmentId: 'dept-uuid',
      });
      await pending;

      // Room/department lookups run after company resolves and are company-scoped
      expect(assetRepo.getRoomIdByIdOrName).toHaveBeenCalledWith('room-uuid', 'company-uuid');
      expect(assetRepo.getDepartmentIdByIdOrName).toHaveBeenCalledWith('dept-uuid', 'company-uuid');
    });
  });
});

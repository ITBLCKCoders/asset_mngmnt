import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetAssignmentsController from '../../controllers/assetAssignments.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/accountabilityFormOnReturn.js', () => ({ handleAccountabilityFormOnAssetReturn: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), classifyDepartmentScopeByName: jest.fn(), getDepartmentIdsForScope: jest.fn() }));
jest.mock('../../sockets/socketHandlers.js', () => ({ emitNotification: jest.fn() }));
jest.mock('../../utils/socketManager.js', () => ({ getIoInstance: jest.fn() }));
jest.mock('../../services/notification.service.js', () => ({ NotificationService: { createNotification: jest.fn() } }));
jest.mock('../../repositories/assetAssignment.repository.js', () => ({
  getUserBasic: jest.fn(),
  getCompanyIdByDepartment: jest.fn(),
  hasAccountabilityFormSettings: jest.fn(),
  departmentExists: jest.fn(),
  locationExists: jest.fn(),
  resolveRoomIdByIdOrName: jest.fn(),
  getAssetByCode: jest.fn(),
  getActiveAssignmentsByAssetId: jest.fn(),
  setAssignmentInactive: jest.fn(),
  callCreateAssignment: jest.fn(),
  getBuildersForAsset: jest.fn(),
  setBuilderStatus: jest.fn(),
  getBuilderAssetCodes: jest.fn(),
  getDepartmentName: jest.fn(),
  getLocationName: jest.fn(),
  getRoomName: jest.fn(),
  getUserFullName: jest.fn(),
  getAssetDetailsForForm: jest.fn(),
  getCategoryDeptForAssetCodes: jest.fn(),
  getActiveAssignmentsByUserAndCategories: jest.fn(),
  getExistingAccountabilityForms: jest.fn(),
  getActiveAssignmentsByUserAndAssetIds: jest.fn(),
  disableAccountabilityForm: jest.fn(),
  listAssignmentsRaw: jest.fn(),
  callGetAssignments: jest.fn(),
  getIntangibleAssignments: jest.fn(),
  getAssignmentById: jest.fn(),
  callReturnAssignment: jest.fn(),
  countAssignedAssetsInBuilder: jest.fn(),
  getAssetCodeById: jest.fn(),
  removeAssetFromAllBuilders: jest.fn(),
}));
jest.mock('../../repositories/assetChecklist.repository.js', () => ({ createAssetChecklist: jest.fn(), getChecklistByAssignmentId: jest.fn() }));
jest.mock('../../repositories/assetChecklistList.repository.js', () => ({ getAssetChecklists: jest.fn() }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ getCategoryDepartmentForAssetIds: jest.fn() }));
jest.mock('../../utils/checklistFormNumber.js', () => ({ generateChecklistFormNumber: jest.fn(), generateChecklistFormNumberFallback: jest.fn() }));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({ createAccountabilityFormHandler: jest.fn() }));
jest.mock('../../services/assetAssignment.service.js', () => ({ buildAccountabilityFormMap: jest.fn(), loadUserModulePermissions: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const repo = jest.requireMock('../../repositories/assetAssignment.repository.js');
const checklistRepo = jest.requireMock('../../repositories/assetChecklist.repository.js');
const checklistListRepo = jest.requireMock('../../repositories/assetChecklistList.repository.js');
const { getAssetScope, getDepartmentIdsForScope } = jest.requireMock('../../utils/assetScope.js');
const { NotificationService } = jest.requireMock('../../services/notification.service.js');
const { getIoInstance } = jest.requireMock('../../utils/socketManager.js');
const { emitNotification } = jest.requireMock('../../sockets/socketHandlers.js');
const { handleAccountabilityFormOnAssetReturn } = jest.requireMock('../../utils/accountabilityFormOnReturn.js');
const { createAccountabilityFormHandler } = jest.requireMock('../../controllers/accountabilityForms.controller.js');
const { buildAccountabilityFormMap, loadUserModulePermissions } = jest.requireMock('../../services/assetAssignment.service.js');
const { generateChecklistFormNumber, generateChecklistFormNumberFallback } = jest.requireMock('../../utils/checklistFormNumber.js');
const { getCategoryDepartmentForAssetIds } = jest.requireMock('../../repositories/assetReturn.repository.js');

const defaultScope = { companyId: 10, departmentIds: null, isSuperAdmin: false };

describe('assetAssignments.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: '5' } };
    res = createMockRes();
  });

  describe('createAssetAssignmentHandler', () => {
    beforeEach(() => {
      req.body = {
        assetId: 'AST-001',
        userId: 'u1',
        departmentId: 'd1',
        locationId: 'l1',
      };
      repo.getUserBasic.mockResolvedValue({ company_id: 'c1', first_name: 'John', last_name: 'Doe' });
      repo.hasAccountabilityFormSettings.mockResolvedValue(true);
      repo.departmentExists.mockResolvedValue(true);
      repo.locationExists.mockResolvedValue(true);
      repo.getAssetByCode.mockResolvedValue({ assetID: 'a1' });
      repo.getActiveAssignmentsByAssetId.mockResolvedValue([]);
      repo.callCreateAssignment.mockResolvedValue({});
      repo.getBuildersForAsset.mockResolvedValue([]);
      repo.getDepartmentName.mockResolvedValue('IT');
      repo.getLocationName.mockResolvedValue('HQ');
      repo.getRoomName.mockResolvedValue('Room 1');
      repo.getUserFullName.mockResolvedValue('Assigner Name');
      repo.getAssetDetailsForForm.mockResolvedValue({ name: 'Laptop', category_name: 'IT Cat', type_name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1' });
      repo.getCategoryDeptForAssetCodes.mockResolvedValue([
        { categoryID: 'cat1', category_name: 'IT Cat', department_name: 'IT' },
      ]);
      repo.getActiveAssignmentsByUserAndCategories.mockResolvedValue([
        { assetID: 'a1', asset_code: 'AST-001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'IT Cat', type_name: 'Laptop', department_name: 'IT', department_id: 'd1' },
      ]);
      repo.getExistingAccountabilityForms.mockResolvedValue([]);
      getIoInstance.mockReturnValue({});
    });

    it('creates a "ready for you to sign" accountability notification per created form', async () => {
      createAccountabilityFormHandler.mockResolvedValue({
        form: { formID: 'f1', form_number: 'AF-001' },
      });

      await assetAssignmentsController.createAssetAssignmentHandler(req, res);

      expect(createAccountabilityFormHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ skipNotification: true }),
        }),
        expect.anything()
      );

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'New asset accountability is ready for you to sign',
          message: expect.stringContaining('AF-001'),
          type: 'accountability_form',
        }),
        '5',
        '127.0.0.1',
        undefined
      );

      expect(emitNotification).toHaveBeenCalledWith(
        {},
        'u1',
        'notification',
        expect.objectContaining({
          title: 'New asset accountability is ready for you to sign',
          route: '/profile?tab=documents&docTab=accountability',
          actionTarget: 'profile_documents_accountability',
          formId: 'f1',
          formNumber: 'AF-001',
        })
      );
    });

    it('skips the accountability notification when no form is created', async () => {
      createAccountabilityFormHandler.mockResolvedValue({
        form: { formID: '0', form_number: '' },
      });
      NotificationService.createNotification.mockClear();

      await assetAssignmentsController.createAssetAssignmentHandler(req, res);

      expect(
        NotificationService.createNotification
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New asset accountability is ready for you to sign',
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('getMyAssignmentsHandler', () => {
    it('returns assignments for current user', async () => {
      getAssetScope.mockResolvedValue(defaultScope);
      repo.listAssignmentsRaw.mockResolvedValue([{ assignmentID: '1', asset_id: '10', asset_code: 'A001', asset_name: 'Asset 1', status: 'Active' }]);
      await assetAssignmentsController.getMyAssignmentsHandler(req, res);
      expect(res._json.assignments).toHaveLength(1);
    });

    it('returns empty when no company scope', async () => {
      getAssetScope.mockResolvedValue({ companyId: null, departmentIds: null, isSuperAdmin: false });
      await assetAssignmentsController.getMyAssignmentsHandler(req, res);
      expect(res._json).toEqual({ assignments: [] });
    });
  });

  describe('getAssetAssignmentsHandler', () => {
    it('returns assignments with form map', async () => {
      req.query = { status: 'Active' };
      repo.callGetAssignments.mockResolvedValue([{ assignmentID: '1', asset_id: '10', asset_code: 'A001', asset_name: 'Asset 1', status: 'Active' }]);
      repo.getIntangibleAssignments.mockResolvedValue([]);
      buildAccountabilityFormMap.mockResolvedValue(new Map());
      await assetAssignmentsController.getAssetAssignmentsHandler(req, res);
      expect(res._json.assignments).toHaveLength(1);
    });
  });

  describe('getFilteredAssetAssignmentsHandler', () => {
    it('returns assignments with filter', async () => {
      req.query = { status: 'Active' };
      loadUserModulePermissions.mockResolvedValue({ 'Asset Return': { create: true, edit: true } });
      getAssetScope.mockResolvedValue(defaultScope);
      repo.listAssignmentsRaw.mockResolvedValue([{ assignmentID: '1', asset_id: '10', asset_code: 'A001', asset_name: 'Asset 1', status: 'Active' }]);
      await assetAssignmentsController.getFilteredAssetAssignmentsHandler(req, res);
      expect(res._json.assignments).toHaveLength(1);
    });

    it('returns empty when no permission', async () => {
      loadUserModulePermissions.mockResolvedValue({});
      await assetAssignmentsController.getFilteredAssetAssignmentsHandler(req, res);
      expect(res._json).toEqual({ assignments: [] });
    });
  });

  describe('createAssetChecklistHandler', () => {
    it('creates checklist successfully', async () => {
      req.body = { assignmentId: 'a1', employeeId: 'e1', employeeName: 'John', checklistData: [{ item: 'Laptop', condition: 'Good' }] };
      repo.getAssignmentById.mockResolvedValue({ assignmentID: 'a1', asset_id: '10' });
      generateChecklistFormNumberFallback.mockResolvedValue('CHK-001');
      getCategoryDepartmentForAssetIds.mockResolvedValue(20);
      repo.getCompanyIdByDepartment.mockResolvedValue(100);
      generateChecklistFormNumber.mockResolvedValue('CHK-100-001');
      await assetAssignmentsController.createAssetChecklistHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formNumber).toBe('CHK-100-001');
    });

    it('returns 400 when required fields missing', async () => {
      req.body = { assignmentId: 'a1' };
      await assetAssignmentsController.createAssetChecklistHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when assignment not found', async () => {
      req.body = { assignmentId: 'a1', employeeId: 'e1', employeeName: 'John', checklistData: [] };
      repo.getAssignmentById.mockResolvedValue(null);
      await assetAssignmentsController.createAssetChecklistHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getChecklistByAssignmentIdHandler', () => {
    it('returns checklist', async () => {
      req.params = { assignmentId: 'a1' };
      checklistRepo.getChecklistByAssignmentId.mockResolvedValue({ id: 'c1', formNumber: 'CHK-001' });
      repo.getAssignmentById.mockResolvedValue({ assignmentID: 'a1', asset_id: '10' });
      repo.getAssetDetailsForForm.mockResolvedValue({ asset_code: 'A001', name: 'Asset 1' });
      await assetAssignmentsController.getChecklistByAssignmentIdHandler(req, res);
      expect(res._json.formNumber).toBe('CHK-001');
    });

    it('returns 404 when not found', async () => {
      req.params = { assignmentId: 'a1' };
      checklistRepo.getChecklistByAssignmentId.mockResolvedValue(null);
      await assetAssignmentsController.getChecklistByAssignmentIdHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getAssetChecklistsHandler', () => {
    it('returns checklists list', async () => {
      checklistListRepo.getAssetChecklists.mockResolvedValue([{ id: 'c1' }]);
      await assetAssignmentsController.getAssetChecklistsHandler(req, res);
      expect(res._json.checklists).toHaveLength(1);
    });
  });

  describe('returnAssetHandler', () => {
    it('returns asset successfully', async () => {
      req.params = { assignmentId: 'a1' };
      req.body = { returnNotes: 'Returned in good condition' };
      repo.getAssignmentById.mockResolvedValue({ assignmentID: 'a1', asset_id: '10', user_id: 'e1', status: 'Active' });
      repo.getBuildersForAsset.mockResolvedValue([]);
      await assetAssignmentsController.returnAssetHandler(req, res);
      expect(res._json.message).toContain('returned');
    });

    it('returns 400 when assignmentId missing', async () => {
      await assetAssignmentsController.returnAssetHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when assignment not found', async () => {
      req.params = { assignmentId: 'a1' };
      repo.getAssignmentById.mockResolvedValue(null);
      await assetAssignmentsController.returnAssetHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

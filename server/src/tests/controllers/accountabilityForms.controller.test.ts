import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as accountabilityFormsController from '../../controllers/accountabilityForms.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn(), query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn() }));
jest.mock('../../utils/cloudinary.js', () => ({ signedRawUrlFromStoredSecureUrl: jest.fn() }));
jest.mock('../../utils/returnAssignmentSideEffects.js', () => ({ applyReturnAssignmentSideEffectsOnConnection: jest.fn() }));
jest.mock('../../utils/notificationsApi.js', () => ({ createNotificationForApi: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({ getHrAccountabilityReceiverUserIds: jest.fn(), getManagerApprover1UserIdsInDepartmentAndCompany: jest.fn(), isDesignatedApprover: jest.fn(), isDesignatedSubApprover: jest.fn(), getDesignatedApproverUserIdForRequester: jest.fn(), getDesignatedSubApproverUserIdForRequester: jest.fn() }));
jest.mock('../../utils/socketManager.js', () => ({ getIoInstance: jest.fn() }));
jest.mock('../../sockets/socketHandlers.js', () => ({ emitNotification: jest.fn() }));
jest.mock('../../services/notification.service.js', () => ({ NotificationService: { createNotification: jest.fn() } }));
jest.mock('../../repositories/accountabilityForm.repository.js', () => ({
  findFormsByAssetId: jest.fn(),
  listAccountabilityForms: jest.fn(),
  getFormById: jest.fn(),
  getFormFullDetailById: jest.fn(),
  findUnsignedFormsByUserId: jest.fn(),
  getFormAssetsDataById: jest.fn(),
  getActiveIntangibleAssetsByUserAndDepartment: jest.fn(),
  getCompanyCodePrefix: jest.fn(),
  getDepartmentCodePrefix: jest.fn(),
  getAccountabilityFormSettings: jest.fn(),
  getNextFormSequence: jest.fn(),
  findFormIdByFormNumber: jest.fn(),
  getCompanyIdByDepartmentId: jest.fn(),
  getUserCompanyAndName: jest.fn(),
  getAssignmentForFormCheck: jest.fn(),
  findFormIdByAssignmentId: jest.fn(),
  getAssetForFormCreation: jest.fn(),
  insertAccountabilityFormSingle: jest.fn(),
  insertAccountabilityFormMulti: jest.fn(),
  getUserNameById: jest.fn(),
  getUserAccountabilityFormPermissions: jest.fn(),
  updateFormSigned: jest.fn(),
  updateFormReceivedCopySignature: jest.fn(),
  findActiveAssignmentForUserAssetTx: jest.fn(),
  callReturnAssignmentTx: jest.fn(),
  findAssignmentIdForUserAssetTx: jest.fn(),
  assetExistsTx: jest.fn(),
  callCreateAssignmentTx: jest.fn(),
  updateFormDeclinedTx: jest.fn(),
  getFormByIdTx: jest.fn(),
  updateFormStatusTx: jest.fn(),
  insertDeclineNotification: jest.fn(),
}));
jest.mock('../../repositories/assetChecklist.repository.js', () => ({
  getChecklistsByAssignmentIds: jest.fn(),
  signChecklistsAsEmployee: jest.fn(),
  backfillEmployeeChecklistSignatures: jest.fn(),
}));
jest.mock('../../repositories/assetAssignment.repository.js', () => ({
  getActiveAssignmentIdsByUserAndAssetIds: jest.fn(),
  getActiveAssignmentIdsByUserAndAssetCodes: jest.fn(),
}));
jest.mock('../../utils/accountabilityFormAssetsData.js', () => ({ resolveChecklistAssignmentIds: jest.fn() }));
jest.mock('../../utils/computerTypeAsset.js', () => ({ isComputerTypeName: jest.fn() }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ getReturnFormsByAssetId: jest.fn() }));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({ getTransferFormsByAssetId: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const repo = jest.requireMock('../../repositories/accountabilityForm.repository.js');
const checklistRepo = jest.requireMock('../../repositories/assetChecklist.repository.js');
const { createAuditLog } = jest.requireMock('../../utils/audit.js');
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js');
const { createNotificationForApi } = jest.requireMock('../../utils/notificationsApi.js');
const { getHrAccountabilityReceiverUserIds } = jest.requireMock('../../utils/approverNotifications.js');
const { isDesignatedApprover, isDesignatedSubApprover, getDesignatedApproverUserIdForRequester, getDesignatedSubApproverUserIdForRequester } = jest.requireMock('../../utils/approverNotifications.js');
const { NotificationService } = jest.requireMock('../../services/notification.service.js');
const { getIoInstance } = jest.requireMock('../../utils/socketManager.js');
const { emitNotification } = jest.requireMock('../../sockets/socketHandlers.js');
const { resolveChecklistAssignmentIds } = jest.requireMock('../../utils/accountabilityFormAssetsData.js');

const mockFormRow = {
  formID: 'f1', form_number: 'AF-001', user_id: 'u1', created_by: 'admin',
  status: 'Pending', signed_at: null, declined_at: null, executed_at: null,
  asset_id: 'a1', asset_code: 'AST-001', asset_name: 'Laptop',
  category_name: 'IT', type_name: 'Computer', serial: 'SN001', assetModelNo: 'MODEL1',
  first_name: 'John', last_name: 'Doe', email: 'john@test.com',
  employeeNumber: 'EMP001', position: 'Developer',
  user_company_id: 'c1', user_company_name: 'Acme', user_company_logo_url: null,
  user_department_id: 'd1', user_department_name: 'Engineering',
  assignment_id: 'a1', assigned_date: '2024-01-01', expected_return_date: null, assignment_notes: null,
  assigned_by: 'admin', assigned_by_first_name: 'Admin', assigned_by_last_name: 'User', assigned_by_email: 'admin@test.com',
  department_id: 'd1', department_name: 'Engineering',
  location_id: 'l1', location_name: 'Main Office', floor_unit: '2F', building: 'Bldg A', room_name: '201',
  issuer_signature: null, it_copy_signature: null,
  acknowledgments: null, decline_reason: null, assets_data: null,
  received_copy_201_file_signature: null, received_copy_201_file_signed_at: null,
  received_copy_201_file_signed_by: null, received_copy_201_file_signed_by_name: null,
  received_copy_signer_first_name: null, received_copy_signer_last_name: null,
  received_copy_wet_pdf_url: null,
  created_at: '2024-01-01T00:00:00Z', updated_at: null,
};

describe('accountabilityForms.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: 'u1' } };
    res = createMockRes();
    pool.execute.mockResolvedValue([[], []]);
    pool.query.mockResolvedValue([[], []]);
    isDesignatedApprover.mockResolvedValue(false);
    isDesignatedSubApprover.mockResolvedValue(false);
    getDesignatedApproverUserIdForRequester.mockResolvedValue(null);
    getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
  });

  describe('getAccountabilityFormsByAssetIdHandler', () => {
    it('returns forms for an asset', async () => {
      req.params = { assetId: 'a1' };
      repo.findFormsByAssetId.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsByAssetIdHandler(req, res);
      expect(res._json.forms).toHaveLength(1);
      expect(res._json.forms[0].formNumber).toBe('AF-001');
    });

    it('returns 400 when assetId missing', async () => {
      await accountabilityFormsController.getAccountabilityFormsByAssetIdHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAccountabilityFormsHandler', () => {
    it('returns all forms scoped to the user company without dept filter', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      repo.listAccountabilityForms.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(res._json.forms).toHaveLength(1);
      expect(repo.listAccountabilityForms).toHaveBeenCalledWith({
        userId: undefined,
        status: undefined,
        companyId: 'c1',
        departmentIds: undefined,
      });
    });

    it('passes the IT/Admin department scope ids when the role is scoped', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: ['d-it-1', 'd-it-2'],
        isSuperAdmin: false,
      });
      repo.listAccountabilityForms.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(repo.listAccountabilityForms).toHaveBeenCalledWith({
        userId: undefined,
        status: undefined,
        companyId: 'c1',
        departmentIds: ['d-it-1', 'd-it-2'],
      });
    });

    it('exempts HR accountability receivers from company/dept scoping', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: ['d-it-1'],
        isSuperAdmin: false,
      });
      pool.execute.mockResolvedValue([[{}], []]);
      repo.listAccountabilityForms.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(repo.listAccountabilityForms).toHaveBeenCalledWith({
        userId: undefined,
        status: undefined,
        companyId: undefined,
        departmentIds: undefined,
      });
    });

    it('filters by userId query param', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      req.query = { userId: 'u1' };
      repo.listAccountabilityForms.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(repo.listAccountabilityForms).toHaveBeenCalledWith({
        userId: 'u1',
        status: undefined,
        companyId: 'c1',
        departmentIds: undefined,
      });
    });

    it('filters by status query param', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      req.query = { status: 'Pending' };
      repo.listAccountabilityForms.mockResolvedValue([mockFormRow]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(repo.listAccountabilityForms).toHaveBeenCalledWith({
        userId: undefined,
        status: 'Pending',
        companyId: 'c1',
        departmentIds: undefined,
      });
    });
  });

  describe('signReceivedCopyHandler', () => {
    it('signs received copy successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalInitials: 'JD' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, received_copy_201_file_signed_at: null });
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      await accountabilityFormsController.signReceivedCopyHandler(req, res);
      expect(res._json.message).toContain('signed');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue(null);
      await accountabilityFormsController.signReceivedCopyHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when already signed', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, received_copy_201_file_signed_at: '2024-01-01' });
      await accountabilityFormsController.signReceivedCopyHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAccountabilityFormChecklistsHandler', () => {
    it('returns checklists for a form', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      repo.getUserAccountabilityFormPermissions.mockResolvedValue([{ granted: 1, permission_type: 'create' }]);
      resolveChecklistAssignmentIds.mockResolvedValue(['a1']);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([{ id: 'cl1', name: 'Checklist 1' }]);
      await accountabilityFormsController.getAccountabilityFormChecklistsHandler(req, res);
      expect(res._json.checklists).toHaveLength(1);
    });

    it('returns 400 when formId missing', async () => {
      await accountabilityFormsController.getAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(null);
      await accountabilityFormsController.getAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when user lacks permission', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue({ ...mockFormRow, user_id: 'other_user' });
      repo.getUserAccountabilityFormPermissions.mockResolvedValue([]);
      pool.execute.mockResolvedValue([[], []]);
      await accountabilityFormsController.getAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('getAccountabilityFormByIdHandler', () => {
    it('returns a form by id', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      repo.getUserAccountabilityFormPermissions.mockResolvedValue([{ granted: 1, permission_type: 'create' }]);
      await accountabilityFormsController.getAccountabilityFormByIdHandler(req, res);
      expect(res._json.form.formNumber).toBe('AF-001');
    });

    it('returns 400 when formId missing', async () => {
      await accountabilityFormsController.getAccountabilityFormByIdHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(null);
      await accountabilityFormsController.getAccountabilityFormByIdHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when unauthorized user', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue({ ...mockFormRow, user_id: 'other_user', created_by: 'other_admin' });
      repo.getUserAccountabilityFormPermissions.mockResolvedValue([]);
      await accountabilityFormsController.getAccountabilityFormByIdHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('checkUnsignedAccountabilityFormsHandler', () => {
    it('returns hasUnsignedForms true when forms exist', async () => {
      req.params = { userId: 'u1' };
      repo.findUnsignedFormsByUserId.mockResolvedValue([{ formID: 'f1', form_number: 'AF-001', user_id: 'u1', status: 'Pending', created_at: '2024-01-01', asset_code: 'AST-001', asset_name: 'Laptop' }]);
      await accountabilityFormsController.checkUnsignedAccountabilityFormsHandler(req, res);
      expect(res._json.hasUnsignedForms).toBe(true);
      expect(res._json.unsignedForms).toHaveLength(1);
    });

    it('returns hasUnsignedForms false when no forms', async () => {
      req.params = { userId: 'u1' };
      repo.findUnsignedFormsByUserId.mockResolvedValue([]);
      await accountabilityFormsController.checkUnsignedAccountabilityFormsHandler(req, res);
      expect(res._json.hasUnsignedForms).toBe(false);
    });

    it('returns 400 when userId missing', async () => {
      await accountabilityFormsController.checkUnsignedAccountabilityFormsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('signAccountabilityFormHandler', () => {
    it('signs form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { acknowledgments: { digitalSignature: 'sig' } };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, status: 'Pending', acknowledgments: null, assets_data: null });
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      resolveChecklistAssignmentIds.mockResolvedValue([]);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([]);
      repo.updateFormSigned.mockResolvedValue(undefined);
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(res._json.message).toContain('signed');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue(null);
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when not assigned to user', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, user_id: 'other_user' });
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('returns 400 when form not pending', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, status: 'Signed' });
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('signAccountabilityFormChecklistsHandler', () => {
    it('signs checklists successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      resolveChecklistAssignmentIds.mockResolvedValue(['a1']);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([{ id: 'cl1', name: 'CL1', employee_signed_at: null }]);
      checklistRepo.signChecklistsAsEmployee.mockResolvedValue(1);
      checklistRepo.backfillEmployeeChecklistSignatures.mockResolvedValue(0);
      await accountabilityFormsController.signAccountabilityFormChecklistsHandler(req, res);
      expect(res._json.message).toContain('Signed');
      expect(res._json.signedCount).toBe(1);
    });

    it('returns 400 when formId missing', async () => {
      await accountabilityFormsController.signAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(null);
      await accountabilityFormsController.signAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when not assigned to user', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue({ ...mockFormRow, user_id: 'other_user' });
      await accountabilityFormsController.signAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('returns 400 when all checklists already signed', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      resolveChecklistAssignmentIds.mockResolvedValue([]);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([]);
      await accountabilityFormsController.signAccountabilityFormChecklistsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('declineAccountabilityFormHandler', () => {
    it('declines form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { reason: 'Not needed' };
      repo.getFormById.mockResolvedValue(mockFormRow);
      pool.getConnection.mockResolvedValue({ beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() });
      repo.updateFormDeclinedTx.mockResolvedValue(1);
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      repo.insertDeclineNotification.mockResolvedValue(1);
      await accountabilityFormsController.declineAccountabilityFormHandler(req, res);
      expect(res._json.message).toContain('declined');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      req.body = { reason: 'Not needed' };
      repo.getFormById.mockResolvedValue(null);
      await accountabilityFormsController.declineAccountabilityFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when not assigned to user', async () => {
      req.params = { formId: 'f1' };
      req.body = { reason: 'Not needed' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, user_id: 'other_user' });
      await accountabilityFormsController.declineAccountabilityFormHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('returns 400 when form not pending', async () => {
      req.params = { formId: 'f1' };
      req.body = { reason: 'Not needed' };
      repo.getFormById.mockResolvedValue({ ...mockFormRow, status: 'Signed' });
      await accountabilityFormsController.declineAccountabilityFormHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAssetMovementHandler', () => {
    it('falls back to direct return/transfer sheets when no accountability forms exist', async () => {
      req.params = { assetId: 'a1' };
      repo.findFormsByAssetId.mockResolvedValue([]);
      const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf1', formNumber: 'RF-001', created_at: '2024-01-01', user: { id: 'u1', first_name: 'John', last_name: 'Doe' } },
      ]);
      const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([
        { id: 'tf1', formNumber: 'TF-001', created_at: '2024-01-02', user: { id: 'u1', first_name: 'John', last_name: 'Doe' }, new_user: { first_name: 'Ann', last_name: 'Lee' } },
      ]);
      await accountabilityFormsController.getAssetMovementHandler(req, res);
      expect(res._json.forms).toHaveLength(1);
      expect(res._json.forms[0].returnForms).toHaveLength(1);
      expect(res._json.forms[0].returnForms[0].formNumber).toBe('RF-001');
      expect(res._json.forms[0].transferForms).toHaveLength(1);
      expect(res._json.forms[0].transferForms[0].newUserName).toBe('Ann Lee');
    });

    it('returns empty forms when no accountability forms and no direct sheets', async () => {
      req.params = { assetId: 'a1' };
      repo.findFormsByAssetId.mockResolvedValue([]);
      const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([]);
      const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([]);
      await accountabilityFormsController.getAssetMovementHandler(req, res);
      expect(res._json.forms).toEqual([]);
    });
  });
});

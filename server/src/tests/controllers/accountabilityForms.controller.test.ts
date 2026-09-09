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
  updateAdminCopySignature: jest.fn(),
  updateOwnerSignatureApproval: jest.fn(),
  updateFormApproval: jest.fn(),
  findActiveAssignmentForUserAssetTx: jest.fn(),
  callReturnAssignmentTx: jest.fn(),
  findAssignmentIdForUserAssetTx: jest.fn(),
  assetExistsTx: jest.fn(),
  callCreateAssignmentTx: jest.fn(),
  updateFormDeclinedTx: jest.fn(),
  getFormByIdTx: jest.fn(),
  updateFormStatusTx: jest.fn(),
  insertDeclineNotification: jest.fn(),
  getAssignmentAssetMapping: jest.fn(),
  getReturnFormsByAssignmentIds: jest.fn(),
  getTransferFormsForMovement: jest.fn(),
  getActiveAccountabilityFormsForAssetIds: jest.fn(),
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
jest.mock('../../models/audit.model.js', () => ({ __esModule: true, default: { getByAccountabilityFormId: jest.fn() } }));

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
  approval_status: null, admin_copy_signer_id: null, admin_copy_signature: null,
  admin_copy_signed_at: null, admin_copy_copy_type: null,
  approved_by: null, approved_at: null, approval_notes: null,
  dept_head_signed_by: null, dept_head_signed_by_name: null, dept_head_signature: null, dept_head_signed_at: null,
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

    it('keeps owner-signed forms (pending_approval) visible for a user documents query', async () => {
      // Owner signed → approval_status is pending_approval (waiting for the
      // designated approver/sub-approver). The form must still show in the
      // owner's Profile > Documents > Accountability tab.
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      req.query = { userId: 'u1' };
      repo.listAccountabilityForms.mockResolvedValue([
        { ...mockFormRow, approval_status: 'pending_approval' },
      ]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(res._json.forms).toHaveLength(1);
      expect(res._json.forms[0].approvalStatus).toBe('pending_approval');
    });

    it('still hides forms awaiting the IT/Admin copy signature for a user documents query', async () => {
      getAssetScope.mockResolvedValue({
        companyId: 'c1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      req.query = { userId: 'u1' };
      repo.listAccountabilityForms.mockResolvedValue([
        { ...mockFormRow, approval_status: 'pending_admin_copy_signature' },
        { ...mockFormRow, formID: 'f2', approval_status: 'approved' },
      ]);
      await accountabilityFormsController.getAccountabilityFormsHandler(req, res);
      expect(res._json.forms).toHaveLength(1);
      expect(res._json.forms[0].approvalStatus).toBe('approved');
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

    it('returns 400 when the IT/Admin copy is still pending signature', async () => {
      req.params = { formId: 'f1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_admin_copy_signature',
      });
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(res._status).toBe(400);
      expect(res._json.error).toContain('IT/Admin copy');
    });

    it('moves the form to pending_approval and notifies approvers after the owner signs', async () => {
      req.params = { formId: 'f1' };
      req.body = { acknowledgments: { digitalSignature: 'sig' } };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_owner_signature',
        acknowledgments: null,
        assets_data: null,
      });
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      resolveChecklistAssignmentIds.mockResolvedValue([]);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([]);
      repo.updateFormSigned.mockResolvedValue(undefined);
      repo.updateOwnerSignatureApproval.mockResolvedValue(1);
      getDesignatedApproverUserIdForRequester.mockResolvedValue('approver1');
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);
      const { notifyUser } = jest.requireMock('../../controllers/accountabilityForms.controller.js') as any;
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(repo.updateOwnerSignatureApproval).toHaveBeenCalledWith('f1', 'pending_approval');
      expect(res._json.form.approvalStatus).toBe('pending_approval');
      expect(res._json.message).toContain('awaiting final approval');
    });

    it('auto-approves after the owner signs when no designated approver exists', async () => {
      req.params = { formId: 'f1' };
      req.body = { acknowledgments: { digitalSignature: 'sig' } };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_owner_signature',
        acknowledgments: null,
        assets_data: null,
      });
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      resolveChecklistAssignmentIds.mockResolvedValue([]);
      checklistRepo.getChecklistsByAssignmentIds.mockResolvedValue([]);
      repo.updateFormSigned.mockResolvedValue(undefined);
      repo.updateOwnerSignatureApproval.mockResolvedValue(1);
      getDesignatedApproverUserIdForRequester.mockResolvedValue(null);
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);
      await accountabilityFormsController.signAccountabilityFormHandler(req, res);
      expect(repo.updateOwnerSignatureApproval).toHaveBeenCalledWith('f1', 'approved');
      expect(res._json.form.approvalStatus).toBe('approved');
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

  describe('getAccountabilityFormMovementHandler', () => {
    const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js');
    const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');

    beforeEach(() => {
      repo.getAssignmentAssetMapping.mockResolvedValue([]);
      repo.getReturnFormsByAssignmentIds.mockResolvedValue([]);
      repo.getTransferFormsForMovement.mockResolvedValue([]);
      repo.getActiveAccountabilityFormsForAssetIds.mockResolvedValue([]);
    });

    it('falls back to outbound direct sheets (after this form, before its replacement)', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      repo.getActiveAccountabilityFormsForAssetIds.mockResolvedValue([
        {
          formID: 'f2', form_number: 'AF-002', user_id: 'u2', user_name: 'Jane Smith',
          status: 'Pending', created_at: '2024-01-05T00:00:00Z',
          assets_data: JSON.stringify({ assets: [{ id: 'a1' }] }),
        },
      ]);
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf1', formNumber: 'RF-001', created_at: '2024-01-03T00:00:00Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' } },
      ]);
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([
        { id: 'tf1', formNumber: 'TF-001', created_at: '2024-01-04T00:00:00Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' }, new_user: { first_name: 'Ann', last_name: 'Lee' } },
      ]);

      await accountabilityFormsController.getAccountabilityFormMovementHandler(req, res);

      expect(res._json.assets).toHaveLength(1);
      expect(res._json.assets[0].returnForms).toHaveLength(1);
      expect(res._json.assets[0].returnForms[0].formNumber).toBe('RF-001');
      expect(res._json.assets[0].transferForms).toHaveLength(1);
      expect(res._json.assets[0].transferForms[0].newUserName).toBe('Ann Lee');
      expect(res._json.assets[0].newAccountabilityForms).toHaveLength(1);
      expect(res._json.assets[0].newAccountabilityForms[0].formNumber).toBe('AF-002');
    });

    it('falls back to inbound direct sheets for a reissued form (movements precede form creation)', async () => {
      // Reissued form created Jan 5; the return (Jan 4) + transfer (Jan 4)
      // handed the asset over BEFORE this form existed. The old window
      // [thisForm.created_at → nextForm.created_at] missed them entirely.
      req.params = { formId: 'f1' };
      const reissuedRow = {
        ...mockFormRow,
        created_at: '2024-01-05T00:00:00Z',
        assets_data: JSON.stringify({ assets: [{ id: 'a1', code: 'AST-001', name: 'Laptop' }] }),
      };
      repo.getFormFullDetailById.mockResolvedValue(reissuedRow);
      repo.getActiveAccountabilityFormsForAssetIds.mockResolvedValue([]);
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf-in', formNumber: 'RF-IN', created_at: '2024-01-04T00:00:00Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' } },
      ]);
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([
        { id: 'tf-in', formNumber: 'TF-IN', created_at: '2024-01-04T00:00:01Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' }, new_user: { first_name: 'Ann', last_name: 'Lee' } },
      ]);

      await accountabilityFormsController.getAccountabilityFormMovementHandler(req, res);

      expect(res._json.assets[0].returnForms).toHaveLength(1);
      expect(res._json.assets[0].returnForms[0].formNumber).toBe('RF-IN');
      expect(res._json.assets[0].transferForms).toHaveLength(1);
      expect(res._json.assets[0].transferForms[0].newUserName).toBe('Ann Lee');
    });

    it('excludes direct sheets far before this form (stale history from earlier owners)', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      repo.getActiveAccountabilityFormsForAssetIds.mockResolvedValue([
        {
          formID: 'f2', form_number: 'AF-002', user_id: 'u2', user_name: 'Jane Smith',
          status: 'Pending', created_at: '2024-01-05T00:00:00Z',
          assets_data: JSON.stringify({ assets: [{ id: 'a1' }] }),
        },
      ]);
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf-old', formNumber: 'RF-OLD', created_at: '2023-12-15T00:00:00Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' } },
      ]);
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([]);

      await accountabilityFormsController.getAccountabilityFormMovementHandler(req, res);

      expect(res._json.assets[0].returnForms).toHaveLength(0);
    });

    it('prefers assignment-attributed forms over the direct fallback', async () => {
      req.params = { formId: 'f1' };
      const multiFormRow = {
        ...mockFormRow,
        assets_data: JSON.stringify({
          assets: [{ id: 'a1', code: 'AST-001', name: 'Laptop' }],
          assignment_ids: ['asg1'],
        }),
      };
      repo.getFormFullDetailById.mockResolvedValue(multiFormRow);
      repo.getAssignmentAssetMapping.mockResolvedValue([
        { assignment_id: 'asg1', asset_id: 'a1' },
      ]);
      repo.getReturnFormsByAssignmentIds.mockResolvedValue([
        { formID: 'rf9', form_number: 'RF-009', assignment_id: 'asg1', user_id: 'u1', user_name: 'John Doe', created_at: '2024-01-02T00:00:00Z' },
      ]);
      returnRepo.getReturnFormsByAssetId.mockResolvedValue([
        { id: 'rf1', formNumber: 'RF-001', created_at: '2024-01-03T00:00:00Z', user: { id: 'u1', first_name: 'John', last_name: 'Doe' } },
      ]);
      transferRepo.getTransferFormsByAssetId.mockResolvedValue([]);

      await accountabilityFormsController.getAccountabilityFormMovementHandler(req, res);

      expect(res._json.assets[0].returnForms).toHaveLength(1);
      expect(res._json.assets[0].returnForms[0].formNumber).toBe('RF-009');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      repo.getFormFullDetailById.mockResolvedValue(null);
      await accountabilityFormsController.getAccountabilityFormMovementHandler(req, res);
      expect(res._status).toBe(404);
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

  describe('kickoffApprovalFlowNotifications', () => {
    const kickoffArgs = () => ({
      formId: 'f9',
      formNumber: 'AF-009',
      ownerUserId: 'u1',
      ownerName: 'John Doe',
      assignerName: 'Assigner Name',
      req,
    });

    it('notifies the copy signer for a pending_admin_copy_signature form', async () => {
      pool.execute.mockImplementation(async (query: unknown) => {
        const q = String(query);
        if (q.includes('SELECT approval_status, admin_copy_signer_id')) {
          return [[{
            approval_status: 'pending_admin_copy_signature',
            admin_copy_signer_id: 'signer1',
            admin_copy_copy_type: 'IT',
          }]];
        }
        return [[]];
      });
      getDesignatedApproverUserIdForRequester.mockResolvedValue('approver1');

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'signer1',
          title: 'Accountability form AF-009 needs IT copy signature',
          type: 'accountability_form',
        }),
        'u1',
        '127.0.0.1',
        undefined
      );
      const dataArg = JSON.parse(
        (NotificationService.createNotification as jest.Mock).mock.calls[0][0].data
      );
      expect(dataArg.route).toBe('/approvals?tab=for-approval');
      expect(dataArg.actionTarget).toBe('accountability_form_admin_copy');
      expect(dataArg.formId).toBe('f9');
    });

    it('notifies BOTH issuer approver and sub-approver for a pending_admin_copy_signature form', async () => {
      pool.execute.mockImplementation(async (query: unknown) => {
        const q = String(query);
        if (q.includes('SELECT approval_status, admin_copy_signer_id')) {
          return [[{
            approval_status: 'pending_admin_copy_signature',
            admin_copy_signer_id: 'issuerApprover',
            admin_copy_copy_type: 'IT',
            created_by: 'issuer1',
          }]];
        }
        return [[]];
      });
      getDesignatedApproverUserIdForRequester.mockImplementation(async (userId: unknown) => {
        if (userId === 'issuer1') return 'issuerApprover';
        return 'approver1';
      });
      getDesignatedSubApproverUserIdForRequester.mockImplementation(async (userId: unknown) => {
        if (userId === 'issuer1') return 'issuerSub';
        return 'subapprover1';
      });

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      const notifiedUserIds = (NotificationService.createNotification as jest.Mock).mock.calls
        .map(call => call[0].user_id);
      expect(notifiedUserIds).toContain('issuerApprover');
      expect(notifiedUserIds).toContain('issuerSub');
      expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('notifies just the single designated signer when the issuer has only one', async () => {
      pool.execute.mockImplementation(async (query: unknown) => {
        const q = String(query);
        if (q.includes('SELECT approval_status, admin_copy_signer_id')) {
          return [[{
            approval_status: 'pending_admin_copy_signature',
            admin_copy_signer_id: 'onlyApprover',
            admin_copy_copy_type: 'Admin',
            created_by: 'issuer1',
          }]];
        }
        return [[]];
      });
      getDesignatedApproverUserIdForRequester.mockResolvedValue('onlyApprover');
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      const notifiedUserIds = (NotificationService.createNotification as jest.Mock).mock.calls
        .map(call => call[0].user_id);
      expect(notifiedUserIds).toEqual(['onlyApprover']);
    });

    it('notifies the owner approvers for a pending_approval form', async () => {
      pool.execute.mockImplementation(async (query: unknown) => {
        const q = String(query);
        if (q.includes('SELECT approval_status, admin_copy_signer_id')) {
          return [[{
            approval_status: 'pending_approval',
            admin_copy_signer_id: null,
            admin_copy_copy_type: 'IT',
          }]];
        }
        return [[]];
      });
      getDesignatedApproverUserIdForRequester.mockResolvedValue('approver1');
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue('subapprover1');

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      const notifiedUserIds = (NotificationService.createNotification as jest.Mock).mock.calls
        .map(call => call[0].user_id);
      expect(notifiedUserIds).toContain('approver1');
      expect(notifiedUserIds).toContain('subapprover1');
    });

    it('is a no-op for an approved form', async () => {
      pool.execute.mockImplementation(async (query: unknown) => {
        const q = String(query);
        if (q.includes('SELECT approval_status, admin_copy_signer_id')) {
          return [[{
            approval_status: 'approved',
            admin_copy_signer_id: null,
            admin_copy_copy_type: null,
          }]];
        }
        return [[]];
      });

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      expect(NotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('is a no-op when the form row is missing', async () => {
      pool.execute.mockResolvedValue([[]]);

      await accountabilityFormsController.kickoffApprovalFlowNotifications(kickoffArgs());

      expect(NotificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('signAdminCopyHandler', () => {
    it('moves the form to pending_owner_signature and notifies the owner', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      req.user = { userID: 'signer1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_admin_copy_signature',
        admin_copy_signer_id: 'signer1',
        admin_copy_copy_type: 'IT',
      });
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      repo.updateAdminCopySignature.mockResolvedValue(1);
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);

      await accountabilityFormsController.signAdminCopyHandler(req, res);

      expect(repo.updateAdminCopySignature).toHaveBeenCalledWith('f1', 'sig', 'pending_owner_signature');
      expect(res._json.approvalStatus).toBe('pending_owner_signature');
      expect(res._json.message).toContain('awaiting owner signature');
      // Owner-signature step: the owner now receives BOTH issuance notices
      // ("asset assigned" + "form issued for signing"), not the old
      // "needs your signature" notice and not deferred to final approval.
      const signTitles = (
        NotificationService.createNotification as jest.Mock
      ).mock.calls.map((call: any[]) => call[0].title);
      expect(signTitles).toContain('New asset is assigned to You');
      expect(signTitles).toContain('New accountability form has been issued');
      expect(
        signTitles.some((t: string) => t.includes('needs your signature'))
      ).toBe(false);
    });

    it('returns 400 when the form is not awaiting a copy signature', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'signer1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        approval_status: 'pending_approval',
        admin_copy_signer_id: 'signer1',
      });
      await accountabilityFormsController.signAdminCopyHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when the user is not the designated copy signer', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'someone_else' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        approval_status: 'pending_admin_copy_signature',
        admin_copy_signer_id: 'signer1',
      });
      await accountabilityFormsController.signAdminCopyHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('allows the issuer sub-approver (not the stored signer) to sign — first to sign wins', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      req.user = { userID: 'issuerSub' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_admin_copy_signature',
        admin_copy_signer_id: 'issuerApprover',
        admin_copy_copy_type: 'IT',
        created_by: 'issuer1',
      });
      isDesignatedApprover.mockResolvedValue(false);
      isDesignatedSubApprover.mockResolvedValue(true);
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      repo.updateAdminCopySignature.mockResolvedValue(1);
      repo.getUserNameById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);

      await accountabilityFormsController.signAdminCopyHandler(req, res);

      expect(repo.updateAdminCopySignature).toHaveBeenCalledWith('f1', 'sig', 'pending_owner_signature');
      expect(res._json.approvalStatus).toBe('pending_owner_signature');
    });

    it('returns 409 with an already-signed message when the other approver signed first', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      req.user = { userID: 'issuerApprover' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Pending',
        approval_status: 'pending_admin_copy_signature',
        admin_copy_signer_id: 'issuerApprover',
        admin_copy_copy_type: 'IT',
        created_by: 'issuer1',
      });
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      repo.updateAdminCopySignature.mockResolvedValue(0);
      getHrAccountabilityReceiverUserIds.mockResolvedValue([]);

      await accountabilityFormsController.signAdminCopyHandler(req, res);

      expect(res._status).toBe(409);
      expect(res._json.error).toContain('already signed');
    });
  });

  describe('approveAccountabilityFormHandler', () => {
    it('approves the form and notifies HR receivers for the 201-file copy when the owner already signed', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'approver1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Signed',
        approval_status: 'pending_approval',
        signed_at: '2024-01-02T00:00:00Z',
      });
      isDesignatedApprover.mockResolvedValue(true);
      isDesignatedSubApprover.mockResolvedValue(false);
      pool.query.mockResolvedValue([[{ digital_signature: 'sig' }], []]);
      repo.updateFormApproval.mockResolvedValue(1);
      repo.getUserNameById.mockResolvedValue({ first_name: 'Ann', last_name: 'Lee' });
      getHrAccountabilityReceiverUserIds.mockResolvedValue(['hr1']);

      await accountabilityFormsController.approveAccountabilityFormHandler(req, res);

      expect(repo.updateFormApproval).toHaveBeenCalled();
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'hr1' })
      );
      expect(res._json.approvalStatus).toBe('approved');
      // Final approval: the owner is told the department head reviewed and
      // signed the form — the issuance notices were already sent at the
      // owner-signature step and must NOT repeat here.
      const approveTitles = (
        NotificationService.createNotification as jest.Mock
      ).mock.calls.map((call: any[]) => call[0].title);
      expect(approveTitles).toContain(
        'Your accountability form has been reviewed and signed by your department head'
      );
      expect(approveTitles).not.toContain('New asset is assigned to You');
      expect(approveTitles).not.toContain(
        'New accountability form has been issued'
      );
    });

    it('returns 400 when the form is not awaiting approval', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'approver1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        approval_status: 'pending_owner_signature',
      });
      await accountabilityFormsController.approveAccountabilityFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when the user is not the designated approver/sub-approver', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'someone_else' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        approval_status: 'pending_approval',
      });
      isDesignatedApprover.mockResolvedValue(false);
      isDesignatedSubApprover.mockResolvedValue(false);
      await accountabilityFormsController.approveAccountabilityFormHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('rejects approval of a disabled (superseded) form even when it is in pending_approval', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'approver1' };
      repo.getFormById.mockResolvedValue({
        ...mockFormRow,
        status: 'Disabled',
        approval_status: 'pending_approval',
      });
      await accountabilityFormsController.approveAccountabilityFormHandler(req, res);
      expect(res._status).toBe(400);
      expect(res._json.error).toContain('superseded');
      // The pending approval flow for the disabled form must never complete.
      expect(repo.updateFormApproval).not.toHaveBeenCalled();
    });
  });

  describe('getAccountabilityFormAuditHandler', () => {
    it('returns audit logs for the form owner', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'u1' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      const auditModel = jest.requireMock('../../models/audit.model.js');
      auditModel.default.getByAccountabilityFormId.mockResolvedValue({
        logs: [{ auditID: 1, action: 'Created Accountability Form' }],
      });

      await accountabilityFormsController.getAccountabilityFormAuditHandler(req, res);

      expect(res._json.logs).toHaveLength(1);
      expect(res._json.logs[0].action).toBe('Created Accountability Form');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'u1' };
      repo.getFormFullDetailById.mockResolvedValue(null);
      await accountabilityFormsController.getAccountabilityFormAuditHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when the user cannot view the form', async () => {
      req.params = { formId: 'f1' };
      req.user = { userID: 'someone_else' };
      repo.getFormFullDetailById.mockResolvedValue(mockFormRow);
      isDesignatedApprover.mockResolvedValue(false);
      isDesignatedSubApprover.mockResolvedValue(false);
      repo.getUserAccountabilityFormPermissions.mockResolvedValue([]);
      pool.execute.mockResolvedValue([[], []]);
      await accountabilityFormsController.getAccountabilityFormAuditHandler(req, res);
      expect(res._status).toBe(403);
    });
  });
});

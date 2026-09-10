import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetTransfersController from '../../controllers/assetTransfers.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/accountabilityFormOnReturn.js', () => ({ handleAccountabilityFormOnAssetReturn: jest.fn() }));
jest.mock('../../utils/responseWrapper.js', () => ({
  createSuccessResponse: (res: any, data: any, message: string) => { res.json({ ...data, message }); return res; },
  createErrorResponse: (res: any, error: any, errors?: any, statusCode?: number, message?: string) => { res.status(statusCode || 400).json({ error: message || error }); return res; },
}));
jest.mock('../../utils/cloudinary.js', () => ({ uploadReturnConditionImageToCloudinary: jest.fn(), signedRawUrlFromStoredSecureUrl: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({
  getAssetScope: jest.fn(),
  getDepartmentIdsForScope: jest.fn(),
  // Mirror the real classifier so scope-aware notifications stay testable.
  classifyDepartmentScopeByName: jest.fn((name: string | null | undefined) => {
    const n = (name || '').toLowerCase();
    if (n.includes('it') || n.includes('information technology')) return 'IT';
    if (n.includes('admin') || n.includes('administration')) return 'Admin';
    return 'Other';
  }),
}));
jest.mock('../../utils/approverNotifications.js', () => ({ isUserManagerApprover1: jest.fn(), isUserManagerApprover2: jest.fn(), getManagerApprover1UserIdsInDepartmentAndCompany: jest.fn(), getAssetRoleUsersForAssignmentsAndCompany: jest.fn(), getManagerApprover2UserIdsForProcessedReturn: jest.fn(), isDesignatedApprover: jest.fn(), isDesignatedSubApprover: jest.fn(), getDesignatedApproverUserIdForRequester: jest.fn(), getDesignatedSubApproverUserIdForRequester: jest.fn(), getRequestorMA1Status: jest.fn() }));
jest.mock('../../services/userApprovers.service.js', () => ({ getRequestersAssignedToApprover: jest.fn() }));
jest.mock('../../utils/notificationsApi.js', () => ({ createNotificationForApi: jest.fn() }));
jest.mock('../../utils/transferFormNumber.js', () => ({ generateTransferFormNumber: jest.fn(), generateTransferFormNumberFallback: jest.fn() }));
jest.mock('../../utils/returnFormNumber.js', () => ({ generateReturnFormNumber: jest.fn(), generateReturnFormNumberFallback: jest.fn() }));
jest.mock('../../models/assetTransferForm.model.js', () => ({ AssetTransferFormModel: { create: jest.fn(), findById: jest.fn(), findByUserId: jest.fn(), findAll: jest.fn(), createWithTransfererSignature: jest.fn(), addFormAssignments: jest.fn(), getFormAssignmentIds: jest.fn() } }));
jest.mock('../../models/assetReturnForm.model.js', () => ({ AssetReturnFormModel: { create: jest.fn(), createWithReturnerSignature: jest.fn(), findById: jest.fn() } }));
jest.mock('../../models/assetReturn.model.js', () => ({ AssetReturnModel: { create: jest.fn() } }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ fetchUserDigitalSignature: jest.fn() }));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({
  toBind: jest.fn(), getTransferFormLinksForReturnForms: jest.fn(), getTransferFormByReturnFormId: jest.fn(),
  getReturnFormIdByTransferFormId: jest.fn(),
  getTransferFormIdsByReturnFormId: jest.fn(), getTransferFormAssignments: jest.fn(),
  getActiveAssignmentsByIds: jest.fn(), getRoomByLocationIdAndName: jest.fn(),
  getDepartmentById: jest.fn(), getUserById: jest.fn(), getUserDepartmentId: jest.fn(),
  getUserNamesById: jest.fn(), getCategoryDepartmentsByAssetIds: jest.fn(),
  getBuilderItemsByAssetIds: jest.fn(), getBuilderItemCount: jest.fn(),
  findAccountabilityFormForAsset: jest.fn(),
}));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({ createAccountabilityFormHandler: jest.fn(), kickoffApprovalFlowNotifications: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const formModel = jest.requireMock('../../models/assetTransferForm.model.js').AssetTransferFormModel;
const returnFormModel = jest.requireMock('../../models/assetReturnForm.model.js').AssetReturnFormModel;
const assetReturnModel = jest.requireMock('../../models/assetReturn.model.js').AssetReturnModel;
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js');
const { isUserManagerApprover1, isUserManagerApprover2, getManagerApprover1UserIdsInDepartmentAndCompany, getAssetRoleUsersForAssignmentsAndCompany, getManagerApprover2UserIdsForProcessedReturn } = jest.requireMock('../../utils/approverNotifications.js');
const { isDesignatedApprover, isDesignatedSubApprover, getDesignatedApproverUserIdForRequester, getDesignatedSubApproverUserIdForRequester, getRequestorMA1Status } = jest.requireMock('../../utils/approverNotifications.js');
const { getRequestersAssignedToApprover } = jest.requireMock('../../services/userApprovers.service.js');
const { createNotificationForApi } = jest.requireMock('../../utils/notificationsApi.js');
const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js');
const { fetchUserDigitalSignature } = jest.requireMock('../../repositories/assetReturn.repository.js');
const { uploadReturnConditionImageToCloudinary } = jest.requireMock('../../utils/cloudinary.js');
const { generateTransferFormNumber, generateTransferFormNumberFallback } = jest.requireMock('../../utils/transferFormNumber.js');
const { generateReturnFormNumber, generateReturnFormNumberFallback } = jest.requireMock('../../utils/returnFormNumber.js');

const mockForm = { formID: 'f1', form_number: 'TRF-001', user_id: 'u1', signed_at: null, declined_at: null, executed_at: null };

describe('assetTransfers.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: 'u1' } };
    res = createMockRes();
    getAssetRoleUsersForAssignmentsAndCompany.mockResolvedValue([]);
    isDesignatedApprover.mockResolvedValue(false);
    isDesignatedSubApprover.mockResolvedValue(false);
    getDesignatedApproverUserIdForRequester.mockResolvedValue(null);
    getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
    getRequestersAssignedToApprover.mockResolvedValue([]);
    getRequestorMA1Status.mockResolvedValue(false);
    getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false, isAdmin: false });
  });

  describe('submitTransferRequestHandler', () => {
    it('submits transfer request successfully', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd1', transferToUserId: 'u2', notes: 'Transfer', digitalSignature: 'sig' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ assignmentID: 'a1', asset_id: '10', user_id: 'u1', department_id: 'd1', location_id: 'l1', location_room_id: null }]);
      transferRepo.getUserById.mockResolvedValue({ userID: 'u2', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RF-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'rf1', form_number: 'RF-001' });
      assetReturnModel.create.mockResolvedValue({});
      generateTransferFormNumber.mockResolvedValue('TRF-001');
      formModel.createWithTransfererSignature.mockResolvedValue({ formID: 'f1', form_number: 'TRF-001' });
      formModel.addFormAssignments.mockResolvedValue(undefined);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([]);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formID).toBe('f1');
      expect(res._json.message).toContain('submitted');
    });

    it('submits transfer request when target user is in a different department', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd2', transferToUserId: 'u2', notes: 'Transfer', digitalSignature: 'sig' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ assignmentID: 'a1', asset_id: '10', user_id: 'u1', department_id: 'd1', location_id: 'l1', location_room_id: null }]);
      transferRepo.getUserById.mockResolvedValue({ userID: 'u2', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d2');
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RF-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'rf1', form_number: 'RF-001' });
      assetReturnModel.create.mockResolvedValue({});
      generateTransferFormNumber.mockResolvedValue('TRF-001');
      formModel.createWithTransfererSignature.mockResolvedValue({ formID: 'f1', form_number: 'TRF-001' });
      formModel.addFormAssignments.mockResolvedValue(undefined);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([]);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formID).toBe('f1');
      expect(res._json.message).toContain('submitted');
    });

    it('returns 400 when assignmentIds missing', async () => {
      req.body = {};
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('sends only the transfer approval-needed notification to Manager Approver 1 (staged flow: no return form yet)', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd1', transferToUserId: 'u2', notes: 'Transfer', digitalSignature: 'sig' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ assignmentID: 'a1', asset_id: '10', user_id: 'u1', department_id: 'd1', location_id: 'l1', location_room_id: null }]);
      transferRepo.getUserById.mockResolvedValue({ userID: 'u2', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      generateTransferFormNumber.mockResolvedValue('TRF-001');
      formModel.createWithTransfererSignature.mockResolvedValue({ formID: 'f1', form_number: 'TRF-001' });
      formModel.addFormAssignments.mockResolvedValue(undefined);
      getDesignatedApproverUserIdForRequester.mockResolvedValue('u-approver');
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(201);
      // Staged flow: only the transfer form is created (no return form / returns).
      expect(returnFormModel.createWithReturnerSignature).not.toHaveBeenCalled();
      expect(assetReturnModel.create).not.toHaveBeenCalled();
      expect(formModel.createWithTransfererSignature).toHaveBeenCalledWith(
        expect.objectContaining({ return_form_id: null })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-approver',
          title: 'Asset Transfer Request Approval Needed',
          data: expect.objectContaining({ form_id: 'f1', actionTarget: 'transfer_request_approval' }),
        })
      );
      // The old coupled "Asset Return Request Approval Needed" notification is gone.
      const notifTitles = (createNotificationForApi as jest.Mock).mock.calls.map(
        (c: any[]) => c[0]?.title
      );
      expect(notifTitles).not.toContain('Asset Return Request Approval Needed');
      expect(notifTitles).not.toContain('Return Form Created for Condition Checking');
    });

    it('returns 404 when assignments not found', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd1', transferToUserId: 'u2' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([]);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when not own assignment', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd1', transferToUserId: 'u2' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ assignmentID: 'a1', user_id: 'other_user' }]);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('signAssetTransferFormHandler', () => {
    it('signs form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, user_id: 'u1' });
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._json.message).toContain('signed');
    });

    it('notifies Manager Approver 1 users after the transferrer signs the form', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, form_number: 'TRF-001', user_id: 'u1', department_id: 'd1' });
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      formModel.getFormAssignmentIds.mockResolvedValue(['a1', 'a2']);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u-ma1']);
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._json.message).toContain('signed');
      expect(getManagerApprover1UserIdsInDepartmentAndCompany).toHaveBeenCalledWith('d1', '10');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-ma1',
          title: 'Asset Transfer Request Approval Needed',
          message:
            'John Doe has signed the asset transfer form for 2 assets and requires your approval.',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'TRF-001',
            asset_count: 2,
            route: '/approvals',
            actionTarget: 'transfer_request_approval',
          }),
        })
      );
    });

    it('skips notification when approver is the transferrer themselves', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, user_id: 'u1', department_id: 'd1' });
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      formModel.getFormAssignmentIds.mockResolvedValue(['a1']);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u1']);
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._json.message).toContain('signed');
      expect(createNotificationForApi).not.toHaveBeenCalled();
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue(null);
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when already signed', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, signed_at: '2024-01-01', user_id: 'u1' });
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when wrong user', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, user_id: 'other_user' });
      await assetTransfersController.signAssetTransferFormHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('approveTransferFormHandler', () => {
    it('approves form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, signed_at: '2024-01-01', dept_head_signed_at: null, return_form_id: null });
      pool.execute.mockResolvedValue([[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []]);
      isUserManagerApprover1.mockResolvedValue(false);
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._json.message).toContain('approved');
    });

    it('returns 400 when form not signed', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, signed_at: null, dept_head_signed_at: null });
      pool.execute.mockResolvedValue([[], []]);
      isUserManagerApprover1.mockResolvedValue(true);
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('approves owner-absent transfer without transferrer signature', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, signed_at: null, dept_head_signed_at: null, return_form_id: 'rf1' });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT owner_absent FROM asset_return_forms')) return [[{ owner_absent: 1 }], []];
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false, isAdmin: false });
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._json.message).toContain('approved');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue(null);
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('auto-approves the linked return form and notifies the requester', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, form_number: 'TRF-001', user_id: 'u1', signed_at: '2024-01-01', dept_head_signed_at: null, return_form_id: 'rf1' });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT form_number, dept_head_signed_at FROM asset_return_forms')) return [[{ form_number: 'RET-001', dept_head_signed_at: null }], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._json.message).toContain('approved');
      const returnUpdateCall = (pool.execute as jest.Mock).mock.calls.find((c: any[]) =>
        String(c[0]).includes('UPDATE asset_return_forms')
      );
      expect(returnUpdateCall).toBeDefined();
      expect(returnUpdateCall[1]).toEqual(['sig', 'u1', 'rf1']);
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset Return Request Approved',
          data: expect.objectContaining({ form_id: 'rf1', form_number: 'RET-001' }),
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset Transfer Request Approved',
          data: expect.objectContaining({ form_id: 'f1', form_number: 'TRF-001', actionTarget: 'transfer_request_approved' }),
        })
      );
      expect(res._json.pendingLinkedReturnApproval).toBeUndefined();
    });

    it('notifies IT/Admin asset role users of the linked transfer and return', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, form_number: 'TRF-001', user_id: 'u1', department_id: 'd1', signed_at: '2024-01-01', dept_head_signed_at: null, return_form_id: 'rf1' });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT form_number, dept_head_signed_at FROM asset_return_forms')) return [[{ form_number: 'RET-001', dept_head_signed_at: null }], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u1', first_name: 'John', last_name: 'Doe', company_id: '10' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });
      transferRepo.getTransferFormAssignments.mockResolvedValue([{ assignment_id: 'a1' }]);
      getAssetRoleUsersForAssignmentsAndCompany.mockResolvedValue([{ userID: 'u-it', first_name: 'IT', last_name: 'User' }]);
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._json.message).toContain('approved');
      expect(getAssetRoleUsersForAssignmentsAndCompany).toHaveBeenCalledWith('10', ['a1'], 'IT');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-it',
          title: 'New Asset Transfer Request Received',
          message: expect.stringContaining('process the return first'),
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'TRF-001',
            actionTarget: 'asset_transfer_requests',
          }),
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-it',
          title: 'New Asset Return Request Received',
          data: expect.objectContaining({
            form_id: 'rf1',
            form_number: 'RET-001',
            actionTarget: 'asset_return_requests',
          }),
        })
      );
    });

    it('notifies the requester they can generate a return when approving a transfer with no linked return form', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      formModel.findById.mockResolvedValue({ ...mockForm, form_number: 'TRF-001', user_id: 'u1', department_id: 'd1', signed_at: '2024-01-01', dept_head_signed_at: null, return_form_id: null });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT asset_id FROM asset_assignments')) return [[{ asset_id: '10' }], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      transferRepo.getTransferFormAssignments.mockResolvedValue([{ assignment_id: 'a1' }]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT Department' });
      await assetTransfersController.approveTransferFormHandler(req, res);
      expect(res._json.message).toContain('approved');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset Transfer Request Approved',
          data: expect.objectContaining({ form_id: 'f1', form_number: 'TRF-001' }),
        })
      );
      // Staged flow: requestor is told to generate the return form next.
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'You Can Now Request a Return for Condition Checking',
          data: expect.objectContaining({
            transfer_form_id: 'f1',
            actionTarget: 'transfer_approved_generate_return',
          }),
        })
      );
      // Processors are NOT notified yet — they hear about it after the return is approved.
      const notifTitles = (createNotificationForApi as jest.Mock).mock.calls.map(
        (c: any[]) => c[0]?.title
      );
      expect(notifTitles).not.toContain('New Asset Transfer Request Received');
    });
  });

  describe('getAssetTransferFormsByUserHandler', () => {
    it('returns the linked return form state used by the requestor action button', async () => {
      req.params = { userId: 'u1' };
      formModel.findByUserId.mockResolvedValue([
        {
          formID: 'f1',
          form_number: 'TRF-001',
          user_id: 'u1',
          created_by: null,
          created_at: '2024-06-01T10:00:00.000Z',
          department_id: null,
          new_assigned_user_id: null,
          dept_head_signed_at: '2024-06-02T09:00:00.000Z',
          sub_approver_1_signed_at: null,
          return_form_id: null,
        },
      ]);
      pool.execute.mockResolvedValue([[], []]);

      await assetTransfersController.getAssetTransferFormsByUserHandler(req, res);

      expect(res._json.assetTransferForms).toHaveLength(1);
      expect(res._json.assetTransferForms[0]).toEqual(
        expect.objectContaining({
          formID: 'f1',
          dept_head_signed_at: '2024-06-02T09:00:00.000Z',
          return_form_id: null,
        })
      );
    });
  });

  describe('declineTransferFormHandler', () => {
    it('declines form successfully', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, user_id: 'u1', signed_at: '2024-01-01', dept_head_signed_at: null, return_form_id: null });
      pool.execute.mockResolvedValue([[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []]);
      isUserManagerApprover1.mockResolvedValue(false);
      await assetTransfersController.declineTransferFormHandler(req, res);
      expect(res._json.message).toContain('declined');
    });

    it('returns 400 when already declined', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, declined_at: '2024-01-01' });
      await assetTransfersController.declineTransferFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when executed', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue({ ...mockForm, executed_at: '2024-01-01' });
      await assetTransfersController.declineTransferFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      formModel.findById.mockResolvedValue(null);
      await assetTransfersController.declineTransferFormHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getTransferPendingApprovalsHandler', () => {
    it('scopes pending approvals to the approver own department for non-admin Manager Approver 1 users', async () => {
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      isUserManagerApprover1.mockResolvedValue(true);
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT department_id FROM users')) return [[{ department_id: 'd1' }], []];
        return [[], []];
      });
      await assetTransfersController.getTransferPendingApprovalsHandler(req, res);
      expect(isUserManagerApprover1).toHaveBeenCalledWith('u1');
      const deptFilterCall = (pool.execute as jest.Mock).mock.calls.find((c: any[]) =>
        String(c[0]).includes('transferer.department_id <=> ?')
      );
      expect(deptFilterCall).toBeDefined();
      expect(deptFilterCall[1]).toEqual(['d1', 10]);
    });

    it('shows all company forms for Global Admin without department filter', async () => {
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: true });
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT department_id FROM users')) return [[{ department_id: 'd1' }], []];
        return [[], []];
      });
      await assetTransfersController.getTransferPendingApprovalsHandler(req, res);
      expect(isUserManagerApprover1).not.toHaveBeenCalled();
      const deptFilterCall = (pool.execute as jest.Mock).mock.calls.find((c: any[]) =>
        String(c[0]).includes('transferer.department_id <=> ?')
      );
      expect(deptFilterCall).toBeUndefined();
    });
  });

  describe('uploadTransferConditionPhotoHandler', () => {
    it('uploads photo successfully', async () => {
      req.file = { buffer: Buffer.from('test') };
      uploadReturnConditionImageToCloudinary.mockResolvedValue('https://cloudinary.com/img.jpg');
      await assetTransfersController.uploadTransferConditionPhotoHandler(req, res);
      expect(res._json.url).toBeDefined();
    });

    it('returns 400 when no file', async () => {
      await assetTransfersController.uploadTransferConditionPhotoHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getTransferApprovedByMeHandler', () => {
    it('returns processed_by null for approved transfer without processor signature', async () => {
      const formRow = {
        formID: 'f1',
        form_number: 'TRF-001',
        user_id: 'u1',
        department_id: null,
        new_assigned_user_id: null,
        created_by: 'u1',
        created_at: '2024-06-01 09:00:00',
        signed_at: '2024-06-01 10:00:00',
        signed_by: 'u1',
        signed_digital_signature: 'sig',
        process_signed_at: null,
        process_digital_signature: null,
        processor_pending_signed_at: null,
        processor_pending_signature: null,
        transfer_type: 'Transfer Request',
        received_by: null,
        dept_head_signed_at: '2024-06-01 11:00:00',
        dept_head_digital_signature: 'sig',
        dept_head_signed_by: 'approver-1',
        it_manager_signed_at: null,
        it_manager_digital_signature: null,
        it_manager_signed_by: null,
      };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_transfer_forms')) return [[formRow], []];
        return [[], []];
      });
      await assetTransfersController.getTransferApprovedByMeHandler(req, res);
      expect(res._json.assetTransferForms[0].processed_by).toBeNull();
    });

    it('returns processor name when process_signed_at present', async () => {
      const formRow = {
        formID: 'f1',
        form_number: 'TRF-001',
        user_id: 'u1',
        department_id: null,
        new_assigned_user_id: null,
        created_by: 'proc-1',
        created_at: '2024-06-01 09:00:00',
        signed_at: '2024-06-01 10:00:00',
        signed_by: 'proc-1',
        signed_digital_signature: 'sig',
        process_signed_at: '2024-06-01 14:00:00',
        process_digital_signature: 'sig',
        processor_pending_signed_at: null,
        processor_pending_signature: null,
        transfer_type: 'IT Transfer',
        received_by: null,
        dept_head_signed_at: '2024-06-01 11:00:00',
        dept_head_digital_signature: 'sig',
        dept_head_signed_by: 'approver-1',
        it_manager_signed_at: null,
        it_manager_digital_signature: null,
        it_manager_signed_by: null,
      };
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_transfer_forms')) return [[formRow], []];
        if (sql.includes('SELECT userID, first_name, last_name FROM users')) {
          return [[{ userID: 'proc-1', first_name: 'Jane', last_name: 'Doe' }], []];
        }
        return [[], []];
      });
      await assetTransfersController.getTransferApprovedByMeHandler(req, res);
      expect(res._json.assetTransferForms[0].processed_by).toBe('Jane Doe');
    });
  });

  describe('runTransferFormExecution guard', () => {
    const executionOptions = {
      assetTransfers: [{ assignmentId: 'a1' }],
      newAssignment: { userId: 'u2', roomId: null, roomName: null, locationId: null },
    };
    const activeAssignmentRow = {
      assignmentID: 'a1',
      asset_id: '10',
      user_id: 'u1',
      department_id: 'd1',
      location_id: 'l1',
      location_room_id: null,
      status: 'Active',
    };

    it('blocks execution when linked return form is not yet processed by the processor', async () => {
      formModel.findById.mockResolvedValue({
        ...mockForm,
        signed_at: '2024-01-01',
        dept_head_signed_at: '2024-01-02',
        executed_at: null,
        return_form_id: 'rf1',
      });
      formModel.getFormAssignmentIds.mockResolvedValue(['a1']);
      pool.execute.mockResolvedValue([[activeAssignmentRow], []]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getBuilderItemsByAssetIds.mockResolvedValue([]);
      returnFormModel.findById.mockResolvedValue({
        formID: 'rf1',
        signed_at: '2024-01-01',
        process_signed_at: null,
        declined_at: null,
      });

      await expect(
        assetTransfersController.runTransferFormExecution(
          'f1',
          executionOptions as any,
          { req, processorId: 'u1' }
        )
      ).rejects.toThrow('Please process the return request first');
    });

    it('resolves the linked return form via repository lookup when stored proc lacks return_form_id', async () => {
      formModel.findById.mockResolvedValue({
        ...mockForm,
        signed_at: '2024-01-01',
        dept_head_signed_at: '2024-01-02',
        executed_at: null,
        return_form_id: undefined,
      });
      transferRepo.getReturnFormIdByTransferFormId.mockResolvedValue('rf1');
      formModel.getFormAssignmentIds.mockResolvedValue(['a1']);
      pool.execute.mockResolvedValue([[activeAssignmentRow], []]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getBuilderItemsByAssetIds.mockResolvedValue([]);
      returnFormModel.findById.mockResolvedValue({
        formID: 'rf1',
        signed_at: '2024-01-01',
        process_signed_at: null,
        declined_at: null,
      });

      await expect(
        assetTransfersController.runTransferFormExecution(
          'f1',
          executionOptions as any,
          { req, processorId: 'u1' }
        )
      ).rejects.toThrow('Please process the return request first');
      expect(transferRepo.getReturnFormIdByTransferFormId).toHaveBeenCalledWith('f1');
    });
  });

  describe('notifyTransferProcessedNotifications', () => {
    const baseParams = {
      formId: 'f1',
      formNumber: 'TRF-001',
      transferRequestorUserId: 'u1',
      processorUserId: 'u-proc',
      newOwnerUserId: 'u2',
      assetCodes: ['AST-001', 'AST-002'],
      createdAccountabilityForms: [
        { formID: 'af1', form_number: 'AC-001' },
      ],
    };

    it('notifies the new owner that the asset was assigned due to a transfer', async () => {
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Jane', last_name: 'Doe' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u-proc', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue([]);

      await assetTransfersController.notifyTransferProcessedNotifications(baseParams as any);

      const calls = createNotificationForApi.mock.calls.map((c: any) => c[0]);
      expect(calls.some((c: any) =>
        c.user_id === 'u2' &&
        c.title === 'New asset has been assigned to you due to a transfer' &&
        c.data.actionTarget === 'my_assets' &&
        c.data.route === '/my-assets'
      )).toBe(true);
    });

    it('notifies the new owner of the issued accountability form for signing', async () => {
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Jane', last_name: 'Doe' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u-proc', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue([]);

      await assetTransfersController.notifyTransferProcessedNotifications(baseParams as any);

      const calls = createNotificationForApi.mock.calls.map((c: any) => c[0]);
      expect(calls.some((c: any) =>
        c.user_id === 'u2' &&
        c.title === 'New accountability form has been issued' &&
        c.type === 'accountability_form' &&
        c.data.form_id === 'af1' &&
        c.data.form_number === 'AC-001'
      )).toBe(true);
    });

    it('notifies Manager Approver 2 users in the transfer form company/department and excludes the processor', async () => {
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Jane', last_name: 'Doe' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u-proc', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['u-ma2', 'u-proc']);

      await assetTransfersController.notifyTransferProcessedNotifications({
        ...baseParams,
        companyId: '10',
        departmentId: 'd1',
      } as any);

      expect(getManagerApprover2UserIdsForProcessedReturn).toHaveBeenCalledWith('10', 'd1');
      const calls = createNotificationForApi.mock.calls.map((c: any) => c[0]);
      expect(calls.some((c: any) =>
        c.user_id === 'u-ma2' &&
        c.title === 'An asset has been transferred, checked and verified' &&
        c.data.actionTarget === 'approvals' &&
        c.data.route === '/approvals?tab=receive'
      )).toBe(true);
      expect(calls.some((c: any) => c.user_id === 'u-proc' && c.title === 'An asset has been transferred, checked and verified')).toBe(false);
    });

    it('falls back to the processor company/department when form company/department is absent', async () => {
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Jane', last_name: 'Doe' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u-proc', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['u-ma2']);

      await assetTransfersController.notifyTransferProcessedNotifications(baseParams as any);

      expect(getManagerApprover2UserIdsForProcessedReturn).toHaveBeenCalledWith('10', 'd1');
    });
  });

  describe('getTransferHistoryHandler', () => {
    it('enriches executed and pending records with accountability form numbers', async () => {
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      pool.execute
        .mockResolvedValueOnce([
          [
            {
              record_id: 'r1',
              form_id: 'f1',
              form_number: 'TRF-001',
              assetID: '10',
              asset_code: 'AST-001',
              asset_name: 'Laptop',
              category_id: 'c1',
              from_user_id: 'u1',
              to_user_id: 'u2',
              from_first_name: 'John',
              from_last_name: 'Doe',
              to_first_name: 'Jane',
              to_last_name: 'Doe',
              from_department_name: 'IT',
              to_department_name: 'HR',
              processor_first_name: 'Proc',
              processor_last_name: 'One',
              transfer_condition: 'Good',
              transfer_notes: 'ok',
              condition_images: '[]',
              process_signed_at: '2026-01-02 10:00:00',
              created_at: '2026-01-02 09:00:00',
            },
          ],
          [],
        ])
        .mockResolvedValueOnce([
          [
            {
              form_id: 'f2',
              form_number: 'TRF-002',
              assignment_id: 'a2',
              assetID: '11',
              asset_code: 'AST-002',
              asset_name: 'Monitor',
              category_id: 'c1',
              from_user_id: 'u3',
              to_user_id: 'u4',
              from_first_name: 'Bob',
              from_last_name: 'Smith',
              to_first_name: 'Amy',
              to_last_name: 'Smith',
              from_department_name: 'Finance',
              to_department_name: 'IT',
              processor_first_name: 'Proc',
              processor_last_name: 'Two',
              transfer_condition: 'Good',
              transfer_notes: 'ok',
              condition_images: null,
              created_at: '2026-01-03 09:00:00',
            },
          ],
          [],
        ]);
      transferRepo.findAccountabilityFormForAsset
        .mockResolvedValue({ form_number: 'AF-TO-PENDING', created_at: '2026-01-03 12:00:00', user_id: 'u-proc', owner_first_name: 'Proc', owner_last_name: 'Two' })
        .mockResolvedValueOnce({ form_number: 'AF-FROM', created_at: '2026-01-01 00:00:00', user_id: 'u1', owner_first_name: 'John', owner_last_name: 'Doe' })
        .mockResolvedValueOnce({ form_number: 'AF-TO', created_at: '2026-01-02 12:00:00', user_id: 'u2', owner_first_name: 'Jane', owner_last_name: 'Doe' })
        .mockResolvedValueOnce({ form_number: 'AF-FROM', created_at: '2026-01-01 00:00:00', user_id: 'u1', owner_first_name: 'John', owner_last_name: 'Doe' });

      await assetTransfersController.getTransferHistoryHandler(req, res);

      const records = res._json.records;
      expect(records).toHaveLength(2);
      const executed = records.find((r: any) => r.formNumber === 'TRF-001');
      const pending = records.find((r: any) => r.formNumber === 'TRF-002');
      expect(executed.fromAccountabilityFormNumber).toBe('AF-FROM');
      expect(executed.toAccountabilityFormNumber).toBe('AF-TO');
      expect(pending.fromAccountabilityFormNumber).toBe('AF-FROM');
      expect(pending.toAccountabilityFormNumber).toBe('AF-TO-PENDING');
    });
  });
});

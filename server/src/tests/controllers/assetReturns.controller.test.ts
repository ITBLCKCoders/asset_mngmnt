import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetReturnsController from '../../controllers/assetReturns.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn(),
  },
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn(() => Promise.resolve()) }));
jest.mock('../../utils/accountabilityFormOnReturn.js', () => ({ handleAccountabilityFormOnAssetReturn: jest.fn(), createReturnAccountabilityFormAndNotify: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), classifyDepartmentScopeByName: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({ isUserManagerApprover1: jest.fn(), isUserManagerApprover2: jest.fn(), getManagerApprover1UserIdsInDepartmentAndCompany: jest.fn(), getManagerApprover2UserIdsForProcessedReturn: jest.fn(), getAssetRoleUsersForAssignmentsAndCompany: jest.fn(), isDesignatedApprover: jest.fn(), isDesignatedSubApprover: jest.fn(), getDesignatedApproverUserIdForRequester: jest.fn(), getDesignatedSubApproverUserIdForRequester: jest.fn() }));
jest.mock('../../services/userApprovers.service.js', () => ({ getRequestersAssignedToApprover: jest.fn() }));
jest.mock('../../utils/notificationsApi.js', () => ({ createNotificationForApi: jest.fn() }));
jest.mock('../../utils/responseWrapper.js', () => ({ createErrorResponse: jest.fn((res: any, error: any, errors: any, statusCode: any, message: any) => { res.status(statusCode).json({ error: message }); return res; }) }));
jest.mock('../../utils/returnFormNumber.js', () => ({ generateReturnFormNumber: jest.fn(), generateReturnFormNumberFallback: jest.fn() }));
jest.mock('../../utils/cloudinary.js', () => ({ uploadReturnConditionImageToCloudinary: jest.fn(), signedRawUrlFromStoredSecureUrl: jest.fn() }));
jest.mock('../../models/assetReturn.model.js', () => ({ AssetReturnModel: { create: jest.fn(), findByFormId: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findByUserId: jest.fn() } }));
jest.mock('../../models/assetReturnForm.model.js', () => ({
  AssetReturnFormModel: { create: jest.fn(), createWithReturnerSignature: jest.fn(), findById: jest.fn(), update: jest.fn(), updateApproval: jest.fn(), softDelete: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../../models/assetAssignment.model.js', () => ({ AssetAssignmentModel: { findById: jest.fn() } }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({
  isMysqlUnknownColumnError: jest.fn(),
  fetchAssetReturnFormsRowsForUserList: jest.fn(),
  fetchPendingDeptHeadApprovalFormRows: jest.fn(),
  fetchPendingDeptHeadApprovalFormRowsByCompany: jest.fn(),
  fetchUserPosition: jest.fn(),
  fetchUserDigitalSignature: jest.fn(),
  resolveProcessorReturnTarget: jest.fn(),
  ASSET_RETURN_FORMS_LIST_SQL_FULL: 'SELECT ...',
  ASSET_RETURN_FORMS_LIST_SQL_FALLBACK: 'SELECT ...',
  PENDING_DH_APPROVAL_FORMS_SQL_FULL: 'SELECT ...',
  PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT: 'SELECT ...',
  PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED: 'SELECT ...',
}));
jest.mock('../../dtos/assetReturns/processorDeclineReturnFormDto.js', () => ({
  processorDeclineReturnFormBodySchema: { safeParse: jest.fn(), parse: jest.fn() },
}));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({
  getTransferFormLinksForReturnForms: jest.fn(),
  getTransferFormByReturnFormId: jest.fn(),
  getTransferFormIdsByReturnFormId: jest.fn(),
  getTransferFormAssignments: jest.fn(),
  getActiveAssignmentsByIds: jest.fn(),
  getCategoryDepartmentsByAssetIds: jest.fn(),
  getDepartmentById: jest.fn(),
  getUserById: jest.fn(),
  getUserNamesById: jest.fn(),
  getUserNamesByIds: jest.fn(),
  getUserDepartmentId: jest.fn(),
  getReturnFormById: jest.fn(),
  getBuilderItemsByAssetIds: jest.fn(),
  getBuilderItemCount: jest.fn(),
  getAssetCodeByAssetId: jest.fn(),
  executeRawWrite: jest.fn(),
  findAccountabilityFormForAsset: jest.fn(),
}));
jest.mock('../../services/assetReturn.service.js', () => ({ resolveReturnFormContext: jest.fn() }));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({ createAccountabilityFormHandler: jest.fn(), kickoffApprovalFlowNotifications: jest.fn() }));
jest.mock('../../controllers/assetTransfers.controller.js', () => ({ runTransferFormExecution: jest.fn() }));

const { pool } = jest.requireMock('../../db.js') as {
  pool: { execute: jest.Mock; getConnection: jest.Mock };
};
const transactionConnection = {
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};
const returnModel = jest.requireMock('../../models/assetReturn.model.js').AssetReturnModel as jest.Mock;
const returnFormModel = jest.requireMock('../../models/assetReturnForm.model.js').AssetReturnFormModel as jest.Mock;
const { getAssetScope, classifyDepartmentScopeByName } = jest.requireMock('../../utils/assetScope.js') as { getAssetScope: jest.Mock; classifyDepartmentScopeByName: jest.Mock };
const { createAccountabilityFormHandler } = jest.requireMock('../../controllers/accountabilityForms.controller.js') as { createAccountabilityFormHandler: jest.Mock };
const { createReturnAccountabilityFormAndNotify } = jest.requireMock(
  '../../utils/accountabilityFormOnReturn.js'
) as { createReturnAccountabilityFormAndNotify: jest.Mock };
const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js') as Record<string, jest.Mock>;
const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js') as Record<string, jest.Mock>;
const { isUserManagerApprover1, getManagerApprover1UserIdsInDepartmentAndCompany, getManagerApprover2UserIdsForProcessedReturn, getAssetRoleUsersForAssignmentsAndCompany } = jest.requireMock('../../utils/approverNotifications.js') as { isUserManagerApprover1: jest.Mock; getManagerApprover1UserIdsInDepartmentAndCompany: jest.Mock; getManagerApprover2UserIdsForProcessedReturn: jest.Mock; getAssetRoleUsersForAssignmentsAndCompany: jest.Mock };
const { isDesignatedApprover, isDesignatedSubApprover, getDesignatedApproverUserIdForRequester, getDesignatedSubApproverUserIdForRequester } = jest.requireMock('../../utils/approverNotifications.js');
const { getRequestersAssignedToApprover } = jest.requireMock('../../services/userApprovers.service.js');
const { createNotificationForApi } = jest.requireMock('../../utils/notificationsApi.js') as { createNotificationForApi: jest.Mock };
const { generateReturnFormNumber, generateReturnFormNumberFallback } = jest.requireMock('../../utils/returnFormNumber.js') as { generateReturnFormNumber: jest.Mock; generateReturnFormNumberFallback: jest.Mock };
const { createErrorResponse } = jest.requireMock('../../utils/responseWrapper.js') as { createErrorResponse: jest.Mock };

const mockAssignment = { assignmentID: 'a1', asset_id: '10', user_id: 'u1', department_id: 'd1', location_id: 'l1', location_room_id: 'lr1', status: 'Active' };
const defaultScope = { companyId: 10, departmentIds: null, isSuperAdmin: false };

describe('assetReturns.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: 'u1' } };
    res = createMockRes();
    pool.getConnection.mockResolvedValue(transactionConnection);
    transactionConnection.execute.mockResolvedValue([[], []]);
    transactionConnection.beginTransaction.mockResolvedValue(undefined);
    transactionConnection.commit.mockResolvedValue(undefined);
    transactionConnection.rollback.mockResolvedValue(undefined);
    const { createAuditLog } = jest.requireMock('../../utils/audit.js') as { createAuditLog: jest.Mock };
    createAuditLog.mockResolvedValue(undefined);
    getAssetRoleUsersForAssignmentsAndCompany.mockResolvedValue([]);
    transferRepo.getTransferFormIdsByReturnFormId.mockResolvedValue([]);
    isDesignatedApprover.mockResolvedValue(false);
    isDesignatedSubApprover.mockResolvedValue(false);
    getDesignatedApproverUserIdForRequester.mockResolvedValue(null);
    getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
    getRequestersAssignedToApprover.mockResolvedValue([]);
  });

  describe('submitAssetReturnRequestHandler', () => {
    it('submits return request successfully', async () => {
      req.body = { assignmentIds: ['a1', 'a2'], returnType: 'Returned', digitalSignature: 'sig-data' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([mockAssignment, { ...mockAssignment, assignmentID: 'a2' }]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1', assetID: '10' }]);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'f1', form_number: 'RET-001' });
      returnModel.create.mockResolvedValue({ return_id: 'r1' });
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formID).toBe('f1');
      expect(res._json.forms).toHaveLength(1);
    });

    it('notifies the dept-head approvers returned by the approval scope lookup', async () => {
      req.body = { assignmentIds: ['a1'], returnType: 'Returned', digitalSignature: 'sig-data' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([mockAssignment]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1', assetID: '10' }]);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'f1', form_number: 'RET-001' });
      returnModel.create.mockResolvedValue({ return_id: 'r1' });
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u-dept-head', 'u-company-admin']);
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Finance', last_name: 'Employee' });
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-dept-head',
          title: 'Asset Return Request Approval Needed',
          message: 'Finance Employee has submitted an asset return request for 1 asset and requires your approval.',
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u-company-admin' })
      );
      expect(getManagerApprover1UserIdsInDepartmentAndCompany).toHaveBeenCalledWith('d1', '10');
    });

    it('notifies approvers in the returner department when asset category department differs', async () => {
      req.body = { assignmentIds: ['a1'], returnType: 'Returned', digitalSignature: 'sig-data' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ ...mockAssignment, asset_id: 'it-asset' }]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'dept-it', assetID: 'it-asset' }]);
      transferRepo.getUserDepartmentId.mockResolvedValue('dept-user');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'f1', form_number: 'RET-001' });
      returnModel.create.mockResolvedValue({ return_id: 'r1' });
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(getManagerApprover1UserIdsInDepartmentAndCompany).toHaveBeenCalledWith('dept-user', '10');
    });

    it('creates separate return forms for different departments', async () => {
      req.body = { assignmentIds: ['a1', 'a2'], returnType: 'Returned', digitalSignature: 'sig-data' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([
        { ...mockAssignment, assignmentID: 'a1', asset_id: 'asset-it' },
        { ...mockAssignment, assignmentID: 'a2', asset_id: 'asset-admin' },
      ]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([
        { departmentID: 'dept-it', assetID: 'asset-it' },
        { departmentID: 'dept-admin', assetID: 'asset-admin' },
      ]);
      transferRepo.getUserDepartmentId.mockResolvedValue('dept-user');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber
        .mockResolvedValueOnce('RET-IT-001')
        .mockResolvedValueOnce('RET-ADMIN-001');
      returnFormModel.createWithReturnerSignature
        .mockResolvedValueOnce({ formID: 'f-it', form_number: 'RET-IT-001' })
        .mockResolvedValueOnce({ formID: 'f-admin', form_number: 'RET-ADMIN-001' });
      returnModel.create.mockResolvedValue({ return_id: 'r1' });
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.forms).toHaveLength(2);
      expect(res._json.forms[0].formID).toBe('f-it');
      expect(res._json.forms[1].formID).toBe('f-admin');
      expect(returnFormModel.createWithReturnerSignature).toHaveBeenCalledTimes(2);
      expect(returnModel.create).toHaveBeenCalledTimes(2);
    });

    it('returns 400 when returnType invalid', async () => {
      req.body = { assignmentIds: ['a1'], returnType: 'InvalidType' };
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when assignmentIds missing', async () => {
      req.body = { returnType: 'Returned' };
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when assignments not found', async () => {
      req.body = { assignmentIds: ['a1'], returnType: 'Returned' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when not own assignment', async () => {
      req.body = { assignmentIds: ['a1'], returnType: 'Returned' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ ...mockAssignment, user_id: 'other_user' }]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('signAssetReturnFormHandler', () => {
    it('signs form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig-data' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: null, owner_absent: 0 });
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._json.message).toContain('signed');
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue(null);
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 400 when already signed', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', user_id: 'u1', signed_at: '2024-01-01', owner_absent: 0 });
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when wrong user', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', user_id: 'other_user', signed_at: null, owner_absent: 0 });
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('notifies Manager Approver 1 users after the returner signs the form', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig-data' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: null, owner_absent: 0, company_id: '10', department_id: 'd1' });
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      returnModel.findByFormId.mockResolvedValue([{ return_id: 'r1' }, { return_id: 'r2' }]);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u-ma1']);
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._json.message).toContain('signed');
      expect(getManagerApprover1UserIdsInDepartmentAndCompany).toHaveBeenCalledWith('d1', '10');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-ma1',
          title: 'Asset Return Request Approval Needed',
          message:
            'John Doe has signed the asset return form for 2 assets and requires your approval.',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'RET-001',
            asset_count: 2,
            route: '/approvals',
            actionTarget: 'return_request_approval',
          }),
        })
      );
    });

    it('counts linked transfer form assignments for held transfers (no asset_returns rows yet)', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig-data' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: null, owner_absent: 0, company_id: '10', department_id: 'd1' });
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      returnModel.findByFormId.mockResolvedValue([]);
      transferRepo.getTransferFormIdsByReturnFormId.mockResolvedValue(['tf1']);
      transferRepo.getTransferFormAssignments.mockResolvedValue([{ assignment_id: 'a1' }, { assignment_id: 'a2' }, { assignment_id: 'a3' }]);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u-ma1']);
      await assetReturnsController.signAssetReturnFormHandler(req, res);
      expect(res._json.message).toContain('signed');
      expect(transferRepo.getTransferFormIdsByReturnFormId).toHaveBeenCalledWith('f1');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-ma1',
          title: 'Asset Return Request Approval Needed',
          message:
            'John Doe has signed the asset return form for 3 assets and requires your approval.',
          data: expect.objectContaining({
            form_id: 'f1',
            asset_count: 3,
            actionTarget: 'return_request_approval',
          }),
        })
      );
    });
  });

  describe('approveReturnFormHandler', () => {
    it('approves form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: '2024-01-01', company_id: '10', dept_head_signed_at: null, process_signed_at: null, received_by: null, owner_absent: 0, department_id: 'd1' });
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (sql.includes('SELECT formID')) return [[], []];
        if (sql.includes('SELECT DISTINCT u.userID')) return [[], []];
        if (sql.includes('SELECT arf.formID')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });
      await assetReturnsController.approveReturnFormHandler(req, res);
      expect(res._json.message).toContain('approved');
    });

    it('notifies the requestor to return an approved IT asset for processing', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
        user_id: 'u-requestor',
        signed_at: '2024-01-01',
        company_id: '10',
        dept_head_signed_at: null,
        process_signed_at: null,
        received_by: null,
        owner_absent: 0,
        department_id: 'dept-it',
      });
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT module_name')) {
          return [[
            { module_name: 'Approvals', permission_type: 'create', granted: 1 },
            { module_name: 'Approvals', permission_type: 'edit', granted: 1 },
          ], []];
        }
        return [[], []];
      });
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      getAssetScope.mockResolvedValue({ companyId: '10', departmentIds: null, isSuperAdmin: false, isAdmin: false });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Approver', last_name: 'User' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'Information Technology' });
      classifyDepartmentScopeByName.mockReturnValue('IT');

      await assetReturnsController.approveReturnFormHandler(req, res);

      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-requestor',
          title: 'Return Asset Now',
          message: expect.stringContaining('IT Department'),
          data: expect.objectContaining({
            form_id: 'f1',
            asset_scope: 'IT',
            destination_department: 'IT',
            actionTarget: 'return_asset_now',
          }),
        })
      );
    });

    it('returns 400 when form not signed', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', user_id: 'u1', signed_at: null, dept_head_signed_at: null, owner_absent: 0 });
      pool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT module_name')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(true);
      await assetReturnsController.approveReturnFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue(null);
      await assetReturnsController.approveReturnFormHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('auto-approves a linked, not-yet-approved transfer form when approving a return', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: '2024-01-01', company_id: '10', dept_head_signed_at: null, process_signed_at: null, received_by: null, owner_absent: 0, department_id: 'd1' });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT formID')) return [[{ formID: 'tf1', form_number: 'TRF-001', dept_head_signed_at: null, process_signed_at: null, process_digital_signature: null, processor_pending_signature: null, processor_pending_signed_at: null, executed_at: null, new_assigned_user_id: 'u2', department_id: 'd1', location_id: null, location_room_id: null, transfer_type: null, received_by: null }], []];
        if (s.includes('SELECT DISTINCT u.userID')) return [[], []];
        if (s.includes('SELECT arf.formID')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });
      await assetReturnsController.approveReturnFormHandler(req, res);
      expect(res._json.message).toContain('approved');
      const transferUpdateCall = (pool.execute as jest.Mock).mock.calls.find((c: any[]) =>
        String(c[0]).includes('UPDATE asset_transfer_forms')
      );
      expect(transferUpdateCall).toBeDefined();
      expect(transferUpdateCall[1]).toEqual(['sig', 'u1', 'tf1']);
      // Requester is notified that BOTH the transfer and the return were approved
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset Return Request Approved',
          data: expect.objectContaining({
            form_id: 'f1',
            actionTarget: 'return_request_approved',
          }),
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset Transfer Request Approved',
          data: expect.objectContaining({
            form_id: 'tf1',
            form_number: 'TRF-001',
            actionTarget: 'transfer_request_approved',
          }),
        })
      );
    });

    it('notifies IT/Admin asset role users about the return and its linked transfer', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', signed_at: '2024-01-01', company_id: '10', dept_head_signed_at: null, process_signed_at: null, received_by: null, owner_absent: 0, department_id: 'd1' });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT formID')) return [[{ formID: 'tf1', form_number: 'TRF-001', dept_head_signed_at: null, process_signed_at: null, process_digital_signature: null, processor_pending_signature: null, processor_pending_signed_at: null, executed_at: null, new_assigned_user_id: 'u2', department_id: 'd1', location_id: null, location_room_id: null, transfer_type: null, received_by: null }], []];
        if (s.includes('SELECT arf.formID')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });
      getAssetRoleUsersForAssignmentsAndCompany.mockResolvedValue([{ userID: 'u-it', first_name: 'IT', last_name: 'User' }]);
      await assetReturnsController.approveReturnFormHandler(req, res);
      expect(res._json.message).toContain('approved');
      expect(getAssetRoleUsersForAssignmentsAndCompany).toHaveBeenCalledWith('10', [], 'IT');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-it',
          title: 'New Asset Return Request Received',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'RET-001',
            actionTarget: 'asset_return_requests',
          }),
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-it',
          title: 'New Asset Transfer Request Received',
          message: expect.stringContaining('process the return first'),
          data: expect.objectContaining({
            form_id: 'tf1',
            form_number: 'TRF-001',
            actionTarget: 'asset_transfer_requests',
          }),
        })
      );
    });

    it('notifies Manager Approver 2 when approving a processor-initiated hold form', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
        user_id: 'u-returner',
        signed_at: '2024-01-01',
        company_id: '10',
        dept_head_signed_at: null,
        process_signed_at: '2024-01-02 10:00:00',
        process_digital_signature: 'proc-sig',
        received_by: 'u1',
        owner_absent: 0,
        department_id: 'd1',
      });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name')) return [[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []];
        if (s.includes('SELECT formID')) return [[], []];
        if (s.includes('SELECT DISTINCT u.userID')) return [[], []];
        if (s.includes('SELECT arf.formID')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      returnModel.findByFormId.mockResolvedValue([]);
      transferRepo.getUserNamesById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'u1'
            ? { first_name: 'Jane', last_name: 'Processor' }
            : { first_name: 'John', last_name: 'Returner' }
        )
      );
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['mgr2-1']);
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });

      await assetReturnsController.approveReturnFormHandler(req, res);

      expect(res._json.message).toContain('approved');
      expect(getManagerApprover2UserIdsForProcessedReturn).toHaveBeenCalledWith(
        '10',
        'd1'
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'mgr2-1',
          title: 'An asset has been returned, checked and verified',
          message:
            'Jane Processor has processed return request of John Returner and is now for your review and signature.',
          data: expect.objectContaining({
            form_id: 'f1',
            route: '/approvals?tab=receive',
            actionTarget: 'approvals',
          }),
        })
      );
    });

    it('notifies the initiating processor and returner that a hold return is processed and skips the new-request broadcast', async () => {
      req.params = { formId: 'f1' };
      req.body = { digitalSignature: 'sig' };
      transferRepo.getReturnFormById.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
        user_id: 'u-returner',
        signed_at: '2024-01-01',
        company_id: '10',
        dept_head_signed_at: null,
        process_signed_at: '2024-01-02 10:00:00',
        process_digital_signature: 'proc-sig',
        received_by: 'u1',
        owner_absent: 0,
        department_id: 'd1',
      });
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT module_name'))
          return [
            [
              { module_name: 'Approvals', permission_type: 'create', granted: 1 },
              { module_name: 'Approvals', permission_type: 'edit', granted: 1 },
            ],
            [],
          ];
        if (s.includes('SELECT formID')) return [[], []];
        if (s.includes('SELECT DISTINCT u.userID'))
          return [
            [{ userID: 'u-other', first_name: 'Other', last_name: 'Admin' }],
            [],
          ];
        if (s.includes('SELECT arf.formID')) return [[], []];
        return [[], []];
      });
      isUserManagerApprover1.mockResolvedValue(false);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      returnModel.findByFormId.mockResolvedValue([]);
      transferRepo.getUserNamesById.mockResolvedValue({
        first_name: 'John',
        last_name: 'Returner',
      });
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['mgr2-1']);
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'IT' });

      await assetReturnsController.approveReturnFormHandler(req, res);

      expect(res._json.message).toContain('approved');
      // The initiating processor is notified the return is processed
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          title: 'Asset return processed',
          message:
            'The asset return you initiated has been approved and is now processed.',
          data: expect.objectContaining({
            form_id: 'f1',
            route: '/assets/return',
            actionTarget: 'asset_return_requests',
          }),
        })
      );
      // The returner is also notified the return is now processed
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-returner',
          title: 'Asset return processed',
          message: 'Your asset return has been processed.',
          data: expect.objectContaining({
            form_id: 'f1',
            route: '/profile?tab=documents&docTab=returns',
            actionTarget: 'my_return_requests',
          }),
        })
      );
      // No "New Asset Return Request Received" broadcast is sent in the hold flow
      expect(createNotificationForApi).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Asset Return Request Received',
        })
      );
    });
  });

  describe('declineReturnFormHandler', () => {
    it('declines form successfully', async () => {
      req.params = { formId: 'f1' };
      req.body = { declineReason: 'Missing items' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', form_number: 'RET-001', user_id: 'u1', declined_at: null });
      pool.execute.mockResolvedValue([[{ module_name: 'Approvals', permission_type: 'create', granted: 1 }, { module_name: 'Approvals', permission_type: 'edit', granted: 1 }], []]);
      isUserManagerApprover1.mockResolvedValue(false);
      transferRepo.getTransferFormIdsByReturnFormId.mockResolvedValue([]);
      await assetReturnsController.declineReturnFormHandler(req, res);
      expect(res._json.message).toContain('declined');
    });

    it('returns 400 when already declined', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue({ formID: 'f1', user_id: 'u1', declined_at: '2024-01-01' });
      await assetReturnsController.declineReturnFormHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when form not found', async () => {
      req.params = { formId: 'f1' };
      transferRepo.getReturnFormById.mockResolvedValue(null);
      await assetReturnsController.declineReturnFormHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getPendingApprovalsHandler', () => {
    it('scopes pending approvals to the approver own department for non-admin Manager Approver 1 users', async () => {
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      isUserManagerApprover1.mockResolvedValue(true);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      returnRepo.fetchPendingDeptHeadApprovalFormRows.mockResolvedValue([]);
      returnRepo.fetchPendingDeptHeadApprovalFormRowsByCompany.mockResolvedValue([]);
      await assetReturnsController.getPendingApprovalsHandler(req, res);
      expect(returnRepo.fetchPendingDeptHeadApprovalFormRows).toHaveBeenCalledWith('d1', 10);
      expect(returnRepo.fetchPendingDeptHeadApprovalFormRowsByCompany).not.toHaveBeenCalled();
    });

    it('shows all company forms for Global Admin', async () => {
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: true });
      isUserManagerApprover1.mockResolvedValue(true);
      returnRepo.fetchPendingDeptHeadApprovalFormRows.mockResolvedValue([]);
      returnRepo.fetchPendingDeptHeadApprovalFormRowsByCompany.mockResolvedValue([]);
      await assetReturnsController.getPendingApprovalsHandler(req, res);
      expect(returnRepo.fetchPendingDeptHeadApprovalFormRowsByCompany).toHaveBeenCalledWith(10);
      expect(returnRepo.fetchPendingDeptHeadApprovalFormRows).not.toHaveBeenCalled();
    });
  });

  describe('uploadConditionPhotoHandler', () => {
    it('uploads photo successfully', async () => {
      req.file = { buffer: Buffer.from('test'), mimetype: 'image/jpeg', originalname: 'photo.jpg' };
      const { uploadReturnConditionImageToCloudinary } = jest.requireMock('../../utils/cloudinary.js') as { uploadReturnConditionImageToCloudinary: jest.Mock };
      uploadReturnConditionImageToCloudinary.mockResolvedValue('https://cloudinary.com/img.jpg');
      await assetReturnsController.uploadConditionPhotoHandler(req, res);
      expect(res._json.url).toBeDefined();
    });

    it('returns 400 when no file', async () => {
      await assetReturnsController.uploadConditionPhotoHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('resolveReturnProcessorFieldsForBatch', () => {
    it('resolves processed_by from process_signed_by when present', async () => {
      const processorNames = new Map<string, string>([
        ['proc-1', 'Jane Processor'],
        ['emp-1', 'Erin Employee'],
      ]);
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            created_by: 'emp-1',
            process_signed_at: '2024-06-01 10:00:00',
            process_digital_signature: 'sig',
            process_signed_by: 'proc-1',
          },
          { processorNames, linkedTransfer: null }
        );
      expect(fields.processed_by).toBe('Jane Processor');
    });

    it('leaves processed_by empty when process_signed_by is missing', async () => {
      const processorNames = new Map<string, string>([
        ['emp-1', 'Erin Employee'],
      ]);
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            created_by: 'emp-1',
            process_signed_at: '2024-06-01 10:00:00',
            process_digital_signature: 'sig',
            process_signed_by: null,
          },
          { processorNames, linkedTransfer: null }
        );
      expect(fields.processed_by).toBe('');
    });

    it('leaves processed_by empty for a transfer-linked return with no processor signature', async () => {
      const processorNames = new Map<string, string>([
        ['emp-1', 'Erin Employee'],
        ['tf-creator', 'Trent Transferrer'],
      ]);
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            created_by: 'emp-1',
            process_signed_at: null,
            process_digital_signature: null,
            process_signed_by: null,
          },
          {
            processorNames,
            linkedTransfer: {
              created_by: 'tf-creator',
              process_signed_at: null,
              process_digital_signature: null,
              processor_pending_signed_at: null,
              processor_pending_signature: null,
            },
          }
        );
      expect(fields.processed_by).toBe('');
    });

    it('resolves process_signed_by name from getUserNamesById when not cached', async () => {
      const processorNames = new Map<string, string>();
      transferRepo.getUserNamesById.mockResolvedValue({
        first_name: 'Jane',
        last_name: 'Processor',
      });
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            created_by: 'emp-1',
            process_signed_at: '2024-06-01 10:00:00',
            process_digital_signature: 'sig',
            process_signed_by: 'proc-1',
          },
          { processorNames, linkedTransfer: null }
        );
      expect(fields.processed_by).toBe('Jane Processor');
      expect(transferRepo.getUserNamesById).toHaveBeenCalledWith('proc-1');
    });

    it('does not resolve the returner as the processor when created_by equals the returner', async () => {
      const processorNames = new Map<string, string>([
        ['emp-1', 'Erin Employee'],
      ]);
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            user_id: 'emp-1',
            created_by: 'emp-1',
            process_signed_at: '2024-06-01 10:00:00',
            process_digital_signature: null,
            process_signed_by: null,
          },
          {
            processorNames,
            linkedTransfer: {
              created_by: 'emp-1',
              process_signed_at: '2024-06-01 10:00:00',
              process_digital_signature: null,
              processor_pending_signed_at: null,
              processor_pending_signature: null,
            },
          }
        );
      expect(fields.processed_by).toBe('');
      expect(returnRepo.fetchUserDigitalSignature).not.toHaveBeenCalled();
    });

    it('resolves the processor from process_signed_by even when created_by equals the returner', async () => {
      const processorNames = new Map<string, string>([
        ['emp-1', 'Erin Employee'],
        ['proc-1', 'Jane Processor'],
      ]);
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('sig');
      const fields =
        await assetReturnsController.resolveReturnProcessorFieldsForBatch(
          {
            formID: 'f1',
            user_id: 'emp-1',
            created_by: 'emp-1',
            process_signed_at: '2024-06-01 10:00:00',
            process_digital_signature: null,
            process_signed_by: 'proc-1',
          },
          { processorNames, linkedTransfer: null }
        );
      expect(fields.processed_by).toBe('Jane Processor');
      expect(returnRepo.fetchUserDigitalSignature).toHaveBeenCalledWith(
        'proc-1'
      );
    });
  });

  describe('createAssetReturnHandler', () => {
    it('notifies Manager Approver 2 users in the asset scope department', async () => {
      req.body = {
        assetReturns: [{ assignmentId: 'a1', condition: 'Good' }],
        returnType: 'Returned',
      };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([
        { ...mockAssignment, user_id: 'u-returner' },
      ]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([
        { departmentID: 'd1', assetID: '10' },
      ]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.create.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
      });
      returnModel.create.mockResolvedValue({ return_id: 'r1' });
      transferRepo.getAssetCodeByAssetId.mockResolvedValue({
        asset_code: 'AST-001',
      });
      transferRepo.getBuilderItemsByAssetIds.mockResolvedValue([]);
      returnRepo.fetchUserPosition.mockResolvedValue('IT Staff');
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('sp_mark_assignment_returned')) return [[]];
        if (s.includes('SELECT ab.builderID')) return [[]];
        if (s.includes('FROM asset_mngmnt_locations')) return [[]];
        if (s.includes('FROM asset_mngmnt_location_rooms')) return [[]];
        return [[]];
      });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getUserNamesById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'u1'
            ? { first_name: 'Jane', last_name: 'Processor' }
            : { first_name: 'John', last_name: 'Returner' }
        )
      );
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['mgr2-1']);

      await assetReturnsController.createAssetReturnHandler(req, res);

      expect(res._status).toBe(201);
      expect(getManagerApprover2UserIdsForProcessedReturn).toHaveBeenCalledWith(
        '10',
        'd1'
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'mgr2-1',
          title: 'An asset has been returned, checked and verified',
          message:
            'Jane Processor has processed return request of John Returner and is now for your review and signature.',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'RET-001',
            processor_name: 'Jane Processor',
            return_requestor_name: 'John Returner',
            route: '/approvals?tab=receive',
            actionTarget: 'approvals',
          }),
        })
      );
    });

    it('notifies asset owners to sign when a return is initialized (hold flow, owner not absent)', async () => {
      req.body = {
        assetReturns: [{ assignmentId: 'a1', condition: 'Good' }],
        returnType: 'Returned',
        assignToProcessor: true,
      };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([
        { ...mockAssignment, user_id: 'u-owner', asset_id: '10' },
      ]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([
        { departmentID: 'd1', assetID: '10' },
      ]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.create.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
      });
      returnModel.create.mockResolvedValue({
        return_id: 'r1',
        assignment_id: 'a1',
        user_id: 'u-owner',
        return_condition: 'Good',
        return_notes: '',
        created_at: '2024-01-01 00:00:00',
      });
      transferRepo.getAssetCodeByAssetId.mockResolvedValue({
        asset_code: 'AST-001',
      });
      transferRepo.getBuilderItemsByAssetIds.mockResolvedValue([]);
      returnRepo.fetchUserPosition.mockResolvedValue('IT Staff');
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      pool.execute.mockResolvedValue([[]]);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');

      await assetReturnsController.createAssetReturnHandler(req, res);

      expect(res._status).toBe(201);
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-owner',
          title: 'An asset return has been initialized',
          message:
            'Your assets are being returned. Sign your return form to process this return.',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'RET-001',
            route: '/profile?tab=documents&docTab=returns',
            actionTarget: 'my_return_requests',
          }),
        })
      );
    });

    it('does not notify asset owners when the owner is marked absent (hold flow)', async () => {
      req.body = {
        assetReturns: [{ assignmentId: 'a1', condition: 'Good' }],
        returnType: 'Returned',
        assignToProcessor: true,
        ownerAbsent: true,
      };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([
        { ...mockAssignment, user_id: 'u-owner', asset_id: '10' },
      ]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([
        { departmentID: 'd1', assetID: '10' },
      ]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      generateReturnFormNumber.mockResolvedValue('RET-001');
      returnFormModel.create.mockResolvedValue({
        formID: 'f1',
        form_number: 'RET-001',
      });
      returnModel.create.mockResolvedValue({
        return_id: 'r1',
        assignment_id: 'a1',
        user_id: 'u-owner',
        return_condition: 'Good',
        return_notes: '',
        created_at: '2024-01-01 00:00:00',
      });
      transferRepo.getAssetCodeByAssetId.mockResolvedValue({
        asset_code: 'AST-001',
      });
      transferRepo.getBuilderItemsByAssetIds.mockResolvedValue([]);
      returnRepo.fetchUserPosition.mockResolvedValue('IT Staff');
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      pool.execute.mockResolvedValue([[]]);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue([
        'u-dept-head',
      ]);
      transferRepo.getUserNamesById.mockResolvedValue({
        first_name: 'Owner',
        last_name: 'Absent',
      });

      await assetReturnsController.createAssetReturnHandler(req, res);

      expect(res._status).toBe(201);
      // The absent owner should not receive the generic "initialized" notification.
      expect(createNotificationForApi).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'An asset return has been initialized',
        })
      );
      // The owner's Manager Approver 1 is routed for approval and notified.
      expect(
        getManagerApprover1UserIdsInDepartmentAndCompany
      ).toHaveBeenCalledWith('d1', '10');
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-dept-head',
          title: 'Asset Return Request Approval Needed',
        })
      );
    });
  });

  describe('processReturnFormHandler', () => {
    it('notifies Manager Approver 2 users in the asset scope department after processing', async () => {
      req.params = { formId: 'f1' };
      req.body = { returnType: 'Returned' };
      const formRow = {
        formID: 'f1',
        form_number: 'RET-001',
        user_id: 'u-returner',
        department_id: 'd1',
        form_company_id: 10,
        dept_head_signed_at: '2024-01-01 00:00:00',
        process_signed_at: null,
        process_digital_signature: null,
        process_signed_by: null,
        declined_at: null,
        processor_declined_at: null,
        received_by: null,
        return_type: 'Returned',
        owner_absent: 0,
        process_user_position: null,
      };
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('FROM asset_assignments WHERE assignmentID IN'))
          return [[]];
        if (s.includes('SELECT COUNT(*) as cnt')) return [[{ cnt: 0 }]];
        return [[formRow]];
      });
      getAssetScope.mockResolvedValue({
        companyId: 10,
        departmentIds: null,
        isSuperAdmin: false,
      });
      returnRepo.fetchUserPosition.mockResolvedValue('IT Staff');
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      returnModel.findByFormId.mockResolvedValue([]);
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getUserNamesById.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'u1'
            ? { first_name: 'Jane', last_name: 'Processor' }
            : { first_name: 'John', last_name: 'Returner' }
        )
      );
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue(['mgr2-1']);

      await assetReturnsController.processReturnFormHandler(req, res);

      expect(getManagerApprover2UserIdsForProcessedReturn).toHaveBeenCalledWith(
        10,
        'd1'
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'mgr2-1',
          title: 'An asset has been returned, checked and verified',
          message:
            'Jane Processor has processed return request of John Returner and is now for your review and signature.',
          data: expect.objectContaining({
            form_id: 'f1',
            form_number: 'RET-001',
            processor_name: 'Jane Processor',
            return_requestor_name: 'John Returner',
            route: '/approvals?tab=receive',
            actionTarget: 'approvals',
          }),
        })
      );
    });

    it('passes the processor asset scope to the accountability copy-signing flow', async () => {
      req.params = { formId: 'f1' };
      req.body = {
        processSignature: { digital_signature: 'processor-sig' },
        assetReturns: [{ assignmentId: 'a1', condition: 'Good' }],
        assignToProcessor: true,
        receivedBy: 'u1',
      };
      const formRow = {
        formID: 'f1',
        form_number: 'RET-001',
        user_id: 'u-returner',
        department_id: 'd1',
        form_company_id: 10,
        dept_head_signed_at: '2024-01-01 00:00:00',
        process_signed_at: null,
        process_digital_signature: null,
        process_signed_by: null,
        declined_at: null,
        processor_declined_at: null,
        received_by: null,
        return_type: 'Returned',
        owner_absent: 0,
        process_user_position: null,
      };
      const assignmentRow = {
        ...mockAssignment,
        asset_id: 'asset-it',
      };
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('FROM asset_assignments WHERE assignmentID IN')) return [[assignmentRow]];
        if (s.includes('SELECT assetID, asset_code FROM assets')) return [[{ assetID: 'asset-it', asset_code: 'AST-001' }]];
        if (s.includes('FROM asset_builder_items abi')) return [[]];
        if (s.includes('FROM assets a') && s.includes('WHERE a.assetID IN')) {
          return [[{
            assetID: 'asset-it',
            asset_code: 'AST-001',
            name: 'Laptop',
            category_name: 'Computers',
            type_name: 'Laptop',
            department_name: 'Information Technology',
            department_id: 'd-it',
          }]];
        }
        if (s.includes('SELECT department_id, location_id FROM asset_assignments')) {
          return [[{ department_id: 'd-it', location_id: 'l1' }]];
        }
        if (s.includes('SELECT COUNT(*) as cnt')) return [[{ cnt: 1 }]];
        return [[formRow]];
      });
      classifyDepartmentScopeByName.mockReturnValue('IT');
      getAssetScope.mockResolvedValue({ companyId: 10, departmentIds: null, isSuperAdmin: false });
      returnRepo.fetchUserPosition.mockResolvedValue('IT Staff');
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('processor-sig');
      returnRepo.resolveProcessorReturnTarget.mockResolvedValue(null);
      transferRepo.getBuilderItemCount.mockResolvedValue(0);
      returnModel.findByFormId.mockResolvedValue([{ return_id: 'r1', assignment_id: 'a1', return_department_id: null, return_location_id: null, return_location_room_id: null }]);
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ assetID: 'asset-it', departmentID: 'd-it' }]);
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'Jane', last_name: 'Processor' });
      transferRepo.getDepartmentById.mockResolvedValue({ name: 'Information Technology' });
      getManagerApprover2UserIdsForProcessedReturn.mockResolvedValue([]);

      await assetReturnsController.processReturnFormHandler(req, res);

      expect(createReturnAccountabilityFormAndNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { userID: 'u1' },
          body: expect.objectContaining({
            formOrigin: 'processor_return',
            userId: 'u1',
            adminCopyCopyType: 'IT',
          }),
        }),
        'u1',
        'u1',
        req,
        null
      );

      createReturnAccountabilityFormAndNotify.mockClear();
      transferRepo.getTransferFormIdsByReturnFormId.mockResolvedValue(['tf1']);
      res = createMockRes();

      await assetReturnsController.processReturnFormHandler(req, res);

      expect(createReturnAccountabilityFormAndNotify).not.toHaveBeenCalled();
    });
  });

  describe('createReturnFromTransferHandler', () => {
    const approvedTransferRow = {
      formID: 'tf1',
      form_number: 'TRF-001',
      user_id: 'u1',
      department_id: 'd1',
      location_id: 'l1',
      location_room_id: null,
      signed_at: '2024-06-01 10:00:00',
      dept_head_signed_at: '2024-06-02 09:00:00',
      sub_approver_1_signed_at: null,
      return_form_id: null,
      declined_at: null,
      executed_at: null,
    };

    function setupHappyPath() {
      pool.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('FROM asset_transfer_forms WHERE formID'))
          return [[approvedTransferRow], []];
        if (s.includes('UPDATE asset_transfer_forms SET return_form_id'))
          return [[], []];
        return [[], []];
      });
      transactionConnection.execute.mockImplementation(async (sql: string) => {
        const s = String(sql);
        if (s.includes('SELECT return_form_id')) {
          return [[{ return_form_id: null }], []];
        }
        return [[], []];
      });
      transferRepo.getTransferFormAssignments.mockResolvedValue([
        { assignment_id: 'a1' },
      ]);
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([
        { ...mockAssignment, assignmentID: 'a1' },
      ]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10', name: 'IT' });
      transferRepo.getUserById.mockResolvedValue({ userID: 'u1', company_id: '10' });
      returnRepo.fetchUserDigitalSignature.mockResolvedValue('dig-sig');
      generateReturnFormNumber.mockResolvedValue('RET-100');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({
        formID: 'rf9',
        form_number: 'RET-100',
      });
      returnModel.create.mockResolvedValue({ return_id: 'r9' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      getDesignatedApproverUserIdForRequester.mockResolvedValue('u-approver');
      getDesignatedSubApproverUserIdForRequester.mockResolvedValue(null);
    }

    it('creates + links the return form and notifies the approver', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      setupHappyPath();
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formID).toBe('rf9');
      expect(res._json.transferFormID).toBe('tf1');
      // Return rows are created for every linked assignment.
      expect(returnModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assignment_id: 'a1',
          user_id: 'u1',
          form_id: 'rf9',
        }),
        transactionConnection
      );
      // Transfer form is linked to the new return form in the same transaction.
      const linkCall = transactionConnection.execute.mock.calls.find((c: any[]) =>
        String(c[0]).includes('UPDATE asset_transfer_forms SET return_form_id')
      );
      expect(linkCall).toBeDefined();
      expect(linkCall![1]).toEqual(['rf9', 'tf1']);
      // Requestor's signature is stored on the return form.
      expect(returnFormModel.createWithReturnerSignature).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          signed_by: 'u1',
          signed_digital_signature: 'sig',
        }),
        transactionConnection
      );
      expect(transactionConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(transactionConnection.commit).toHaveBeenCalledTimes(1);
      expect(transactionConnection.rollback).not.toHaveBeenCalled();
      expect(transactionConnection.release).toHaveBeenCalledTimes(1);
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-approver',
          title: 'Return Form Approval Needed for Transfer Request',
          data: expect.objectContaining({
            form_id: 'rf9',
            transfer_form_id: 'tf1',
            actionTarget: 'return_request_approval',
          }),
        })
      );
    });

    it('prevents duplicate linked returns when another request wins the row lock', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      setupHappyPath();
      transactionConnection.execute.mockImplementation(async (sql: string) => {
        if (String(sql).includes('SELECT return_form_id')) {
          return [[{ return_form_id: 'rf-existing' }], []];
        }
        return [[], []];
      });

      await assetReturnsController.createReturnFromTransferHandler(req, res);

      expect(res._status).toBe(400);
      expect(res._json.error).toContain('already been generated');
      expect(returnFormModel.createWithReturnerSignature).not.toHaveBeenCalled();
      expect(returnModel.create).not.toHaveBeenCalled();
      expect(transactionConnection.rollback).toHaveBeenCalledTimes(1);
      expect(transactionConnection.commit).not.toHaveBeenCalled();
      expect(transactionConnection.release).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when the transfer form is not found', async () => {
      req.params = { transferFormId: 'missing' };
      pool.execute.mockResolvedValue([[], []]);
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(404);
    });

    it('returns 403 when caller is not the transfer requestor', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM asset_transfer_forms WHERE formID'))
          return [[{ ...approvedTransferRow, user_id: 'someone-else' }], []];
        return [[], []];
      });
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(403);
    });

    it('returns 400 when the transfer is not yet approved', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM asset_transfer_forms WHERE formID'))
          return [[{ ...approvedTransferRow, dept_head_signed_at: null, sub_approver_1_signed_at: null }], []];
        return [[], []];
      });
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when a return form already exists for the transfer', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM asset_transfer_forms WHERE formID'))
          return [[{ ...approvedTransferRow, return_form_id: 'rf-existing' }], []];
        return [[], []];
      });
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when the transfer was declined', async () => {
      req.params = { transferFormId: 'tf1' };
      req.body = { digitalSignature: 'sig' };
      pool.execute.mockImplementation(async (sql: string) => {
        if (String(sql).includes('FROM asset_transfer_forms WHERE formID'))
          return [[{ ...approvedTransferRow, declined_at: '2024-06-01' }], []];
        return [[], []];
      });
      await assetReturnsController.createReturnFromTransferHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});

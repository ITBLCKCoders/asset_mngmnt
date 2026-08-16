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
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), getDepartmentIdsForScope: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({ isUserManagerApprover1: jest.fn(), isUserManagerApprover2: jest.fn(), getManagerApprover1UserIdsInDepartmentAndCompany: jest.fn() }));
jest.mock('../../utils/notificationsApi.js', () => ({ createNotificationForApi: jest.fn() }));
jest.mock('../../utils/transferFormNumber.js', () => ({ generateTransferFormNumber: jest.fn(), generateTransferFormNumberFallback: jest.fn() }));
jest.mock('../../utils/returnFormNumber.js', () => ({ generateReturnFormNumber: jest.fn(), generateReturnFormNumberFallback: jest.fn() }));
jest.mock('../../models/assetTransferForm.model.js', () => ({ AssetTransferFormModel: { create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), createWithTransfererSignature: jest.fn(), addFormAssignments: jest.fn() } }));
jest.mock('../../models/assetReturnForm.model.js', () => ({ AssetReturnFormModel: { create: jest.fn(), createWithReturnerSignature: jest.fn(), findById: jest.fn() } }));
jest.mock('../../models/assetReturn.model.js', () => ({ AssetReturnModel: { create: jest.fn() } }));
jest.mock('../../repositories/assetReturn.repository.js', () => ({ fetchUserDigitalSignature: jest.fn() }));
jest.mock('../../repositories/assetTransferForm.repository.js', () => ({
  toBind: jest.fn(), getTransferFormLinksForReturnForms: jest.fn(), getTransferFormByReturnFormId: jest.fn(),
  getTransferFormIdsByReturnFormId: jest.fn(), getTransferFormAssignments: jest.fn(),
  getActiveAssignmentsByIds: jest.fn(), getRoomByLocationIdAndName: jest.fn(),
  getDepartmentById: jest.fn(), getUserById: jest.fn(), getUserDepartmentId: jest.fn(),
  getUserNamesById: jest.fn(), getCategoryDepartmentsByAssetIds: jest.fn(),
  getBuilderItemsByAssetIds: jest.fn(), getBuilderItemCount: jest.fn(),
}));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({ createAccountabilityFormHandler: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const formModel = jest.requireMock('../../models/assetTransferForm.model.js').AssetTransferFormModel;
const returnFormModel = jest.requireMock('../../models/assetReturnForm.model.js').AssetReturnFormModel;
const assetReturnModel = jest.requireMock('../../models/assetReturn.model.js').AssetReturnModel;
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js');
const { isUserManagerApprover1, isUserManagerApprover2, getManagerApprover1UserIdsInDepartmentAndCompany } = jest.requireMock('../../utils/approverNotifications.js');
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

    it('sends both transfer and return approval-needed notifications to Manager Approver 1', async () => {
      req.body = { assignmentIds: ['a1'], departmentId: 'd1', transferToUserId: 'u2', notes: 'Transfer', digitalSignature: 'sig' };
      transferRepo.getActiveAssignmentsByIds.mockResolvedValue([{ assignmentID: 'a1', asset_id: '10', user_id: 'u1', department_id: 'd1', location_id: 'l1', location_room_id: null }]);
      transferRepo.getUserById.mockResolvedValue({ userID: 'u2', company_id: '10' });
      transferRepo.getUserDepartmentId.mockResolvedValue('d1');
      transferRepo.getCategoryDepartmentsByAssetIds.mockResolvedValue([{ departmentID: 'd1' }]);
      transferRepo.getDepartmentById.mockResolvedValue({ company_id: '10' });
      transferRepo.getUserNamesById.mockResolvedValue({ first_name: 'John', last_name: 'Doe' });
      generateReturnFormNumber.mockResolvedValue('RF-001');
      returnFormModel.createWithReturnerSignature.mockResolvedValue({ formID: 'rf1', form_number: 'RF-001' });
      assetReturnModel.create.mockResolvedValue({});
      generateTransferFormNumber.mockResolvedValue('TRF-001');
      formModel.createWithTransfererSignature.mockResolvedValue({ formID: 'f1', form_number: 'TRF-001' });
      formModel.addFormAssignments.mockResolvedValue(undefined);
      getManagerApprover1UserIdsInDepartmentAndCompany.mockResolvedValue(['u-approver']);
      await assetTransfersController.submitTransferRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-approver',
          title: 'Asset Transfer Request Approval Needed',
          data: expect.objectContaining({ form_id: 'f1', actionTarget: 'transfer_request_approval' }),
        })
      );
      expect(createNotificationForApi).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-approver',
          title: 'Asset Return Request Approval Needed',
          data: expect.objectContaining({ form_id: 'rf1', actionTarget: 'return_request_approval' }),
        })
      );
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
      expect(res._json.pendingLinkedReturnApproval).toBeUndefined();
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
});

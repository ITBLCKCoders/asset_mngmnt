import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as assetReturnsController from '../../controllers/assetReturns.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn(() => Promise.resolve()) }));
jest.mock('../../utils/accountabilityFormOnReturn.js', () => ({ handleAccountabilityFormOnAssetReturn: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn(), classifyDepartmentScopeByName: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({ isUserManagerApprover1: jest.fn(), isUserManagerApprover2: jest.fn(), getManagerApprover1UserIdsInDepartment: jest.fn(), getManagerApprover2UserIdsInDepartment: jest.fn() }));
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
}));
jest.mock('../../services/assetReturn.service.js', () => ({ resolveReturnFormContext: jest.fn() }));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({ createAccountabilityFormHandler: jest.fn() }));
jest.mock('../../controllers/assetTransfers.controller.js', () => ({ runTransferFormExecution: jest.fn() }));

const { pool } = jest.requireMock('../../db.js') as { pool: { execute: jest.Mock } };
const returnModel = jest.requireMock('../../models/assetReturn.model.js').AssetReturnModel as jest.Mock;
const returnFormModel = jest.requireMock('../../models/assetReturnForm.model.js').AssetReturnFormModel as jest.Mock;
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js') as { getAssetScope: jest.Mock };
const transferRepo = jest.requireMock('../../repositories/assetTransferForm.repository.js') as Record<string, jest.Mock>;
const returnRepo = jest.requireMock('../../repositories/assetReturn.repository.js') as Record<string, jest.Mock>;
const { isUserManagerApprover1, getManagerApprover1UserIdsInDepartment } = jest.requireMock('../../utils/approverNotifications.js') as { isUserManagerApprover1: jest.Mock; getManagerApprover1UserIdsInDepartment: jest.Mock };
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
    const { createAuditLog } = jest.requireMock('../../utils/audit.js') as { createAuditLog: jest.Mock };
    createAuditLog.mockResolvedValue(undefined);
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
      getManagerApprover1UserIdsInDepartment.mockResolvedValue([]);
      await assetReturnsController.submitAssetReturnRequestHandler(req, res);
      expect(res._status).toBe(201);
      expect(res._json.formID).toBe('f1');
      expect(res._json.forms).toHaveLength(1);
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
      getManagerApprover1UserIdsInDepartment.mockResolvedValue([]);
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
});

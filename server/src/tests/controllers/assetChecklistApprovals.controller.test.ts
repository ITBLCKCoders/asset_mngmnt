import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as checklistController from '../../controllers/assetChecklistApprovals.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../repositories/assetChecklist.repository.js', () => ({
  findPendingDeptHeadApprovalChecklists: jest.fn(),
  findChecklistsApprovedByDeptHead: jest.fn(),
  approveChecklistsAsDeptHead: jest.fn(),
  findPendingItManagerReceiveChecklists: jest.fn(),
  receiveChecklistsAsItManager: jest.fn(),
}));
jest.mock('../../utils/assetScope.js', () => ({ getAssetScope: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({
  isUserManagerApprover1: jest.fn(),
  isUserManagerApprover2: jest.fn(),
  isUserSubApprover1: jest.fn(),
  isUserSubApprover2: jest.fn(),
  isUserInItOrAdminDepartmentForCompany: jest.fn(),
  getManagerApprover2UserIdsInItAndAdminDepartmentsAndCompany: jest.fn(),
  getSubApprover2UserIdsInItAndAdminDepartmentsAndCompany: jest.fn(),
}));
jest.mock('../../utils/notificationsApi.js', () => ({ createNotificationForApi: jest.fn() }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const checklistRepo = jest.requireMock('../../repositories/assetChecklist.repository.js') as Record<string, jest.Mock>;
const { getAssetScope } = jest.requireMock('../../utils/assetScope.js') as { getAssetScope: jest.Mock };
const approverNotif = jest.requireMock('../../utils/approverNotifications.js') as Record<string, jest.Mock>;
const { createNotificationForApi } = jest.requireMock('../../utils/notificationsApi.js') as { createNotificationForApi: jest.Mock };

describe('assetChecklistApprovals.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getPendingChecklistApprovalsHandler', () => {
    it('returns pending checklist batches', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      approverNotif.isUserManagerApprover1.mockResolvedValue(true);
      mockPool.pool.query.mockResolvedValue([[{ department_id: 'd-1' }]]);
      checklistRepo.findPendingDeptHeadApprovalChecklists.mockResolvedValue([
        { employee_id: 'emp-1', employee_name: 'Bob', created_at: '2024-01-01', checklist_id: 'cl-1' },
      ]);
      await checklistController.getPendingChecklistApprovalsHandler(req, res);
      expect(res._json.checklistBatches).toHaveLength(1);
    });

    it('returns empty when no company', async () => {
      getAssetScope.mockResolvedValue({ companyId: null });
      await checklistController.getPendingChecklistApprovalsHandler(req, res);
      expect(res._json.checklistBatches).toEqual([]);
    });

    it('returns empty when not approver 1', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      approverNotif.isUserManagerApprover1.mockResolvedValue(false);
      await checklistController.getPendingChecklistApprovalsHandler(req, res);
      expect(res._json.checklistBatches).toEqual([]);
    });
  });

  describe('getChecklistsApprovedByDeptHeadMeHandler', () => {
    it('returns approved by me batches', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      checklistRepo.findChecklistsApprovedByDeptHead.mockResolvedValue([
        { employee_id: 'emp-1', employee_name: 'Bob', created_at: '2024-01-01', checklist_id: 'cl-1' },
      ]);
      await checklistController.getChecklistsApprovedByDeptHeadMeHandler(req, res);
      expect(res._json.checklistBatches).toHaveLength(1);
    });
  });

  describe('approveChecklistsDeptHeadHandler', () => {
    it('approves checklists as dept head', async () => {
      req.body = { checklistIds: ['cl-1', 'cl-2'] };
      approverNotif.isUserManagerApprover1.mockResolvedValue(true);
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      mockPool.pool.query
        .mockResolvedValueOnce([[{ department_id: 'd-1', digital_signature: 'sig' }]]);
      checklistRepo.approveChecklistsAsDeptHead.mockResolvedValue(2);
      approverNotif.getManagerApprover2UserIdsInItAndAdminDepartmentsAndCompany.mockResolvedValue(['it-user-1']);
      approverNotif.getSubApprover2UserIdsInItAndAdminDepartmentsAndCompany.mockResolvedValue([]);
      mockPool.pool.query.mockResolvedValueOnce([[{ first_name: 'Dept', last_name: 'Head' }]]);
      await checklistController.approveChecklistsDeptHeadHandler(req, res);
      expect(res._json.message).toContain('Approved 2 checklist(s)');
    });

    it('returns 400 when checklistIds empty', async () => {
      req.body = { checklistIds: [] };
      await checklistController.approveChecklistsDeptHeadHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when not authorized', async () => {
      req.body = { checklistIds: ['cl-1'] };
      approverNotif.isUserManagerApprover1.mockResolvedValue(false);
      await checklistController.approveChecklistsDeptHeadHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('getReceivePendingChecklistApprovalsHandler', () => {
    it('returns receive-pending batches', async () => {
      approverNotif.isUserManagerApprover2.mockResolvedValue(true);
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      approverNotif.isUserInItOrAdminDepartmentForCompany.mockResolvedValue(true);
      checklistRepo.findPendingItManagerReceiveChecklists.mockResolvedValue([
        { employee_id: 'emp-1', employee_name: 'Bob', created_at: '2024-01-01', checklist_id: 'cl-1' },
      ]);
      await checklistController.getReceivePendingChecklistApprovalsHandler(req, res);
      expect(res._json.checklistBatches).toHaveLength(1);
    });

    it('returns empty when not approver 2 or sub approver 2', async () => {
      approverNotif.isUserManagerApprover2.mockResolvedValue(false);
      approverNotif.isUserSubApprover2.mockResolvedValue(false);
      await checklistController.getReceivePendingChecklistApprovalsHandler(req, res);
      expect(res._json.checklistBatches).toEqual([]);
    });
  });

  describe('receiveChecklistsItManagerHandler', () => {
    it('receives checklists as IT manager', async () => {
      req.body = { checklistIds: ['cl-1'] };
      approverNotif.isUserManagerApprover2.mockResolvedValue(true);
      getAssetScope.mockResolvedValue({ companyId: 'c-1' });
      approverNotif.isUserInItOrAdminDepartmentForCompany.mockResolvedValue(true);
      mockPool.pool.query.mockResolvedValue([[{ digital_signature: null }]]);
      checklistRepo.receiveChecklistsAsItManager.mockResolvedValue(1);
      await checklistController.receiveChecklistsItManagerHandler(req, res);
      expect(res._json.message).toContain('Received 1 checklist(s)');
    });

    it('returns 400 when checklistIds empty', async () => {
      req.body = { checklistIds: [] };
      await checklistController.receiveChecklistsItManagerHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 403 when not authorized', async () => {
      req.body = { checklistIds: ['cl-1'] };
      approverNotif.isUserManagerApprover2.mockResolvedValue(false);
      approverNotif.isUserSubApprover2.mockResolvedValue(false);
      await checklistController.receiveChecklistsItManagerHandler(req, res);
      expect(res._status).toBe(403);
    });
  });
});

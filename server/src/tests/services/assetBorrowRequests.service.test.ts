import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn(), query: jest.fn() };
const mockRepo = {
  getBorrowRequestById: jest.fn(),
  findBorrowRequestsForUser: jest.fn(),
  findPendingDeptHeadBorrowRequests: jest.fn(),
  findBorrowRequestsApprovedByDeptHeadMe: jest.fn(),
  updateBorrowRequestDeptHeadApprove: jest.fn(),
  updateBorrowRequestDeptHeadDecline: jest.fn(),
  findAvailableAssetsForBorrowStaffPool: jest.fn(),
  updateBorrowRequestStaffApprove: jest.fn(),
  updateBorrowRequestStaffDecline: jest.fn(),
  findApprovedBorrowRequestsForReceive: jest.fn(),
  findBorrowRequestsReceivedByMe: jest.fn(),
  updateBorrowRequestReceived: jest.fn(),
  findBorrowRequestsForList: jest.fn(),
  getAssignmentForBorrowRequest: jest.fn(),
  getAvailableAssetByCodeForBorrowStaffPool: jest.fn(),
  getCategoryDepartmentForCompany: jest.fn(),
  getTypeForCategoryAndCompany: jest.fn(),
  insertAssetBorrowRequest: jest.fn(),
  updateAssignmentStatusActive: jest.fn(),
  updateBorrowRequestReturnProcess: jest.fn(),
};

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/activeCompany.js', () => ({ getScopedActiveCompany: jest.fn() }));
jest.mock('../../utils/assetScope.js', () => ({ classifyDepartmentScopeByName: jest.fn(), getAssetScope: jest.fn(), getBorrowRequestListScope: jest.fn(), getDepartmentIdsForScope: jest.fn() }));
jest.mock('../../utils/approverNotifications.js', () => ({ isUserManagerApprover1: jest.fn() }));
jest.mock('../../utils/borrowFormNumber.js', () => ({ generateBorrowFormNumber: jest.fn() }));
jest.mock('../../repositories/assetBorrowRequests.repository.js', () => mockRepo);

const { AssetBorrowRequestsService } = require('../../services/assetBorrowRequests.service.js');
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js');
const { generateBorrowFormNumber } = jest.requireMock('../../utils/borrowFormNumber.js');
const { isUserManagerApprover1 } = jest.requireMock('../../utils/approverNotifications.js');
const { classifyDepartmentScopeByName, getAssetScope, getBorrowRequestListScope, getDepartmentIdsForScope } = jest.requireMock('../../utils/assetScope.js');

describe('AssetBorrowRequestsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create borrow request with valid data', async () => {
      const body = { category_id: 'cat-1', type_id: 'type-1', expected_return_at: '2026-02-01', purpose: 'Test borrow' };
      getScopedActiveCompany.mockResolvedValue({ companyID: 'c1', scope: 'it' });
      mockRepo.getBorrowRequestById.mockResolvedValue(null);
      generateBorrowFormNumber.mockResolvedValue('BR-001');
      mockPool.execute.mockResolvedValue([{ insertId: 'new-id' }]);
      const result = await AssetBorrowRequestsService.create(mockPool, 'u1', body);
      expect(result).toBeDefined();
    });

    it('should return error when company not found', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      const result = await AssetBorrowRequestsService.create(mockPool, 'u1', {});
      expect(result.error).toBeDefined();
    });
  });

  describe('listForCurrentUser', () => {
    it('should return borrow requests for user', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'c1' });
      const expected = [{ borrow_request_id: 'br1' }];
      mockRepo.findBorrowRequestsForUser.mockResolvedValue(expected);
      const result = await AssetBorrowRequestsService.listForCurrentUser(mockPool, 'u1');
      expect(result.rows).toEqual(expected);
    });
  });

  describe('listPendingDeptHeadApprovals', () => {
    it('should return pending approvals based on scope', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c1' });
      isUserManagerApprover1.mockResolvedValue(true);
      mockPool.execute.mockResolvedValue([[{ department_id: 'dept-1' }], []]);
      const expected = [{ borrow_request_id: 'br1' }];
      mockRepo.findPendingDeptHeadBorrowRequests.mockResolvedValue(expected);
      const result = await AssetBorrowRequestsService.listPendingDeptHeadApprovals(mockPool, 'u1');
      expect(result.rows).toEqual(expected);
    });
  });

  describe('approveDeptHead', () => {
    it('should approve borrow request', async () => {
      const borrowRequest = { borrow_request_id: 'br1', status: 'pending_dept_head', company_id: 'c1', requester_department_id: 'dept-1' };
      getAssetScope.mockResolvedValue({ companyId: 'c1' });
      isUserManagerApprover1.mockResolvedValue(true);
      mockPool.execute.mockResolvedValue([[{ department_id: 'dept-1' }], []]);
      mockRepo.getBorrowRequestById.mockResolvedValue(borrowRequest);
      mockRepo.updateBorrowRequestDeptHeadApprove.mockResolvedValue({});
      const result = await AssetBorrowRequestsService.approveDeptHead(mockPool, 'u1', 'br1', { digitalSignature: 'sig' });
      expect(result.ok).toBe(true);
    });

    it('should return error when borrow request not found', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c1' });
      isUserManagerApprover1.mockResolvedValue(true);
      mockPool.execute.mockResolvedValue([[{ department_id: 'dept-1' }], []]);
      mockRepo.getBorrowRequestById.mockResolvedValue(null);
      const result = await AssetBorrowRequestsService.approveDeptHead(mockPool, 'u1', 'nonexistent', {});
      expect(result.error).toBeDefined();
    });
  });

  describe('declineDeptHead', () => {
    it('should decline borrow request', async () => {
      getAssetScope.mockResolvedValue({ companyId: 'c1' });
      isUserManagerApprover1.mockResolvedValue(true);
      mockPool.execute.mockResolvedValue([[{ department_id: 'dept-1' }], []]);
      mockRepo.getBorrowRequestById.mockResolvedValue({ borrow_request_id: 'br1', status: 'pending_dept_head', company_id: 'c1', requester_department_id: 'dept-1' });
      mockRepo.updateBorrowRequestDeptHeadDecline.mockResolvedValue({});
      const result = await AssetBorrowRequestsService.declineDeptHead(mockPool, 'u1', 'br1');
      expect(result.ok).toBe(true);
    });
  });

  describe('staffApprove', () => {
    it('should staff-approve borrow request', async () => {
      const params = { borrowRequestId: 'br1', assetCode: 'a1', preUsageCondition: 'Good', processorSignature: 'sig', processorSignedAt: new Date().toISOString() };
      mockRepo.getBorrowRequestById.mockResolvedValue({ borrow_request_id: 'br1', status: 'dept_head_approved', company_id: 'c1', borrow_scope: 'it' });
      getBorrowRequestListScope.mockResolvedValue({ companyId: 'c1', borrowScope: 'it' });
      getDepartmentIdsForScope.mockResolvedValue(['dept-1']);
      mockRepo.getAvailableAssetByCodeForBorrowStaffPool.mockResolvedValue({ assetID: 'a1', status: 'Available' });
      mockRepo.updateBorrowRequestStaffApprove.mockResolvedValue({ ok: true });
      mockRepo.updateAssignmentStatusActive.mockResolvedValue(undefined);
      mockRepo.updateBorrowRequestReceived.mockResolvedValue(undefined);
      const result = await AssetBorrowRequestsService.staffApprove(mockPool, 'u1', params);
      expect(result.ok).toBe(true);
    });
  });

  describe('processDueReminders', () => {
    it('should process due reminders without error', async () => {
      AssetBorrowRequestsService.borrowDueRemindersSchemaOk = null;
      AssetBorrowRequestsService.dueReminderCache = new Set();
      mockPool.execute.mockResolvedValue([[], []]);
      await AssetBorrowRequestsService.processDueReminders(mockPool);
      expect(mockPool.execute).toHaveBeenCalled();
    });
  });

  describe('listReceivedByMe', () => {
    it('returns borrow requests received by the user', async () => {
      const rows = [{ borrow_request_id: 'br-1', received_at: '2024-01-01 10:00:00' }];
      mockRepo.findBorrowRequestsReceivedByMe.mockResolvedValue(rows);
      const result = await AssetBorrowRequestsService.listReceivedByMe(mockPool, 'u1');
      expect(mockRepo.findBorrowRequestsReceivedByMe).toHaveBeenCalledWith(mockPool, 'u1');
      expect(result).toEqual({ borrowRequests: rows });
    });
  });
});

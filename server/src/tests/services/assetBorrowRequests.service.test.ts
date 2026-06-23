import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn(), query: jest.fn() };
const mockRepo = {
  findBorrowRequestById: jest.fn(),
  findBorrowRequestsByUser: jest.fn(),
  findBorrowRequestsByScope: jest.fn(),
  findBorrowRequestsPendingDeptHeadByDepartment: jest.fn(),
  findBorrowRequestsApprovedByDeptHead: jest.fn(),
  approveDeptHead: jest.fn(),
  declineDeptHead: jest.fn(),
  findAvailableAssetsForBorrowRequest: jest.fn(),
  staffApprove: jest.fn(),
  staffDecline: jest.fn(),
  findApprovedForReceive: jest.fn(),
  receiveBorrowRequest: jest.fn(),
  processBorrowReturn: jest.fn(),
  processDueReminders: jest.fn(),
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
const { isUserManagerApprover1, classifyDepartmentScopeByName } = jest.requireMock('../../utils/approverNotifications.js');

describe('AssetBorrowRequestsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create borrow request with valid data', async () => {
      const body = { category_id: 'cat-1', type_id: 'type-1', expected_return_at: '2026-02-01', purpose: 'Test borrow' };
      getScopedActiveCompany.mockResolvedValue({ companyID: 'c1', scope: 'it' });
      mockRepo.findBorrowRequestById.mockResolvedValue(null);
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
      const expected = [{ borrow_request_id: 'br1' }];
      mockRepo.findBorrowRequestsByUser.mockResolvedValue(expected);
      const result = await AssetBorrowRequestsService.listForCurrentUser(mockPool, 'u1');
      expect(result.rows).toEqual(expected);
    });
  });

  describe('listPendingDeptHeadApprovals', () => {
    it('should return pending approvals based on scope', async () => {
      classifyDepartmentScopeByName.mockResolvedValue('it');
      getScopedActiveCompany.mockResolvedValue({ companyID: 'c1' });
      const expected = [{ borrow_request_id: 'br1' }];
      mockRepo.findBorrowRequestsPendingDeptHeadByDepartment.mockResolvedValue(expected);
      const result = await AssetBorrowRequestsService.listPendingDeptHeadApprovals(mockPool, 'u1');
      expect(result.rows).toEqual(expected);
    });
  });

  describe('approveDeptHead', () => {
    it('should approve borrow request', async () => {
      const borrowRequest = { borrow_request_id: 'br1', status: 'pending_dept_head', company_id: 'c1' };
      mockRepo.findBorrowRequestById.mockResolvedValue(borrowRequest);
      isUserManagerApprover1.mockResolvedValue(true);
      getScopedActiveCompany.mockResolvedValue({ companyID: 'c1' });
      mockRepo.approveDeptHead.mockResolvedValue({});
      const result = await AssetBorrowRequestsService.approveDeptHead(mockPool, 'u1', 'br1', { digitalSignature: 'sig' });
      expect(result.ok).toBe(true);
    });

    it('should return error when borrow request not found', async () => {
      mockRepo.findBorrowRequestById.mockResolvedValue(null);
      const result = await AssetBorrowRequestsService.approveDeptHead(mockPool, 'u1', 'nonexistent', {});
      expect(result.error).toBeDefined();
    });
  });

  describe('declineDeptHead', () => {
    it('should decline borrow request', async () => {
      mockRepo.findBorrowRequestById.mockResolvedValue({ borrow_request_id: 'br1', status: 'pending_dept_head', company_id: 'c1' });
      getScopedActiveCompany.mockResolvedValue({ companyID: 'c1' });
      isUserManagerApprover1.mockResolvedValue(true);
      mockRepo.declineDeptHead.mockResolvedValue({});
      const result = await AssetBorrowRequestsService.declineDeptHead(mockPool, 'u1', 'br1');
      expect(result.ok).toBe(true);
    });
  });

  describe('staffApprove', () => {
    it('should staff-approve borrow request', async () => {
      const params = { borrowRequestId: 'br1', assetId: 'a1', digitalSignature: 'sig' };
      mockRepo.findBorrowRequestById.mockResolvedValue({ borrow_request_id: 'br1', status: 'dept_head_approved', company_id: 'c1' });
      mockRepo.findAvailableAssetsForBorrowRequest.mockResolvedValue([{ assetID: 'a1' }]);
      mockRepo.staffApprove.mockResolvedValue({ ok: true });
      const result = await AssetBorrowRequestsService.staffApprove(mockPool, 'u1', params);
      expect(result.ok).toBe(true);
    });
  });

  describe('processDueReminders', () => {
    it('should process due reminders without error', async () => {
      mockRepo.processDueReminders.mockResolvedValue(undefined);
      await AssetBorrowRequestsService.processDueReminders(mockPool);
      expect(mockRepo.processDueReminders).toHaveBeenCalledWith(mockPool);
    });
  });
});

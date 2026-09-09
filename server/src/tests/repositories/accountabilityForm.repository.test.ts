import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  findFormsByAssetId,
  getActiveIntangibleAssetsByUserAndDepartment,
  listAccountabilityForms,
  listFormsPendingApprovalForApprover,
  listFormsPendingAdminCopySignature,
} = require('../../repositories/accountabilityForm.repository.js');

describe('accountabilityForm.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findFormsByAssetId', () => {
    it('should return forms for asset', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      const result = await findFormsByAssetId('a1');
      expect(result).toEqual([{ formID: 'f1' }]);
    });

    it('should include assignee active forms via intangible assignment lookup', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f2' }], []]);
      await findFormsByAssetId('asset-1');
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain('intangible_asset_assignments');
      expect(params).toEqual(['asset-1', '%asset-1%', 'asset-1']);
    });
  });

  describe('getActiveIntangibleAssetsByUserAndDepartment', () => {
    it('should query active intangible assignments for user and department', async () => {
      const row = { id: 'ia1', name: 'License', type: 'IT scope' };
      mockPool.execute.mockResolvedValue([[row], []]);
      const result = await getActiveIntangibleAssetsByUserAndDepartment('u1', 'd1');
      expect(result).toEqual([row]);
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain('intangible_asset_assignments');
      expect(params).toEqual(['u1', 'd1']);
    });
  });

  describe('listAccountabilityForms', () => {
    it('filters by company and department scope', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      const result = await listAccountabilityForms({
        userId: 'u1',
        status: 'Pending',
        companyId: 'c1',
        departmentIds: ['d1', 'd2'],
      });
      expect(result).toEqual([{ formID: 'f1' }]);
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain('u.company_id = ?');
      expect(sql).toContain('(ud.departmentID IN (?,?) OR d.departmentID IN (?,?))');
      expect(params).toEqual(['u1', 'Pending', 'c1', 'd1', 'd2', 'd1', 'd2']);
    });

    it('skips company/dept filters when not provided', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f2' }], []]);
      await listAccountabilityForms({});
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).not.toContain('u.company_id');
      expect(sql).not.toContain('departmentID IN');
      expect(params).toEqual([]);
    });
  });

  describe('listFormsPendingAdminCopySignature', () => {
    it('only lists live (Pending) forms awaiting the admin copy signature', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      await listFormsPendingAdminCopySignature('signer1');
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain("af.approval_status = 'pending_admin_copy_signature'");
      // Disabled/superseded forms must not appear in the copy-sign queue.
      expect(sql).toContain("af.status = 'Pending'");
      expect(params).toEqual(['signer1', 'signer1']);
    });
  });

  describe('listFormsPendingApprovalForApprover', () => {
    it('only lists live (Pending/Signed) forms awaiting final approval', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      await listFormsPendingApprovalForApprover('approver1');
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain("af.approval_status = 'pending_approval'");
      // A Disabled/Revoked form must not remain in the approver's queue,
      // otherwise its pending approval flow would keep running.
      expect(sql).toContain("af.status IN ('Pending', 'Signed')");
      expect(params).toEqual(['approver1', 'approver1']);
    });
  });
});

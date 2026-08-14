import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };
const mockGetDepartmentIdsForScope = jest.fn();
const mockGetActiveCompany = jest.fn();
const mockGetAssetScope = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../utils/assetScope.js', () => ({
  getDepartmentIdsForScope: (...args: any[]) => mockGetDepartmentIdsForScope(...args),
  getAssetScope: (...args: any[]) => mockGetAssetScope(...args),
}));
jest.mock('../../utils/activeCompany.js', () => ({ getActiveCompany: (...args: any[]) => mockGetActiveCompany(...args) }));

const {
  isUserManagerApprover1,
  isUserManagerApprover2,
  getManagerApprover1UserIdsInDepartment,
  getManagerApprover1UserIdsInDepartmentAndCompany,
  getManagerApprover2UserIdsInDepartment,
  getManagerApprover2UserIdsForProcessedReturn,
  isUserInItDepartmentForCompany,
  getManagerApprover1UserIdsByCompany,
  getCustodianReturnAccessUserIds,
  getHrAccountabilityReceiverUserIds,
} = require('../../utils/approverNotifications.js');

describe('approverNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isUserManagerApprover1', () => {
    it('should return true when user is a manager approver 1', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await isUserManagerApprover1('u1');
      expect(result).toBe(true);
    });

    it('should return false when user is not a manager approver 1', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      const result = await isUserManagerApprover1('u1');
      expect(result).toBe(false);
    });
  });

  describe('isUserManagerApprover2', () => {
    it('should return true when user is a manager approver 2', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await isUserManagerApprover2('u1');
      expect(result).toBe(true);
    });
  });

  describe('getManagerApprover1UserIdsInDepartment', () => {
    it('should return approver user ids', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }, { userID: 'u2' }], []]);
      const result = await getManagerApprover1UserIdsInDepartment('dept1');
      expect(result).toEqual(['u1', 'u2']);
    });

    it('should return empty array when department is null', async () => {
      const result = await getManagerApprover1UserIdsInDepartment(null);
      expect(result).toEqual([]);
    });
  });

  describe('getManagerApprover2UserIdsInDepartment', () => {
    it('should return approver user ids', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await getManagerApprover2UserIdsInDepartment('dept1');
      expect(result).toEqual(['u1']);
    });
  });

  describe('getManagerApprover2UserIdsForProcessedReturn', () => {
    it('returns manager approver 2 users whose scope covers the department', async () => {
      mockPool.execute.mockResolvedValue([
        [{ userID: 'it-mgr' }, { userID: 'admin-mgr' }, { userID: 'global' }],
        [],
      ]);
      mockGetAssetScope.mockImplementation(async (_pool: any, userId: string) => {
        if (userId === 'it-mgr')
          return {
            companyId: 'c1',
            departmentIds: ['it-dept', 'it-dept-2'],
            isSuperAdmin: false,
          };
        if (userId === 'admin-mgr')
          return { companyId: 'c1', departmentIds: ['admin-dept'], isSuperAdmin: false };
        return { companyId: 'c1', departmentIds: null, isSuperAdmin: true };
      });
      const result = await getManagerApprover2UserIdsForProcessedReturn(
        'c1',
        'it-dept'
      );
      expect(result).toEqual(['it-mgr', 'global']);
    });

    it('excludes users from other companies or without department scope coverage', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'it-mgr' }, { userID: 'other-co' }], []]);
      mockGetAssetScope.mockImplementation(async (_pool: any, userId: string) => {
        if (userId === 'it-mgr')
          return { companyId: 'c1', departmentIds: ['admin-dept'], isSuperAdmin: false };
        return { companyId: 'c2', departmentIds: null, isSuperAdmin: false };
      });
      const result = await getManagerApprover2UserIdsForProcessedReturn(
        'c1',
        'it-dept'
      );
      expect(result).toEqual([]);
    });

    it('returns only broad-scope users when department is null', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'it-mgr' }, { userID: 'global' }], []]);
      mockGetAssetScope.mockImplementation(async (_pool: any, userId: string) => {
        if (userId === 'it-mgr')
          return { companyId: 'c1', departmentIds: ['it-dept'], isSuperAdmin: false };
        return { companyId: 'c1', departmentIds: null, isSuperAdmin: true };
      });
      const result = await getManagerApprover2UserIdsForProcessedReturn('c1', null);
      expect(result).toEqual(['global']);
    });

    it('returns empty array when company is null', async () => {
      const result = await getManagerApprover2UserIdsForProcessedReturn(null, 'd1');
      expect(result).toEqual([]);
      expect(mockPool.execute).not.toHaveBeenCalled();
    });
  });

  describe('getManagerApprover1UserIdsInDepartmentAndCompany', () => {
    it('should return approver user ids matching the approval scope', async () => {
      mockGetActiveCompany.mockResolvedValue({ id: 'active-company' });
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }, { userID: 'u2' }], []]);
      const result = await getManagerApprover1UserIdsInDepartmentAndCompany(
        'dept1',
        'company1'
      );
      expect(result).toEqual(['u1', 'u2']);
      const sql = mockPool.execute.mock.calls[0][0] as string;
      const params = mockPool.execute.mock.calls[0][1] as any[];
      expect(sql).toContain('global admin');
      expect(sql).toContain('u.department_id = ?');
      expect(sql).not.toContain('itManager');
      expect(sql).not.toContain('adminManager');
      expect(sql).not.toContain('overallManager');
      expect(params).toEqual(['company1', 'dept1', 'company1', 'active-company']);
    });

    it('should return empty array when department or company is null', async () => {
      const noDept = await getManagerApprover1UserIdsInDepartmentAndCompany(null, 'company1');
      expect(noDept).toEqual([]);
      const noCompany = await getManagerApprover1UserIdsInDepartmentAndCompany('dept1', null);
      expect(noCompany).toEqual([]);
      expect(mockPool.execute).not.toHaveBeenCalled();
    });
  });

  describe('isUserInItDepartmentForCompany', () => {
    it('should return true when user is in IT department', async () => {
      mockPool.execute.mockResolvedValue([[{ department_id: 'it-dept', company_id: 'c1' }], []]);
      mockGetDepartmentIdsForScope.mockResolvedValue(['it-dept']);
      const result = await isUserInItDepartmentForCompany('u1', 'c1');
      expect(result).toBe(true);
    });
  });

  describe('getManagerApprover1UserIdsByCompany', () => {
    it('should return approver user ids for company', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await getManagerApprover1UserIdsByCompany('c1');
      expect(result).toEqual(['u1']);
    });
  });

  describe('getCustodianReturnAccessUserIds', () => {
    it('should return custodian user ids', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await getCustodianReturnAccessUserIds();
      expect(result).toEqual(['u1']);
    });
  });

  describe('getHrAccountabilityReceiverUserIds', () => {
    it('should return HR receiver user ids', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1' }], []]);
      const result = await getHrAccountabilityReceiverUserIds();
      expect(result).toEqual(['u1']);
    });
  });
});

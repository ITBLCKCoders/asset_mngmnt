import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };
const mockGetDepartmentIdsForScope = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../utils/assetScope.js', () => ({ getDepartmentIdsForScope: (...args: any[]) => mockGetDepartmentIdsForScope(...args) }));

const {
  isUserManagerApprover1,
  isUserManagerApprover2,
  getManagerApprover1UserIdsInDepartment,
  getManagerApprover2UserIdsInDepartment,
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

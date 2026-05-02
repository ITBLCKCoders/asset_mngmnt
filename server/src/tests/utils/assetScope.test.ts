import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  getAssetScope,
  getBorrowRequestListScope,
  getDepartmentIdsForScope,
  classifyDepartmentScopeByName,
} from '../../utils/assetScope.js';
import { createMockPool } from '../helpers/mockPool.js';

describe('assetScope', () => {
  describe('classifyDepartmentScopeByName', () => {
    it('should return IT for names containing it or information technology', () => {
      expect(classifyDepartmentScopeByName('IT Department')).toBe('IT');
      expect(classifyDepartmentScopeByName('Information Technology')).toBe(
        'IT'
      );
      expect(classifyDepartmentScopeByName('IT')).toBe('IT');
    });

    it('should return Admin for names containing admin or administration', () => {
      expect(classifyDepartmentScopeByName('Admin')).toBe('Admin');
      expect(classifyDepartmentScopeByName('Administration')).toBe('Admin');
    });

    it('should return Other for other names', () => {
      expect(classifyDepartmentScopeByName('HR')).toBe('Other');
      expect(classifyDepartmentScopeByName('Finance')).toBe('Other');
      expect(classifyDepartmentScopeByName(null)).toBe('Other');
      expect(classifyDepartmentScopeByName('')).toBe('Other');
    });
  });

  describe('getAssetScope', () => {
    it('should return companyId null and isSuperAdmin false when user not found', async () => {
      const pool = createMockPool([[[]], []]);
      (pool.execute as jest.Mock).mockResolvedValue([[], []]);

      const result = await getAssetScope(pool as any, 'nonexistent-user');

      expect(result).toEqual({
        companyId: null,
        departmentIds: null,
        isSuperAdmin: false,
      });
    });

    it('should return scope for non-super-admin user with company', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock)
        .mockResolvedValueOnce([
          [
            {
              company_id: 'co-1',
              role_name: 'User',
              asset_type: 'it',
              manager_role: null,
            },
          ],
          [],
        ])
        .mockResolvedValue([[], []]);

      const result = await getAssetScope(pool as any, 'user-1');

      expect(result.companyId).toBe('co-1');
      expect(result.isSuperAdmin).toBe(false);
      expect(pool.execute).toHaveBeenCalled();
    });

    it('should return isSuperAdmin true when role is Super Admin', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [
          {
            company_id: 'co-1',
            role_name: 'Super Admin',
            asset_type: null,
            manager_role: null,
          },
        ],
        [],
      ]);
      (pool.query as jest.Mock).mockResolvedValue([
        [{ id: 'co-1', name: 'Company' }],
        [],
      ]);

      const result = await getAssetScope(pool as any, 'admin-1');

      expect(result.isSuperAdmin).toBe(true);
      expect(result.companyId).toBe('co-1');
      expect(result.departmentIds).toBeNull();
    });
  });

  describe('getBorrowRequestListScope', () => {
    it('returns borrowScope null for Super Admin and uses active company id', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [
          {
            company_id: 'co-1',
            role_name: 'Super Admin',
            asset_type: null,
            manager_role: null,
          },
        ],
        [],
      ]);
      (pool.query as jest.Mock).mockResolvedValue([
        [[{ id: 'co-active' }]],
        [],
      ]);

      const result = await getBorrowRequestListScope(pool as any, 'u1');

      expect(result).toEqual({ companyId: 'co-active', borrowScope: null });
    });

    it('returns it scope for user with asset_type it', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [
          {
            company_id: 'co-1',
            role_name: 'User',
            asset_type: 'it',
            manager_role: 'none',
          },
        ],
        [],
      ]);

      const result = await getBorrowRequestListScope(pool as any, 'u1');

      expect(result).toEqual({ companyId: 'co-1', borrowScope: 'it' });
    });

    it('returns null borrowScope for overallManager', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValueOnce([
        [
          {
            company_id: 'co-1',
            role_name: 'Manager',
            asset_type: null,
            manager_role: 'overallManager',
          },
        ],
        [],
      ]);

      const result = await getBorrowRequestListScope(pool as any, 'u1');

      expect(result).toEqual({ companyId: 'co-1', borrowScope: null });
    });
  });

  describe('getDepartmentIdsForScope', () => {
    it('should return department IDs for scope it', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValue([
        [{ departmentID: 'dept-1' }, { departmentID: 'dept-2' }],
        [],
      ]);

      const result = await getDepartmentIdsForScope(pool as any, 'it');

      expect(result).toEqual(['dept-1', 'dept-2']);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('departmentID'),
        expect.any(Array)
      );
    });

    it('should include company_id in query when companyId provided', async () => {
      const pool = createMockPool();
      (pool.execute as jest.Mock).mockResolvedValue([
        [{ departmentID: 'd1' }],
        [],
      ]);

      await getDepartmentIdsForScope(pool as any, 'admin', 'company-1');

      const call = (pool.execute as jest.Mock).mock.calls[0];
      expect(call[1]).toContain('company-1');
    });
  });
});

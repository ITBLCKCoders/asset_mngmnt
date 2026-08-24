import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  getCategoryIdsForDashboardScope,
  getDashboardData,
} from '../../services/dashboard.service.js';
import { createMockPool } from '../helpers/mockPool.js';

jest.mock('../../utils/assetScope.js', () => ({
  getAssetScope: jest.fn(),
  getDepartmentIdsForScope: jest.fn(),
}));

const { getAssetScope, getDepartmentIdsForScope } = jest.requireMock<
  typeof import('../../utils/assetScope.js')
>('../../utils/assetScope.js');

describe('dashboard.service', () => {
  let pool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    jest.clearAllMocks();
    pool = createMockPool();
  });

  describe('getDashboardData', () => {
    it('should return empty dashboard when getAssetScope returns no company', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: null,
        departmentIds: null,
        isSuperAdmin: false,
      });

      const result = await getDashboardData(pool as any, 'user-1');

      expect(getAssetScope).toHaveBeenCalledWith(pool, 'user-1');
      expect(result.stats.totalAssets).toBe(0);
      expect(result.stats.activeAssignments).toBe(0);
      expect(result.stats.transferedAssets).toBe(0);
      expect(result.stats.returnedAssets).toBe(0);
      expect(result.stats.underRepair).toBe(0);
      expect(result.assetByType).toEqual([]);
      expect(result.movement.weekly).toEqual([]);
      expect(result.movement.monthly).toEqual([]);
      expect(result.statusDistribution).toEqual([]);
      expect(result.assetsByDepartment).toEqual([]);
      expect(result.requestPipeline).toEqual([]);
    });

    it('should return dashboard data shape when scope has company', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue([]);

      // Promise.all interleaves calls; use a single response for all execute calls
      (pool.execute as jest.Mock).mockResolvedValue([[{ cnt: 0 }], []]);

      const result = await getDashboardData(pool as any, 'user-1');

      expect(result).toHaveProperty('stats');
      expect(result.stats).toMatchObject({
        totalAssets: expect.any(Number),
        activeAssignments: expect.any(Number),
        availableAssets: expect.any(Number),
        deployedAssets: expect.any(Number),
        underMaintenance: expect.any(Number),
        forDisposal: expect.any(Number),
        disposedAssets: expect.any(Number),
        assetReturnsCount: expect.any(Number),
        pendingReturnCount: expect.any(Number),
        pendingTransferCount: expect.any(Number),
        underRepair: expect.any(Number),
        transferedAssets: expect.any(Number),
        returnedAssets: expect.any(Number),
        forMaintenance: expect.any(Number),
        forRepair: expect.any(Number),
      });
      expect(result.assetByType).toEqual(expect.any(Array));
      expect(result.movement).toHaveProperty('weekly');
      expect(result.movement).toHaveProperty('monthly');
      expect(result.statusDistribution).toEqual(expect.any(Array));
      expect(result.categoryMix).toEqual(expect.any(Array));
      expect(result.requestPipeline).toEqual(expect.any(Array));
    });

    it('should count assets owned or originated in company scope', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue([]);

      (pool.execute as jest.Mock).mockResolvedValue([[{ cnt: 0 }], []]);

      await getDashboardData(pool as any, 'user-1');

      const totalAssetsCall = (pool.execute as jest.Mock).mock.calls.find(
        (call: unknown[]) =>
          String(call[0]).includes('COUNT(*)') &&
          String(call[0]).includes('originating_company_id')
      );
      expect(totalAssetsCall).toBeDefined();
      expect(totalAssetsCall?.[1]).toEqual(
        expect.arrayContaining(['company-1', 'company-1'])
      );
    });

    it('should call getDepartmentIdsForScope when global admin with scope override', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: true,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue([
        'dept-1',
        'dept-2',
      ]);

      const countRow = (cnt: number) => [[{ cnt }], []];
      (pool.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve(countRow(0))
      );

      await getDashboardData(pool as any, 'admin-1', 'it', undefined);

      expect(getDepartmentIdsForScope).toHaveBeenCalledWith(
        pool,
        'it',
        null
      );
    });

    it('should count transferred/returned assets from completed forms with company filter', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue([]);

      // Mock sequence: total, active, assigned, deployed, underMaintenance, forDisposal, disposed, borrowed,
      // assetReturnsCount (forms), borrowRequests, pendingReturn, pendingTransfer,
      // underRepair, forMaintenance, forRepair, transferedAssets (asset_transfer), returnedAssets (asset_returns) + others
      // Use implementation that returns distinct cnt for asset_transfer vs asset_return joins
      (pool.execute as jest.Mock).mockImplementation((sql: string) => {
        const s = String(sql);
        if (s.includes('FROM asset_transfer at') && s.includes('process_signed_at')) {
          return Promise.resolve([[{ cnt: 5 }], []] as any);
        }
        if (s.includes('FROM asset_returns ar') && s.includes('process_signed_at')) {
          return Promise.resolve([[{ cnt: 3 }], []] as any);
        }
        if (s.includes('FROM asset_return_forms arf') && s.includes('COUNT(DISTINCT')) {
          return Promise.resolve([[{ cnt: 2 }], []] as any);
        }
        if (s.includes("a.status = 'Under Repair'") || s.includes("a.status = 'For Maintenance'") || s.includes("a.status = 'For Repair'")) {
          return Promise.resolve([[{ cnt: 1 }], []] as any);
        }
        // default for all other counts and movement/status queries
        return Promise.resolve([[{ cnt: 0 }], []] as any);
      });

      const result = await getDashboardData(pool as any, 'user-1');

      expect(result.stats.transferedAssets).toBe(5);
      expect(result.stats.returnedAssets).toBe(3);
      expect(result.stats.underRepair).toBe(1);
      // verify company filter was passed to asset-level queries
      const transferCall = (pool.execute as jest.Mock).mock.calls.find(
        (call: unknown[]) => String(call[0]).includes('FROM asset_transfer at')
      );
      expect(transferCall?.[1]).toEqual(expect.arrayContaining(['company-1']));
      const returnCall = (pool.execute as jest.Mock).mock.calls.find(
        (call: unknown[]) => String(call[0]).includes('FROM asset_returns ar')
      );
      expect(returnCall?.[1]).toEqual(expect.arrayContaining(['company-1']));
    });

    it('should fallback returnedAssets to forms count when detail count is zero', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue([]);
      (pool.execute as jest.Mock).mockImplementation((sql: string) => {
        const s = String(sql);
        if (s.includes('FROM asset_returns ar') && s.includes('process_signed_at')) {
          return Promise.resolve([[{ cnt: 0 }], []] as any);
        }
        if (s.includes('FROM asset_return_forms arf') && s.includes('COUNT(DISTINCT')) {
          return Promise.resolve([[{ cnt: 4 }], []] as any);
        }
        return Promise.resolve([[{ cnt: 0 }], []] as any);
      });
      const result = await getDashboardData(pool as any, 'user-1');
      expect(result.stats.returnedAssets).toBe(4);
    });
  });

  describe('getCategoryIdsForDashboardScope', () => {
    it('should return category ids for departments in scope', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: 'company-1',
        departmentIds: null,
        isSuperAdmin: false,
      });
      (getDepartmentIdsForScope as jest.Mock).mockResolvedValue(['dept-it-1']);
      (pool.execute as jest.Mock).mockResolvedValue([
        [{ categoryID: 'cat-1' }, { categoryID: 'cat-2' }],
        [],
      ]);

      const ids = await getCategoryIdsForDashboardScope(
        pool as any,
        'user-1',
        'it'
      );

      expect(getDepartmentIdsForScope).toHaveBeenCalledWith(
        pool,
        'it',
        'company-1'
      );
      expect(ids).toEqual(['cat-1', 'cat-2']);
    });

    it('should return empty array when no company', async () => {
      (getAssetScope as jest.Mock).mockResolvedValue({
        companyId: null,
        departmentIds: null,
        isSuperAdmin: false,
      });

      const ids = await getCategoryIdsForDashboardScope(
        pool as any,
        'user-1',
        'admin'
      );

      expect(ids).toEqual([]);
      expect(pool.execute).not.toHaveBeenCalled();
    });
  });
});

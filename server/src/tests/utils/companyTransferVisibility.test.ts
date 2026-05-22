import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  buildAssetCompanyScopeClause,
  appendAssetCompanyScopeParams,
  mapTransferredOutAssetRow,
  getTransferredOutAssetsForCompany,
} from '../../utils/companyTransferVisibility.js';
import { createMockPool } from '../helpers/mockPool.js';

describe('companyTransferVisibility', () => {
  describe('buildAssetCompanyScopeClause', () => {
    it('should OR company_id with originating_company_id', () => {
      const { whereFragment } = buildAssetCompanyScopeClause('a');
      expect(whereFragment).toContain('a.company_id = ?');
      expect(whereFragment).toContain('a.originating_company_id = ?');
    });
  });

  describe('appendAssetCompanyScopeParams', () => {
    it('should duplicate companyId for both placeholders', () => {
      expect(appendAssetCompanyScopeParams(['x'], 'co-1')).toEqual([
        'x',
        'co-1',
        'co-1',
      ]);
    });
  });

  describe('mapTransferredOutAssetRow', () => {
    it('should set transferred_out and Transferred to status', () => {
      const mapped = mapTransferredOutAssetRow({
        assetID: 'a1',
        target_company_name: 'Beta Corp',
      });
      expect(mapped.transferred_out).toBe(true);
      expect(mapped.status).toBe('Transferred to Beta Corp');
      expect(mapped.transferred_to_company_name).toBe('Beta Corp');
    });
  });

  describe('getTransferredOutAssetsForCompany', () => {
    let pool: ReturnType<typeof createMockPool>;

    beforeEach(() => {
      pool = createMockPool();
    });

    it('should query by originating_company_id and exclude current owner', async () => {
      const row = {
        assetID: 'asset-1',
        company_id: 'company-b',
        originating_company_id: 'company-a',
        target_company_name: 'Company B',
      };
      (pool.execute as jest.Mock).mockResolvedValue([[row], []]);

      const result = await getTransferredOutAssetsForCompany(pool as any, 'company-a');

      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('originating_company_id = ?'),
        ['company-a', 'company-a']
      );
      expect(result).toHaveLength(1);
      expect(result[0].transferred_out).toBe(true);
      expect(result[0].status).toBe('Transferred to Company B');
    });
  });
});

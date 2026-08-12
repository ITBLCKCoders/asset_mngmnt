import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  findFormsByAssetId,
  getActiveIntangibleAssetsByUserAndDepartment,
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
});

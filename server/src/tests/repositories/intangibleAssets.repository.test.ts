import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { query: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  getAllIntangibleAssets,
  createIntangibleAsset,
  createIntangibleAssetsBulk,
  updateIntangibleAsset,
  getIntangibleAssetById,
  assignIntangibleAsset,
  unassignIntangibleAsset,
} = require('../../repositories/intangibleAssets.repository.js');

describe('intangibleAssets.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllIntangibleAssets', () => {
    it('should call SP with company id', async () => {
      mockPool.query.mockResolvedValue([[{ id: 'ia-1', name: 'Software License' }], []]);
      const result = await getAllIntangibleAssets('c1');
      expect(result).toEqual([{ id: 'ia-1', name: 'Software License' }]);
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_GetAllIntangibleAssets(?)', ['c1']);
    });

    it('should return empty array when no results', async () => {
      mockPool.query.mockResolvedValue([[[]], []]);
      const result = await getAllIntangibleAssets('c1');
      expect(result).toEqual([]);
    });
  });

  describe('createIntangibleAsset', () => {
    it('should call SP with asset data', async () => {
      const data = { name: 'License', description: 'Annual', remarks: null, type: 'software', status: 'Active', companyId: 'c1', createdBy: 'u1' };
      mockPool.query.mockResolvedValue([[{ insertId: 'new-ia' }], []]);
      const result = await createIntangibleAsset(data);
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_CreateIntangibleAsset(?, ?, ?, ?, ?, ?, ?)', expect.any(Array));
    });
  });

  describe('createIntangibleAssetsBulk', () => {
    it('should create multiple assets and collect results', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ insertId: 'ia-1' }], []])
        .mockResolvedValueOnce([[{ insertId: 'ia-2' }], []]);
      const assets = [
        { name: 'License A', description: null, remarks: null, type: 'software', status: 'Active' },
        { name: 'License B', description: null, remarks: null, type: 'software', status: 'Active' },
      ];
      const results = await createIntangibleAssetsBulk(assets, 'c1', 'u1');
      expect(results).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in bulk creation gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ insertId: 'ia-1' }], []])
        .mockRejectedValueOnce(new Error('DB error'));
      const assets = [
        { name: 'License A', description: null, remarks: null, type: 'software', status: 'Active' },
        { name: 'License B', description: null, remarks: null, type: 'software', status: 'Active' },
      ];
      const results = await createIntangibleAssetsBulk(assets, 'c1', 'u1');
      expect(results).toHaveLength(2);
      expect(results[1]).toEqual({ error: true, asset: assets[1] });
    });
  });

  describe('getIntangibleAssetById', () => {
    it('should query by id and company', async () => {
      mockPool.query.mockResolvedValue([[{ id: 'ia-1' }], []]);
      const result = await getIntangibleAssetById('ia-1', 'c1');
      expect(result).toEqual({ id: 'ia-1' });
    });
  });

  describe('assignIntangibleAsset', () => {
    it('should call SP with assignment data', async () => {
      mockPool.query.mockResolvedValue([[{}], []]);
      await assignIntangibleAsset('ia-1', 'u1', 'as-1', 'c1');
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_AssignIntangibleAsset(?, ?, ?, ?)', ['ia-1', 'u1', 'as-1', 'c1']);
    });
  });

  describe('unassignIntangibleAsset', () => {
    it('should call SP', async () => {
      mockPool.query.mockResolvedValue([[{}], []]);
      await unassignIntangibleAsset('ia-1', 'c1');
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_UnassignIntangibleAsset(?, ?)', ['ia-1', 'c1']);
    });
  });
});

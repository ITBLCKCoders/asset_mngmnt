import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockAssetRepository = {
  getAllAssets: jest.fn(),
  getAssetById: jest.fn(),
  createAsset: jest.fn(),
  updateAsset: jest.fn(),
  getAssetAssignments: jest.fn(),
  getAssetDocuments: jest.fn(),
};

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../repositories/AssetRepository.js', () => ({
  AssetRepository: jest.fn(() => mockAssetRepository),
}));

const { AssetService } = require('../../services/asset.service.js');

describe('AssetService', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssetService();
  });

  describe('getAll', () => {
    it('should return assets from repository', async () => {
      const expected = { assets: [{ assetID: 'a1' }], pagination: { page: 1, total: 1 } };
      mockAssetRepository.getAllAssets.mockResolvedValue(expected);
      const result = await service.getAll(1, 10, {});
      expect(result).toEqual(expected);
      expect(mockAssetRepository.getAllAssets).toHaveBeenCalledWith(1, 10, {});
    });

    it('should throw error when repository fails', async () => {
      mockAssetRepository.getAllAssets.mockRejectedValue(new Error('DB error'));
      await expect(service.getAll(1, 10, {})).rejects.toThrow('Failed to fetch assets');
    });
  });

  describe('getById', () => {
    it('should return asset when found', async () => {
      const expected = { assetID: 'a1', name: 'Test Asset' };
      mockAssetRepository.getAssetById.mockResolvedValue(expected);
      const result = await service.getById('a1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundError when not found', async () => {
      mockAssetRepository.getAssetById.mockResolvedValue(null);
      await expect(service.getById('a1')).rejects.toThrow('Asset with ID a1 not found');
    });
  });

  describe('create', () => {
    const validData = { name: 'New Asset', category_id: 'cat-1', company_id: 'c1' };

    it('should create asset with valid data', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ companyID: 'c1' }], []]);
      mockAssetRepository.createAsset.mockResolvedValue({ assetID: 'new-1' });
      const result = await service.create(validData, 'user-1');
      expect(result).toEqual({ assetID: 'new-1' });
    });

    it('should throw ValidationError when name is missing', async () => {
      await expect(service.create({ category_id: 'cat-1' }, 'user-1')).rejects.toThrow('Name and category are required');
    });

    it('should throw ValidationError when category_id is missing', async () => {
      await expect(service.create({ name: 'Test' }, 'user-1')).rejects.toThrow('Name and category are required');
    });

    it('should throw ValidationError when company foreign key is invalid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      await expect(service.create(validData, 'user-1')).rejects.toThrow('Invalid company ID');
    });
  });

  describe('update', () => {
    it('should update asset when exists', async () => {
      mockAssetRepository.getAssetById.mockResolvedValue({ assetID: 'a1' });
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ companyID: 'c1' }], []]);
      mockAssetRepository.updateAsset.mockResolvedValue({ assetID: 'a1', name: 'Updated' });
      const result = await service.update('a1', { name: 'Updated', company_id: 'c1' }, 'user-1');
      expect(result).toEqual({ assetID: 'a1', name: 'Updated' });
    });

    it('should throw NotFoundError when asset not found', async () => {
      mockAssetRepository.getAssetById.mockResolvedValue(null);
      await expect(service.update('a1', { name: 'Updated' }, 'user-1')).rejects.toThrow('Asset with ID a1 not found');
    });
  });

  describe('delete', () => {
    it('should delete asset via stored procedure', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[{ affected_rows: 1 }]], []]);
      const result = await service.delete('a1', 'user-1');
      expect(result).toEqual({ message: 'Asset deleted successfully' });
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_delete_asset(?, ?)', ['a1', 'user-1']);
    });

    it('should throw NotFoundError when no rows affected', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[{ affected_rows: 0 }]], []]);
      await expect(service.delete('a1', 'user-1')).rejects.toThrow('Asset with ID a1 not found');
    });
  });

  describe('getAssignments', () => {
    it('should return assignments from repository', async () => {
      const expected = [{ assignmentID: 'as-1' }];
      mockAssetRepository.getAssetAssignments.mockResolvedValue(expected);
      const result = await service.getAssignments('a1');
      expect(result).toEqual(expected);
    });
  });

  describe('getDocuments', () => {
    it('should return documents from repository', async () => {
      const expected = [{ documentID: 'doc-1' }];
      mockAssetRepository.getAssetDocuments.mockResolvedValue(expected);
      const result = await service.getDocuments('a1');
      expect(result).toEqual(expected);
    });
  });
});

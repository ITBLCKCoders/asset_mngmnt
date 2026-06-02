import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindByAssetId = jest.fn();
const mockCreateAuditLog = jest.fn();

jest.mock('../../models/assetAssignment.model.js', () => ({
  AssetAssignmentModel: {
    findAll: (...args: any[]) => mockFindAll(...args),
    findById: (...args: any[]) => mockFindById(...args),
    findByAssetId: (...args: any[]) => mockFindByAssetId(...args),
  },
}));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../utils/audit.js', () => ({
  createAuditLog: (...args: any[]) => mockCreateAuditLog(...args),
}));

const { AssetAssignmentService } = require('../../services/assetAssignment.service.js');

describe('AssetAssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssetAssignments', () => {
    it('should return all assignments', async () => {
      const expected = [{ assetAssignmentID: 'aa-1', asset_id: 'a1' }];
      mockFindAll.mockResolvedValue(expected);
      const result = await AssetAssignmentService.getAssetAssignments();
      expect(result).toEqual(expected);
    });

    it('should throw when model fails', async () => {
      mockFindAll.mockRejectedValue(new Error('DB error'));
      await expect(AssetAssignmentService.getAssetAssignments()).rejects.toThrow('Failed to fetch asset assignments');
    });
  });

  describe('getAssetAssignmentById', () => {
    it('should return assignment when found', async () => {
      const expected = { assetAssignmentID: 'aa-1', asset_id: 'a1' };
      mockFindById.mockResolvedValue(expected);
      const result = await AssetAssignmentService.getAssetAssignmentById('aa-1');
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null);
      const result = await AssetAssignmentService.getAssetAssignmentById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAssetAssignmentsByAssetId', () => {
    it('should return assignments by asset ID', async () => {
      const expected = [{ assetAssignmentID: 'aa-1', asset_id: 'a1' }];
      mockFindByAssetId.mockResolvedValue(expected);
      const result = await AssetAssignmentService.getAssetAssignmentsByAssetId('a1');
      expect(result).toEqual(expected);
    });

    it('should return empty array when no assignments exist', async () => {
      mockFindByAssetId.mockResolvedValue([]);
      const result = await AssetAssignmentService.getAssetAssignmentsByAssetId('a1');
      expect(result).toEqual([]);
    });
  });
});

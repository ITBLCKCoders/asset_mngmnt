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
  hasActiveAssignment,
} = require('../../repositories/intangibleAssets.repository.js');

describe('intangibleAssets.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllIntangibleAssets', () => {
    it('should call SP with company id and parse assignees', async () => {
      mockPool.query
        .mockResolvedValueOnce([[[
          {
            id: 'ia-1',
            name: 'Software License',
            assignees: JSON.stringify([{ userId: 'u1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }]),
            created_by_name: 'Admin User',
            updated_by_name: 'Admin User',
            risk_level: JSON.stringify({ id: 'rl-1', name: 'High', color: '#dc2626' }),
          },
        ]], []])
        .mockResolvedValueOnce([[], []]);
      const result = await getAllIntangibleAssets('c1');
      expect(result).toEqual([
        {
          id: 'ia-1',
          name: 'Software License',
          assignees: [{ userId: 'u1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }],
          pendingAssignees: [],
          isPendingSignature: false,
          created_by_name: 'Admin User',
          updated_by_name: 'Admin User',
          risk_level: { id: 'rl-1', name: 'High', color: '#dc2626' },
          type_department: null,
        },
      ]);
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_GetAllIntangibleAssets(?)', ['c1']);
    });

    it('should attach pending assignees held as Inactive', async () => {
      mockPool.query
        .mockResolvedValueOnce([[[
          {
            id: 'ia-1',
            name: 'Software License',
            assignees: JSON.stringify([]),
            created_by_name: 'Admin User',
            updated_by_name: 'Admin User',
            risk_level: null,
          },
        ]], []])
        .mockResolvedValueOnce([[
          {
            intangible_asset_id: 'ia-1',
            user_id: 'u2',
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            assigned_date: '2024-01-02',
          },
        ], []]);
      const result = await getAllIntangibleAssets('c1');
      expect(result[0].assignees).toEqual([]);
      expect(result[0].pendingAssignees).toEqual([
        { userId: 'u2', firstName: 'John', lastName: 'Smith', email: 'john@example.com', assignedDate: '2024-01-02' },
      ]);
      expect(result[0].isPendingSignature).toBe(true);
    });

    it('should return empty array when no results', async () => {
      mockPool.query.mockResolvedValue([[[]], []]);
      const result = await getAllIntangibleAssets('c1');
      expect(result).toEqual([]);
    });
  });

  describe('createIntangibleAsset', () => {
    it('should call SP with asset data', async () => {
      const data = { name: 'License', description: 'Annual', remarks: null, type: 'software', riskLevelId: null, status: 'Active', companyId: 'c1', createdBy: 'u1' };
      mockPool.query.mockResolvedValue([[{ insertId: 'new-ia' }], []]);
      const result = await createIntangibleAsset(data);
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_CreateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?)', expect.any(Array));
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

  describe('updateIntangibleAsset', () => {
    it('should call SP with update data', async () => {
      mockPool.query.mockResolvedValue([[{}], []]);
      await updateIntangibleAsset('ia-1', {
        name: 'License',
        description: 'Annual',
        remarks: null,
        type: 'software',
        riskLevelId: 'rl-2',
        status: 'Active',
        companyId: 'c1',
        updatedBy: 'u1',
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        'CALL sp_UpdateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['ia-1', 'License', 'Annual', null, 'software', 'rl-2', 'Active', 'c1', 'u1']
      );
    });
  });

  describe('getIntangibleAssetById', () => {
    it('should query by id and company', async () => {
      mockPool.query.mockResolvedValue([[{ id: 'ia-1' }], []]);
      const result = await getIntangibleAssetById('ia-1', 'c1');
      expect(result).toEqual({ id: 'ia-1' });
    });
  });

  describe('hasActiveAssignment', () => {
    it('should return true when active assignment exists', async () => {
      mockPool.query.mockResolvedValue([[{ 1: 1 }], []]);
      const result = await hasActiveAssignment('ia-1', 'u1');
      expect(result).toBe(true);
    });
  });

  describe('assignIntangibleAsset', () => {
    it('should call SP with assignment data when not already assigned', async () => {
      mockPool.query
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([[{}], []]);
      const result = await assignIntangibleAsset({
        id: 'ia-1',
        assignedTo: 'u1',
        assignmentId: 'as-1',
        companyId: 'c1',
        assignedBy: 'admin-1',
      });
      expect(result).toEqual({ assigned: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        'CALL sp_AssignIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?)',
        ['ia-1', 'u1', 'as-1', 'c1', 'admin-1', null, null, null]
      );
    });

    it('should skip assignment when user already assigned', async () => {
      mockPool.query.mockResolvedValueOnce([[{ 1: 1 }], []]);
      const result = await assignIntangibleAsset({
        id: 'ia-1',
        assignedTo: 'u1',
        assignmentId: 'as-1',
        companyId: 'c1',
      });
      expect(result).toEqual({ assigned: false });
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('unassignIntangibleAsset', () => {
    it('should call SP with asset, user, and company', async () => {
      mockPool.query.mockResolvedValue([[{}], []]);
      await unassignIntangibleAsset('ia-1', 'u1', 'c1');
      expect(mockPool.query).toHaveBeenCalledWith(
        'CALL sp_UnassignIntangibleAsset(?, ?, ?)',
        ['ia-1', 'u1', 'c1']
      );
    });
  });
});

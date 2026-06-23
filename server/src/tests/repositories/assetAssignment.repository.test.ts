import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn(), query: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  findUserById,
  findAssetByCode,
  findActiveAssignmentByAssetId,
  softDeleteAssignment,
  findBuilderByAssetId,
  getAssetChildrenForUser,
  getAllActiveAssignmentsForUserId,
  findNonDeletedAssignmentById,
} = require('../../repositories/assetAssignment.repository.js');

describe('assetAssignment.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserById', () => {
    it('should return user basic info', async () => {
      mockPool.execute.mockResolvedValue([[{ userID: 'u1', first_name: 'John' }], []]);
      const result = await findUserById('u1');
      expect(result).toEqual({ userID: 'u1', first_name: 'John' });
    });

    it('should return undefined when not found', async () => {
      mockPool.execute.mockResolvedValue([[[]], []]);
      const result = await findUserById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('findAssetByCode', () => {
    it('should return asset with status', async () => {
      mockPool.execute.mockResolvedValue([[{ assetID: 'a1', status: 'Available' }], []]);
      const result = await findAssetByCode('A001');
      expect(result).toEqual({ assetID: 'a1', status: 'Available' });
    });
  });

  describe('findActiveAssignmentByAssetId', () => {
    it('should return active assignment', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'as1', user_id: 'u1' }], []]);
      const result = await findActiveAssignmentByAssetId('a1');
      expect(result).toEqual({ assignmentID: 'as1', user_id: 'u1' });
    });
  });

  describe('softDeleteAssignment', () => {
    it('should update deleted_at', async () => {
      mockPool.execute.mockResolvedValue([[{}], []]);
      await softDeleteAssignment('as1', 'admin');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE asset_assignments'),
        expect.arrayContaining(['admin', 'as1'])
      );
    });
  });

  describe('findBuilderByAssetId', () => {
    it('should return builder for asset', async () => {
      mockPool.execute.mockResolvedValue([[{ builderID: 'b1', name: 'Builder A', builder_status: 'Assigned' }], []]);
      const result = await findBuilderByAssetId('a1');
      expect(result).toEqual([{ builderID: 'b1', name: 'Builder A', builder_status: 'Assigned' }]);
    });
  });

  describe('getAssetChildrenForUser', () => {
    it('should return children assets for user assignments', async () => {
      mockPool.execute.mockResolvedValue([[{ assetID: 'child-1', name: 'Monitor' }], []]);
      const result = await getAssetChildrenForUser('u1');
      expect(result).toBeDefined();
    });
  });

  describe('getAllActiveAssignmentsForUserId', () => {
    it('should return active assignments', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'as1' }], []]);
      const result = await getAllActiveAssignmentsForUserId('u1');
      expect(result).toEqual([{ assignmentID: 'as1' }]);
    });
  });

  describe('findNonDeletedAssignmentById', () => {
    it('should return non-deleted assignment', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'as1' }], []]);
      const result = await findNonDeletedAssignmentById('as1');
      expect(result).toEqual({ assignmentID: 'as1' });
    });
  });
});

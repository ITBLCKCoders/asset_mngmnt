import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  getAssetChecklists,
  getAssetChecklistById,
} = require('../../repositories/assetChecklistList.repository.js');

describe('assetChecklistList.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssetChecklists', () => {
    it('should return all checklists', async () => {
      mockPool.execute.mockResolvedValue([[{ checklist_id: 'cl-1' }], []]);
      const result = await getAssetChecklists();
      expect(result).toEqual([{ checklist_id: 'cl-1' }]);
    });
  });

  describe('getAssetChecklistById', () => {
    it('should return checklist by id', async () => {
      mockPool.execute.mockResolvedValue([[{ checklist_id: 'cl-1' }], []]);
      const result = await getAssetChecklistById('cl-1');
      expect(result).toEqual({ checklist_id: 'cl-1' });
    });
  });
});

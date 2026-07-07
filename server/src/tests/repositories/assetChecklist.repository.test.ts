import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  createAssetChecklist,
  getChecklistByAssignmentId,
} = require('../../repositories/assetChecklist.repository.js');

describe('assetChecklist.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssetChecklist', () => {
    it('should insert checklist and return insertId', async () => {
      mockPool.execute.mockResolvedValue([[{ insertId: 'cl-1' }], []]);
      const result = await createAssetChecklist({ assignment_id: 'as1' });
      expect(result).toEqual({ insertId: 'cl-1' });
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array)
      );
    });
  });

  describe('getChecklistByAssignmentId', () => {
    it('should return checklist for assignment', async () => {
      const expected = { checklist_id: 'cl-1', items: '[]' };
      mockPool.execute.mockResolvedValue([[expected], []]);
      const result = await getChecklistByAssignmentId('as1');
      expect(result).toEqual(expected);
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { getIntangibleAssignments } = require('../../repositories/assetAssignment.repository.js');

describe('assetAssignment.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getIntangibleAssignments', () => {
    it('should fetch intangible assignments for a specific company', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'ia-1' }], []]);
      const result = await getIntangibleAssignments('c1');
      expect(result).toEqual([{ assignmentID: 'ia-1' }]);
      expect(mockPool.execute).toHaveBeenCalledTimes(1);
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).toContain('AND ia.company_id = ?');
      expect(params).toEqual(['c1']);
    });

    it('should fetch intangible assignments across all companies when companyId is null', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'ia-1' }, { assignmentID: 'ia-2' }], []]);
      const result = await getIntangibleAssignments(null);
      expect(result).toEqual([{ assignmentID: 'ia-1' }, { assignmentID: 'ia-2' }]);
      const [sql, params] = mockPool.execute.mock.calls[0];
      expect(sql).not.toContain('ia.company_id = ?');
      expect(params).toEqual([]);
    });
  });
});

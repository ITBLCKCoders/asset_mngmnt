import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));

const { getEligibleApproversForUser } = require('../../repositories/userApprovers.repository.js');

describe('userApprovers.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEligibleApproversForUser', () => {
    it.each(['approver', 'ma3', 'sub_approver'] as const)(
      'excludes the target user from the eligible list for type "%s"',
      async type => {
        mockPool.execute.mockResolvedValue([[{ userID: 'other-user' }], []]);
        const result = await getEligibleApproversForUser('target-user', type);
        expect(result).toEqual([{ userID: 'other-user' }]);
        const [sql, params] = mockPool.execute.mock.calls[0];
        expect(sql).toContain('u.userID <> ?');
        expect(params).toEqual(['target-user', 'target-user']);
      }
    );
  });
});
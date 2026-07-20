import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { query: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));

const {
  getActiveCompany,
  getScopedActiveCompany,
} = require('../../utils/activeCompany.js');

describe('activeCompany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveCompany', () => {
    it('should return company from stored procedure', async () => {
      mockPool.query.mockResolvedValue([[[{ companyID: 'c1', name: 'Test Corp' }]], []]);
      const result = await getActiveCompany(mockPool);
      expect(result).toEqual({ companyID: 'c1', name: 'Test Corp' });
      expect(mockPool.query).toHaveBeenCalledWith('CALL sp_GetActiveCompany()');
    });

    it('should return null when no active company', async () => {
      mockPool.query.mockResolvedValue([[[], []], []]);
      const result = await getActiveCompany(mockPool);
      expect(result).toBeNull();
    });
  });

  describe('getScopedActiveCompany', () => {
    it('should return global active for admin user', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM users u')) {
          return [[{ role_name: 'Global Admin' }], []];
        }
        if (sql.includes('CALL sp_GetActiveCompany')) {
          return [[[{ companyID: 'c1', name: 'Global' }]], []];
        }
        return [[], []];
      });
      const result = await getScopedActiveCompany(mockPool, 'admin-u1');
      expect(result).toEqual({ companyID: 'c1', name: 'Global' });
    });

    it('should return user company for non-admin user', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM users u')) {
          return [[{ role_name: 'User' }], []];
        }
        if (sql.includes('FROM companies')) {
          return [[{ companyID: 'c2', name: 'User Corp' }], []];
        }
        return [[], []];
      });
      const result = await getScopedActiveCompany(mockPool, 'user-u1');
      expect(result).toEqual({ companyID: 'c2', name: 'User Corp' });
    });

    it('should fallback to global active when user has no company', async () => {
      mockPool.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM users u')) {
          return [[{ role_name: 'User' }], []];
        }
        if (sql.includes('FROM companies')) {
          return [[], []];
        }
        if (sql.includes('CALL sp_GetActiveCompany')) {
          return [[[{ companyID: 'c1', name: 'Fallback' }]], []];
        }
        return [[], []];
      });
      const result = await getScopedActiveCompany(mockPool, 'user-u2');
      expect(result).toEqual({ companyID: 'c1', name: 'Fallback' });
    });

    it('should return global active when no userId', async () => {
      mockPool.query.mockResolvedValue([[[{ companyID: 'c1', name: 'Global' }]], []]);
      const result = await getScopedActiveCompany(mockPool);
      expect(result).toEqual({ companyID: 'c1', name: 'Global' });
    });

    it('should return null when no active company and no user', async () => {
      mockPool.query.mockResolvedValue([[[], []], []]);
      const result = await getScopedActiveCompany(mockPool);
      expect(result).toBeNull();
    });
  });
});

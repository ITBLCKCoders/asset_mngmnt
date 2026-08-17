import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  getReturnFormsByAssetId,
  getReturnFormById,
  getCategoryDepartmentForAssetIds,
  fetchUserDigitalSignature,
  buildReturnScopeClause,
  fetchAssetReturnFormsRowsForUserList,
} = require('../../repositories/assetReturn.repository.js');

describe('assetReturn.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReturnFormsByAssetId', () => {
    it('should return return forms for asset', async () => {
      mockPool.execute.mockResolvedValue([[{ return_form_id: 'rf1' }], []]);
      const result = await getReturnFormsByAssetId('a1');
      expect(result).toEqual([{ return_form_id: 'rf1' }]);
    });
  });

  describe('getReturnFormById', () => {
    it('should return return form by id', async () => {
      mockPool.execute.mockResolvedValue([[{ return_form_id: 'rf1', form_number: 'RF-001' }], []]);
      const result = await getReturnFormById('rf1');
      expect(result).toEqual({ return_form_id: 'rf1', form_number: 'RF-001' });
    });
  });

  describe('getCategoryDepartmentForAssetIds', () => {
    it('should return category and department for assets', async () => {
      mockPool.execute.mockResolvedValue([[{ assetID: 'a1', category_id: 'c1', department_name: 'IT' }], []]);
      const result = await getCategoryDepartmentForAssetIds(['a1']);
      expect(result).toEqual([{ assetID: 'a1', category_id: 'c1', department_name: 'IT' }]);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('IN (?)'),
        [['a1']]
      );
    });
  });

  describe('fetchUserDigitalSignature', () => {
    it('should return digital signature for user', async () => {
      mockPool.execute.mockResolvedValue([[{ digital_signature: 'sig-data' }], []]);
      const result = await fetchUserDigitalSignature('u1');
      expect(result).toBe('sig-data');
    });

    it('should return null when user not found', async () => {
      mockPool.execute.mockResolvedValue([[[]], []]);
      const result = await fetchUserDigitalSignature('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('buildReturnScopeClause', () => {
    it('should return empty clause when no scope given', () => {
      const clause = buildReturnScopeClause();
      expect(clause.sql).toBe('');
      expect(clause.params).toEqual([]);
    });

    it('should build company clause with leading space and params', () => {
      const clause = buildReturnScopeClause('c1');
      expect(clause.sql).toBe(' AND d.company_id = ?');
      expect(clause.params).toEqual(['c1']);
    });

    it('should build company and department clause with leading spaces', () => {
      const clause = buildReturnScopeClause('c1', ['d1', 'd2']);
      expect(clause.sql).toBe(' AND d.company_id = ? AND d.departmentID IN (?,?)');
      expect(clause.params).toEqual(['c1', 'd1', 'd2']);
    });

    it('should build department-only clause', () => {
      const clause = buildReturnScopeClause(undefined, ['d1']);
      expect(clause.sql).toBe(' AND d.departmentID IN (?)');
      expect(clause.params).toEqual(['d1']);
    });
  });

  describe('fetchAssetReturnFormsRowsForUserList', () => {
    it('should concatenate scope clause after WHERE without missing space', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      await fetchAssetReturnFormsRowsForUserList('c1');
      const calledSql = mockPool.execute.mock.calls[0][0];
      expect(calledSql).toContain('WHERE arf.deleted_at IS NULL AND d.company_id = ?');
      expect(calledSql).not.toContain('NULLAND');
    });

    it('should pass scope params to execute', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      await fetchAssetReturnFormsRowsForUserList('c1', ['d1']);
      expect(mockPool.execute.mock.calls[0][1]).toEqual(['c1', 'd1']);
    });
  });
});

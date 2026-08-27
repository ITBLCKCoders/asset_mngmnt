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
    it('should map return-forms rows to the asset DTO shape with status', async () => {
      mockPool.execute.mockResolvedValue([
        [
          {
            formID: 'rf1', form_number: 'RF-001', user_id: 'u1',
            created_at: '2024-01-01', signed_at: null,
            return_type: 'Full', received_by: 'IT',
            declined_at: null, process_signed_at: '2024-01-02',
            dept_head_signed_at: '2024-01-01', processor_declined_at: null,
            first_name: 'John', last_name: 'Doe', email: 'john@test.com',
            department_name: 'IT', location_name: 'HQ',
          },
        ],
        [],
      ]);
      const result = await getReturnFormsByAssetId('a1');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('JOIN asset_assignments aa ON ar.assignment_id = aa.assignmentID'),
        ['a1']
      );
      expect(result).toEqual([
        {
          id: 'rf1',
          formNumber: 'RF-001',
          status: 'Processed',
          created_at: '2024-01-01',
          signed_at: null,
          return_type: 'Full',
          received_by: 'IT',
          user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
          department_name: 'IT',
          location_name: 'HQ',
        },
      ]);
    });

    it('should deduplicate a return form covering multiple assets', async () => {
      mockPool.execute.mockResolvedValue([
        [
          {
            formID: 'rf2', form_number: 'RF-002', user_id: 'u1',
            created_at: '2024-01-03', signed_at: null, return_type: '', received_by: '',
            declined_at: null, process_signed_at: null,
            dept_head_signed_at: null, processor_declined_at: null,
            first_name: 'Jane', last_name: 'Roe', email: 'jane@test.com',
            department_name: null, location_name: null,
          },
          {
            formID: 'rf2', form_number: 'RF-002', user_id: 'u1',
            created_at: '2024-01-03', signed_at: null, return_type: '', received_by: '',
            declined_at: null, process_signed_at: null,
            dept_head_signed_at: null, processor_declined_at: null,
            first_name: 'Jane', last_name: 'Roe', email: 'jane@test.com',
            department_name: null, location_name: null,
          },
        ],
        [],
      ]);
      const result = await getReturnFormsByAssetId('a1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rf2');
      expect(result[0].status).toBe('Pending');
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

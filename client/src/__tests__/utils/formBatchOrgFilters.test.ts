import { describe, it, expect } from 'vitest';
import {
  returnRowDepartmentId,
  returnBatchMatchesOrgFilters,
  transferRowDepartmentId,
  transferBatchMatchesOrgFilters,
  collectCompanyOptionsFromReturnBatches,
  collectDepartmentOptionsFromReturnBatches,
  collectCompanyOptionsFromTransferBatches,
  collectDepartmentOptionsFromTransferBatches,
} from '@/utils/formBatchOrgFilters';

const makeReturnBatch = (overrides = {}) => ({
  form_department: null,
  returns: [
    {
      assignment: {
        user: { company: { id: 'c1', name: 'Corp A' }, department: { id: 'd1', name: 'IT' } },
        department: null,
      },
    },
  ],
  ...overrides,
});

const makeTransferBatch = (overrides = {}) => ({
  new_assigned_user: null,
  returns: [
    {
      assignment: {
        user: { company: { id: 'c1', name: 'Corp A' }, department: { id: 'd1', name: 'IT' } },
        department: null,
      },
    },
  ],
  ...overrides,
});

describe('formBatchOrgFilters', () => {
  describe('returnRowDepartmentId', () => {
    it('should return user department id', () => {
      const result = returnRowDepartmentId(makeReturnBatch(), { assignment: { user: { department: { id: 'd1', name: 'IT' } } } });
      expect(result).toBe('d1');
    });

    it('should fallback to form_department', () => {
      const result = returnRowDepartmentId(
        { form_department: { id: 'd2', name: 'HR' }, returns: [{ assignment: null }] },
        { assignment: null }
      );
      expect(result).toBe('d2');
    });

    it('should return empty string as last fallback', () => {
      const result = returnRowDepartmentId(
        { form_department: null, returns: [{ assignment: null }] },
        { assignment: null }
      );
      expect(result).toBe('');
    });
  });

  describe('returnBatchMatchesOrgFilters', () => {
    it('should match company', () => {
      expect(returnBatchMatchesOrgFilters(makeReturnBatch(), 'c1', '')).toBe(true);
    });

    it('should reject non-matching company', () => {
      expect(returnBatchMatchesOrgFilters(makeReturnBatch(), 'c2', '')).toBe(false);
    });

    it('should match department', () => {
      expect(returnBatchMatchesOrgFilters(makeReturnBatch(), '', 'd1')).toBe(true);
    });
  });

  describe('transferRowDepartmentId', () => {
    it('should return user department id', () => {
      const result = transferRowDepartmentId({ assignment: { user: { department: { id: 'd1', name: 'IT' } } } });
      expect(result).toBe('d1');
    });
  });

  describe('transferBatchMatchesOrgFilters', () => {
    it('should match company in rows', () => {
      expect(transferBatchMatchesOrgFilters(makeTransferBatch(), 'c1', '')).toBe(true);
    });

    it('should match company in recipient', () => {
      const batch = makeTransferBatch({ new_assigned_user: { company: { id: 'c2', name: 'Corp B' } } });
      expect(transferBatchMatchesOrgFilters(batch, 'c2', '')).toBe(true);
    });
  });

  describe('collectCompanyOptionsFromReturnBatches', () => {
    it('should collect unique companies', () => {
      const result = collectCompanyOptionsFromReturnBatches([makeReturnBatch()]);
      expect(result).toEqual([{ id: 'c1', name: 'Corp A' }]);
    });
  });

  describe('collectDepartmentOptionsFromReturnBatches', () => {
    it('should collect departments filtered by company', () => {
      const result = collectDepartmentOptionsFromReturnBatches([makeReturnBatch()], 'c1');
      expect(result).toEqual([{ id: 'd1', name: 'IT' }]);
    });
  });

  describe('collectCompanyOptionsFromTransferBatches', () => {
    it('should collect unique companies', () => {
      const result = collectCompanyOptionsFromTransferBatches([makeTransferBatch()]);
      expect(result).toEqual([{ id: 'c1', name: 'Corp A' }]);
    });
  });

  describe('collectDepartmentOptionsFromTransferBatches', () => {
    it('should collect departments filtered by company', () => {
      const result = collectDepartmentOptionsFromTransferBatches([makeTransferBatch()], 'c1');
      expect(result).toEqual([{ id: 'd1', name: 'IT' }]);
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockGetCategoryDepartmentForAssetIds = jest.fn();
const mockResolveReturnFormCompanyId = jest.fn();
const mockGenerateReturnFormNumber = jest.fn();
const mockGenerateReturnFormNumberFallback = jest.fn();

jest.mock('../../repositories/assetReturn.repository.js', () => ({
  getCategoryDepartmentForAssetIds: (...args: any[]) => mockGetCategoryDepartmentForAssetIds(...args),
  resolveReturnFormCompanyId: (...args: any[]) => mockResolveReturnFormCompanyId(...args),
}));
jest.mock('../../utils/returnFormNumber.js', () => ({
  generateReturnFormNumber: (...args: any[]) => mockGenerateReturnFormNumber(...args),
  generateReturnFormNumberFallback: (...args: any[]) => mockGenerateReturnFormNumberFallback(...args),
}));

const { resolveReturnFormContext } = require('../../services/assetReturn.service.js');

describe('AssetReturnService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveReturnFormContext', () => {
    const defaultArgs = {
      assetIds: ['a1', 'a2'],
      fallbackDepartmentId: 'dept-fallback',
      fallbackUserId: 'user-1',
    };

    it('should resolve context with category dept and company id', async () => {
      mockGetCategoryDepartmentForAssetIds.mockResolvedValue('dept-cat');
      mockResolveReturnFormCompanyId.mockResolvedValue('company-1');
      mockGenerateReturnFormNumber.mockResolvedValue('RET-2026-0001');

      const result = await resolveReturnFormContext(defaultArgs);
      expect(result.categoryDeptId).toBe('dept-cat');
      expect(result.companyId).toBe('company-1');
      expect(result.formNumber).toBe('RET-2026-0001');
      expect(mockGenerateReturnFormNumber).toHaveBeenCalledWith('company-1', 'dept-cat');
    });

    it('should fall back to fallbackDepartmentId when category dept is null', async () => {
      mockGetCategoryDepartmentForAssetIds.mockResolvedValue(null);
      mockResolveReturnFormCompanyId.mockResolvedValue('company-1');
      mockGenerateReturnFormNumber.mockResolvedValue('RET-2026-0002');

      const result = await resolveReturnFormContext(defaultArgs);
      expect(result.categoryDeptId).toBeNull();
      expect(result.companyId).toBe('company-1');
      expect(result.formNumber).toBe('RET-2026-0002');
      expect(mockResolveReturnFormCompanyId).toHaveBeenCalledWith('dept-fallback', 'user-1');
    });

    it('should use fallback form number when companyId is null', async () => {
      mockGetCategoryDepartmentForAssetIds.mockResolvedValue(null);
      mockResolveReturnFormCompanyId.mockResolvedValue(null);
      mockGenerateReturnFormNumberFallback.mockResolvedValue('RET-20260601-0001');

      const result = await resolveReturnFormContext(defaultArgs);
      expect(result.categoryDeptId).toBeNull();
      expect(result.companyId).toBeNull();
      expect(result.formNumber).toBe('RET-20260601-0001');
      expect(mockGenerateReturnFormNumber).not.toHaveBeenCalled();
      expect(mockGenerateReturnFormNumberFallback).toHaveBeenCalled();
    });

    it('should handle null fallbackDepartmentId and null fallbackUserId', async () => {
      mockGetCategoryDepartmentForAssetIds.mockResolvedValue(null);
      mockResolveReturnFormCompanyId.mockResolvedValue(null);
      mockGenerateReturnFormNumberFallback.mockResolvedValue('RET-20260601-XXXX');

      const result = await resolveReturnFormContext({
        assetIds: ['a1'],
        fallbackDepartmentId: null,
        fallbackUserId: null,
      });
      expect(result.companyId).toBeNull();
      expect(result.formNumber).toBe('RET-20260601-XXXX');
      expect(mockResolveReturnFormCompanyId).toHaveBeenCalledWith(null, null);
    });
  });
});

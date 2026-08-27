import { describe, it, expect } from '@jest/globals';

const {
  calculateAccumulatedDepreciation,
  calculateStraightLineAccumulatedDepreciation,
  calculateYearsDepreciated,
  computeAssetDepreciationFields,
} = require('../../utils/depreciation.js');

const AS_OF = new Date('2026-01-01T00:00:00Z');

const baseAsset = {
  asset_value: 120000,
  salvage_value: 0,
  annual_depreciation: 24000,
  depreciation_start_date: '2025-01-01',
  useful_life_years: 5,
};

describe('depreciation utils', () => {
  describe('calculateYearsDepreciated', () => {
    it('returns 0 when no start date', () => {
      expect(calculateYearsDepreciated(null, AS_OF)).toBe(0);
    });

    it('returns fractional years elapsed', () => {
      const years = calculateYearsDepreciated('2024-07-01', AS_OF);
      expect(years).toBeCloseTo(1.503, 2);
    });
  });

  describe('calculateStraightLineAccumulatedDepreciation', () => {
    it('accumulates annual depreciation over elapsed time', () => {
      // ~1 full year elapsed of a 5-year life (365 days / 365.25)
      const expected = (24000 * 365) / 365.25;
      expect(calculateStraightLineAccumulatedDepreciation(baseAsset, AS_OF)).toBeCloseTo(expected, 0);
    });

    it('caps at depreciable value once useful life elapses', () => {
      const fullyDepreciated = { ...baseAsset, depreciation_start_date: '2020-01-01' };
      expect(calculateStraightLineAccumulatedDepreciation(fullyDepreciated, AS_OF)).toBe(120000);
    });

    it('never exceeds depreciable value mid-life', () => {
      const withSalvage = { ...baseAsset, salvage_value: 20000 };
      expect(calculateStraightLineAccumulatedDepreciation(withSalvage, AS_OF)).toBeLessThanOrEqual(100000);
    });

    it('returns 0 before the start date', () => {
      const notStarted = { ...baseAsset, depreciation_start_date: '2027-01-01' };
      expect(calculateStraightLineAccumulatedDepreciation(notStarted, AS_OF)).toBe(0);
    });

    it('returns 0 when annual depreciation is missing', () => {
      const noAnnual = { ...baseAsset, annual_depreciation: null };
      expect(calculateStraightLineAccumulatedDepreciation(noAnnual, AS_OF)).toBe(0);
    });

    it('returns 0 when asset value is missing', () => {
      const noValue = { ...baseAsset, asset_value: null };
      expect(calculateStraightLineAccumulatedDepreciation(noValue, AS_OF)).toBe(0);
    });
  });

  describe('calculateAccumulatedDepreciation (reports semantics)', () => {
    it('returns 0 for old units regardless of dates', () => {
      expect(
        calculateAccumulatedDepreciation({ ...baseAsset, is_old_unit: 1 }, AS_OF)
      ).toBe(0);
    });
  });

  describe('computeAssetDepreciationFields (asset list rows)', () => {
    it('computes accumulated, monthly, and book value on read', () => {
      const expectedAccumulated = (24000 * 365) / 365.25;
      const result = computeAssetDepreciationFields(baseAsset, AS_OF);
      expect(result.accumulated_depreciation).toBeCloseTo(expectedAccumulated, 0);
      expect(result.monthly_depreciation).toBeCloseTo(2000, 2);
      expect(result.book_value).toBeCloseTo(120000 - expectedAccumulated, 0);
    });

    it('floors book value at 0 when fully depreciated', () => {
      const result = computeAssetDepreciationFields(
        { ...baseAsset, depreciation_start_date: '2019-06-01' },
        AS_OF
      );
      expect(result.book_value).toBe(0);
      expect(result.accumulated_depreciation).toBe(120000);
    });

    it('keeps stored values for old units', () => {
      const result = computeAssetDepreciationFields(
        {
          ...baseAsset,
          is_old_unit: 1,
          book_value: 5000,
          accumulated_depreciation: 700,
          monthly_depreciation: 10,
        },
        AS_OF
      );
      expect(result.book_value).toBe(5000);
      expect(result.accumulated_depreciation).toBe(700);
      expect(result.monthly_depreciation).toBe(10);
    });
  });
});

/**
 * Shared straight-line depreciation calculations.
 *
 * Single source of truth used by both the asset list (computed on read from
 * `sp_get_assets()` rows) and the finance reports service, so displayed
 * book values always match exported reports.
 */

const DAYS_PER_YEAR = 365.25;

export type DepreciationInput = {
  asset_value?: number | string | null;
  salvage_value?: number | string | null;
  annual_depreciation?: number | string | null;
  depreciation_start_date?: string | Date | null;
  useful_life_years?: number | string | null;
  is_old_unit?: number | boolean | null;
};

export function toNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Fractional years elapsed since the depreciation start date. */
export function calculateYearsDepreciated(
  depreciationStartDate: string | Date | null | undefined,
  asOf: Date = new Date()
): number {
  if (!depreciationStartDate) {
    return 0;
  }

  const startDate = new Date(depreciationStartDate);
  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  return (asOf.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * DAYS_PER_YEAR);
}

/**
 * Core straight-line accumulated depreciation.
 * Capped at the depreciable amount (and at full depreciation once the
 * useful life has elapsed).
 */
export function calculateStraightLineAccumulatedDepreciation(
  input: DepreciationInput,
  asOf: Date = new Date()
): number {
  const assetValue = toNumber(input.asset_value);
  const salvageValue = toNumber(input.salvage_value);
  const annualDepreciation = toNumber(input.annual_depreciation);
  const usefulLifeYears = input.useful_life_years != null ? toNumber(input.useful_life_years) : null;

  if (!assetValue) {
    return 0;
  }

  const yearsElapsed = calculateYearsDepreciated(input.depreciation_start_date, asOf);

  // No time has passed since the start date (or no start date at all)
  if (yearsElapsed <= 0) {
    return 0;
  }

  if (!annualDepreciation) {
    return 0;
  }

  const depreciableValue = Math.max(0, assetValue - salvageValue);

  if (usefulLifeYears !== null && yearsElapsed >= usefulLifeYears) {
    return depreciableValue;
  }

  return Math.min(annualDepreciation * yearsElapsed, depreciableValue);
}

/** Accumulated depreciation where old units are never depreciated. */
export function calculateAccumulatedDepreciation(
  input: DepreciationInput,
  asOf: Date = new Date()
): number {
  if (input.is_old_unit === 1 || input.is_old_unit === true) {
    return 0;
  }

  return calculateStraightLineAccumulatedDepreciation(input, asOf);
}

export type ComputedDepreciationFields = {
  book_value: number | null;
  accumulated_depreciation: number | null;
  monthly_depreciation: number | null;
};

/**
 * Compute-on-read values for an asset list row.
 *
 * Returns dynamically calculated `book_value`, `accumulated_depreciation`,
 * and `monthly_depreciation`. Old units keep their imported/stored values
 * untouched since they were never depreciation-tracked.
 */
export function computeAssetDepreciationFields<
  T extends DepreciationInput & {
    book_value?: number | string | null;
    accumulated_depreciation?: number | string | null;
    monthly_depreciation?: number | string | null;
  }
>(row: T, asOf: Date = new Date()): ComputedDepreciationFields {
  if (row.is_old_unit === 1 || row.is_old_unit === true) {
    return {
      book_value: row.book_value != null ? toNumber(row.book_value) : null,
      accumulated_depreciation: row.accumulated_depreciation != null ? toNumber(row.accumulated_depreciation) : null,
      monthly_depreciation: row.monthly_depreciation != null ? toNumber(row.monthly_depreciation) : null,
    };
  }

  const accumulatedDepreciation = calculateStraightLineAccumulatedDepreciation(row, asOf);
  const annualDepreciation = toNumber(row.annual_depreciation);
  const assetValue = toNumber(row.asset_value);

  return {
    accumulated_depreciation: accumulatedDepreciation,
    monthly_depreciation: annualDepreciation > 0 ? annualDepreciation / 12 : 0,
    book_value: Math.max(0, assetValue - accumulatedDepreciation),
  };
}

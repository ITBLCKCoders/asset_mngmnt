# Plan: Reorder Asset List Columns and Add Depreciation Columns to Export

## Problem
In the Asset List table, `Book Value`, `Accumulated Depreciation`, and `Depreciation / Month` appear far from related depreciation fields. They should be grouped near `Purchase Date`, `Purchase Price`, `Useful Life`, `Salvage / Residual Value`, `Depreciation Method`, and `Depreciation Start Date`. Additionally, these three columns are missing from the export column filter.

## Changes

### 1. Reorder columns in `assetColumns.tsx`
Move the depreciation-related columns to sit together after `salvageValue` and `depreciationMethod`:
- `depreciationStartDate`
- `annualDepreciation`
- `bookValue`
- `accumulatedDepreciation`
- `monthlyDepreciation`

This groups all depreciation fields together and places them near the purchase/financial columns, before `company`, `building`, `createdBy`, etc.

### 2. Update `useAssetExport.ts`
- Add `bookValue`, `accumulatedDepreciation`, and `monthlyDepreciation` to `availableColumns`
- Add them to the default `selectedColumns` Set (both regular export and summary export)
- Add currency formatting in `getExportValue` for the three new keys
- Add width entries in PDF `columnWidths` and Excel `baseColumnWidths`

## Files to Modify
- `client/src/pages/assets/assets-list/assetsComponents/assetTable/assetColumns.tsx`
- `client/src/pages/assets/assets-list/useAssetExport.ts`

## Validation
- Run `npm run test --workspace=client` to verify no regressions
- Verify column order visually in the Asset List table
- Verify the three columns appear in the export dialog filter and are selected by default

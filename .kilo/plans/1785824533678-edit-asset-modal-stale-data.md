# Fix: Edit Asset Modal Shows Stale Data on Reopen

## Problem
After a user with custodian/approver/finance-approver access edits an asset and saves from Step 2, the asset list table correctly displays the updated values. However, when they click Edit on that same asset again, the `EditAssetModal` shows the OLD values instead of the newly saved ones.

## Root Cause
`EditAssetModal` is always rendered in `AssetsPage.tsx` (not conditionally mounted). It simply returns `null` when `isOpen` is false. Because the component instance is preserved across open/close cycles, its internal `formData` state can remain stale if the `useEffect` that converts `asset` → `formData` does not reliably re-run on every reopen. The current effect at `assetEditModal.tsx:601` gates the conversion on `categories.length > 0 && types.length > 0 && brands.length > 0`, which means if any of those arrays are empty or if React batches the prop change in an unexpected way, `formData` can keep old values.

## Plan

### Step 1
Add a `key` prop to `<EditAssetModal>` in `AssetsPage.tsx` so React remounts the component whenever a different asset is selected.

**File to modify:**
- `client/src/pages/assets/assets-list/AssetsPage.tsx`

**Change:**
```tsx
// Before
<EditAssetModal
  isOpen={isEditModalOpen}
  onClose={() => {
    setIsEditModalOpen(false);
    setSelectedAssetForEdit(null);
  }}
  onSubmit={handleUpdateAsset}
  asset={selectedAssetForEdit}
  isFinanceApprover={isFinanceApprover}
/>

// After
<EditAssetModal
  key={selectedAssetForEdit?.id}
  isOpen={isEditModalOpen}
  onClose={() => {
    setIsEditModalOpen(false);
    setSelectedAssetForEdit(null);
  }}
  onSubmit={handleUpdateAsset}
  asset={selectedAssetForEdit}
  isFinanceApprover={isFinanceApprover}
/>
```

### Step 2 (Optional hardening)
Inside `EditAssetModal`, tighten the `useEffect` that converts `asset` → `formData` so it always runs when the asset ID changes, independent of the dropdown-data gate.

**File to modify:**
- `client/src/pages/assets/assets-list/assetsComponents/assetEditModal.tsx`

**Change (lines ~601-618):**
```tsx
// Before
useEffect(() => {
  if (
    isOpen &&
    asset &&
    categories.length > 0 &&
    types.length > 0 &&
    brands.length > 0
  ) {
    const convertedData = convertAssetToFormData(
      asset,
      categories,
      types,
      brands,
      locations
    );
    setFormData(convertedData);
  }
}, [isOpen, asset, categories, types, brands, locations]);

// After
useEffect(() => {
  if (!isOpen || !asset) return;
  const convertedData = convertAssetToFormData(
    asset,
    categories,
    types,
    brands,
    locations
  );
  setFormData(convertedData);
}, [asset?.id, isOpen, categories, types, brands, locations]);
```

Note: `convertAssetToFormData` already falls back to `asset.*` fields when lookup arrays are empty, so removing the `categories.length > 0` guard is safe.

## Validation
1. Open Asset List, edit an asset as a finance approver (Step 2 only), save.
2. Confirm the table row reflects the new values.
3. Click Edit on the same asset again.
4. Confirm the modal now displays the updated values (not the old ones).
5. Repeat for a non-finance-approver user editing across all steps.

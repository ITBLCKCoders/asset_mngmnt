# Fix: Builder Assets Show Wrong Status When Builder Contains Assigned Assets

## Problem

When a user creates an Asset Builder and includes assets that are already assigned (either as parent or child), all assets in the builder display as **Available** because they inherit the builder's default status. This is misleading because:

1. Assigned assets appear Available in the builder view
2. When the user tries to assign those assets via Asset Issuance, the server rejects with `"Asset X is already assigned to this user"`
3. The user cannot tell from the UI which assets in the builder are actually assigned vs available

### Root Cause

Two issues:

1. **Assigned assets can be added to builders** (`assetBuilder.tsx`): `selectableAssets` only filters out assets already in other builders or with builder history. It does **not** filter out assets whose `status === 'Assigned'`. This allows creating builders with a mix of assigned and available assets.

2. **All builder assets display the builder's status, not their own**: In the asset list, my assets, and search, the code uses `asset.isAssetBuilder && asset.builderStatus ? asset.builderStatus : asset.status` for parent assets, and child assets always get `status: builderStatus ?? 'Partial'`. When a builder's status is `Available` (the default), all assets appear Available even if some are actually assigned.

### Scenario

- Asset **BCGI-ITOFE-LAP-OU-00096** is already assigned to a user (`status = Assigned`, `currentAssignment` populated)
- User creates builder **Alienware Laptop** with this asset as parent, plus some available child assets
- Builder is created with `status = Available`
- All assets in the builder now show as **Available** in the UI
- User goes to Asset Issuance, sees all builder assets as Available, selects the parent
- Server rejects: `"Asset BCGI-ITOFE-LAP-OU-00096 is already assigned to this user"`

## Clarification: Child asset behavior

**Child assets (`isBuilderChild = true`, `isAssetBuilder = false`) showing the builder's status is correct by design.** Child assets are part of the builder group and their display status should reflect the builder's collective state. This plan does **not** change child asset status display.

The fix focuses on two things:
1. **Preventing assigned assets from being added to builders** — this avoids creating builders with misleading mixed statuses
2. **Showing the parent asset's actual status** — the parent is a real independent asset with its own assignment record, so it should reflect its true state

## Plan

### Step 1: Prevent selecting assigned assets for builders

**File:** `client/src/pages/assets/assetBuilder.tsx`

In the `selectableAssets` filter (around line 129–136), add `asset.status !== 'Assigned'`. This prevents users from selecting already-assigned assets as either parent or child when creating a builder.

```ts
// Before
return assets.filter(
  asset =>
    !groupedAssetIds.has(asset.id.trim()) &&
    (!asset.builderHistory || asset.builderHistory.length === 0)
);

// After
return assets.filter(
  asset =>
    !groupedAssetIds.has(asset.id.trim()) &&
    (!asset.builderHistory || asset.builderHistory.length === 0) &&
    asset.status !== 'Assigned'
);
```

Note: `useAssetsData.ts` already normalizes `'In Use'` → `'Assigned'` on line 57, so checking `'Assigned'` covers both database values.

### Step 2: Show actual status for builder parent assets

In every place the status of a builder **parent** asset is displayed, change the logic from:

```ts
asset.isAssetBuilder && asset.builderStatus ? asset.builderStatus : asset.status
```

to:

```ts
asset.isAssetBuilder && asset.builderStatus
  ? (asset.currentAssignment ? 'Assigned' : asset.builderStatus)
  : asset.status
```

This ensures that if a builder parent has an active assignment record, it shows **Assigned** regardless of the builder's status. If it has no active assignment, it falls back to the builder status.

**Files to change:**

| File | Location | Purpose |
|------|----------|---------|
| `client/src/pages/assets/assets-list/assetsComponents/assetTable/assetColumns.tsx` | Line 105 (`accessorFn`) and lines 130–133 (`cell` displayStatus) | Asset list table status column |
| `client/src/pages/assets/assets-list/AssetsPage.tsx` | Line 728–729 (`getDisplayStatus`) | Asset list page status display |
| `client/src/pages/assets/assets-list/assetSearchText.ts` | Lines 22–26 (search text status) | Search indexing so "Assigned" matches builder parents that are actually assigned |
| `client/src/pages/assets/myAssets.tsx` | Lines 496–499 (`displayStatus`), lines 705–708 (`parentStatusColor`), and line 775 (tree modal parent badge text) | My Assets card + tree modal |

### Step 3: Child assets remain unchanged

Child assets (`isBuilderChild = true`, `isAssetBuilder = false`) continue to show the **builder's status** because they are part of the builder group. The fix in Step 2 only affects parent assets (`isAssetBuilder === true`), which are real independent assets that may have their own active assignment record.

## Validation

1. Create a builder with available assets only → parent shows **Available**, children show **Available** (unchanged)
2. Try to select an already-assigned asset in the Asset Builder page → **blocked** by the new filter
3. Search for "Assigned" in the asset list → builder parents with active assignments are findable
4. Asset Issuance page → builder parents that are assigned show as Assigned and are not erroneously selectable as Available
5. Existing builders with mixed assets → parent shows actual status, children show builder status

## Files to Modify

- `client/src/pages/assets/assetBuilder.tsx`
- `client/src/pages/assets/assets-list/assetsComponents/assetTable/assetColumns.tsx`
- `client/src/pages/assets/assets-list/AssetsPage.tsx`
- `client/src/pages/assets/assets-list/assetSearchText.ts`
- `client/src/pages/assets/myAssets.tsx`

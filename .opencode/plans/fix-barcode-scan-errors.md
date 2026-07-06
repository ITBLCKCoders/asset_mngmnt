# Fix Barcode Scan Errors

## Errors

1. **`getBuilderByAssetId` & `getBuilderMetaForAsset`** — query `asset_builders` with `WHERE asset_id = ?`, but `asset_builders` has no `asset_id` column
2. **`getAccountabilityFormsForAssetWithLike`** — passes `%<id>%` to `JSON_CONTAINS()` which requires valid JSON

## Fixes

### Fix 1: `getBuilderByAssetId` (asset.repository.ts:350-358)

**Before:**
```typescript
const [rows] = await pool.execute<BuilderRow[]>(
  'SELECT builderID, status FROM asset_builders WHERE asset_id = ? AND deleted_at IS NULL',
  [assetId]
);
```

**After:**
```typescript
const [rows] = await pool.execute<BuilderRow[]>(
  `SELECT ab.builderID, ab.status
   FROM asset_builder_items abi
   JOIN asset_builders ab ON abi.builder_id = ab.builderID
   WHERE abi.asset_id = ? AND ab.deleted_at IS NULL
   LIMIT 1`,
  [assetId]
);
```

### Fix 2: `getBuilderMetaForAsset` (asset.repository.ts:389-397)

Same change as Fix 1 — `asset_builders` → `asset_builder_items` JOIN.

### Fix 3: `getAccountabilityFormsForAssetWithLike` (asset.repository.ts:416-428)

**Before:**
```sql
WHERE (asset_id = ? OR JSON_CONTAINS(assets_data, ?, '$.assets'))
```

**After:**
```sql
WHERE (asset_id = ? OR assets_data LIKE ?)
```

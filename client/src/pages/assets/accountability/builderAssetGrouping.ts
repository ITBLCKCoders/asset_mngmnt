import type { AssetBuilderRecord } from '@/utils/builderScan';

/** Minimal asset shape needed for builder grouping in the accountability form. */
export interface AccountabilityAssetShape {
  code: string;
  [key: string]: unknown;
}

export type AccountabilityAssetRow =
  | { kind: 'separator'; name: string }
  | { kind: 'asset'; asset: AccountabilityAssetShape };

/** Sort builder items by the last 5 digits of their asset code (ascending). */
function sortBuilderItems(
  items: NonNullable<AssetBuilderRecord['items']>
): NonNullable<AssetBuilderRecord['items']> {
  return [...items].sort((a, b) => {
    const aLast5 = parseInt(String(a.asset_code || '').slice(-5), 10) || 0;
    const bLast5 = parseInt(String(b.asset_code || '').slice(-5), 10) || 0;
    return aLast5 - bLast5;
  });
}

/**
 * Group builder assets for the accountability form asset table, mirroring the
 * asset list export: each builder group starts with a builder-name separator
 * row, followed by the parent asset first, then its children. Non-builder
 * assets are appended after all builder groups.
 */
export function buildBuilderGroupedAssetRows(
  assets: AccountabilityAssetShape[],
  builders?: AssetBuilderRecord[]
): AccountabilityAssetRow[] {
  if (!builders?.length || assets.length === 0) {
    return assets.map(asset => ({ kind: 'asset', asset }));
  }

  const assetByCode = new Map(assets.map(a => [a.code, a]));
  const groupedCodes = new Set<string>();
  const rows: AccountabilityAssetRow[] = [];

  for (const builder of builders) {
    if (!builder.items?.length) continue;

    const sortedItems = sortBuilderItems(builder.items);
    const matchingAssets = sortedItems
      .map(item => assetByCode.get(item.asset_code))
      .filter((asset): asset is AccountabilityAssetShape => Boolean(asset));

    if (matchingAssets.length === 0) continue;

    const parentItem = builder.items.find(item => item.is_parent);
    const parentAsset = parentItem
      ? assetByCode.get(parentItem.asset_code)
      : undefined;

    const groupedAssets = parentAsset
      ? [parentAsset, ...matchingAssets.filter(a => a.code !== parentAsset.code)]
      : matchingAssets;

    rows.push({ kind: 'separator', name: builder.name || 'Asset Builder' });
    groupedAssets.forEach(asset => {
      groupedCodes.add(asset.code);
      rows.push({ kind: 'asset', asset });
    });
  }

  const remainingAssets = assets
    .filter(asset => !groupedCodes.has(asset.code))
    .map(asset => ({ kind: 'asset', asset })) as { kind: 'asset'; asset: AccountabilityAssetShape }[];

  // Add a trailing full-width separator after the last builder group when
  // non-builder assets follow, so the non-builder section is visually distinct
  // from builder assets (mirrors the leading builder-name separator).
  if (remainingAssets.length > 0 && groupedCodes.size > 0) {
    rows.push({ kind: 'separator', name: '' });
  }

  return [...rows, ...remainingAssets];
}

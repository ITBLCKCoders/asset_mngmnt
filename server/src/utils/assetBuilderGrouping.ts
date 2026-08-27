import * as assetRepo from '../repositories/asset.repository.js';

type AssetWithBuilderFields = {
  assetID: string;
  isAssetBuilder?: boolean;
  isBuilderChild?: boolean;
  builderStatus?: string | null;
  children?: unknown[];
};

export async function attachBuilderGroupingToAssets(
  assets: AssetWithBuilderFields[]
): Promise<void> {
  const assetIds = assets.map(a => a.assetID).filter(Boolean);
  if (assetIds.length === 0) {
    for (const asset of assets) {
      asset.isAssetBuilder = false;
      asset.isBuilderChild = false;
      asset.builderStatus = null;
      asset.children = [];
    }
    return;
  }

  const assetById = new Map(assets.map(a => [a.assetID, a]));

  const linkRows = await assetRepo.getBuilderLinksForAssetIds(assetIds);
  const builderIds = [...new Set(linkRows.map(r => r.builder_id))];

  if (builderIds.length === 0) {
    for (const asset of assets) {
      asset.isAssetBuilder = false;
      asset.isBuilderChild = false;
      asset.builderStatus = null;
      asset.children = [];
    }
    return;
  }

  const allItems = await assetRepo.getBuilderItemsForBuilderIds(builderIds);
  const parentAssetIdByBuilder = new Map<string, string>();
  const builderStatusByBuilder = new Map<string, string>();

  for (const item of allItems) {
    if (!builderStatusByBuilder.has(item.builder_id)) {
      builderStatusByBuilder.set(item.builder_id, item.builder_status);
    }
    if (item.is_parent === 1) {
      parentAssetIdByBuilder.set(item.builder_id, item.asset_id);
    }
  }

  for (const item of allItems) {
    if (!parentAssetIdByBuilder.has(item.builder_id)) {
      parentAssetIdByBuilder.set(item.builder_id, item.asset_id);
    }
  }

  const childrenByParentAssetId = new Map<string, unknown[]>();
  const builderIdByParentAssetId = new Map<string, string>();
  const builderChildAssetIds = new Set<string>();

  for (const [builderId, parentAssetId] of parentAssetIdByBuilder) {
    builderIdByParentAssetId.set(parentAssetId, builderId);
    const children = allItems
      .filter(i => i.builder_id === builderId && i.asset_id !== parentAssetId)
      .map(i => {
        builderChildAssetIds.add(i.asset_id);
        return assetById.get(i.asset_id) ?? {
          asset_code: i.asset_code,
          name: i.name ?? '',
        };
      });
    childrenByParentAssetId.set(parentAssetId, children);
  }

  for (const asset of assets) {
    const builderId = builderIdByParentAssetId.get(asset.assetID);
    if (builderId) {
      asset.isAssetBuilder = true;
      asset.isBuilderChild = false;
      asset.builderStatus = builderStatusByBuilder.get(builderId) ?? null;
      asset.children = childrenByParentAssetId.get(asset.assetID) ?? [];
    } else {
      asset.isAssetBuilder = false;
      asset.isBuilderChild = builderChildAssetIds.has(asset.assetID);
      asset.builderStatus = null;
      asset.children = [];
    }
  }
}

import * as assetRepo from '../repositories/asset.repository.js';

type AssetWithBuilderFields = {
  assetID?: string;
  isAssetBuilder?: boolean;
  isBuilderChild?: boolean;
  builderStatus?: string | null;
  children?: unknown[];
};

export async function attachBuilderGroupingToAssets(
  assets: Array<AssetWithBuilderFields & Record<string, any>>
): Promise<void> {
  const assetIds = (assets.map((a: any) => a.assetID).filter(Boolean) as string[]);
  if (assetIds.length === 0) {
    for (const asset of assets) {
      asset.isAssetBuilder = false;
      asset.isBuilderChild = false;
      asset.builderStatus = null;
      asset.children = [];
    }
    return;
  }

  const assetById = new Map(assets.map((a: any) => [a.assetID, a]));

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
    const aid = (asset as any).assetID as string | undefined;
    const builderId = aid ? builderIdByParentAssetId.get(aid) : undefined;
    if (builderId) {
      asset.isAssetBuilder = true;
      asset.isBuilderChild = false;
      asset.builderStatus = builderStatusByBuilder.get(builderId) ?? null;
      asset.children = childrenByParentAssetId.get(aid!) ?? [];
    } else {
      asset.isAssetBuilder = false;
      asset.isBuilderChild = aid ? builderChildAssetIds.has(aid) : false;
      asset.builderStatus = null;
      asset.children = [];
    }
  }
}

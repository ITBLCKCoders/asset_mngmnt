import { api } from '@/lib/api';
import { assetCodesMatch, parseScannedAssetCode } from '@/utils/barcodeScan';

export type AssetBuilderRecord = {
  builderID: string;
  name?: string;
  description?: string;
  status?: string;
  created_at?: string;
  created_by?: string;
  created_by_name?: string;
  items?: Array<{
    asset_code: string;
    asset_name?: string;
    category_name?: string;
    type_name?: string;
    is_parent?: boolean;
  }>;
  [key: string]: unknown;
};

/** Built-asset tags encode the parent asset code — match that item only. */
export function findBuilderByParentAssetCode(
  builders: AssetBuilderRecord[],
  rawCode: string
): AssetBuilderRecord | undefined {
  const code = parseScannedAssetCode(rawCode);
  if (!code) return undefined;

  return builders.find(builder =>
    builder.items?.some(
      item => item.is_parent && assetCodesMatch(item.asset_code, code)
    )
  );
}

export async function fetchAssetBuildersForScan(
  scope?: 'it' | 'admin' | null
): Promise<AssetBuilderRecord[]> {
  const url = scope ? `/asset-builders?scope=${scope}` : '/asset-builders';
  const response = await api.get(url, {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  return Array.isArray(response.builders) ? response.builders : [];
}

export async function resolveBuilderByParentScan(
  rawCode: string,
  cachedBuilders: AssetBuilderRecord[],
  scope?: 'it' | 'admin' | null
): Promise<AssetBuilderRecord | null> {
  const fromCache = findBuilderByParentAssetCode(cachedBuilders, rawCode);
  if (fromCache) return fromCache;

  const fetched = await fetchAssetBuildersForScan(scope);
  return findBuilderByParentAssetCode(fetched, rawCode) ?? null;
}

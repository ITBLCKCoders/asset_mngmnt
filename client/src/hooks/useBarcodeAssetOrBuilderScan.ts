'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { findAssetByScannedCode, parseScannedAssetCode } from '@/utils/barcodeScan';
import {
  findBuilderByParentAssetCode,
  resolveBuilderByParentScan,
  type AssetBuilderRecord,
} from '@/utils/builderScan';
import type { Asset } from '@/pages/assets/assets-list/assetsComponents/assetTable/assetData';
import type { Company } from '@/pages/settings/settingsComponents/settingsTabs/generalTab/components/utils/companyTypes';

interface UseBarcodeAssetOrBuilderScanOptions {
  assets: Asset[];
  assetBuilders: AssetBuilderRecord[];
  scope?: 'it' | 'admin' | null;
  activeCompany?: Company | null;
  mapApiAsset: (asset: AssetResponseDto) => Asset;
  onOpenAsset: (asset: Asset) => void;
  onOpenBuilder: (builder: AssetBuilderRecord) => void;
}

export function useBarcodeAssetOrBuilderScan({
  assets,
  assetBuilders,
  scope,
  activeCompany,
  mapApiAsset,
  onOpenAsset,
  onOpenBuilder,
}: UseBarcodeAssetOrBuilderScanOptions) {
  const handleBarcodeScan = useCallback(
    async (rawCode: string) => {
      const code = parseScannedAssetCode(rawCode);
      if (!code) return;

      let builder = findBuilderByParentAssetCode(assetBuilders, rawCode);
      if (!builder) {
        builder = (await resolveBuilderByParentScan(rawCode, assetBuilders, scope)) ?? undefined;
      }
      if (builder) {
        onOpenBuilder(builder);
        return;
      }

      let asset = findAssetByScannedCode(assets, rawCode);

      if (!asset) {
        try {
          const response = await api.get<{ assets: AssetResponseDto[] }>(
            `/assets/${encodeURIComponent(code)}`
          );
          const apiAsset = response.assets?.[0];
          if (apiAsset) {
            asset =
              assets.find(a => a.id === apiAsset.asset_code) ?? mapApiAsset(apiAsset);
          }
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 500) {
            toast.error(`Server error looking up "${code}". Check server logs.`);
          }
          console.error(`[BarcodeScan] API lookup failed for "${code}":`, err?.data || err);
        }
      }

      if (asset) {
        if (activeCompany && asset.company_id && asset.company_id !== activeCompany.id) {
          toast.error(
            `You are in "${activeCompany.name}" and the asset "${code}" belongs to "${asset.company}" and is not available in your company.`
          );
          return;
        }
        onOpenAsset(asset);
      } else {
        toast.error(`Asset "${code}" not found`);
      }
    },
    [
      activeCompany,
      assetBuilders,
      assets,
      mapApiAsset,
      onOpenAsset,
      onOpenBuilder,
      scope,
    ]
  );

  useBarcodeScanner(handleBarcodeScan);
}

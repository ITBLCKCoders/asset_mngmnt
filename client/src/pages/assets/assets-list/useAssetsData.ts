'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from './assetsComponents/assetTable/assetData';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';

type ApiChildAsset = AssetResponseDto | { id: string; name: string; asset_code?: string };

function isFullApiAsset(child: ApiChildAsset): child is AssetResponseDto {
  return 'asset_code' in child && Boolean(child.asset_code);
}

function getChildAssetCode(child: ApiChildAsset): string {
  if (isFullApiAsset(child)) return child.asset_code;
  return child.asset_code ?? child.id;
}

export function transformApiAssetToAsset(asset: AssetResponseDto): Asset {
  const createdAtParsed = asset.created_at
    ? new Date(
        asset.created_at.replace(' ', 'T') +
          (asset.created_at.includes('Z') ? '' : 'Z'),
      )
    : new Date();

  const nextMaintenanceDate = asset.next_maintenance_date
    ? new Date(asset.next_maintenance_date)
    : computeNextMaintenanceDate(asset.maintenance_schedule, {
        lastMaintenanceDate: asset.last_maintenance_date,
        purchaseDate: asset.purchase_date,
        createdAt: createdAtParsed,
      });

  const lastMaintenanceDate = asset.last_maintenance_date
    ? new Date(asset.last_maintenance_date)
    : null;

  return {
    id: asset.asset_code,
    tagCode: asset.tag_code || asset.asset_code,
    assetID: asset.assetID,
    name: asset.name,
    image: asset.image_url || '',
    description: asset.description || '',
    category: asset.category_name || asset.category_id || '',
    categoryId: asset.category_id || '',
    type: asset.type_name || asset.type_id || '',
    typeId: asset.type_id || '',
    serialNo: asset.serial || '',
    modelNo: asset.model || '',
    brand: asset.brand || '',
    status: asset.status === 'In Use' ? 'Assigned' : asset.status || 'Available',
    transferred_out: Boolean(asset.transferred_out),
    transferred_to_company_name: asset.transferred_to_company_name ?? null,
    assignedTo: asset.currentAssignment?.user?.name || '',
    department:
      asset.currentAssignment?.department ||
      (asset.department ? JSON.parse(asset.department).name : '') ||
      '',
    location:
      asset.currentAssignment?.location ||
      `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
    currentAssignment: asset.currentAssignment ?? undefined,
    assignmentHistory: asset.assignmentHistory,
    builderHistory: asset.builderHistory ?? undefined,
    purchaseDate: asset.purchase_date ? new Date(asset.purchase_date) : null,
    purchasePrice: asset.asset_value || 0,
    supplier: asset.supplier || '',
    isOldUnit: Boolean(asset.is_old_unit),
    is_old_unit: Boolean(asset.is_old_unit),
    warranty: asset.warranty_months ? `${asset.warranty_months} months` : null,
    warranty_months: asset.warranty_months || null,
    documents: asset.documents || [],
    maintenanceSchedule: asset.maintenance_schedule || 'None',
    lastMaintenanceDate:
      lastMaintenanceDate && !Number.isNaN(lastMaintenanceDate.getTime())
        ? lastMaintenanceDate
        : null,
    nextMaintenanceDate,
    condition:
      (asset.condition as
        | 'Excellent'
        | 'Good'
        | 'Needs Repair'
        | 'Damaged'
        | 'Obsolete') || 'Good',
    usefulLifeYears: asset.useful_life_years || 0,
    salvageValue: asset.salvage_value || 0,
    depreciationMethod: asset.depreciation_method || '',
    annualDepreciation: asset.annual_depreciation || 0,
    bookValue: asset.book_value ?? undefined,
    accumulatedDepreciation: asset.accumulated_depreciation ?? 0,
    monthlyDepreciation: asset.monthly_depreciation ?? undefined,
    pastBookValue: asset.past_book_value ?? undefined,
    pastAccumulatedDepreciation: asset.past_accumulated_depreciation ?? undefined,
    pastMonthlyDepreciation: asset.past_monthly_depreciation ?? undefined,
    depreciationStartDate: asset.depreciation_start_date
      ? new Date(asset.depreciation_start_date)
      : null,
    company: asset.company_name || '',
    company_id: asset.company_id || '',
    building: asset.building || '',
    createdAt: createdAtParsed,
    createdBy: asset.created_by_name || asset.created_by || '',
    updatedAt: asset.updated_at
      ? new Date(asset.updated_at)
      : new Date(asset.created_at),
    updatedBy: asset.updated_by_name || asset.updated_by || '',
    accountabilityForm: (() => {
      const activeStatuses = ['Pending', 'Signed', 'Completed'];
      const form = asset.accountabilityForms?.find(
        (f: any) => activeStatuses.includes(f.status)
      );
      if (!form) return undefined;
      const assetsArray = form.assets_data?.assets || [
        {
          id: asset.assetID || asset.asset_code,
          code: asset.asset_code,
          name: asset.name,
          category: asset.category_name || asset.category_id,
          categoryDepartment: asset.department
            ? (() => {
                try {
                  return JSON.parse(asset.department).name;
                } catch {
                  return '';
                }
              })()
            : '',
          type: asset.type_name || asset.type_id,
          serialNo: asset.serial,
          modelNo: asset.model,
          brand: asset.brand,
        },
      ];
      return { ...form, assets: assetsArray } as AccountabilityForm;
    })(),
    isAssetBuilder: asset.isAssetBuilder,
    builderStatus: asset.builderStatus ?? undefined,
  };
}

export const useAssetsData = (
  companyFilter?: string | null,
  scope?: string | null,
  page: number = 1,
  pageSize: number = 10,
  search?: string
) => {
  const queryClient = useQueryClient();

  let url = '/assets';
  const params = new URLSearchParams();
  if (companyFilter) {
    params.append('companyId', companyFilter);
  }
  if (scope) {
    params.append('scope', scope);
  }
  if (search) {
    params.append('search', search);
  }
  params.append('page', String(page));
  params.append('limit', String(pageSize));
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const queryKey = ['assets', companyFilter, scope, page, pageSize, search] as const;

  const { data, isLoading, error } = useApiQuery<{
    assets: AssetResponseDto[];
    meta?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      summary?: {
        assigned: number;
        available: number;
        inMaintenance: number;
        needsAttention: number;
        forDisposal: number;
        totalValue: number;
      };
      unfilteredTotal?: number;
    };
  }>(queryKey, url);

  useEffect(() => {
    if (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    }
  }, [error]);

  useEffect(() => {
    const handleAssetsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    };
    window.addEventListener('assetsUpdated', handleAssetsUpdate);
    return () => window.removeEventListener('assetsUpdated', handleAssetsUpdate);
  }, [queryClient]);

  const apiAssets = data?.assets ?? [];
  const transformedAssets = apiAssets.map(transformApiAssetToAsset);

  const assetByCode = new Map<string, Asset>();
  transformedAssets.forEach(a => assetByCode.set(a.id, a));

  const resolveChildAsset = (
    child: ApiChildAsset,
    builderStatus?: string | null
  ): Asset => {
    const childCode = getChildAssetCode(child);

    if (isFullApiAsset(child)) {
      return transformApiAssetToAsset(child);
    }

    const existing = assetByCode.get(childCode);
    if (existing) return existing;

    return {
      id: childCode,
      name: child.name,
      image: '',
      description: '',
      category: '',
      type: '',
      serialNo: '',
      modelNo: '',
      brand: '',
      status: builderStatus ?? 'Partial',
      assignedTo: '',
      department: '',
      location: '',
      purchaseDate: null,
      purchasePrice: 0,
      supplier: '',
      warranty: null,
      warranty_months: null,
      documents: [],
      maintenanceSchedule: 'None',
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      condition: 'Good',
      usefulLifeYears: 0,
      salvageValue: 0,
      depreciationMethod: '',
      annualDepreciation: 0,
      depreciationStartDate: null,
      company: '',
      building: '',
      createdAt: new Date(0),
      createdBy: '',
      updatedAt: new Date(0),
      updatedBy: '',
    };
  };

  const groupedAssets: Asset[] = transformedAssets.map(asset => {
    const apiAsset = apiAssets.find(a => a.asset_code === asset.id);
    if (apiAsset?.isAssetBuilder && apiAsset.children?.length) {
      const resolvedChildren = (apiAsset.children as ApiChildAsset[])
        .filter(child => getChildAssetCode(child) !== asset.id)
        .map(child => resolveChildAsset(child, apiAsset.builderStatus));

      return {
        ...asset,
        isAssetBuilder: true,
        builderStatus: apiAsset.builderStatus ?? undefined,
        children: resolvedChildren.length > 0 ? resolvedChildren : undefined,
      };
    }
    return asset;
  });

  const meta = {
    page: data?.meta?.page ?? 1,
    limit: data?.meta?.limit ?? -1,
    total: data?.meta?.total ?? (data?.assets?.length ?? 0),
    totalPages: data?.meta?.totalPages ?? 1,
    summary: data?.meta?.summary,
    unfilteredTotal:
      data?.meta?.unfilteredTotal ?? data?.meta?.total ?? (data?.assets?.length ?? 0),
  };

  return {
    assets: groupedAssets,
    loading: isLoading,
    fetchAssets: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
    meta,
  };
};
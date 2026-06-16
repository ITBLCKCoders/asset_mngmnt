'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from './assetsComponents/assetTable/assetData';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';

export const useAssetsData = (companyFilter?: string | null, scope?: string | null) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({ page: 1, limit: -1, total: 0, totalPages: 1 });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      let url = '/assets';
      const params = new URLSearchParams();
      if (companyFilter) {
        params.append('companyId', companyFilter);
      }
      if (scope) {
        params.append('scope', scope);
      }
      // Add cache-busting parameter
      params.append('_t', Date.now().toString());
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      const response = await api.get<{
        assets: AssetResponseDto[];
        meta?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(url);
      // Transform API data to match the expected format for DataTable
      const transformedAssets = response.assets.map((asset: AssetResponseDto) => {
        const createdAtParsed = asset.created_at
          ? new Date(
              asset.created_at.replace(' ', 'T') +
                (asset.created_at.includes('Z') ? '' : 'Z')
            )
          : new Date();
        // Use the stored next_maintenance_date from database if available, otherwise calculate client-side
        const nextMaintenanceDate = asset.next_maintenance_date
          ? new Date(asset.next_maintenance_date)
          : computeNextMaintenanceDate(
              asset.maintenance_schedule,
              {
                lastMaintenanceDate: asset.last_maintenance_date,
                purchaseDate: asset.purchase_date,
                createdAt: createdAtParsed,
              }
            );
        const lastMaintenanceDate = asset.last_maintenance_date
          ? new Date(asset.last_maintenance_date)
          : null;
        return {
          id: asset.asset_code,
          assetID: asset.assetID, // Keep the database ID for matching with builders
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
          purchaseDate: asset.purchase_date
            ? new Date(asset.purchase_date)
            : null,
          purchasePrice: asset.asset_value || 0,
          supplier: asset.supplier || '',
          warranty: asset.warranty_months
            ? `${asset.warranty_months} months`
            : null,
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
            const form = asset.accountabilityForms?.[0];
            if (!form) return undefined;
            const assetsArray = form.assets_data?.assets || [{
              id: asset.assetID || asset.asset_code,
              code: asset.asset_code,
              name: asset.name,
              category: asset.category_name || asset.category_id,
              categoryDepartment: asset.department ? (() => { try { return JSON.parse(asset.department).name; } catch { return ''; } })() : '',
              type: asset.type_name || asset.type_id,
              serialNo: asset.serial,
              modelNo: asset.model,
              brand: asset.brand,
            }];
            return { ...form, assets: assetsArray } as AccountabilityForm;
          })(),
        };
      });
      
      setAssets(transformedAssets);
      setMeta(prev => ({
        ...prev,
        total: response.assets?.length ?? 0,
      }));
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAssets();
  }, [companyFilter, scope]);

  useEffect(() => {
    const handleAssetsUpdate = () => {
      fetchAssets();
    };

    window.addEventListener('assetsUpdated', handleAssetsUpdate);

    return () =>
      window.removeEventListener('assetsUpdated', handleAssetsUpdate);
  }, []);

  return {
    assets,
    loading,
    fetchAssets,
    meta,
  };
};



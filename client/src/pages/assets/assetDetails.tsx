'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { AssetDetailsPageSkeleton } from '@/components/common/pageSkeletons';
import { AssetTimeline } from './assets-list/assetsComponents/assetTimeline';
import { Step4Review } from './assets-list/assetsComponents/modalSteps/step4AssetsReview';
import { Asset } from './assets-list/assetsComponents/assetTable/assetData';
import { mapApiMaintenanceScheduleToForm } from './assets-list/assetsComponents/assetTypes/assetFormTypes';
import { AssetFormsTab } from './components/AssetFormsTab';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ApiAsset {
  assetID: string;
  asset_code: string;
  name: string;
  description?: string;
  category_id: string;
  category_name?: string;
  supplier?: string;
  type_id?: string;
  type_name?: string;
  brand?: string;
  model?: string;
  serial?: string;
  image_url?: string;
  purchase_date?: string;
  asset_value?: number;
  salvage_value?: number;
  depreciation_method?: string;
  useful_life_years?: number;
  annual_depreciation?: number;
  depreciation_start_date?: string;
  company_id?: string;
  company_name?: string;
  location_id?: string;
  location_name?: string;
  building?: string;
  location_room_id?: string;
  room_name?: string;
  department_id?: string;
  department?: string;
  location_notes?: string;
  warranty_months?: number;
  condition?: string;
  maintenance_schedule?: string;
  status?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: string;
  updated_by_name?: string;
  deleted_at?: string;
  specifications?: Array<{
    assetId: string;
    assetName: string;
    specDescription: string;
  }>;
  documents?: Array<{
    documentID: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    createdAt: string;
  }>;
  currentAssignment?: {
    assignmentID: string;
    user: {
      id: string;
      name: string;
      email: string;
      employeeNumber?: string;
      position?: string;
    };
    department: string;
    location: string;
    assignedDate: string;
    actualReturnDate?: string;
    status: string;
    assignedBy?: string;
    assignmentNotes?: string;
  };
}

export default function AssetDetails() {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinancialInfo, setShowFinancialInfo] = useState(false);

  // Check if user has access to financial information (internal users)
  useEffect(() => {
    // Check for auth token or session to determine if user is internal
    const token =
      localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    setShowFinancialInfo(!!token);
  }, []);

  const fetchAsset = async () => {
    if (!assetId) return;

    try {
      // Use public API endpoint for asset details
      const response = await api.get<{ assets: ApiAsset[] }>(
        `/assets/public/${encodeURIComponent(assetId)}`
      );
      const assetData = response.assets?.[0];

      if (!assetData) {
        toast.error('Asset not found');
        return;
      }

      // Transform API data to match the expected format
      const transformedAsset: Asset = {
        id: assetData.asset_code,
        name: assetData.name,
        image: assetData.image_url || '',
        description: assetData.description || '',
        category: assetData.category_name || assetData.category_id || '',
        type: assetData.type_name || assetData.type_id || '',
        serialNo: assetData.serial || '',
        modelNo: assetData.model || '',
        brand: assetData.brand || '',
        status:
          (assetData.status === 'In Use'
            ? 'Assigned'
            : (assetData.status as
                | 'Available'
                | 'Assigned'
                | 'In Maintenance')) || 'Available',
        assignedTo: assetData.currentAssignment?.user?.name || '',
        department:
          assetData.currentAssignment?.department ||
          (assetData.department ? JSON.parse(assetData.department).name : ''),
        location:
          assetData.currentAssignment?.location ||
          `${assetData.location_name || ''}${assetData.room_name ? ` - ${assetData.room_name}` : ''}`,
        currentAssignment: assetData.currentAssignment,
        assignmentHistory: [],
        purchaseDate: assetData.purchase_date
          ? new Date(assetData.purchase_date)
          : null,
        purchasePrice: assetData.asset_value || 0,
        supplier: assetData.supplier || '',
        warranty: assetData.warranty_months
          ? `${assetData.warranty_months} months`
          : null,
        warranty_months: assetData.warranty_months || null,
        documents: assetData.documents || [],
        maintenanceSchedule: assetData.maintenance_schedule || 'None',
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        condition:
          (assetData.condition as
            | 'Excellent'
            | 'Good'
            | 'Needs Repair'
            | 'Damaged'
            | 'Obsolete') || 'Good',
        usefulLifeYears: assetData.useful_life_years || 0,
        salvageValue: assetData.salvage_value || 0,
        depreciationMethod: assetData.depreciation_method || '',
        annualDepreciation: assetData.annual_depreciation || 0,
        depreciationStartDate: assetData.depreciation_start_date
          ? new Date(assetData.depreciation_start_date)
          : null,
        company: assetData.company_name || '',
        building: assetData.building || '',
        createdAt: new Date(assetData.created_at),
        createdBy: assetData.created_by_name || assetData.created_by || '',
        updatedAt: assetData.updated_at
          ? new Date(assetData.updated_at)
          : new Date(assetData.created_at),
        updatedBy: assetData.updated_by_name || assetData.updated_by || '',
        specifications: assetData.specifications || [],
      };

      setAsset(transformedAsset);
    } catch (error) {
      console.error('Failed to fetch asset:', error);
      toast.error('Failed to load asset details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [assetId]);

  // Convert Asset to AssetFormData format for Step4Review
  const convertAssetToFormData = (asset: Asset) => {
    const mapStatus = (status: string) => {
      switch (status) {
        case 'In Use':
          return 'Assigned';
        case 'Available':
          return 'Available';
        case 'In Maintenance':
          return 'Repairing';
        default:
          return 'Available';
      }
    };

    const mapDepreciationMethod = (method: string) => {
      switch (method.toLowerCase()) {
        case 'straight line':
          return 'straight-line';
        case 'declining balance':
          return 'declining-balance';
        case 'double declining':
          return 'double-declining';
        case 'units of production':
          return 'units-of-production';
        default:
          return 'straight-line';
      }
    };

    const parseLocation = (location: string) => {
      const parts = location.split(' - ');
      if (parts.length > 1) {
        return { site: parts[0], room: parts.slice(1).join(' - ') };
      } else {
        return { site: '', room: location };
      }
    };

    const { site, room } = parseLocation(asset.location);

    return {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      categoryId: '',
      type: asset.type,
      typeId: '',
      brand: asset.brand,
      model: asset.modelNo,
      serial: asset.serialNo,
      supplier: asset.supplier,
      purchaseDate: asset.purchaseDate
        ? asset.purchaseDate.toISOString()
        : undefined,
      assetValue: asset.purchasePrice,
      salvageValue: asset.salvageValue,
      depreciationMethod: mapDepreciationMethod(
        asset.depreciationMethod
      ) as any,
      usefulLifeYears: asset.usefulLifeYears,
      annualDepreciation: asset.annualDepreciation,
      depreciationStartDate: asset.depreciationStartDate
        ? asset.depreciationStartDate.toISOString()
        : undefined,
      company: asset.company,
      locationSite: '',
      locationSiteName: site,
      locationBuilding: asset.building,
      locationRoom: room,
      department: asset.department,
      locationNotes: '',
      warrantyMonths: asset.warranty
        ? parseInt(asset.warranty.split(' ')[0])
        : undefined,
      condition: asset.condition,
      maintenanceSchedule: mapApiMaintenanceScheduleToForm(
        asset.maintenanceSchedule
      ) as any,
      status: mapStatus(asset.status) as any,
      isOldUnit: false,
      specifications: asset.specifications,
      imageUrl: asset.image,
      documents: [],
      assetId: asset.id,
    };
  };

  if (loading) {
    return <AssetDetailsPageSkeleton />;
  }

  if (!asset) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Asset Not Found
            </h1>
            <p className="text-gray-600">
              The requested asset could not be found.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const formData = convertAssetToFormData(asset);

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <main className="flex-1 w-full min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 sm:space-y-6">
        {/* Header */}
        <PageHeader
          icon={Package}
          title="Asset Details"
          description={`${asset.name} - ${asset.id}`}
        >
        </PageHeader>

        {/* Asset Status Badge */}
        <div className="flex justify-center">
          <Badge
            variant={
              asset.status === 'Assigned'
                ? 'default'
                : asset.status === 'Available'
                  ? 'outline'
                  : 'secondary'
            }
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold ${
              asset.status === 'Assigned'
                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                : asset.status === 'Available'
                  ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                  : 'bg-orange-500/10 text-orange-700 border-orange-500/40'
            }`}
          >
            {asset.status === 'Assigned'
              ? 'Assigned'
              : asset.status === 'Available'
                ? 'Available'
                : 'In Maintenance'}
          </Badge>
        </div>

        {/* Tabs */}
        <Card className="border-0 shadow-sm w-full min-w-0 overflow-hidden">
          <CardContent className="p-0 w-full min-w-0">
            <Tabs defaultValue="details" className="w-full min-w-0">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-3 w-full min-w-0'}>
                <TabsTrigger
                  value="details"
                  className={segmentTabsTriggerClassName + ' flex items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm min-w-0'}
                >
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">Details</span>
                  <span className="sm:hidden truncate">Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className={segmentTabsTriggerClassName + ' flex items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm min-w-0'}
                >
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">Timeline</span>
                  <span className="sm:hidden truncate">History</span>
                </TabsTrigger>
                <TabsTrigger
                  value="forms"
                  className={segmentTabsTriggerClassName + ' flex items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm min-w-0'}
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">Forms</span>
                  <span className="sm:hidden truncate">Forms</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="p-2 sm:p-4 md:p-6 mt-3 sm:mt-4 min-w-0">
                <Step4Review
                  formData={formData}
                  showReviewHeader={false}
                  assetDocuments={asset.documents}
                  currentAssignment={asset.currentAssignment}
                  showFinancialInfo={showFinancialInfo}
                />
              </TabsContent>

              <TabsContent value="timeline" className="p-2 sm:p-4 md:p-6 mt-3 sm:mt-4 min-w-0">
                <AssetTimeline asset={asset} />
              </TabsContent>

              <TabsContent value="forms" className="p-2 sm:p-4 md:p-6 mt-3 sm:mt-4 min-w-0">
                <AssetFormsTab assetId={assetId || ''} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

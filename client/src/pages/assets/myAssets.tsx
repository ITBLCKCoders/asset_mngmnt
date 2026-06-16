'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssetViewModal } from './assets-list/assetsComponents/assetViewModal';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from './assets-list/assetsComponents/assetTable/assetData';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Shimmer } from '@/components/ui/shimmer';

export default function MyAssetsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchMyAssets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use the dedicated endpoint for user's assets
      const response = await api.get<{ assets: AssetResponseDto[] }>(
        '/assets/my-assets'
      );

      console.log('My assets loaded:', response.assets.length, 'assets');

      // Transform API data to match the expected format with error handling
      const transformedAssets = response.assets.map((asset: AssetResponseDto) => {
        // Safely parse department data if it exists
        let departmentName = '';
        if (asset.currentAssignment?.department) {
          departmentName = asset.currentAssignment.department;
        } else if (asset.department) {
          try {
            const deptData =
              typeof asset.department === 'string'
                ? JSON.parse(asset.department)
                : asset.department;
            departmentName = deptData.name || '';
          } catch (e) {
            console.warn('Failed to parse department data:', asset.department);
          }
        }

        return {
          id: asset.asset_code,
          name: asset.name,
          image: asset.image_url || '',
          description: asset.description || '',
          category: asset.category_name || asset.category_id || '',
          type: asset.type_name || asset.type_id || '',
          serialNo: asset.serial || '',
          modelNo: asset.model || '',
          brand: asset.brand || '',
          status:
            (asset.status === 'In Use'
              ? 'Assigned'
              : (asset.status as
                  | 'Available'
                  | 'Assigned'
                  | 'In Maintenance')) || 'Assigned',
          assignedTo: asset.currentAssignment?.user?.name || '',
          department: departmentName,
          location:
            asset.currentAssignment?.location ||
            `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
          currentAssignment: asset.currentAssignment ?? undefined,
          assignmentHistory: asset.assignmentHistory || [],
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
          lastMaintenanceDate: asset.last_maintenance_date
            ? new Date(asset.last_maintenance_date)
            : null,
          nextMaintenanceDate: asset.next_maintenance_date
            ? new Date(asset.next_maintenance_date)
            : null,
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
          building: asset.building || '',
          createdAt: new Date(asset.created_at),
          createdBy: asset.created_by_name || asset.created_by || '',
          updatedAt: asset.updated_at
            ? new Date(asset.updated_at)
            : new Date(asset.created_at),
          updatedBy: asset.updated_by_name || asset.updated_by || '',
          specifications: asset.specifications || [],
        };
      });

      console.log('Transformed assets:', transformedAssets.length);
      setAssets(transformedAssets);
    } catch (error) {
      console.error('Failed to fetch my assets:', error);
      toast.error('Failed to load your assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchMyAssets();
    }
  }, [user, userLoading]);

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsViewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800';
      case 'In Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Available':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent':
        return 'bg-green-100 text-green-800';
      case 'Good':
        return 'bg-blue-100 text-blue-800';
      case 'Needs Repair':
        return 'bg-yellow-100 text-yellow-800';
      case 'Damaged':
        return 'bg-red-100 text-red-800';
      case 'Obsolete':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const displayLoading = userLoading || loading;
  if (displayLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-r from-red-600 to-red-800">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <Shimmer className="h-14 w-14 rounded-2xl bg-white/20" />
                <div className="space-y-2">
                  <Shimmer className="h-8 w-48 rounded bg-white/20" />
                  <Shimmer className="h-4 w-64 rounded bg-white/20" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="border border-gray-200 shadow-sm rounded-lg min-h-[420px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Shimmer className="h-5 w-16 rounded-full bg-blue-50" />
                        <Shimmer className="h-5 w-16 rounded-full bg-blue-50" />
                      </div>
                      <Shimmer className="h-6 w-3/4 rounded" />
                    </div>
                  </div>
                  <Shimmer className="h-3 w-full rounded mt-1" />
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  <Shimmer className="w-full h-32 rounded-lg" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shimmer className="h-4 w-4 rounded" />
                      <Shimmer className="h-4 w-32 rounded" />
                    </div>

                    <Shimmer className="h-3 w-24 rounded" />

                    <div className="flex items-center gap-2">
                      <Shimmer className="h-4 w-4 rounded" />
                      <Shimmer className="h-4 w-40 rounded" />
                    </div>

                    <Shimmer className="h-4 w-24 rounded" />

                    <div className="flex items-center gap-2">
                      <Shimmer className="h-5 w-20 rounded-full" />
                      <Shimmer className="h-5 w-20 rounded-full" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Shimmer className="h-4 w-4 rounded" />
                      <Shimmer className="h-4 w-28 rounded" />
                    </div>
                  </div>

                  <Shimmer className="h-9 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">My Assets</h1>
                  <p className="text-xs text-gray-500">
                    Please log in to view your assigned assets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!hasPermission('My Assets', 'view')) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Access Denied
                  </h1>
                  <p className="text-xs text-gray-500">
                    You don't have permission to view your assets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="My Assets"
          description={`Assets assigned to ${user.name} • ${assets.length} items`}
        >
          <Button
            variant="header"
            size="sm"
            onClick={() => navigate('/profile?tab=documents')}
            aria-label="View My Accountability Forms"
          >
            <FileText className="mr-2 h-4 w-4" />
            My Accountability Forms
          </Button>
        </PageHeader>

        {assets.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Assets Assigned
                  </h3>
                  <p className="text-gray-500 max-w-md">
                    You don't have any assets assigned to you at the moment.
                    This could mean:
                  </p>
                  <ul className="text-gray-500 max-w-md mt-2 text-sm text-left space-y-1">
                    <li>• No assets have been assigned to you yet</li>
                    <li>• All previously assigned assets have been returned</li>
                    <li>• There might be a temporary loading issue</li>
                  </ul>
                  <p className="text-gray-500 max-w-md mt-3">
                    Contact your administrator if you need equipment for your
                    work.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map(asset => (
              <Card
                key={asset.id}
                className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-h-[420px] flex flex-col rounded-lg"
                onClick={() => handleAssetClick(asset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {asset.id}
                        </Badge>
                        <Badge
                          className={`text-xs ${getStatusColor(asset.status)}`}
                        >
                          {asset.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {asset.name}
                      </CardTitle>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {asset.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between space-y-4 bg-white rounded-lg">
                  {asset.image ? (
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span className="truncate">
                        {asset.category} • {asset.brand}
                      </span>
                    </div>

                    {asset.serialNo && (
                      <div className="text-xs text-gray-500">
                        Serial: {asset.serialNo}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{asset.location}</span>
                    </div>

                    {asset.purchasePrice > 0 && (
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(asset.purchasePrice)}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-xs ${getConditionColor(asset.condition)}`}
                      >
                        {asset.condition}
                      </Badge>
                      {asset.status === 'In Maintenance' && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                          <Wrench className="h-3 w-3 mr-1" />
                          Maintenance
                        </Badge>
                      )}
                    </div>

                    {asset.warranty && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{asset.warranty} warranty</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={e => {
                      e.stopPropagation();
                      handleAssetClick(asset);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AssetViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        asset={selectedAsset}
        showEditButton={false}
        hideFinancialInfo={true}
        hideTimeline={true}
        hideForms={true}
      />
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  FileText,
  ChevronDown,
  Layers,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { MY_ASSETS_SEARCH_COLUMNS } from '@/utils/assetSearchColumns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssetViewModal } from './assets-list/assetsComponents/assetViewModal';
import { AssetBuilderViewModal } from './assets-list/assetsComponents/AssetBuilderViewModal';
import { useBarcodeAssetOrBuilderScan } from '@/hooks/useBarcodeAssetOrBuilderScan';
import type { AssetBuilderRecord } from '@/utils/builderScan';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from './assets-list/assetsComponents/assetTable/assetData';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';
import { Shimmer } from '@/components/ui/shimmer';
import { Tabs, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';

function mapMyAssetDto(apiAsset: AssetResponseDto): Asset {
  const children = (apiAsset.children || []).map((child: any) => ({
    id: child.asset_code || child.id,
    name: child.name || child.asset_name || '',
    image: '',
    description: '',
    category: '',
    type: '',
    serialNo: '',
    modelNo: '',
    brand: '',
    status: 'Available' as const,
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
    condition: 'Good' as const,
    usefulLifeYears: 0,
    salvageValue: 0,
    depreciationMethod: '',
    annualDepreciation: 0,
    depreciationStartDate: null,
    company: '',
    building: '',
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
    specifications: [],
    isAssetBuilder: false,
    isBuilderChild: true,
    expanded: false,
  }));

  return {
    id: apiAsset.asset_code,
    name: apiAsset.name,
    image: apiAsset.image_url || '',
    description: apiAsset.description || '',
    category: apiAsset.category_name || apiAsset.category_id || '',
    type: apiAsset.type_name || apiAsset.type_id || '',
    serialNo: apiAsset.serial || '',
    modelNo: apiAsset.model || '',
    brand: apiAsset.brand || '',
    status:
      (apiAsset.status === 'In Use'
        ? 'Assigned'
        : (apiAsset.status as 'Available' | 'Assigned' | 'In Maintenance')) ||
      'Assigned',
    assignedTo: apiAsset.currentAssignment?.user?.name || '',
    department:
      apiAsset.currentAssignment?.department ||
      (apiAsset.department ? JSON.parse(apiAsset.department).name : '') ||
      '',
    location:
      apiAsset.currentAssignment?.location ||
      `${apiAsset.location_name || ''}${apiAsset.room_name ? ` - ${apiAsset.room_name}` : ''}`,
    currentAssignment: apiAsset.currentAssignment ?? undefined,
    assignmentHistory: apiAsset.assignmentHistory || [],
    purchaseDate: apiAsset.purchase_date ? new Date(apiAsset.purchase_date) : null,
    purchasePrice: apiAsset.asset_value || 0,
    supplier: apiAsset.supplier || '',
    warranty: apiAsset.warranty_months ? `${apiAsset.warranty_months} months` : null,
    warranty_months: apiAsset.warranty_months || null,
    documents: apiAsset.documents || [],
    maintenanceSchedule: apiAsset.maintenance_schedule || 'None',
    lastMaintenanceDate: apiAsset.last_maintenance_date
      ? new Date(apiAsset.last_maintenance_date)
      : null,
    nextMaintenanceDate: apiAsset.next_maintenance_date
      ? new Date(apiAsset.next_maintenance_date)
      : null,
    condition:
      (apiAsset.condition as
        | 'Excellent'
        | 'Good'
        | 'Needs Repair'
        | 'Damaged'
        | 'Obsolete') || 'Good',
    usefulLifeYears: apiAsset.useful_life_years || 0,
    salvageValue: apiAsset.salvage_value || 0,
    depreciationMethod: apiAsset.depreciation_method || '',
    annualDepreciation: apiAsset.annual_depreciation || 0,
    depreciationStartDate: apiAsset.depreciation_start_date
      ? new Date(apiAsset.depreciation_start_date)
      : null,
    company_id: apiAsset.company_id || undefined,
    company: apiAsset.company_name || '',
    building: apiAsset.building || '',
    createdAt: new Date(apiAsset.created_at),
    createdBy: apiAsset.created_by_name || apiAsset.created_by || '',
    updatedAt: apiAsset.updated_at
      ? new Date(apiAsset.updated_at)
      : new Date(apiAsset.created_at),
    updatedBy: apiAsset.updated_by_name || apiAsset.updated_by || '',
    specifications: apiAsset.specifications || [],
    isAssetBuilder: apiAsset.isAssetBuilder || false,
    builderStatus: apiAsset.builderStatus || undefined,
    isBuilderChild: apiAsset.isBuilderChild || false,
    children,
    expanded: false,
  } as Asset;
}

export default function MyAssetsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBuilderForView, setSelectedBuilderForView] =
    useState<AssetBuilderRecord | null>(null);
  const [isBuilderViewModalOpen, setIsBuilderViewModalOpen] = useState(false);
  const [treeModalAsset, setTreeModalAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [scope, setScope] = useState<'it' | 'admin'>('it');

  const fetchMyAssets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use the dedicated endpoint for user's assets
      const response = await api.get<{ assets: AssetResponseDto[] }>(
        `/assets/my-assets?scope=${scope}`
      );

      console.log('My assets loaded:', response.assets.length, 'assets');

      // First pass: transform all assets without children
      const assetMap = new Map<string, Asset>();
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

        const mappedAsset: Asset = {
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
          isAssetBuilder: asset.isAssetBuilder || false,
          builderStatus: asset.builderStatus || undefined,
          isBuilderChild: asset.isBuilderChild || false,
          children: [],
          expanded: false,
        };
        assetMap.set(mappedAsset.id, mappedAsset);
        return mappedAsset;
      });

      // Second pass: populate children using the asset map
      transformedAssets.forEach((asset) => {
        const apiAsset = response.assets.find((a) => a.asset_code === asset.id);
        if (apiAsset?.children && apiAsset.children.length > 0) {
          asset.children = (apiAsset.children || []).map((child: any) => {
            const childId = child.asset_code || child.id;
            const fullChild = assetMap.get(childId);
            if (fullChild) {
              // Return a copy with isBuilderChild flag
              return { ...fullChild, isBuilderChild: true };
            }
            // Fallback: minimal child data
            return {
              id: childId,
              name: child.name || child.asset_name || '',
              image: '',
              description: '',
              category: '',
              type: '',
              serialNo: '',
              modelNo: '',
              brand: '',
              status: 'Available' as const,
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
              condition: 'Good' as const,
              usefulLifeYears: 0,
              salvageValue: 0,
              depreciationMethod: '',
              annualDepreciation: 0,
              depreciationStartDate: null,
              company: '',
              building: '',
              createdAt: new Date(),
              createdBy: '',
              updatedAt: new Date(),
              updatedBy: '',
              specifications: [],
              isAssetBuilder: false,
              isBuilderChild: true,
              expanded: false,
            };
          });
        }
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
  }, [user, userLoading, scope]);

  const filteredAssets = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return assets;
    
    // Filter function that checks asset and its children recursively
    const matchesSearch = (asset: Asset): boolean => {
      if (searchColumn === 'all') {
        if (
          asset.name.toLowerCase().includes(q) ||
          asset.id.toLowerCase().includes(q) ||
          asset.category.toLowerCase().includes(q) ||
          asset.type.toLowerCase().includes(q) ||
          asset.serialNo.toLowerCase().includes(q) ||
          asset.description.toLowerCase().includes(q) ||
          asset.modelNo.toLowerCase().includes(q) ||
          asset.brand.toLowerCase().includes(q) ||
          asset.department.toLowerCase().includes(q) ||
          asset.location.toLowerCase().includes(q) ||
          asset.assignedTo.toLowerCase().includes(q) ||
          asset.supplier.toLowerCase().includes(q)
        ) {
          return true;
        }
      } else {
        const val = (asset as any)[searchColumn];
        if (val != null && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }
      // Check children recursively
      if (asset.children && asset.children.length > 0) {
        return asset.children.some(matchesSearch);
      }
      return false;
    };

    return assets.filter(matchesSearch);
  }, [assets, searchTerm, searchColumn]);

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsViewModalOpen(true);
  };

  useBarcodeAssetOrBuilderScan({
    assets,
    assetBuilders: [],
    activeCompany,
    mapApiAsset: mapMyAssetDto,
    onOpenAsset: asset => {
      setSelectedAsset(asset);
      setIsViewModalOpen(true);
    },
    onOpenBuilder: builder => {
      setSelectedBuilderForView(builder);
      setIsBuilderViewModalOpen(true);
    },
  });

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

  // Card component for builder assets - chevron opens the tree modal
  const AssetTreeCard = ({
    asset,
    onClick,
    searchTerm,
    searchColumn,
  }: {
    asset: Asset;
    onClick: (asset: Asset) => void;
    searchTerm: string;
    searchColumn: string;
  }) => {
    const isBuilderParent = asset.isAssetBuilder && asset.children && asset.children.length > 0;
    const childCount = asset.children?.length ?? 0;

    // Check if this asset or any of its children match the search
    const matchesSearch = (a: Asset): boolean => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      if (searchColumn === 'all') {
        if (
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.serialNo.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.modelNo.toLowerCase().includes(q) ||
          a.brand.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.assignedTo.toLowerCase().includes(q) ||
          a.supplier.toLowerCase().includes(q)
        ) {
          return true;
        }
      } else {
        const val = (a as any)[searchColumn];
        if (val != null && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }
      if (a.children && a.children.length > 0) {
        return a.children.some(matchesSearch);
      }
      return false;
    };

    if (!matchesSearch(asset)) {
      return null;
    }

    const statusColor = getStatusColor(asset.status);
    const conditionColor = getConditionColor(asset.condition);
    const displayStatus =
      asset.isAssetBuilder && asset.builderStatus
        ? asset.builderStatus
        : asset.status;

    const handleOpenTree = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setTreeModalAsset(asset);
    };

    const handleCardClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(asset);
    };

    return (
      <Card
        className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-h-[420px] flex flex-col rounded-lg"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isBuilderParent ? (
                  <button
                    onClick={handleOpenTree}
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                    aria-label="View asset tree"
                    title="View asset tree"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                <Badge
                  variant="outline"
                  className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200"
                >
                  {asset.id}
                </Badge>
                <Badge className={`text-xs ${statusColor}`}>
                  {displayStatus}
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
                src={proxyCloudinaryUrl(asset.image)}
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
              <Badge className={`text-xs ${conditionColor}`}>
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

          {isBuilderParent && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleOpenTree}
            >
              <Layers className="h-4 w-4 mr-1" />
              View {childCount} Component{childCount === 1 ? '' : 's'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={e => {
              e.stopPropagation();
              onClick(asset);
            }}
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  const AssetTreeModal = ({
    isOpen,
    asset,
    onClose,
    onAssetSelect,
  }: {
    isOpen: boolean;
    asset: Asset | null;
    onClose: () => void;
    onAssetSelect: (asset: Asset) => void;
  }) => {
    const [treeChildren, setTreeChildren] = useState<Asset[]>([]);
    const [loadingChildren, setLoadingChildren] = useState(false);

    useEffect(() => {
      if (!isOpen || !asset) {
        setTreeChildren([]);
        return;
      }

      const children = asset.children ?? [];
      const missingChildren = children.filter(child => !child.image);
      if (missingChildren.length === 0) {
        setTreeChildren(children);
        return;
      }

      let cancelled = false;
      setLoadingChildren(true);

      const fetchChild = async (child: Asset): Promise<Asset> => {
        try {
          const response = await api.get<{ assets: AssetResponseDto[] }>(
            `/assets/${encodeURIComponent(child.id)}`
          );
          const apiAsset = response.assets?.[0];
          if (apiAsset) {
            return mapMyAssetDto(apiAsset);
          }
        } catch (error) {
          console.warn(`Failed to fetch child asset ${child.id}:`, error);
        }
        return child;
      };

      Promise.all(children.map(fetchChild)).then(result => {
        if (!cancelled) {
          setTreeChildren(result);
          setLoadingChildren(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [isOpen, asset]);

    if (!isOpen || !asset) return null;

    const children = treeChildren.length > 0 ? treeChildren : (asset.children ?? []);
    const parentStatusColor = getStatusColor(
      asset.isAssetBuilder && asset.builderStatus
        ? asset.builderStatus
        : asset.status
    );

    const handleAssetOpen = (e: React.MouseEvent, target: Asset) => {
      e.stopPropagation();
      onAssetSelect(target);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} />

        <Card className="relative z-10 w-full max-w-3xl bg-white rounded-2xl overflow-hidden flex flex-col h-[85dvh] max-h-[800px] min-h-[500px] mx-2 sm:mx-4 border-none shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white pb-8 sm:pb-12 pt-6 sm:pt-8 px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Asset Builder Tree</h2>
                <p className="text-red-100 mt-2 text-sm sm:text-base">
                  Parent asset and its components
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-4 min-h-0">
            <div className="space-y-3">
              {/* Parent node */}
              <button
                type="button"
                onClick={e => handleAssetOpen(e, asset)}
                className="w-full text-left border border-amber-200 bg-amber-50 rounded-lg p-4 hover:bg-amber-100/70 transition-colors cursor-pointer flex items-center gap-4"
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-amber-100 flex items-center justify-center">
                  {asset.image ? (
                    <img
                      src={proxyCloudinaryUrl(asset.image)}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Package className="h-7 w-7 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                      Parent Asset
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono bg-white text-amber-800 border-amber-300"
                    >
                      {asset.id}
                    </Badge>
                    <Badge className={`text-xs ${parentStatusColor}`}>
                      {asset.builderStatus || asset.status}
                    </Badge>
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    {asset.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                    {asset.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {asset.category}
                    {asset.serialNo ? ` • Serial: ${asset.serialNo}` : ''}
                  </p>
                </div>
                <ChevronDown className="h-5 w-5 text-amber-500 flex-shrink-0 -rotate-90" />
              </button>

              {/* Connector to children */}
              {children.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pl-4">
                    <div className="w-0.5 h-6 bg-amber-300" />
                  </div>
                  <div className="ml-4 border-l-2 border-amber-200 pl-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        Components ({children.length})
                      </span>
                      {loadingChildren && (
                        <span className="text-xs text-gray-400">
                          Loading details...
                        </span>
                      )}
                    </div>

                    {children.map((child: Asset) => {
                      const childStatusColor = getStatusColor(child.status);
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={e => handleAssetOpen(e, child)}
                          className="w-full text-left border border-gray-200 bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3"
                        >
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {child.image ? (
                              <img
                                src={proxyCloudinaryUrl(child.image)}
                                alt={child.name}
                                className="w-full h-full object-cover"
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {child.id}
                              </Badge>
                              <Badge className={`text-xs ${childStatusColor}`}>
                                {child.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {child.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {child.category}
                              {child.brand ? ` • ${child.brand}` : ''}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {child.location && (
                              <span className="text-xs text-gray-500 hidden sm:inline truncate max-w-[120px]">
                                {child.location}
                              </span>
                            )}
                            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>

          <div className="flex justify-end px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t">
            <Button variant="outline" size="lg" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="header"
              size="sm"
              onClick={() => navigate('/profile?tab=documents')}
              aria-label="View My Accountability Forms"
            >
              <FileText className="mr-2 h-4 w-4" />
              My Accountability Forms
            </Button>
          </div>
        </PageHeader>

        {/* Search Bar */}
        {assets.length > 0 && (
          <SearchWithColumnFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search assets..."
            columnOptions={MY_ASSETS_SEARCH_COLUMNS}
            searchColumn={searchColumn}
            onSearchColumnChange={setSearchColumn}
            className="max-w-md"
          />
        )}

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
        ) : filteredAssets.length === 0 && searchTerm ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No assets match your search</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Get top-level assets (not builder children) */}
            {filteredAssets
              .filter(asset => !asset.isBuilderChild)
              .map((asset: Asset) => (
                <AssetTreeCard
                  key={asset.id}
                  asset={asset}
                  onClick={handleAssetClick}
                  searchTerm={searchTerm}
                  searchColumn={searchColumn}
                />
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

      <AssetBuilderViewModal
        isOpen={isBuilderViewModalOpen}
        onClose={() => {
          setIsBuilderViewModalOpen(false);
          setSelectedBuilderForView(null);
        }}
        builder={selectedBuilderForView}
        assets={assets}
        onAssetSelect={asset => {
          setSelectedAsset(asset);
          setIsViewModalOpen(true);
        }}
      />

      <AssetTreeModal
        isOpen={!!treeModalAsset}
        asset={treeModalAsset}
        onClose={() => setTreeModalAsset(null)}
        onAssetSelect={asset => {
          setTreeModalAsset(null);
          setSelectedAsset(asset);
          setIsViewModalOpen(true);
        }}
      />
    </div>
  );
}

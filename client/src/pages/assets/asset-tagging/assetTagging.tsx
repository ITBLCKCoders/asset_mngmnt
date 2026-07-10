'use client';

import { useEffect, useState, useMemo } from 'react';
import { Tag, QrCode, Package, Boxes, Crown, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/dataTable';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { Asset } from '../assets-list/assetsComponents/assetTable/assetData';
import { AssetViewModal } from '../assets-list/assetsComponents/assetViewModal';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { TaggingColumns } from './components/TaggingColumns';
import { AssetTagModal } from './components/AssetTagModal';
import { AssetBuilderViewModal } from '../assets-list/assetsComponents/AssetBuilderViewModal';
import { useBarcodeAssetOrBuilderScan } from '@/hooks/useBarcodeAssetOrBuilderScan';
import type { AssetBuilderRecord } from '@/utils/builderScan';
import { ASSET_SEARCH_COLUMNS } from '@/utils/assetSearchColumns';

function mapDtoToTaggingAsset(asset: AssetResponseDto): Asset {
  return {
    id: asset.asset_code,
    assetID: asset.assetID,
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
        : (asset.status as 'Available' | 'Assigned' | 'In Maintenance')) ||
      'Available',
    assignedTo: asset.currentAssignment?.user?.name || '',
    department:
      asset.currentAssignment?.department ||
      (asset.department ? JSON.parse(asset.department).name : ''),
    location:
      asset.currentAssignment?.location ||
      `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
    currentAssignment: asset.currentAssignment ?? undefined,
    assignmentHistory: [],
    purchaseDate: asset.purchase_date ? new Date(asset.purchase_date) : null,
    purchasePrice: asset.asset_value || 0,
    supplier: asset.supplier || '',
    warranty: asset.warranty_months ? `${asset.warranty_months} months` : null,
    warranty_months: asset.warranty_months || null,
    documents: asset.documents || [],
    maintenanceSchedule: asset.maintenance_schedule || 'None',
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
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
    company_id: asset.company_id || undefined,
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
}

export default function AssetsTagging() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAssetViewModalOpen, setIsAssetViewModalOpen] = useState(false);
  const [selectedAssetForView, setSelectedAssetForView] =
    useState<Asset | null>(null);
  const [selectedBuilderForView, setSelectedBuilderForView] =
    useState<AssetBuilderRecord | null>(null);
  const [isBuilderViewModalOpen, setIsBuilderViewModalOpen] = useState(false);
  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'super admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [columns, setColumns] = useState(3);
  const [activeTab, setActiveTab] = useState<'assets' | 'asset-built'>('assets');
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [groupedAssetIds, setGroupedAssetIds] = useState<Set<string>>(new Set());
  const [buildersLoading, setBuildersLoading] = useState(true);
  const [selectedBuilders, setSelectedBuilders] = useState<Set<string>>(new Set());
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [modalTagAssets, setModalTagAssets] = useState<{ id: string; name: string }[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number }>({
    page: 1, limit: 10, total: 0, totalPages: 1,
  });
  const handleColumnsChange = (cols: number) => {
    setColumns(cols === 2 ? 2 : 3);
  };
  const displayLoading = loading || buildersLoading;

  const availableAssets = useMemo(
    () => assets.filter(asset => asset.id && !groupedAssetIds.has(asset.id.trim())),
    [assets, groupedAssetIds]
  );

  const filteredBuilders = useMemo(() => {
    const withItems = assetBuilders.filter(
      builder => builder.items && Array.isArray(builder.items) && builder.items.length > 0
    );
    if (!builderSearchTerm.trim()) return withItems;
    const searchLower = builderSearchTerm.toLowerCase();
    return withItems.filter((builder: any) =>
      builder.name?.toLowerCase().includes(searchLower) ||
      builder.description?.toLowerCase().includes(searchLower) ||
      builder.items?.some(
        (item: any) =>
          item.asset_name?.toLowerCase().includes(searchLower) ||
          item.asset_code?.toLowerCase().includes(searchLower)
      )
    );
  }, [assetBuilders, builderSearchTerm]);

  const selectionCount = selectedAssets.size + selectedBuilders.size;

  const taggingColumns = TaggingColumns({
    selectedAssets,
    onSelect: (id: string, checked: boolean) => {
      setSelectedAssets(prev => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
        return newSet;
      });
    },
    hasPermission,
  });

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      const builderUrl = showScopeTabs
        ? `/asset-builders?scope=${scope}`
        : '/asset-builders';
      const response = await api.get(builderUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response && Array.isArray(response.builders)) {
        const allGroupedIds = new Set<string>();
        response.builders.forEach((builder: any) => {
          if (builder.items && Array.isArray(builder.items)) {
            builder.items.forEach((item: any) => {
              if (item.asset_code) {
                allGroupedIds.add(item.asset_code.trim());
              }
            });
          }
        });
        setGroupedAssetIds(allGroupedIds);
        setAssetBuilders(response.builders);
      } else {
        setGroupedAssetIds(new Set());
        setAssetBuilders([]);
      }
    } catch (error) {
      console.error('Failed to fetch asset builders:', error);
      setGroupedAssetIds(new Set());
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  const fetchAssets = async (overridePage?: number, overrideLimit?: number) => {
    try {
      const p = overridePage ?? pageIndex + 1;
      const l = overrideLimit ?? pageSize;

      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'super admin' || userRole === 'admin') {
        companyId = activeCompany?.id || undefined;
      } else {
        companyId = currentUser?.company_id || undefined;
      }

      const queryParams = new URLSearchParams();
      queryParams.append('page', String(p));
      queryParams.append('limit', String(l));
      if (companyId) {
        queryParams.append('companyId', companyId);
      }
      if (showScopeTabs) {
        queryParams.append('scope', scope);
      }
      const response = await api.get<{ assets: AssetResponseDto[]; meta?: { page: number; limit: number; total: number; totalPages: number } }>(
        `/assets?${queryParams.toString()}`
      );
      const transformedAssets = response.assets.map((asset: AssetResponseDto) => ({
        ...mapDtoToTaggingAsset(asset),
        onSelect: (id: string, checked: boolean) => {
          setSelectedAssets(prev => {
            const newSet = new Set(prev);
            if (checked) {
              newSet.add(id);
            } else {
              newSet.delete(id);
            }
            return newSet;
          });
        },
      }));
      setAssets(transformedAssets);
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setBuildersLoading(true);
    setSelectedAssets(new Set());
    setSelectedBuilders(new Set());
    setPageIndex(0);
    Promise.all([fetchAssets(), fetchAssetBuilders()]);
  }, [activeCompany?.id, scope, currentUser?.company_id]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'assets' | 'asset-built');
  };

  const handleSelectAll = (checked: boolean) => {
    if (activeTab === 'assets') {
      if (checked) {
        setSelectedAssets(new Set(availableAssets.map(asset => asset.id)));
      } else {
        setSelectedAssets(new Set());
      }
      return;
    }

    if (checked) {
      setSelectedBuilders(new Set(filteredBuilders.map((builder: any) => builder.builderID)));
    } else {
      setSelectedBuilders(new Set());
    }
  };

  const buildTagAssetsFromBuilders = (builderIds: Set<string>) => {
    return [...builderIds]
      .map(builderId => {
        const builder = assetBuilders.find(b => b.builderID === builderId);
        const parent =
          builder?.items?.find((item: any) => item.is_parent) ?? builder?.items?.[0];
        if (!parent?.asset_code) return null;
        return {
          id: parent.asset_code,
          name: parent.asset_name || builder?.name || parent.asset_code,
        };
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  };

  const handleGenerateTags = async () => {
    if (selectedAssets.size === 0 && selectedBuilders.size === 0) {
      toast.error('Please select at least one asset or built asset');
      return;
    }

    let assetTagData: { id: string; name: string }[] = [];

    if (selectedAssets.size > 0) {
      // Re-fetch to ensure tags use current asset codes. Asset codes may have
      // changed after category/type edits on another page — re-map selections
      // by the stable assetID so nothing gets silently dropped.
      const oldSelectedByAssetId = new Map<string, string>();
      for (const code of selectedAssets) {
        const a = assets.find(x => x.id === code);
        if (a?.assetID) oldSelectedByAssetId.set(a.assetID, code);
      }
      const response = await api.get<{ assets: AssetResponseDto[] }>(
        `/assets?${new URLSearchParams({ limit: '-1', companyId: activeCompany?.id || '', scope }).toString()}`
      );
      const transformedAssets = response.assets.map((asset: AssetResponseDto) => ({
        ...mapDtoToTaggingAsset(asset),
        onSelect: (id: string, checked: boolean) => {
          setSelectedAssets(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
          });
        },
      }));
      setAssets(transformedAssets);
      let finalSelected = new Set(selectedAssets);
      if (oldSelectedByAssetId.size > 0) {
        for (const fresh of transformedAssets) {
          if (fresh.assetID && oldSelectedByAssetId.has(fresh.assetID) && !finalSelected.has(fresh.id)) {
            const oldCode = oldSelectedByAssetId.get(fresh.assetID)!;
            finalSelected.delete(oldCode);
            finalSelected.add(fresh.id);
          }
        }
        setSelectedAssets(finalSelected);
      }
      assetTagData = transformedAssets
        .filter(asset => finalSelected.has(asset.id))
        .filter(asset => !groupedAssetIds.has(asset.id.trim()))
        .map(asset => ({ id: asset.id, name: asset.name }));
    }

    const builtTagData =
      selectedBuilders.size > 0 ? buildTagAssetsFromBuilders(selectedBuilders) : [];

    const combinedTagData = [...assetTagData, ...builtTagData];
    if (combinedTagData.length === 0) {
      toast.error('No valid tags to generate');
      return;
    }

    setModalTagAssets(combinedTagData);
    setIsTagModalOpen(true);
  };

  const handlePrint = async () => {
    const element = document.getElementById('tags-grid');
    if (!element) { toast.error('Failed to generate PDF: tags not found'); return; }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const marginX = 2;
      const marginY = 10;
      const pageW = 210 - marginX * 2;
      const pageH = 277;
      const scale = 5;
      const cols = columns;
      const gapMm = 0;
      const cardWidthMm = (pageW - (cols - 1) * gapMm) / cols;
      let pageY = marginY;
      const cards = Array.from(element.children) as HTMLElement[];

      for (let i = 0; i < cards.length; i += cols) {
        const rowCards = cards.slice(i, i + cols);
        let rowHeightMm = 0;
        const cardImages: { dataUrl: string; hMm: number }[] = [];

        for (const card of rowCards) {
          const wrapperW = cols <= 2 ? 520 : 460;
          const wrapper = document.createElement('div');
          wrapper.style.width = `${wrapperW}px`;
          wrapper.style.backgroundColor = '#ffffff';
          wrapper.style.position = 'absolute';
          wrapper.style.left = '-9999px';
          wrapper.style.top = '0';
          const clone = card.cloneNode(true) as HTMLElement;
          wrapper.appendChild(clone);
          document.body.appendChild(wrapper);

          const imgs = Array.from(wrapper.querySelectorAll('img'));
          await Promise.all(imgs.map(img =>
            img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
          ));

          const captured = await html2canvas(wrapper, { useCORS: true, allowTaint: true, scale });
          document.body.removeChild(wrapper);

          const hMm = (captured.height / captured.width) * cardWidthMm;
          rowHeightMm = Math.max(rowHeightMm, hMm);
          cardImages.push({ dataUrl: captured.toDataURL('image/png'), hMm });
        }

        if (pageY + rowHeightMm > pageH + marginY) {
          pdf.addPage();
          pageY = marginY;
        }

        for (let j = 0; j < cardImages.length; j++) {
          const x = marginX + j * (cardWidthMm + gapMm);
          pdf.addImage(cardImages[j].dataUrl, 'PNG', x, pageY, cardWidthMm, cardImages[j].hMm);
        }

        pageY += rowHeightMm + gapMm;
      }

      pdf.save('asset-tags.pdf');
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAssetForView(asset);
    setIsAssetViewModalOpen(true);
  };

  useBarcodeAssetOrBuilderScan({
    assets,
    assetBuilders,
    scope: showScopeTabs ? scope : null,
    activeCompany,
    mapApiAsset: mapDtoToTaggingAsset,
    onOpenAsset: asset => {
      setSelectedAssetForView(asset);
      setIsAssetViewModalOpen(true);
    },
    onOpenBuilder: builder => {
      setSelectedBuilderForView(builder);
      setIsBuilderViewModalOpen(true);
    },
  });

  const handleRowClick = (row: any) => {
    const assetId = row.original.id;
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleBuilderToggle = (builderId: string) => {
    setSelectedBuilders(prev => {
      const next = new Set(prev);
      if (next.has(builderId)) {
        next.delete(builderId);
      } else {
        next.add(builderId);
      }
      return next;
    });
  };

  const selectedAssetsData = modalTagAssets;

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Tag}
          title="Assets Tagging"
          description="Generate and print QR code tags for assets"
        >
          {showScopeTabs && (
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="header"
              size="sm"
              onClick={() => handleSelectAll(true)}
              disabled={
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              Select All
            </Button>
            <Button
              variant="header"
              size="sm"
              onClick={() => handleSelectAll(false)}
              disabled={
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              Deselect All
            </Button>
            <Button
              variant="header"
              size="sm"
              onClick={handleGenerateTags}
              disabled={
                selectionCount === 0 ||
                !hasPermission('Asset Tagging', 'create') ||
                !hasPermission('Asset Tagging', 'edit')
              }
            >
              <QrCode className="mr-2 h-4 w-4" />
              Generate Tags ({selectionCount})
            </Button>
          </div>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={segmentTabsListClassName + ' grid w-full grid-cols-2'}>
            <TabsTrigger value="assets" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
              <Package className="h-4 w-4" />
              Assets
              <Badge variant="secondary" className="ml-1 text-xs">
                {availableAssets.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="asset-built" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
              <Boxes className="h-4 w-4" />
              Asset Built
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredBuilders.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-6">
            <DataTable
              tableId="asset-tagging"
              data={
                displayLoading
                  ? []
                  : availableAssets.map(asset => ({
                      ...asset,
                      isSelected: selectedAssets.has(asset.id),
                      onSelect: (id: string, checked: boolean) => {
                        setSelectedAssets(prev => {
                          const newSet = new Set(prev);
                          if (checked) {
                            newSet.add(id);
                          } else {
                            newSet.delete(id);
                          }
                          return newSet;
                        });
                      },
                    }))
              }
              columns={taggingColumns}
              searchPlaceholder="Search assets..."
              title="Asset List"
              titleBadge={`${meta.total} assets`}
              onRowClick={handleRowClick}
              isLoading={displayLoading}
              searchColumnOptions={ASSET_SEARCH_COLUMNS}
              serverPagination={true}
              pageCount={meta.totalPages}
              totalRowCount={meta.total}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onPaginationChange={(newPageIndex, newPageSize) => {
                setPageIndex(newPageIndex);
                setPageSize(newPageSize);
                setLoading(true);
                fetchAssets(newPageIndex + 1, newPageSize);
              }}
              mobileCardFields={[
                {
                  key: 'asset-code',
                  label: 'Asset Code',
                  render: row => row.id,
                },
                {
                  key: 'asset-name',
                  label: 'Asset Name',
                  render: row => row.name,
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: row => row.status,
                },
                {
                  key: 'type',
                  label: 'Type',
                  render: row => row.type || 'N/A',
                },
                {
                  key: 'location',
                  label: 'Location',
                  render: row => row.currentAssignment?.location || 'N/A',
                },
              ]}
              getRowClassName={row =>
                selectedAssets.has(row.original.id)
                  ? 'border-red-500 bg-red-50 ring-1 ring-red-200 hover:bg-red-50'
                  : undefined
              }
            />
          </TabsContent>

          <TabsContent value="asset-built" className="mt-6">
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <Boxes className="h-5 w-5 text-red-600" />
                  </div>
                  <span>Asset Built</span>
                  <Badge variant="secondary" className="w-fit">
                    {filteredBuilders.length} builders
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Select a builder to generate one tag per built asset (parent asset code).
                </p>
                <div className="relative mt-4 w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by builder name or asset code..."
                    value={builderSearchTerm}
                    onChange={e => setBuilderSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {displayLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Card key={index} className="border shadow-sm animate-pulse">
                        <CardContent className="p-4 h-40" />
                      </Card>
                    ))}
                  </div>
                ) : filteredBuilders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBuilders.map((builder: any) => {
                      const isSelected = selectedBuilders.has(builder.builderID);
                      const parentItem =
                        builder.items?.find((item: any) => item.is_parent) ??
                        builder.items?.[0];

                      return (
                        <Card
                          key={builder.builderID}
                          className={`border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                            isSelected
                              ? 'border-2 border-red-500 bg-red-50'
                              : 'border-gray-200'
                          }`}
                          onClick={() => handleBuilderToggle(builder.builderID)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  builder.status === 'Available'
                                    ? 'bg-green-100 text-green-800'
                                    : builder.status === 'Assigned'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {builder.status || 'Available'}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  Selected
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">
                              {builder.name || 'Unnamed Builder'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              {builder.description ||
                                `Contains ${builder.items?.length || 0} assets`}
                            </p>
                            {parentItem && (
                              <p className="text-xs text-gray-500 mb-3">
                                Tag: {parentItem.asset_code} · {parentItem.asset_name}
                              </p>
                            )}
                            {builder.items && builder.items.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Assets in this builder:
                                </div>
                                <div className="space-y-1 max-h-[8.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                  {builder.items.map((item: any, index: number) => (
                                    <div
                                      key={index}
                                      className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                                        item.is_parent
                                          ? 'bg-amber-50 border border-amber-200'
                                          : 'bg-muted/30'
                                      }`}
                                    >
                                      {item.is_parent && (
                                        <Crown className="h-3 w-3 text-amber-600 shrink-0" />
                                      )}
                                      <span
                                        className={`font-mono font-medium shrink-0 ${
                                          item.is_parent ? 'text-amber-900' : 'text-gray-900'
                                        }`}
                                      >
                                        {item.asset_code}
                                      </span>
                                      <span
                                        className={`truncate flex-1 min-w-0 ${
                                          item.is_parent ? 'text-amber-700' : 'text-gray-600'
                                        }`}
                                      >
                                        {item.asset_name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl">
                    <Boxes className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Built Assets
                    </h3>
                    <p className="text-muted-foreground text-center">
                      {builderSearchTerm
                        ? 'No builders match your search.'
                        : 'No asset builders have been created yet.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AssetTagModal
          isOpen={isTagModalOpen}
          onOpenChange={setIsTagModalOpen}
          selectedAssetsData={selectedAssetsData}
          activeCompany={activeCompany}
          onPrint={handlePrint}
          columns={columns}
          onColumnsChange={handleColumnsChange}
        />

        <AssetViewModal
          isOpen={isAssetViewModalOpen}
          onClose={() => setIsAssetViewModalOpen(false)}
          asset={selectedAssetForView}
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
            setSelectedAssetForView(asset);
            setIsAssetViewModalOpen(true);
          }}
        />
      </main>
    </div>
  );
}

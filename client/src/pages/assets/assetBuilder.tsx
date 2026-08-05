'use client';

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, X, Check, ArrowLeft, Trash2, Crown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/dataTable';
import { assetColumns } from './assets-list/assetsComponents/assetTable/assetColumns';
import { Asset } from './assets-list/assetsComponents/assetTable/assetData';
import { assetSearchText } from './assets-list/assetSearchText';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAssetsData } from './assets-list/useAssetsData';
import { createLogger } from '@/lib/logger';
import { useCompanyContext } from '@/context/CompanyContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Tabs, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';

const logger = createLogger('AssetBuilder');

export default function AssetBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompany } = useCompanyContext();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { user: currentUser } = useCurrentUser();

  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'global admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const initialScope = (location.state as { scope?: 'it' | 'admin' })?.scope || 'it';
  const [scope, setScope] = useState<'it' | 'admin'>(initialScope);
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedParentAssetId, setSelectedParentAssetId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupedAssetIds, setGroupedAssetIds] = useState<Set<string> | null>(
    null
  );
  const [loadingBuilders, setLoadingBuilders] = useState(true);
  const [builders, setBuilders] = useState<any[]>([]);
  const [selectedBuilder, setSelectedBuilder] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [assetsToRemove, setAssetsToRemove] = useState<Set<string>>(new Set());
  const [assetsToAdd, setAssetsToAdd] = useState<Set<string>>(new Set());
  const [editingSelectableAssets, setEditingSelectableAssets] = useState<any[]>(
    []
  );

  const { assets, loading } = useAssetsData(activeCompany?.id, showScopeTabs ? scope : null, 1, -1);

  useEffect(() => {
    const fetchGroupedAssets = async () => {
      try {
        const builderUrl = showScopeTabs
          ? `/asset-builders?scope=${scope}`
          : '/asset-builders';
        const response = await api.get(builderUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        logger.debug('Asset builders response', {
          buildersLength: response.builders?.length || 0,
        });
        if (response && Array.isArray(response.builders)) {
          const allGroupedIds = new Set<string>();
          response.builders.forEach((builder: any) => {
            logger.debug('Processing builder', {
              name: builder.name,
              itemsCount: builder.items?.length,
            });
            if (builder.items && Array.isArray(builder.items)) {
              builder.items.forEach((item: any) => {
                logger.debug('Adding asset_code', {
                  assetCode: item.asset_code,
                });
                allGroupedIds.add(item.asset_code.trim());
              });
            }
          });
          logger.debug('groupedAssetIds', { count: allGroupedIds.size });
          setGroupedAssetIds(allGroupedIds);
          setBuilders(response.builders);
        } else if (response && Object.keys(response).length === 0) {
          // 304 Not Modified or empty response, keep existing data
          logger.debug(
            'Received empty response for grouped assets, keeping existing'
          );
          setGroupedAssetIds(new Set());
          setBuilders([]);
        } else {
          logger.warn('Invalid response structure for asset builders');
          setGroupedAssetIds(new Set());
          setBuilders([]);
        }
      } catch (error) {
        console.error('Failed to fetch grouped assets:', error);
        // Keep empty set if API fails
        setGroupedAssetIds(new Set());
        setBuilders([]);
      } finally {
        setLoadingBuilders(false);
      }
    };
    fetchGroupedAssets();
  }, [scope]);

  const selectableAssets = useMemo(() => {
    if (!groupedAssetIds) return [];
    return assets.filter(
      asset =>
        asset.status === 'Available' &&
        !groupedAssetIds.has(asset.id.trim()) &&
        (!asset.builderHistory || asset.builderHistory.length === 0)
    );
  }, [assets, groupedAssetIds]);

  const handleAssetToggle = (assetId: string) => {
    const newSelected = new Set(selectedAssetIds);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      // If removing the parent, clear parent selection
      if (selectedParentAssetId === assetId) {
        setSelectedParentAssetId(null);
      }
    } else {
      newSelected.add(assetId);
      // If this is the first selected asset, make it the parent
      if (selectedAssetIds.size === 0) {
        setSelectedParentAssetId(assetId);
      }
    }
    setSelectedAssetIds(newSelected);
  };

  const handleSetParentOnCreate = (
    e: React.MouseEvent,
    assetId: string
  ) => {
    e.stopPropagation();
    setSelectedParentAssetId(assetId);
  };

  const handleSave = async () => {
    if (!builderName.trim()) {
      toast.error('Please enter a name for the asset builder');
      return;
    }

    if (selectedAssetIds.size === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setIsSubmitting(true);
    try {
      const assetIds = Array.from(selectedAssetIds);
      logger.debug('Creating asset builder with assets', { assetIds });

      // Log the selected assets for debugging
      const selectedAssets = selectableAssets.filter(asset =>
        selectedAssetIds.has(asset.id)
      );
      logger.debug('Selected assets details', {
        assets: selectedAssets.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
        })),
      });

      await api.post('/asset-builders', {
        name: builderName.trim(),
        description: builderDescription.trim(),
        assetIds,
        parentAssetId: selectedParentAssetId || assetIds[0],
      });

      toast.success(
        `Asset Builder "${builderName}" created successfully with ${assetIds.length} assets`
      );
      // Navigate back to assets list - the list will refresh automatically
      navigate('/assets');
    } catch (error: any) {
      logger.error('Failed to create asset builder', error);
      toast.error(
        error.response?.data?.error || 'Failed to create asset builder'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets');
  };

  const handleBuilderClick = (builder: any) => {
    setSelectedBuilder({ ...builder }); // Copy to avoid mutating
    setIsEditing(true);
    setAssetsToRemove(new Set());
    setAssetsToAdd(new Set());
    setEditingSelectableAssets([...selectableAssets]); // Copy current selectable
  };

  const handleRemoveAsset = (assetCode: string) => {
    if (!selectedBuilder) return;

    // Remove from builder items
    const updatedItems = selectedBuilder.items.filter(
      (item: any) => item.asset_code !== assetCode
    );
    setSelectedBuilder({ ...selectedBuilder, items: updatedItems });

    // Add to editing selectable assets
    const assetToAdd = assets.find(a => a.id === assetCode);
    if (assetToAdd) {
      setEditingSelectableAssets(prev => [...prev, assetToAdd]);
    }
  };

  const handleSetParent = (assetCode: string) => {
    if (!selectedBuilder) return;

    // Set the clicked asset as parent, clear all others
    const updatedItems = selectedBuilder.items.map((item: any) => ({
      ...item,
      is_parent: item.asset_code === assetCode,
    }));
    setSelectedBuilder({ ...selectedBuilder, items: updatedItems });
  };

  const handleAddAssetToggle = (assetId: string) => {
    const asset = editingSelectableAssets.find(a => a.id === assetId);
    if (!asset || !selectedBuilder) return;

    // Remove from editing selectable
    setEditingSelectableAssets(prev => prev.filter(a => a.id !== assetId));

    // Add to builder items
    const newItem = {
      asset_code: asset.id,
      asset_name: asset.name,
      category_name: asset.category || '',
      type_name: asset.type || '',
    };
    setSelectedBuilder({
      ...selectedBuilder,
      items: [...selectedBuilder.items, newItem],
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedBuilder) return;

    setIsSubmitting(true);
    try {
      const assetIds = selectedBuilder.items.map(
        (item: any) => item.asset_code
      );
      logger.debug('Updating asset builder with assets', { assetIds });

      // Find the parent asset from the items
      const parentItem = selectedBuilder.items.find((item: any) => item.is_parent);
      const parentAssetId = parentItem ? parentItem.asset_code : assetIds[0];

      await api.put(`/asset-builders/${selectedBuilder.builderID}`, {
        name: selectedBuilder.name,
        description: selectedBuilder.description || '',
        assetIds,
        parentAssetId,
      });

      toast.success(
        `Asset Builder "${selectedBuilder.name}" updated successfully`
      );
      // Refresh the builders list
      const response = await api.get('/asset-builders');
      if (response && Array.isArray(response.builders)) {
        setBuilders(response.builders);
        const allGroupedIds = new Set<string>();
        response.builders.forEach((builder: any) => {
          if (builder.items && Array.isArray(builder.items)) {
            builder.items.forEach((item: any) => {
              allGroupedIds.add(item.asset_code.trim());
            });
          }
        });
        setGroupedAssetIds(allGroupedIds);
      }
      setIsEditing(false);
      setSelectedBuilder(null);
      setAssetsToRemove(new Set());
      setAssetsToAdd(new Set());
      setEditingSelectableAssets([]);
    } catch (error: any) {
      console.error('Failed to update asset builder:', error);
      toast.error(
        error.response?.data?.error || 'Failed to update asset builder'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedBuilder(null);
    setAssetsToRemove(new Set());
    setAssetsToAdd(new Set());
    setEditingSelectableAssets([]);
  };

  // Create columns with checkbox for selection
  const builderColumns = [
    {
      id: 'select',
      header: '',
      size: 50,
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedAssetIds.has(row.original.id)}
          onCheckedChange={() => handleAssetToggle(row.original.id)}
        />
      ),
    },
    {
      id: 'parent',
      header: 'Parent',
      size: 80,
      cell: ({ row }: any) => (
        selectedParentAssetId === row.original.id ? (
          <div className="flex items-center gap-1 text-amber-600">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-medium">Parent</span>
          </div>
        ) : null
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 140,
      cell: ({ row }: any) =>
        selectedAssetIds.has(row.original.id) &&
        selectedParentAssetId !== row.original.id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleSetParentOnCreate(e, row.original.id)}
            className="text-amber-600 hover:text-amber-700"
          >
            <Crown className="h-3.5 w-3.5 mr-1" />
            Set as Parent
          </Button>
        ) : null,
    },
    ...assetColumns,
  ];

  // Columns for editing available assets
  const editColumns = [
    {
      id: 'select',
      header: '',
      size: 50,
      cell: ({ row }: any) => (
        <Checkbox
          checked={false} // No pre-selection for add
          onCheckedChange={() => handleAddAssetToggle(row.original.id)}
        />
      ),
    },
    ...assetColumns,
  ];

  // Table data for selected builder assets
  const selectedBuilderAssets = useMemo(() => {
    if (!selectedBuilder || !selectedBuilder.items) return [];
    return selectedBuilder.items.map((item: any) => ({
      id: item.asset_code,
      name: item.asset_name,
      category_name: item.category_name || '',
      type_name: item.type_name || '',
      status: 'In Builder',
      asset_code: item.asset_code,
      asset_name: item.asset_name,
      is_parent: item.is_parent,
    }));
  }, [selectedBuilder]);

  // Columns for builder assets table with remove
  const builderAssetsColumns = [
    {
      accessorKey: 'is_parent',
      header: 'Parent',
      cell: ({ row }: any) =>
        row.original.is_parent ? (
          <div className="flex items-center gap-1 text-amber-600">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-medium">Parent</span>
          </div>
        ) : null,
    },
    { accessorKey: 'asset_code', header: 'Asset Code' },
    { accessorKey: 'asset_name', header: 'Asset Name' },
    { accessorKey: 'category_name', header: 'Category' },
    { accessorKey: 'type_name', header: 'Type' },
    { accessorKey: 'status', header: 'Status' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {!row.original.is_parent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetParent(row.original.asset_code)}
              className="text-amber-600 hover:text-amber-700"
            >
              <Crown className="h-3.5 w-3.5 mr-1" />
              Set as Parent
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveAsset(row.original.asset_code)}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="Asset Builder"
          description="Create a grouped asset from multiple individual assets"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </PageHeader>

        {builders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-md">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Built Assets
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Existing asset builders in your organization
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builders.map((builder: any) => {
                const isAvailable = builder.items && builder.items.length > 0; // Assume available if has items
                return (
                  <Card
                    key={builder.builderID}
                    className="rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => handleBuilderClick(builder)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {builder.name || 'Unnamed Builder'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {builder.description ||
                              `Contains ${builder.items?.length || 0} assets`}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>
                              Created:{' '}
                              {new Date(
                                builder.created_at
                              ).toLocaleDateString()}
                            </span>
                            <span>{builder.items?.length || 0} assets</span>
                          </div>

                          {/* Display assets in this builder */}
                          {builder.items && builder.items.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Assets in this builder:
                              </div>
                              <div className="space-y-1 max-h-[8.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                {builder.items.map(
                                  (item: any, index: number) => (
                                    <div
                                      key={index}
                                      className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 ${
                                        item.is_parent ? 'bg-amber-50 border border-amber-200' : 'bg-muted/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {item.is_parent && (
                                          <Crown className="h-3 w-3 text-amber-600" />
                                        )}
                                        <span className={`font-medium ${item.is_parent ? 'text-amber-900' : 'text-gray-900'}`}>
                                          {item.asset_code}
                                        </span>
                                      </div>
                                      <span className={`text-gray-600 ${item.is_parent ? 'text-amber-700' : ''}`}>
                                        {item.asset_name}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {selectedBuilder && isEditing && (
          <div className="space-y-6">
            <Card className="rounded-xl border shadow-md overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Editing Asset Builder</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSubmitting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="editBuilderName" className="text-base font-medium">
                    Asset Builder Name
                  </Label>
                  <Input
                    id="editBuilderName"
                    placeholder="Enter name for the asset group"
                    value={selectedBuilder.name}
                    onChange={e =>
                      setSelectedBuilder({
                        ...selectedBuilder,
                        name: e.target.value,
                      })
                    }
                    className="w-full max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editBuilderDescription" className="text-base font-medium">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="editBuilderDescription"
                    placeholder="Enter a description for this asset builder..."
                    value={selectedBuilder.description || ''}
                    onChange={e =>
                      setSelectedBuilder({
                        ...selectedBuilder,
                        description: e.target.value,
                      })
                    }
                    className="w-full max-w-md min-h-[100px]"
                  />
                </div>
                <DataTable<Asset>
                  tableId="asset-builder-assets"
                  data={selectedBuilderAssets}
                  columns={builderAssetsColumns}
                  searchPlaceholder="Search all columns..."
                  globalFilterFn={(row, _columnId, filterValue) => {
                    const q = String(filterValue ?? '').trim();
                    if (!q) return true;
                    return assetSearchText(row.original).includes(
                      q.toLowerCase()
                    );
                  }}
                  title={`Assets in ${selectedBuilder.name}`}
                  titleBadge={`${selectedBuilderAssets.length} assets`}
                />

                <div className="border-t border-gray-200 pt-6"></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      Available Assets to Add ({editingSelectableAssets.length} available)
                    </Label>
                  </div>

                  <div className="border rounded-lg">
                    <DataTable<Asset>
                      tableId="asset-builder-editable"
                      data={editingSelectableAssets}
                      columns={editColumns}
                      searchPlaceholder="Search all columns..."
                      globalFilterFn={(row, _columnId, filterValue) => {
                        const q = String(filterValue ?? '').trim();
                        if (!q) return true;
                        return assetSearchText(row.original).includes(
                          q.toLowerCase()
                        );
                      }}
                      title="Available Assets"
                      titleBadge={`${editingSelectableAssets.length} available`}
                      onRowClick={(row) => handleAddAssetToggle(row.original.id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isEditing && (
          <Card className="rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow-md">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-lg border border-white/30 shrink-0">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">
                    Create New Asset Builder
                  </h2>
                  <p className="text-sm text-red-100 mt-0.5">
                    Group multiple individual assets into a single builder
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="builderName" className="text-base font-medium">
                  Asset Builder Name *
                </Label>
                <Input
                  id="builderName"
                  placeholder="Enter name for the asset group"
                  value={builderName}
                  onChange={e => setBuilderName(e.target.value)}
                  className="w-full max-w-md"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="builderDescription" className="text-base font-medium">
                  Description (optional)
                </Label>
                <Textarea
                  id="builderDescription"
                  placeholder="Enter a description for this asset builder..."
                  value={builderDescription}
                  onChange={e => setBuilderDescription(e.target.value)}
                  className="w-full max-w-md min-h-[100px]"
                />
              </div>

              <div className="border-t border-gray-200 pt-6"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Select Assets ({selectedAssetIds.size} selected)
                  </Label>
                  {selectedAssetIds.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAssetIds(new Set());
                        setSelectedParentAssetId(null);
                      }}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg">
                  <DataTable<Asset>
                    tableId="asset-builder-available"
                    data={selectableAssets}
                    columns={builderColumns}
                    isLoading={loading || loadingBuilders}
                    searchPlaceholder="Search all columns..."
                    globalFilterFn={(row, _columnId, filterValue) => {
                      const q = String(filterValue ?? '').trim();
                      if (!q) return true;
                      return assetSearchText(row.original).includes(
                        q.toLowerCase()
                      );
                    }}
                    title="Available Assets"
                    titleBadge={`${selectableAssets.length} available`}
                    onRowClick={(row) => handleAssetToggle(row.original.id)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    !builderName.trim() ||
                    selectedAssetIds.size === 0 ||
                    isSubmitting
                  }
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Creating...' : 'Create Asset Builder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

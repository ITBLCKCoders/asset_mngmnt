'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Plus,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Search,
  RefreshCw,
  User,
  Building,
  Crown,
  Layers,
  Edit,
  Loader2,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/dataTable';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { assetColumns as defaultAssetColumns } from './assetsComponents/assetTable/assetColumns';

import { AssetStats } from './assetsComponents/assetStats';
import { AddAssetModal } from './assetsComponents/assetModal';
import { AssetViewModal } from './assetsComponents/assetViewModal';
import { AssetBuilderViewModal } from './assetsComponents/AssetBuilderViewModal';
import { EditAssetModal } from './assetsComponents/assetEditModal';
import { AssetFormData } from './assetsComponents/assetTypes/assetFormTypes';
import { Asset } from './assetsComponents/assetTable/assetData';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import IntangibleAssetDialog from '../components/IntangibleAssetDialog';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { useAssetsData } from './useAssetsData';
import { useAssetExport, EXPORT_SUMMARY_CONDITIONS } from './useAssetExport';
import { useAssetImport } from '@/hooks/useAssetImport';
import { ImportDialog } from './assetsComponents/ImportDialog';
import { Shimmer } from '@/components/ui/shimmer';
import { createLogger } from '@/lib/logger';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import {
  handleAssetUpdateError,
  handleAssetValidationError,
} from '@/utils/assetErrorHandling';
import { useBarcodeAssetOrBuilderScan } from '@/hooks/useBarcodeAssetOrBuilderScan';
import type { AssetBuilderRecord } from '@/utils/builderScan';
import { PDFViewer } from '@/components/PDFViewer';
import { ASSET_SEARCH_COLUMNS } from '@/utils/assetSearchColumns';

const logger = createLogger('AssetsPage');

export function AssetsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { user } = useCurrentUser();
  const { activeCompany } = useCompanyContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Asset | null>(null);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [currentPdfTitle, setCurrentPdfTitle] = useState<string>('');
  const [wasViewModalOpenBeforePdf, setWasViewModalOpenBeforePdf] = useState(false);
  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);

  const handleOpenPdfPreview = (pdfUrl: string, title: string) => {
    setCurrentPdfUrl(pdfUrl);
    setCurrentPdfTitle(title);
    setPdfModalOpen(true);
    setWasViewModalOpenBeforePdf(isViewModalOpen);
    setIsViewModalOpen(false);
  };

  const handleClosePdfPreview = () => {
    setPdfModalOpen(false);
    if (wasViewModalOpenBeforePdf) {
      setIsViewModalOpen(true);
      setWasViewModalOpenBeforePdf(false);
    }
  };

  // Listen for PDF preview events from child components
  useEffect(() => {
    const handleOpenPdfPreviewEvent = (event: CustomEvent) => {
      const { pdfUrl, title } = event.detail;
      handleOpenPdfPreview(pdfUrl, title);
    };

    window.addEventListener('openPdfPreview', handleOpenPdfPreviewEvent as EventListener);
    return () => {
      window.removeEventListener('openPdfPreview', handleOpenPdfPreviewEvent as EventListener);
    };
  }, [isViewModalOpen]);

  // Check if user is Global Admin or Admin (can select any company)
  const isSuperAdminOrAdmin = Boolean(
    user?.role?.name?.toLowerCase() === 'global admin' ||
      user?.role?.name?.toLowerCase() === 'admin'
  );

  const isSuperAdmin = user?.role?.name?.toLowerCase() === 'global admin';
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const { assets, loading, fetchAssets, meta } = useAssetsData(
    activeCompany?.id || null,
    showScopeTabs ? scope : null,
    pageIndex + 1,
    pageSize,
    searchTerm
  );
  const isInitialLoading = loading && assets.length === 0;

  // Reset to first page when search term changes
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm]);

  // Filtering is handled on server-side, no need for client-side filtering
  const filteredAssets = useMemo(() => {
    return assets;
  }, [assets]);

  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<AssetBuilderRecord | null>(null);
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('asset-list');
  const [tabLoading, setTabLoading] = useState(false);

  // Intangible Assets state
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [intangibleLoading, setIntangibleLoading] = useState(true);
  const [intangibleDialogOpen, setIntangibleDialogOpen] = useState(false);
  const [editingIntangibleAsset, setEditingIntangibleAsset] = useState<any | null>(null);
  const [intangibleDialogMode, setIntangibleDialogMode] = useState<'create' | 'edit'>('create');

  const fetchIntangibleAssets = async () => {
    try {
      setIntangibleLoading(true);
      const response = await api.get('/intangible-assets');
      setIntangibleAssets(response);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch intangible assets');
    } finally {
      setIntangibleLoading(false);
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      logger.debug('Fetching asset builders...');

      // Add timeout and retry logic for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const builderUrl = showScopeTabs
        ? `/asset-builders?scope=${scope}`
        : '/asset-builders';
      const response = await api.get(builderUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      logger.debug('Asset builders response received');

      if (response && Array.isArray(response.builders)) {
        setAssetBuilders(response.builders);
        logger.info(`Fetched ${response.builders.length} asset builders`);
      } else if (response && Object.keys(response).length === 0) {
        // 304 Not Modified or empty response, keep existing data
        logger.debug(
          'Received empty response, keeping existing asset builders'
        );
      } else if (response && response.builders === undefined) {
        // Handle case where builders property is missing
        logger.debug('Builders property not found, using empty array');
        setAssetBuilders([]);
      } else {
        logger.warn('Unexpected response structure - expected {builders: []}', {
          response,
        });
        setAssetBuilders([]);
      }
    } catch (error: any) {
      logger.error('Failed to fetch asset builders', error);

      // Handle specific error types
      if (error.name === 'AbortError') {
        console.warn('Asset builders fetch timed out');
      } else if (error.message && error.message.includes('Network Error')) {
        console.warn('Network error while fetching asset builders');
      } else if (error.response) {
        console.error('Error details:', error.response.data || error.message);
        console.error('Error status:', error.response.status);
      } else {
        console.error('Error message:', error.message);
      }

      // Set empty array on error to prevent undefined issues
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  // Check if user has access to add/edit assets or asset builders (module matrix)
  const hasAssetManagementAccess = () => {
    const hasAddPermission = hasPermission('Asset List', 'create');
    const hasEditPermission = hasPermission('Asset List', 'edit');
    const hasDeletePermission = hasPermission('Asset List', 'delete');
    const hasViewPermission = hasPermission('Asset List', 'view');

    return (
      hasAddPermission &&
      hasEditPermission &&
      hasDeletePermission &&
      hasViewPermission
    );
  };

  // Check if user has permission to edit a specific asset
  const canEditAsset = (_asset: any) => {
    if (_asset?.transferred_out) {
      return false;
    }

    // If user doesn't have asset management access, return false
    if (!hasAssetManagementAccess()) {
      return false;
    }

    // If not a role-based custodian, check regular permissions
    if (!roleCustodian) {
      return hasPermission('Asset List', 'edit');
    }

    // If user's role is a manager, they can edit all assets of their type
    if (roleCustodian.managerRole !== 'none') {
      return true;
    }

    return hasPermission('Asset List', 'edit');
  };

  // Modified columns with conditional edit button
  const assetColumns = useMemo(() => {
    return [
      ...defaultAssetColumns,
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        cell: ({ row }: any) => {
          const asset = row.original;
          const canEdit = canEditAsset(asset);

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={e => {
                  e.stopPropagation(); // Prevent row click
                  handleEditAsset(asset);
                }}
                disabled={!canEdit}
                className="h-8"
              >
                Edit
              </Button>
            </div>
          );
        },
      },
    ];
  }, [defaultAssetColumns, canEditAsset]);

  // Intangible Assets columns
  const intangibleAssetColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 250,
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 max-w-[250px] truncate block">
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'remarks',
        header: 'Remarks',
        size: 200,
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 max-w-[200px] truncate block">
            {row.original.remarks || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 120,
        cell: ({ row }) => {
          const type = row.original.type;
          const badgeClass = type === 'IT scope'
            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            : type === 'HR scope'
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-purple-100 text-purple-800 hover:bg-purple-200';
          return (
            <Badge variant="secondary" className={badgeClass}>
              {type}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        size: 220,
        cell: ({ row }) => {
          const assignees: Array<{
            firstName?: string;
            lastName?: string;
            email?: string;
          }> = row.original.assignees || [];

          if (assignees.length === 0) {
            return (
              <span className="text-sm text-gray-500">
                Not assigned
              </span>
            );
          }

          const visible = assignees.slice(0, 3);
          const remaining = assignees.length - visible.length;

          return (
            <div className="space-y-1 text-sm">
              {visible.map((assignee, index) => (
                <div key={`${assignee.firstName}-${assignee.lastName}-${index}`}>
                  <div className="font-medium text-gray-900">
                    {[assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  </div>
                  {assignee.email && (
                    <div className="text-xs text-gray-500 truncate">
                      {assignee.email}
                    </div>
                  )}
                </div>
              ))}
              {remaining > 0 && (
                <div className="text-xs text-gray-500">+{remaining} more</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'created_by_name',
        header: 'Created By',
        size: 160,
        cell: ({ row }) => {
          const displayName =
            row.original.created_by_name ||
            row.original.created_by ||
            '—';
          return <span className="text-sm text-gray-600">{displayName}</span>;
        },
      },
      {
        accessorKey: 'updated_by_name',
        header: 'Updated By',
        size: 160,
        cell: ({ row }) => {
          const displayName =
            row.original.updated_by_name ||
            row.original.updated_by ||
            '—';
          return <span className="text-sm text-gray-600">{displayName}</span>;
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Date Created',
        size: 150,
        cell: ({ row }) => {
          const date = new Date(row.original.created_at);
          return (
            <span className="text-sm text-gray-600">
              {date.toLocaleDateString()}
            </span>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated At',
        size: 160,
        cell: ({ row }) => {
          const date = new Date(row.original.updated_at);
          return (
            <span className="text-sm text-gray-600">
              {!isNaN(date.getTime()) ? format(date, 'MMM dd, yyyy h:mm a') : '—'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditIntangibleAsset(row.original)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  );

  const {
    isExportDialogOpen,
    exportType,
    exportStep,
    selectedColumns,
    availableColumns,
    handleExportClick,
    handleExportNextStep,
    handleExportPrevStep,
    handleColumnToggle,
    handleExportConfirm,
    setIsExportDialogOpen,
    exportEmployeeOptions,
    exportFormOptions,
    exportLocationOptions,
    exportDepartmentOptions,
    isSummaryExportDialogOpen,
    summaryStep,
    summaryExportType,
    setSummaryExportType,
    summaryScope,
    summarySelectedTypes,
    summaryAvailableTypes,
    summaryIncludeCondition,
    setSummaryIncludeCondition,
    summarySelectedConditions,
    handleSummaryConditionToggle,
    summarySelectedColumns,
    handleSummaryColumnToggle,
    handleSummaryExportClick,
    handleSummaryNextStep,
    handleSummaryPrevStep,
    handleSummaryTypeToggle,
    handleSummaryTypesToggleAll,
    handleSummaryScopeChange,
    handleSummaryExportConfirm,
    setIsSummaryExportDialogOpen,
    summaryDateAddedFrom,
    setSummaryDateAddedFrom,
    summaryDateAddedTo,
    setSummaryDateAddedTo,
    summaryDateBoughtFrom,
    setSummaryDateBoughtFrom,
    summaryDateBoughtTo,
    setSummaryDateBoughtTo,
    summaryWarrantyMonthsMin,
    setSummaryWarrantyMonthsMin,
    summaryWarrantyMonthsMax,
    setSummaryWarrantyMonthsMax,
    summaryMaintenanceFrom,
    setSummaryMaintenanceFrom,
    summaryMaintenanceTo,
    setSummaryMaintenanceTo,
    summaryEmployeeName,
    setSummaryEmployeeName,
    summaryAccountabilityForm,
    setSummaryAccountabilityForm,
    summaryEmployeeOptions,
    summaryFormOptions,
    summaryLocation,
    setSummaryLocation,
    summaryDepartment,
    setSummaryDepartment,
    summaryLocationOptions,
    summaryDepartmentOptions,
  } = useAssetExport();

  const {
    isImportDialogOpen,
    setIsImportDialogOpen,
    parsedAssets,
    parsedBuilders,
    validationErrors,
    importResult,
    isUploading,
    fileName,
    handleFileUpload,
    handleImport,
    downloadTemplate,
    reset: resetImport,
  } = useAssetImport();

  // Server handles filtering by active company (Global Admin) or user company + asset type (other roles)
  const displayAssets = filteredAssets;

  const availableBuilders = useMemo(() => {
    logger.debug('Calculating available builders...', {
      buildersCount: assetBuilders.length,
    });

    return assetBuilders.filter((builder: any) => {
      if (!builder.items || !Array.isArray(builder.items)) {
        logger.debug('Builder has no items or invalid items', {
          builderID: builder.builderID,
        });
        return false;
      }

      // For available builders, we need to check if all component assets are available
      // Since assets in builders are filtered out from the main assets list,
      // we need to check the status directly from the builder items data
      // The server already provides asset_code and asset_name, so we assume
      // that if the builder exists and items are present, all components are available
      // (this is validated on the server side when creating builders)

      // Check if builder status is "Available" - if it's "Assigned", it should not be available
      const isAvailable = builder.status === 'Available';

      logger.debug(
        `Builder ${builder.builderID} has ${builder.items.length} items, status: ${builder.status}, marking as available`,
        { isAvailable }
      );
      return isAvailable;
    });
  }, [assetBuilders]);

  const filteredBuilders = useMemo(() => {
    if (!searchTerm) return assetBuilders;

    return assetBuilders.filter((builder: any) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = builder.name?.toLowerCase().includes(searchLower);
      const descMatch = builder.description
        ?.toLowerCase()
        .includes(searchLower);
      const itemsMatch = builder.items?.some(
        (item: any) =>
          item.asset_name?.toLowerCase().includes(searchLower) ||
          item.asset_code?.toLowerCase().includes(searchLower)
      );
      return nameMatch || descMatch || itemsMatch;
    });
  }, [assetBuilders, searchTerm]);

  const latestUpdate = useMemo(() => {
    if (displayAssets.length === 0) return null;
    return displayAssets.reduce((a, b) =>
      (a.updatedAt || a.purchaseDate || a.createdAt) >
      (b.updatedAt || b.purchaseDate || b.createdAt)
        ? a
        : b
    );
  }, [displayAssets]);

  const getDisplayStatus = (asset: Asset) =>
    asset.isAssetBuilder && asset.builderStatus ? asset.builderStatus : asset.status;

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Available':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'In Maintenance':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'Partial':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getConditionBadgeClassName = (condition: string) => {
    switch (condition) {
      case 'New':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Good':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Fair':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'Poor':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Bad':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Needs Repair':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'Damaged':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Obsolete':
        return 'bg-gray-100 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  useEffect(() => {
    fetchAssetBuilders();
  }, [location.pathname, scope]);

  useEffect(() => {
    fetchAssets();
  }, [activeCompany?.id]);

  // Fetch intangible assets when the tab changes to intangible-assets
  useEffect(() => {
    if (activeTab === 'intangible-assets') {
      fetchIntangibleAssets();
    }
  }, [activeTab]);

  // Handle PDF preview modal from custom event
  useEffect(() => {
    const handleOpenPdfPreview = (event: CustomEvent) => {
      const { pdfUrl, title } = event.detail;
      setCurrentPdfUrl(pdfUrl);
      setCurrentPdfTitle(title);
      setPdfModalOpen(true);
    };

    // Handle PDF not available error
    const handleShowPdfNotAvailable = (event: CustomEvent) => {
      const { message } = event.detail;
      toast.error(message);
    };

    window.addEventListener('openPdfPreview', handleOpenPdfPreview as EventListener);
    window.addEventListener('showPdfNotAvailable', handleShowPdfNotAvailable as EventListener);

    return () => {
      window.removeEventListener('openPdfPreview', handleOpenPdfPreview as EventListener);
      window.removeEventListener('showPdfNotAvailable', handleShowPdfNotAvailable as EventListener);
    };
  }, []);

  const handleAddAsset = async (data: AssetFormData) => {
    try {
      // Create FormData to handle files
      const formData = new FormData();

      // Append all form fields
      formData.append('name', data.name || '');
      formData.append('description', data.description || '');
      formData.append('categoryId', data.categoryId || '');
      formData.append('supplier', data.supplier || '');
      formData.append('typeId', data.typeId || '');
      formData.append('brand', data.brand || '');
      formData.append('model', data.model || '');
      formData.append('serial', data.serial || '');
      formData.append('purchaseDate', data.purchaseDate || '');
      formData.append('assetValue', data.assetValue?.toString() || '');
      formData.append('salvageValue', data.salvageValue?.toString() || '');
      formData.append('depreciationMethod', data.depreciationMethod || '');
      formData.append(
        'usefulLifeYears',
        data.usefulLifeYears?.toString() || ''
      );
      formData.append(
        'annualDepreciation',
        data.annualDepreciation?.toString() || ''
      );
      formData.append(
        'depreciationStartDate',
        data.depreciationStartDate || ''
      );
      formData.append('companyId', data.company || '');
      formData.append('locationId', data.locationSite || '');
      formData.append('locationRoomId', data.locationRoom || '');
      formData.append('departmentId', data.department || '');
      formData.append('locationNotes', data.locationNotes || '');
      formData.append('assignedUser', data.assignedUser || '');
      formData.append('warrantyMonths', data.warrantyMonths?.toString() || '');
      formData.append('condition', data.condition || '');
      formData.append('maintenanceSchedule', data.maintenanceSchedule || '');
      formData.append('status', data.status || '');
      formData.append('isOldUnit', data.isOldUnit ? '1' : '0');
      formData.append('createdAt', new Date().toISOString());

      // Append image file if exists
      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }

      // Append documents if exist
      if (data.documents && data.documents.length > 0) {
        data.documents.forEach(file => {
          formData.append('documents', file);
        });
      }

      await api.post('/assets', formData);
      toast.success('Asset added successfully');
      setIsAddModalOpen(false);
      fetchAssets(); // Refresh the list
    } catch (error: unknown) {
      console.error('Failed to add asset:', error);
      toast.error('Failed to add asset');
    }
  };

  const handleRowClick = (row: any) => {
    setSelectedAsset(row.original);
    setIsViewModalOpen(true);
  };

  const mapScannedAssetDto = useCallback((apiAsset: AssetResponseDto): Asset => {
    return (
      assets.find(a => a.id === apiAsset.asset_code) ?? {
        id: apiAsset.asset_code,
        assetID: apiAsset.assetID,
        name: apiAsset.name,
        image: apiAsset.image_url || '',
        description: apiAsset.description || '',
        category: apiAsset.category_name || apiAsset.category_id || '',
        type: apiAsset.type_name || apiAsset.type_id || '',
        serialNo: apiAsset.serial || '',
        modelNo: apiAsset.model || '',
        brand: apiAsset.brand || '',
        status:
          apiAsset.status === 'In Use' ? 'Assigned' : apiAsset.status || 'Available',
        assignedTo: apiAsset.currentAssignment?.user?.name || '',
        department:
          apiAsset.currentAssignment?.department ||
          (apiAsset.department ? JSON.parse(apiAsset.department).name : '') ||
          '',
        location:
          apiAsset.currentAssignment?.location ||
          `${apiAsset.location_name || ''}${apiAsset.room_name ? ` - ${apiAsset.room_name}` : ''}`,
        company_id: apiAsset.company_id || undefined,
        company: apiAsset.company_name || '',
        currentAssignment: apiAsset.currentAssignment ?? undefined,
      }
    ) as Asset;
  }, [assets]);

  useBarcodeAssetOrBuilderScan({
    assets,
    assetBuilders,
    scope: showScopeTabs ? scope : null,
    activeCompany,
    mapApiAsset: mapScannedAssetDto,
    onOpenAsset: asset => {
      setSelectedAsset(asset);
      setIsViewModalOpen(true);
    },
    onOpenBuilder: builder => {
      setSelectedBuilder(builder);
      setIsBuilderDialogOpen(true);
    },
  });

  const handleEditAsset = (asset: Asset) => {
    if (!hasAssetManagementAccess()) {
      setIsAccessDeniedDialogOpen(true);
      return;
    }

    if (canEditAsset(asset)) {
      setSelectedAssetForEdit(asset);
      setIsEditModalOpen(true);
    }
  };

  const handleAddAssetClick = () => {
    if (!hasAssetManagementAccess()) {
      setIsAccessDeniedDialogOpen(true);
      return;
    }

    setIsAddModalOpen(true);
  };

  // Intangible Assets handlers
  const handleAddIntangibleAssetClick = () => {
    setIntangibleDialogMode('create');
    setEditingIntangibleAsset(null);
    setIntangibleDialogOpen(true);
  };

  const handleEditIntangibleAsset = (asset: any) => {
    setIntangibleDialogMode('edit');
    setEditingIntangibleAsset(asset);
    setIntangibleDialogOpen(true);
  };

  const handleIntangibleDialogClose = () => {
    setIntangibleDialogOpen(false);
    setEditingIntangibleAsset(null);
  };

  const handleIntangibleDialogSuccess = () => {
    fetchIntangibleAssets();
    handleIntangibleDialogClose();
  };

  // Access Denied Dialog
  const AccessDeniedDialog = () => {
    return (
      <Dialog
        open={isAccessDeniedDialogOpen}
        onOpenChange={setIsAccessDeniedDialogOpen}
      >
        <AppDialogFrame className="sm:max-w-md">
          <AppDialogGradientHeader
            title="Access Denied"
            description="You don't have access to this action. Please contact your System Administrator to request access."
          />
          <AppDialogChromeFooter>
            <Button onClick={() => setIsAccessDeniedDialogOpen(false)}>
              Close
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    );
  };

  const handleUpdateAsset = async (
    assetId: string,
    formData: AssetFormData
  ) => {
    try {
      // Debug: Log the received data to understand the issue
      logger.debug('handleUpdateAsset - Received formData', {
        assetId,
        formData,
      });

      // Validate required fields before making API call using enhanced validation
      const validationErrors = handleAssetValidationError(assetId, formData);

      if (validationErrors.length > 0) {
        // Show user-friendly error message and throw to prevent success toast
        const errorMessage = validationErrors.join('. ');
        logger.debug('handleUpdateAsset - Validation failed', { errorMessage });
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Asset code regeneration runs inside PUT /assets/:id when category, type, or isOldUnit changes.

      // Create FormData to handle files
      const apiFormData = new FormData();

      // Append all form fields
      apiFormData.append('name', formData.name || '');
      apiFormData.append('description', formData.description || '');
      apiFormData.append('categoryId', formData.categoryId || '');
      apiFormData.append('supplier', formData.supplier || '');
      apiFormData.append('typeId', formData.typeId || '');
      apiFormData.append('brand', formData.brand || '');
      apiFormData.append('model', formData.model || '');
      apiFormData.append('serial', formData.serial || '');
      apiFormData.append('purchaseDate', formData.purchaseDate || '');
      apiFormData.append('assetValue', formData.assetValue?.toString() || '');
      apiFormData.append(
        'salvageValue',
        formData.salvageValue?.toString() || ''
      );
      apiFormData.append(
        'depreciationMethod',
        formData.depreciationMethod || ''
      );
      apiFormData.append(
        'usefulLifeYears',
        formData.usefulLifeYears?.toString() || ''
      );
      apiFormData.append(
        'annualDepreciation',
        formData.annualDepreciation?.toString() || ''
      );
      apiFormData.append(
        'depreciationStartDate',
        formData.depreciationStartDate || ''
      );
      const companyIdForUpdate =
        formData.companyId ||
        activeCompany?.id ||
        formData.company ||
        '';
      apiFormData.append('companyId', companyIdForUpdate);
      apiFormData.append('locationId', formData.locationSite || '');
      apiFormData.append('locationRoomId', formData.locationRoom || '');
      apiFormData.append('departmentId', formData.department || '');
      apiFormData.append('locationNotes', formData.locationNotes || '');
      apiFormData.append('assignedUser', formData.assignedUser || '');
      apiFormData.append(
        'warrantyMonths',
        formData.warrantyMonths?.toString() || ''
      );
      apiFormData.append('condition', formData.condition || '');
      apiFormData.append(
        'maintenanceSchedule',
        formData.maintenanceSchedule || ''
      );
      apiFormData.append('status', formData.status || '');
      apiFormData.append('isOldUnit', formData.isOldUnit ? '1' : '0');

      // Append image file if exists, or send removal flag
      if (formData.imageFile) {
        apiFormData.append('image', formData.imageFile);
      } else if (formData.imageUrl === '') {
        apiFormData.append('removeImage', '1');
      }

      // Append documents if exist
      if (formData.documents && formData.documents.length > 0) {
        formData.documents.forEach(file => {
          apiFormData.append('documents', file);
        });
      }

      const updateResult = (await api.put(
        `/assets/${assetId}`,
        apiFormData
      )) as {
        asset?: { asset_code?: string };
      };
      const newCode = updateResult?.asset?.asset_code;
      if (newCode && newCode !== assetId) {
        toast.success(
          `Asset updated successfully. Asset code is now ${newCode}.`
        );
      } else {
        toast.success('Asset updated successfully!');
      }

      setIsEditModalOpen(false);
      setSelectedAssetForEdit(null);
      fetchAssets(); // Refresh the list
    } catch (error: unknown) {
      // Use enhanced error handling for asset updates
      const err = error as { data?: { error?: string; message?: string } };
      const userFriendlyError = handleAssetUpdateError(error, {
        assetId,
        name: formData.name,
      });
      console.error('Failed to update asset:', error);

      // Only show error toast if it's not a validation error we already handled
      if (
        !(
          error instanceof Error &&
          (error.message.includes('Asset name is required') ||
            error.message.includes('Asset category is required') ||
            error.message.includes('Asset value must be a positive number') ||
            error.message.includes(
              'Useful life years must be a positive number'
            ))
        )
      ) {
        toast.error(userFriendlyError);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AccessDeniedDialog />
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="Assets Management"
          description="Track and manage company assets"
          loading={isInitialLoading}
        >
          {showScopeTabs && (
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Button
            variant="header"
            size="sm"
            onClick={handleAddAssetClick}
            disabled={!hasPermission('Asset List', 'create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Asset
          </Button>
          <Button
            variant="header"
            size="sm"
            onClick={() => {
              if (!hasAssetManagementAccess()) {
                setIsAccessDeniedDialogOpen(true);
              } else {
                navigate('/assets/builder');
              }
            }}
            disabled={!hasPermission('Asset List', 'create')}
            aria-label="Create Asset Builder"
          >
            <Package className="mr-2 h-4 w-4" />
            Asset Builder
          </Button>
        </PageHeader>

        <AssetStats
          assets={assets}
          loading={isInitialLoading}
          totalCount={meta.unfilteredTotal}
          summary={meta.summary}
        />

        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setTabLoading(true); setTimeout(() => setTabLoading(false), 300); }} className="w-full">
          {isInitialLoading ? (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-100/90 p-1">
              <Shimmer className="h-10 w-full rounded-lg bg-red-600" />
              <Shimmer className="h-10 w-full rounded-lg" />
              <Shimmer className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <TabsList className={segmentTabsListClassName + ' grid grid-cols-3'}>
              <TabsTrigger
                value="asset-list"
                className={segmentTabsTriggerClassName}
              >
                Asset List
              </TabsTrigger>
              <TabsTrigger
                value="asset-built"
                className={segmentTabsTriggerClassName}
              >
                Asset Built
              </TabsTrigger>
              <TabsTrigger
                value="intangible-assets"
                className={segmentTabsTriggerClassName}
              >
                Intangible Assets
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="asset-list" className="mt-6 space-y-4">
            <Card className="rounded-xl border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <DataTable<Asset>
                  tableId="asset-list"
                  data={isInitialLoading ? [] : displayAssets}
                  columns={assetColumns}
                  searchPlaceholder="Search all columns..."
                  onSearchChange={setSearchTerm}
                  title="Asset List"
                  titleBadge={`${meta.total} assets`}
                  lastModifiedAt={
                    latestUpdate
                      ? latestUpdate.updatedAt ||
                        latestUpdate.purchaseDate ||
                        latestUpdate.createdAt
                      : undefined
                  }
                  onRowClick={handleRowClick}
                  isLoading={isInitialLoading || tabLoading}
                  searchColumnOptions={ASSET_SEARCH_COLUMNS}
                  serverPagination={true}
                  pageCount={meta.totalPages}
                  totalRowCount={meta.total}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  onPaginationChange={(newPageIndex, newPageSize) => {
                    setPageIndex(newPageIndex);
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                    }
                  }}
                  mobileCardClassName="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 p-4 shadow-sm shadow-red-100/40"
                  mobileCardFields={[
                    {
                      key: 'asset-overview',
                      label: 'Asset',
                      className: 'flex-col items-start gap-1.5',
                      render: row => (
                        <div className="w-full text-left">
                          <div className="break-words text-base font-semibold text-gray-900">
                            {row.name}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">
                              {row.id}
                            </span>
                            <span>{row.brand || 'No brand'}</span>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: row => {
                        const status = getDisplayStatus(row);

                        return (
                          <div className="w-full text-left">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      },
                    },
                    {
                      key: 'assigned-to',
                      label: 'Assigned To',
                      className: 'flex-col items-start gap-1.5',
                      render: row => (
                        <div className="w-full text-left">
                          <div className="font-medium text-gray-900">
                            {row.currentAssignment?.user?.name ||
                              row.assignedTo ||
                              'Not assigned'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {row.location || 'No location set'}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'category',
                      label: 'Category',
                      render: row => row.category || 'N/A',
                    },
                    {
                      key: 'type',
                      label: 'Type',
                      render: row => row.type || 'N/A',
                    },
                    {
                      key: 'condition',
                      label: 'Condition',
                      render: row => (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConditionBadgeClassName(
                            row.condition
                          )}`}
                        >
                          {row.condition || 'N/A'}
                        </span>
                      ),
                    },
                    {
                      key: 'value',
                      label: 'Value',
                      render: row => formatCurrency(row.purchasePrice || 0),
                    },
                    {
                      key: 'serial-no',
                      label: 'Serial No',
                      render: row => row.serialNo || 'N/A',
                    },
                  ]}
                  emptyState={
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl mx-4 mb-4">
                      <Package className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No assets found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Get started by adding your first asset.
                      </p>
                      <Button
                        onClick={handleAddAssetClick}
                        disabled={!hasPermission('Asset List', 'create')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Asset
                      </Button>
                    </div>
                  }
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImportDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExportOptionsOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </DataTable>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asset-built" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-md">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Asset Built
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {filteredBuilders.length} builders
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    All asset builders in your organization
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md rounded-lg border bg-white px-3 shadow-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search asset builders..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchTerm(e.target.value)
                    }
                    className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {buildersLoading || tabLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Shimmer className="h-5 w-16 rounded-full" />
                              <Shimmer className="h-5 w-20 rounded-full" />
                            </div>
                            <Shimmer className="h-6 w-48 mb-2 rounded" />
                            <Shimmer className="h-4 w-64 mb-3 rounded" />
                            <div className="flex items-center gap-4 text-xs mb-3">
                              <Shimmer className="h-3 w-24 rounded" />
                              <Shimmer className="h-3 w-20 rounded" />
                            </div>
                            <div className="space-y-2">
                              <Shimmer className="h-4 w-32 rounded" />
                              <div className="space-y-1">
                                <Shimmer className="h-3 w-full rounded" />
                                <Shimmer className="h-3 w-3/4 rounded" />
                                <Shimmer className="h-3 w-1/2 rounded" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredBuilders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBuilders.map((builder: any) => {
                    const isAvailable = availableBuilders.some(
                      ab => ab.builderID === builder.builderID
                    );
                    return (
                      <Card
                        key={builder.builderID}
                        className="rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                        onClick={() => {
                          setSelectedBuilder(builder);
                          setIsBuilderDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    isAvailable
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {isAvailable ? 'Available' : 'Assigned'}
                                </span>
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {builder.name || 'Unnamed Builder'}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {builder.description ||
                                  `Contains ${builder.items?.length || 0} assets`}
                              </p>
                              {builder.assigned_to && (
                                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                                  <User className="h-3.5 w-3 text-gray-400 flex-shrink-0" />
                                  Assigned to: {builder.assigned_to.first_name}{' '}
                                  {builder.assigned_to.last_name}
                                </p>
                              )}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation(); // Prevent card click
                                setSelectedBuilder(builder);
                                setIsBuilderDialogOpen(true);
                              }}
                              className="p-2"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : assetBuilders.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Built Assets
                  </h3>
                  <p className="text-muted-foreground">
                    No asset builders have been created yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="intangible-assets" className="mt-6 space-y-4">
            <Card className="rounded-xl border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Layers className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">All Intangible Assets</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{intangibleAssets.length} intangible assets</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAddIntangibleAssetClick}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Intangible Asset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {intangibleLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-4">
                      <Layers className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Loading intangible assets...
                    </h3>
                  </div>
                ) : (
                  <DataTable
                    columns={intangibleAssetColumns}
                    data={intangibleAssets}
                    searchPlaceholder="Search intangible assets..."
                    title="Intangible Assets"
                    titleBadge={`${intangibleAssets.length} assets`}
                    isLoading={intangibleLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAsset}
      />

      <AssetViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        asset={selectedAsset}
        onEdit={handleEditAsset}
      />
      <EditAssetModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAssetForEdit(null);
        }}
        onSubmit={handleUpdateAsset}
        asset={selectedAssetForEdit}
      />

      {/* PDF Preview Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleClosePdfPreview();
        }
      }}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          <AppDialogGradientHeader
            title={currentPdfTitle}
            description="Asset Accountability Form Preview"
          />
          <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
            {currentPdfUrl ? (
              <PDFViewer pdfUrl={currentPdfUrl} className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-500">
                Loading form preview...
              </div>
            )}
          </AppDialogBody>
          <AppDialogChromeFooter className="justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClosePdfPreview}
            >
              Close
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        parsedAssets={parsedAssets}
        parsedBuilders={parsedBuilders}
        validationErrors={validationErrors}
        importResult={importResult}
        isUploading={isUploading}
        fileName={fileName}
        onFileUpload={handleFileUpload}
        onImport={handleImport}
        onDownloadTemplate={downloadTemplate}
        onReset={resetImport}
      />

      <Dialog open={isExportOptionsOpen} onOpenChange={setIsExportOptionsOpen}>
        <AppDialogFrame className="max-w-lg">
          <AppDialogGradientHeader
            title="Export Options"
            description="Choose the type of export to generate."
          />
          <AppDialogBody className="py-6">
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => { setIsExportOptionsOpen(false); handleExportClick('pdf'); }}
                className="flex h-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-red-300 hover:shadow-md cursor-pointer"
              >
                <Eye className="h-8 w-8 text-red-600" />
                <span className="text-sm font-semibold text-gray-800">Export PDF</span>
                <span className="text-xs text-gray-500 text-center">Detailed asset list in PDF format</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsExportOptionsOpen(false); handleExportClick('excel'); }}
                className="flex h-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-green-300 hover:shadow-md cursor-pointer"
              >
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <span className="text-sm font-semibold text-gray-800">Export Excel</span>
                <span className="text-xs text-gray-500 text-center">Detailed asset list in Excel format</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsExportOptionsOpen(false); handleSummaryExportClick(showScopeTabs ? scope : null); }}
                className="flex h-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md cursor-pointer"
              >
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="text-sm font-semibold text-gray-800">Export Summary</span>
                <span className="text-xs text-gray-500 text-center">Device type & employee summary</span>
              </button>
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button variant="outline" onClick={() => setIsExportOptionsOpen(false)}>
              Cancel
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <AppDialogFrame className="max-w-2xl max-h-[80vh] overflow-hidden !flex !flex-col">
          <AppDialogGradientHeader
            title={
              exportStep === 1
                ? `Export ${exportType?.toUpperCase() ?? ''} — Step 1: Columns`
                : `Export ${exportType?.toUpperCase() ?? ''} — Step 2: Filters`
            }
            description={
              exportStep === 1
                ? 'Choose which columns to include in your export file.'
                : 'Apply optional filters to narrow down the exported data.'
            }
          />

          <AppDialogBody className="max-h-[50vh] overflow-y-auto py-4">
            {exportStep === 1 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Columns</Label>
                <div className="grid grid-cols-3 gap-4">
                  {availableColumns.map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.has(column.key)}
                        onCheckedChange={() => handleColumnToggle(column.key)}
                      />
                      <Label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exportStep === 2 && (
              <div className="space-y-5">
                {/* Filters */}
                <div className="border rounded-lg p-4 space-y-4">
                  <Label className="text-base font-semibold">Filters</Label>

                  {/* Date Added */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Date Added From</Label>
                      <Input
                        type="date"
                        value={summaryDateAddedFrom}
                        onChange={e => setSummaryDateAddedFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Date Added To</Label>
                      <Input
                        type="date"
                        value={summaryDateAddedTo}
                        onChange={e => setSummaryDateAddedTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Bought */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Date Bought From</Label>
                      <Input
                        type="date"
                        value={summaryDateBoughtFrom}
                        onChange={e => setSummaryDateBoughtFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Date Bought To</Label>
                      <Input
                        type="date"
                        value={summaryDateBoughtTo}
                        onChange={e => setSummaryDateBoughtTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Warranty Months */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Warranty Months (min)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 12"
                        value={summaryWarrantyMonthsMin}
                        onChange={e => setSummaryWarrantyMonthsMin(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Warranty Months (max)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 60"
                        value={summaryWarrantyMonthsMax}
                        onChange={e => setSummaryWarrantyMonthsMax(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Maintenance date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Maintenance Date From</Label>
                      <Input
                        type="date"
                        value={summaryMaintenanceFrom}
                        onChange={e => setSummaryMaintenanceFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Maintenance Date To</Label>
                      <Input
                        type="date"
                        value={summaryMaintenanceTo}
                        onChange={e => setSummaryMaintenanceTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Dropdown filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Employee Name</Label>
                      <Select
                        value={summaryEmployeeName}
                        onValueChange={v => setSummaryEmployeeName(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All employees</SelectItem>
                          {exportEmployeeOptions.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Accountability Form #</Label>
                      <Select
                        value={summaryAccountabilityForm}
                        onValueChange={v => setSummaryAccountabilityForm(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All forms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All forms</SelectItem>
                          {exportFormOptions.map(form => (
                            <SelectItem key={form} value={form}>{form}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Location</Label>
                      <Select
                        value={summaryLocation}
                        onValueChange={v => setSummaryLocation(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All locations</SelectItem>
                          {exportLocationOptions.map(loc => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Department</Label>
                      <Select
                        value={summaryDepartment}
                        onValueChange={v => setSummaryDepartment(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All departments</SelectItem>
                          {exportDepartmentOptions.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AppDialogBody>

          <AppDialogChromeFooter className="flex justify-between">
            <div className="flex gap-2">
              {exportStep === 2 && (
                <Button variant="outline" onClick={handleExportPrevStep}>
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
            {exportStep === 1 ? (
              <Button
                onClick={() => handleExportNextStep(displayAssets)}
                disabled={selectedColumns.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => handleExportConfirm(displayAssets, activeCompany, user, assetBuilders, activeCompany?.id, showScopeTabs ? scope : null, searchTerm)}
                disabled={selectedColumns.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Export {exportType?.toUpperCase()}
              </Button>
            )}
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      <Dialog open={isSummaryExportDialogOpen} onOpenChange={setIsSummaryExportDialogOpen}>
        <AppDialogFrame className="max-w-2xl max-h-[80vh] overflow-hidden !flex !flex-col">
          <AppDialogGradientHeader
            title={summaryStep === 1 ? 'Export Summary Report — Step 1: Columns' : 'Export Summary Report — Step 2: Format & Filters'}
            description={summaryStep === 1 ? 'Select columns for the asset list section.' : 'Choose format, category scope, and optional type filters.'}
          />

          <AppDialogBody className="max-h-[50vh] overflow-y-auto py-4">
            {summaryStep === 1 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Asset List Columns</Label>
                <div className="grid grid-cols-3 gap-4">
                  {availableColumns.map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`summary-${column.key}`}
                        checked={summarySelectedColumns.has(column.key)}
                        onCheckedChange={() => handleSummaryColumnToggle(column.key)}
                      />
                      <Label
                        htmlFor={`summary-${column.key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summaryStep === 2 && (
              <div className="space-y-5">
                {/* Format */}
                <div>
                  <Label className="text-base font-semibold mb-2 block">Export Format</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSummaryExportType('pdf')}
                      className={`flex-1 rounded-lg border-2 p-3 text-center transition cursor-pointer ${
                        summaryExportType === 'pdf'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-semibold">PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryExportType('excel')}
                      className={`flex-1 rounded-lg border-2 p-3 text-center transition cursor-pointer ${
                        summaryExportType === 'excel'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-semibold">Excel</span>
                    </button>
                  </div>
                </div>

                {/* Category scope */}
                <div>
                  <Label className="text-base font-semibold mb-2 block">Category Scope</Label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleSummaryScopeChange('it', activeCompany?.id)}
                      className={`flex-1 rounded-lg border-2 p-3 text-center transition cursor-pointer ${
                        summaryScope === 'it'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">IT Assets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSummaryScopeChange('admin', activeCompany?.id)}
                      className={`flex-1 rounded-lg border-2 p-3 text-center transition cursor-pointer ${
                        summaryScope === 'admin'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">Admin Assets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSummaryScopeChange('all', activeCompany?.id)}
                      className={`flex-1 rounded-lg border-2 p-3 text-center transition cursor-pointer ${
                        summaryScope === 'all'
                          ? 'border-gray-700 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">All</span>
                    </button>
                  </div>
                </div>

                {/* Type filters */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="text-base font-semibold">
                      Asset Types
                      {summaryAvailableTypes.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          ({summaryAvailableTypes.length} types available)
                        </span>
                      )}
                    </Label>
                    {summaryAvailableTypes.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSummaryTypesToggleAll}
                      >
                        {summarySelectedTypes.length === summaryAvailableTypes.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                    )}
                  </div>
                  {summaryAvailableTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading types…
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {summaryAvailableTypes.map(({ name, count }) => (
                        <label
                          key={name}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer transition ${
                            summarySelectedTypes.includes(name)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={summarySelectedTypes.includes(name)}
                            onChange={() => handleSummaryTypeToggle(name)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="flex-1">{name}</span>
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {summarySelectedTypes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {summarySelectedTypes.length} type{summarySelectedTypes.length > 1 ? 's' : ''} selected
                      {summarySelectedTypes.length < summaryAvailableTypes.length && ' (only selected types will be exported)'}
                    </p>
                  )}
                </div>

                {/* Filters */}
                <div className="border rounded-lg p-4 space-y-4">
                  <Label className="text-base font-semibold">Filters</Label>

                  {/* Date Added */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Date Added From</Label>
                      <Input
                        type="date"
                        value={summaryDateAddedFrom}
                        onChange={e => setSummaryDateAddedFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Date Added To</Label>
                      <Input
                        type="date"
                        value={summaryDateAddedTo}
                        onChange={e => setSummaryDateAddedTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Bought */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Date Bought From</Label>
                      <Input
                        type="date"
                        value={summaryDateBoughtFrom}
                        onChange={e => setSummaryDateBoughtFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Date Bought To</Label>
                      <Input
                        type="date"
                        value={summaryDateBoughtTo}
                        onChange={e => setSummaryDateBoughtTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Warranty Months */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Warranty Months (min)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 12"
                        value={summaryWarrantyMonthsMin}
                        onChange={e => setSummaryWarrantyMonthsMin(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Warranty Months (max)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 60"
                        value={summaryWarrantyMonthsMax}
                        onChange={e => setSummaryWarrantyMonthsMax(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Maintenance date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Maintenance Date From</Label>
                      <Input
                        type="date"
                        value={summaryMaintenanceFrom}
                        onChange={e => setSummaryMaintenanceFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Maintenance Date To</Label>
                      <Input
                        type="date"
                        value={summaryMaintenanceTo}
                        onChange={e => setSummaryMaintenanceTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Dropdown filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Employee Name</Label>
                      <Select
                        value={summaryEmployeeName}
                        onValueChange={v => setSummaryEmployeeName(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All employees</SelectItem>
                          {summaryEmployeeOptions.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Accountability Form #</Label>
                      <Select
                        value={summaryAccountabilityForm}
                        onValueChange={v => setSummaryAccountabilityForm(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All forms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All forms</SelectItem>
                          {summaryFormOptions.map(form => (
                            <SelectItem key={form} value={form}>{form}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Location</Label>
                      <Select
                        value={summaryLocation}
                        onValueChange={v => setSummaryLocation(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All locations</SelectItem>
                          {summaryLocationOptions.map(loc => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Department</Label>
                      <Select
                        value={summaryDepartment}
                        onValueChange={v => setSummaryDepartment(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All departments</SelectItem>
                          {summaryDepartmentOptions.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Condition toggle */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={summaryIncludeCondition}
                      onChange={(e) => setSummaryIncludeCondition(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium">
                      Include condition breakdown columns (Excellent, Good, Fair, Poor, Damaged)
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    When unchecked, the Device Type table shows only type, unit count, working, and defective counts.
                  </p>
                  {summaryIncludeCondition && (
                    <div className="ml-6 mt-3 p-3 border rounded-lg bg-gray-50">
                      <Label className="text-sm font-medium mb-2 block">
                        Select conditions to include in the breakdown:
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {EXPORT_SUMMARY_CONDITIONS.map(condition => (
                          <label
                            key={condition}
                            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer transition ${
                              summarySelectedConditions.includes(condition)
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={summarySelectedConditions.includes(condition)}
                              onChange={() => handleSummaryConditionToggle(condition)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            {condition}
                          </label>
                        ))}
                      </div>
                      {summarySelectedConditions.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          At least one condition must be selected when breakdown is enabled.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </AppDialogBody>

          <AppDialogChromeFooter className="flex justify-between">
            <div className="flex gap-2">
              {summaryStep === 2 && (
                <Button variant="outline" onClick={handleSummaryPrevStep}>
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsSummaryExportDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
            {summaryStep === 1 ? (
              <Button
                onClick={() => handleSummaryNextStep(summaryScope, activeCompany?.id)}
                disabled={summarySelectedColumns.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => handleSummaryExportConfirm(activeCompany, user, assetBuilders, activeCompany?.id, showScopeTabs ? scope : null, searchTerm)}
                disabled={summarySelectedColumns.size === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Export
              </Button>
            )}
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      <IntangibleAssetDialog
        isOpen={intangibleDialogOpen}
        setIsOpen={setIntangibleDialogOpen}
        mode={intangibleDialogMode}
        editingAsset={editingIntangibleAsset}
        onSuccess={handleIntangibleDialogSuccess}
      />

      <AssetBuilderViewModal
        isOpen={isBuilderDialogOpen}
        onClose={() => {
          setIsBuilderDialogOpen(false);
          setSelectedBuilder(null);
        }}
        builder={selectedBuilder}
        assets={assets}
        onAssetSelect={asset => {
          setSelectedAsset(asset);
          setIsViewModalOpen(true);
        }}
      />
    </div>
  );
}

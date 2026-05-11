'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Plus,
  FileText,
  FileSpreadsheet,
  Eye,
  Clock,
  X,
  CheckCircle2,
  Search,
  MapPin,
  Settings,
  RefreshCw,
  User,
  Building,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { EditAssetModal } from './assetsComponents/assetEditModal';
import { BuilderFormsTab } from './assetsComponents/BuilderFormsTab';
import { AssetFormData } from './assetsComponents/assetTypes/assetFormTypes';
import { Asset } from './assetsComponents/assetTable/assetData';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { useAssetsData } from './useAssetsData';
import { useAssetExport } from './useAssetExport';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import { Shimmer } from '@/components/ui/shimmer';
import { createLogger } from '@/lib/logger';
import { formatCurrency } from '@/lib/currency';
import {
  handleAssetUpdateError,
  handleAssetValidationError,
} from '@/utils/assetErrorHandling';
import { formatAuditPlainText } from '@/components/common/AuditFieldChanges';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';
import { PDFViewer } from '@/components/PDFViewer';

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

  // Check if user is Super Admin or Admin (can select any company)
  const isSuperAdminOrAdmin = Boolean(
    user?.role?.name?.toLowerCase() === 'super admin' ||
      user?.role?.name?.toLowerCase() === 'admin'
  );

  const isSuperAdmin = user?.role?.name?.toLowerCase() === 'super admin';
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const [scope, setScope] = useState<'it' | 'admin'>('it');

  const { assets, loading, fetchAssets, meta } = useAssetsData(
    activeCompany?.id || null,
    showScopeTabs ? scope : null
  );
  const isInitialLoading = loading && assets.length === 0;

  // Filtering is handled on server-side, no need for client-side filtering
  const filteredAssets = useMemo(() => {
    return assets;
  }, [assets]);

  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<any>(null);
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [activeBuilderTab, setActiveBuilderTab] = useState('information');
  const [builderAuditLogs, setBuilderAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const { lookups: builderAuditLookups, mergedIdLabels: builderMergedIdLabels } =
    useAuditFieldLookups();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('asset-list');
  const [tabLoading, setTabLoading] = useState(false);

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

  // Custom filter function that searches accountability form number as well
  const customFilterFn: any = (row: any, _columnId: any, filterValue: string) => {
    if (!filterValue) return true;
    
    const filterValueLower = filterValue.toLowerCase();
    
    // Search all standard columns
    const standardColumns = ['id', 'name', 'description', 'category', 'type', 'serialNo', 'modelNo', 'brand', 'status', 'assignedTo', 'department', 'location'];
    for (const col of standardColumns) {
      if (row.original[col] && String(row.original[col]).toLowerCase().includes(filterValueLower)) {
        return true;
      }
    }
    
    // Search accountability form number
    if (row.original.accountabilityForm?.formNumber && 
        String(row.original.accountabilityForm.formNumber).toLowerCase().includes(filterValueLower)) {
      return true;
    }
    
    return false;
  };

  // Check if user has permission to edit a specific asset
  const canEditAsset = (_asset: any) => {
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

  const {
    isExportDialogOpen,
    exportType,
    selectedColumns,
    availableColumns,
    handleExportClick,
    handleColumnToggle,
    handleExportConfirm,
    setIsExportDialogOpen,
  } = useAssetExport();

  // Server handles filtering by active company (Super Admin) or user company + asset type (other roles)
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
  }, [location.pathname]);

  useEffect(() => {
    fetchAssets();
  }, [activeCompany?.id]);

  // Fetch audit logs when selected builder changes - use dedicated builder audit API
  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!selectedBuilder?.builderID) {
        setBuilderAuditLogs([]);
        return;
      }

      try {
        setAuditLoading(true);

        const response = await api.get(
          `/audit/builders/${selectedBuilder.builderID}`
        );
        const logs = response.auditLogs || [];
        setBuilderAuditLogs(
          logs.sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        );
      } catch (error) {
        console.warn('Failed to fetch builder audit logs:', error);
        setBuilderAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditLogs();
  }, [selectedBuilder?.builderID]);

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
      apiFormData.append('companyId', formData.company || '');
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

      // Append image file if exists
      if (formData.imageFile) {
        apiFormData.append('image', formData.imageFile);
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
          totalCount={meta.total}
        />

        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setTabLoading(true); setTimeout(() => setTabLoading(false), 300); }} className="w-full">
          {isInitialLoading ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100/90 p-1">
              <Shimmer className="h-10 w-full rounded-lg bg-red-600" />
              <Shimmer className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <TabsList className={segmentTabsListClassName + ' grid grid-cols-2'}>
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
                  globalFilterFn={customFilterFn}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportClick('pdf')}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportClick('excel')}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export Excel
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
                                setActiveBuilderTab('information');
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

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <AppDialogFrame className="max-w-2xl max-h-[80vh] overflow-hidden !flex !flex-col">
          <AppDialogGradientHeader
            title={`Select Columns to Export (${exportType?.toUpperCase() ?? ''})`}
            description="Choose which columns to include in your export file."
          />

          <AppDialogBody className="max-h-[50vh] overflow-y-auto py-4">
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
          </AppDialogBody>

          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleExportConfirm(displayAssets, activeCompany, user, assetBuilders)}
              disabled={selectedColumns.size === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Export {exportType?.toUpperCase()}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Asset Builder Details Modal */}
      {isBuilderDialogOpen && selectedBuilder && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => setIsBuilderDialogOpen(false)}
            />

            <Card className="relative z-10 w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col h-[88vh] max-h-[840px] min-h-[660px] mx-4 border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white pb-12 pt-8 px-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">
                      {selectedBuilder.name || 'Asset Builder Details'}
                    </h2>
                    <p className="text-red-100 mt-2 text-base">
                      Viewing asset builder information
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBuilderDialogOpen(false)}
                    className="text-white hover:bg-white/20 rounded-full"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </CardHeader>

              <div className="relative -mt-6 md:-mt-8 px-2 md:px-4 flex-shrink-0">
                <div className="flex justify-center overflow-x-auto scrollbar-hide">
                  <div className="flex items-center bg-white rounded-full shadow-xl px-4 py-2 md:px-10 md:py-4 border-2 md:border-4 border-red-100">
                    {[
                      {
                        title: 'Information',
                        icon: Package,
                        value: 'information',
                        description: 'Builder Details',
                      },
                      {
                        title: 'Timeline',
                        icon: Clock,
                        value: 'timeline',
                        description: 'Builder History & Events',
                      },
                      {
                        title: 'Forms',
                        icon: FileText,
                        value: 'forms',
                        description: 'Builder Forms',
                      },
                    ].map((tab, index) => {
                      const Icon = tab.icon;
                      const isActive =
                        tab.value === (activeBuilderTab || 'information');

                      return (
                        <div key={tab.value} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => setActiveBuilderTab(tab.value)}
                              className={`w-8 h-8 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 md:border-4 transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-red-600 text-white border-red-300 ring-2 md:ring-4 ring-red-100'
                                  : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              <Icon className="h-4 w-4 md:h-5 md:w-5" />
                            </button>
                            <p
                              className={`mt-1 md:mt-2 text-xs font-medium text-center max-w-20 ${isActive ? 'text-red-700' : 'text-gray-500'}`}
                            >
                              {tab.title}
                            </p>
                          </div>
                          {index < 2 && (
                            <div className="w-8 md:w-20 lg:w-24 h-1 mx-2 md:mx-4 bg-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <CardContent className="flex-1 overflow-y-auto px-6 pt-6 pb-4 min-h-0">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-red-700 text-center sm:text-left">
                    {
                      [
                        {
                          value: 'information',
                          description: 'Builder Information',
                        },
                        { value: 'timeline', description: 'Builder Timeline' },
                        { value: 'forms', description: 'Builder Forms' },
                      ].find(
                        tab => tab.value === (activeBuilderTab || 'information')
                      )?.description
                    }
                  </h3>
                </div>

                {(activeBuilderTab || 'information') === 'information' && (
                  <>
                    {/* Builder Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Builder Details
                          </h3>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              {selectedBuilder.description ||
                                'No description provided'}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">
                                  Created:
                                </span>
                                <p className="text-gray-600">
                                  {new Date(
                                    selectedBuilder.created_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Created By:
                                </span>
                                <p className="text-gray-600">
                                  {selectedBuilder.created_by_name ||
                                    selectedBuilder.created_by ||
                                    'Unknown'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assets in Builder */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Assets in this Builder
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedBuilder.items?.map(
                          (item: any, index: number) => {
                            return (
                              <button
                                key={index}
                                type="button"
                                className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors w-full text-left ${
                                  item.is_parent ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
                                }`}
                                onClick={async e => {
                                  e.stopPropagation();
                                  let foundAsset = assets.find(
                                    a => a.id === item.asset_code
                                  );
                                  if (!foundAsset) {
                                    // Asset not in main list (likely in a builder), fetch it separately
                                    try {
                                      const response = await api.get(
                                        `/assets/${item.asset_code}`
                                      );
                                      if (
                                        response.assets &&
                                        response.assets.length > 0
                                      ) {
                                        const apiAsset = response.assets[0];
                                        const createdAtParsedInline =
                                          apiAsset.created_at
                                            ? new Date(
                                                String(
                                                  apiAsset.created_at
                                                ).replace(' ', 'T') +
                                                  (String(
                                                    apiAsset.created_at
                                                  ).includes('Z')
                                                    ? ''
                                                    : 'Z')
                                              )
                                            : new Date();
                                        const lastMaintInline =
                                          apiAsset.last_maintenance_date
                                            ? new Date(
                                                apiAsset.last_maintenance_date
                                              )
                                            : null;
                                        const nextMaintInline =
                                          computeNextMaintenanceDate(
                                            apiAsset.maintenance_schedule,
                                            {
                                              lastMaintenanceDate:
                                                apiAsset.last_maintenance_date,
                                              purchaseDate:
                                                apiAsset.purchase_date,
                                              createdAt: createdAtParsedInline,
                                            }
                                          );
                                        // Transform API data to match the expected format for Asset interface (same as useAssetsData)
                                        foundAsset = {
                                          id: apiAsset.asset_code,
                                          assetID: apiAsset.assetID,
                                          name: apiAsset.name,
                                          image: apiAsset.image_url || '',
                                          description:
                                            apiAsset.description || '',
                                          category:
                                            apiAsset.category_name ||
                                            apiAsset.category_id ||
                                            '',
                                          type:
                                            apiAsset.type_name ||
                                            apiAsset.type_id ||
                                            '',
                                          serialNo: apiAsset.serial || '',
                                          modelNo: apiAsset.model || '',
                                          brand: apiAsset.brand || '',
                                          status:
                                            (apiAsset.status === 'In Use'
                                              ? 'Assigned'
                                              : (apiAsset.status as
                                                  | 'Available'
                                                  | 'Assigned'
                                                  | 'In Maintenance')) ||
                                            'Available',
                                          assignedTo:
                                            apiAsset.currentAssignment?.user
                                              ?.name || '',
                                          department:
                                            apiAsset.currentAssignment
                                              ?.department ||
                                            (apiAsset.department
                                              ? JSON.parse(apiAsset.department)
                                                  .name
                                              : '') ||
                                            '',
                                          location:
                                            apiAsset.currentAssignment
                                              ?.location ||
                                            `${apiAsset.location_name || ''}${apiAsset.room_name ? ` - ${apiAsset.room_name}` : ''}`,
                                          currentAssignment:
                                            apiAsset.currentAssignment,
                                          assignmentHistory:
                                            apiAsset.assignmentHistory,
                                          builderHistory:
                                            apiAsset.builderHistory,
                                          purchaseDate: apiAsset.purchase_date
                                            ? new Date(apiAsset.purchase_date)
                                            : null,
                                          purchasePrice:
                                            apiAsset.asset_value || 0,
                                          supplier: apiAsset.supplier || '',
                                          warranty: apiAsset.warranty_months
                                            ? `${apiAsset.warranty_months} months`
                                            : null,
                                          warranty_months:
                                            apiAsset.warranty_months || null,
                                          documents: apiAsset.documents || [],
                                          maintenanceSchedule:
                                            apiAsset.maintenance_schedule ||
                                            'None',
                                          lastMaintenanceDate:
                                            lastMaintInline &&
                                            !Number.isNaN(
                                              lastMaintInline.getTime()
                                            )
                                              ? lastMaintInline
                                              : null,
                                          nextMaintenanceDate: nextMaintInline,
                                          condition:
                                            (apiAsset.condition as
                                              | 'Excellent'
                                              | 'Good'
                                              | 'Needs Repair'
                                              | 'Damaged'
                                              | 'Obsolete') || 'Good',
                                          usefulLifeYears:
                                            apiAsset.useful_life_years || 0,
                                          salvageValue:
                                            apiAsset.salvage_value || 0,
                                          depreciationMethod:
                                            apiAsset.depreciation_method || '',
                                          annualDepreciation:
                                            apiAsset.annual_depreciation || 0,
                                          depreciationStartDate:
                                            apiAsset.depreciation_start_date
                                              ? new Date(
                                                  apiAsset.depreciation_start_date
                                                )
                                              : null,
                                          company: apiAsset.company_name || '',
                                          company_id: apiAsset.company_id || '',
                                          building: apiAsset.building || '',
                                          createdAt: createdAtParsedInline,
                                          createdBy:
                                            apiAsset.created_by_name ||
                                            apiAsset.created_by ||
                                            '',
                                          updatedAt: apiAsset.updated_at
                                            ? new Date(apiAsset.updated_at)
                                            : new Date(apiAsset.created_at),
                                          updatedBy:
                                            apiAsset.updated_by_name ||
                                            apiAsset.updated_by ||
                                            '',
                                        };
                                      }
                                    } catch (error) {
                                      console.error(
                                        'Failed to fetch asset details:',
                                        error
                                      );
                                      toast.error(
                                        'Failed to load asset details'
                                      );
                                      return;
                                    }
                                  }
                                  if (foundAsset) {
                                    setSelectedAsset(foundAsset);
                                    setIsViewModalOpen(true);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {item.is_parent && (
                                        <Crown className="h-4 w-4 text-amber-600" />
                                      )}
                                      <span className={`font-medium ${item.is_parent ? 'text-amber-900' : 'text-gray-900'}`}>
                                        {item.asset_code}
                                      </span>
                                    </div>
                                    <p className={`text-sm mb-2 ${item.is_parent ? 'text-amber-700' : 'text-gray-600'}`}>
                                      {item.asset_name}
                                    </p>
                                    <div className="text-xs text-gray-500">
                                      <span>
                                        Category: {item.category_name || 'N/A'}
                                      </span>
                                      {item.type_name && (
                                        <span> • Type: {item.type_name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </>
                )}

                {(activeBuilderTab || 'information') === 'timeline' && (
                  <div className="space-y-6 w-full">
                    {/* Audit log events - includes Created Asset Builder, Added/Removed, Assigned, etc. */}
                    {auditLoading ? (
                      <div className="text-center py-4 text-gray-500">
                        <p></p>
                      </div>
                    ) : (
                      builderAuditLogs.map((log: any, index: number) => {
                        const Icon =
                          log.action === 'Assigned Asset Builder'
                            ? MapPin
                            : log.action === 'Added to Asset Builder' ||
                                log.action === 'Removed from Asset Builder'
                              ? Settings
                              : log.action === 'Updated Asset Builder'
                                ? Clock
                                : Package;
                        const isLast = index === builderAuditLogs.length - 1;

                        return (
                          <div
                            key={`audit-${log.id}`}
                            className="flex gap-3 sm:gap-4 w-full"
                          >
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-indigo-600 bg-gray-50 border-2 border-gray-200">
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </div>
                              {!isLast && (
                                <div className="w-0.5 h-12 sm:h-16 bg-gray-200 mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-6 sm:pb-8 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                                    {log.action}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words whitespace-pre-line">
                                    {log.action ===
                                      'Updated Asset Builder Status' &&
                                    log.newValues?.returned_asset_codes
                                      ?.length > 0 ? (
                                      <>
                                        Asset builder &quot;
                                        {log.resource}&quot; status updated to
                                        &quot;Available&quot; due to asset
                                        return. Assets returned:
                                        <ul className="list-disc list-inside mt-1 ml-2">
                                          {log.newValues.returned_asset_codes.map(
                                            (code: string) => (
                                              <li key={code}>{code}</li>
                                            )
                                          )}
                                        </ul>
                                      </>
                                    ) : (
                                      (() => {
                                        let description = formatAuditPlainText(
                                          log.details ?? '',
                                          builderMergedIdLabels
                                        ) || '';
                                        // Append user name for builder-related actions
                                        if (log.user?.name) {
                                          description += ` by ${log.user.name}`;
                                        }
                                        return description || `${log.action} by ${log.user?.name || 'Unknown'}`;
                                      })()
                                    )}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                  {new Date(log.timestamp).toLocaleDateString(
                                    'en-US',
                                    {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div className="flex gap-3 sm:gap-4 w-full">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-600 bg-gray-50 border-2 border-gray-200">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>
                      <div className="flex-1 pb-6 sm:pb-8 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                              Current Status
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                              Builder is currently{' '}
                              {availableBuilders.some(
                                ab => ab.builderID === selectedBuilder.builderID
                              )
                                ? 'available for use'
                                : 'assigned to a user'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(activeBuilderTab || 'information') === 'forms' && (
                  <div className="space-y-6 w-full">
                    <BuilderFormsTab builderId={selectedBuilder.builderID} />
                  </div>
                )}
              </CardContent>

              <div className="flex flex-col sm:flex-row justify-between gap-4 px-6 py-5 bg-gray-50 border-t">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsBuilderDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  User,
  MapPin,
  Building,
  Search,
  CheckCircle2,
  Users,
  Warehouse,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCompanyContext } from '@/context/CompanyContext';
import { Input } from '@/components/ui/input';
import { Shimmer } from '@/components/ui/shimmer';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { createLogger } from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetSelectionPanel } from './components/AssetSelectionPanel';
import { AssignmentDetailsPanel } from './components/AssignmentDetailsPanel';
import {
  AssignedAssetsTable,
  type AssetAssignment,
} from './components/AssignedAssetsTable';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AssetChecklistDialog } from './components/AssetChecklistDialog';
import { hasComputerTypeAssets, isComputerTypeAsset } from '@/utils/assetTypeDetection';

const logger = createLogger('AssetsIssuance');

interface Asset {
  id: string;
  name: string;
  status: string;
  category: string;
  type: string;
  serialNo: string;
  assignedTo: string;
  department: string;
  location: string;
  specifications?: Array<{
    assetId: string;
    assetName: string;
    specDescription: string;
  }>;
}

interface Department {
  departmentID: string;
  name: string;
  code: string;
}

interface Location {
  locationID: string;
  name: string;
  floor_unit: string;
  building: string;
  department_id?: string;
  room_areas?: { room_name: string }[];
}

interface User {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  company: any;
  position?: string | null;
}

export default function AssetsAssignment() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<any>(null);
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [groupedAssetIds, setGroupedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [buildersPage, setBuildersPage] = useState(1);
  const buildersPerPage = 9; // 3x3 grid
  const displayLoading = useDelayedLoading(loading, 2000);

  const fetchAssets = async () => {
    try {
      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'super admin' || userRole === 'admin') {
        // Super Admin and Admin use active company from CompanyContext
        companyId = activeCompany?.id || undefined;
      } else {
        // IT asset and Admin asset users use their assigned company
        companyId = currentUser?.company_id || undefined;
      }

      const queryParams = new URLSearchParams();
      queryParams.append('limit', '-1');
      if (companyId) {
        queryParams.append('companyId', companyId);
      }
      const url = `/assets?${queryParams.toString()}`;
      const response = await api.get(url);
      const assetsData = response.assets || [];
      console.log('[AssetsIssuance] Received assets count:', assetsData.length);
      const transformedAssets = assetsData.map((asset: any) => ({
        id: asset.asset_code,
        name: asset.name,
        status: asset.status,
        category: asset.category_name || asset.category_id,
        type: asset.type_name || asset.type_id,
        serialNo: asset.serial,
        assignedTo: asset.created_by_name || asset.created_by,
        department: asset.department_name || '',
        location: `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
        specifications: asset.specifications || [],
      }));
      setAssets(transformedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      const locs = response.locations || [];
      setLocations(locs);
      setBuildings([
        ...new Set(
          locs.map((loc: any) => loc.building).filter(Boolean) as string[]
        ),
      ]);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
      setBuildings([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };


  const fetchAssignments = async () => {
    try {
      const response = await api.get('/asset-assignments');
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      logger.debug('Fetching asset builders...');
      const response = await api.get('/asset-builders', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      logger.debug('Asset builders response:', response);

      if (response && Array.isArray(response.builders)) {
        const allGroupedIds = new Set<string>();
        response.builders.forEach((builder: any) => {
          logger.debug('Processing builder', {
            name: builder.name,
            itemsCount: builder.items?.length,
          });
          if (builder.items && Array.isArray(builder.items)) {
            builder.items.forEach((item: any) => {
              logger.debug('Adding asset_code', { assetCode: item.asset_code });
              allGroupedIds.add(item.asset_code.trim());
            });
          }
        });
        logger.debug('groupedAssetIds', { count: allGroupedIds.size });
        setGroupedAssetIds(allGroupedIds);
        setAssetBuilders(response.builders);
      } else if (response && Object.keys(response).length === 0) {
        // 304 Not Modified or empty response, keep existing data
        logger.debug(
          'Received empty response for grouped assets, keeping existing'
        );
        setGroupedAssetIds(new Set());
        setAssetBuilders([]);
      } else {
        logger.warn('Invalid response structure for asset builders');
        setGroupedAssetIds(new Set());
        setAssetBuilders([]);
      }
    } catch (error) {
      console.error('Failed to fetch asset builders:', error);
      // Keep empty set if API fails
      setGroupedAssetIds(new Set());
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch assets and other data
      await Promise.all([
        fetchAssets(),
        fetchDepartments(),
        fetchLocations(),
        fetchUsers(),
        fetchAssignments(),
        fetchAssetBuilders(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [activeCompany?.id]);

  // Reset selections based on hierarchical dependencies
  useEffect(() => {
    if (selectedBuilding) {
      // When building changes, reset dependent fields
      setSelectedDepartment('');
      setSelectedLocation('');
      setSelectedRoom('');
      setSelectedUser('');
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedDepartment) {
      // When department changes, reset dependent fields
      setSelectedLocation('');
      setSelectedRoom('');
      setSelectedUser('');
      setUserSearchTerm('');
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedLocation) {
      // When location changes, reset room
      setSelectedRoom('');
    }
  }, [selectedLocation]);

  // Reset selected user and location if department changes and they don't match
  useEffect(() => {
    if (selectedDepartment && selectedUser) {
      const user = users.find(u => u.userID === selectedUser);
      if (user && user.department_id !== selectedDepartment) {
        setSelectedUser('');
      }
    }
    if (selectedDepartment && selectedLocation) {
      const location = locations.find(l => l.locationID === selectedLocation);
      if (location && location.department_id !== selectedDepartment) {
        setSelectedLocation('');
        setSelectedRoom('');
      }
    }
  }, [selectedDepartment, users, selectedUser, locations, selectedLocation]);

  const handleAssetSelection = (assetId: string, checked: boolean | string) => {
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssets(prev => [...prev, assetId]);
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId));
    }
  };

  const handleAssignClick = () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    if (!selectedUser) {
      toast.error('Please select a user to assign the assets to');
      return;
    }

    // Check if any selected assets are computer-type
    const hasComputerAssets = hasComputerTypeAssets(assets, selectedAssets);

    if (hasComputerAssets) {
      // Open checklist dialog for computer-type assets
      setChecklistDialogOpen(true);
    } else {
      // Proceed directly to confirmation modal for non-computer assets
      setConfirmModalOpen(true);
    }
  };

  const handleChecklistSubmit = async (
    checklistData: any,
    typeOnboarding: boolean,
    typeOffboarding: boolean,
    receivedBy: string,
    remarks: string
  ) => {
    // Save checklist data (will be saved after assignment is created)
    setPendingAssignmentData({
      checklistData,
      typeOnboarding,
      typeOffboarding,
      receivedBy,
      remarks,
    });
    setChecklistDialogOpen(false);
    setConfirmModalOpen(true);
  };

  const handleAssign = async (signAsIssuer: boolean, signITCopy: boolean) => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    if (!selectedUser) {
      toast.error('Please select a user to assign the assets to');
      return;
    }

    const assigneeUser = users.find(u => u.userID === selectedUser);
    const assigneeDisplayName = assigneeUser
      ? `${assigneeUser.first_name} ${assigneeUser.last_name}`.trim()
      : '';

    setAssigning(true);
    try {
      // Send all selected assets in a single API call to create one assignment with multiple assets
      const assignmentData = {
        assetId: selectedAssets, // Array of asset IDs
        userId: selectedUser,
        departmentId: selectedDepartment || undefined,
        locationId: selectedLocation || undefined,
        locationRoomId: selectedRoom || undefined,
        assignmentNotes: `Assigned via asset issuance`,
        signAsIssuer: signAsIssuer,
        issuerSignature: signAsIssuer ? currentUser?.digitalSignature || null : null,
        signITCopy: signITCopy,
        itCopySignature: signITCopy ? currentUser?.digitalSignature || null : null,
      };

      const assignmentResponse = await api.post('/asset-assignments', assignmentData);

      // Update builders if any are selected - DO NOT REMOVE ASSETS FROM BUILDERS
      if (selectedBuilders.length > 0) {
        // Update builder status only, DO NOT remove assets from builders
        for (const builder of selectedBuilders) {
          try {
            // Only update the builder status to "Assigned", keep all assets in the builder
            await api.put(`/asset-builders/${builder.builderID}`, {
              name: builder.name,
              description: builder.description,
              // DO NOT send assetIds - keep all assets in the builder
              status: 'Assigned',
            });
          } catch (error) {
            console.error('Failed to update builder:', error);
          }
        }
      }

      // Save checklist data if it exists (for computer-type assets)
      if (pendingAssignmentData && assignmentResponse.assignments && assignmentResponse.assignments.length > 0) {
        const checklistAsset = assets.find(
          asset => selectedAssets.includes(asset.id) && isComputerTypeAsset(asset)
        );
        const checklistAssignment =
          assignmentResponse.assignments.find(
            (assignment: any) =>
              assignment.asset_code === checklistAsset?.id ||
              assignment.asset_id === checklistAsset?.id
          ) || assignmentResponse.assignments[0];
        const assignmentId = checklistAssignment?.assignmentID;
        if (assignmentId) {
          try {
            const assigneeUser = users.find(u => u.userID === selectedUser);
            const assigneeName = assigneeUser
              ? `${assigneeUser.first_name} ${assigneeUser.last_name}`
              : '';
            const department = departments.find(d => d.departmentID === selectedDepartment);

            await api.post('/asset-assignments/checklist', {
              assignmentId,
              employeeId: selectedUser,
              employeeName: assigneeName,
              employeeDesignation: assigneeUser?.position || null,
              employeeDepartment: department?.name || null,
              employeeCompany: assigneeUser?.company?.name || null,
              typeOnboarding: pendingAssignmentData.typeOnboarding,
              typeOffboarding: pendingAssignmentData.typeOffboarding,
              receivedBy: pendingAssignmentData.receivedBy,
              checklistData: pendingAssignmentData.checklistData,
              remarks: pendingAssignmentData.remarks,
            });
          } catch (error) {
            console.error('Failed to save checklist:', error);
            toast.error('Failed to save asset checklist');
          }
        }
        setPendingAssignmentData(null);
      }

      // The server automatically creates one accountability form for all assets
      // No need to create separate accountability forms here

      toast.success(
        `Assigned ${selectedAssets.length} asset(s) to ${assigneeDisplayName || 'user'}`
      );

      // Dispatch event to refetch assets in other components
      window.dispatchEvent(new CustomEvent('assetsUpdated'));

      // Reset form
      setSelectedAssets([]);
      setSelectedBuilding('');
      setSelectedDepartment('');
      setSelectedLocation('');
      setSelectedRoom('');
      setSelectedUser('');

      // Refresh assets, assignments, and asset builders
      await fetchAssets();
      await fetchAssignments();
      await fetchAssetBuilders();
    } catch (error: unknown) {
      console.error('Failed to assign assets:', error);
      toast.error('Failed to assign assets');
    } finally {
      setAssigning(false);
    }
  };

  // Add state for categories to check department_id
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await api.get('/categories');
        setCategories(
          Array.isArray(response) ? response : response.categories || []
        );
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredAssets = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    const searchText = (asset: Asset) =>
      [
        asset.id,
        asset.name,
        asset.status,
        asset.category,
        asset.type,
        asset.serialNo,
        asset.assignedTo,
        asset.department,
        asset.location,
        asset.specifications
          ?.map(s => s.assetName || s.specDescription)
          .join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return assets
      .filter(
        asset => asset.status === 'Available' || asset.status === 'In Use'
      )
      .filter(
        asset => searchLower === '' || searchText(asset).includes(searchLower)
      )
      .filter(asset => {
        // Check if user has basic asset assignment permissions
        const hasBasicAccess =
          hasPermission('Asset Assignment', 'create') &&
          hasPermission('Asset Assignment', 'edit');

        if (!hasBasicAccess) {
          return false;
        }

        const assetCategory = categories.find(
          c => c.name === asset.category || c.categoryID === asset.category
        );
        const categoryDepartmentId = assetCategory?.department_id;

        if (!categoryDepartmentId) {
          return true;
        }

        // Effective scope from manager_role and asset_type for IT/Admin custodian roles
        const hasCustodianAccess =
          roleCustodian &&
          (roleCustodian.managerRole !== 'none' ||
            roleCustodian.assetType === 'it' ||
            roleCustodian.assetType === 'admin');
        if (!hasCustodianAccess) {
          return true;
        }

        const isITDept = (name: string) =>
          name.includes('it') || name.includes('information technology');
        const isAdminDept = (name: string) =>
          name.includes('admin') || name.includes('administration');
        const itDepartmentId = categories.find(c =>
          isITDept((c.department?.name ?? '').toString().toLowerCase())
        )?.department_id;
        const adminDepartmentId = categories.find(c =>
          isAdminDept((c.department?.name ?? '').toString().toLowerCase())
        )?.department_id;

        if (roleCustodian.managerRole === 'overallManager') {
          return true;
        }
        if (
          roleCustodian.managerRole === 'itManager' ||
          roleCustodian.assetType === 'it'
        ) {
          return (
            itDepartmentId != null && categoryDepartmentId === itDepartmentId
          );
        }
        if (
          roleCustodian.managerRole === 'adminManager' ||
          roleCustodian.assetType === 'admin'
        ) {
          return (
            adminDepartmentId != null &&
            categoryDepartmentId === adminDepartmentId
          );
        }
        return true;
      });
  }, [assets, searchTerm, hasPermission, roleCustodian, categories]);

  const availableAssets = useMemo(() => {
    return filteredAssets.filter(
      asset => asset.id && !groupedAssetIds.has(asset.id.trim())
    );
  }, [filteredAssets, groupedAssetIds]);

  // For builder selection, include assets that are in builders but available
  const allSelectableAssets = useMemo(() => {
    return filteredAssets.filter(
      asset => asset.status === 'Available' || asset.status === 'In Use'
    );
  }, [filteredAssets]);

  const availableBuilders = useMemo(() => {
    return assetBuilders.filter((builder: any) => {
      return (
        builder.status === 'Available' &&
        builder.items &&
        Array.isArray(builder.items) &&
        builder.items.length > 0
      );
    });
  }, [assetBuilders]);

  const filteredBuilders = useMemo(() => {
    return availableBuilders.filter((builder: any) => {
      const searchLower = builderSearchTerm.toLowerCase();
      return (
        builder.name?.toLowerCase().includes(searchLower) ||
        builder.description?.toLowerCase().includes(searchLower) ||
        builder.items?.some(
          (item: any) =>
            item.asset_name?.toLowerCase().includes(searchLower) ||
            item.asset_code?.toLowerCase().includes(searchLower)
        )
      );
    });
  }, [availableBuilders, builderSearchTerm]);

  const paginatedBuilders = useMemo(() => {
    const startIndex = 0;
    const endIndex = buildersPage * buildersPerPage;
    return filteredBuilders.slice(startIndex, endIndex);
  }, [filteredBuilders, buildersPage, buildersPerPage]);

  const hasMoreBuilders = filteredBuilders.length > paginatedBuilders.length;

  const selectedBuilders = useMemo(() => {
    return availableBuilders.filter((builder: any) => {
      const builderAssets =
        builder.items?.map((item: any) => item.asset_code) || [];
      const availableBuilderAssets = builderAssets.filter((assetId: string) =>
        allSelectableAssets.some(asset => asset.id === assetId)
      );
      return (
        availableBuilderAssets.length > 0 &&
        availableBuilderAssets.every((assetId: string) =>
          selectedAssets.includes(assetId)
        )
      );
    });
  }, [availableBuilders, selectedAssets, allSelectableAssets]);

  const filteredLocations = (locations || []).filter(
    loc =>
      (!selectedBuilding || loc.building === selectedBuilding) &&
      (!selectedDepartment || loc.department_id === selectedDepartment)
  );

  const availableRooms = selectedLocation
    ? locations
        .find(loc => loc.locationID === selectedLocation)
        ?.room_areas?.filter(r => r)
        ?.map(r => r.room_name) || []
    : [];

  const filteredUsers = (users || []).filter(
    user =>
      (!selectedDepartment || user.department_id === selectedDepartment) &&
      (!activeCompany?.id || user.company?.id === activeCompany?.id)
  );

  // Skeleton component for builder cards
  const BuilderCardSkeleton = () => (
    <Card className="border-0 shadow-sm">
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
  );

  if (displayLoading) {
    return (
      <div className="min-h-screen">
        <main className="flex-1 p-6 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <Shimmer className="h-14 w-14 rounded-2xl bg-red-100/80" />
                <div className="space-y-2">
                  <Shimmer className="h-8 w-48 rounded bg-red-100/80" />
                  <Shimmer className="h-4 w-64 rounded bg-red-100/80" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-4">
              <Shimmer className="h-10 w-full max-w-md rounded-lg" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-3 p-3 border rounded-lg">
                    <Shimmer className="h-10 w-10 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Shimmer className="h-4 w-3/4 rounded" />
                      <Shimmer className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Shimmer className="h-10 w-full rounded-lg" />
              <Shimmer className="h-10 w-full rounded-lg" />
              <Shimmer className="h-24 w-full rounded-lg" />
              <Shimmer className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="Assets Assignment"
          description="Issue and assign assets to users"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAssets()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
          {/* Asset Selection / Asset Built Tabs */}
          <div className="xl:col-span-2">
            <Tabs defaultValue="select-assets" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-1 rounded-xl bg-gray-100 p-1.5 sm:grid-cols-2">
                <TabsTrigger
                  value="select-assets"
                  className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Package className="h-4 w-4" />
                  Select Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {availableAssets.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="asset-built"
                  className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Boxes className="h-4 w-4" />
                  Asset Built
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {availableBuilders.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select-assets" className="mt-4">
                <AssetSelectionPanel
                  assets={availableAssets}
                  selectedAssets={selectedAssets}
                  searchTerm={searchTerm}
                  loading={loading || buildersLoading}
                  hasPermission={hasPermission}
                  onSearchChange={setSearchTerm}
                  onAssetSelection={handleAssetSelection}
                  onClearAll={() => setSelectedAssets([])}
                />
              </TabsContent>

              <TabsContent value="asset-built" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[500px]">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <Boxes className="h-5 w-5 text-red-600" />
                      </div>
                      <span>Asset Built</span>
                      <Badge variant="secondary" className="w-fit">
                        {availableBuilders.length} available
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Existing asset builders in your organization. Select a
                      builder to assign all its assets.
                    </p>
                    <div className="relative mt-4 w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by builder name or asset code..."
                        value={builderSearchTerm}
                        onChange={e => setBuilderSearchTerm(e.target.value)}
                        className="pl-10 w-full h-10 border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {buildersLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <BuilderCardSkeleton key={index} />
                        ))}
                      </div>
                    ) : paginatedBuilders.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-1">
                          {paginatedBuilders.map((builder: any) => {
                            const isAvailable = builder.status === 'Available';
                            const builderAssets =
                              builder.items?.map(
                                (item: any) => item.asset_code
                              ) || [];
                            const availableBuilderAssets = builderAssets.filter(
                              (assetId: string) =>
                                allSelectableAssets.some(
                                  asset => asset.id === assetId
                                )
                            );
                            const isSelected =
                              availableBuilderAssets.length > 0 &&
                              availableBuilderAssets.every((assetId: string) =>
                                selectedAssets.includes(assetId)
                              );

                            return (
                              <Card
                                key={builder.builderID}
                                className={`border shadow-sm hover:shadow-md transition-shadow ${
                                  isAvailable
                                    ? 'cursor-pointer'
                                    : 'cursor-not-allowed opacity-50'
                                } ${
                                  isSelected
                                    ? 'border-2 border-red-500 bg-red-100'
                                    : 'border border-gray-200'
                                }`}
                                onClick={() => {
                                  if (!isAvailable) return;
                                  if (isSelected) {
                                    setSelectedAssets(prev =>
                                      prev.filter(
                                        id => !builderAssets.includes(id)
                                      )
                                    );
                                  } else {
                                    setSelectedAssets(prev => [
                                      ...new Set([
                                        ...prev,
                                        ...availableBuilderAssets,
                                      ]),
                                    ]);
                                  }
                                }}
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
                                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                        <span>
                                          Created:{' '}
                                          {new Date(
                                            builder.created_at
                                          ).toLocaleDateString()}
                                        </span>
                                        <span>
                                          {builder.items?.length || 0} assets
                                        </span>
                                      </div>
                                      {builder.items &&
                                        builder.items.length > 0 && (
                                          <div className="space-y-2">
                                            <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                                              Assets in this builder (asset code
                                              · name):
                                            </div>
                                            <ul className="space-y-1.5 max-h-[8.5rem] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pl-5 list-disc">
                                              {builder.items.map(
                                                (item: any, index: number) => (
                                                  <li
                                                    key={index}
                                                    className="flex items-center gap-2 text-xs bg-gray-50 rounded px-3 py-2 border border-gray-200 -ml-1 pl-3"
                                                  >
                                                    <span
                                                      className="font-mono font-medium text-gray-900 shrink-0"
                                                      title="Asset code"
                                                    >
                                                      {item.asset_code}
                                                    </span>
                                                    <span
                                                      className="text-gray-600 truncate"
                                                      title={item.asset_name}
                                                    >
                                                      {item.asset_name}
                                                    </span>
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        {hasMoreBuilders && (
                          <div className="flex justify-center pt-4">
                            <Button
                              onClick={() => setBuildersPage(prev => prev + 1)}
                              variant="outline"
                              className="px-6"
                            >
                              Load More Builders
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Boxes className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {builderSearchTerm
                            ? 'No builders match your search'
                            : 'No Available Asset Builders'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {builderSearchTerm
                            ? 'Try adjusting your search terms or clear the search to see all available builders.'
                            : 'All asset builders have been assigned or are currently unavailable.'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Assignment Details Panel */}
          <div>
            <AssignmentDetailsPanel
              departments={departments}
              locations={locations}
              buildings={buildings}
              users={users}
              selectedBuilding={selectedBuilding}
              selectedDepartment={selectedDepartment}
              selectedLocation={selectedLocation}
              selectedRoom={selectedRoom}
              selectedUser={selectedUser}
              filteredLocations={filteredLocations}
              availableRooms={availableRooms}
              filteredUsers={filteredUsers}
              hasPermission={hasPermission}
              onBuildingChange={setSelectedBuilding}
              onDepartmentChange={setSelectedDepartment}
              onLocationChange={setSelectedLocation}
              onRoomChange={setSelectedRoom}
              onUserChange={setSelectedUser}
              onAssign={handleAssignClick}
              assigning={assigning}
              selectedAssets={selectedAssets}
              departmentSearchTerm={departmentSearchTerm}
              onDepartmentSearchChange={setDepartmentSearchTerm}
              userSearchTerm={userSearchTerm}
              onUserSearchChange={setUserSearchTerm}
            />
          </div>
        </div>

        {/* Assigned Assets Table */}
        <AssignedAssetsTable assignments={assignments} />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          selectedAssets={selectedAssets}
          assets={assets}
          departments={departments}
          locations={locations}
          users={users}
          selectedBuilding={selectedBuilding}
          selectedDepartment={selectedDepartment}
          selectedLocation={selectedLocation}
          selectedRoom={selectedRoom}
          selectedUser={selectedUser}
          assigning={assigning}
          onConfirm={handleAssign}
        />

        {/* Asset Checklist Dialog */}
        <AssetChecklistDialog
          isOpen={checklistDialogOpen}
          onOpenChange={setChecklistDialogOpen}
          selectedAssets={selectedAssets}
          assets={assets}
          selectedUser={selectedUser}
          users={users}
          departments={departments}
          currentUserPosition={currentUser?.position || ''}
          onSubmit={handleChecklistSubmit}
        />

      </main>
    </div>
  );
}

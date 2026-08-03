'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Boxes,
  Layers,
  User,
  MapPin,
  Building,
  Search,
  CheckCircle2,
  Users,
  Warehouse,
  UserCheck,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Shimmer } from '@/components/ui/shimmer';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { generateUUID } from '@/utils/uuid';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';
import { createLogger } from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { AssetSelectionPanel } from './components/AssetSelectionPanel';
import { AssignmentDetailsPanel } from './components/AssignmentDetailsPanel';
import {
  AssignedAssetsTable,
  type AssetAssignment,
} from './components/AssignedAssetsTable';
import { ConfirmationModal } from './components/ConfirmationModal';
import {
  AssetChecklistDialog,
  type AssetChecklistSubmitPayload,
} from './components/AssetChecklistDialog';
import {
  filterComputerTypeAssets,
  hasComputerTypeAssets,
} from '@/utils/assetTypeDetection';
import type { AssetChecklistItemData, OffboardingChecklistItemData } from '../../../../../shared/types/dtos/asset.dtos';
import {
  classifyDepartmentScopeByName,
} from '@/lib/assetScope';

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
  description: string;
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
  const queryClient = useQueryClient();
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
  const [searchColumn, setSearchColumn] = useState('all');
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [intangibleSearchTerm, setIntangibleSearchTerm] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistStepIndex, setChecklistStepIndex] = useState(0);
  type PendingChecklistEntry = {
    assetId: string;
    checklistData: AssetChecklistItemData | OffboardingChecklistItemData;
    typeOnboarding: boolean;
    typeOffboarding: boolean;
    receivedBy: string;
    remarks: string;
  };
  const [pendingChecklists, setPendingChecklists] = useState<
    PendingChecklistEntry[]
  >([]);
  const pendingChecklistsRef = useRef<PendingChecklistEntry[]>([]);
  /** When true, closing the checklist dialog must not wipe the queued checklists */
  const checklistCloseAfterSubmitRef = useRef(false);

  const syncPendingChecklists = (next: PendingChecklistEntry[]) => {
    pendingChecklistsRef.current = next;
    setPendingChecklists(next);
  };

  const computerAssetsForChecklist = useMemo(() => {
    const selected = assets.filter(a => selectedAssets.includes(a.id));
    return filterComputerTypeAssets(selected);
  }, [assets, selectedAssets]);
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [intangibleAssetsLoading, setIntangibleAssetsLoading] = useState(false);
  const [groupedAssetIds, setGroupedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [buildersPage, setBuildersPage] = useState(1);
  const buildersPerPage = 9; // 3x3 grid
  const [loadingMoreBuilders, setLoadingMoreBuilders] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('select-assets');
  const [tabLoading, setTabLoading] = useState(false);
  const displayLoading = loading;

  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'global admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const showScopeTabs = isSuperAdmin || isAdmin;
  const effectiveCompanyId = isSuperAdmin || isAdmin
    ? activeCompany?.id || undefined
    : currentUser?.company_id || undefined;
  const [scope, setScope] = useState<'it' | 'admin' | 'hr'>('it');

  const fetchAssets = async () => {
    try {
      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'global admin' || userRole === 'admin') {
        // Global Admin and Admin use active company from CompanyContext
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
      if (showScopeTabs) {
        queryParams.append('scope', scope);
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
        description: asset.description || '',
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
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'global admin' || userRole === 'admin') {
        companyId = activeCompany?.id || undefined;
      } else {
        companyId = currentUser?.company_id || undefined;
      }
      const url = companyId ? `/departments?companyId=${companyId}` : '/departments';
      const response = await api.get(url);
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchLocations = async () => {
    try {
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'global admin' || userRole === 'admin') {
        companyId = activeCompany?.id || undefined;
      } else {
        companyId = currentUser?.company_id || undefined;
      }
      const url = companyId ? `/locations?companyId=${companyId}` : '/locations';
      const response = await api.get(url);
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
      const url = effectiveCompanyId ? `/users?companyId=${effectiveCompanyId}` : '/users';
      const response = await api.get(url);
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };


  const fetchAssignments = async () => {
    try {
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'global admin' || userRole === 'admin') {
        companyId = activeCompany?.id || undefined;
      } else {
        companyId = currentUser?.company_id || undefined;
      }
      const url = companyId ? `/asset-assignments?companyId=${companyId}` : '/asset-assignments';
      const response = await api.get(url);
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
      const builderUrl = showScopeTabs
        ? `/asset-builders?scope=${scope}`
        : '/asset-builders';
      const response = await api.get(builderUrl, {
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
      } else {
        setAssetBuilders([]);
        setGroupedAssetIds(new Set());
      }
    } catch (error) {
      logger.error('Failed to fetch asset builders', error);
      console.error('Failed to fetch asset builders:', error);
      // Keep empty set if API fails
      setGroupedAssetIds(new Set());
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  const fetchIntangibleAssets = async () => {
    try {
      setIntangibleAssetsLoading(true);
      const response = await api.get('/intangible-assets');
      setIntangibleAssets(response || []);
    } catch (error) {
      console.error('Failed to fetch intangible assets:', error);
      setIntangibleAssets([]);
    } finally {
      setIntangibleAssetsLoading(false);
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
        fetchIntangibleAssets(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [activeCompany?.id, scope, currentUser]);

  useEffect(() => {
    if (!showScopeTabs) return;
    setSelectedAssets([]);
  }, [scope, showScopeTabs]);

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
      setChecklistStepIndex(0);
      syncPendingChecklists([]);
      setChecklistDialogOpen(true);
    } else {
      setConfirmModalOpen(true);
    }
  };

  const buildPendingEntry = (
    payload: AssetChecklistSubmitPayload,
    assetId: string
  ): PendingChecklistEntry => ({
    assetId,
    checklistData: payload.checklistData,
    typeOnboarding: payload.typeOnboarding,
    typeOffboarding: payload.typeOffboarding,
    receivedBy: payload.receivedBy,
    remarks: payload.remarks,
  });

  const handleChecklistNext = async (payload: AssetChecklistSubmitPayload) => {
    const currentAsset = computerAssetsForChecklist[checklistStepIndex];
    if (!currentAsset) return;
    syncPendingChecklists([
      ...pendingChecklistsRef.current,
      buildPendingEntry(payload, currentAsset.id),
    ]);
    setChecklistStepIndex(prev => prev + 1);
  };

  const handleChecklistFinalSubmit = async (payload: AssetChecklistSubmitPayload) => {
    const currentAsset = computerAssetsForChecklist[checklistStepIndex];
    if (!currentAsset) return;
    syncPendingChecklists([
      ...pendingChecklistsRef.current,
      buildPendingEntry(payload, currentAsset.id),
    ]);
    checklistCloseAfterSubmitRef.current = true;
    setChecklistDialogOpen(false);
    setChecklistStepIndex(0);
    setConfirmModalOpen(true);
  };

  const handleAssign = async (signAsIssuer: boolean, signITCopy: boolean, tempAccountability: boolean) => {
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
      // Separate tangible and intangible assets
      const tangibleAssets = selectedAssets.filter(id => !intangibleAssets.some(ia => ia.id === id));
      const selectedIntangibleAssets = selectedAssets.filter(id => intangibleAssets.some(ia => ia.id === id));

      let assignmentResponse: any = null;

      // Handle tangible assets assignment
      if (tangibleAssets.length > 0) {
        const assignmentData = {
          assetId: tangibleAssets, // Array of tangible asset IDs
          userId: selectedUser,
          departmentId: selectedDepartment || undefined,
          locationId: selectedLocation || undefined,
          locationRoomId: selectedRoom || undefined,
          assignmentNotes: `Assigned via asset issuance`,
          signAsIssuer: signAsIssuer,
          issuerSignature: signAsIssuer ? currentUser?.digitalSignature || null : null,
          signITCopy: signITCopy,
          itCopySignature: signITCopy ? currentUser?.digitalSignature || null : null,
          tempAccountability: tempAccountability || undefined,
        };

        assignmentResponse = await api.post('/asset-assignments', assignmentData);
      }

      // Handle intangible assets assignment
      if (selectedIntangibleAssets.length > 0 && assignmentResponse) {
        // Use the assignment ID from the tangible assets assignment
        const assignmentId = assignmentResponse.assignments?.[0]?.assignmentID;

        const selectedIntangibleAssetObjects = selectedIntangibleAssets
          .map(id => intangibleAssets.find(ia => ia.id === id))
          .filter((ia): ia is any => ia != null);

        const scopeGroups: Record<string, any[]> = {};
        for (const ia of selectedIntangibleAssetObjects) {
          const deptCandidate = ia.type_department?.name || ia.type || '';
          const scopeType = classifyDepartmentScopeByName(deptCandidate);
          const group = scopeType === 'Admin' ? 'Admin scope' : 'IT scope';
          if (!scopeGroups[group]) {
            scopeGroups[group] = [];
          }
          scopeGroups[group].push(ia);
        }

        for (const [scope, scopeAssets] of Object.entries(scopeGroups)) {
          try {
            const deptKeyword = scope === 'Admin scope' ? 'admin' : 'it';
            const matchDept = departments.find(d =>
              d.name?.toLowerCase().includes(deptKeyword)
            );

            const batchResult = await api.post('/intangible-assets/batch-assign', {
              assetIds: scopeAssets.map(ia => ia.id),
              assignedTo: selectedUser,
              assignmentId,
              departmentId: matchDept?.departmentID || undefined,
              locationId: selectedLocation || undefined,
              signAsIssuer,
              issuerSignature: signAsIssuer ? currentUser?.digitalSignature || null : null,
              signITCopy,
              itCopySignature: signITCopy ? currentUser?.digitalSignature || null : null,
              tempAccountability: tempAccountability || undefined,
            });
            if (batchResult?.formError) {
              console.error(`Form error for ${scope}:`, batchResult.formError);
              toast.error(`Accountability form error: ${batchResult.formError}`);
            }
          } catch (error) {
            console.error(`Failed to assign ${scope} intangible assets:`, error);
            toast.error(`Failed to assign ${scope} intangible assets`);
          }
        }
      } else if (selectedIntangibleAssets.length > 0 && !assignmentResponse) {
        // If only intangible assets are selected, group by scope and batch assign
        const assignmentId = generateUUID();

        const selectedIntangibleAssetObjects = selectedIntangibleAssets
          .map(id => intangibleAssets.find(ia => ia.id === id))
          .filter((ia): ia is any => ia != null);

        // Group by scope type
        const scopeGroups: Record<string, any[]> = {};
        for (const ia of selectedIntangibleAssetObjects) {
          const deptCandidate = ia.type_department?.name || ia.type || '';
          const scopeType = classifyDepartmentScopeByName(deptCandidate);
          const group = scopeType === 'Admin' ? 'Admin scope' : 'IT scope';
          if (!scopeGroups[group]) {
            scopeGroups[group] = [];
          }
          scopeGroups[group].push(ia);
        }

        // Send one batch request per scope (server creates accountability form with existing tangible assets)
        for (const [scope, scopeAssets] of Object.entries(scopeGroups)) {
          try {
            const deptKeyword = scope === 'Admin scope' ? 'admin' : 'it';
            const matchDept = departments.find(d =>
              d.name?.toLowerCase().includes(deptKeyword)
            );

            const batchResult = await api.post('/intangible-assets/batch-assign', {
              assetIds: scopeAssets.map(ia => ia.id),
              assignedTo: selectedUser,
              assignmentId,
              departmentId: matchDept?.departmentID || undefined,
              locationId: selectedLocation || undefined,
              signAsIssuer,
              issuerSignature: signAsIssuer ? currentUser?.digitalSignature || null : null,
              signITCopy,
              itCopySignature: signITCopy ? currentUser?.digitalSignature || null : null,
              tempAccountability: tempAccountability || undefined,
            });
            if (batchResult?.formError) {
              console.error(`Form error for ${scope}:`, batchResult.formError);
              toast.error(`Accountability form error: ${batchResult.formError}`);
            }
          } catch (error) {
            console.error(`Failed to batch assign ${scope} intangible assets:`, error);
            toast.error(`Failed to assign ${scope} intangible assets`);
          }
        }
      }

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

      // Save one checklist per computer asset assignment (use ref for latest queue)
      const checklistQueue = pendingChecklistsRef.current;
      if (
        checklistQueue.length > 0 &&
        assignmentResponse?.assignments?.length > 0
      ) {
        const assigneeUser = users.find(u => u.userID === selectedUser);
        const assigneeName = assigneeUser
          ? `${assigneeUser.first_name} ${assigneeUser.last_name}`
          : '';
        const department = departments.find(
          d => d.departmentID === selectedDepartment
        );

        let savedCount = 0;
        for (const pending of checklistQueue) {
          const checklistAssignment = assignmentResponse.assignments.find(
            (assignment: { assignmentID: string; asset_id?: string; asset_code?: string }) =>
              assignment.asset_id === pending.assetId ||
              assignment.asset_code === pending.assetId
          );
          const assignmentId = checklistAssignment?.assignmentID;
          if (!assignmentId) {
            console.error(
              'No assignment found for checklist asset:',
              pending.assetId
            );
            toast.error('Failed to save asset checklist: assignment not found');
            continue;
          }
          try {
            await api.post('/asset-assignments/checklist', {
              assignmentId,
              employeeId: selectedUser,
              employeeName: assigneeName,
              employeeDesignation: assigneeUser?.position || null,
              employeeDepartment: department?.name || null,
              employeeCompany: assigneeUser?.company?.name || null,
              typeOnboarding: pending.typeOnboarding,
              typeOffboarding: pending.typeOffboarding,
              receivedBy: pending.receivedBy,
              checklistData: pending.checklistData,
              remarks: pending.remarks,
            });
            savedCount += 1;
          } catch (error) {
            console.error('Failed to save checklist:', error);
            toast.error('Failed to save asset checklist');
          }
        }
        if (savedCount > 0 && savedCount < checklistQueue.length) {
          toast.warning(
            `Saved ${savedCount} of ${checklistQueue.length} asset checklists`
          );
        } else if (savedCount === 0 && checklistQueue.length > 0) {
          toast.error('Asset checklists were not saved');
        }
        syncPendingChecklists([]);
        setChecklistStepIndex(0);
      }

      // The server automatically creates one accountability form for all assets
      // No need to create separate accountability forms here

      const tangibleCount = tangibleAssets.length;
      const intangibleCount = selectedIntangibleAssets.length;
      const message = tangibleCount > 0 && intangibleCount > 0
        ? `Assigned ${tangibleCount} tangible asset(s) and ${intangibleCount} intangible asset(s) to ${assigneeDisplayName || 'user'}`
        : tangibleCount > 0
          ? `Assigned ${tangibleCount} tangible asset(s) to ${assigneeDisplayName || 'user'}`
          : `Assigned ${intangibleCount} intangible asset(s) to ${assigneeDisplayName || 'user'}`;

      toast.success(message);

      // Invalidate assets cache to refetch in other components
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      // Reset form
      setSelectedAssets([]);
      setSelectedBuilding('');
      setSelectedDepartment('');
      setSelectedLocation('');
      setSelectedRoom('');
      setSelectedUser('');

      // Refresh assets, assignments, asset builders, and intangible assets
      await fetchAssets();
      await fetchAssignments();
      await fetchAssetBuilders();
      await fetchIntangibleAssets();
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

    return assets
      .filter(
        asset => asset.status === 'Available'
      )
      .filter(asset => {
        if (!searchLower) return true;
        if (searchColumn === 'all') {
          return [
            asset.id,
            asset.name,
            asset.status,
            asset.category,
            asset.type,
            asset.serialNo,
            asset.assignedTo,
            asset.department,
            asset.location,
            asset.description,
            asset.specifications
              ?.map(s => s.assetName || s.specDescription)
              .join(' '),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(searchLower);
        }
        const val = (asset as any)[searchColumn];
        return val != null && String(val).toLowerCase().includes(searchLower);
      })
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
      asset => asset.status === 'Available'
    );
  }, [filteredAssets]);

  const scopedIntangibleAssets = useMemo(() => {
    if (!showScopeTabs) return intangibleAssets;
    // Classify by the department linked to the asset's type (mirrors tangible
    // asset routing by category department). 'Other' falls back to 'it' as the
    // most permissive scope so unclassified assets remain visible to IT.
    const targetScope = scope === 'hr' ? 'IT' : scope === 'admin' ? 'Admin' : 'IT';
    return intangibleAssets.filter((asset: any) => {
      const deptCandidate =
        asset.type_department?.name ||
        asset.type ||
        '';
      const scopeType = classifyDepartmentScopeByName(deptCandidate);
      if (scopeType === 'IT') return targetScope === 'IT';
      if (scopeType === 'Admin') return targetScope === 'Admin';
      // 'Other' — fall back to IT scope tab
      return targetScope === 'IT';
    });
  }, [intangibleAssets, showScopeTabs, scope]);

  const filteredIntangibleAssets = useMemo(() => {
    if (!intangibleSearchTerm.trim()) return scopedIntangibleAssets;
    const q = intangibleSearchTerm.toLowerCase();
    return scopedIntangibleAssets.filter((asset: any) =>
      (asset.name?.toLowerCase().includes(q)) ||
      (asset.description?.toLowerCase().includes(q)) ||
      (asset.remarks?.toLowerCase().includes(q)) ||
      (asset.type?.toLowerCase().includes(q)) ||
      (asset.code?.toLowerCase().includes(q))
    );
  }, [scopedIntangibleAssets, intangibleSearchTerm]);

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

  // Infinite scroll for asset builders
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreBuilders && !loadingMoreBuilders && !buildersLoading) {
          setLoadingMoreBuilders(true);
          setBuildersPage(prev => prev + 1);
          setTimeout(() => setLoadingMoreBuilders(false), 500);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMoreBuilders, loadingMoreBuilders, buildersLoading]);

  // Reset builders page when search term changes
  useEffect(() => {
    setBuildersPage(1);
  }, [builderSearchTerm]);

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
      (!effectiveCompanyId || user.company?.id === effectiveCompanyId)
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
            {/* Asset Selection / Asset Built Tabs skeleton */}
            <div className="xl:col-span-2">
              <Tabs defaultValue="select-assets" className="w-full">
                <div className="grid grid-cols-2 gap-2 mb-4 rounded-xl border border-slate-200 bg-slate-100/90 p-1">
                  <Shimmer className="h-10 w-full rounded-lg bg-red-600" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                </div>
                <div className="mt-4">
                  <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-[592px] flex flex-col">
                    <CardHeader className="pb-4 flex-shrink-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <Shimmer className="h-10 w-10 rounded-lg bg-red-100/80" />
                        <Shimmer className="h-6 w-32 rounded" />
                        <Shimmer className="h-6 w-16 rounded-full ml-auto" />
                      </div>
                      <div className="relative mt-4">
                        <Shimmer className="h-10 w-full rounded-lg" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex gap-3 p-4 border-2 rounded-xl">
                            <Shimmer className="h-5 w-5 rounded flex-shrink-0 mt-1" />
                            <div className="flex-1 space-y-2">
                              <Shimmer className="h-5 w-3/4 rounded" />
                              <div className="flex gap-2">
                                <Shimmer className="h-4 w-20 rounded" />
                                <Shimmer className="h-4 w-16 rounded" />
                                <Shimmer className="h-4 w-24 rounded" />
                              </div>
                              <div className="flex gap-2">
                                <Shimmer className="h-6 w-16 rounded-full" />
                                <Shimmer className="h-6 w-20 rounded-full" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Tabs>
            </div>
            {/* Assignment Details Panel skeleton */}
            <div className="xl:col-span-1">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3">
                    <Shimmer className="h-10 w-10 rounded-lg bg-green-100/80" />
                    <Shimmer className="h-6 w-40 rounded" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-10 w-full rounded-lg" />
                  <Shimmer className="h-24 w-full rounded-lg" />
                  <Shimmer className="h-10 w-32 rounded-lg" />
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Currently Assigned Assets table skeleton */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Shimmer className="h-10 w-10 rounded-lg bg-blue-100/80" />
                <Shimmer className="h-6 w-48 rounded" />
                <Shimmer className="h-6 w-20 rounded-full sm:ml-auto" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-32 rounded" />
                    <Shimmer className="h-3 w-24 rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-28 rounded" />
                    <Shimmer className="h-3 w-20 rounded" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-28 rounded" />
                    <Shimmer className="h-3 w-20 rounded" />
                  </div>
                  <div className="w-24">
                    <Shimmer className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
          {showScopeTabs && (
            <Tabs
              value={scope}
              onValueChange={v => setScope(v as 'it' | 'admin' | 'hr')}
              className="w-full sm:w-auto"
            >
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-3 max-w-full sm:max-w-[420px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>
                  IT Asset
                </TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>
                  Admin Asset
                </TabsTrigger>
                <TabsTrigger value="hr" className={segmentTabsTriggerClassName}>
                  HR Asset
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
          {/* Asset Selection / Asset Built Tabs */}
          <div className="xl:col-span-2">
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setTabLoading(true); setTimeout(() => setTabLoading(false), 300); }} className="w-full">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-3'}>
                <TabsTrigger
                  value="select-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Package className="h-4 w-4" />
                  Select Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {availableAssets.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="asset-built"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Boxes className="h-4 w-4" />
                  Asset Built
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {availableBuilders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="intangible-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Layers className="h-4 w-4" />
                  Intangible Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {scopedIntangibleAssets.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select-assets" className="mt-4">
<AssetSelectionPanel
  assets={availableAssets}
  selectedAssets={selectedAssets}
  searchTerm={searchTerm}
  searchColumn={searchColumn}
  loading={loading || buildersLoading || tabLoading}
  hasPermission={hasPermission}
  onSearchChange={setSearchTerm}
  onSearchColumnChange={setSearchColumn}
  onAssetSelection={handleAssetSelection}
  onClearAll={() => setSelectedAssets([])}
  onSelectAll={() => {
    const availableIds = availableAssets.map(a => a.id);
    setSelectedAssets(prev => [...new Set([...prev, ...availableIds])]);
  }}
/>
              </TabsContent>

              <TabsContent value="asset-built" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-[592px] flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <Boxes className="h-5 w-5 text-red-600" />
                      </div>
                      <span>Asset Built</span>
                      <Badge variant="secondary" className="w-fit">
                        {availableBuilders.length} available
                      </Badge>
                      {paginatedBuilders.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allBuilderAssetIds = paginatedBuilders
                              .flatMap((builder: any) =>
                                (builder.items || [])
                                  .map((item: any) => item.asset_code)
                                  .filter((id: string) =>
                                    allSelectableAssets.some(asset => asset.id === id)
                                  )
                              );
                            const allSelected = allBuilderAssetIds.length > 0 &&
                              allBuilderAssetIds.every((id: string) => selectedAssets.includes(id));
                            if (allSelected) {
                              setSelectedAssets(prev =>
                                prev.filter(id => !allBuilderAssetIds.includes(id))
                              );
                            } else {
                              setSelectedAssets(prev => [...new Set([...prev, ...allBuilderAssetIds])]);
                            }
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                        >
                          {paginatedBuilders
                            .flatMap((builder: any) =>
                              (builder.items || [])
                                .map((item: any) => item.asset_code)
                                .filter((id: string) =>
                                  allSelectableAssets.some(asset => asset.id === id)
                                )
                            ).length > 0 &&
                          (paginatedBuilders
                            .flatMap((builder: any) =>
                              (builder.items || [])
                                .map((item: any) => item.asset_code)
                                .filter((id: string) =>
                                  allSelectableAssets.some(asset => asset.id === id)
                                )
                            )).every((id: string) => selectedAssets.includes(id))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      )}
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
                  <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                    {buildersLoading || tabLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <BuilderCardSkeleton key={index} />
                        ))}
                      </div>
                    ) : paginatedBuilders.length > 0 ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                                            <div className="space-y-1 max-h-[8.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                              {builder.items.map(
                                                (item: any, index: number) => (
                                                  <div
                                                    key={index}
                                                    className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                                                      item.is_parent ? 'bg-amber-50 border border-amber-200' : 'bg-muted/30'
                                                    }`}
                                                  >
                                                    {item.is_parent && (
                                                      <Crown className="h-3 w-3 text-amber-600 shrink-0" />
                                                    )}
                                                    <span
                                                      className={`font-mono font-medium shrink-0 ${item.is_parent ? 'text-amber-900' : 'text-gray-900'}`}
                                                      title="Asset code"
                                                    >
                                                      {item.asset_code}
                                                    </span>
                                                    <span
                                                      className={`truncate flex-1 min-w-0 ${item.is_parent ? 'text-amber-700' : 'text-gray-600'}`}
                                                      title={item.asset_name}
                                                    >
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
                        {/* Sentinel element for infinite scroll */}
                        {hasMoreBuilders && (
                          <div ref={sentinelRef} className="flex-shrink-0 h-1" />
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

              <TabsContent value="intangible-assets" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-[592px] flex flex-col">
                  <CardHeader className="pb-4 flex-shrink-0 space-y-3">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <Layers className="h-5 w-5 text-red-600" />
                      </div>
                      <span>Intangible Assets</span>
                      <Badge variant="secondary" className="w-fit">
                        {filteredIntangibleAssets.length} assets
                      </Badge>
                      {scopedIntangibleAssets.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allIntangibleIds = scopedIntangibleAssets.map((a: any) => a.id);
                            const allSelected = allIntangibleIds.every(id => selectedAssets.includes(id));
                            if (allSelected) {
                              setSelectedAssets(prev => prev.filter(id => !allIntangibleIds.includes(id)));
                            } else {
                              setSelectedAssets(prev => [...new Set([...prev, ...allIntangibleIds])]);
                            }
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                        >
                          {scopedIntangibleAssets.length > 0 &&
                          scopedIntangibleAssets.every((a: any) => selectedAssets.includes(a.id))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      )}
                    </CardTitle>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search intangible assets..."
                        value={intangibleSearchTerm}
                        onChange={(e) => setIntangibleSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
                    {intangibleAssetsLoading || tabLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-4">
                          <Layers className="h-10 w-10 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Loading intangible assets...
                        </h3>
                      </div>
                    ) : filteredIntangibleAssets.length > 0 ? (
                      <div className="space-y-3 overflow-y-auto flex-1 pr-1 sm:-mr-6 sm:pr-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {filteredIntangibleAssets.map((asset: any) => {
                          const isSelected = selectedAssets.includes(asset.id);
                          const assigneeCount = asset.assignees?.length ?? (asset.assigned_to ? 1 : 0);
                          const typeColor = asset.type === 'IT scope' 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : 'bg-orange-100 text-orange-800 border-orange-200';
                          return (
                            <div
                              key={asset.id}
                              className={`group relative p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'border-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-sm'
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAssets(prev => prev.filter(id => id !== asset.id));
                                } else {
                                  setSelectedAssets(prev => [...prev, asset.id]);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3 sm:gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  <Checkbox
                                    id={asset.id}
                                    checked={isSelected}
                                    onCheckedChange={(checked: boolean | string) => {
                                      if (checked) {
                                        setSelectedAssets(prev => [...prev, asset.id]);
                                      } else {
                                        setSelectedAssets(prev => prev.filter(id => id !== asset.id));
                                      }
                                    }}
                                    className="pointer-events-none data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                                        {asset.name}
                                      </h3>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-semibold ${typeColor} px-2.5 py-1`}
                                      >
                                        {asset.type}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-sm">
                                    {asset.description && (
                                      <p className="text-gray-600 line-clamp-1 mb-1">
                                        {asset.description}
                                      </p>
                                    )}
                                    {asset.remarks && (
                                      <p className="text-gray-500 italic truncate">
                                        {asset.remarks}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {intangibleSearchTerm ? 'No Results Found' : 'No Intangible Assets'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {intangibleSearchTerm
                            ? 'No intangible assets match your search. Try adjusting your search terms.'
                            : 'No intangible assets found for this scope.'}
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
          onOpenChange={open => {
            setChecklistDialogOpen(open);
            if (!open) {
              if (checklistCloseAfterSubmitRef.current) {
                checklistCloseAfterSubmitRef.current = false;
              } else {
                setChecklistStepIndex(0);
                syncPendingChecklists([]);
              }
            }
          }}
          onCancel={() => {
            checklistCloseAfterSubmitRef.current = false;
            setChecklistStepIndex(0);
            syncPendingChecklists([]);
          }}
          selectedAssets={selectedAssets}
          assets={assets}
          computerAssets={computerAssetsForChecklist}
          currentIndex={checklistStepIndex}
          selectedUser={selectedUser}
          users={users}
          departments={departments}
          currentUserPosition={currentUser?.position || ''}
          onNext={handleChecklistNext}
          onFinalSubmit={handleChecklistFinalSubmit}
        />

      </main>
    </div>
  );
}

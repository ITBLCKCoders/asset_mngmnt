'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  ImagePlus,
  ImageIcon,
  Crown,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { ASSET_SEARCH_COLUMNS_BASIC } from '@/utils/assetSearchColumns';
import { Button } from '@/components/ui/button';
import { useCompanyContext } from '@/context/CompanyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Location } from '@/types/assets';
import { Shimmer } from '@/components/ui/shimmer';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  generateAssetReturnPDF,
  downloadPDF,
  type AssetReturnData as ReturnPdfData,
} from '@/lib/pdfGenerator';
import { FileDown } from 'lucide-react';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { AssetChecklistDialog, type AssetChecklistSubmitPayload } from '@/pages/assets/asset-issuance/components/AssetChecklistDialog';
import { hasComputerTypeAssets, filterComputerTypeAssets } from '@/utils/assetTypeDetection';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import type { OffboardingChecklistItemData } from '../../../../shared/types/dtos/asset.dtos';

interface AssetAssignment {
  assignmentID: string;
  asset: {
    id: string;
    code: string;
    name: string;
    category_id: string;
    type_id: string;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employeeNumber?: string;
    position?: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
    floor_unit: string;
    building: string;
    room_name?: string;
  } | null;
  assigned_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  assignment_notes: string | null;
  status: string;
  assigned_by: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface AssetReturnData {
  assetId: string;
  condition: string;
  notes: string;
  conditionImages?: string[];
}

interface ReturnHistoryRow {
  id: string;
  assetName: string;
  assetCode: string;
  formNumber: string;
  returnedBy: string;
  fromDepartment: string;
  toDepartment: string;
  processedBy: string;
  condition: string;
  returnLocation: string;
  returnDate: string;
  notes: string;
  conditionImages?: string[];
  status?: string;
  viaAssetTransfer?: boolean;
}

export default function AssetsReturn() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [inFlightReturnAssignmentIds, setInFlightReturnAssignmentIds] = useState<
    string[]
  >([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [returning, setReturning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [assetReturnData, setAssetReturnData] = useState<AssetReturnData[]>([]);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [verificationTag, setVerificationTag] = useState(false);
  const [verificationCondition, setVerificationCondition] = useState(false);
  const [verificationConfirmSign, setVerificationConfirmSign] = useState(false);
  const [returnTypeReturned, setReturnTypeReturned] = useState(false);
  const [returnTypeOffboarding, setReturnTypeOffboarding] = useState(false);
  const [assignAllToMe, setAssignAllToMe] = useState(false);
  const [returnHistory, setReturnHistory] = useState<any[]>([]);
  const [returnHistoryLoading, setReturnHistoryLoading] = useState(true);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedImagesForModal, setSelectedImagesForModal] = useState<
    string[]
  >([]);
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [expandedBuilderForSelect, setExpandedBuilderForSelect] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState('select-assets');
  const [tabLoading, setTabLoading] = useState(false);
  const [sharedReturnDepartmentId, setSharedReturnDepartmentId] =
    useState<string>('');
  const [sharedReturnLocationId, setSharedReturnLocationId] =
    useState<string>('');
  const [sharedReturnAreaId, setSharedReturnAreaId] = useState<string>('');
  const [ownerAbsent, setOwnerAbsent] = useState(false);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [selectedIntangibleAssetIds, setSelectedIntangibleAssetIds] = useState<string[]>([]);
  const [smsOtpDialogOpen, setSmsOtpDialogOpen] = useState(false);
  const pendingReturnActionRef = useRef<(() => Promise<void>) | null>(null);

  // Checklist dialog state for return flow
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistStepIndex, setChecklistStepIndex] = useState(0);
  const [checklistComputerAssets, setChecklistComputerAssets] = useState<any[]>([]);
  const pendingReturnChecklistsRef = useRef<{
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    employeeDesignation: string | null;
    employeeDepartment: string | null;
    employeeCompany: string | null;
    checklistData: OffboardingChecklistItemData;
    typeOnboarding: boolean;
    typeOffboarding: boolean;
    receivedBy: string;
    remarks: string;
  }[]>([]);

  const isSuperAdmin = currentUser?.role?.name?.toLowerCase() === 'global admin';
  const isAdmin = currentUser?.role?.name?.toLowerCase() === 'admin';
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isAdmin || isOverallManager;
  const effectiveCompanyId = isSuperAdmin || isAdmin
    ? activeCompany?.id || undefined
    : currentUser?.company_id || undefined;
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const displayLoading = loading;

  const flattenedReturnHistory = useMemo((): ReturnHistoryRow[] => {
    return returnHistory.map((returnRecord: any) => {
      const assignment = returnRecord.assignment;
      const asset = assignment?.asset;
      const user = assignment?.user;
      let returnLocationName = 'Unknown';
      let returnRoomName = '';
      if (returnRecord.return_location_id) {
        const loc = locations.find(
          (l: Location) => l.locationID === returnRecord.return_location_id
        );
        returnLocationName = loc ? loc.name : returnRecord.return_location_id;
      } else if (assignment?.location) {
        returnLocationName = assignment.location.name;
      }
      if (
        returnRecord.return_location_room_id &&
        assignment?.location?.room_areas
      ) {
        const room = assignment.location.room_areas.find(
          (r: any) => r?.roomID === returnRecord.return_location_room_id
        );
        returnRoomName = room ? room.room_name : '';
      } else if (assignment?.location?.room_name) {
        returnRoomName = assignment.location.room_name;
      }
      const returnLocation = returnRoomName
        ? `${returnLocationName} - ${returnRoomName}`
        : returnLocationName;
      let conditionImages: string[] = [];
      const raw = returnRecord.condition_images;
      if (Array.isArray(raw)) {
        conditionImages = raw.filter((x): x is string => typeof x === 'string');
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          conditionImages = Array.isArray(parsed)
            ? parsed.filter((x: unknown): x is string => typeof x === 'string')
            : [];
        } catch {
          conditionImages = [];
        }
      }
      const notes = returnRecord.return_notes || 'No notes';
      const withTransferNote =
        returnRecord.viaAssetTransfer && notes
          ? `Via asset transfer. ${notes}`
          : returnRecord.viaAssetTransfer
            ? 'Via asset transfer.'
            : notes;
      const fromDepartment = assignment?.department?.name ?? 'Unknown';
      let toDepartmentName = fromDepartment;
      if (returnRecord.return_department_id) {
        const toDept = departments.find(
          (d: any) => d.departmentID === returnRecord.return_department_id
        );
        toDepartmentName = toDept ? toDept.name : returnRecord.return_department_id;
      }

      return {
        id:
          returnRecord.return_id ??
          `synthetic-${returnRecord.form_id}-${returnRecord.assignment_id}`,
        assetName: asset?.name || 'Unknown Asset',
        assetCode: asset?.code || 'No Code',
        formNumber: returnRecord.form_number ?? 'N/A',
        returnedBy:
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : 'Unknown User',
        fromDepartment,
        toDepartment: toDepartmentName,
        processedBy: returnRecord.processed_by || 'Unknown',
        condition: returnRecord.return_condition || 'Not Specified',
        returnLocation,
        returnDate: returnRecord.created_at
          ? new Date(returnRecord.created_at).toLocaleDateString()
          : 'N/A',
        notes: withTransferNote,
        conditionImages:
          conditionImages.length > 0 ? conditionImages : undefined,
        status: returnRecord.status ?? 'Processed',
        viaAssetTransfer: returnRecord.viaAssetTransfer ?? false,
      };
    });
  }, [returnHistory, locations]);

  const returnHistoryColumns: ColumnDef<ReturnHistoryRow>[] = useMemo(
    () => [
      {
        id: 'assetName',
        header: 'Asset',
        accessorKey: 'assetName',
        size: 180,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.original.assetName}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.assetCode}
            </div>
          </div>
        ),
      },
      {
        id: 'formNumber',
        header: 'Return Form #',
        accessorKey: 'formNumber',
        size: 140,
      },
      {
        id: 'returnedBy',
        header: 'Returned By',
        accessorKey: 'returnedBy',
        size: 160,
      },
      {
        id: 'fromDepartment',
        header: 'From Department',
        accessorKey: 'fromDepartment',
        size: 150,
      },
      {
        id: 'toDepartment',
        header: 'To Department',
        accessorKey: 'toDepartment',
        size: 150,
      },
      {
        id: 'processedBy',
        header: 'Processed By',
        accessorKey: 'processedBy',
        size: 140,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        size: 180,
        cell: ({ row }) => {
          const status = row.original.status ?? '';
          const isDeclined = status === 'Declined by dept head';
          const isApproved = status === 'Approved by dept head';
          const isProcessed = status === 'Processed';
          const isPending = status === 'Pending';
          const badgeClass = isDeclined
            ? 'bg-red-100 text-red-800'
            : isApproved || isProcessed
              ? 'bg-green-100 text-green-800'
              : isPending
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-800';
          return (
            <Badge variant="secondary" className={badgeClass}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorKey: 'condition',
        size: 120,
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            {row.original.condition || 'Not Specified'}
          </Badge>
        ),
      },
      {
        id: 'returnLocation',
        header: 'Return Location',
        accessorKey: 'returnLocation',
        size: 180,
      },
      {
        id: 'returnDate',
        header: 'Return Date',
        accessorKey: 'returnDate',
        size: 120,
      },
      {
        id: 'photos',
        header: 'Photos',
        accessorKey: 'conditionImages',
        size: 100,
        cell: ({ row }) => {
          const imgs = row.original.conditionImages ?? [];
          if (imgs.length === 0)
            return <span className="text-slate-400">—</span>;
          return (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setSelectedImagesForModal(imgs);
                setShowImagesModal(true);
              }}
            >
              <ImageIcon className="h-4 w-4" />
              {imgs.length}
            </Button>
          );
        },
      },
      { id: 'notes', header: 'Notes', accessorKey: 'notes', size: 200 },
    ],
    []
  );

  const fetchDepartments = async () => {
    try {
      const url = effectiveCompanyId ? `/departments?companyId=${effectiveCompanyId}` : '/departments';
      const response = await api.get(url);
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
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


  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.get('/categories');
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const url = effectiveCompanyId ? `/locations?companyId=${effectiveCompanyId}` : '/locations';
      const response = await api.get(url);
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const fetchAssignments = async () => {
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
      queryParams.append('includeInFlightReturns', '1');
      if (companyId) {
        queryParams.append('companyId', companyId);
      }
      if (showScopeTabs) {
        queryParams.append('scope', scope);
      }
      const response = await api.get(`/asset-assignments/filtered?${queryParams.toString()}`);
      setAssignments(response.assignments || []);
      setInFlightReturnAssignmentIds(response.inFlightReturnAssignmentIds || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      const builderUrl = showScopeTabs
        ? `/asset-builders?scope=${scope}`
        : '/asset-builders';
      const response = await api.get(builderUrl, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (response?.builders) {
        setAssetBuilders(response.builders);
      } else {
        setAssetBuilders([]);
      }
    } catch (error) {
      console.error('Failed to fetch asset builders:', error);
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  const fetchIntangibleAssets = async () => {
    try {
      const response = await api.get('/intangible-assets');
      setIntangibleAssets(response || []);
    } catch (error) {
      console.error('Failed to fetch intangible assets:', error);
      setIntangibleAssets([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch assignments and other data
      await Promise.all([
        fetchDepartments(),
        fetchUsers(),
        fetchAssignments(),
        fetchCategories(),
        fetchLocations(),
        fetchAssetBuilders(),
        fetchIntangibleAssets(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [activeCompany?.id, scope, currentUser]);

  useEffect(() => {
    if (!showScopeTabs) return;
    setSelectedAssignments([]);
    setExpandedBuilderForSelect(null);
  }, [scope, showScopeTabs]);

  // Fetch return history
  const fetchReturnHistory = async () => {
    try {
      setReturnHistoryLoading(true);
      const response = await api.get('/asset-returns');
      setReturnHistory(response.assetReturns || []);
    } catch (error) {
      console.error('Failed to fetch return history:', error);
      setReturnHistory([]);
    } finally {
      setReturnHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnHistory();
  }, []);

  const handleBuilderReturnWhole = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry) return;
    const ids = entry.assignments
      .map((a: AssetAssignment) => a.assignmentID)
      .filter(id => !isInFlightReturn(id));
    setSelectedAssignments(prev => [...new Set([...prev, ...ids])]);
  };

  const handleBuilderAssetToggle = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (isInFlightReturn(assignmentId)) return;
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleBuilderDeselectAll = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry) return;
    const ids = new Set(
      entry.assignments.map((a: AssetAssignment) => a.assignmentID)
    );
    setSelectedAssignments(prev => prev.filter(id => !ids.has(id)));
  };

  const isBuilderFullySelected = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry || entry.assignments.length === 0) return false;
    const selectableIds = entry.assignments
      .map((a: AssetAssignment) => a.assignmentID)
      .filter(id => !isInFlightReturn(id));
    if (selectableIds.length === 0) return false;
    return selectableIds.every(id => selectedAssignments.includes(id));
  };

  const isInFlightReturn = (assignmentId: string) =>
    inFlightReturnAssignmentIds.includes(assignmentId);

  const handleAssignmentSelection = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (isInFlightReturn(assignmentId)) return;
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleReturnClick = () => {
    if (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) {
      toast.error('Please select at least one asset or intangible asset to return');
      return;
    }

    // Get selected assignments data
    const selectedAssignmentData = selectedAssignments
      .map(assignmentId => {
        const assignment = assignments.find(
          a => a.assignmentID === assignmentId
        );
        return assignment;
      })
      .filter(Boolean);

    // Initialize return data for each asset (condition, notes, images only; return location is shared)
    const initialReturnData = selectedAssignmentData.map(assignment => ({
      assetId: assignment?.asset.id || '',
      condition: '',
      notes: '',
      conditionImages: [] as string[],
    }));

    // Initialize expanded state for all assets
    const initialExpandedAssets = new Set(
      selectedAssignmentData.map(a => a?.asset.id || '')
    );
    setExpandedAssets(initialExpandedAssets);

    setAssetReturnData(initialReturnData);
    setShowConditionModal(true);
  };

  const toggleAssetExpansion = (assetId: string) => {
    setExpandedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleConditionChange = (assetId: string, condition: string) => {
    setAssetReturnData(prev =>
      prev.map(item =>
        item.assetId === assetId ? { ...item, condition } : item
      )
    );
  };

  const handleNotesChange = (assetId: string, notes: string) => {
    setAssetReturnData(prev =>
      prev.map(item => (item.assetId === assetId ? { ...item, notes } : item))
    );
  };

  const MAX_CONDITION_IMAGES = 5;
  const VALID_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  const MAX_IMAGE_SIZE_MB = 5;

  const handleImageAdd = async (assetId: string, file: File) => {
    const returnData = assetReturnData.find(r => r.assetId === assetId);
    const currentCount = returnData?.conditionImages?.length ?? 0;
    if (currentCount >= MAX_CONDITION_IMAGES) {
      toast.error(`Maximum ${MAX_CONDITION_IMAGES} photos per asset`);
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ url: string }>(
        '/asset-returns/upload-condition-photo',
        formData
      );
      const url = res?.url;
      if (url) {
        setAssetReturnData(prev =>
          prev.map(item =>
            item.assetId === assetId
              ? {
                  ...item,
                  conditionImages: [...(item.conditionImages ?? []), url],
                }
              : item
          )
        );
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      toast.error(err?.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleImageRemove = (assetId: string, index: number) => {
    setAssetReturnData(prev =>
      prev.map(item =>
        item.assetId === assetId
          ? {
              ...item,
              conditionImages: (item.conditionImages ?? []).filter(
                (_, i) => i !== index
              ),
            }
          : item
      )
    );
  };

  const validateReturnForm = (): boolean => {
    if (!returnTypeReturned && !returnTypeOffboarding) {
      toast.error(
        'Please select at least one Return Type (Returned or Offboarding)'
      );
      return false;
    }
    if (assetReturnData.some(item => !item.condition)) {
      toast.error('Please select a condition for all selected assets');
      return false;
    }
    if (!sharedReturnDepartmentId || !sharedReturnLocationId) {
      toast.error('Please select a return location (department and location)');
      return false;
    }
    const selectedLocation = locations.find(
      loc => loc.locationID === sharedReturnLocationId
    );
    const hasRooms = selectedLocation?.room_areas?.some(r => r && r.room_name);
    if (hasRooms && !sharedReturnAreaId) {
      toast.error('Please select a room/area for the return location');
      return false;
    }
    if (ownerAbsent) {
      const details = selectedAssignments
        .map(assignmentId =>
          assignments.find(a => a.assignmentID === assignmentId)
        )
        .filter(Boolean) as AssetAssignment[];
      const ownerIds = new Set(details.map(a => a.user.id).filter(Boolean));
      if (ownerIds.size > 1) {
        toast.error(
          'When the asset owner is absent, select assets that belong to the same owner only.'
        );
        return false;
      }
    }
    return true;
  };

  const buildReturnPdfPayload = (
    formNumber: string | null | undefined
  ): ReturnPdfData | null => {
    const details = selectedAssignments
      .map(assignmentId =>
        assignments.find(a => a.assignmentID === assignmentId)
      )
      .filter(Boolean) as AssetAssignment[];
    const first = details[0];
    if (!first) return null;
    const returnLoc = locations.find(
      l => l.locationID === sharedReturnLocationId
    );
    const room = returnLoc?.room_areas?.find(
      r => r.roomID === sharedReturnAreaId
    );
    const locDisplayName =
      returnLoc && room?.room_name
        ? `${returnLoc.name} — ${room.room_name}`
        : returnLoc?.name ?? '';
    const returnTypeParts: string[] = [];
    if (returnTypeReturned) returnTypeParts.push('Returned');
    if (returnTypeOffboarding) returnTypeParts.push('Offboarding');
    const returnTypeStr = returnTypeParts.join(',');
    const processUserName =
      [currentUser?.firstName, currentUser?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || currentUser?.name?.trim() || null;
    const processDigitalSignature =
      (currentUser as { digitalSignature?: string | null })?.digitalSignature ??
      null;
    return {
      assignmentID: first.assignmentID,
      assets: details.map(assignment => {
        const rd = assetReturnData.find(r => r.assetId === assignment.asset.id);
        return {
          id: assignment.asset.id,
          code: assignment.asset.code,
          name: assignment.asset.name,
          category: assignment.asset.category_id,
          type: assignment.asset.type_id,
          serialNo: '',
          returnCondition: rd?.condition,
          returnNotes: rd?.notes,
        };
      }),
      user: {
        id: first.user.id,
        first_name: first.user.first_name,
        last_name: first.user.last_name,
        email: first.user.email,
        employeeNumber: first.user.employeeNumber,
        position: first.user.position,
        companyName:
          (
            first.user as {
              company?: { name?: string | null };
            }
          ).company?.name ??
          activeCompany?.name ??
          currentUser?.company ??
          null,
        companyLogoUrl:
          (
            first.user as {
              company?: { logo_url?: string | null };
            }
          ).company?.logo_url ??
          activeCompany?.logo_url ??
          null,
      },
      department: first.department,
      requestorDepartment: first.department
        ? { id: first.department.id, name: first.department.name }
        : null,
      location: returnLoc
        ? {
            id: returnLoc.locationID,
            name: locDisplayName,
            floor_unit: returnLoc.floor_unit ?? '',
            building: returnLoc.building ?? '',
          }
        : null,
      assigned_date: first.assigned_date,
      expected_return_date: first.expected_return_date,
      actual_return_date: new Date().toISOString(),
      assignment_notes: first.assignment_notes,
      status: first.status,
      assigned_by: first.assigned_by,
      returnCondition: assetReturnData[0]?.condition ?? 'Good',
      returnNotes: '',
      form_number: formNumber ?? undefined,
      process_signed_at: verificationConfirmSign
        ? new Date().toISOString()
        : null,
      process_digital_signature: verificationConfirmSign
        ? processDigitalSignature
        : null,
      process_user_name: processUserName,
      processorPosition: currentUser?.position?.trim()
        ? currentUser.position
        : null,
      returnType: returnTypeStr || null,
      showProcessorSignatureBlock: !!verificationConfirmSign,
      ownerAbsent: ownerAbsent && assignAllToMe,
    };
  };

  const submitReturnRequest = async () => {
    if (!validateReturnForm()) return;
    setReturning(true);
    try {
      const assetReturns = assetReturnData.map(returnData => {
        const assignment = assignments.find(
          a => a.asset.id === returnData.assetId
        );
        return {
          assignmentId: assignment?.assignmentID || '',
          condition: returnData.condition,
          notes: returnData.notes || '',
          returnLocationId: sharedReturnLocationId || '',
          returnAreaId: sharedReturnAreaId || '',
          returnDepartmentId: sharedReturnDepartmentId || '',
          imageUrls: returnData.conditionImages || [],
        };
      });

      const processDigitalSignature =
        (currentUser as { digitalSignature?: string | null })?.digitalSignature ??
        null;
      const processSignature = verificationConfirmSign
        ? {
            signed_at: new Date().toISOString(),
            digital_signature: processDigitalSignature || undefined,
          }
        : undefined;

      const returnTypeParts: string[] = [];
      if (returnTypeReturned) returnTypeParts.push('Returned');
      if (returnTypeOffboarding) returnTypeParts.push('Offboarding');
      const returnType = returnTypeParts.join(',');

      const intangibleAssetReturnItems = selectedIntangibleAssetIds.length > 0
        ? selectedIntangibleAssetIds.map(id => ({ id }))
        : undefined;

      const response = (await api.post('/asset-returns', {
        assetReturns,
        processSignature,
        returnType,
        assignToProcessor: assignAllToMe,
        ownerAbsent: assignAllToMe && ownerAbsent,
        intangibleAssetReturnItems,
      })) as {
        message?: string;
        returnForm?: { formID?: string; form_number?: string | null };
      };

      const serverMsg = response?.message;
      const formNum = response?.returnForm?.form_number ?? null;
      const totalAssets = selectedAssignments.length + selectedIntangibleAssetIds.length;
      toast.success(
        ownerAbsent && assignAllToMe
          ? serverMsg ??
              'Return request created. Obtain the department head signature on the downloaded form.'
          : assignAllToMe
            ? serverMsg ??
                'Return has been initialized. The returner must sign the form in Profile â†’ Documents, then the department head must approve before assets are assigned to you.'
            : serverMsg ||
                `Successfully returned ${totalAssets} asset(s)`
      );

      // Save offboarding checklists after successful return
      if (pendingReturnChecklistsRef.current.length > 0) {
        try {
          await Promise.all(
            pendingReturnChecklistsRef.current.map(checklist =>
              api.post('/asset-returns/checklist', {
                assignmentId: checklist.assignmentId,
                employeeId: checklist.employeeId,
                employeeName: checklist.employeeName,
                employeeDesignation: checklist.employeeDesignation,
                employeeDepartment: checklist.employeeDepartment,
                employeeCompany: checklist.employeeCompany,
                typeOnboarding: checklist.typeOnboarding,
                typeOffboarding: checklist.typeOffboarding,
                receivedBy: checklist.receivedBy,
                checklistData: checklist.checklistData,
                remarks: checklist.remarks,
                digitalSignature: processDigitalSignature,
              })
            )
          );
        } catch (checklistErr) {
          console.error('Failed to save offboarding checklists:', checklistErr);
        }
      }

      // Download PDF automatically for processor-initiated returns with owner absent
      if (assignAllToMe && ownerAbsent) {
        try {
          const pdfPayload = buildReturnPdfPayload(formNum);
          if (pdfPayload) {
            const blob = await generateAssetReturnPDF(pdfPayload);
            const safeName = (formNum || 'asset-return').replace(
              /[^a-zA-Z0-9-_]+/g,
              '-'
            );
            downloadPDF(blob, `${safeName}.pdf`);
          }
        } catch (pdfErr) {
          console.error('Return PDF download failed:', pdfErr);
          toast.error(
            'Return saved, but PDF download failed. You can open the form from Approvals or try again.'
          );
        }
      }

      setSelectedAssignments([]);
      setSelectedIntangibleAssetIds([]);
      setAssetReturnData([]);
      setVerificationTag(false);
      setVerificationCondition(false);
      setVerificationConfirmSign(false);
      setReturnTypeReturned(false);
      setReturnTypeOffboarding(false);
      setAssignAllToMe(false);
      setOwnerAbsent(false);
      setSharedReturnDepartmentId('');
      setSharedReturnLocationId('');
      setSharedReturnAreaId('');
      setShowConditionModal(false);

      setChecklistComputerAssets([]);
      setChecklistDialogOpen(false);
      pendingReturnChecklistsRef.current = [];

      await fetchAssignments();
    } catch (error: unknown) {
      console.error('Failed to return assets:', error);
      const err = error as { data?: { error?: string; message?: string } };
      toast.error(
        (err as { data?: { error?: string } })?.data?.error ||
          'Failed to return assets'
      );
    } finally {
      setReturning(false);
    }
  };

  const handleReturnAssets = () => {
    if (!validateReturnForm()) return;

    // Check if any selected assets are computer-type
    const selectedAssetObjects = selectedAssignments
      .map(assignmentId => assignments.find(a => a.assignmentID === assignmentId))
      .filter(Boolean) as AssetAssignment[];
    const typedAssets = selectedAssetObjects.map(a => ({
      id: a.asset.id,
      name: a.asset.name,
      type: a.asset.type_id || '',
      category: a.asset.category_id || '',
    }));
    const hasComputer = hasComputerTypeAssets(typedAssets, typedAssets.map(a => a.id));

    if (hasComputer) {
      // Open checklist dialog first for computer-type assets
      const computerAssets = filterComputerTypeAssets(typedAssets);
      setChecklistComputerAssets(computerAssets);
      setChecklistStepIndex(0);
      pendingReturnChecklistsRef.current = [];
      setChecklistDialogOpen(true);
      return;
    }

    // No computer assets, proceed directly to OTP
    pendingReturnActionRef.current = async () => {
      await submitReturnRequest();
    };
    setSmsOtpDialogOpen(true);
  };

  const handleReturnChecklistNext = async (payload: AssetChecklistSubmitPayload) => {
    const currentComputer = checklistComputerAssets[checklistStepIndex];
    const assignment = assignments.find(a => a.asset.id === currentComputer?.id);
    if (assignment) {
      pendingReturnChecklistsRef.current.push({
        assignmentId: assignment.assignmentID,
        employeeId: assignment.user.id,
        employeeName: `${assignment.user.first_name} ${assignment.user.last_name}`,
        employeeDesignation: assignment.user.position || null,
        employeeDepartment: assignment.department?.name || null,
        employeeCompany: null,
        checklistData: payload.checklistData as OffboardingChecklistItemData,
        typeOnboarding: payload.typeOnboarding,
        typeOffboarding: payload.typeOffboarding,
        receivedBy: payload.receivedBy,
        remarks: payload.remarks,
      });
    }
    setChecklistStepIndex(prev => prev + 1);
  };

  const handleReturnChecklistFinalSubmit = async (payload: AssetChecklistSubmitPayload) => {
    const currentComputer = checklistComputerAssets[checklistStepIndex];
    const assignment = assignments.find(a => a.asset.id === currentComputer?.id);
    if (assignment) {
      pendingReturnChecklistsRef.current.push({
        assignmentId: assignment.assignmentID,
        employeeId: assignment.user.id,
        employeeName: `${assignment.user.first_name} ${assignment.user.last_name}`,
        employeeDesignation: assignment.user.position || null,
        employeeDepartment: assignment.department?.name || null,
        employeeCompany: null,
        checklistData: payload.checklistData as OffboardingChecklistItemData,
        typeOnboarding: payload.typeOnboarding,
        typeOffboarding: payload.typeOffboarding,
        receivedBy: payload.receivedBy,
        remarks: payload.remarks,
      });
    }

    // Close checklist dialog and open OTP
    setChecklistDialogOpen(false);
    pendingReturnActionRef.current = async () => {
      await submitReturnRequest();
    };
    setSmsOtpDialogOpen(true);
  };

  const assignedBuilders = useMemo(() => {
    return assetBuilders.filter(
      (b: any) =>
        b.status === 'Assigned' && b.items?.length > 0 && Array.isArray(b.items)
    );
  }, [assetBuilders]);

  const buildersWithAssignments = useMemo(() => {
    return assignedBuilders.map((builder: any) => {
      const assetCodes = new Set(
        (builder.items || []).map((i: any) => (i.asset_code || '').trim())
      );
      const builderAssignments = assignments.filter(
        a =>
          a.status === 'Active' &&
          (assetCodes.has((a.asset?.code || '').trim()) ||
            assetCodes.has((a.asset?.id || '').trim()))
      );
      return { builder, assignments: builderAssignments };
    });
  }, [assignedBuilders, assignments]);

  const assignmentIdsInBuilders = useMemo(
    () =>
      new Set(
        buildersWithAssignments.flatMap(({ assignments: b }) =>
          b.map((a: AssetAssignment) => a.assignmentID)
        )
      ),
    [buildersWithAssignments]
  );

  const filteredAssignedBuilders = useMemo(() => {
    if (!builderSearchTerm.trim()) return buildersWithAssignments;
    const q = builderSearchTerm.toLowerCase();
    return buildersWithAssignments.filter(
      ({ builder, assignments: builderAssignments }: any) => {
        const nameMatch = builder.name?.toLowerCase().includes(q);
        const descMatch = builder.description?.toLowerCase().includes(q);
        const builderItemsMatch = builder.items?.some(
          (i: any) =>
            i.asset_name?.toLowerCase().includes(q) ||
            i.asset_code?.toLowerCase().includes(q)
        );
        const assignmentAssetsMatch = builderAssignments?.some(
          (a: AssetAssignment) =>
            a.asset?.code?.toLowerCase().includes(q) ||
            a.asset?.name?.toLowerCase().includes(q)
        );
        return (
          nameMatch || descMatch || builderItemsMatch || assignmentAssetsMatch
        );
      }
    );
  }, [buildersWithAssignments, builderSearchTerm]);

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = !q
      ? assignments.filter(a => a.status === 'Active')
      : assignments.filter(assignment => {
          if (assignment.status !== 'Active') return false;
          if (searchColumn === 'all') {
            return (
              assignment.asset.name?.toLowerCase().includes(q) ||
              assignment.asset.code?.toLowerCase().includes(q) ||
              assignment.department?.name?.toLowerCase().includes(q) ||
              assignment.user.first_name?.toLowerCase().includes(q) ||
              assignment.user.last_name?.toLowerCase().includes(q) ||
              assignment.user.email?.toLowerCase().includes(q) ||
              `${assignment.user.first_name || ''} ${assignment.user.last_name || ''}`
                .trim()
                .toLowerCase()
                .includes(q)
            );
          }
          const assetField = searchColumn === 'id' ? 'code' : searchColumn;
          const val = (assignment.asset as any)[assetField];
          return val != null && String(val).toLowerCase().includes(q);
        });
    return base.filter(a => !assignmentIdsInBuilders.has(a.assignmentID));
  }, [assignments, searchTerm, searchColumn, assignmentIdsInBuilders]);

  const conditionOptions = [
    {
      value: 'Excellent',
      label: 'Excellent',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    { value: 'Good', label: 'Good', icon: CheckCircle, color: 'text-blue-600' },
    {
      value: 'Needs Repair',
      label: 'Needs Repair',
      icon: AlertTriangle,
      color: 'text-yellow-600',
    },
    {
      value: 'Damaged',
      label: 'Damaged',
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      value: 'Obsolete',
      label: 'Obsolete',
      icon: XCircle,
      color: 'text-gray-600',
    },
  ];

  const getSelectedAssignmentDetails = () => {
    return selectedAssignments
      .map(assignmentId => {
        const assignment = assignments.find(
          a => a.assignmentID === assignmentId
        );
        return assignment;
      })
      .filter(Boolean);
  };

  const allConditionsSelected = assetReturnData.every(item => item.condition);
  const allLocationsSelected = Boolean(
    sharedReturnDepartmentId && sharedReturnLocationId
  );
  const sharedLocationForRooms = locations.find(
    loc => loc.locationID === sharedReturnLocationId
  );
  const sharedLocationHasRooms = sharedLocationForRooms?.room_areas?.some(
    r => r && r.room_name
  );
  const allRoomsSelected =
    !sharedLocationHasRooms || Boolean(sharedReturnAreaId);

  // Helper: locations filtered by shared department
  const getSharedAvailableLocations = () => {
    if (!sharedReturnDepartmentId) return [];
    return locations.filter(
      loc => loc.department_id === sharedReturnDepartmentId
    );
  };

  // Helper: rooms for shared location
  const getSharedAvailableRooms = () => {
    if (!sharedReturnLocationId) return [];
    const loc = locations.find(l => l.locationID === sharedReturnLocationId);
    return loc?.room_areas?.filter(r => r && r.room_name) || [];
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={RotateCcw}
          title="Assets Return"
          description="Process asset returns and assess condition"
        >
          {showScopeTabs && (
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName}>IT Asset</TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName}>Admin Asset</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Asset Selection / Asset Built Tabs */}
          <div className="xl:col-span-2">
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setTabLoading(true); setTimeout(() => setTabLoading(false), 300); }} className="w-full">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2'}>
                <TabsTrigger
                  value="select-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Package className="h-4 w-4" />
                  Select Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="asset-built"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Boxes className="h-4 w-4" />
                  Asset Built
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignedBuilders.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select-assets" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Package className="h-5 w-5 text-red-600" />
                      </div>
                      Select Assets to Return
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignments.length} assigned
                      </Badge>
                    </CardTitle>

                    <SearchWithColumnFilter
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Search assets..."
                      columnOptions={ASSET_SEARCH_COLUMNS_BASIC}
                      searchColumn={searchColumn}
                      onSearchColumnChange={setSearchColumn}
                      className="mt-4"
                    />
                    {filteredAssignments.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allVisibleIds = filteredAssignments
                              .map(a => a.assignmentID)
                              .filter(id => !isInFlightReturn(id));
                            const allSelected =
                              allVisibleIds.length > 0 &&
                              allVisibleIds.every(id =>
                                selectedAssignments.includes(id)
                              );
                            if (allSelected) {
                              setSelectedAssignments(prev =>
                                prev.filter(id => !allVisibleIds.includes(id))
                              );
                            } else {
                              setSelectedAssignments(prev => [
                                ...new Set([...prev, ...allVisibleIds]),
                              ]);
                            }
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                        >
                          {filteredAssignments.length > 0 &&
                          filteredAssignments.every(a => selectedAssignments.includes(a.assignmentID))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 -mr-6 pr-6">
                      {displayLoading || tabLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-xl"
                            >
                              <Shimmer className="h-10 w-10 rounded flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <Shimmer className="h-4 w-48 rounded" />
                                <Shimmer className="h-3 w-36 rounded" />
                                <Shimmer className="h-3 w-28 rounded" />
                              </div>
                              <Shimmer className="h-6 w-6 rounded flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                            <Package className="h-10 w-10 text-red-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No active asset assignments found
                          </h3>
                          <p className="text-gray-500 text-sm">
                            Try adjusting your search criteria
                          </p>
                        </div>
                      ) : (
                        filteredAssignments.map(assignment => (
                          <div
                            key={assignment.assignmentID}
                            className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                              hasPermission('Asset Return', 'create') &&
                              hasPermission('Asset Return', 'edit') &&
                              !isInFlightReturn(assignment.assignmentID)
                                ? 'cursor-pointer'
                                : 'cursor-not-allowed opacity-50'
                            } ${
                              selectedAssignments.includes(
                                assignment.assignmentID
                              )
                                ? 'border-red-500 bg-red-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                            onClick={() =>
                              hasPermission('Asset Return', 'create') &&
                              hasPermission('Asset Return', 'edit') &&
                              !isInFlightReturn(assignment.assignmentID) &&
                              handleAssignmentSelection(
                                assignment.assignmentID,
                                !selectedAssignments.includes(
                                  assignment.assignmentID
                                )
                              )
                            }
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                <Checkbox
                                  id={assignment.assignmentID}
                                  checked={selectedAssignments.includes(
                                    assignment.assignmentID
                                  )}
                                  onCheckedChange={(
                                    checked: boolean | string
                                  ) =>
                                    handleAssignmentSelection(
                                      assignment.assignmentID,
                                      checked
                                    )
                                  }
                                  className="pointer-events-none"
                                  disabled={
                                    !hasPermission('Asset Return', 'create') ||
                                    !hasPermission('Asset Return', 'edit') ||
                                    isInFlightReturn(assignment.assignmentID)
                                  }
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                                      {assignment.asset.name}
                                      <span className="text-sm text-gray-500 font-mono ml-2">
                                        {assignment.asset.code}
                                      </span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                      {selectedAssignments.includes(
                                        assignment.assignmentID
                                      ) && (
                                        <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-sm text-gray-600 mb-3">
                                  <span className="font-medium">
                                    Currently assigned to:
                                  </span>
                                  <span className="ml-2">
                                    {assignment.user.first_name}{' '}
                                    {assignment.user.last_name}
                                  </span>
                                  {assignment.department && (
                                    <span className="ml-2 text-gray-400">
                                      â€¢
                                    </span>
                                  )}
                                  {assignment.department && (
                                    <span>{assignment.department.name}</span>
                                  )}
                                  {assignment.location && (
                                    <span className="ml-2 text-gray-400">
                                      â€¢
                                    </span>
                                  )}
                                  {assignment.location && (
                                    <span>
                                      {assignment.location.name} -{' '}
                                      {assignment.location.floor_unit}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-red-100 text-red-800 border-red-200"
                                  >
                                    {assignment.status}
                                  </Badge>
                                  {isInFlightReturn(assignment.assignmentID) && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-blue-300 text-blue-700"
                                    >
                                      Return in progress
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-gray-300"
                                  >
                                    Assigned:{' '}
                                    {new Date(
                                      assignment.assigned_date
                                    ).toLocaleDateString()}
                                  </Badge>
                                  {assignment.expected_return_date && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-orange-300 text-orange-700"
                                    >
                                      Due:{' '}
                                      {new Date(
                                        assignment.expected_return_date
                                      ).toLocaleDateString()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Selection overlay */}
                            {selectedAssignments.includes(
                              assignment.assignmentID
                            ) && (
                              <div className="absolute inset-0 bg-green-500/5 rounded-xl pointer-events-none"></div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {selectedAssignments.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-900">
                              {selectedAssignments.length} asset
                              {selectedAssignments.length !== 1 ? 's' : ''}{' '}
                              selected for return
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAssignments([])}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                        {filteredAssignedBuilders.length} assigned
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Return whole builder or select individual assets to
                      return.
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
                    {buildersLoading || tabLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Card
                            key={index}
                            className="border shadow-sm border-gray-200"
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <Shimmer className="h-6 w-40 rounded mb-1" />
                                  <Shimmer className="h-4 w-64 rounded mb-2" />
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Shimmer className="h-3.5 w-3.5 rounded" />
                                    <Shimmer className="h-4 w-32 rounded" />
                                  </div>
                                  <Shimmer className="h-5 w-20 rounded-full" />
                                  <div className="space-y-1.5 mt-2">
                                    {Array.from({ length: 2 }).map((_, idx) => (
                                      <div key={idx} className="flex items-center gap-2 border rounded px-2 py-1">
                                        <Shimmer className="h-3 w-3 rounded" />
                                        <Shimmer className="h-3.5 w-24 rounded" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                                  <Shimmer className="h-9 w-24 rounded-lg" />
                                  <Shimmer className="h-9 w-24 rounded-lg" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filteredAssignedBuilders.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                          <Boxes className="h-10 w-10 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No assigned asset builders to return
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Asset builders that have been assigned will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-1">
                        {filteredAssignedBuilders.map(
                          ({
                            builder,
                            assignments: builderAssignments,
                          }: any) => {
                            const isFullySelected = isBuilderFullySelected(
                              builder.builderID
                            );
                            const isExpanded =
                              expandedBuilderForSelect === builder.builderID;

                            return (
                              <Card
                                key={builder.builderID}
                                className={cn(
                                  'border shadow-sm',
                                  isFullySelected
                                    ? 'border-2 border-red-500 bg-red-50/50'
                                    : 'border-gray-200'
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                        {builder.name || 'Unnamed Builder'}
                                      </h3>
                                      {builder.description && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                          {builder.description}
                                        </p>
                                      )}
                                      {builderAssignments[0]?.user && (
                                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                                          <User className="h-3.5 w-3 text-gray-400 flex-shrink-0" />
                                          Assigned to:{' '}
                                          {
                                            builderAssignments[0].user
                                              .first_name
                                          }{' '}
                                          {builderAssignments[0].user.last_name}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-blue-100 text-blue-800"
                                        >
                                          {builderAssignments.length} assigned
                                        </Badge>
                                      </div>
                                      <ul className="text-xs text-gray-500 mt-2 font-mono space-y-1.5 pl-5 list-disc max-h-[8.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {builderAssignments
                                          .map(
                                            (a: AssetAssignment) => ({
                                              code: a.asset?.code,
                                              isParent: builder.items?.find(
                                                (item: any) => item.asset_code === a.asset?.code
                                              )?.is_parent
                                            })
                                          )
                                          .filter((item: any) => item.code)
                                          .map((item: any, idx: number) => (
                                            <li
                                              key={idx}
                                              className={`flex items-center gap-2 border rounded px-2 py-1 -ml-1 pl-3 ${
                                                item.isParent ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                                              }`}
                                            >
                                              {item.isParent && (
                                                <Crown className="h-3 w-3 text-amber-600 shrink-0" />
                                              )}
                                              {item.code}
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                    <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant={
                                          isFullySelected
                                            ? 'outline'
                                            : 'default'
                                        }
                                        className={
                                          isFullySelected
                                            ? 'border-red-500 text-red-600 hover:bg-red-50'
                                            : 'bg-red-500 hover:bg-red-600 text-white'
                                        }
                                        onClick={() =>
                                          isFullySelected
                                            ? handleBuilderDeselectAll(
                                                builder.builderID
                                              )
                                            : handleBuilderReturnWhole(
                                                builder.builderID
                                              )
                                        }
                                      >
                                        {isFullySelected
                                          ? 'Deselect All'
                                          : 'Return Whole'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-gray-600 hover:bg-red-500 hover:text-white"
                                        onClick={() =>
                                          setExpandedBuilderForSelect(
                                            isExpanded
                                              ? null
                                              : builder.builderID
                                          )
                                        }
                                      >
                                        {isExpanded
                                          ? 'Collapse'
                                          : 'Select Assets'}
                                      </Button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Select which assets to return
                                      </p>
                                      <div className="space-y-2 max-h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        <ul className="space-y-2 list-none pl-0">
                                          {builderAssignments.map(
                                            (a: AssetAssignment) => (
                                              <li
                                                key={a.assignmentID}
                                                className={cn(
                                                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer min-w-0 pl-4 relative before:content-["â€¢"] before:absolute before:left-2 before:font-bold before:text-gray-500',
                                                  isInFlightReturn(
                                                    a.assignmentID
                                                  )
                                                    ? 'cursor-not-allowed opacity-50 border-gray-200'
                                                    : selectedAssignments.includes(
                                                        a.assignmentID
                                                      )
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                )}
                                                onClick={() =>
                                                  hasPermission(
                                                    'Asset Return',
                                                    'create'
                                                  ) &&
                                                  hasPermission(
                                                    'Asset Return',
                                                    'edit'
                                                  ) &&
                                                  !isInFlightReturn(
                                                    a.assignmentID
                                                  ) &&
                                                  handleBuilderAssetToggle(
                                                    a.assignmentID,
                                                    !selectedAssignments.includes(
                                                      a.assignmentID
                                                    )
                                                  )
                                                }
                                              >
                                                <Checkbox
                                                  checked={selectedAssignments.includes(
                                                    a.assignmentID
                                                  )}
                                                  onCheckedChange={(
                                                    checked: boolean | string
                                                  ) =>
                                                    handleBuilderAssetToggle(
                                                      a.assignmentID,
                                                      checked
                                                    )
                                                  }
                                                  disabled={
                                                    !hasPermission(
                                                      'Asset Return',
                                                      'create'
                                                    ) ||
                                                    !hasPermission(
                                                      'Asset Return',
                                                      'edit'
                                                    ) ||
                                                    isInFlightReturn(
                                                      a.assignmentID
                                                    )
                                                  }
                                                  className="flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <span className="font-medium text-gray-900 truncate block">
                                                    {a.asset.name}
                                                  </span>
                                                  <span className="text-sm text-gray-500 font-mono">
                                                    Asset code: {a.asset.code}
                                                  </span>
                                                </div>
                                                <span className="text-sm text-gray-600 flex-shrink-0 truncate max-w-[100px]">
                                                  {a.user?.first_name}{' '}
                                                  {a.user?.last_name}
                                                </span>
                                                {isInFlightReturn(
                                                  a.assignmentID
                                                ) && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs border-blue-300 text-blue-700 flex-shrink-0"
                                                  >
                                                    Return in progress
                                                  </Badge>
                                                )}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          }
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
          {/* Return Details Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <RotateCcw className="h-5 w-5 text-red-600" />
                  </div>
                  Return Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-sm text-gray-600">
                  Select assets above, then click Return to assess conditions
                  and add notes for each asset.
                </div>

                {/* Return Button */}
                <Button
                  onClick={handleReturnClick}
                  disabled={
                    returning ||
                    (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) ||
                    !hasPermission('Asset Return', 'create') ||
                    !hasPermission('Asset Return', 'edit')
                  }
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {returning ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing Return...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Return {selectedAssignments.length + selectedIntangibleAssetIds.length} Asset
                      {selectedAssignments.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </Button>

                {selectedAssignments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select asset assignments above to enable return
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Return History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-red-600" />
              </div>
              Return History
              <Badge variant="secondary" className="ml-auto">
                {returnHistory.length} returns
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {returnHistoryLoading ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 space-y-2">
                  <div className="flex gap-4">
                    <Shimmer className="h-5 w-32 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-28 rounded" />
                    <Shimmer className="h-5 w-20 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-32 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-20 rounded" />
                  </div>
                </div>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="border-t border-gray-200 p-3 space-y-2">
                    <div className="flex gap-4">
                      <Shimmer className="h-5 w-32 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-28 rounded" />
                      <Shimmer className="h-5 w-20 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-32 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : returnHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                  <RotateCcw className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No return history found
                </h3>
                <p className="text-gray-500 text-sm">
                  Completed returns will appear here
                </p>
              </div>
            ) : (
              <DataTable<ReturnHistoryRow>
                tableId="return-history"
                data={flattenedReturnHistory}
                columns={returnHistoryColumns}
                searchPlaceholder="Search return history..."
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No matching returns</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Condition Selection Modal */}
        <Dialog
          open={showConditionModal}
          onOpenChange={open => {
            if (smsOtpDialogOpen && !open) return;
            setShowConditionModal(open);
            if (!open) {
              setVerificationTag(false);
              setVerificationCondition(false);
              setVerificationConfirmSign(false);
              setReturnTypeReturned(false);
              setReturnTypeOffboarding(false);
              setAssignAllToMe(false);
              setOwnerAbsent(false);
              setSharedReturnDepartmentId('');
              setSharedReturnLocationId('');
              setSharedReturnAreaId('');
            }
          }}
        >
          <AppDialogFrame
            className={`max-w-2xl w-[85vw] sm:w-[90vw] md:w-full max-h-[90vh] overflow-hidden !flex !flex-col${smsOtpDialogOpen ? ' !overflow-hidden' : ''}`}
          >
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <RotateCcw className="h-6 w-6 shrink-0 text-white" />
                  Asset Return Confirmation
                </span>
              }
              description="Please assess the condition of each selected asset and add any notes."
            />

            <AppDialogBody
              className={`max-h-[min(50vh,520px)] min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden sm:space-y-6${smsOtpDialogOpen ? ' !overflow-hidden' : ''}`}
            >
              <div className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                Selected Assets: {selectedAssignments.length}
              </div>
              {/* Return Type section - at top */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 transition-shadow hover:shadow-md">
                <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
                  Return Type
                </Label>
                <div className="flex flex-wrap gap-3 mt-3">
                  <label
                    htmlFor="return-type-returned"
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                      returnTypeReturned
                        ? 'border-red-500 bg-red-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <Checkbox
                      id="return-type-returned"
                      checked={returnTypeReturned}
                      onCheckedChange={checked =>
                        setReturnTypeReturned(Boolean(checked))
                      }
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Returned
                    </span>
                  </label>
                  <label
                    htmlFor="return-type-offboarding"
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 flex-1 min-w-[140px]',
                      returnTypeOffboarding
                        ? 'border-red-500 bg-red-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <Checkbox
                      id="return-type-offboarding"
                      checked={returnTypeOffboarding}
                      onCheckedChange={checked =>
                        setReturnTypeOffboarding(Boolean(checked))
                      }
                    />
                    <span className="text-sm font-medium text-slate-800">
                      Offboarding
                    </span>
                  </label>
                </div>
              </div>

              {/* Asset Cards */}
              {getSelectedAssignmentDetails().map((assignment, index) => {
                const returnData = assetReturnData.find(
                  item => item.assetId === assignment?.asset.id
                );
                const isExpanded = expandedAssets.has(
                  assignment?.asset.id || ''
                );

                return (
                  <div
                    key={assignment?.assignmentID}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-3 transition-shadow hover:shadow-md"
                  >
                    {/* Asset Header with Expand/Collapse */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {assignment?.asset.name}
                          </h4>
                          <p className="text-sm text-slate-500 font-mono">
                            {assignment?.asset.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleAssetExpansion(assignment?.asset.id || '')
                          }
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label={
                            isExpanded
                              ? 'Collapse asset details'
                              : 'Expand asset details'
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-5 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                        {/* Asset Condition */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-red-500" />
                            Asset Condition
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {conditionOptions.map(condition => {
                              const IconComponent = condition.icon;
                              const isSelected =
                                returnData?.condition === condition.value;
                              return (
                                <div
                                  key={condition.value}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                                    isSelected
                                      ? 'border-2 border-red-500 bg-red-50 shadow-sm'
                                      : 'border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                  onClick={() =>
                                    handleConditionChange(
                                      assignment?.asset.id || '',
                                      condition.value
                                    )
                                  }
                                >
                                  <div
                                    className={`h-4 w-4 rounded-full border-2 ${
                                      isSelected
                                        ? 'bg-red-500 border-red-500'
                                        : 'border-gray-300'
                                    }`}
                                  />
                                  <IconComponent
                                    className={`h-5 w-5 shrink-0 ${
                                      isSelected
                                        ? condition.color
                                        : 'text-slate-400'
                                    }`}
                                  />
                                  <span className="font-medium text-slate-800">
                                    {condition.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Return Notes */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Return Notes{' '}
                            <span className="text-slate-400 font-normal">
                              (optional)
                            </span>
                          </Label>
                          <Textarea
                            placeholder="Add notes about this asset's return..."
                            value={returnData?.notes || ''}
                            onChange={e =>
                              handleNotesChange(
                                assignment?.asset.id || '',
                                e.target.value
                              )
                            }
                            className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg resize-none"
                            rows={3}
                          />
                        </div>

                        {/* Return Condition Photos */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Return Condition Photos{' '}
                            <span className="text-slate-400 font-normal">
                              (optional, up to {MAX_CONDITION_IMAGES})
                            </span>
                          </Label>
                          <div className="flex flex-wrap gap-2 items-start">
                            {(returnData?.conditionImages ?? []).map(
                              (url, idx) => (
                                <div key={url} className="relative group">
                                  <img
                                    src={proxyCloudinaryUrl(url)}
                                    alt={`Condition photo ${idx + 1}`}
                                    className="h-20 w-20 object-cover rounded-lg border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleImageRemove(
                                        assignment?.asset.id || '',
                                        idx
                                      )
                                    }
                                    className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    aria-label="Remove photo"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              )
                            )}
                            {(returnData?.conditionImages?.length ?? 0) <
                              MAX_CONDITION_IMAGES && (
                              <label className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors">
                                <input
                                  type="file"
                                  accept={VALID_IMAGE_TYPES.join(',')}
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleImageAdd(
                                        assignment?.asset.id || '',
                                        file
                                      );
                                    e.target.value = '';
                                  }}
                                />
                                <ImagePlus className="h-8 w-8 text-slate-400" />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Shared Return Location - applies to all assets */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-3 transition-shadow hover:shadow-md">
                <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Return Location (all assets)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">
                      Department
                    </Label>
                    <Select
                      value={sharedReturnDepartmentId}
                      onValueChange={value => {
                        setSharedReturnDepartmentId(value);
                        setSharedReturnLocationId('');
                        setSharedReturnAreaId('');
                      }}
                    >
                      <SelectTrigger className="border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[200] max-h-60 rounded-lg shadow-lg">
                        {departments.map(d => (
                          <SelectItem
                            key={d.departmentID}
                            value={d.departmentID}
                            className="hover:bg-gray-200"
                          >
                            <span>{d.name}</span>
                            <span className="text-sm text-gray-500 ml-1">
                              ({d.code})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">
                      Location
                    </Label>
                    <Select
                      value={sharedReturnLocationId}
                      onValueChange={value => {
                        setSharedReturnLocationId(value);
                        setSharedReturnAreaId('');
                      }}
                      disabled={!sharedReturnDepartmentId}
                    >
                      <SelectTrigger
                        className={cn(
                          'border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg',
                          !sharedReturnDepartmentId && 'text-muted-foreground'
                        )}
                      >
                        <SelectValue
                          placeholder={
                            sharedReturnDepartmentId
                              ? 'Select location'
                              : 'Select department first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[200]">
                        {getSharedAvailableLocations().map(location => (
                          <SelectItem
                            key={location.locationID}
                            value={location.locationID}
                            className="hover:bg-gray-200"
                          >
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-600">
                      Room / Area
                    </Label>
                    <Select
                      value={sharedReturnAreaId}
                      onValueChange={setSharedReturnAreaId}
                      disabled={!sharedReturnLocationId}
                    >
                      <SelectTrigger
                        className={cn(
                          'border-slate-200 focus:border-red-500 focus:ring-red-500/20 rounded-lg',
                          !sharedReturnLocationId && 'text-muted-foreground'
                        )}
                      >
                        <SelectValue
                          placeholder={
                            sharedReturnLocationId
                              ? 'Select room/area'
                              : 'Select a location first'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[200]">
                        {getSharedAvailableRooms().map(room => (
                          <SelectItem
                            key={room.roomID}
                            value={room.roomID}
                            className="hover:bg-gray-200"
                          >
                            {room.room_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-2 transition-shadow hover:shadow-md">
                <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase">
                  Processor position
                </Label>
                <p className="text-sm text-slate-700">
                  {currentUser?.position?.trim()
                    ? currentUser.position
                    : '— (add a position on your profile if missing)'}
                </p>
                <p className="text-xs text-slate-500">
                  Shown on the return form PDF after processing.
                </p>
              </div>

              {/* Verification Checkboxes */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3 space-y-4">
                <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase block">
                  Verification
                </Label>
                <div className="space-y-3">
                  <label
                    htmlFor="verification-tag"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="verification-tag"
                      checked={verificationTag}
                      onCheckedChange={checked =>
                        setVerificationTag(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700">
                      I have verified the asset tag matches the physical
                      equipment
                    </span>
                  </label>
                  <label
                    htmlFor="verification-condition"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="verification-condition"
                      checked={verificationCondition}
                      onCheckedChange={checked =>
                        setVerificationCondition(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700">
                      I have assessed the asset condition thoroughly
                    </span>
                  </label>
                  <label
                    htmlFor="verification-confirm-sign"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="verification-confirm-sign"
                      checked={verificationConfirmSign}
                      onCheckedChange={checked =>
                        setVerificationConfirmSign(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700">
                      I sign this form confirming and approving the asset
                      returned by the user
                    </span>
                  </label>
                  <label
                    htmlFor="assign-all-to-me"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id="assign-all-to-me"
                      checked={assignAllToMe}
                      onCheckedChange={checked =>
                        setAssignAllToMe(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700">
                      The returned assets will be transferred and assigned to me
                      temporarily when the returner&apos;s department head
                      approves the return form
                    </span>
                  </label>
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5 pr-2">
                      <Label
                        htmlFor="owner-absent-switch"
                        className="text-sm font-medium text-slate-800"
                      >
                        Asset owner is not in office anymore
                      </Label>
                      <p className="text-xs text-slate-600">
                        The return form will not go to the asset owner for digital
                        signing; route it to the asset owner&apos;s department head
                        (wet signature). Use only when all selected assets belong to
                        the same owner.
                      </p>
                    </div>
                    <Switch
                      id="owner-absent-switch"
                      checked={ownerAbsent}
                      onCheckedChange={setOwnerAbsent}
                      className="shrink-0"
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-600 pt-1">
                  {assignAllToMe
                    ? ownerAbsent
                      ? "The asset owner will not see this form in Profile. Department heads in the owner's department can approve in Approvals after the printed form is signed."
                      : "After the returner's department head approves the return form, the returned assets will be assigned to you (the processor) temporarily, a new accountability form will be created for you, and you'll receive a notification."
                    : 'All selected assets will be returned'}
                </p>
              </div>
            </AppDialogBody>

            <AppDialogChromeFooter className="justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConditionModal(false)}
                disabled={returning || smsOtpDialogOpen}
                className="rounded-lg border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturnAssets}
                disabled={
                  smsOtpDialogOpen ||
                  returning ||
                  !allConditionsSelected ||
                  !allLocationsSelected ||
                  !allRoomsSelected ||
                  selectedAssignments.length === 0 ||
                  (!returnTypeReturned && !returnTypeOffboarding) ||
                  !verificationTag ||
                  !verificationCondition ||
                  !verificationConfirmSign ||
                  !assignAllToMe
                }
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {returning ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Return Assets
                  </div>
                )}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        {/* Asset Checklist Dialog (offboarding variant) - shown before OTP for computer-type assets */}
        {checklistComputerAssets.length > 0 && (
          <AssetChecklistDialog
            isOpen={checklistDialogOpen}
            onOpenChange={open => {
              if (!open) {
                setChecklistDialogOpen(false);
                pendingReturnChecklistsRef.current = [];
              }
            }}
            onCancel={() => {
              pendingReturnChecklistsRef.current = [];
            }}
            checklistVariant="offboarding"
            selectedAssets={checklistComputerAssets.map(a => a.id)}
            assets={checklistComputerAssets}
            computerAssets={checklistComputerAssets}
            currentIndex={checklistStepIndex}
            selectedUser={(() => {
              const currentComputer = checklistComputerAssets[checklistStepIndex];
              const assignment = assignments.find(a => a.asset.id === currentComputer?.id);
              return assignment?.user.id || '';
            })()}
            users={users}
            departments={departments}
            currentUserPosition={currentUser?.position || ''}
            onNext={handleReturnChecklistNext}
            onFinalSubmit={handleReturnChecklistFinalSubmit}
          />
        )}

        {/* SMS OTP Verification Dialog */}
        <SmsOtpDialog
          isOpen={smsOtpDialogOpen}
          onOpenChange={open => {
            if (!open) {
              pendingReturnActionRef.current = null;
            }
            setSmsOtpDialogOpen(open);
          }}
          sendOtpEndpoint="/auth/initials/send-otp"
          verifyOtpEndpoint="/auth/initials/verify-otp"
          onVerified={() => {
            setSmsOtpDialogOpen(false);
            pendingReturnActionRef.current = null;
            pendingReturnChecklistsRef.current = [];
          }}
          onCancel={() => {
            setSmsOtpDialogOpen(false);
            pendingReturnActionRef.current = null;
            pendingReturnChecklistsRef.current = [];
          }}
          pendingActionRef={pendingReturnActionRef}
          title="OTP SMS Verification"
          description="OTP SMS Verification has been sent to your registered mobile number for asset return confirmation."
          verifyButtonLabel="Verify & Process Return"
          phoneNumber={
            (currentUser as { contactNumber?: string })?.contactNumber
          }
        />

        {/* Return Condition Photos Modal */}
        <Dialog open={showImagesModal} onOpenChange={setShowImagesModal}>
          <AppDialogFrame className="max-w-2xl max-h-[90vh] overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-6 w-6 shrink-0 text-white" />
                  Return Condition Photos
                </span>
              }
              description="Photos captured at the time of return"
            />
            <AppDialogBody className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
                {selectedImagesForModal.map((url, idx) => (
                  <div
                    key={url}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img
                      src={proxyCloudinaryUrl(url)}
                      alt={`Condition photo ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </AppDialogBody>
          </AppDialogFrame>
        </Dialog>

      </main>
    </div>
  );
}

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
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  ImagePlus,
  Building2,
  Images,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  generateAccountabilityFormPDF,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import {
  buildReturnDataForPDFFromBatch,
  buildTransferDataForPDFFromBatch,
  type AssetReturnFormBatch,
  type AssetTransferFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import {
  downloadPDF,
  generateAssetReturnPDF,
  generateAssetTransferPDF,
} from '@/lib/pdfGenerator';

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

interface AssetTransferData {
  assetId: string;
  assignmentId: string;
  condition: string;
  notes: string;
  imageUrls?: string[];
}

const MAX_CONDITION_IMAGES = 5;
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

interface User {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  company: any;
}

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

interface TransferHistoryRecord {
  recordId: string;
  formId: string;
  formNumber: string;
  asset: { id: string; code: string; name: string };
  from: { name: string };
  to: { name: string };
  status: string;
  action: string;
  condition: string | null;
  transferNotes: string | null;
  conditionImages: string[];
  transferDate: string;
}

export default function AssetsTransfer() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [assetTransferData, setAssetTransferData] = useState<
    AssetTransferData[]
  >([]);
  const [transferTypeTransfer, setTransferTypeTransfer] = useState(false);
  const [transferTypeOffboarding, setTransferTypeOffboarding] = useState(false);
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [verificationTag, setVerificationTag] = useState(false);
  const [verificationCondition, setVerificationCondition] = useState(false);
  const [transferHistory, setTransferHistory] = useState<
    TransferHistoryRecord[]
  >([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewImages, setPhotoPreviewImages] = useState<string[]>([]);
  const [verificationConfirmSign, setVerificationConfirmSign] = useState(false);
  const [expandedTransferAssets, setExpandedTransferAssets] = useState<
    Set<string>
  >(new Set());
  const [newAssignmentBuilding, setNewAssignmentBuilding] =
    useState<string>('');
  const [newAssignmentDepartment, setNewAssignmentDepartment] =
    useState<string>('');
  const [newAssignmentLocation, setNewAssignmentLocation] =
    useState<string>('');
  const [newAssignmentRoom, setNewAssignmentRoom] = useState<string>('');
  const [newAssignmentUser, setNewAssignmentUser] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAssets, setExpandedAssets] = useState<string[]>([]);
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [expandedBuilderForSelect, setExpandedBuilderForSelect] = useState<
    string | null
  >(null);
  const [showNextStepsDialog, setShowNextStepsDialog] = useState(false);
  const [nextStepsAssigneeUserId, setNextStepsAssigneeUserId] = useState<
    string | null
  >(null);
  const [downloadingNextAccountability, setDownloadingNextAccountability] =
    useState(false);
  const [downloadingProcessorReturnForm, setDownloadingProcessorReturnForm] =
    useState(false);
  const [downloadingProcessorTransferForm, setDownloadingProcessorTransferForm] =
    useState(false);
  const [downloadingAllForms, setDownloadingAllForms] = useState(false);
  const [nextStepsTransferFormId, setNextStepsTransferFormId] = useState<
    string | null
  >(null);
  const [nextStepsReturnFormId, setNextStepsReturnFormId] = useState<
    string | null
  >(null);

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
        ...new Set((locs as any[]).map((l: any) => l.building).filter(Boolean)),
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
      const response = await api.get(`/asset-assignments/filtered?${queryParams.toString()}`);
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchTransferHistory = async () => {
    try {
      setTransferHistoryLoading(true);
      const response = await api.get('/asset-transfers/history');
      const data = response?.data ?? response;
      setTransferHistory(data?.records ?? []);
    } catch (error) {
      console.error('Failed to fetch transfer history:', error);
      setTransferHistory([]);
    } finally {
      setTransferHistoryLoading(false);
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      const response = await api.get('/asset-builders', {
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

  useEffect(() => {
    const fetchData = async () => {
      // Fetch assignments and other data
      await Promise.all([
        fetchDepartments(),
        fetchLocations(),
        fetchUsers(),
        fetchAssignments(),
        fetchAssetBuilders(),
        fetchTransferHistory(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [activeCompany?.id]);

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
    const q = builderSearchTerm.toLowerCase();
    const baseBuilders = !builderSearchTerm.trim()
      ? buildersWithAssignments
      : buildersWithAssignments.filter(
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

    return [...baseBuilders].sort((a: any, b: any) => {
      const aHasTemp = a.assignments?.some((x: AssetAssignment) =>
        isTemporaryCustodyAssignment(x)
      )
        ? 1
        : 0;
      const bHasTemp = b.assignments?.some((x: AssetAssignment) =>
        isTemporaryCustodyAssignment(x)
      )
        ? 1
        : 0;
      return bHasTemp - aHasTemp;
    });
  }, [buildersWithAssignments, builderSearchTerm]);

  const handleBuilderTransferWhole = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry) return;
    const ids = entry.assignments.map((a: AssetAssignment) => a.assignmentID);
    setSelectedAssignments(prev => [...new Set([...prev, ...ids])]);
  };

  const handleBuilderAssetToggle = (
    assignmentId: string,
    checked: boolean | string
  ) => {
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
    return entry.assignments.every((a: AssetAssignment) =>
      selectedAssignments.includes(a.assignmentID)
    );
  };

  const handleAssignmentSelection = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const getSelectedAssignmentDetails = () =>
    selectedAssignments
      .map(id => assignments.find(a => a.assignmentID === id))
      .filter(Boolean) as AssetAssignment[];

  const handleTransferClick = () => {
    if (selectedAssignments.length === 0) {
      toast.error('Please select at least one asset assignment to transfer');
      return;
    }
    const selectedData = getSelectedAssignmentDetails();
    setAssetTransferData(
      selectedData.map(a => ({
        assetId: a.asset.id,
        assignmentId: a.assignmentID,
        condition: 'Good',
        notes: '',
        imageUrls: [],
      }))
    );
    setExpandedTransferAssets(new Set(selectedData.map(a => a.asset.id)));
    setTransferTypeTransfer(false);
    setTransferTypeOffboarding(false);
    setReceivedBy(currentUser?.position?.trim() || '');
    setVerificationTag(false);
    setVerificationCondition(false);
    setVerificationConfirmSign(false);
    setNewAssignmentBuilding('');
    setNewAssignmentDepartment('');
    setNewAssignmentLocation('');
    setNewAssignmentRoom('');
    setNewAssignmentUser('');
    setShowTransferDialog(true);
  };

  const toggleTransferAssetExpansion = (assetId: string) => {
    setExpandedTransferAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleTransferConditionChange = (
    assetId: string,
    condition: string
  ) => {
    setAssetTransferData(prev =>
      prev.map(item =>
        item.assetId === assetId ? { ...item, condition } : item
      )
    );
  };

  const handleTransferNotesChange = (assetId: string, notes: string) => {
    setAssetTransferData(prev =>
      prev.map(item => (item.assetId === assetId ? { ...item, notes } : item))
    );
  };

  const handleTransferImageAdd = async (assetId: string, file: File) => {
    const data = assetTransferData.find(r => r.assetId === assetId);
    const count = data?.imageUrls?.length ?? 0;
    if (count >= MAX_CONDITION_IMAGES) {
      toast.error(`Maximum ${MAX_CONDITION_IMAGES} photos per asset`);
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ url: string }>(
        '/asset-transfers/upload-condition-photo',
        formData
      );
      const url = res?.url;
      if (url) {
        setAssetTransferData(prev =>
          prev.map(item =>
            item.assetId === assetId
              ? {
                  ...item,
                  imageUrls: [...(item.imageUrls ?? []), url],
                }
              : item
          )
        );
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to upload image');
    }
  };

  const handleTransferImageRemove = (assetId: string, index: number) => {
    setAssetTransferData(prev =>
      prev.map(item =>
        item.assetId === assetId
          ? {
              ...item,
              imageUrls: (item.imageUrls ?? []).filter((_, i) => i !== index),
            }
          : item
      )
    );
  };

  const openPhotoPreview = (images: string[]) => {
    setPhotoPreviewImages(images);
    setPhotoPreviewOpen(true);
  };

  const transferHistoryColumns: ColumnDef<TransferHistoryRecord>[] = useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        accessorFn: row => `${row.asset?.name ?? ''} ${row.asset?.code ?? ''}`,
        size: 200,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.original.asset?.name ?? '—'}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.asset?.code ?? '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'from',
        header: 'From',
        accessorFn: row => row.from?.name ?? '',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.from?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'to',
        header: 'To',
        accessorFn: row => row.to?.name ?? '',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.to?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'transferDate',
        header: 'Transfer Date',
        accessorFn: row => row.transferDate ?? '',
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.transferDate
              ? new Date(row.original.transferDate).toLocaleDateString()
              : '—'}
          </span>
        ),
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
          const isTransferred = status === 'Transferred';
          const isPending = status === 'Pending';
          const badgeClass = isDeclined
            ? 'bg-red-100 text-red-800'
            : isApproved || isTransferred
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
        id: 'action',
        header: 'Action',
        accessorFn: row => row.action ?? '',
        size: 280,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.action ?? '—'}
          </span>
        ),
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorFn: row => row.condition ?? '',
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.condition ?? '—'}
          </span>
        ),
      },
      {
        id: 'transferNotes',
        header: 'Transfer Notes',
        accessorFn: row => row.transferNotes ?? '',
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.transferNotes ?? '—'}
          </span>
        ),
      },
      {
        id: 'conditionPhotos',
        header: 'Transfer Condition Photos',
        size: 180,
        cell: ({ row }) => {
          const imgs = row.original.conditionImages ?? [];
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => openPhotoPreview(imgs)}
              disabled={imgs.length === 0}
            >
              <Images className="h-4 w-4 mr-1" />
              {imgs.length > 0 ? `View Photos (${imgs.length})` : 'No Photos'}
            </Button>
          );
        },
      },
    ],
    []
  );

  const handleTransferSubmit = async () => {
    if (!transferTypeTransfer && !transferTypeOffboarding) {
      toast.error(
        'Please select Transfer Type (Transfer or Transfer Offboarding)'
      );
      return;
    }
    if (!newAssignmentUser) {
      toast.error('Please select New Assigned User');
      return;
    }
    if (!receivedBy) {
      toast.error('Please select who received the assets');
      return;
    }
    const hasMissingCondition = assetTransferData.some(item => !item.condition);
    if (hasMissingCondition) {
      toast.error('Please select a condition for all selected assets');
      return;
    }
    if (
      !verificationTag ||
      !verificationCondition ||
      !verificationConfirmSign
    ) {
      toast.error('Please complete all verification checkboxes');
      return;
    }
    setTransferring(true);
    try {
      const transferType = transferTypeOffboarding
        ? 'Transfer Offboarding'
        : 'Transfer';
      const payload: Record<string, unknown> = {
        assetTransfers: assetTransferData.map(d => ({
          assignmentId: d.assignmentId,
          condition: d.condition,
          notes: d.notes || '',
          imageUrls: d.imageUrls ?? [],
        })),
        transferType,
        receivedBy,
        newAssignment: {
          userId: newAssignmentUser,
          departmentId: newAssignmentDepartment || null,
          locationId: newAssignmentLocation || null,
          roomId: null,
          roomName: newAssignmentRoom || null,
        },
      };
      if (verificationConfirmSign) {
        payload.processSignature = {
          signed_at: new Date().toISOString(),
        };
      }
      const res = await api.post('/asset-transfers/create-held', payload);

      toast.success(
        'Transfer has been processed. It will appear in Transfer History below.'
      );
      setShowTransferDialog(false);
      setNextStepsAssigneeUserId(newAssignmentUser || null);
      setNextStepsTransferFormId(res?.formID ?? res?.data?.formID ?? null);
      setNextStepsReturnFormId(res?.returnFormID ?? res?.data?.returnFormID ?? null);
      setShowNextStepsDialog(true);
      setSelectedAssignments([]);
      await Promise.all([fetchAssignments(), fetchTransferHistory()]);
    } catch (err: any) {
      const data = err?.data ?? err?.response?.data;
      toast.error(
        data?.message || data?.error || 'Failed to create held transfer'
      );
    } finally {
      setTransferring(false);
    }
  };

  const filteredLocationsForTransfer = (locations || []).filter(
    loc =>
      (!newAssignmentBuilding || loc.building === newAssignmentBuilding) &&
      (!newAssignmentDepartment ||
        loc.department_id === newAssignmentDepartment)
  );

  const availableRoomsForTransfer = newAssignmentLocation
    ? ((locations || [])
        .find(l => l.locationID === newAssignmentLocation)
        ?.room_areas?.filter(r => r?.room_name)
        ?.map(r => r.room_name) ?? [])
    : [];

  const filteredUsersForTransfer = (users || []).filter(
    u =>
      (!newAssignmentDepartment ||
        u.department_id === newAssignmentDepartment) &&
      (!activeCompany?.id || u.company?.id === activeCompany?.id)
  );

  const conditionOptions = [
    {
      value: 'Excellent',
      label: 'Excellent',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      value: 'Good',
      label: 'Good',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      value: 'Fair',
      label: 'Fair',
      icon: CheckCircle,
      color: 'text-yellow-600',
    },
    {
      value: 'Poor',
      label: 'Poor',
      icon: CheckCircle,
      color: 'text-orange-600',
    },
    {
      value: 'Damaged',
      label: 'Damaged',
      icon: CheckCircle,
      color: 'text-red-500',
    },
    {
      value: 'Needs Repair',
      label: 'Needs Repair',
      icon: CheckCircle,
      color: 'text-red-600',
    },
  ];

  const handleDownloadNextAccountability = async () => {
    if (!nextStepsAssigneeUserId) {
      toast.error('Unable to resolve transfer receiver for accountability download');
      return;
    }
    try {
      setDownloadingNextAccountability(true);
      const listRes = await api.get<{ forms?: AccountabilityForm[] }>(
        `/accountability-forms?userId=${nextStepsAssigneeUserId}`
      );
      const forms = Array.isArray(listRes?.forms) ? listRes.forms : [];
      const activeForms = forms.filter(
        f => f.status !== 'Disabled' && f.status !== 'Declined'
      );
      if (activeForms.length === 0) {
        toast.error('No active accountability form found for the receiver');
        return;
      }
      activeForms.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const target = activeForms[0];
      if (!target?.id) {
        toast.error('Could not determine accountability form to download');
        return;
      }
      const formRes = await api.get<{ form?: AccountabilityForm }>(
        `/accountability-forms/${target.id}`
      );
      const form = formRes?.form;
      if (!form) {
        toast.error('Could not load accountability form details');
        return;
      }
      const pdfBlob = await generateAccountabilityFormPDF(form, currentUser);
      const fileName = `Asset_Accountability_Form_${form.formNumber || form.id}_${Date.now()}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Accountability form downloaded successfully');
    } catch (error) {
      console.error('Failed to download accountability form:', error);
      toast.error('Failed to download accountability form');
    } finally {
      setDownloadingNextAccountability(false);
    }
  };

  const handleDownloadProcessorReturnForm = async () => {
    const processorId = currentUser?.id;
    if (!processorId) {
      toast.error('Unable to resolve processor account for return form download');
      return;
    }
    try {
      setDownloadingProcessorReturnForm(true);
      const response = await api.get<{ assetReturnForms?: AssetReturnFormBatch[] }>(
        '/asset-returns'
      );
      const batches = Array.isArray(response?.assetReturnForms)
        ? response.assetReturnForms
        : [];
      if (batches.length === 0) {
        toast.error('No return forms found for processor');
        return;
      }
      const exact = nextStepsReturnFormId
        ? batches.find(b => b.formID === nextStepsReturnFormId)
        : null;
      const sorted = [...batches].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const target = exact ?? sorted[0];
      const data = buildReturnDataForPDFFromBatch(target);
      if (!data) {
        toast.error('Cannot generate PDF for the selected return form');
        return;
      }
      const blob = await generateAssetReturnPDF(data);
      const fileName = `return-form-${target.form_number ?? 'processor'}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Return form downloaded successfully');
    } catch (error) {
      console.error('Failed to download processor return form:', error);
      toast.error('Failed to download processor return form');
    } finally {
      setDownloadingProcessorReturnForm(false);
    }
  };

  const handleDownloadProcessorTransferForm = async () => {
    const processorId = currentUser?.id;
    if (!processorId) {
      toast.error('Unable to resolve processor account for transfer form download');
      return;
    }
    try {
      setDownloadingProcessorTransferForm(true);
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
        data?: { assetTransferForms?: AssetTransferFormBatch[] };
      }>(`/asset-transfers/user/${processorId}`);
      const batches =
        response?.assetTransferForms ?? response?.data?.assetTransferForms ?? [];
      if (!Array.isArray(batches) || batches.length === 0) {
        toast.error('No transfer forms found for processor');
        return;
      }
      const exact = nextStepsTransferFormId
        ? batches.find(b => b.formID === nextStepsTransferFormId)
        : null;
      const sorted = [...batches].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const target = exact ?? sorted[0];
      const data = buildTransferDataForPDFFromBatch(target);
      if (!data) {
        toast.error('Cannot generate PDF for the selected transfer form');
        return;
      }
      const blob = await generateAssetTransferPDF(data);
      const fileName = target.form_number
        ? `Asset_Transfer_Form_${target.form_number}_${Date.now()}.pdf`
        : `Asset_Transfer_Form_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Transfer form downloaded successfully');
    } catch (error) {
      console.error('Failed to download processor transfer form:', error);
      toast.error('Failed to download processor transfer form');
    } finally {
      setDownloadingProcessorTransferForm(false);
    }
  };

  const handleDownloadAllForms = async () => {
    try {
      setDownloadingAllForms(true);
      await handleDownloadNextAccountability();
      await handleDownloadProcessorReturnForm();
      await handleDownloadProcessorTransferForm();
      toast.success('Download all actions completed');
    } finally {
      setDownloadingAllForms(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = !q
      ? assignments.filter(a => a.status === 'Active')
      : assignments.filter(
          assignment =>
            assignment.status === 'Active' &&
            (assignment.asset.name?.toLowerCase().includes(q) ||
              assignment.asset.code?.toLowerCase().includes(q) ||
              assignment.department?.name?.toLowerCase().includes(q) ||
              assignment.user.first_name?.toLowerCase().includes(q) ||
              assignment.user.last_name?.toLowerCase().includes(q) ||
              assignment.user.email?.toLowerCase().includes(q) ||
              `${assignment.user.first_name || ''} ${assignment.user.last_name || ''}`
                .trim()
                .toLowerCase()
                .includes(q))
        );
    return base
      .filter(a => !assignmentIdsInBuilders.has(a.assignmentID))
      .sort((a, b) => {
        const aTemp = isTemporaryCustodyAssignment(a) ? 1 : 0;
        const bTemp = isTemporaryCustodyAssignment(b) ? 1 : 0;
        return bTemp - aTemp;
      });
  }, [assignments, searchTerm, assignmentIdsInBuilders]);

  function isTemporaryCustodyAssignment(assignment: AssetAssignment) {
    return Boolean(
      assignment.assignment_notes
        ?.toLowerCase()
        .includes('assigned via asset return (assign to processor)')
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={ArrowRightLeft}
          title="Assets Transfer"
          description="Transfer assets between users, departments, and locations"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchAssignments();
              fetchAssetBuilders();
              fetchTransferHistory();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Asset Selection / Asset Built Tabs */}
          <div className="xl:col-span-2">
            <Tabs defaultValue="select-assets" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gray-100 p-1.5 h-auto">
                <TabsTrigger
                  value="select-assets"
                  className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Package className="h-4 w-4" />
                  Select Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="asset-built"
                  className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
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
                      Select Assets to Transfer
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignments.length} assigned
                      </Badge>
                    </CardTitle>

                    <div className="relative mt-4 w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by asset name, asset code, department, or assigned to..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 w-full border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 -mr-6 pr-6">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="h-8 w-32 animate-pulse rounded bg-red-100"></div>
                          <span className="ml-3 text-gray-600">
                            Loading assignments...
                          </span>
                        </div>
                      ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">
                            No active asset assignments found
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Try adjusting your search criteria
                          </p>
                        </div>
                      ) : (
                        filteredAssignments.map(assignment => (
                          <div
                            key={assignment.assignmentID}
                            className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                              hasPermission('Asset Transfer', 'create') &&
                              hasPermission('Asset Transfer', 'edit')
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
                              hasPermission('Asset Transfer', 'create') &&
                              hasPermission('Asset Transfer', 'edit') &&
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
                                    !hasPermission(
                                      'Asset Transfer',
                                      'create'
                                    ) ||
                                    !hasPermission('Asset Transfer', 'edit')
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
                                      •
                                    </span>
                                  )}
                                  {assignment.department && (
                                    <span>{assignment.department.name}</span>
                                  )}
                                  {assignment.location && (
                                    <span className="ml-2 text-gray-400">
                                      •
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
                                  {isTemporaryCustodyAssignment(assignment) && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-amber-300 bg-amber-50 text-amber-800"
                                    >
                                      Temporary Custody
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-red-100 text-red-800 border-red-200"
                                  >
                                    {assignment.status}
                                  </Badge>
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

                            {selectedAssignments.includes(
                              assignment.assignmentID
                            ) && (
                              <div className="absolute inset-0 bg-red-500/5 rounded-xl pointer-events-none"></div>
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
                              selected for transfer
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
                      Transfer whole builder or select individual assets to
                      transfer.
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
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-32 animate-pulse rounded bg-red-100" />
                        <span className="ml-3 text-gray-600">
                          Loading builders...
                        </span>
                      </div>
                    ) : filteredAssignedBuilders.length === 0 ? (
                      <div className="text-center py-12">
                        <Boxes className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          No assigned asset builders to transfer
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Asset builders that have been assigned will appear
                          here
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
                                            (a: AssetAssignment) =>
                                              a.asset?.code
                                          )
                                          .filter(Boolean)
                                          .map((code: string, idx: number) => (
                                            <li
                                              key={idx}
                                              className="border border-gray-200 rounded px-2 py-1 bg-gray-50 -ml-1 pl-3"
                                            >
                                              {code}
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
                                            : handleBuilderTransferWhole(
                                                builder.builderID
                                              )
                                        }
                                      >
                                        {isFullySelected
                                          ? 'Deselect All'
                                          : 'Transfer Whole'}
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
                                        Select which assets to transfer
                                      </p>
                                      <div className="space-y-2 max-h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        <ul className="space-y-2 list-none pl-0">
                                          {builderAssignments.map(
                                            (a: AssetAssignment) => (
                                              <li
                                                key={a.assignmentID}
                                                className={cn(
                                                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer min-w-0 pl-4 relative before:content-["•"] before:absolute before:left-2 before:font-bold before:text-gray-500',
                                                  selectedAssignments.includes(
                                                    a.assignmentID
                                                  )
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                )}
                                                onClick={() =>
                                                  hasPermission(
                                                    'Asset Transfer',
                                                    'create'
                                                  ) &&
                                                  hasPermission(
                                                    'Asset Transfer',
                                                    'edit'
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
                                                      'Asset Transfer',
                                                      'create'
                                                    ) ||
                                                    !hasPermission(
                                                      'Asset Transfer',
                                                      'edit'
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
                                                  {isTemporaryCustodyAssignment(
                                                    a
                                                  ) && (
                                                    <Badge
                                                      variant="outline"
                                                      className="mt-1 text-xs border-amber-300 bg-amber-50 text-amber-800"
                                                    >
                                                      Temporary Custody
                                                    </Badge>
                                                  )}
                                                </div>
                                                <span className="text-sm text-gray-600 flex-shrink-0 truncate max-w-[100px]">
                                                  {a.user?.first_name}{' '}
                                                  {a.user?.last_name}
                                                </span>
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

          {/* Transfer Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowRightLeft className="h-5 w-5 text-red-600" />
                  </div>
                  Transfer Asset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-gray-600">
                  Select assets above, then click Transfer Asset to confirm and
                  complete the transfer flow.
                </div>
                <Button
                  onClick={handleTransferClick}
                  disabled={
                    transferring ||
                    selectedAssignments.length === 0 ||
                    !hasPermission('Asset Transfer', 'create') ||
                    !hasPermission('Asset Transfer', 'edit')
                  }
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    Transfer {selectedAssignments.length} Asset
                    {selectedAssignments.length !== 1 ? 's' : ''}
                  </div>
                </Button>
                {selectedAssignments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select asset assignments above to enable transfer
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transfer History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowRightLeft className="h-5 w-5 text-purple-600" />
              </div>
              Transfer History
              <Badge variant="secondary" className="ml-auto">
                {transferHistory.length} transfers
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {transferHistoryLoading ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 h-10 w-40 animate-pulse rounded bg-purple-100" />
                <p className="text-gray-500 text-lg">
                  Loading transfer history...
                </p>
              </div>
            ) : transferHistory.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No transfer history found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Completed transfers will appear here
                </p>
              </div>
            ) : (
              <DataTable<TransferHistoryRecord>
                tableId="transfer-history"
                data={transferHistory}
                columns={transferHistoryColumns}
                searchPlaceholder="Search transfer history..."
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No matching transfers</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Transfer Condition Photos Preview Dialog */}
        <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
          <AppDialogFrame className="max-w-2xl max-h-[90vh] overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-2">
                  <Images className="h-6 w-6 shrink-0 text-white" />
                  Transfer Condition Photos
                </span>
              }
              description="Preview of condition photos captured during transfer"
            />
            <AppDialogBody className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
                {photoPreviewImages.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-purple-400"
                  >
                    <img
                      src={url}
                      alt={`Condition photo ${idx + 1}`}
                      className="h-40 w-full object-cover"
                    />
                  </a>
                ))}
              </div>
              {photoPreviewImages.length === 0 && (
                <p className="py-8 text-center text-gray-500">No photos available</p>
              )}
            </AppDialogBody>
          </AppDialogFrame>
        </Dialog>

        {/* Asset Transfer Confirmation Dialog */}
        <Dialog
          open={showTransferDialog}
          onOpenChange={open => {
            setShowTransferDialog(open);
            if (!open) {
              setVerificationTag(false);
              setVerificationCondition(false);
              setVerificationConfirmSign(false);
              setTransferTypeTransfer(false);
              setTransferTypeOffboarding(false);
              setReceivedBy('');
            }
          }}
        >
          <AppDialogFrame className="max-w-2xl w-[85vw] sm:w-[90vw] md:w-full max-h-[90vh] overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <ArrowRightLeft className="h-6 w-6 shrink-0 text-white" />
                  Asset Transfer Confirmation
                </span>
              }
              description="Assess condition and complete transfer details for each asset."
            />

            <AppDialogBody className="max-h-[min(50vh,520px)] min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden sm:space-y-6">
              <div className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
                Selected Assets: {assetTransferData.length}
              </div>
              {/* Transfer Type - only Transfer and Transfer Offboarding */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Label className="text-sm font-semibold text-slate-800 uppercase">
                  Transfer Type <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Select one (required)
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 min-w-[140px]',
                      transferTypeTransfer
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Checkbox
                      checked={transferTypeTransfer}
                      onCheckedChange={c => setTransferTypeTransfer(Boolean(c))}
                    />
                    <span className="text-sm font-medium">Transfer</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 min-w-[140px]',
                      transferTypeOffboarding
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Checkbox
                      checked={transferTypeOffboarding}
                      onCheckedChange={c =>
                        setTransferTypeOffboarding(Boolean(c))
                      }
                    />
                    <span className="text-sm font-medium">
                      Transfer Offboarding
                    </span>
                  </label>
                </div>
              </div>

              {/* Asset Cards */}
              {assetTransferData.map((td, idx) => {
                const assignment = assignments.find(
                  a => a.assignmentID === td.assignmentId
                );
                const isExpanded = expandedTransferAssets.has(td.assetId);
                return (
                  <div
                    key={td.assignmentId}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Package className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {assignment?.asset.name}
                          </h4>
                          <p className="text-sm text-slate-500 font-mono">
                            {assignment?.asset.code}
                          </p>
                          {assignment &&
                            isTemporaryCustodyAssignment(assignment) && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-xs border-amber-300 bg-amber-50 text-amber-800"
                              >
                                Temporary Custody
                              </Badge>
                            )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTransferAssetExpansion(td.assetId)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="space-y-4 pt-2 border-t border-slate-100">
                        <div>
                          <Label className="text-sm font-semibold text-slate-700">
                            Condition
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {conditionOptions.map(opt => {
                              const Icon = opt.icon;
                              const sel = td.condition === opt.value;
                              return (
                                <div
                                  key={opt.value}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded-lg cursor-pointer border-2',
                                    sel
                                      ? 'border-red-500 bg-red-50'
                                      : 'border-slate-200 hover:border-slate-300'
                                  )}
                                  onClick={() =>
                                    handleTransferConditionChange(
                                      td.assetId,
                                      opt.value
                                    )
                                  }
                                >
                                  <Icon
                                    className={cn(
                                      'h-4 w-4',
                                      sel ? opt.color : 'text-slate-400'
                                    )}
                                  />
                                  <span className="text-sm font-medium">
                                    {opt.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Transfer Notes (optional)
                          </Label>
                          <Textarea
                            placeholder="Add notes..."
                            value={td.notes}
                            onChange={e =>
                              handleTransferNotesChange(
                                td.assetId,
                                e.target.value
                              )
                            }
                            className="mt-1 border-slate-200"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Transfer Condition Photos (up to{' '}
                            {MAX_CONDITION_IMAGES})
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(td.imageUrls ?? []).map((url, i) => (
                              <div key={url} className="relative group">
                                <img
                                  src={url}
                                  alt=""
                                  className="h-20 w-20 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTransferImageRemove(td.assetId, i)
                                  }
                                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            {(td.imageUrls?.length ?? 0) <
                              MAX_CONDITION_IMAGES && (
                              <label className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 cursor-pointer">
                                <input
                                  type="file"
                                  accept={VALID_IMAGE_TYPES.join(',')}
                                  className="hidden"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f)
                                      handleTransferImageAdd(td.assetId, f);
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

              {/* New Assignment Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <Label className="text-sm font-semibold text-slate-800 uppercase">
                  New Assignment Details
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Building</Label>
                    <Select
                      value={newAssignmentBuilding}
                      onValueChange={v => {
                        setNewAssignmentBuilding(v);
                        setNewAssignmentLocation('');
                        setNewAssignmentRoom('');
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map(b => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Select
                      value={newAssignmentDepartment}
                      onValueChange={v => {
                        setNewAssignmentDepartment(v);
                        setNewAssignmentLocation('');
                        setNewAssignmentRoom('');
                        setNewAssignmentUser('');
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose department" />
                      </SelectTrigger>
                      <SelectContent>
                        {(departments || []).map(d => (
                          <SelectItem
                            key={d.departmentID}
                            value={d.departmentID}
                          >
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Select
                      value={newAssignmentLocation}
                      onValueChange={v => {
                        setNewAssignmentLocation(v);
                        setNewAssignmentRoom('');
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose location" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredLocationsForTransfer.map(l => (
                          <SelectItem key={l.locationID} value={l.locationID}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Room / Area</Label>
                    <Select
                      value={newAssignmentRoom}
                      onValueChange={setNewAssignmentRoom}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose room" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoomsForTransfer.map(r => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Assigned User *</Label>
                  <Select
                    value={newAssignmentUser}
                    onValueChange={setNewAssignmentUser}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose user (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsersForTransfer.map(u => (
                        <SelectItem key={u.userID} value={u.userID}>
                          {u.first_name} {u.last_name} - {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Received by - required */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Label className="text-sm font-semibold text-slate-800 uppercase">
                  Received by <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Auto-filled from your profile position; edit if needed.
                </p>
                <Input
                  className="mt-3 border-slate-200"
                  value={receivedBy}
                  onChange={e => setReceivedBy(e.target.value)}
                  placeholder="Position or role"
                />
              </div>

              {/* Verification */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <Label className="text-sm font-semibold text-slate-800 uppercase block">
                  Verification
                </Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={verificationTag}
                    onCheckedChange={c => setVerificationTag(Boolean(c))}
                  />
                  <span className="text-sm">
                    All assets are tagged and accounted for
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={verificationCondition}
                    onCheckedChange={c => setVerificationCondition(Boolean(c))}
                  />
                  <span className="text-sm">
                    Condition of each asset has been verified
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={verificationConfirmSign}
                    onCheckedChange={c =>
                      setVerificationConfirmSign(Boolean(c))
                    }
                  />
                  <span className="text-sm">
                    I sign this form confirming and approving this asset
                    transfer
                  </span>
                </label>
                <p className="text-sm text-slate-600">
                  All selected assets will be transferred.
                </p>
              </div>
            </AppDialogBody>

            <AppDialogChromeFooter className="justify-end">
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferSubmit}
                disabled={
                  transferring ||
                  !newAssignmentUser ||
                  !receivedBy ||
                  (!transferTypeTransfer && !transferTypeOffboarding) ||
                  assetTransferData.some(t => !t.condition) ||
                  !verificationTag ||
                  !verificationCondition ||
                  !verificationConfirmSign
                }
                className="bg-red-500 hover:bg-red-600"
              >
                {transferring ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-white/40" />
                    Transferring...
                  </div>
                ) : (
                  <>
                    Transfer {assetTransferData.length} Asset
                    {assetTransferData.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={showNextStepsDialog} onOpenChange={setShowNextStepsDialog}>
          <AppDialogFrame className="max-w-xl w-[92vw] sm:w-full">
            <AppDialogGradientHeader
              title="Next Steps"
              description="Transfer processed successfully."
            />
            <AppDialogBody className="space-y-3">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                <li>
                  Download this new accountability of the receiver of the asset
                  and make the user sign it.
                </li>
                <li>
                  Download the processor return form, make the Department Head
                  sign it, then upload it to the system after signing.
                </li>
                <li>
                  Download the processor transfer form, make the Department Head
                  sign it, then upload it to the system after signing.
                </li>
                <li>
                  After the user signs it, make sure the user also signs the
                  accountability form in Asset Management.
                </li>
                <li>
                  After your Department Head approves, upload both scanned wet
                  signed forms in the corresponding Forms menu pages: Return
                  Form and Transfer Form.
                </li>
                <li>
                  After that, go to HR and give the user asset accountability
                  for 201 file copy.
                </li>
              </ol>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end">
              <Button
                variant="outline"
                onClick={handleDownloadAllForms}
                disabled={downloadingAllForms}
              >
                {downloadingAllForms ? 'Downloading all...' : 'Download All Forms'}
              </Button>
              <Button
                onClick={() => {
                  setShowNextStepsDialog(false);
                  setNextStepsAssigneeUserId(null);
                  setNextStepsTransferFormId(null);
                  setNextStepsReturnFormId(null);
                }}
              >
                Continue
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Crown,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { ASSET_SEARCH_COLUMNS_BASIC } from '@/utils/assetSearchColumns';
import { isIntangibleAssignedToUser } from '@/utils/intangibleAssets';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  type AssetReturnFormBatch,
  type AssetTransferFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import {
  getTransferFormUiStatus,
  formatTransferFormUiStatus,
  type TransferFormUiStatus,
} from '@/utils/transferFormStatus';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Shimmer } from '@/components/ui/shimmer';

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

interface TransferRequestRow {
  formID: string;
  form_number: string;
  request_date: string;
  status: TransferFormUiStatus;
  target_user?: string;
  asset_count: number;
  /** Comma-separated asset names (same pattern as My return requests). */
  assets_label: string;
}

interface SubmitTransferRequestResponse {
  message: string;
  formID: string;
  form_number?: string | null;
  returnFormID?: string | null;
  return_form_number?: string | null;
}

function isTransferBatchInProgress(batch: AssetTransferFormBatch): boolean {
  if (!batch.formID) return false;
  if (batch.declined_at) return false;
  if (batch.executed_at) return false;
  return true;
}

function isReturnBatchInProgress(batch: AssetReturnFormBatch): boolean {
  if (!batch.formID) return false;
  if (batch.processor_declined_at) return false;
  // A processor-initiated (hold) form sets process_signed_at at creation, so it
  // stays in progress until the dept head approves (which executes the return).
  // Owner-submitted returns only set process_signed_at after dept approval.
  if (batch.process_signed_at && batch.dept_head_signed_at) return false;
  if (
    batch.returns?.some(
      r => (r as { status?: string }).status === 'Declined by dept head'
    )
  )
    return false;
  return true;
}

function getTransferStatusBadgeClass(status: string): string {
  if (status === 'completed')
    return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'approved') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'declined')
    return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

function getMyTransferAssetSummary(
  returns: AssetTransferFormBatch['returns']
): string {
  if (!returns?.length) return '-';
  const names = returns
    .map(r => r.assignment?.asset?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return '-';
  return (
    names.slice(0, 3).join(', ') +
    (names.length > 3 ? ` +${names.length - 3} more` : '')
  );
}

const myTransferRequestColumns: ColumnDef<TransferRequestRow>[] = [
  {
    id: 'form_number',
    header: 'Form / Request',
    accessorFn: row =>
      row.form_number !== '-'
        ? row.form_number
        : `Transfer ${new Date(row.request_date).toLocaleDateString()}`,
    size: 220,
    cell: ({ row }) => {
      const r = row.original;
      const label =
        r.form_number !== '-'
          ? r.form_number
          : `Transfer ${new Date(r.request_date).toLocaleDateString()}`;
      return <span className="font-medium">{label}</span>;
    },
  },
  {
    id: 'created',
    header: 'Created',
    accessorFn: row => new Date(row.request_date).toLocaleDateString(),
    size: 130,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.request_date).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: row => formatTransferFormUiStatus(row.status),
    size: 140,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`text-xs ${getTransferStatusBadgeClass(row.original.status)}`}
      >
        {formatTransferFormUiStatus(row.original.status)}
      </Badge>
    ),
  },
  {
    id: 'transfer_to',
    header: 'Transfer To',
    accessorFn: row => row.target_user ?? '',
    size: 200,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.target_user ?? '-'}
      </span>
    ),
  },
  {
    id: 'assets',
    header: 'Assets',
    accessorFn: row => row.assets_label,
    size: 320,
    cell: ({ row }) => (
      <span
        className="text-muted-foreground"
        title={row.original.assets_label}
      >
        {row.original.assets_label}
      </span>
    ),
  },
];

export default function AssetTransferRequest() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    TransferRequestRow[]
  >([]);
  const [myTransferBatches, setMyTransferBatches] = useState<
    AssetTransferFormBatch[]
  >([]);
  const [myReturnBatches, setMyReturnBatches] = useState<AssetReturnFormBatch[]>(
    []
  );
  const [departments, setDepartments] = useState<
    { departmentID: string; name: string }[]
  >([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const TRANSFER_TYPE_OPTIONS = [
    { value: 'Transfer', label: 'Transfer' },
    { value: 'Transfer Offboarding', label: 'Transfer Offboarding' },
  ] as const;
  const [transferType, setTransferType] = useState<string>('Transfer');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [targetUser, setTargetUser] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [expandedBuilderForSelect, setExpandedBuilderForSelect] = useState<
    string | null
  >(null);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [selectedIntangibleAssetIds, setSelectedIntangibleAssetIds] = useState<string[]>([]);
  const [intangibleSearchTerm, setIntangibleSearchTerm] = useState('');
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const pendingSubmitActionRef = useRef<(() => Promise<void>) | null>(null);
  const [confirmTransferWhenApproved, setConfirmTransferWhenApproved] =
    useState(false);
  const [confirmSigningTransfer, setConfirmSigningTransfer] = useState(false);

  const digitalSignature =
    (currentUser as { digitalSignature?: string | null })?.digitalSignature || '';

  const targetUserName = useMemo(() => {
    const selectedUser = users.find(
      user => (user.userID || user.id) === targetUser
    );

    return selectedUser
      ? `${selectedUser.first_name} ${selectedUser.last_name}`
      : 'the selected user';
  }, [targetUser, users]);

  const selectedIntangibleAssetsForConfirm = useMemo(
    () =>
      intangibleAssets.filter(a => selectedIntangibleAssetIds.includes(a.id)),
    [intangibleAssets, selectedIntangibleAssetIds]
  );

  const myIntangibleAssets = useMemo(
    () =>
      intangibleAssets.filter(a => isIntangibleAssignedToUser(a, currentUser?.id)),
    [intangibleAssets, currentUser]
  );

  const filteredIntangibleAssets = useMemo(() => {
    if (!intangibleSearchTerm.trim()) return myIntangibleAssets;
    const q = intangibleSearchTerm.toLowerCase();
    return myIntangibleAssets.filter((asset: any) =>
      (asset.name?.toLowerCase().includes(q)) ||
      (asset.description?.toLowerCase().includes(q)) ||
      (asset.remarks?.toLowerCase().includes(q)) ||
      (asset.type?.toLowerCase().includes(q)) ||
      (asset.code?.toLowerCase().includes(q))
    );
  }, [myIntangibleAssets, intangibleSearchTerm]);

  const handleIntangibleAssetSelection = (
    id: string,
    checked: boolean | string
  ) => {
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedIntangibleAssetIds(prev => [...prev, id]);
    } else {
      setSelectedIntangibleAssetIds(prev => prev.filter(x => x !== id));
    }
  };

  const confirmTransferMessage = `You are about to submit a transfer request for ${selectedAssignments.length} asset(s)${selectedIntangibleAssetIds.length > 0 ? ` and ${selectedIntangibleAssetIds.length} intangible asset(s)` : ''} to ${targetUserName}. The form will be sent to your department head for approval. Do you want to continue?`;

  const selectedAssignmentsForConfirm = useMemo(
    () =>
      assignments.filter(assignment =>
        selectedAssignments.includes(assignment.assignmentID)
      ),
    [assignments, selectedAssignments]
  );

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/asset-assignments/me');
      const list = response.assignments || [];
      const activeOnly = list.filter(
        (a: AssetAssignment) => a.status === 'Active'
      );
      setAssignments(activeOnly);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || response || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchTransferRequests = async () => {
    if (!currentUser?.id) {
      setMyTransferBatches([]);
      setTransferRequests([]);
      return;
    }
    try {
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
        data?: { assetTransferForms?: AssetTransferFormBatch[] };
      }>(`/asset-transfers/user/${currentUser.id}`);
      const batches =
        response.assetTransferForms ?? response.data?.assetTransferForms ?? [];
      const mine = batches.filter(batch => batch.user_id === currentUser.id);
      const rows: TransferRequestRow[] = mine.map((b: AssetTransferFormBatch) => {
        const status = getTransferFormUiStatus(b);
        const targetName = b.new_assigned_user
          ? `${b.new_assigned_user.first_name || ''} ${b.new_assigned_user.last_name || ''}`.trim()
          : undefined;
        const returns = Array.isArray(b.returns) ? b.returns : [];
        return {
          formID: b.formID,
          form_number: b.form_number || '-',
          request_date: b.created_at || new Date().toISOString(),
          status,
          target_user: targetName,
          asset_count: returns.length,
          assets_label: getMyTransferAssetSummary(returns),
        };
      });
      setMyTransferBatches(mine);
      setTransferRequests(rows);
    } catch (error) {
      console.error('Failed to fetch transfer requests:', error);
      setMyTransferBatches([]);
      setTransferRequests([]);
    }
  };

  const fetchReturnRequests = async () => {
    if (!currentUser?.id) {
      setMyReturnBatches([]);
      return;
    }
    try {
      const response = await api.get<{
        assetReturnForms?: AssetReturnFormBatch[];
        data?: { assetReturnForms?: AssetReturnFormBatch[] };
      }>(`/asset-returns/user/${currentUser.id}`);
      const batches =
        response.assetReturnForms ?? response.data?.assetReturnForms ?? [];
      setMyReturnBatches(
        batches.filter(batch => batch.user_id === currentUser.id)
      );
    } catch (error) {
      console.error('Failed to fetch return requests:', error);
      setMyReturnBatches([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const filteredUsers = response.users.filter(
        (user: any) =>
          user.company_id === currentUser?.company_id &&
          user.userID !== currentUser?.id &&
          user.id !== currentUser?.id
      );
      setUsers(filteredUsers || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
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
      await Promise.all([
        fetchAssignments(),
        fetchTransferRequests(),
        fetchReturnRequests(),
        fetchUsers(),
        fetchDepartments(),
        fetchAssetBuilders(),
        fetchIntangibleAssets(),
      ]);
      setLoading(false);
    };
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const assignmentIdsPendingTransferRequest = useMemo(() => {
    const ids = new Set<string>();
    for (const batch of myTransferBatches) {
      if (!isTransferBatchInProgress(batch)) continue;
      for (const r of batch.returns ?? []) {
        const aid = r.assignment_id ?? r.assignment?.assignmentID;
        if (aid) ids.add(String(aid));
      }
    }
    return ids;
  }, [myTransferBatches]);

  const assignmentIdsPendingReturnRequest = useMemo(() => {
    const ids = new Set<string>();
    for (const batch of myReturnBatches) {
      if (!isReturnBatchInProgress(batch)) continue;
      for (const r of batch.returns ?? []) {
        const aid = r.assignment_id ?? r.assignment?.assignmentID;
        if (aid) ids.add(String(aid));
      }
    }
    return ids;
  }, [myReturnBatches]);

  useEffect(() => {
    setSelectedAssignments(prev =>
      prev.filter(
        id =>
          !assignmentIdsPendingTransferRequest.has(id) &&
          !assignmentIdsPendingReturnRequest.has(id)
      )
    );
  }, [assignmentIdsPendingTransferRequest, assignmentIdsPendingReturnRequest]);

  const handleAssignmentSelection = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (
      assignmentIdsPendingTransferRequest.has(assignmentId) ||
      assignmentIdsPendingReturnRequest.has(assignmentId)
    ) {
      return;
    }
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleRequestSubmitClick = () => {
    if (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) {
      toast.error('Please select at least one asset or intangible asset to request transfer');
      return;
    }
    if (!selectedDepartmentId) {
      toast.error('Please select a department');
      return;
    }
    if (!targetUser) {
      toast.error('Please select a target user for the transfer');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmitRequest = async () => {
    setSubmitting(true);
    try {
      await api.post<SubmitTransferRequestResponse>(
        '/asset-transfers/submit-request',
        {
          assignmentIds: selectedAssignments,
          departmentId: selectedDepartmentId,
          transferToUserId: targetUser,
          notes: transferNotes,
          transferType,
          digitalSignature,
          intangibleAssetIds: selectedIntangibleAssetIds,
        }
      );

      toast.success(
        `Transfer request submitted for ${selectedAssignments.length} asset(s)${selectedIntangibleAssetIds.length > 0 ? ` and ${selectedIntangibleAssetIds.length} intangible asset(s)` : ''}. It will be sent to your department head for approval.`
      );
      toast.success(
        `Return request submitted for ${selectedAssignments.length} asset(s)${selectedIntangibleAssetIds.length > 0 ? ` and ${selectedIntangibleAssetIds.length} intangible asset(s)` : ''}. It will also be sent to your department head for approval.`
      );
      setShowConfirmDialog(false);
      setConfirmTransferWhenApproved(false);
      setConfirmSigningTransfer(false);
      setSelectedAssignments([]);
      setSelectedIntangibleAssetIds([]);
      setTransferNotes('');
      setTargetUser('');
      setSelectedDepartmentId('');
      await Promise.all([fetchAssignments(), fetchTransferRequests()]);
    } catch (error: any) {
      console.error('Failed to submit transfer request:', error);
      const data = error?.data ?? error?.response?.data;
      const base = data?.error || 'Failed to submit transfer request';
      const errMsg = data?.details ? `${base}: ${data.details}` : base;
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const assignedBuilders = useMemo(() => {
    return assetBuilders.filter(
      (b: any) =>
        b.status === 'Assigned' && b.items?.length > 0 && Array.isArray(b.items)
    );
  }, [assetBuilders]);

  const buildersWithAssignments = useMemo(() => {
    return assignedBuilders
      .map((builder: any) => {
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
      })
      .filter(
        (entry: { builder: any; assignments: AssetAssignment[] }) =>
          entry.assignments.length > 0
      );
  }, [assignedBuilders, assignments]);

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

  const assignmentIdsInBuilders = useMemo(
    () =>
      new Set(
        buildersWithAssignments.flatMap(({ assignments: b }) =>
          b.map((a: AssetAssignment) => a.assignmentID)
        )
      ),
    [buildersWithAssignments]
  );

  const filteredAssignments = useMemo(() => {
    const base = assignments
      .filter(assignment => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        if (searchColumn === 'all') {
          return (
            assignment.asset.name.toLowerCase().includes(q) ||
            assignment.asset.code.toLowerCase().includes(q)
          );
        }
        const assetField = searchColumn === 'id' ? 'code' : searchColumn;
        const val = (assignment.asset as any)[assetField];
        return val != null && String(val).toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const nameA = a.asset.name.toLowerCase();
        const nameB = b.asset.name.toLowerCase();
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    return base.filter(a => !assignmentIdsInBuilders.has(a.assignmentID));
  }, [assignments, searchTerm, searchColumn, sortOrder, assignmentIdsInBuilders]);

  const selectableAssignmentsInAssetTab = useMemo(
    () =>
      filteredAssignments.filter(
        assignment =>
          !assignmentIdsPendingTransferRequest.has(assignment.assignmentID) &&
          !assignmentIdsPendingReturnRequest.has(assignment.assignmentID)
      ),
    [
      filteredAssignments,
      assignmentIdsPendingTransferRequest,
      assignmentIdsPendingReturnRequest,
    ]
  );

  const handleBuilderTransferWhole = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry) return;
    const ids = entry.assignments
      .map((a: AssetAssignment) => a.assignmentID)
      .filter(
        id =>
          !assignmentIdsPendingTransferRequest.has(id) &&
          !assignmentIdsPendingReturnRequest.has(id)
      );
    setSelectedAssignments(prev => [...new Set([...prev, ...ids])]);
  };

  const handleBuilderAssetToggle = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (
      assignmentIdsPendingTransferRequest.has(assignmentId) ||
      assignmentIdsPendingReturnRequest.has(assignmentId)
    ) {
      return;
    }
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
    const eligibleAssignments = entry.assignments.filter(
      (a: AssetAssignment) =>
        !assignmentIdsPendingTransferRequest.has(a.assignmentID) &&
        !assignmentIdsPendingReturnRequest.has(a.assignmentID)
    );
    if (eligibleAssignments.length === 0) return false;
    return eligibleAssignments.every((a: AssetAssignment) =>
      selectedAssignments.includes(a.assignmentID)
    );
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={ArrowRightLeft}
          title="Transfer asset"
          description="Request to transfer your assigned assets to another user"
        >
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <Tabs defaultValue="select-assets" className="w-full">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-3 mb-4'}>
                <TabsTrigger
                  value="select-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Package className="h-4 w-4" />
                  Asset
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
                <TabsTrigger
                  value="intangible-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Layers className="h-4 w-4" />
                  Intangible Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {myIntangibleAssets.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select-assets" className="mt-0">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Package className="h-5 w-5 text-red-600" />
                      </div>
                      Select Assets to Request Transfer
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignments.length} assigned
                      </Badge>
                    </CardTitle>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                      <SearchWithColumnFilter
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search assets..."
                        columnOptions={ASSET_SEARCH_COLUMNS_BASIC}
                        searchColumn={searchColumn}
                        onSearchColumnChange={setSearchColumn}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectableAssignmentsInAssetTab.length === 0}
                          onClick={() => {
                            const allSelectableSelected =
                              selectableAssignmentsInAssetTab.length > 0 &&
                              selectableAssignmentsInAssetTab.every(assignment =>
                                selectedAssignments.includes(
                                  assignment.assignmentID
                                )
                              );
                            if (allSelectableSelected) {
                              setSelectedAssignments([]);
                            } else {
                              setSelectedAssignments(
                                selectableAssignmentsInAssetTab.map(
                                  assignment => assignment.assignmentID
                                )
                              );
                            }
                          }}
                          className="whitespace-nowrap hover:bg-gray-200"
                        >
                          {selectableAssignmentsInAssetTab.length > 0 &&
                          selectableAssignmentsInAssetTab.every(assignment =>
                            selectedAssignments.includes(
                              assignment.assignmentID
                            )
                          )
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                        <Select
                          value={viewMode}
                          onValueChange={(value: 'list' | 'grid') =>
                            setViewMode(value)
                          }
                        >
                          <SelectTrigger className="w-24 border-gray-200 focus:border-red-500 focus:ring-red-500">
                            <SelectValue placeholder="View Mode" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem
                              value="list"
                              className="hover:bg-gray-200"
                            >
                              List
                            </SelectItem>
                            <SelectItem
                              value="grid"
                              className="hover:bg-gray-200"
                            >
                              Grid
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {viewMode === 'list' ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {loading ? (
                          <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className="p-4 border-2 rounded-xl">
                                <div className="flex items-start gap-4">
                                  <Shimmer className="h-5 w-5 rounded" />
                                  <div className="flex-1 space-y-2">
                                    <Shimmer className="h-5 w-48 rounded" />
                                    <Shimmer className="h-4 w-32 rounded" />
                                    <Shimmer className="h-4 w-24 rounded" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : filteredAssignments.length === 0 ? (
                          <div className="text-center py-12">
                            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                              No active asset assignments found
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              You don't have any assets to request transfer for
                            </p>
                          </div>
                        ) : (
                          filteredAssignments.map(assignment => {
                            const pendingTransfer =
                              assignmentIdsPendingTransferRequest.has(
                                assignment.assignmentID
                              );
                            const pendingReturn =
                              assignmentIdsPendingReturnRequest.has(
                                assignment.assignmentID
                              );
                            const blocked = pendingTransfer || pendingReturn;

                            return (
                              <div
                                key={assignment.assignmentID}
                                className={cn(
                                  'group relative p-4 border-2 rounded-xl transition-all duration-200',
                                  blocked
                                    ? 'cursor-not-allowed opacity-65 border-amber-200 bg-amber-50/40'
                                    : selectedAssignments.includes(
                                          assignment.assignmentID
                                        )
                                      ? 'border-red-500 bg-red-50 shadow-md'
                                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                )}
                                onClick={() => {
                                  if (blocked) return;
                                  handleAssignmentSelection(
                                    assignment.assignmentID,
                                    !selectedAssignments.includes(
                                      assignment.assignmentID
                                    )
                                  );
                                }}
                              >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  <Checkbox
                                    id={assignment.assignmentID}
                                    checked={selectedAssignments.includes(
                                      assignment.assignmentID
                                    )}
                                    disabled={blocked}
                                    onCheckedChange={(
                                      checked: boolean | string
                                    ) =>
                                      handleAssignmentSelection(
                                        assignment.assignmentID,
                                        checked
                                      )
                                    }
                                    className="pointer-events-none"
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
                                      Assigned to you on:
                                    </span>
                                    <span className="ml-2">
                                      {new Date(
                                        assignment.assigned_date
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {pendingTransfer && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-100 text-amber-900 border-amber-300"
                                      >
                                        Transfer request submitted
                                      </Badge>
                                    )}
                                    {pendingReturn && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-100 text-amber-900 border-amber-300"
                                      >
                                        Return request submitted
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="default"
                                      className="text-xs bg-red-100 text-red-800 border-red-200"
                                    >
                                      {assignment.status}
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
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {loading ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div key={i} className="p-4 border-2 rounded-xl">
                                <div className="flex items-start gap-4">
                                  <Shimmer className="h-5 w-5 rounded" />
                                  <div className="flex-1 space-y-2">
                                    <Shimmer className="h-5 w-32 rounded" />
                                    <Shimmer className="h-4 w-24 rounded" />
                                    <Shimmer className="h-4 w-20 rounded" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : filteredAssignments.length === 0 ? (
                          <div className="col-span-full text-center py-12">
                            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                              No active asset assignments found
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              You don't have any assets to request transfer for
                            </p>
                          </div>
                        ) : (
                          filteredAssignments.map(assignment => {
                            const pendingTransfer =
                              assignmentIdsPendingTransferRequest.has(
                                assignment.assignmentID
                              );
                            const pendingReturn =
                              assignmentIdsPendingReturnRequest.has(
                                assignment.assignmentID
                              );
                            const blocked = pendingTransfer || pendingReturn;

                            return (
                              <div
                                key={assignment.assignmentID}
                                className={cn(
                                  'group relative p-4 border-2 rounded-xl transition-all duration-200',
                                  blocked
                                    ? 'cursor-not-allowed opacity-65 border-amber-200 bg-amber-50/40'
                                    : selectedAssignments.includes(
                                          assignment.assignmentID
                                        )
                                      ? 'border-red-500 bg-red-50 shadow-md'
                                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                )}
                                onClick={() => {
                                  if (blocked) return;
                                  handleAssignmentSelection(
                                    assignment.assignmentID,
                                    !selectedAssignments.includes(
                                      assignment.assignmentID
                                    )
                                  );
                                }}
                              >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  <Checkbox
                                    id={assignment.assignmentID}
                                    checked={selectedAssignments.includes(
                                      assignment.assignmentID
                                    )}
                                    disabled={blocked}
                                    onCheckedChange={(
                                      checked: boolean | string
                                    ) =>
                                      handleAssignmentSelection(
                                        assignment.assignmentID,
                                        checked
                                      )
                                    }
                                    className="pointer-events-none"
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
                                      Assigned to you on:
                                    </span>
                                    <span className="ml-2">
                                      {new Date(
                                        assignment.assigned_date
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {pendingTransfer && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-100 text-amber-900 border-amber-300"
                                      >
                                        Transfer request submitted
                                      </Badge>
                                    )}
                                    {pendingReturn && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-100 text-amber-900 border-amber-300"
                                      >
                                        Return request submitted
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="default"
                                      className="text-xs bg-red-100 text-red-800 border-red-200"
                                    >
                                      {assignment.status}
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
                            );
                          })
                        )}
                      </div>
                    )}

                    {selectedAssignments.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-50/80 border border-red-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-900">
                              {selectedAssignments.length} asset
                              {selectedAssignments.length !== 1 ? 's' : ''}{' '}
                              selected for transfer request
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

              <TabsContent value="asset-built" className="mt-0">
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
                      Transfer whole builder or select individual assets for
                      your transfer request.
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
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="p-4 border-2 rounded-xl">
                            <div className="flex items-start gap-4">
                              <Shimmer className="h-5 w-5 rounded" />
                              <div className="flex-1 space-y-2">
                                <Shimmer className="h-5 w-40 rounded" />
                                <Shimmer className="h-4 w-28 rounded" />
                              </div>
                            </div>
                          </div>
                        ))}
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
                            const selectableBuilderAssignments =
                              builderAssignments.filter(
                                (a: AssetAssignment) =>
                                  !assignmentIdsPendingTransferRequest.has(
                                    a.assignmentID
                                  ) &&
                                  !assignmentIdsPendingReturnRequest.has(
                                    a.assignmentID
                                  )
                              );

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
                                          className="text-xs bg-red-100 text-red-800"
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
                                        disabled={
                                          selectableBuilderAssignments.length ===
                                          0
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
                                            (a: AssetAssignment) => {
                                              const pendingTransfer =
                                                assignmentIdsPendingTransferRequest.has(
                                                  a.assignmentID
                                                );
                                              const pendingReturn =
                                                assignmentIdsPendingReturnRequest.has(
                                                  a.assignmentID
                                                );
                                              const blocked =
                                                pendingTransfer || pendingReturn;
                                              return (
                                                <li
                                                  key={a.assignmentID}
                                                  className={cn(
                                                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all min-w-0 pl-4 relative before:content-["*"] before:absolute before:left-2 before:font-bold before:text-gray-500',
                                                    blocked
                                                      ? 'cursor-not-allowed opacity-65 border-amber-200 bg-amber-50/40'
                                                      : 'cursor-pointer',
                                                    selectedAssignments.includes(
                                                      a.assignmentID
                                                    )
                                                      ? 'border-red-500 bg-red-50'
                                                      : 'border-gray-200 hover:border-gray-300'
                                                  )}
                                                  onClick={() => {
                                                    if (blocked) return;
                                                    handleBuilderAssetToggle(
                                                      a.assignmentID,
                                                      !selectedAssignments.includes(
                                                        a.assignmentID
                                                      )
                                                    );
                                                  }}
                                                >
                                                  <Checkbox
                                                    checked={selectedAssignments.includes(
                                                      a.assignmentID
                                                    )}
                                                    disabled={blocked}
                                                    onCheckedChange={(
                                                      checked: boolean | string
                                                    ) =>
                                                      handleBuilderAssetToggle(
                                                        a.assignmentID,
                                                        checked
                                                      )
                                                    }
                                                    className="pointer-events-none flex-shrink-0"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate text-sm">
                                                      {a.asset?.name ?? '-'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                      {a.asset?.code ?? '-'}
                                                    </p>
                                                    {pendingTransfer && (
                                                      <p className="mt-1 text-xs font-medium text-amber-800">
                                                        Transfer request submitted
                                                      </p>
                                                    )}
                                                    {pendingReturn && (
                                                      <p className="mt-1 text-xs font-medium text-amber-800">
                                                        Return request submitted
                                                      </p>
                                                    )}
                                                  </div>
                                                </li>
                                              );
                                            }
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

                {selectedAssignments.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-50/80 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">
                          {selectedAssignments.length} asset
                          {selectedAssignments.length !== 1 ? 's' : ''} selected
                          for transfer request
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
              </TabsContent>

              <TabsContent value="intangible-assets" className="mt-0">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[500px]">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Layers className="h-5 w-5 text-red-600" />
                      </div>
                      Select Intangible Assets to Request Transfer
                      <Badge variant="secondary" className="ml-auto">
                        {myIntangibleAssets.length} assigned to you
                      </Badge>
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search intangible assets..."
                          value={intangibleSearchTerm}
                          onChange={e => setIntangibleSearchTerm(e.target.value)}
                          className="pl-10 w-full border-gray-200 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                      {myIntangibleAssets.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allVisibleIds = myIntangibleAssets.map(a => a.id);
                            const allSelected = allVisibleIds.every(id => selectedIntangibleAssetIds.includes(id));
                            if (allSelected) {
                              setSelectedIntangibleAssetIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
                            } else {
                              setSelectedIntangibleAssetIds(prev => [...new Set([...prev, ...allVisibleIds])]);
                            }
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                        >
                          {myIntangibleAssets.length > 0 &&
                          myIntangibleAssets.every(a => selectedIntangibleAssetIds.includes(a.id))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="p-4 border-2 rounded-xl border-gray-200">
                              <div className="flex items-start gap-4">
                                <Shimmer className="h-5 w-5 rounded" />
                                <div className="flex-1 space-y-2">
                                  <Shimmer className="h-5 w-48 rounded" />
                                  <Shimmer className="h-5 w-28 rounded-full" />
                                  <Shimmer className="h-4 w-32 rounded" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredIntangibleAssets.length === 0 ? (
                        <div className="text-center py-12">
                          <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">
                            {intangibleSearchTerm
                              ? 'No Results Found'
                              : 'No intangible assets assigned to you'}
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {intangibleSearchTerm
                              ? 'Try adjusting your search criteria'
                              : 'Intangible assets assigned to you will appear here'}
                          </p>
                        </div>
                      ) : (
                        filteredIntangibleAssets.map(asset => (
                          <div
                            key={asset.id}
                            className={cn(
                              'group relative p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer',
                              selectedIntangibleAssetIds.includes(asset.id)
                                ? 'border-red-500 bg-red-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            )}
                            onClick={() =>
                              handleIntangibleAssetSelection(
                                asset.id,
                                !selectedIntangibleAssetIds.includes(asset.id)
                              )
                            }
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                <Checkbox
                                  id={asset.id}
                                  checked={selectedIntangibleAssetIds.includes(asset.id)}
                                  onCheckedChange={(checked: boolean | string) =>
                                    handleIntangibleAssetSelection(asset.id, checked)
                                  }
                                  className="pointer-events-none"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                                      {asset.name}
                                    </h3>
                                    {selectedIntangibleAssetIds.includes(asset.id) && (
                                      <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>

                                {asset.type && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-blue-300 bg-blue-50 text-blue-800"
                                  >
                                    {asset.type}
                                  </Badge>
                                )}

                                {asset.description && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                    {asset.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedIntangibleAssetIds.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-50/80 border border-red-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-900">
                              {selectedIntangibleAssetIds.length} intangible asset
                              {selectedIntangibleAssetIds.length !== 1 ? 's' : ''} selected for transfer request
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIntangibleAssetIds([])}
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

            </Tabs>
          </div>

          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowRightLeft className="h-5 w-5 text-red-600" />
                  </div>
                  Transfer Request Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Department *
                  </Label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={(value: string) => {
                      setSelectedDepartmentId(value);
                      setTargetUser('');
                    }}
                    disabled={!hasPermission('Transfer Request', 'create')}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {departments.map((dept: any) => (
                        <SelectItem
                          key={dept.departmentID || dept.id}
                          value={dept.departmentID || dept.id}
                          className="hover:bg-gray-200"
                        >
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Transfer To *
                  </Label>
                  <Select
                    value={targetUser}
                    onValueChange={(value: string) => setTargetUser(value)}
                    disabled={
                      !hasPermission('Transfer Request', 'create') ||
                      !selectedDepartmentId
                    }
                  >
                    <SelectTrigger className="border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue
                        placeholder={
                          selectedDepartmentId
                            ? 'Select user to transfer to'
                            : 'Select department first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-60 overflow-y-auto">
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search users..."
                            value={userSearchTerm}
                            onChange={e => setUserSearchTerm(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="pl-10 border-gray-200 focus:border-red-500 focus:ring-red-500 w-full"
                          />
                        </div>
                      </div>
                      {users
                        .filter(
                          user =>
                            (user.department_id === selectedDepartmentId ||
                              (user.department_id == null &&
                                selectedDepartmentId === '')) &&
                            (user.first_name
                              ?.toLowerCase()
                              .includes(userSearchTerm.toLowerCase()) ||
                              user.last_name
                                ?.toLowerCase()
                                .includes(userSearchTerm.toLowerCase()) ||
                              user.email
                                ?.toLowerCase()
                                .includes(userSearchTerm.toLowerCase()))
                        )
                        .map(user => (
                          <SelectItem
                            key={user.userID || user.id}
                            value={user.userID || user.id}
                            className="hover:bg-gray-200"
                          >
                            {user.first_name} {user.last_name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Transfer Type *
                  </Label>
                  <Select
                    value={transferType}
                    onValueChange={(value: string) => setTransferType(value)}
                    disabled={!hasPermission('Transfer Request', 'create')}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select transfer type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {TRANSFER_TYPE_OPTIONS.map(opt => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="hover:bg-gray-200"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Additional Notes
                  </Label>
                  <Textarea
                    placeholder="Add notes about your transfer request (optional)"
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                    className="border-gray-200 focus:border-red-500 focus:ring-red-500"
                    rows={4}
                    disabled={!hasPermission('Transfer Request', 'create')}
                  />
                </div>

                <Button
                  onClick={handleRequestSubmitClick}
                  disabled={
                    submitting ||
                    (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) ||
                    !hasPermission('Transfer Request', 'create') ||
                    !selectedDepartmentId ||
                    !targetUser
                  }
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting Request...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5" />
                      Submit Transfer Request
                    </div>
                  )}
                </Button>

                {(selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) ||
                  !selectedDepartmentId ||
                  !targetUser ? (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets, department, and transfer-to user to enable
                    submission
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog
          open={showConfirmDialog}
          onOpenChange={open => {
            setShowConfirmDialog(open);
            if (!open) {
              setConfirmTransferWhenApproved(false);
              setConfirmSigningTransfer(false);
            }
          }}
        >
          <AppDialogFrame className="sm:max-w-lg">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-white/20 p-2.5">
                    <ArrowRightLeft className="h-5 w-5 text-white" />
                  </span>
                  Transfer Request Confirmation
                </span>
              }
              description="Review the assets below and confirm before submitting your transfer request."
            />
            <AppDialogBody className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">
                  Assets to transfer
                </span>
                <Badge className="shrink-0 bg-red-600 font-semibold text-white">
                  {selectedAssignmentsForConfirm.length} item
                  {selectedAssignmentsForConfirm.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="max-h-44 w-full overflow-y-auto scrollbar-thin scrollbar-track-red-50 scrollbar-thumb-red-400">
                <ul className="w-full space-y-2 pr-2">
                  {selectedAssignmentsForConfirm.map(assignment => (
                    <li
                      key={assignment.assignmentID}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-red-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 hover:border-red-300 hover:shadow-md"
                    >
                      <Package className="h-5 w-5 flex-shrink-0 text-gray-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {assignment.asset.name}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">
                          {assignment.asset.code}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {selectedIntangibleAssetsForConfirm.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Intangible Assets</h4>
                  <ul className="space-y-1.5">
                    {selectedIntangibleAssetsForConfirm.map(asset => (
                      <li key={asset.id} className="flex w-full items-center gap-3 rounded-xl border-2 border-blue-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md">
                        <Layers className="h-5 w-5 flex-shrink-0 text-gray-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{asset.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{asset.type}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-xs leading-snug text-gray-700">
                  {confirmTransferMessage}
                </p>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <label className="group flex cursor-pointer items-start gap-2">
                    <Checkbox
                      checked={confirmTransferWhenApproved}
                      onCheckedChange={(checked: boolean | string) =>
                        setConfirmTransferWhenApproved(Boolean(checked))
                      }
                      className="mt-0.5 border-gray-400 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600"
                    />
                    <span className="text-xs leading-snug text-gray-700 group-hover:text-gray-900">
                      I confirm that all assets in this request will be
                      transferred once the request is fully approved.
                    </span>
                  </label>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <label className="group flex cursor-pointer items-start gap-2">
                    <Checkbox
                      checked={confirmSigningTransfer}
                      onCheckedChange={(checked: boolean | string) =>
                        setConfirmSigningTransfer(Boolean(checked))
                      }
                      className="mt-0.5 border-gray-400 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600"
                    />
                    <span className="text-xs leading-snug text-gray-700 group-hover:text-gray-900">
                      I confirm that by signing this transfer form I am
                      transferring all selected assets in this request.
                    </span>
                  </label>
                </div>
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
                className="rounded-xl border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  pendingSubmitActionRef.current = async () => {
                    await handleConfirmSubmitRequest();
                  };
                  setShowOtpDialog(true);
                }}
                disabled={
                  submitting ||
                  !confirmTransferWhenApproved ||
                  !confirmSigningTransfer
                }
                className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-700 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Confirm
                  </>
                )}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <SmsOtpDialog
          isOpen={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          sendOtpEndpoint="/auth/initials/send-otp"
          verifyOtpEndpoint="/auth/initials/verify-otp"
          onVerified={() => {
            setShowOtpDialog(false);
            pendingSubmitActionRef.current = null;
          }}
          onCancel={() => {
            pendingSubmitActionRef.current = null;
            setShowOtpDialog(false);
          }}
          pendingActionRef={pendingSubmitActionRef}
          title="OTP SMS Verification"
          description="OTP SMS Verification has been sent to your registered mobile number for transfer request confirmation."
          verifyButtonLabel="Verify & Submit"
          phoneNumber={
            (currentUser as { contactNumber?: string })?.contactNumber
          }
        />

        <div className="xl:col-span-3">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ArrowRightLeft className="h-5 w-5 text-red-600" />
                </div>
                My Transfer Requests
                <Badge variant="secondary" className="ml-auto">
                  {transferRequests.length} total
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-4 border-2 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2">
                          <Shimmer className="h-5 w-32 rounded" />
                          <Shimmer className="h-4 w-24 rounded" />
                          <Shimmer className="h-4 w-20 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transferRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRightLeft className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No transfer requests found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your requests will appear here once you submit them.
                  </p>
                </div>
              ) : (
                <DataTable<TransferRequestRow>
                  tableId="asset-transfer-my-requests"
                  data={transferRequests}
                  columns={myTransferRequestColumns}
                  searchPlaceholder="Search by form, status, transfer to, or asset names..."
                  emptyState={
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No matching transfer requests
                      </p>
                    </div>
                  }
                  mobileCardFields={[
                    {
                      key: 'assets',
                      label: 'Assets',
                      render: row => (
                        <span className="text-muted-foreground">
                          {row.assets_label}
                        </span>
                      ),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: row => (
                        <Badge
                          variant="outline"
                          className={`text-xs ${getTransferStatusBadgeClass(row.status)}`}
                        >
                          {formatTransferFormUiStatus(row.status)}
                        </Badge>
                      ),
                    },
                    {
                      key: 'transfer_to',
                      label: 'Transfer To',
                      render: row => row.target_user ?? '-',
                    },
                    {
                      key: 'form_number',
                      label: 'Form / Request',
                      render: row =>
                        row.form_number !== '-'
                          ? row.form_number
                          : `Transfer ${new Date(row.request_date).toLocaleDateString()}`,
                    },
                    {
                      key: 'created',
                      label: 'Created',
                      render: row =>
                        new Date(row.request_date).toLocaleDateString(),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

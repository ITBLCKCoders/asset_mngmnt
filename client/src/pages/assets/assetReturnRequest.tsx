'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Undo2,
  Download,
  FileText,
  Crown,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
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
import { api } from '@/lib/api';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DataTable } from '@/components/ui/dataTable';
import {
  buildReturnDataForPDFFromBatch,
  type AssetTransferFormBatch,
  type AssetReturnFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { generateAssetReturnPDF, downloadPDF } from '@/lib/pdfGenerator';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Dialog } from '@/components/ui/dialog';
import type { ColumnDef } from '@tanstack/react-table';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { Shimmer } from '@/components/ui/shimmer';
import { useAssetMovementExport } from '@/hooks/useAssetMovementExport';
import {
  Dialog as UIDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface ReturnRequest {
  return_id: string;
  assignment_id: string;
  user_id: string;
  return_condition: string;
  return_notes: string;
  pdf_file_path: string;
  created_at: string;
  /** API returns asset under assignment.asset; top-level asset may be absent */
  asset?: {
    id: string;
    code: string;
    name: string;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  assignment: {
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
  };
}

/** One row = one returned asset within a return form (same layout as Return History). */
interface MyReturnRow {
  id: string;
  formID?: string | null;
  assetName: string;
  assetCode: string;
  formNumber: string;
  returnedBy: string;
  fromDepartment: string;
  processedBy: string;
  statusLabel: string;
  declineReason?: string;
  condition: string;
  returnDate: string;
  notes: string;
  conditionImages: string[];
}

function getMyReturnStatusLabel(batch: AssetReturnFormBatch): string {
  if (batch.status === 'declined') return 'Declined';
  if (batch.status) return batch.status;
  if (batch.process_signed_at) return 'Returned';
  if (batch.dept_head_signed_at || batch.sub_approver_1_signed_at)
    return 'Approved by Department head';
  if (batch.processor_declined_at) return 'Declined by processor';
  return 'Submitted';
}

const RETURN_FORM_INSTRUCTIONS =
  'Please download this return form and bring it to your Department Head for signature. Make sure your Department Head also approves your return request in the Asset Management system. After your Department Head signs this form, go to the IT/Admin department to process your asset return.';

function getMyReturnStatusBadgeClass(label: string): string {
  if (label === 'Returned')
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
  if (label === 'Approved by Department head')
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
  if (label === 'Declined' || label === 'Declined by processor')
    return 'bg-red-100 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
  return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
}

function getMyReturnFormNumber(batch: AssetReturnFormBatch): string {
  return (
    batch.form_number ??
    `Return ${new Date(batch.created_at).toLocaleDateString()}`
  );
}

/** Form still in flight: IT/Admin has not finished processing; processor/dept head did not decline. */
function isReturnBatchInProgress(batch: AssetReturnFormBatch): boolean {
  // Submit-request and modern flows always have a form row; legacy grouped returns without form_id are not used to block.
  if (!batch.formID) return false;
  if (batch.processor_declined_at) return false;
  // A processor-initiated (hold) form sets process_signed_at at creation, so it
  // stays in progress until the dept head approves (which executes the return).
  // Owner-submitted returns only set process_signed_at after dept approval.
  if (batch.process_signed_at && (batch.dept_head_signed_at || batch.sub_approver_1_signed_at))
    return false;
  if (
    batch.returns?.some(
      r => (r as { status?: string }).status === 'Declined by dept head'
    )
  )
    return false;
  return true;
}

function isTransferBatchInProgress(batch: AssetTransferFormBatch): boolean {
  if (!batch.formID) return false;
  if (batch.declined_at) return false;
  if (batch.executed_at) return false;
  return true;
}

export default function AssetReturnRequest() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();

  const {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportType,
    setExportType,
    exportStep,
    setExportStep,
    filters,
    setFilters,
    handleExportClick,
    handleExportConfirm,
    handleFilterChange,
    handlePrevStep,
    resetDialog,
  } = useAssetMovementExport();

  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [myReturnBatches, setMyReturnBatches] = useState<AssetReturnFormBatch[]>(
    []
  );
  const [myTransferBatches, setMyTransferBatches] = useState<
    AssetTransferFormBatch[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<'return' | 'offboarding'>(
    'return'
  );
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [scopeCounts, setScopeCounts] = useState<{
    it: number | null;
    admin: number | null;
  }>({ it: null, admin: null });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmReturnWhenApproved, setConfirmReturnWhenApproved] =
    useState(false);
  const [confirmSigningReturn, setConfirmSigningReturn] = useState(false);
  const [returnConditions, setReturnConditions] = useState<
    Record<string, string>
  >({});
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [expandedBuilderForSelect, setExpandedBuilderForSelect] = useState<
    string | null
  >(null);
  const [intangibleAssets, setIntangibleAssets] = useState<any[]>([]);
  const [selectedIntangibleAssetIds, setSelectedIntangibleAssetIds] = useState<string[]>([]);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const pendingSubmitActionRef = useRef<(() => Promise<void>) | null>(null);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedImagesForModal, setSelectedImagesForModal] = useState<
    string[]
  >([]);

  // Get user's digital initials from profile
  const digitalInitials = (currentUser as any)?.digitalSignature || '';

  const fetchAssignments = async () => {
    try {
      const response = await api.get(`/asset-assignments/me?scope=${scope}`);
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchReturnRequests = async (): Promise<AssetReturnFormBatch[]> => {
    if (!currentUser?.id) {
      setReturnRequests([]);
      setMyReturnBatches([]);
      return [];
    }
    try {
      const response = await api.get<{
        assetReturns?: ReturnRequest[];
        assetReturnForms?: AssetReturnFormBatch[];
      }>('/asset-returns/user/' + currentUser.id);
      setReturnRequests(response.assetReturns || []);
      const forms: AssetReturnFormBatch[] = response.assetReturnForms || [];
      const mine = forms.filter(batch => batch.user_id === currentUser.id);
      setMyReturnBatches(mine);
      return mine;
    } catch (error) {
      console.error('Failed to fetch return requests:', error);
      setReturnRequests([]);
      setMyReturnBatches([]);
      return [];
    }
  };

  const fetchTransferRequests = async (): Promise<AssetTransferFormBatch[]> => {
    if (!currentUser?.id) {
      setMyTransferBatches([]);
      return [];
    }
    try {
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
        data?: { assetTransferForms?: AssetTransferFormBatch[] };
      }>(`/asset-transfers/user/${currentUser.id}`);
      const forms =
        response.assetTransferForms ?? response.data?.assetTransferForms ?? [];
      const mine = forms.filter(batch => batch.user_id === currentUser.id);
      setMyTransferBatches(mine);
      return mine;
    } catch (error) {
      console.error('Failed to fetch transfer requests:', error);
      setMyTransferBatches([]);
      return [];
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      const response = await api.get(`/asset-builders?scope=${scope}`, {
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
        fetchReturnRequests(),
        fetchTransferRequests(),
        fetchAssetBuilders(),
        fetchIntangibleAssets(),
      ]);
      setLoading(false);
    };
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, scope]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchScopeCounts = async () => {
      try {
        const [itRes, adminRes] = await Promise.all([
          api.get(`/asset-assignments/me?scope=${encodeURIComponent('it')}`),
          api.get(`/asset-assignments/me?scope=${encodeURIComponent('admin')}`),
        ]);
        setScopeCounts({
          it: itRes.assignments?.length ?? 0,
          admin: adminRes.assignments?.length ?? 0,
        });
      } catch (error) {
        console.error('Failed to fetch scope counts:', error);
        setScopeCounts({ it: 0, admin: 0 });
      }
    };
    fetchScopeCounts();
  }, [currentUser]);

  useEffect(() => {
    setSelectedAssignments([]);
    setReturnConditions({});
    setExpandedBuilderForSelect(null);
  }, [scope]);

  /** Flatten return forms into one row per returned asset (mirrors Return History table). */
  const myReturnRows = useMemo((): MyReturnRow[] => {
    const rows: MyReturnRow[] = [];
    for (const batch of myReturnBatches) {
      const formNumber = getMyReturnFormNumber(batch);
      const statusLabel = getMyReturnStatusLabel(batch);
      const declineReason = batch.processor_decline_reason?.trim() || undefined;
      for (const r of batch.returns ?? []) {
        const asset = r.assignment?.asset;
        const user = r.assignment?.user;
        rows.push({
          id:
            r.return_id ??
            `${batch.formID ?? batch.return_batch_id ?? 'batch'}-${r.assignment_id}`,
          formID: batch.formID,
          assetName: asset?.name ?? 'Unknown Asset',
          assetCode: asset?.code ?? 'No Code',
          formNumber,
          returnedBy:
            user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : 'Unknown User',
          fromDepartment: r.assignment?.department?.name ?? 'Unknown',
          processedBy: batch.processed_by ?? '—',
          statusLabel,
          declineReason,
          condition: r.return_condition || 'Not Specified',
          returnDate: r.created_at
            ? new Date(r.created_at).toLocaleDateString()
            : 'N/A',
          notes: r.return_notes || 'No notes',
          conditionImages: Array.isArray(r.condition_images)
            ? r.condition_images.filter((x): x is string => typeof x === 'string')
            : [],
        });
      }
    }
    return rows;
  }, [myReturnBatches]);

  const myReturnRequestColumns = useMemo<ColumnDef<MyReturnRow>[]>(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        accessorFn: row => `${row.assetName} ${row.assetCode}`,
        size: 200,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">{row.original.assetName}</div>
            <div className="text-sm text-gray-500">{row.original.assetCode}</div>
          </div>
        ),
      },
      {
        id: 'formNumber',
        header: 'Return Form #',
        accessorFn: row => row.formNumber,
        size: 150,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.formNumber}</span>
        ),
      },
      {
        id: 'returnedBy',
        header: 'Returned By',
        accessorFn: row => row.returnedBy,
        size: 160,
      },
      {
        id: 'fromDepartment',
        header: 'From Department',
        accessorFn: row => row.fromDepartment,
        size: 150,
      },
      {
        id: 'processedBy',
        header: 'Processed By',
        accessorFn: row => row.processedBy,
        size: 140,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: row => row.statusLabel,
        size: 240,
        cell: ({ row }) => {
          const statusLabel = row.original.statusLabel;
          return (
            <div className="max-w-xs align-top">
              <Badge
                variant="outline"
                className={`text-xs ${getMyReturnStatusBadgeClass(statusLabel)}`}
              >
                {statusLabel}
              </Badge>
              {row.original.declineReason && (
                <p
                  className="mt-2 text-xs text-muted-foreground whitespace-normal"
                  title={row.original.declineReason}
                >
                  <span className="font-medium text-foreground">Reason: </span>
                  {row.original.declineReason}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorFn: row => row.condition,
        size: 120,
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            {row.original.condition}
          </Badge>
        ),
      },
      {
        id: 'returnDate',
        header: 'Return Date',
        accessorFn: row => row.returnDate,
        size: 120,
      },
      {
        id: 'photos',
        header: 'Photos',
        accessorFn: row => row.conditionImages.join(','),
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
      {
        id: 'notes',
        header: 'Notes',
        accessorFn: row => row.notes,
        size: 200,
      },
    ],
    []
  );

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

  useEffect(() => {
    setSelectedAssignments(prev =>
      prev.filter(
        id =>
          !assignmentIdsPendingReturnRequest.has(id) &&
          !assignmentIdsPendingTransferRequest.has(id)
      )
    );
    setReturnConditions(prev => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (
          assignmentIdsPendingReturnRequest.has(id) ||
          assignmentIdsPendingTransferRequest.has(id)
        ) {
          delete next[id];
        }
      }
      return next;
    });
  }, [assignmentIdsPendingReturnRequest, assignmentIdsPendingTransferRequest]);

  const handleAssignmentSelection = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (
      assignmentIdsPendingReturnRequest.has(assignmentId) ||
      assignmentIdsPendingTransferRequest.has(assignmentId)
    )
      return;
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
      setReturnConditions(prev => ({
        ...prev,
        [assignmentId]: prev[assignmentId] || 'Good',
      }));
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
      setReturnConditions(prev => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
    }
  };

  const handleSubmitRequest = async (digitalSignature?: string) => {
    if (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) {
      toast.error('Please select at least one asset to request return');
      return;
    }
    const totalCount = selectedAssignments.length + selectedIntangibleAssetIds.length;
    const intangibleAssetIds = selectedIntangibleAssetIds.filter(id =>
      intangibleAssets.some(ia => ia.id === id && isIntangibleAssignedToUser(ia, currentUser?.id))
    );
    setSubmitting(true);
    try {
      const returnTypeApi =
        returnType === 'offboarding' ? 'Offboarding' : 'Returned';
      const payload = {
        assignmentIds: selectedAssignments,
        returnConditions,
        returnNotes: returnNotes || '',
        returnType: returnTypeApi,
        return_type: returnTypeApi,
        digitalSignature,
        intangibleAssetIds: intangibleAssetIds.length > 0 ? intangibleAssetIds : undefined,
      };
      const submitResponse = await api.post<{
        message?: string;
        formID?: string;
        form_number?: string | null;
      }>('/asset-returns/submit-request', payload);

      setSelectedAssignments([]);
      setSelectedIntangibleAssetIds([]);
      setReturnConditions({});
      setReturnNotes('');
      setConfirmDialogOpen(false);
      setConfirmReturnWhenApproved(false);
      setConfirmSigningReturn(false);
      await fetchAssignments();
      await fetchReturnRequests();
      await fetchIntangibleAssets();

      toast.success(
        `Return request submitted for ${totalCount} asset${totalCount !== 1 ? 's' : ''}`
      );
    } catch (error: unknown) {
      console.error('Failed to submit return requests:', error);
      const err = error as { data?: { error?: string } };
      toast.error(
        err?.data?.error ||
          'Failed to submit return requests. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAssetsForConfirm = assignments.filter(a =>
    selectedAssignments.includes(a.assignmentID)
  );

  const openConfirmDialog = () => {
    if (selectedAssignments.length === 0 && selectedIntangibleAssetIds.length === 0) {
      toast.error('Please select at least one asset to request return');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const filteredAssignments = assignments
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

  const filteredAssignmentsForSelect = useMemo(
    () =>
      filteredAssignments.filter(
        a => !assignmentIdsInBuilders.has(a.assignmentID)
      ),
    [filteredAssignments, assignmentIdsInBuilders]
  );

  const selectableAssignmentsInAssetTab = useMemo(
    () =>
      filteredAssignmentsForSelect.filter(
        a =>
          !assignmentIdsPendingReturnRequest.has(a.assignmentID) &&
          !assignmentIdsPendingTransferRequest.has(a.assignmentID)
      ),
    [
      filteredAssignmentsForSelect,
      assignmentIdsPendingReturnRequest,
      assignmentIdsPendingTransferRequest,
    ]
  );

  const handleBuilderReturnWhole = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry) return;
    const ids = entry.assignments
      .map((a: AssetAssignment) => a.assignmentID)
      .filter(
        id =>
          !assignmentIdsPendingReturnRequest.has(id) &&
          !assignmentIdsPendingTransferRequest.has(id)
      );
    setSelectedAssignments(prev => [...new Set([...prev, ...ids])]);
    setReturnConditions(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        if (!next[id]) next[id] = 'Good';
      });
      return next;
    });
  };

  const handleBuilderAssetToggle = (
    assignmentId: string,
    checked: boolean | string
  ) => {
    if (
      assignmentIdsPendingReturnRequest.has(assignmentId) ||
      assignmentIdsPendingTransferRequest.has(assignmentId)
    )
      return;
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
      setReturnConditions(prev => ({
        ...prev,
        [assignmentId]: prev[assignmentId] || 'Good',
      }));
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
      setReturnConditions(prev => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
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
    setReturnConditions(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
  };

  const isBuilderFullySelected = (builderId: string) => {
    const entry = buildersWithAssignments.find(
      ({ builder }: { builder: any }) => builder.builderID === builderId
    );
    if (!entry || entry.assignments.length === 0) return false;
    const eligible = entry.assignments.filter(
      (a: AssetAssignment) =>
        !assignmentIdsPendingReturnRequest.has(a.assignmentID) &&
        !assignmentIdsPendingTransferRequest.has(a.assignmentID)
    );
    if (eligible.length === 0) return false;
    return eligible.every((a: AssetAssignment) =>
      selectedAssignments.includes(a.assignmentID)
    );
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Undo2}
          title="Return asset"
          description="Request to return your assigned assets"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs value={scope} onValueChange={v => setScope(v as 'it' | 'admin')} className="w-full sm:w-auto">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[320px]'}>
                <TabsTrigger value="it" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
                  IT Asset
                  {scopeCounts.it != null && (
                    <span className="tab-count ml-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-300/90 px-1.5 text-xs font-bold text-slate-800">
                      {scopeCounts.it}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="admin" className={segmentTabsTriggerClassName + ' flex items-center gap-2'}>
                  Admin Asset
                  {scopeCounts.admin != null && (
                    <span className="tab-count ml-1 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-300/90 px-1.5 text-xs font-bold text-slate-800">
                      {scopeCounts.admin}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Link to="/assets/return">
              <Button
                variant="header"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Asset Return
              </Button>
            </Link>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <Tabs defaultValue="select-assets" className="w-full">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 mb-4'}>
                <TabsTrigger
                  value="select-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Package className="h-4 w-4" />
                  Asset
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignmentsForSelect.length}
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

              <TabsContent value="select-assets" className="mt-0">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Package className="h-5 w-5 text-red-600" />
                      </div>
                      Select Assets to Request Return
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignmentsForSelect.length} assigned
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
                              selectableAssignmentsInAssetTab.every(a =>
                                selectedAssignments.includes(a.assignmentID)
                              );
                            if (allSelectableSelected) {
                              setSelectedAssignments([]);
                              setReturnConditions({});
                            } else {
                              setSelectedAssignments(
                                selectableAssignmentsInAssetTab.map(
                                  a => a.assignmentID
                                )
                              );
                              setReturnConditions(prev => {
                                const next = { ...prev };
                                selectableAssignmentsInAssetTab.forEach(a => {
                                  next[a.assignmentID] =
                                    prev[a.assignmentID] || 'Good';
                                });
                                return next;
                              });
                            }
                          }}
                          className="whitespace-nowrap hover:bg-gray-200"
                        >
                          {selectableAssignmentsInAssetTab.length > 0 &&
                          selectableAssignmentsInAssetTab.every(a =>
                            selectedAssignments.includes(a.assignmentID)
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
                        ) : filteredAssignmentsForSelect.length === 0 ? (
                          <div className="text-center py-12">
                            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                              No active asset assignments found
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              You don't have any assets to request return for
                            </p>
                          </div>
                        ) : (
                          filteredAssignmentsForSelect.map(assignment => {
                            const pendingReturn =
                              assignmentIdsPendingReturnRequest.has(
                                assignment.assignmentID
                              );
                            const pendingTransfer =
                              assignmentIdsPendingTransferRequest.has(
                                assignment.assignmentID
                              );
                            const blocked = pendingReturn || pendingTransfer;
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
                                        className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
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
                        ) : filteredAssignmentsForSelect.length === 0 ? (
                          <div className="col-span-full text-center py-12">
                            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">
                              No active asset assignments found
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              You don't have any assets to request return for
                            </p>
                          </div>
                        ) : (
                          filteredAssignmentsForSelect.map(assignment => {
                            const pendingReturn =
                              assignmentIdsPendingReturnRequest.has(
                                assignment.assignmentID
                              );
                            const pendingTransfer =
                              assignmentIdsPendingTransferRequest.has(
                                assignment.assignmentID
                              );
                            const blocked = pendingReturn || pendingTransfer;
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
                                      id={`grid-${assignment.assignmentID}`}
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
                                        className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
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
                              selected for return request
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAssignments([]);
                              setReturnConditions({});
                            }}
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
                          No assigned asset builders to return
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
                                  !assignmentIdsPendingReturnRequest.has(
                                    a.assignmentID
                                  ) &&
                                  !assignmentIdsPendingTransferRequest.has(
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
                                          className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
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
                                            (a: AssetAssignment) => {
                                              const pendingReturn =
                                                assignmentIdsPendingReturnRequest.has(
                                                  a.assignmentID
                                                );
                                              const pendingTransfer =
                                                assignmentIdsPendingTransferRequest.has(
                                                  a.assignmentID
                                                );
                                              const permBlocked =
                                                !hasPermission(
                                                  'Return Request',
                                                  'create'
                                                ) ||
                                                !hasPermission(
                                                  'Return Request',
                                                  'edit'
                                                );
                                              const notInteractive =
                                                permBlocked ||
                                                pendingReturn ||
                                                pendingTransfer;
                                              return (
                                                <li
                                                  key={a.assignmentID}
                                                  className={cn(
                                                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all min-w-0 pl-4 relative before:content-["*"] before:absolute before:left-2 before:font-bold before:text-gray-500',
                                                    notInteractive
                                                      ? pendingReturn ||
                                                        pendingTransfer
                                                        ? 'cursor-not-allowed opacity-65 border-amber-200 bg-amber-50/40'
                                                        : 'cursor-not-allowed opacity-50 border-gray-200'
                                                      : 'cursor-pointer',
                                                    selectedAssignments.includes(
                                                      a.assignmentID
                                                    )
                                                      ? 'border-red-500 bg-red-50'
                                                      : 'border-gray-200 hover:border-gray-300'
                                                  )}
                                                  onClick={() => {
                                                    if (notInteractive) return;
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
                                                    onCheckedChange={(
                                                      checked: boolean | string
                                                    ) =>
                                                      handleBuilderAssetToggle(
                                                        a.assignmentID,
                                                        checked
                                                      )
                                                    }
                                                    disabled={notInteractive}
                                                    className="pointer-events-none flex-shrink-0"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate text-sm">
                                                      {a.asset?.name ?? '-'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                      {a.asset?.code ?? '-'}
                                                    </p>
                                                    {pendingReturn && (
                                                      <p className="text-xs text-amber-800 mt-1 font-medium dark:text-amber-200">
                                                        Return request submitted
                                                      </p>
                                                    )}
                                                    {pendingTransfer && (
                                                      <p className="text-xs text-amber-800 mt-1 font-medium dark:text-amber-200">
                                                        Transfer request submitted
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
                          for return request
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignments([]);
                          setReturnConditions({});
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

            </Tabs>
          </div>

          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Undo2 className="h-5 w-5 text-red-600" />
                  </div>
                  Return Request Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Return Type *
                  </Label>
                  <Select
                    value={returnType}
                    onValueChange={(value: 'return' | 'offboarding') =>
                      setReturnType(value)
                    }
                    disabled={!hasPermission('Return Request', 'create')}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select return type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="return" className="hover:bg-gray-200">
                        Regular Return
                      </SelectItem>
                      <SelectItem
                        value="offboarding"
                        className="hover:bg-gray-200"
                      >
                        Offboarding
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Additional Notes
                  </Label>
                  <Textarea
                    placeholder="Add notes about your return request (optional)"
                    value={returnNotes}
                    onChange={e => setReturnNotes(e.target.value)}
                    className="border-gray-200 focus:border-red-500 focus:ring-red-500"
                    rows={4}
                    disabled={!hasPermission('Return Request', 'create')}
                  />
                </div>

                <Button
                  onClick={openConfirmDialog}
                  disabled={
                    submitting ||
                    selectedAssignments.length === 0 ||
                    !hasPermission('Return Request', 'create')
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
                      <Undo2 className="h-5 w-5" />
                      Submit Return Request
                    </div>
                  )}
                </Button>

                <Dialog
                  open={confirmDialogOpen}
                  onOpenChange={open => {
                    setConfirmDialogOpen(open);
                    if (!open) {
                      setConfirmReturnWhenApproved(false);
                      setConfirmSigningReturn(false);
                    }
                  }}
                >
                  <AppDialogFrame className="sm:max-w-lg">
                    <AppDialogGradientHeader
                      title={
                        <span className="flex items-center gap-3">
                          <span className="rounded-xl bg-white/20 p-2.5">
                            <Undo2 className="h-5 w-5 text-white" />
                          </span>
                          Return Request Confirmation
                        </span>
                      }
                      description="Review the assets below and confirm before submitting your return request."
                    />
                    <AppDialogBody className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <span className="text-sm font-medium text-gray-600">
                          Assets to return
                        </span>
                        <Badge className="bg-red-600 text-white font-semibold shrink-0">
                          {selectedAssetsForConfirm.length + selectedIntangibleAssetIds.length} item
                          {(selectedAssetsForConfirm.length + selectedIntangibleAssetIds.length) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="max-h-44 overflow-y-auto scrollbar-thin scrollbar-thumb-red-400 scrollbar-track-red-50 w-full">
                        <ul className="space-y-2 pr-2 w-full">
                          {selectedAssetsForConfirm.map((a, idx) => (
                            <li
                              key={a.assignmentID}
                              className="flex items-center gap-3 rounded-xl border-2 border-red-200 bg-white shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 px-3 py-2 w-full"
                            >
                              <Package className="h-5 w-5 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate text-sm">
                                  {a.asset.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                  {a.asset.code}
                                </p>
                              </div>
                            </li>
                          ))}
                          {selectedIntangibleAssetIds.map(id => {
                            const asset = intangibleAssets.find(a => a.id === id);
                            if (!asset) return null;
                            return (
                              <li
                                key={id}
                                className="flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-white shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 px-3 py-2 w-full"
                              >
                                <Layers className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate text-sm">
                                    {asset.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Intangible Asset · {asset.type}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <label className="flex items-start gap-2 cursor-pointer group">
                            <Checkbox
                              checked={confirmReturnWhenApproved}
                              onCheckedChange={(checked: boolean | string) =>
                                setConfirmReturnWhenApproved(Boolean(checked))
                              }
                              className="mt-0.5 border-gray-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                            <span className="text-xs text-gray-700 group-hover:text-gray-900 leading-snug">
                              I confirm that all assets in this request will be
                              returned once the request is fully approved.
                            </span>
                          </label>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <label className="flex items-start gap-2 cursor-pointer group">
                            <Checkbox
                              checked={confirmSigningReturn}
                              onCheckedChange={(checked: boolean | string) =>
                                setConfirmSigningReturn(Boolean(checked))
                              }
                              className="mt-0.5 border-gray-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                            <span className="text-xs text-gray-700 group-hover:text-gray-900 leading-snug">
                              I confirm that by signing this return form I am
                              returning all selected assets in this request.
                            </span>
                          </label>
                        </div>
                      </div>
                    </AppDialogBody>
                    <AppDialogChromeFooter className="gap-2 sm:gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDialogOpen(false)}
                        disabled={submitting}
                        className="rounded-xl border-gray-300 hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          // Store the submit action with digital initials
                          pendingSubmitActionRef.current = async () => {
                            await handleSubmitRequest(digitalInitials);
                          };
                          setShowOtpDialog(true);
                        }}
                        disabled={
                          submitting ||
                          !confirmReturnWhenApproved ||
                          !confirmSigningReturn
                        }
                        className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Submitting...
                          </div>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Submit
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
                  purpose="return"
                  onVerified={() => {
                    setShowOtpDialog(false);
                    pendingSubmitActionRef.current = null;
                  }}
                  onCancel={() => {
                    pendingSubmitActionRef.current = null;
                    setShowOtpDialog(false);
                  }}
                  pendingActionRef={pendingSubmitActionRef}
                  title="OTP Email Verification"
                  description="OTP Email Verification has been sent to your registered email for return request confirmation."
                  verifyButtonLabel="Verify & Submit"
                />

                {selectedAssignments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets above to enable return request submission
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="xl:col-span-3">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Undo2 className="h-5 w-5 text-red-600" />
                </div>
                My Return Requests
                <Badge variant="secondary" className="ml-auto">
                  {myReturnRows.length} return
                  {myReturnRows.length !== 1 ? 's' : ''}
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
              ) : myReturnRows.length === 0 ? (
                <div className="text-center py-12">
                  <Undo2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No return requests found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your requests will appear here once you submit them.
                  </p>
                </div>
              ) : (
                <DataTable<MyReturnRow>
                  tableId="my-return-requests"
                  data={myReturnRows}
                  columns={myReturnRequestColumns}
                  searchPlaceholder="Search my return requests..."
                  emptyState={
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No matching return requests
                      </p>
                    </div>
                  }
                  children={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="header"
                        size="sm"
                        onClick={() => handleExportClick('pdf')}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export PDF
                      </Button>
                      <Button
                        variant="header"
                        size="sm"
                        onClick={() => handleExportClick('excel')}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Excel
                      </Button>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

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

      <UIDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {exportStep === 1
                ? `Export ${exportType?.toUpperCase() ?? ''} — Step 1: Format`
                : `Export ${exportType?.toUpperCase() ?? ''} — Step 2: Filters`}
            </DialogTitle>
            <DialogDescription>
              {exportStep === 1
                ? 'Choose the export format.'
                : 'Apply optional filters to narrow down the exported data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {exportStep === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-3"
                  onClick={() => {
                    setExportType('pdf');
                    setExportStep(2);
                  }}
                >
                  <FileText className="h-8 w-8 text-red-600" />
                  <span className="font-semibold">PDF</span>
                  <span className="text-xs text-gray-500">Document format</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-3"
                  onClick={() => {
                    setExportType('excel');
                    setExportStep(2);
                  }}
                >
                  <FileText className="h-8 w-8 text-green-600" />
                  <span className="font-semibold">Excel</span>
                  <span className="text-xs text-gray-500">Spreadsheet format</span>
                </Button>
              </div>
            )}
            {exportStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">From Date</Label>
                    <Input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => handleFilterChange('fromDate', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">To Date</Label>
                    <Input
                      type="date"
                      value={filters.toDate}
                      onChange={e => handleFilterChange('toDate', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Accountability Form No</Label>
                    <Input
                      type="text"
                      placeholder="e.g. AF-001"
                      value={filters.accountabilityFormNo}
                      onChange={e => handleFilterChange('accountabilityFormNo', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Asset Code</Label>
                    <Input
                      type="text"
                      placeholder="e.g. AST-001"
                      value={filters.assetCode}
                      onChange={e => handleFilterChange('assetCode', e.target.value)}
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-4 border-t">
            {exportStep === 2 && (
              <Button variant="outline" onClick={handlePrevStep}>
                Back
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleExportConfirm} disabled={!exportType}>
                {exportStep === 1 ? 'Next' : `Export ${exportType?.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </UIDialog>
    </div>
  );
}

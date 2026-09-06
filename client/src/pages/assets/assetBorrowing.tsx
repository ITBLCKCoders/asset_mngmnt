'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HandHelping, LayoutGrid, Table, Calendar, Package, User, FileText, Building2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { downloadPDF, generateAssetBorrowingPDF } from '@/lib/pdfGenerator';
import {
  borrowRequestStatusLabel,
  type BorrowRequestRow,
} from './borrowRequestsPage';
import { ProcessBorrowRequestSummary } from './borrowRequestsPage';
import { Shimmer } from '@/components/ui/shimmer';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';

type BorrowScope = 'it' | 'admin';

const myBorrowRequestColumns: ColumnDef<BorrowRequestRow>[] = [
  {
    id: 'form_number',
    header: 'Form #',
    accessorFn: row => row.form_number ?? '',
    size: 140,
    cell: ({ row }) => row.original.form_number?.trim() || '—',
  },
  {
    id: 'borrow_scope',
    header: 'Scope',
    accessorKey: 'borrow_scope',
    size: 100,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs uppercase">
        {row.original.borrow_scope}
      </span>
    ),
  },
  {
    id: 'description',
    header: 'Description',
    accessorFn: row => (row as any).description ?? '',
    size: 260,
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[320px] text-sm">{(row.original as any).description ?? '—'}</span>
    ),
  },
  {
    id: 'expected_return_at',
    header: 'Expected return',
    accessorKey: 'expected_return_at',
    size: 170,
    cell: ({ row }) =>
      row.original.expected_return_at
        ? new Date(row.original.expected_return_at).toLocaleString()
        : '—',
  },
  {
    id: 'purpose',
    header: 'Purpose',
    accessorKey: 'purpose',
    size: 220,
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[240px] text-sm">
        {row.original.purpose}
      </span>
    ),
  },
  {
    id: 'approved_by',
    header: 'Approved By',
    accessorFn: row => row.dept_head_name ?? row.received_by_name ?? row.approved_by_name ?? '',
    size: 180,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.dept_head_name ?? row.original.received_by_name ?? row.original.approved_by_name ?? '—'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: row => borrowRequestStatusLabel(row),
    size: 140,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {borrowRequestStatusLabel(row.original)}
      </Badge>
    ),
  },
  {
    id: 'created_at',
    header: 'Requested',
    accessorKey: 'created_at',
    size: 170,
    cell: ({ row }) =>
      row.original.created_at
        ? new Date(row.original.created_at).toLocaleString()
        : '—',
  },
];

export default function AssetBorrowing() {
  const { hasPermission } = useUserPermissions();
  const { user: currentUser } = useCurrentUser();
  const [formOpen, setFormOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<BorrowRequestRow[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [returnGuideOpen, setReturnGuideOpen] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] =
    useState<BorrowRequestRow | null>(null);
  const [selectedViewRequest, setSelectedViewRequest] =
    useState<BorrowRequestRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [viewSwitchingLoading, setViewSwitchingLoading] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  const [borrowScope, setBorrowScope] = useState<BorrowScope | ''>('');
  const [description, setDescription] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [purpose, setPurpose] = useState('');

  const canCreate = hasPermission('Asset Borrowing', 'create');
  const isBorrowFormValid =
    Boolean(borrowScope) &&
    description.trim().length >= 10 &&
    description.trim().length <= 1000 &&
    Boolean(expectedReturn.trim()) &&
    Boolean(purpose.trim()) &&
    (() => {
      const selectedDate = new Date(expectedReturn);
      const now = new Date();
      return !Number.isNaN(selectedDate.getTime()) && selectedDate >= now;
    })();

const loadMyRequests = useCallback(async () => {
    setLoadingMyRequests(true);
    try {
      const res = await api.get<unknown>('/asset-borrow-requests/mine');
      const payload =
        res &&
        typeof res === 'object' &&
        'success' in res &&
        (res as { success?: boolean }).success === true &&
        'data' in res
          ? (res as { data: { borrowRequests?: BorrowRequestRow[] } }).data
          : (res as { borrowRequests?: BorrowRequestRow[] });
      const list = payload?.borrowRequests ?? [];
      setMyRequests(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load your borrow requests');
      setMyRequests([]);
    } finally {
      setLoadingMyRequests(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  const resetForm = () => {
    setBorrowScope('');
    setDescription('');
    setExpectedReturn('');
    setPurpose('');
  };

  const openTermsFromForm = () => {
    if (!borrowScope) {
      toast.error('Select IT Asset or Admin Asset');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    if (description.trim().length > 1000) {
      toast.error('Description max 1000 characters');
      return;
    }
    if (!expectedReturn.trim()) {
      toast.error('Expected return date and time is required');
      return;
    }
    const selectedDate = new Date(expectedReturn);
    const now = new Date();
    if (selectedDate < now) {
      toast.error('Expected return date and time cannot be in the past');
      return;
    }
    if (!purpose.trim()) {
      toast.error('Purpose is required');
      return;
    }
    setTermsOpen(true);
  };

  const submitBorrowRequest = async () => {
    const iso = new Date(expectedReturn);
    if (Number.isNaN(iso.getTime())) {
      toast.error('Invalid return date');
      return;
    }
    pendingActionRef.current = async () => {
      setSubmitting(true);
      try {
        const digitalSignature = (currentUser as any)?.digitalSignature || '';
        await api.post<unknown>('/asset-borrow-requests', {
          borrow_scope: borrowScope,
          description: description.trim(),
          expected_return_at: iso.toISOString(),
          purpose: purpose.trim(),
          requested_by_signature: digitalSignature || undefined,
        });
        toast.success('Borrow request submitted');
        setFormOpen(false);
        resetForm();
        void loadMyRequests();
      } catch (e: unknown) {
        const msg =
          (e as { data?: { error?: string } })?.data?.error ||
          (e as Error)?.message ||
          'Failed to submit';
        toast.error(msg);
        throw e;
      } finally {
        setSubmitting(false);
      }
    };
    setTermsOpen(false);
    setShowOtpDialog(true);
  };

  const handleDownloadBorrowForm = async (row: BorrowRequestRow) => {
    try {
      const blob = await generateAssetBorrowingPDF({
        formNumber: row.form_number || row.borrow_request_id.slice(0, 8),
        title:
          row.borrow_scope === 'it'
            ? 'IT Equipment Borrowing'
            : 'Admin Equipment Borrowing',
        borrowerName:
          `${row.requester_first_name || ''} ${row.requester_last_name || ''}`.trim() ||
          row.requester_username ||
          row.requester_email ||
          '—',
        borrowerDepartment: row.requester_department_name || '—',
        equipmentName: (row as any).description || row.asset_name || '—',
        serialNumber: row.asset_serial || '',
        preUsageCondition: row.pre_usage_condition || '',
        borrowingDate: row.created_at || null,
        expectedReturnDate: row.expected_return_at || null,
        purpose: row.purpose || '',
        requestedBy:
          `${row.requester_first_name || ''} ${row.requester_last_name || ''}`.trim() ||
          row.requester_username ||
          row.requester_email ||
          '—',
        itReceivedBy: row.approved_by_name || '—',
        itApprovedBy: row.approved_by_name || '—',
        postUsageCondition: row.return_condition || '',
        borrowerCompanyName: row.requester_company_name ?? null,
        borrowerCompanyLogoUrl: row.requester_company_logo_url ?? null,
        requestedBySignature: row.requested_by_signature ?? null,
        requestedAt: row.created_at ?? null,
        deptHeadSignedAt: row.sub_approver_1_signed_at ?? row.dept_head_signed_at ?? null,
        deptHeadSignedBy: row.sub_approver_1_name ?? row.dept_head_name ?? null,
        deptHeadSignature:
          row.sub_approver_1_digital_signature ?? row.dept_head_digital_signature ?? null,
        subApprover1SignedAt: row.sub_approver_1_signed_at ?? null,
        subApprover1SignedBy: row.sub_approver_1_name ?? null,
        subApprover1Position: row.sub_approver_1_position ?? null,
        subApprover1Signature: row.sub_approver_1_digital_signature ?? null,
      });
      downloadPDF(blob, `Borrow_Form_${row.form_number ?? row.borrow_request_id}.pdf`);
      toast.success('Borrow form downloaded');
      // Only active borrows: avoid creating self-notifications for declined/closed requests.
      if (row.status === 'approved') {
        await api.post('/notifications', {
          title: 'Borrow asset ready to return',
          message: `Borrow form ${row.form_number ?? row.borrow_request_id.slice(0, 8)} is ready to return.`,
          type: 'reminder',
        });
      }
    } catch {
      toast.error('Failed to download borrow form');
    }
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {isInitialLoading ? (
          <>
            <Card className="border-0 shadow-md bg-gradient-to-r from-red-600 to-red-800">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Shimmer className="h-10 w-10 rounded-lg shrink-0 bg-white/20" />
                    <div className="space-y-2 min-w-0 flex-1">
                      <Shimmer className="h-6 w-48 max-w-full bg-white/20" />
                      <Shimmer className="h-3 w-64 max-w-full bg-white/20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Shimmer className="h-9 w-9 rounded-md bg-white/20" />
                    <Shimmer className="h-9 w-24 rounded-md bg-white/20" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="pb-6">
              {viewMode === 'table' ? (
                <DataTable<BorrowRequestRow>
                  tableId="my-asset-borrow-requests"
                  data={[]}
                  columns={myBorrowRequestColumns}
                  isLoading={true}
                  searchPlaceholder="Search scope, description, purpose, status…"
                  title="My requests"
                  onRowClick={() => {}}
                  titleBadge={undefined}
                  emptyState={undefined}
                  mobileCardFields={[]}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="border border-gray-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex gap-2 flex-1">
                            <Shimmer className="h-5 w-20 rounded-full bg-blue-50" />
                            <Shimmer className="h-5 w-16 rounded-full bg-blue-50" />
                          </div>
                          <Shimmer className="h-5 w-24 rounded-full bg-blue-50" />
                        </div>
                        <Shimmer className="h-6 w-3/4 rounded" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Shimmer className="h-4 w-4 rounded" />
                          <Shimmer className="h-4 w-24 rounded" />
                          <Shimmer className="h-4 w-40 rounded flex-1" />
                        </div>
                        <Shimmer className="h-5 w-full rounded" />
                        <Shimmer className="h-4 w-48 rounded" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        <PageHeader
          icon={HandHelping}
          title="Asset borrowing"
          description="Describe what you need. Your department head approves first; then IT or Admin processes the request."
        >
          <div className="flex items-center gap-2">
            <Button
              variant="header"
              size="sm"
              onClick={() => {
                setViewMode(viewMode === 'table' ? 'card' : 'table');
                setViewSwitchingLoading(true);
                setTimeout(() => setViewSwitchingLoading(false), 300);
              }}
              className="flex items-center gap-2"
            >
              {viewMode === 'table' ? <LayoutGrid className="h-4 w-4 mr-2" /> : <Table className="h-4 w-4 mr-2" />}
              {viewMode === 'table' ? 'Card' : 'Table'} View
            </Button>
            <Button
              variant="header"
              size="sm"
              onClick={() => setFormOpen(true)}
              disabled={!canCreate}
            >
              <HandHelping className="mr-2 h-4 w-4" />
              Borrow assets
            </Button>
          </div>
        </PageHeader>

        <div className="pb-6">
              {viewMode === 'table' ? (
                <DataTable<BorrowRequestRow>
                  tableId="my-asset-borrow-requests"
                  data={myRequests}
                  columns={myBorrowRequestColumns}
                  isLoading={loadingMyRequests || viewSwitchingLoading}
                  searchPlaceholder="Search scope, description, purpose, status…"
                  title="My requests"
                  onRowClick={row => {
                    const request = row.original as BorrowRequestRow;
                    if (request.status === 'approved') {
                      setSelectedReturnRequest(request);
                      setReturnGuideOpen(true);
                    } else {
                      setSelectedViewRequest(request);
                      setViewDialogOpen(true);
                    }
                  }}
                  titleBadge={
                    myRequests.length > 0
                      ? `${myRequests.length} request${myRequests.length !== 1 ? 's' : ''}`
                      : undefined
                  }
                  emptyState={
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl mx-4 mb-4">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <HandHelping className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No borrow requests yet
                      </h3>
                      <p className="text-gray-500 mb-4 text-center max-w-md">
                        You haven't submitted any asset borrow requests. Get started by requesting equipment you need.
                      </p>
                      <Button
                        onClick={() => setFormOpen(true)}
                        disabled={!canCreate}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Borrow assets
                      </Button>
                    </div>
                  }
                  mobileCardFields={[
                    {
                      key: 'form_number',
                      label: 'Form #',
                      render: row => row.form_number?.trim() || '—',
                    },
                    {
                      key: 'borrow_scope',
                      label: 'Scope',
                      render: row => (
                        <span className="text-xs uppercase">{row.borrow_scope}</span>
                      ),
                    },
                    {
                      key: 'description',
                      label: 'Description',
                      render: row => (row as any).description ?? '—',
                    },
                    {
                      key: 'expected_return_at',
                      label: 'Expected return',
                      render: row =>
                        row.expected_return_at
                          ? new Date(row.expected_return_at).toLocaleString()
                          : '—',
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: row => (
                        <Badge variant="outline" className="text-xs">
                          {borrowRequestStatusLabel(row)}
                        </Badge>
                      ),
                    },
                    {
                      key: 'created_at',
                      label: 'Requested',
                      render: row =>
                        row.created_at
                          ? new Date(row.created_at).toLocaleString()
                          : '—',
                    },
                    {
                      key: 'purpose',
                      label: 'Purpose',
                      render: row => row.purpose,
                    },
                    {
                      key: 'approved_by',
                      label: 'Approved By',
                      render: row => row.dept_head_name ?? (row as any).received_by_name ?? row.approved_by_name ?? '—',
                    },
                  ]}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      My requests
                      {myRequests.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({myRequests.length} request{myRequests.length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </h2>
                  </div>
                  {loadingMyRequests || viewSwitchingLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Card key={index} className="border border-gray-200 shadow-sm">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex gap-2 flex-1">
                                <Shimmer className="h-5 w-20 rounded-full bg-blue-50" />
                                <Shimmer className="h-5 w-16 rounded-full bg-blue-50" />
                              </div>
                              <Shimmer className="h-5 w-24 rounded-full bg-blue-50" />
                            </div>
                            <Shimmer className="h-6 w-3/4 rounded" />
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Shimmer className="h-4 w-4 rounded" />
                              <Shimmer className="h-4 w-24 rounded" />
                              <Shimmer className="h-4 w-40 rounded flex-1" />
                            </div>
                            <Shimmer className="h-5 w-full rounded" />
                            <Shimmer className="h-4 w-48 rounded" />
                            <Shimmer className="h-9 w-full rounded-lg" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : myRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-xl">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <HandHelping className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No borrow requests yet
                      </h3>
                      <p className="text-gray-500 mb-4 text-center max-w-md">
                        You haven't submitted any asset borrow requests. Get started by requesting equipment you need.
                      </p>
                      <Button
                        onClick={() => setFormOpen(true)}
                        disabled={!canCreate}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Borrow assets
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myRequests.map((request) => (
                        <div
                          key={request.borrow_request_id}
                          className="hover:shadow-md transition-shadow flex flex-col bg-white border border-slate-200 rounded-lg p-4 cursor-pointer"
                          onClick={() => {
                            if (request.status === 'approved') {
                              setSelectedReturnRequest(request);
                              setReturnGuideOpen(true);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <HandHelping className="h-5 w-5 text-red-700" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold">
                                  {request.form_number ?? request.borrow_request_id.slice(0, 8)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Created {request.created_at ? new Date(request.created_at).toLocaleString() : '—'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                              {borrowRequestStatusLabel(request)}
                            </Badge>
                          </div>

                          <div className="space-y-4 flex-1">
                            <div className="flex items-start gap-3">
                              <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Requested equipment</p>
                                <ul className="text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                                  <li className="flex items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                                    <span className="truncate">
                                      {(request as any).description ?? '—'}
                                    </span>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Requested by: {`${request.requester_first_name || ''} ${request.requester_last_name || ''}`.trim() || request.requester_username || request.requester_email || '—'}</p>
                                {request.requester_department_name?.trim() ? (
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Department: {request.requester_department_name}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600">
                                  Expected return:{' '}
                                  {request.expected_return_at
                                    ? new Date(request.expected_return_at).toLocaleString()
                                    : '—'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  Purpose: {request.purpose || '—'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600">
                                  Scope: {request.borrow_scope === 'it' ? 'IT' : 'Admin'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 mt-4">
                            <Button
                              className="w-full sm:flex-1 bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (request.status === 'approved') {
                                  setSelectedReturnRequest(request);
                                  setReturnGuideOpen(true);
                                } else {
                                  setSelectedViewRequest(request);
                                  setViewDialogOpen(true);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">{request.status === 'approved' ? 'Return' : 'View'}</span>
                              <span className="sm:hidden">{request.status === 'approved' ? 'Return' : 'View'}</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <AppDialogFrame className="max-w-lg overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-2">
                  <HandHelping className="h-6 w-6 shrink-0 text-white" />
                  Borrow assets
                </span>
              }
              description="Describe what you need, set when you expect to return it, and explain the purpose."
            />

            <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Scope <span className="text-red-600">*</span></p>
                  <Select
                    value={borrowScope === '' ? undefined : borrowScope}
                    onValueChange={(v: BorrowScope) => {
                      setBorrowScope(v);
                    }}
                    disabled={!canCreate}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-white focus:ring-2 focus:ring-red-500/20">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg z-[10000]">
                      <SelectItem value="it" className="rounded-lg">IT Asset</SelectItem>
                      <SelectItem value="admin" className="rounded-lg">Admin Asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Description <span className="text-red-600">*</span></p>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    disabled={!borrowScope || !canCreate}
                    placeholder="Describe what you want to borrow (e.g. Laptop Dell XPS 16GB RAM, Projector 3000 lumens for conference)"
                    className="min-h-[96px] rounded-xl border-slate-200 bg-white"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min 10 characters</span>
                    <span>{description.length}/1000</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Expected return <span className="text-red-600">*</span></p>
                  <Input
                    id="expected-return"
                    type="datetime-local"
                    value={expectedReturn}
                    onChange={e => setExpectedReturn(e.target.value)}
                    disabled={!canCreate}
                    min={new Date().toISOString().slice(0, 16)}
                    className="h-10 w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-white focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Purpose <span className="text-red-600">*</span></p>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    rows={3}
                    disabled={!canCreate}
                    placeholder="Describe why you need this equipment"
                    className="min-h-[88px] rounded-xl border-slate-200 bg-white"
                  />
                </div>
              </div>

              {!isBorrowFormValid ? (
                <p className="text-sm text-muted-foreground">
                  Complete all required fields (*) to continue.
                </p>
              ) : null}
            </AppDialogBody>

            <AppDialogChromeFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="hover:bg-red-600 hover:text-white hover:border-red-600"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-red-600"
                onClick={openTermsFromForm}
                disabled={!canCreate || !isBorrowFormValid}
              >
                Submit
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <AppDialogFrame className="max-w-lg overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title="Terms and conditions"
              description="Once this borrow request is approved, you are agreeing to the following."
            />
            <AppDialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm text-gray-700">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  The borrower agrees to handle the equipment with care and
                  return it in the same condition as received.
                </li>
                <li>
                  The borrower is responsible for any damage or loss incurred
                  during the borrowing period.
                </li>
                <li>
                  Equipment must be returned by the expected return date. Late
                  returns may result in penalty.
                </li>
                <li>
                  Any issues or malfunctions with the equipment must be reported
                  to IT Dept immediately.
                </li>
              </ol>
            </AppDialogBody>
            <AppDialogChromeFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTermsOpen(false)}
                disabled={submitting}
                className="hover:bg-red-600 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitBorrowRequest()}
                disabled={submitting}
                className="bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-red-600"
              >
                Submit
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
            toast.success('Borrow request submitted');
          }}
          onCancel={() => {
            pendingActionRef.current = null;
          }}
          pendingActionRef={pendingActionRef}
          title="OTP SMS Verification"
          description="OTP SMS Verification has been sent to your registered mobile number for borrow request submission."
          verifyButtonLabel="Verify & Submit"
        />

        <Dialog open={returnGuideOpen} onOpenChange={setReturnGuideOpen}>
          <AppDialogFrame className="max-w-lg overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title="Return action"
              description="Next steps for returning your borrowed asset."
            />
            <AppDialogBody className="space-y-3 text-sm text-gray-700">
              <p>
                Download this borrowing form and go to IT / admin to process your borrowed asset return.
              </p>
              <p>
                The file downloaded here is the borrowing form PDF.
              </p>
            </AppDialogBody>
            <AppDialogChromeFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setReturnGuideOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() =>
                  selectedReturnRequest
                    ? void handleDownloadBorrowForm(selectedReturnRequest)
                    : null
                }
                disabled={!selectedReturnRequest}
              >
                Return
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <AppDialogFrame className="max-w-lg max-h-[85vh]">
            <AppDialogGradientHeader
              title="Borrow Request Details"
              description="View your borrow request information"
            />
            <AppDialogBody className="space-y-4">
              {selectedViewRequest && <ProcessBorrowRequestSummary row={selectedViewRequest} />}
            </AppDialogBody>
            <AppDialogChromeFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() =>
                  selectedViewRequest
                    ? void handleDownloadBorrowForm(selectedViewRequest)
                    : null
                }
                disabled={!selectedViewRequest}
              >
                Download PDF
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      </main>
    </div>
  );
}

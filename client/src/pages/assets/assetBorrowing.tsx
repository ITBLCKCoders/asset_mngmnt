'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandHelping } from 'lucide-react';
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
import { downloadPDF, generateAssetBorrowingPDF } from '@/lib/pdfGenerator';
import {
  buildBorrowDataForPDFFromBatch,
  type AssetBorrowFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import {
  classifyDepartmentScopeByName,
  parseCategoryDepartment,
} from '@/lib/assetScope';
import {
  borrowRequestStatusLabel,
  type BorrowRequestRow,
} from './borrowRequestsPage';

type BorrowScope = 'it' | 'admin';

interface CategoryRow {
  categoryID?: string;
  id?: string;
  name: string;
  department?: unknown;
}

interface TypeRow {
  typeID?: string;
  id?: string;
  name: string;
  category_id: string;
}

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
    id: 'category_name',
    header: 'Category',
    accessorFn: row => row.category_name ?? '',
    size: 160,
    cell: ({ row }) => row.original.category_name ?? '—',
  },
  {
    id: 'type_name',
    header: 'Type',
    accessorFn: row => row.type_name ?? '',
    size: 160,
    cell: ({ row }) => row.original.type_name ?? '—',
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
  const [formOpen, setFormOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [nextStepsOpen, setNextStepsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<BorrowRequestRow[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(true);
  const [returnGuideOpen, setReturnGuideOpen] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] =
    useState<BorrowRequestRow | null>(null);

  const [borrowScope, setBorrowScope] = useState<BorrowScope | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [purpose, setPurpose] = useState('');

  const canCreate = hasPermission('Asset Borrowing', 'create');
  const isBorrowFormValid =
    Boolean(borrowScope) &&
    Boolean(categoryId) &&
    Boolean(typeId) &&
    Boolean(expectedReturn.trim()) &&
    Boolean(purpose.trim());

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const catRes = await api.get<unknown>('/categories');
      const catRaw = Array.isArray(catRes)
        ? catRes
        : (catRes as { categories?: CategoryRow[] }).categories ?? [];
      const normCats = (catRaw as CategoryRow[]).map(c => ({
        ...c,
        id: c.categoryID || c.id || '',
      }));
      setCategories(normCats.filter(c => c.id));

      const typeRes = await api.get<unknown>('/types');
      const typeRaw = Array.isArray(typeRes)
        ? typeRes
        : (typeRes as { types?: TypeRow[] }).types ?? [];
      const normTypes = (typeRaw as TypeRow[]).map(t => ({
        ...t,
        id: t.typeID || t.id || '',
      }));
      setTypes(normTypes.filter(t => t.id));
    } catch {
      toast.error('Failed to load categories or types');
      setCategories([]);
      setTypes([]);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

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
    }
  }, []);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  useEffect(() => {
    if (formOpen) {
      void loadMeta();
    }
  }, [formOpen, loadMeta]);

  const filteredCategories = useMemo(() => {
    if (!borrowScope) return [];
    const want: 'IT' | 'Admin' = borrowScope === 'it' ? 'IT' : 'Admin';
    return categories.filter(c => {
      const dept = parseCategoryDepartment(c.department);
      return classifyDepartmentScopeByName(dept?.name) === want;
    });
  }, [borrowScope, categories]);

  const filteredTypes = useMemo(() => {
    if (!categoryId) return [];
    return types.filter(t => t.category_id === categoryId);
  }, [categoryId, types]);

  const resetForm = () => {
    setBorrowScope('');
    setCategoryId('');
    setTypeId('');
    setExpectedReturn('');
    setPurpose('');
  };

  const openTermsFromForm = () => {
    if (!borrowScope) {
      toast.error('Select IT Asset or Admin Asset');
      return;
    }
    if (!categoryId || !typeId) {
      toast.error('Select category and type');
      return;
    }
    if (!expectedReturn.trim()) {
      toast.error('Expected return date and time is required');
      return;
    }
    if (!purpose.trim()) {
      toast.error('Purpose is required');
      return;
    }
    setTermsOpen(true);
  };

  const submitBorrowRequest = async () => {
    setSubmitting(true);
    try {
      const iso = new Date(expectedReturn);
      if (Number.isNaN(iso.getTime())) {
        toast.error('Invalid return date');
        return;
      }
      await api.post<unknown>('/asset-borrow-requests', {
        borrow_scope: borrowScope,
        category_id: categoryId,
        type_id: typeId,
        expected_return_at: iso.toISOString(),
        purpose: purpose.trim(),
      });
      toast.success('Borrow request submitted');
      setTermsOpen(false);
      setFormOpen(false);
      setNextStepsOpen(true);
      resetForm();
      void loadMyRequests();
    } catch (e: unknown) {
      const msg =
        (e as { data?: { error?: string } })?.data?.error ||
        (e as Error)?.message ||
        'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadLatestBorrowForm = async () => {
    try {
      const res = await api.get<unknown>('/asset-borrow-requests/mine');
      const payload =
        res &&
        typeof res === 'object' &&
        'success' in res &&
        (res as { success?: boolean }).success === true &&
        'data' in res
          ? (res as { data: { borrowRequests?: AssetBorrowFormBatch[] } }).data
          : (res as { borrowRequests?: AssetBorrowFormBatch[] });
      const list = payload?.borrowRequests ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        toast.error('No borrow form found to download yet');
        return;
      }

      const latest = [...list].sort((a, b) => {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        return bTime - aTime;
      })[0];

      const data = buildBorrowDataForPDFFromBatch(latest);
      if (!data) {
        toast.error('Cannot generate PDF for this borrow form');
        return;
      }

      const blob = await generateAssetBorrowingPDF(data);
      const fileName = latest.form_number?.trim()
        ? `Borrow_Form_${latest.form_number}_${Date.now()}.pdf`
        : `Borrow_Form_${Date.now()}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('Borrow form downloaded successfully');
    } catch {
      toast.error('Failed to download borrow form PDF');
    }
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
        equipmentName: row.asset_name || row.type_name || row.category_name || '—',
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
        <PageHeader
          icon={HandHelping}
          title="Asset borrowing"
          description="Request equipment by category and type. Your department head approves first; then IT or Admin processes the request."
        />

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">
              My asset Borrowing Request
            </CardTitle>
            <Button
              onClick={() => setFormOpen(true)}
              disabled={!canCreate}
              className="shrink-0 self-end bg-red-600 text-white hover:bg-red-700 sm:self-auto"
            >
              Borrow assets
            </Button>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <div className="px-4 pb-6 sm:px-6">
              <DataTable<BorrowRequestRow>
                tableId="my-asset-borrow-requests"
                data={myRequests}
                columns={myBorrowRequestColumns}
                isLoading={loadingMyRequests}
                searchPlaceholder="Search scope, category, type, purpose, status…"
                title="My requests"
                onRowClick={row => {
                  const request = row.original as BorrowRequestRow;
                  if (request.status === 'approved') {
                    setSelectedReturnRequest(request);
                    setReturnGuideOpen(true);
                  }
                }}
                titleBadge={
                  myRequests.length > 0
                    ? `${myRequests.length} request${myRequests.length !== 1 ? 's' : ''}`
                    : undefined
                }
                emptyState={
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    You have not submitted any borrow requests yet.
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
                    key: 'category_name',
                    label: 'Category',
                    render: row => row.category_name ?? '—',
                  },
                  {
                    key: 'type_name',
                    label: 'Type',
                    render: row => row.type_name ?? '—',
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
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <AppDialogFrame className="max-w-lg overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-2">
                  <HandHelping className="h-6 w-6 shrink-0 text-white" />
                  Borrow assets
                </span>
              }
              description="Choose scope, category, type, and when you expect to return the equipment."
            />

            <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
              <div className="space-y-2">
                <Label>IT Asset or Admin Asset *</Label>
                <Select
                  value={borrowScope === '' ? undefined : borrowScope}
                  onValueChange={(v: BorrowScope) => {
                    setBorrowScope(v);
                    setCategoryId('');
                    setTypeId('');
                  }}
                  disabled={!canCreate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT Asset</SelectItem>
                    <SelectItem value="admin">Admin Asset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asset category *</Label>
                <Select
                  value={categoryId}
                  onValueChange={v => {
                    setCategoryId(v);
                    setTypeId('');
                  }}
                  disabled={!borrowScope || !canCreate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id!}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asset type *</Label>
                <Select
                  value={typeId}
                  onValueChange={setTypeId}
                  disabled={!categoryId || !canCreate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTypes.map(t => (
                      <SelectItem key={t.id} value={t.id!}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected-return">
                  Expected return date and time *
                </Label>
                <Input
                  id="expected-return"
                  type="datetime-local"
                  value={expectedReturn}
                  onChange={e => setExpectedReturn(e.target.value)}
                  disabled={!canCreate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  rows={3}
                  disabled={!canCreate}
                  placeholder="Describe why you need this equipment"
                />
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
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={openTermsFromForm}
                disabled={!canCreate || loadingMeta || !isBorrowFormValid}
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
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitBorrowRequest()}
                disabled={submitting}
              >
                Submit
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={nextStepsOpen} onOpenChange={setNextStepsOpen}>
          <AppDialogFrame className="max-w-lg overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title="Next steps"
              description="Complete these steps so your borrow request can be processed."
            />
            <AppDialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm text-gray-700">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Download this equipment borrow form and sign it.</li>
                <li>
                  Make your department head sign it and ensure they also approve
                  it in the Asset Management System.
                </li>
                <li>
                  After your department head approves it, go to IT/Admin and
                  submit the borrow form for processing.
                </li>
              </ol>
            </AppDialogBody>
            <AppDialogChromeFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNextStepsOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setNextStepsOpen(false);
                  void handleDownloadLatestBorrowForm();
                }}
              >
                Download Borrow Form PDF
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

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
      </main>
    </div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlignLeft,
  Building2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Eye,
  ImagePlus,
  Layers,
  Mail,
  Package,
  User,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import {
  downloadPDF,
  generateAssetBorrowingPDF,
} from '@/lib/pdfGenerator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/ui/shimmer';

const MAX_BORROW_CONDITION_PHOTOS = 5;
const VALID_CONDITION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_CONDITION_IMAGE_MB = 5;

/** Asset rows from GET .../available-assets (temporary accountability pool). */
export type BorrowStaffPoolAsset = {
  assetID: string;
  asset_code: string;
  name: string | null;
  serial: string | null;
  category_name?: string | null;
  type_name?: string | null;
  department_name?: string | null;
};

export interface BorrowRequestRow {
  borrow_request_id: string;
  borrow_scope: 'it' | 'admin';
  expected_return_at: string;
  purpose: string;
  status: string;
  created_at: string;
  form_number?: string | null;
  category_name?: string;
  type_name?: string;
  requester_department_name?: string | null;
  requester_first_name?: string | null;
  requester_last_name?: string | null;
  requester_username?: string | null;
  requester_email?: string | null;
  requester_company_name?: string | null;
  requester_company_logo_url?: string | null;
  declined_at?: string | null;
  pre_usage_condition?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  asset_code?: string | null;
  asset_name?: string | null;
  asset_serial?: string | null;
  return_condition?: string | null;
  processor_wet_borrow_pdf_url?: string | null;
  dept_head_signed_at?: string | null;
  processor_declined_at?: string | null;
  /** Staff decline remarks (processor), when applicable */
  processor_decline_reason?: string | null;
  returned_at?: string | null;
  /** JSON array of image URLs from processor at borrow time */
  pre_usage_condition_images?: string | null;
}

/** Request is finished on the staff queue: no approve/decline/processing. */
export function isBorrowRequestStaffReadOnly(r: BorrowRequestRow): boolean {
  return (
    r.status === 'declined' ||
    r.status === 'returned' ||
    Boolean(r.declined_at) ||
    Boolean(r.processor_declined_at) ||
    Boolean(r.returned_at)
  );
}

export function borrowRequestStatusLabel(r: BorrowRequestRow): string {
  if (r.processor_declined_at) return 'Declined (processor)';
  if (r.declined_at) return 'Declined';
  if (r.returned_at || r.status === 'returned') return 'Returned';
  switch (r.status) {
    case 'pending_dept_head':
      return 'Awaiting department head';
    case 'pending_staff':
      return 'Awaiting IT/Admin';
    case 'declined':
      return 'Declined';
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    default:
      return r.status.replace(/_/g, ' ');
  }
}

const requesterName = (r: BorrowRequestRow) =>
  `${r.requester_first_name || ''} ${r.requester_last_name || ''}`.trim() ||
  r.requester_username ||
  r.requester_email ||
  '—';

const borrowFormTitle = (scope: BorrowRequestRow['borrow_scope']) =>
  scope === 'it' ? 'IT Equipment Borrowing' : 'Admin Equipment Borrowing';

const borrowScopeLabel = (scope: BorrowRequestRow['borrow_scope']) =>
  scope === 'it' ? 'IT' : 'Admin';

/** Display MySQL / ISO datetimes in the user’s locale (date + time). */
function formatBorrowDateTime(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

type SummaryFieldProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
};

function SummaryField({ icon: Icon, label, value, className }: SummaryFieldProps) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-slate-100 bg-white/90 px-3 py-2.5 shadow-sm',
        'transition-colors hover:border-slate-200/80 hover:bg-white',
        className
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-gradient-to-br from-red-50 to-rose-50/80 text-red-600"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-slate-900 break-words">{value}</p>
      </div>
    </div>
  );
}

function SummarySectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</p>
  );
}

function ProcessBorrowRequestSummary({ row }: { row: BorrowRequestRow }) {
  const email = row.requester_email?.trim();
  const purpose = row.purpose?.trim() || '—';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25">
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              Borrower &amp; request
            </p>
            <p className="text-xs text-slate-500">Details from the borrowing form</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'w-fit shrink-0 border-red-200 bg-red-50/80 text-red-800 font-semibold',
            'px-2.5 py-0.5 text-xs'
          )}
        >
          {borrowScopeLabel(row.borrow_scope)} scope
        </Badge>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="space-y-2">
          <SummarySectionTitle>Contact</SummarySectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryField icon={User} label="Borrower" value={requesterName(row)} className="sm:col-span-2" />
            <SummaryField
              icon={Building2}
              label="Department"
              value={row.requester_department_name?.trim() || '—'}
              className={email ? undefined : 'sm:col-span-2'}
            />
            {email ? <SummaryField icon={Mail} label="Contact email" value={email} /> : null}
          </div>
        </div>

        <div className="space-y-2">
          <SummarySectionTitle>Requested equipment</SummarySectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryField
              icon={Layers}
              label="Category"
              value={row.category_name?.trim() || '—'}
            />
            <SummaryField icon={Package} label="Type" value={row.type_name?.trim() || '—'} />
          </div>
        </div>

        <div className="space-y-2">
          <SummarySectionTitle>Schedule</SummarySectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryField
              icon={CalendarPlus}
              label="Borrowing request date"
              value={formatBorrowDateTime(row.created_at)}
            />
            <SummaryField
              icon={CalendarClock}
              label="Expected return"
              value={formatBorrowDateTime(row.expected_return_at)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <SummarySectionTitle>Purpose</SummarySectionTitle>
          <div className="flex gap-3 rounded-xl border border-red-100/80 bg-gradient-to-br from-red-50/40 via-white to-slate-50/50 px-3 py-3 shadow-sm">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600"
              aria-hidden
            >
              <AlignLeft className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
              {purpose}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BorrowRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<BorrowRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BorrowRequestRow | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<BorrowStaffPoolAsset[]>([]);
  const [selectedAssetCode, setSelectedAssetCode] = useState('');
  const [preUsageCondition, setPreUsageCondition] = useState('Good');
  const [processorRemarks, setProcessorRemarks] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [verificationReceived, setVerificationReceived] = useState(false);
  const [verificationSameCondition, setVerificationSameCondition] = useState(false);
  const [processorConditionImages, setProcessorConditionImages] = useState<string[]>([]);
  const [returnConditionImages, setReturnConditionImages] = useState<string[]>([]);

  const assetsByDepartment = useMemo(() => {
    const map = new Map<string, BorrowStaffPoolAsset[]>();
    for (const a of availableAssets) {
      const key = (a.department_name && a.department_name.trim()) || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].sort(([da], [db]) => da.localeCompare(db));
  }, [availableAssets]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/asset-borrow-requests');
      setRows(res?.data?.borrowRequests ?? res?.borrowRequests ?? []);
    } catch {
      toast.error('Failed to load borrow requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!returnOpen) return;
    setReturnConditionImages([]);
    setReturnRemarks('');
    setReturnCondition('Good');
    setVerificationReceived(false);
    setVerificationSameCondition(false);
  }, [returnOpen]);

  useEffect(() => {
    const id = searchParams.get('openBorrowRequestId');
    if (!id || loading) return;
    const hit = rows.find(r => r.borrow_request_id === id);
    if (!hit) return;
    setSelected(hit);
    if (hit.status === 'approved' && !isBorrowRequestStaffReadOnly(hit)) {
      setReturnOpen(true);
    } else {
      setProcessOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('openBorrowRequestId');
    setSearchParams(next, { replace: true });
  }, [rows, loading, searchParams, setSearchParams]);

  const openProcessDialog = async (row: BorrowRequestRow) => {
    setSelected(row);
    setProcessorConditionImages([]);
    setSelectedAssetCode('');
    setProcessorRemarks('');
    setPreUsageCondition('Good');
    setAvailableAssets([]);

    if (row.status === 'approved' && !isBorrowRequestStaffReadOnly(row)) {
      setProcessOpen(false);
      setReturnOpen(true);
      return;
    }

    setProcessOpen(true);
    if (row.status !== 'pending_staff' || isBorrowRequestStaffReadOnly(row)) return;

    setAssetsLoading(true);
    try {
      const res = await api.get<{
        success?: boolean;
        data?: { assets?: BorrowStaffPoolAsset[] };
        assets?: BorrowStaffPoolAsset[];
      }>(`/asset-borrow-requests/${row.borrow_request_id}/available-assets`);
      const payload = res && typeof res === 'object' && 'data' in res ? res.data : res;
      const list = payload?.assets;
      setAvailableAssets(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load available assets');
      setAvailableAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleAddBorrowConditionPhoto = async (file: File) => {
    if (processorConditionImages.length >= MAX_BORROW_CONDITION_PHOTOS) {
      toast.error(`Maximum ${MAX_BORROW_CONDITION_PHOTOS} photos`);
      return;
    }
    if (!VALID_CONDITION_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > MAX_CONDITION_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_CONDITION_IMAGE_MB}MB`);
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
      if (!url) {
        toast.error('Upload succeeded but no image URL was returned.');
        return;
      }
      setProcessorConditionImages(prev => [...prev, url]);
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      toast.error(e?.data?.error || e?.message || 'Upload failed');
    }
  };

  const handleProcessBorrow = async () => {
    if (!selected || !selectedAssetCode) return;
    try {
      await api.post(`/asset-borrow-requests/${selected.borrow_request_id}/staff-approve`, {
        asset_code: selectedAssetCode,
        pre_usage_condition: preUsageCondition,
        processor_remarks: processorRemarks.trim() || undefined,
        condition_images:
          processorConditionImages.length > 0 ? processorConditionImages : undefined,
      });
      toast.success('Borrow request processed');
      setProcessOpen(false);
      setProcessorConditionImages([]);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { data?: { error?: string } })?.data?.error ||
        (e as Error)?.message ||
        'Failed to process borrow request';
      toast.error(msg);
    }
  };

  const handleDecline = async () => {
    if (!selected || !declineReason.trim()) return;
    await api.post(`/asset-borrow-requests/${selected.borrow_request_id}/staff-decline`, {
      reason: declineReason.trim(),
    });
    toast.success('Borrow request declined');
    setDeclineOpen(false);
    setProcessOpen(false);
    setReturnOpen(false);
    await load();
  };

  const handleAddReturnConditionPhoto = async (file: File) => {
    if (returnConditionImages.length >= MAX_BORROW_CONDITION_PHOTOS) {
      toast.error(`Maximum ${MAX_BORROW_CONDITION_PHOTOS} photos`);
      return;
    }
    if (!VALID_CONDITION_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > MAX_CONDITION_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_CONDITION_IMAGE_MB}MB`);
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
      if (!url) {
        toast.error('Upload succeeded but no image URL was returned.');
        return;
      }
      setReturnConditionImages(prev => [...prev, url]);
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      toast.error(e?.data?.error || e?.message || 'Upload failed');
    }
  };

  const handleProcessReturn = async () => {
    if (!selected || !verificationReceived || !verificationSameCondition) return;
    try {
      await api.post(`/asset-borrow-requests/${selected.borrow_request_id}/process-return`, {
        return_condition: returnCondition,
        return_remarks: returnRemarks.trim() || undefined,
        condition_images:
          returnConditionImages.length > 0 ? returnConditionImages : undefined,
        verification_received: verificationReceived,
        verification_same_condition: verificationSameCondition,
      });
      toast.success('Borrow return processed');
      setReturnOpen(false);
      setReturnConditionImages([]);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { data?: { error?: string } })?.data?.error ||
        (e as Error)?.message ||
        'Failed to process borrow return';
      toast.error(msg);
    }
  };

  const handleDownload = async (row: BorrowRequestRow) => {
    const blob = await generateAssetBorrowingPDF({
      formNumber: row.form_number || row.borrow_request_id.slice(0, 8),
      title: borrowFormTitle(row.borrow_scope),
      borrowerName: requesterName(row),
      borrowerDepartment: row.requester_department_name || '—',
      equipmentName:
        row.asset_name || row.type_name || row.category_name || '—',
      serialNumber: row.asset_serial || '',
      preUsageCondition: row.pre_usage_condition || '',
      borrowingDate: row.created_at || null,
      expectedReturnDate: row.expected_return_at || null,
      purpose: row.purpose || '',
      requestedBy: requesterName(row),
      itReceivedBy: row.approved_by_name || '—',
      itApprovedBy: row.approved_by_name || '—',
      postUsageCondition: row.return_condition || '',
      borrowerCompanyName: row.requester_company_name ?? null,
      borrowerCompanyLogoUrl: row.requester_company_logo_url ?? null,
    });
    downloadPDF(
      blob,
      `Equipment_Borrowing_${row.form_number ?? row.borrow_request_id}.pdf`
    );
  };

  const cards = useMemo(
    () =>
      rows.map(r => (
        <Card
          key={r.borrow_request_id}
          className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-red-500 hover:shadow-2xl transition-shadow"
        >
          <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-slate-900">
                {r.form_number ?? r.borrow_request_id.slice(0, 8)}
              </span>
              <Badge variant="outline">{borrowRequestStatusLabel(r)}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
              <User className="h-4 w-4 text-red-500" />
              {requesterName(r)}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 pt-4">
            <p className="text-xs text-slate-500">
              {(r.borrow_scope === 'it' ? 'IT Asset' : 'Admin Asset')} • {r.category_name ?? '—'} •{' '}
              {r.type_name ?? '—'}
            </p>
            {r.status === 'approved' ? (
              <Badge className="w-fit bg-amber-100 text-amber-900">
                Temporary accountability
              </Badge>
            ) : null}
            <p className="text-sm text-slate-700 line-clamp-2">{r.purpose || '—'}</p>
            <Button
              className="mt-auto w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              onClick={() => {
                if (r.status === 'approved' && !isBorrowRequestStaffReadOnly(r)) {
                  setSelected(r);
                  setReturnOpen(true);
                } else {
                  void openProcessDialog(r);
                }
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isBorrowRequestStaffReadOnly(r)
                ? 'View details'
                : r.status === 'approved'
                  ? 'Process Borrow Return'
                  : 'View / Process Borrow'}
            </Button>
            <Button variant="outline" onClick={() => void handleDownload(r)}>
              Download PDF
            </Button>
          </CardContent>
        </Card>
      )),
    [rows]
  );

  return (
    <div className="min-h-screen">
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PageHeader
          icon={ClipboardList}
          title="Asset borrowing requests"
          description="Pending and historical borrow requests for your IT or Admin scope."
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0 pt-0">
            <div className="space-y-4 px-4 pb-6 sm:px-6">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Card
                      key={index}
                      className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-gray-300"
                    >
                      <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <Shimmer className="h-6 w-24 rounded" />
                          <Shimmer className="h-5 w-20 rounded-full" />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Shimmer className="h-4 w-4 rounded" />
                          <Shimmer className="h-4 w-32 rounded" />
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3 pt-4">
                        <Shimmer className="h-4 w-48 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                        <Shimmer className="h-5 w-full rounded" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-muted-foreground">
                  No requests yet.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={processOpen} onOpenChange={setProcessOpen}>
          <AppDialogFrame className="max-w-xl">
            <AppDialogGradientHeader
              title={
                selected && isBorrowRequestStaffReadOnly(selected)
                  ? 'Borrow request (view only)'
                  : 'Process borrow request'
              }
              description={
                selected && isBorrowRequestStaffReadOnly(selected)
                  ? 'This request is closed. Details are shown for your records only — no processing actions are available.'
                  : selected
                    ? `Approve or decline this ${borrowScopeLabel(selected.borrow_scope)} equipment borrowing request. Assets listed are Available stock in temporary accountability for ${borrowScopeLabel(selected.borrow_scope)} processors.`
                    : 'Approve or decline this borrowing request.'
              }
            />
            <AppDialogBody className="space-y-4">
              {selected ? <ProcessBorrowRequestSummary row={selected} /> : null}
              {selected && isBorrowRequestStaffReadOnly(selected) ? (
                selected.processor_decline_reason?.trim() ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-800">
                      Processor decline remarks
                    </p>
                    <p className="mt-1 text-sm text-red-950 whitespace-pre-wrap break-words">
                      {selected.processor_decline_reason.trim()}
                    </p>
                  </div>
                ) : null
              ) : selected?.status === 'pending_staff' ? (
                <div className="space-y-2">
                  <Label htmlFor="borrow-asset-select" className="text-sm font-medium text-slate-800">
                    Assign asset{' '}
                    <span className="text-slate-400 font-normal">(temporary accountability pool)</span>
                  </Label>
                  <p className="text-xs text-slate-500">
                    Showing {borrowScopeLabel(selected.borrow_scope)} assets only — sorted with requested category &amp; type first, then by category and code.
                  </p>
                  <Select
                    value={selectedAssetCode || undefined}
                    onValueChange={setSelectedAssetCode}
                    disabled={assetsLoading}
                  >
                    <SelectTrigger
                      id="borrow-asset-select"
                      className={cn(
                        'h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-left text-slate-900 shadow-sm',
                        'hover:bg-white focus:ring-2 focus:ring-red-500/20',
                        assetsLoading && 'opacity-60'
                      )}
                    >
                      <SelectValue
                        placeholder={
                          assetsLoading ? 'Loading assets…' : 'Select an available asset'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-[min(320px,70vh)] rounded-xl border-slate-200 bg-white p-1 shadow-lg z-[10000]"
                      position="popper"
                      sideOffset={4}
                    >
                      {assetsLoading ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-500">
                          Loading assets…
                        </div>
                      ) : availableAssets.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-500">
                          No Available assets in this pool. Ensure assets are status &quot;Available&quot;
                          and tied to an {borrowScopeLabel(selected.borrow_scope)} department.
                        </div>
                      ) : (
                        assetsByDepartment.map(([deptName, group], gi) => (
                          <div key={deptName}>
                            {gi > 0 ? <SelectSeparator className="my-1 bg-slate-100" /> : null}
                            <SelectGroup>
                              <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {deptName}
                              </SelectLabel>
                              {group.map(a => (
                                <SelectItem
                                  key={a.assetID}
                                  value={a.asset_code}
                                  className="cursor-pointer rounded-lg py-2 pl-3 pr-8 text-sm focus:bg-red-50"
                                >
                                  <span className="font-mono font-medium text-slate-900">
                                    {a.asset_code}
                                  </span>
                                  {a.name ? (
                                    <span className="text-slate-700"> — {a.name}</span>
                                  ) : null}
                                  {a.type_name || a.category_name ? (
                                    <span className="block text-xs text-slate-500 mt-0.5">
                                      {[a.category_name, a.type_name].filter(Boolean).join(' · ')}
                                      {a.serial ? ` · SN ${a.serial}` : ''}
                                    </span>
                                  ) : a.serial ? (
                                    <span className="block text-xs text-slate-500 mt-0.5">
                                      SN {a.serial}
                                    </span>
                                  ) : null}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </div>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : selected ? (
                <p className="text-sm text-slate-600 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
                  This request is not awaiting processor assignment (
                  <span className="font-medium">{borrowRequestStatusLabel(selected)}</span>
                  ). Use the department approval workflow first, or open the return dialog if the
                  borrow is already active.
                </p>
              ) : null}

              {selected && !isBorrowRequestStaffReadOnly(selected) ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="borrow-pre-usage-condition" className="text-sm font-medium text-slate-800">
                      Pre-usage condition
                    </Label>
                    <Select value={preUsageCondition} onValueChange={setPreUsageCondition}>
                      <SelectTrigger
                        id="borrow-pre-usage-condition"
                        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-slate-900 shadow-sm hover:bg-white focus:ring-2 focus:ring-red-500/20"
                      >
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg z-[10000]">
                        {['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].map(c => (
                          <SelectItem key={c} value={c} className="rounded-lg">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borrow-processor-remarks" className="text-sm font-medium text-slate-800">
                      Processor remarks{' '}
                      <span className="text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="borrow-processor-remarks"
                      value={processorRemarks}
                      onChange={e => setProcessorRemarks(e.target.value)}
                      placeholder="Notes for the borrower or audit trail…"
                      className="min-h-[88px] rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-800">
                      Condition photos{' '}
                      <span className="text-slate-400 font-normal">
                        (optional, up to {MAX_BORROW_CONDITION_PHOTOS})
                      </span>
                    </Label>
                    <div className="flex flex-wrap gap-2 items-start">
                      {processorConditionImages.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative group"
                        >
                          <button
                            type="button"
                            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <img
                              src={url}
                              alt={`Pre-usage condition ${idx + 1}`}
                              className="h-20 w-20 object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setProcessorConditionImages(prev =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            aria-label="Remove photo"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {processorConditionImages.length < MAX_BORROW_CONDITION_PHOTOS && (
                        <label
                          className={cn(
                            'flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors',
                            assetsLoading && 'pointer-events-none opacity-50'
                          )}
                        >
                          <input
                            type="file"
                            accept={VALID_CONDITION_IMAGE_TYPES.join(',')}
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) void handleAddBorrowConditionPhoto(file);
                              e.target.value = '';
                            }}
                          />
                          <ImagePlus className="h-8 w-8 text-slate-400" />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </AppDialogBody>
            {selected && isBorrowRequestStaffReadOnly(selected) ? (
              <AppDialogChromeFooter className="justify-stretch gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setProcessOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selected) void handleDownload(selected);
                  }}
                >
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            ) : (
              <AppDialogChromeFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setProcessOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => setDeclineOpen(true)}>Decline</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  disabled={
                    selected?.status !== 'pending_staff' ||
                    !selectedAssetCode.trim() ||
                    assetsLoading
                  }
                  onClick={() => void handleProcessBorrow()}
                >
                  Process Borrow
                </Button>
              </AppDialogChromeFooter>
            )}
          </AppDialogFrame>
        </Dialog>

        <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
          <AppDialogFrame className="max-w-xl">
            <AppDialogGradientHeader
              title="Process borrow return"
              description="Verify the returned asset’s condition, add optional photos, confirm the checkboxes, then complete the return."
            />
            <AppDialogBody className="space-y-4">
              {selected ? <ProcessBorrowRequestSummary row={selected} /> : null}

              <div className="space-y-2">
                <Label htmlFor="borrow-return-condition" className="text-sm font-medium text-slate-800">
                  Return condition
                </Label>
                <Select value={returnCondition} onValueChange={setReturnCondition}>
                  <SelectTrigger
                    id="borrow-return-condition"
                    className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-slate-900 shadow-sm hover:bg-white focus:ring-2 focus:ring-red-500/20"
                  >
                    <SelectValue placeholder="Select return condition" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg z-[10000]">
                    {['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].map(c => (
                      <SelectItem key={c} value={c} className="rounded-lg">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrow-return-remarks" className="text-sm font-medium text-slate-800">
                  Return remarks{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="borrow-return-remarks"
                  value={returnRemarks}
                  onChange={e => setReturnRemarks(e.target.value)}
                  placeholder="Notes on the return or handover…"
                  className="min-h-[88px] rounded-xl border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-800">
                  Return condition photos{' '}
                  <span className="text-slate-400 font-normal">
                    (optional, up to {MAX_BORROW_CONDITION_PHOTOS})
                  </span>
                </Label>
                <p className="text-xs text-slate-500">
                  Document the asset as returned (same upload as other condition photos).
                </p>
                <div className="flex flex-wrap gap-2 items-start">
                  {returnConditionImages.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative group">
                      <button
                        type="button"
                        className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <img
                          src={url}
                          alt={`Return condition ${idx + 1}`}
                          className="h-20 w-20 object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReturnConditionImages(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Remove photo"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {returnConditionImages.length < MAX_BORROW_CONDITION_PHOTOS && (
                    <label className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept={VALID_CONDITION_IMAGE_TYPES.join(',')}
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) void handleAddReturnConditionPhoto(file);
                          e.target.value = '';
                        }}
                      />
                      <ImagePlus className="h-8 w-8 text-slate-400" />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="borrow-return-verify-received"
                    checked={verificationReceived}
                    onCheckedChange={v => setVerificationReceived(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="borrow-return-verify-received" className="text-sm font-normal text-slate-800 leading-snug cursor-pointer">
                    I receive the returned asset.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="borrow-return-verify-same"
                    checked={verificationSameCondition}
                    onCheckedChange={v => setVerificationSameCondition(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="borrow-return-verify-same" className="text-sm font-normal text-slate-800 leading-snug cursor-pointer">
                    I confirmed that the returned asset is in the same condition as when it was borrowed.
                  </Label>
                </div>
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
              <Button variant="outline" onClick={() => setDeclineOpen(true)}>Decline</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                disabled={!verificationReceived || !verificationSameCondition}
                onClick={() => void handleProcessReturn()}
              >
                Approve Return
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <AppDialogFrame className="max-w-md">
            <AppDialogGradientHeader title="Decline request" description="This will stop borrow processing." />
            <AppDialogBody>
              <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Declined remarks" />
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => setDeclineOpen(false)}>Back</Button>
              <Button variant="destructive" disabled={!declineReason.trim()} onClick={() => void handleDecline()}>Confirm decline</Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      </main>
    </div>
  );
}

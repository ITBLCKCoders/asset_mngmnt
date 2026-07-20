'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlignLeft,
  Building2,
  Calendar,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Eye,
  FileText,
  HandHelping,
  ImagePlus,
  Layers,
  LayoutGrid,
  List,
  Mail,
  Package,
  User,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
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
import {
  buildBorrowDataForPDFFromBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/ui/shimmer';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';

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
  dept_head_name?: string | null;
  processor_declined_at?: string | null;
  /** Staff decline remarks (processor), when applicable */
  processor_decline_reason?: string | null;
  returned_at?: string | null;
  /** JSON array of image URLs from processor at borrow time */
  pre_usage_condition_images?: string | null;
  requested_by_signature?: string | null;
  /** Processor's digital signature when approving the borrow request */
  processor_signature?: string | null;
  /** Timestamp when the processor signed the borrow request */
  processor_signed_at?: string | null;
  /** Receiver (Manager Approver 2) full name when received */
  received_by_name?: string | null;
}

/** Request is finished on the staff queue: no approve/decline/processing. */
export function isBorrowRequestStaffReadOnly(r: BorrowRequestRow): boolean {
  return (
    r.status === 'declined' ||
    r.status === 'returned' ||
    r.status === 'approved' ||
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
      return r.borrow_scope === 'it' ? 'Awaiting IT' : 'Awaiting Admin';
    case 'declined':
      return 'Declined';
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    default:
      return r.status?.replace(/_/g, ' ') || r.status || 'Unknown';
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

export function ProcessBorrowRequestSummary({ row }: { row: BorrowRequestRow }) {
  const email = row.requester_email?.trim();
  const purpose = row.purpose?.trim() || '—';
  const borrower = requesterName(row);
  const department = row.requester_department_name?.trim() || '—';
  const category = row.category_name?.trim() || '—';
  const type = row.type_name?.trim() || '—';

  // Check if we have meaningful data to display
  const hasData = borrower !== '—' || department !== '—' || category !== '—' || type !== '—';

  if (!hasData) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25">
              <User className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-slate-900">
                Borrower &amp; request
              </p>
              <p className="text-[11px] text-slate-500">Details from the borrowing form</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'w-fit shrink-0 border-red-200 bg-red-50/80 text-red-800 font-semibold',
              'px-2 py-0.5 text-[11px]'
            )}
          >
            {borrowScopeLabel(row.borrow_scope)} scope
          </Badge>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-sm text-slate-500">Loading request details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25">
            <User className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-slate-900">
              Borrower &amp; request
            </p>
            <p className="text-[11px] text-slate-500">Details from the borrowing form</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'w-fit shrink-0 border-red-200 bg-red-50/80 text-red-800 font-semibold',
            'px-2 py-0.5 text-[11px]'
          )}
        >
          {borrowScopeLabel(row.borrow_scope)} scope
        </Badge>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        <div className="space-y-1.5">
          <SummarySectionTitle>Contact</SummarySectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryField icon={User} label="Borrower" value={borrower} className="sm:col-span-2" />
            <SummaryField
              icon={Building2}
              label="Department"
              value={department}
              className={email ? undefined : 'sm:col-span-2'}
            />
            {email ? <SummaryField icon={Mail} label="Contact email" value={email} /> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <SummarySectionTitle>Requested equipment</SummarySectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryField
              icon={Layers}
              label="Category"
              value={category}
            />
            <SummaryField icon={Package} label="Type" value={type} />
          </div>
        </div>

        {row.asset_code && (
          <div className="space-y-1.5">
            <SummarySectionTitle>Assigned asset</SummarySectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <SummaryField
                icon={Package}
                label="Asset code"
                value={row.asset_code}
              />
              <SummaryField
                icon={Package}
                label="Asset name"
                value={row.asset_name || '—'}
              />
              {row.asset_serial && (
                <SummaryField
                  icon={FileText}
                  label="Serial number"
                  value={row.asset_serial}
                  className="sm:col-span-2"
                />
              )}
            </div>
          </div>
        )}

        {row.pre_usage_condition && (
          <div className="space-y-1.5">
            <SummarySectionTitle>Pre-usage condition</SummarySectionTitle>
            <SummaryField
              icon={ClipboardList}
              label="Condition"
              value={row.pre_usage_condition}
            />
          </div>
        )}

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <SummarySectionTitle>Purpose</SummarySectionTitle>
          <div className="flex gap-2.5 rounded-xl border border-red-100/80 bg-gradient-to-br from-red-50/40 via-white to-slate-50/50 px-2.5 py-2.5 shadow-sm">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600"
              aria-hidden
            >
              <AlignLeft className="h-3.5 w-3.5" />
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
  const [activeTab, setActiveTab] = useState('request');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const { hasPermission, roleCustodian } = useUserPermissions();
  const { user } = useCurrentUser();
  const { activeCompany } = useCompanyContext();
  
  // Check if user is Global Admin or Admin (can select any company)
  const isSuperAdmin = Boolean(
    user?.role?.name?.toLowerCase() === 'global admin' ||
      user?.role?.name?.toLowerCase() === 'admin'
  );
  const isOverallManager = roleCustodian?.managerRole === 'overallManager';
  const showScopeTabs = isSuperAdmin || isOverallManager;
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [selected, setSelected] = useState<BorrowRequestRow | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<BorrowStaffPoolAsset[]>([]);
  const [selectedAssetCode, setSelectedAssetCode] = useState('');
  const [preUsageCondition, setPreUsageCondition] = useState('');
  const [processorRemarks, setProcessorRemarks] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [verificationReceived, setVerificationReceived] = useState(false);
  const [verificationSameCondition, setVerificationSameCondition] = useState(false);
  const [processorConditionImages, setProcessorConditionImages] = useState<string[]>([]);
  const [returnConditionImages, setReturnConditionImages] = useState<string[]>([]);
  const [smsOtpDialogOpen, setSmsOtpDialogOpen] = useState(false);
  const pendingProcessBorrowActionRef = useRef<(() => Promise<void>) | null>(null);

  const assetsByDepartment = useMemo(() => {
    const map = new Map<string, BorrowStaffPoolAsset[]>();
    for (const a of availableAssets) {
      const key = (a.department_name && a.department_name.trim()) || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].sort(([da], [db]) => da.localeCompare(db));
  }, [availableAssets]);

  const filteredRows = useMemo(() => {
    let result = rows;
    
    // Filter by scope if scope tabs are shown
    if (showScopeTabs) {
      result = result.filter(r => r.borrow_scope === scope);
    }
    
    // Then filter by active tab
    switch (activeTab) {
      case 'request':
        return result.filter(
          r =>
            r.status === 'pending' ||
            r.status === 'pending_dept_head' ||
            r.status === 'pending_staff'
        );
      case 'approved':
        return result.filter(r => r.status === 'approved' && !r.returned_at);
      case 'declined':
        return result.filter(r => Boolean(r.processor_declined_at));
      default:
        return result;
    }
  }, [rows, activeTab, showScopeTabs, scope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (showScopeTabs) {
        params.append('scope', scope);
      }
      if (activeCompany?.id) {
        params.append('companyId', activeCompany.id);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/asset-borrow-requests?${queryString}` : '/asset-borrow-requests';
      
      const res = await api.get<any>(url);
      setRows(res?.data?.borrowRequests ?? res?.borrowRequests ?? []);
    } catch {
      toast.error('Failed to load borrow requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showScopeTabs, scope, activeCompany]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showScopeTabs) {
      void load();
    }
  }, [scope, showScopeTabs, load]);

  useEffect(() => {
    if (!returnOpen) return;
    setReturnConditionImages([]);
    setReturnRemarks('');
    setReturnCondition('Good');
    setVerificationReceived(false);
    setVerificationSameCondition(false);
  }, [returnOpen]);

  // Close parent dialog when SMS OTP dialog opens to prevent scrollbar issues
  useEffect(() => {
    if (smsOtpDialogOpen) {
      setProcessOpen(false);
    }
  }, [smsOtpDialogOpen]);

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
    setPreUsageCondition('');
    setAvailableAssets([]);

    // Only open return dialog if in pending tab and request is approved and not read-only
    if (activeTab === 'request' && row.status === 'approved' && !isBorrowRequestStaffReadOnly(row)) {
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

    // Set up the pending action to be executed after OTP verification
    pendingProcessBorrowActionRef.current = async () => {
      try {
        // Get user's digital signature from profile
        const digitalSignature = (user as any)?.digitalSignature || '';
        const signedAt = new Date().toISOString();

        await api.post(`/asset-borrow-requests/${selected.borrow_request_id}/staff-approve`, {
          asset_code: selectedAssetCode,
          pre_usage_condition: preUsageCondition,
          processor_remarks: processorRemarks.trim() || undefined,
          condition_images:
            processorConditionImages.length > 0 ? processorConditionImages : undefined,
          processor_signature: digitalSignature || undefined,
          processor_signed_at: signedAt,
        });
        toast.success('Borrow request processed');
        setProcessorConditionImages([]);
        await load();
      } catch (e: unknown) {
        const msg =
          (e as { data?: { error?: string } })?.data?.error ||
          (e as Error)?.message ||
          'Failed to process borrow request';
        toast.error(msg);
        throw e;
      }
    };

    // Open SMS OTP dialog
    setSmsOtpDialogOpen(true);
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
    const data = buildBorrowDataForPDFFromBatch(row as any);
    if (!data) {
      toast.error('Cannot generate PDF for this form');
      return;
    }
    const blob = await generateAssetBorrowingPDF(data);
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
    setPdfPreviewOpen(true);
  };

  const handleDownloadPdf = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `Equipment_Borrowing_${selected?.form_number ?? selected?.borrow_request_id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const borrowHistoryColumns: ColumnDef<BorrowRequestRow>[] = useMemo(
    () => [
      {
        accessorKey: 'form_number',
        header: 'Form Number',
        size: 140,
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">
            {row.original.form_number ?? row.original.borrow_request_id.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 160,
        cell: ({ row }) => {
          const status = borrowRequestStatusLabel(row.original);
          const isDeclined = status.toLowerCase().includes('declined');
          const isApproved = status.toLowerCase().includes('approved');
          const isReturned = status.toLowerCase().includes('returned');
          const isPending = status.toLowerCase().includes('awaiting') || status.toLowerCase().includes('pending');
          
          const badgeClass = isDeclined
            ? 'bg-red-100 text-red-800 border border-red-200'
            : isApproved
              ? 'bg-green-100 text-green-800 border border-green-200'
              : isReturned
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : isPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200';
          
          return (
            <Badge variant="secondary" className={badgeClass}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'requester',
        header: 'Requester',
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {requesterName(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'requester_department_name',
        header: 'Department',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.requester_department_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'category_type',
        header: 'Category/Type',
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {[row.original.category_name, row.original.type_name].filter(Boolean).join(' · ') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'approved_by_name',
        header: 'Processed By',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.approved_by_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'dept_head_name',
        header: 'Approved By',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.dept_head_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'expected_return_at',
        header: 'Expected Return',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {formatBorrowDateTime(row.original.expected_return_at)}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {formatBorrowDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (row.original.status === 'approved' && !isBorrowRequestStaffReadOnly(row.original)) {
                setSelected(row.original);
                setReturnOpen(true);
              } else {
                void openProcessDialog(row.original);
              }
            }}
            className="h-8"
          >
            {isBorrowRequestStaffReadOnly(row.original)
              ? 'View'
              : row.original.status === 'approved'
                ? 'Process Return'
                : 'View / Process'}
          </Button>
        ),
      },
    ],
    []
  );

  const tabTableColumns: ColumnDef<BorrowRequestRow>[] = useMemo(
    () => [
      {
        accessorKey: 'form_number',
        header: 'Form Number',
        size: 140,
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">
            {row.original.form_number ?? row.original.borrow_request_id.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 160,
        cell: ({ row }) => {
          const status = borrowRequestStatusLabel(row.original);
          const isDeclined = status.toLowerCase().includes('declined');
          const isApproved = status.toLowerCase().includes('approved');
          const isReturned = status.toLowerCase().includes('returned');
          const isPending = status.toLowerCase().includes('awaiting') || status.toLowerCase().includes('pending');
          
          const badgeClass = isDeclined
            ? 'bg-red-100 text-red-800 border border-red-200'
            : isApproved
              ? 'bg-green-100 text-green-800 border border-green-200'
              : isReturned
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : isPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200';
          
          return (
            <Badge variant="secondary" className={badgeClass}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'requester',
        header: 'Requester',
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {requesterName(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'requester_department_name',
        header: 'Department',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.requester_department_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'category_type',
        header: 'Category/Type',
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {[row.original.category_name, row.original.type_name].filter(Boolean).join(' · ') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'approved_by_name',
        header: 'Processed By',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.approved_by_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'dept_head_name',
        header: 'Approved By',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.dept_head_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'expected_return_at',
        header: 'Expected Return',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {formatBorrowDateTime(row.original.expected_return_at)}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {formatBorrowDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    []
  );

  const cards = useMemo(
    () =>
      filteredRows.map(r => (
        <div
          key={r.borrow_request_id}
          className="hover:shadow-md transition-shadow flex flex-col bg-white border border-slate-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <HandHelping className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {r.form_number ?? r.borrow_request_id.slice(0, 8)}
                </p>
                <p className="text-sm text-gray-500">
                  Created {formatBorrowDateTime(r.created_at)}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {borrowRequestStatusLabel(r)}
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
                      {r.category_name ?? '—'}
                      {r.type_name ? (
                        <span className="text-gray-400 ml-1">
                          — {r.type_name}
                        </span>
                      ) : null}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Requested by: {requesterName(r)}</p>
                {r.requester_department_name?.trim() ? (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Department: {r.requester_department_name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Expected return:{' '}
                  {formatBorrowDateTime(r.expected_return_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 line-clamp-3">
                  Purpose: {r.purpose || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Processed by: {r.approved_by_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Approved by: {r.dept_head_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Scope: {borrowScopeLabel(r.borrow_scope)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1 bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-red-600"
              onClick={() => {
                // For approved and declined tabs, always show details dialog
                if (activeTab === 'approved' || activeTab === 'declined') {
                  void openProcessDialog(r);
                } else {
                  // For pending tab, show return dialog if approved and not read-only
                  if (r.status === 'approved' && !isBorrowRequestStaffReadOnly(r)) {
                    setSelected(r);
                    setReturnOpen(true);
                  } else {
                    void openProcessDialog(r);
                  }
                }
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              {activeTab === 'approved' || activeTab === 'declined'
                ? 'View details'
                : isBorrowRequestStaffReadOnly(r)
                  ? 'View details'
                  : r.status === 'approved'
                    ? 'Process Return'
                    : 'View / Process'}
            </Button>
            <Button variant="outline" className="flex-1 hover:bg-red-600 hover:text-white hover:border-red-600" onClick={() => void handleDownload(r)}>
              Download PDF
            </Button>
          </div>
        </div>
      )),
    [filteredRows]
  );

  return (
    <div className="min-h-screen">
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PageHeader
          icon={ClipboardList}
          title="Asset borrowing requests"
          description="Pending and historical borrow requests for your IT or Admin scope."
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={segmentTabsListClassName + ' grid grid-cols-3 w-full'}>
            <TabsTrigger value="request" className={segmentTabsTriggerClassName}>Request</TabsTrigger>
            <TabsTrigger value="approved" className={segmentTabsTriggerClassName}>Approved</TabsTrigger>
            <TabsTrigger value="declined" className={segmentTabsTriggerClassName}>Declined</TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Pending borrow requests</p>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={viewMode === 'card' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-gray-300 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Shimmer className="h-6 w-24 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Shimmer className="h-4 w-4 rounded" />
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <Shimmer className="h-4 w-48 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                        <Shimmer className="h-5 w-full rounded" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                    <ClipboardList className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No pending requests</p>
                  <p className="text-xs text-slate-500 text-center">Borrow requests awaiting processing will appear here.</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
              ) : (
                <DataTable<BorrowRequestRow>
                  tableId="request-tab"
                  data={filteredRows}
                  columns={tabTableColumns}
                  searchPlaceholder="Search pending requests..."
                  title="Pending Requests"
                  titleBadge={`${filteredRows.length} requests`}
                  isLoading={loading}
                  onRowClick={(row) => {
                    const rowData = row.original || row;
                    if (rowData.status === 'approved' && !isBorrowRequestStaffReadOnly(rowData)) {
                      setSelected(rowData);
                      setReturnOpen(true);
                    } else {
                      void openProcessDialog(rowData);
                    }
                  }}
                  mobileCardClassName="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 p-4 shadow-sm shadow-red-100/40"
                  mobileCardFields={[
                    {
                      key: 'form_number',
                      label: 'Form Number',
                      render: (row) => row.form_number ?? row.borrow_request_id.slice(0, 8),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (row) => borrowRequestStatusLabel(row),
                    },
                    {
                      key: 'requester',
                      label: 'Requester',
                      render: (row) => requesterName(row),
                    },
                    {
                      key: 'approved_by_name',
                      label: 'Approved By',
                      render: (row) => row.approved_by_name || '—',
                    },
                    {
                      key: 'dept_head_name',
                      label: 'Approved By',
                      render: (row) => row.dept_head_name || '—',
                    },
                    {
                      key: 'expected_return_at',
                      label: 'Expected Return',
                      render: (row) => formatBorrowDateTime(row.expected_return_at),
                    },
                  ]}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="approved" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Approved borrow requests</p>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={viewMode === 'card' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-gray-300 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Shimmer className="h-6 w-24 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Shimmer className="h-4 w-4 rounded" />
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <Shimmer className="h-4 w-48 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                        <Shimmer className="h-5 w-full rounded" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No approved requests</p>
                  <p className="text-xs text-slate-500 text-center">Approved borrow requests ready for return processing will appear here.</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
              ) : (
                <DataTable<BorrowRequestRow>
                  tableId="approved-tab"
                  data={filteredRows}
                  columns={tabTableColumns}
                  searchPlaceholder="Search approved requests..."
                  title="Approved Requests"
                  titleBadge={`${filteredRows.length} requests`}
                  isLoading={loading}
                  onRowClick={(row) => {
                    const rowData = row.original || row;
                    // For approved tab, always show details dialog
                    void openProcessDialog(rowData);
                  }}
                  mobileCardClassName="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 p-4 shadow-sm shadow-red-100/40"
                  mobileCardFields={[
                    {
                      key: 'form_number',
                      label: 'Form Number',
                      render: (row) => row.form_number ?? row.borrow_request_id.slice(0, 8),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (row) => borrowRequestStatusLabel(row),
                    },
                    {
                      key: 'requester',
                      label: 'Requester',
                      render: (row) => requesterName(row),
                    },
                    {
                      key: 'approved_by_name',
                      label: 'Processed By',
                      render: (row) => row.approved_by_name || '—',
                    },
                    {
                      key: 'dept_head_name',
                      label: 'Approved By',
                      render: (row) => row.dept_head_name || '—',
                    },
                    {
                      key: 'expected_return_at',
                      label: 'Expected Return',
                      render: (row) => formatBorrowDateTime(row.expected_return_at),
                    },
                  ]}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="declined" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Declined borrow requests</p>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={viewMode === 'card' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex flex-col shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden rounded-2xl border-l-4 border-l-gray-300 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Shimmer className="h-6 w-24 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <Shimmer className="h-4 w-4 rounded" />
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <Shimmer className="h-4 w-48 rounded" />
                        <Shimmer className="h-5 w-20 rounded-full" />
                        <Shimmer className="h-5 w-full rounded" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                        <Shimmer className="h-9 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No declined requests</p>
                  <p className="text-xs text-slate-500 text-center">Declined borrow requests will appear here.</p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{cards}</div>
              ) : (
                <DataTable<BorrowRequestRow>
                  tableId="declined-tab"
                  data={filteredRows}
                  columns={tabTableColumns}
                  searchPlaceholder="Search declined requests..."
                  title="Declined Requests"
                  titleBadge={`${filteredRows.length} requests`}
                  isLoading={loading}
                  onRowClick={(row) => {
                    const rowData = row.original || row;
                    // For declined tab, always show details dialog
                    void openProcessDialog(rowData);
                  }}
                  mobileCardClassName="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 p-4 shadow-sm shadow-red-100/40"
                  mobileCardFields={[
                    {
                      key: 'form_number',
                      label: 'Form Number',
                      render: (row) => row.form_number ?? row.borrow_request_id.slice(0, 8),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (row) => borrowRequestStatusLabel(row),
                    },
                    {
                      key: 'requester',
                      label: 'Requester',
                      render: (row) => requesterName(row),
                    },
                    {
                      key: 'approved_by_name',
                      label: 'Processed By',
                      render: (row) => row.approved_by_name || '—',
                    },
                    {
                      key: 'dept_head_name',
                      label: 'Approved By',
                      render: (row) => row.dept_head_name || '—',
                    },
                    {
                      key: 'expected_return_at',
                      label: 'Expected Return',
                      render: (row) => formatBorrowDateTime(row.expected_return_at),
                    },
                  ]}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12">
          <DataTable<BorrowRequestRow>
          tableId="borrow-history"
          data={loading ? [] : rows}
          columns={borrowHistoryColumns}
          searchPlaceholder="Search borrow history..."
          title="Borrow History"
          titleBadge={`${rows.length} requests`}
          isLoading={loading}
          mobileCardClassName="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 p-4 shadow-sm shadow-red-100/40"
          mobileCardFields={[
            {
              key: 'form_number',
              label: 'Form Number',
              render: (row) => row.form_number ?? row.borrow_request_id.slice(0, 8),
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => borrowRequestStatusLabel(row),
            },
            {
              key: 'requester',
              label: 'Requester',
              render: (row) => requesterName(row),
            },
            {
              key: 'expected_return_at',
              label: 'Expected Return',
              render: (row) => formatBorrowDateTime(row.expected_return_at),
            },
            {
              key: 'approved_by_name',
              label: 'Processed By',
              render: (row) => row.approved_by_name || '—',
            },
            {
              key: 'dept_head_name',
              label: 'Approved By',
              render: (row) => row.dept_head_name || '—',
            },
          ]}
        />
        </div>

        <Dialog open={processOpen} onOpenChange={setProcessOpen}>
          <AppDialogFrame className="max-w-lg max-h-[85vh]">
            <AppDialogGradientHeader
              title={
                selected && isBorrowRequestStaffReadOnly(selected)
                  ? 'Borrow Details'
                  : 'Process borrow request'
              }
              description={
                selected && isBorrowRequestStaffReadOnly(selected)
                  ? 'This request is closed. Details are shown for your records only — no processing actions are available.'
                  : selected
                    ? `Approve or decline this ${borrowScopeLabel(selected.borrow_scope)} equipment borrowing request from the temporary accountability pool.`
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
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
                  <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25">
                        <Package className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold tracking-tight text-slate-900">
                          Assign asset
                        </p>
                        <p className="text-[11px] text-slate-500">Temporary accountability pool</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit shrink-0 border-red-200 bg-red-50/80 text-red-800 font-semibold',
                        'px-2 py-0.5 text-[11px]'
                      )}
                    >
                      {borrowScopeLabel(selected.borrow_scope)} assets only
                    </Badge>
                  </div>

                  <div className="space-y-4 p-3 sm:p-4">
                    <div className="space-y-1.5">
                      <SummarySectionTitle>Asset selection <span className="text-red-600">*</span></SummarySectionTitle>
                      <p className="text-[11px] text-slate-500">
                        Sorted with requested category &amp; type first, then by category and code.
                      </p>
                      <Select
                        value={selectedAssetCode || undefined}
                        onValueChange={setSelectedAssetCode}
                        disabled={assetsLoading}
                      >
                        <SelectTrigger
                          id="borrow-asset-select"
                          className={cn(
                            'h-10 w-full rounded-xl border-slate-200 bg-white text-left text-slate-900 shadow-sm',
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
                  </div>
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
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/[0.04]">
                    <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25">
                          <ClipboardList className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold tracking-tight text-slate-900">
                            Processing details
                          </p>
                          <p className="text-[11px] text-slate-500">Condition, remarks &amp; photos</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-3 sm:p-4">
                      <div className="space-y-1.5">
                        <SummarySectionTitle>Pre-usage condition <span className="text-red-600">*</span></SummarySectionTitle>
                        <Select value={preUsageCondition} onValueChange={setPreUsageCondition}>
                          <SelectTrigger
                            id="borrow-pre-usage-condition"
                            className="h-10 w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-white focus:ring-2 focus:ring-red-500/20"
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

                      <div className="space-y-1.5">
                        <SummarySectionTitle>Processor remarks</SummarySectionTitle>
                        <p className="text-[11px] text-slate-500">Optional notes for the borrower or audit trail</p>
                        <Textarea
                          id="borrow-processor-remarks"
                          value={processorRemarks}
                          onChange={e => setProcessorRemarks(e.target.value)}
                          placeholder="Notes for the borrower or audit trail…"
                          className="min-h-[72px] rounded-xl border-slate-200 bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <SummarySectionTitle>Condition photos</SummarySectionTitle>
                        <p className="text-[11px] text-slate-500">Optional, up to {MAX_BORROW_CONDITION_PHOTOS} photos</p>
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
                                  src={proxyCloudinaryUrl(url)}
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
                    </div>
                  </div>
                </>
              ) : null}
            </AppDialogBody>
            {selected && isBorrowRequestStaffReadOnly(selected) ? (
              <AppDialogChromeFooter className="justify-stretch gap-2 sm:justify-end">
                <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setProcessOpen(false)}>
                  Close
                </Button>
                <Button
                  className="bg-white hover:bg-red-600 hover:text-white text-slate-900"
                  onClick={() => {
                    if (selected) void handleDownload(selected);
                  }}
                >
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            ) : (
              <AppDialogChromeFooter className="justify-end gap-2">
                <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setProcessOpen(false)}>Cancel</Button>
                <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setDeclineOpen(true)}>Decline</Button>
                <Button
                  className="bg-red-600 text-white hover:bg-white hover:text-red-600 hover:border-red-600 border-2 border-red-600 disabled:opacity-50"
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
                  Return condition <span className="text-red-600">*</span>
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
                          src={proxyCloudinaryUrl(url)}
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
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setReturnOpen(false)}>Cancel</Button>
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setDeclineOpen(true)}>Decline</Button>
              <Button
                className="bg-white hover:bg-red-600 hover:text-white text-slate-900 disabled:opacity-50"
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-800">
                  Decline reason <span className="text-red-600">*</span>
                </Label>
                <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Declined remarks" />
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setDeclineOpen(false)}>Back</Button>
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900 disabled:opacity-50" disabled={!declineReason.trim()} onClick={() => void handleDecline()}>Confirm decline</Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Dialog open={pdfPreviewOpen} onOpenChange={(open) => {
          setPdfPreviewOpen(open);
          if (!open && pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}>
          <AppDialogFrame className="max-w-4xl h-[calc(100vh-2rem)]">
            <AppDialogGradientHeader
              title={selected ? `${requesterName(selected)}${selected.form_number || selected.borrow_request_id ? ` - ${selected.form_number || selected.borrow_request_id.slice(0, 8)}` : ''}` : 'PDF Preview'}
              description="Preview of the borrow form PDF"
            />
            <AppDialogBody className="flex-1 overflow-hidden p-0">
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">Loading PDF...</p>
                </div>
              )}
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-2">
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={() => setPdfPreviewOpen(false)}>Close</Button>
              <Button className="bg-white hover:bg-red-600 hover:text-white text-slate-900" onClick={handleDownloadPdf}>Download</Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <SmsOtpDialog
          isOpen={smsOtpDialogOpen}
          onOpenChange={open => {
            if (!open) {
              pendingProcessBorrowActionRef.current = null;
            }
            setSmsOtpDialogOpen(open);
          }}
          sendOtpEndpoint="/auth/initials/send-otp"
          verifyOtpEndpoint="/auth/initials/verify-otp"
          onVerified={() => {
            setSmsOtpDialogOpen(false);
            pendingProcessBorrowActionRef.current = null;
          }}
          onCancel={() => {
            setSmsOtpDialogOpen(false);
            pendingProcessBorrowActionRef.current = null;
          }}
          pendingActionRef={pendingProcessBorrowActionRef}
          title="Verify Borrow Processing"
          description="Please verify your identity to process this borrow request."
          verifyButtonLabel="Verify & Process Borrow"
          phoneNumber={user?.contactNumber || undefined}
        />
      </main>
    </div>
  );
}

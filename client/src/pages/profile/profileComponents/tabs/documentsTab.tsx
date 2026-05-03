'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FileCheck,
  FileDown,
  Search,
  Package,
  User,
  Calendar,
  MapPin,
  FileSignature,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  HandHelping,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Shimmer } from '@/components/ui/shimmer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  AccountabilityFormCard,
  AccountabilityFormDetail,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { matchesFormListSearch } from '@/utils/formListSearch';
import {
  generateAssetReturnPDF,
  generateAssetTransferPDF,
  generateAssetBorrowingPDF,
  downloadPDF,
  type AssetReturnData,
  type AssetTransferData,
  type AssetBorrowingData,
} from '@/lib/pdfGenerator';

export function buildReturnDataForPDFFromBatch(
  batch: AssetReturnFormBatch,
  signature?: { signed_at: string } | null
): AssetReturnData | null {
  if (!batch.returns?.length) return null;
  const first = batch.returns[0];
  if (!first?.assignment?.asset) return null;
  // Use passed-in signature (e.g. current user's when they're returner), or stored returner signature from batch
  const returnerSignature =
    signature ??
    (batch.signed_at
      ? {
          signed_at: batch.signed_at,
        }
      : undefined);
  const assets = batch.returns.map(r => {
    const asset = r.assignment?.asset as
      | {
          id?: string;
          code?: string;
          name?: string;
          category_name?: string;
          type_name?: string;
          category_id?: string;
          type_id?: string;
        }
      | undefined;
    return {
      id: asset?.id || '',
      code: asset?.code || '',
      name: asset?.name || '',
      category: asset?.category_name || asset?.category_id || '',
      type: asset?.type_name || asset?.type_id || '',
      serialNo: '',
      returnCondition: r.return_condition,
      returnNotes: r.return_notes,
    };
  });
  return {
    assignmentID: first.assignment?.assignmentID || '',
    assets,
    user: {
      id: first.assignment?.user?.id || '',
      first_name: first.assignment?.user?.first_name || '',
      last_name: first.assignment?.user?.last_name || '',
      email: first.assignment?.user?.email || '',
      employeeNumber: first.assignment?.user?.employeeNumber || '',
      position: first.assignment?.user?.position || '',
      companyName: first.assignment?.user?.company?.name ?? null,
      companyLogoUrl:
        (first.assignment?.user as { companyLogoUrl?: string | null })
          ?.companyLogoUrl ?? null,
    },
    department: batch.form_department ?? first.assignment?.department ?? null,
    requestorDepartment: first.assignment?.user?.department ?? null,
    location: first.assignment?.location
      ? {
          ...first.assignment.location,
          floor_unit:
            (first.assignment.location as { floor_unit?: string }).floor_unit ??
            '',
          building:
            (first.assignment.location as { building?: string }).building ?? '',
        }
      : null,
    assigned_date: first.assignment?.assigned_date || '',
    expected_return_date: first.assignment?.expected_return_date || null,
    actual_return_date:
      first.assignment?.actual_return_date || batch.created_at,
    assignment_notes: first.assignment?.assignment_notes || '',
    status: 'Returned',
    assigned_by: {
      id: first.assignment?.assigned_by?.id || '',
      first_name: first.assignment?.assigned_by?.first_name || '',
      last_name: first.assignment?.assigned_by?.last_name || '',
    },
    returnCondition: first.return_condition,
    returnNotes: first.return_notes,
    form_number: batch.form_number ?? undefined,
    ...(returnerSignature?.signed_at
      ? {
          signed_at: returnerSignature.signed_at,
        }
      : {}),
    digital_signature: batch.signed_digital_signature ?? undefined,
    showProcessorSignatureBlock: !!batch.process_signed_at,
    ...(batch.dept_head_signed_at
      ? {
          process_signed_at: batch.process_signed_at ?? undefined,
          process_digital_signature:
            batch.process_digital_signature ?? undefined,
          process_user_name: batch.processed_by ?? undefined,
        }
      : {}),
    returnType: batch.return_type ?? undefined,
    processorPosition: batch.process_user_position?.trim() || undefined,
    receivedBy: batch.process_user_position?.trim()
      ? undefined
      : batch.received_by ?? undefined,
    dept_head_signed_at: batch.dept_head_signed_at ?? undefined,
    dept_head_digital_signature: batch.dept_head_digital_signature ?? undefined,
    dept_head_user_name: batch.dept_head_user_name ?? undefined,
    it_manager_signed_at: batch.it_manager_signed_at ?? undefined,
    it_manager_digital_signature:
      batch.it_manager_digital_signature ?? undefined,
    it_manager_user_name: batch.it_manager_user_name ?? undefined,
  };
}

export function buildTransferDataForPDFFromBatch(
  batch: AssetTransferFormBatch,
  signature?: { signed_at: string } | null
): AssetTransferData | null {
  if (!batch.returns?.length) return null;
  const first = batch.returns[0];
  if (!first?.assignment?.asset) return null;
  const transferrerSignature =
    signature ??
    (batch.signed_at
      ? {
          signed_at: batch.signed_at,
        }
      : undefined);
  const assets = batch.returns.map(r => {
    const asset = r.assignment?.asset as
      | {
          id?: string;
          code?: string;
          name?: string;
          category_name?: string;
          type_name?: string;
          category_id?: string;
          type_id?: string;
        }
      | undefined;
    return {
      id: asset?.id || '',
      code: asset?.code || '',
      name: asset?.name || '',
      category: asset?.category_name || asset?.category_id || '',
      type: asset?.type_name || asset?.type_id || '',
      serialNo: '',
      transferCondition: r.return_condition,
      transferNotes: r.return_notes,
      imageUrls: Array.isArray(r.condition_images) ? r.condition_images : [],
    };
  });
  return {
    form_number: batch.form_number ?? undefined,
    user: {
      id: first.assignment?.user?.id || '',
      first_name: first.assignment?.user?.first_name || '',
      last_name: first.assignment?.user?.last_name || '',
      email: first.assignment?.user?.email || '',
      employeeNumber: first.assignment?.user?.employeeNumber,
      position: first.assignment?.user?.position,
      companyName: first.assignment?.user?.company?.name ?? null,
      companyLogoUrl:
        (first.assignment?.user as { companyLogoUrl?: string | null })
          ?.companyLogoUrl ?? null,
    },
    assets,
    department: first.assignment?.department
      ? {
          id: first.assignment.department.id,
          name: first.assignment.department.name,
        }
      : null,
    location: first.assignment?.location
      ? {
          id: (first.assignment.location as any).id || '',
          name: (first.assignment.location as any).name || '',
          floor_unit: (first.assignment.location as any).floor_unit ?? '',
          building: (first.assignment.location as any).building ?? '',
          room_name: (first.assignment.location as any).room_name,
        }
      : null,
    created_at: batch.created_at || new Date().toISOString(),
    showProcessorSignatureBlock: !!batch.dept_head_signed_at,
    process_user_name: batch.processed_by ?? undefined,
    ...(batch.dept_head_signed_at
      ? {
          process_signed_at: batch.process_signed_at ?? undefined,
          process_digital_signature:
            batch.process_digital_signature ?? undefined,
        }
      : {}),
    transferType: batch.transfer_type ?? undefined,
    receivedBy: batch.received_by ?? undefined,
    ...(transferrerSignature?.signed_at
      ? {
          signed_at: transferrerSignature.signed_at,
        }
      : {}),
    new_assigned_user: batch.new_assigned_user
      ? {
          first_name: batch.new_assigned_user.first_name,
          last_name: batch.new_assigned_user.last_name,
          email: undefined,
          position: batch.new_assigned_user.position ?? undefined,
        }
      : null,
    new_department: batch.new_assigned_user?.department ?? null,
    new_location: null,
    new_room: null,
    dept_head_signed_at: batch.dept_head_signed_at ?? undefined,
    dept_head_digital_signature: batch.dept_head_digital_signature ?? undefined,
    dept_head_user_name: batch.dept_head_user_name ?? undefined,
    it_manager_signed_at: batch.it_manager_signed_at ?? undefined,
    it_manager_digital_signature:
      batch.it_manager_digital_signature ?? undefined,
    it_manager_user_name: batch.it_manager_user_name ?? undefined,
  };
}

// Cache return-form PDF preview URLs by form_number (max 5) so reopening is instant
const RETURN_PDF_CACHE_MAX = 5;
const returnFormPdfCache = new Map<string, string>();
const returnFormPdfCacheOrder: string[] = [];

function getCachedReturnPdfUrl(formNumber: string | null): string | null {
  if (!formNumber) return null;
  return returnFormPdfCache.get(formNumber) ?? null;
}

function setCachedReturnPdfUrl(formNumber: string | null, url: string) {
  if (!formNumber) return;
  if (returnFormPdfCache.has(formNumber)) {
    const old = returnFormPdfCache.get(formNumber);
    if (old && old !== url) URL.revokeObjectURL(old);
  }
  returnFormPdfCache.set(formNumber, url);
  const idx = returnFormPdfCacheOrder.indexOf(formNumber);
  if (idx !== -1) returnFormPdfCacheOrder.splice(idx, 1);
  returnFormPdfCacheOrder.push(formNumber);
  while (returnFormPdfCacheOrder.length > RETURN_PDF_CACHE_MAX) {
    const evict = returnFormPdfCacheOrder.shift();
    if (evict) {
      const u = returnFormPdfCache.get(evict);
      if (u) URL.revokeObjectURL(u);
      returnFormPdfCache.delete(evict);
    }
  }
}

// Return Form Detail Component (accepts a batch = one return form with one or more assets)
// When contentOnly is true, only the PDF body is rendered (caller provides DialogHeader/Footer).
export const ReturnFormDetail: React.FC<{
  returnFormBatch: AssetReturnFormBatch;
  onClose: () => void;
  onDownload: () => void;
  onApprove?: () => Promise<void>;
  showApproveButton?: boolean;
  isApproving?: boolean;
  contentOnly?: boolean;
}> = ({
  returnFormBatch,
  onClose,
  onDownload,
  onApprove,
  showApproveButton,
  isApproving,
  contentOnly = false,
}) => {
  const { user: currentUser } = useCurrentUser();
  const formNumber = returnFormBatch.form_number ?? null;
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string>('');
  const cacheKey = formNumber
    ? formNumber +
      (returnFormBatch.signed_at ? '-signed' : '') +
      (returnFormBatch.process_signed_at ? '-process' : '') +
      (returnFormBatch.dept_head_signed_at ? '-depthead' : '') +
      (returnFormBatch.it_manager_signed_at ? '-itmanager' : '')
    : null;

  useEffect(() => {
    const cached = cacheKey ? getCachedReturnPdfUrl(cacheKey) : null;
    if (cached) {
      setPdfUrl(cached);
      setPdfLoading(false);
      pdfUrlRef.current = cached;
      return;
    }
    let cancelled = false;
    const signature =
      returnFormBatch.signed_at &&
      currentUser?.id === returnFormBatch.user_id
        ? {
            signed_at: returnFormBatch.signed_at,
          }
        : undefined;
    const generatePdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);
        setPdfUrl(''); // avoid showing a revoked URL while regenerating
        if (pdfUrlRef.current) {
          const current = pdfUrlRef.current;
          if (!cacheKey || returnFormPdfCache.get(cacheKey) !== current) {
            URL.revokeObjectURL(current);
          }
          pdfUrlRef.current = '';
        }
        const returnDataForPDF = buildReturnDataForPDFFromBatch(
          returnFormBatch,
          signature
        );
        if (!returnDataForPDF) {
          setPdfError('Return form data is missing or incomplete');
          return;
        }
        const pdfBlob = await generateAssetReturnPDF(returnDataForPDF);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        pdfUrlRef.current = url;
        setPdfUrl(url); // set state so the iframe shows the PDF
        if (cacheKey) setCachedReturnPdfUrl(cacheKey, url);
      } catch (error) {
        if (!cancelled) {
          console.error('Error generating PDF:', error);
          setPdfError('Failed to generate PDF. Please try again.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };
    generatePdf();
    return () => {
      cancelled = true;
      const current = pdfUrlRef.current;
      if (
        current &&
        (!cacheKey || returnFormPdfCache.get(cacheKey) !== current)
      ) {
        URL.revokeObjectURL(current);
      }
      pdfUrlRef.current = '';
    };
  }, [
    returnFormBatch,
    formNumber,
    cacheKey,
    currentUser?.id,
  ]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full min-h-0"
            title="PDF Preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : pdfLoading ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-gray-500">
            Generating PDF preview...
          </div>
        ) : (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        )}
      </div>
    </div>
  );

  if (contentOnly) return pdfBody;

  const firstReturn = returnFormBatch.returns[0];
  const formTitle =
    returnFormBatch.form_number ??
    `Return of ${returnFormBatch.returns.length} assets`;
  const returnedBy =
    firstReturn?.assignment?.user &&
    `${firstReturn.assignment.user.first_name || ''} ${firstReturn.assignment.user.last_name || ''}`.trim();

  return (
    <>
      <div className="flex-shrink-0 flex flex-col space-y-1.5 pb-2 text-left">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-gray-900">
          {returnedBy || 'Return'} - {formTitle}
        </h2>
        <p className="text-gray-600 mt-1 text-sm">Asset Return Form Preview</p>
      </div>
      {pdfBody}
      <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-3 pt-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {showApproveButton && onApprove && (
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        )}
        <Button
          size="sm"
          onClick={onDownload}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </>
  );
};

// Transfer Form Detail Component (mirrors ReturnFormDetail – PDF preview in View dialog)
export const TransferFormDetail: React.FC<{
  transferFormBatch: AssetTransferFormBatch;
  onClose: () => void;
  onDownload: () => void;
  contentOnly?: boolean;
}> = ({ transferFormBatch, onClose, onDownload, contentOnly = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    const generatePdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);
        setPdfUrl('');
        if (pdfUrlRef.current) {
          if (pdfUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(pdfUrlRef.current);
          }
          pdfUrlRef.current = '';
        }
        const data = buildTransferDataForPDFFromBatch(transferFormBatch);
        if (!data) {
          setPdfError('Transfer form data is missing or incomplete');
          return;
        }
        const pdfBlob = await generateAssetTransferPDF(data);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (error) {
        if (!cancelled) {
          console.error('Error generating transfer PDF:', error);
          setPdfError('Failed to generate PDF. Please try again.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };
    generatePdf();
    return () => {
      cancelled = true;
      if (pdfUrlRef.current) {
        if (pdfUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(pdfUrlRef.current);
        }
        pdfUrlRef.current = '';
      }
    };
  }, [transferFormBatch]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full min-h-0"
            title="Transfer Form PDF Preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : pdfLoading ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-gray-500">
            Generating PDF preview...
          </div>
        ) : (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        )}
      </div>
    </div>
  );

  if (contentOnly) return pdfBody;

  const firstReturn = transferFormBatch.returns[0];
  const transferrerName =
    firstReturn?.assignment?.user &&
    `${firstReturn.assignment.user.first_name || ''} ${firstReturn.assignment.user.last_name || ''}`.trim();
  const formTitle =
    transferFormBatch.form_number ??
    `Transfer of ${transferFormBatch.returns.length} assets`;

  return (
    <>
      <div className="flex-shrink-0 flex flex-col space-y-1.5 pb-2 text-left">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-gray-900">
          {transferrerName || 'Transfer'} - {formTitle}
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          Asset Transfer Form Preview
        </p>
      </div>
      {pdfBody}
      <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-3 pt-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          size="sm"
          onClick={onDownload}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </>
  );
};

/** Shared timeline for return/transfer forms: Submitted → Approved by dept head → Completed */
function FormTimeline({
  type,
  created_at,
  signerName,
  dept_head_signed_at,
  dept_head_user_name,
  process_signed_at,
}: {
  type: 'return' | 'transfer';
  created_at: string;
  signerName: string;
  dept_head_signed_at?: string | null;
  dept_head_user_name?: string | null;
  process_signed_at?: string | null;
}) {
  const formatDate = (d: string | null | undefined) =>
    d && !isNaN(new Date(d).getTime())
      ? new Date(d).toLocaleDateString() +
        ' ' +
        new Date(d).toLocaleTimeString()
      : null;
  const step1Done = true;
  const step2Done = !!dept_head_signed_at;
  const step3Done = !!process_signed_at;
  const completedLabel =
    type === 'return'
      ? 'Your return is completed'
      : 'Transferred';

  const stepNode = (done: boolean, stepIndex: number) => (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        done
          ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-500/25'
          : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : (
        <span className="text-sm font-semibold">{stepIndex}</span>
      )}
    </div>
  );

  const stepContent = (
    title: string,
    dateOrPending: string | null,
    description?: React.ReactNode,
    extra?: React.ReactNode
  ) => (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <span
        className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
          dateOrPending === 'Pending'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {dateOrPending ?? '—'}
      </span>
      {description != null && (
        <p className="mt-2 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      )}
      {extra}
    </div>
  );

  return (
    <div className="relative py-1">
      {/* Vertical line behind nodes */}
      <div
        className="absolute left-[18px] top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-green-500 via-border to-muted-foreground/20"
        aria-hidden
      />
      <div className="relative space-y-4">
        {/* Step 1: Submitted */}
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode(step1Done, 1)}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {stepContent(
              'Submitted',
              formatDate(created_at) ?? '—',
              <>
                Signed by {signerName || '—'}. Has been pending for approval of
                your department head.
              </>
            )}
          </div>
        </div>
        {/* Step 2: Approved by department head */}
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode(step2Done, 2)}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {stepContent(
              'Approved by the department head',
              step2Done ? (formatDate(dept_head_signed_at) ?? '—') : 'Pending',
              undefined,
              step2Done && dept_head_user_name ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  — {dept_head_user_name}
                </p>
              ) : undefined
            )}
          </div>
        </div>
        {/* Step 3: Completed */}
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode(step3Done, 3)}
          </div>
          <div className="flex-1 min-w-0">
            {stepContent(
              completedLabel,
              step3Done ? (formatDate(process_signed_at) ?? '—') : 'Pending'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Return Form Card Component (matches accountability form card layout)
export const ReturnFormCard: React.FC<{
  batch: AssetReturnFormBatch;
  onView: () => void;
  onDownload: () => void;
  onSign?: (formId: string) => Promise<void>;
  viewOnly?: boolean;
}> = ({
  batch,
  onView,
  onDownload,
  onSign,
  viewOnly = false,
}) => {
  const { user: currentUser } = useCurrentUser();
  const canSign =
    !!currentUser?.id &&
    currentUser.id === batch.user_id &&
    !!batch.formID &&
    !batch.signed_at;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreeReturn, setAgreeReturn] = useState(false);
  const [signDialogPdfUrl, setSignDialogPdfUrl] = useState<string>('');
  const signDialogPdfUrlRef = useRef<string>('');

  useEffect(() => {
    if (!showConfirmDialog || !canSign) return;
    let cancelled = false;
    const run = async () => {
      const returnDataForPDF = buildReturnDataForPDFFromBatch(batch);
      if (!returnDataForPDF) return;
      try {
        const pdfBlob = await generateAssetReturnPDF(returnDataForPDF);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        signDialogPdfUrlRef.current = url;
        setSignDialogPdfUrl(url);
      } catch (e) {
        if (!cancelled) setSignDialogPdfUrl('');
      }
    };
    run();
    return () => {
      cancelled = true;
      if (signDialogPdfUrlRef.current) {
        URL.revokeObjectURL(signDialogPdfUrlRef.current);
        signDialogPdfUrlRef.current = '';
      }
    };
  }, [showConfirmDialog, canSign, batch]);

  const first = batch.returns[0];
  if (!first?.assignment?.asset) {
    return (
      <Card className="hover:shadow-md transition-shadow flex flex-col">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>Return form data is incomplete or missing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formNumber =
    batch.form_number ??
    `Return ${new Date(batch.created_at).toLocaleDateString()}`;
  const returnedBy =
    first.assignment?.user &&
    `${first.assignment.user.first_name || ''} ${first.assignment.user.last_name || ''}`.trim();
  const returnLocation =
    first.assignment?.location?.name ??
    first.assignment?.department?.name ??
    '—';
  const notesFromReturns = batch.returns
    .map(r => r.return_notes)
    .filter(Boolean);
  const returnTypeNote =
    batch.return_type && String(batch.return_type).trim()
      ? batch.return_type
      : null;
  const returnNotes =
    [returnTypeNote, ...notesFromReturns].filter(Boolean).join('; ') || '—';
  const isSignedForBadge =
    Boolean(batch.signed_at) ||
    Boolean(batch.dept_head_signed_at);

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileSignature className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              isSignedForBadge
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }
          >
            {isSignedForBadge ? 'Signed' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>

      <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-2 grid h-auto w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-0 flex-1">
          <CardContent className="space-y-4 flex-1 pt-0">
            {/* Assets list (bullets) */}
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {batch.returns.length === 0
                    ? 'No assets'
                    : `${batch.returns.length} asset${batch.returns.length === 1 ? '' : 's'} returned`}
                </p>
                {batch.returns.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                    {batch.returns.slice(0, 5).map(r => (
                      <li key={r.return_id} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                        <span className="truncate">
                          {r.assignment?.asset?.name ??
                            r.assignment?.asset?.code ??
                            '—'}
                          {r.assignment?.asset?.code && (
                            <span className="text-gray-400 font-mono ml-1">
                              ({r.assignment.asset.code})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                    {batch.returns.length > 5 && (
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                        <span className="text-gray-400">
                          +{batch.returns.length - 5} more
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Returned by */}
            {returnedBy && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Returned by: {returnedBy}
                  </p>
                </div>
              </div>
            )}

            {/* Processed by (processor name only, no signature) */}
            {(batch.processed_by || batch.process_signed_at) && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {batch.dept_head_signed_at
                      ? `Processed by: ${batch.processed_by ?? '—'}`
                      : 'Processor: Pending manager approval'}
                  </p>
                </div>
              </div>
            )}

            {/* Return date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Return date:{' '}
                  {batch.created_at &&
                  !isNaN(new Date(batch.created_at).getTime())
                    ? new Date(batch.created_at).toLocaleDateString() +
                      ' ' +
                      new Date(batch.created_at).toLocaleTimeString()
                    : '—'}
                </p>
              </div>
            </div>

            {/* Return location */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Return location: {returnLocation}
                </p>
              </div>
            </div>

            {/* Return notes */}
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 line-clamp-2">
                  Return notes: {returnNotes}
                </p>
              </div>
            </div>
          </CardContent>
        </TabsContent>
        <TabsContent value="timeline" className="mt-0 flex-1">
          <CardContent className="pt-0">
            <FormTimeline
              type="return"
              created_at={batch.created_at}
              signerName={returnedBy ?? ''}
              dept_head_signed_at={batch.dept_head_signed_at}
              dept_head_user_name={batch.dept_head_user_name}
              process_signed_at={batch.process_signed_at}
            />
          </CardContent>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 p-4 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 hover:bg-red-600 hover:text-white"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        {canSign && !viewOnly && (
          <>
            <Button
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sign Form
            </Button>
            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AppAlertDialogFrame className="flex !max-w-2xl flex-col overflow-hidden">
                <AppAlertDialogGradientHeader title="Confirm Return Form Signing" />
                <AppAlertDialogMessage>
                  <AlertDialogDescription className="text-base text-gray-600">
                    Please review your asset return form below. By signing this form
                    you agree that all assets listed in the form are right.
                  </AlertDialogDescription>
                </AppAlertDialogMessage>
                <div className="min-h-0 flex-1 overflow-auto px-6">
                  <div className="my-4 h-[50vh] w-full overflow-hidden rounded-lg border sm:h-[600px]">
                    {signDialogPdfUrl ? (
                      <iframe
                        src={signDialogPdfUrl}
                        className="h-full w-full"
                        title="Return form preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          maxWidth: 'none',
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-500">
                        Loading form preview...
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 py-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="return-agree-assets"
                        checked={agreeReturn}
                        onCheckedChange={checked =>
                          setAgreeReturn(checked as boolean)
                        }
                        className="mt-1"
                      />
                      <label
                        htmlFor="return-agree-assets"
                        className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree that all assets to be returned are correct and all
                        assets are inspected and reviewed correctly.
                      </label>
                    </div>
                  </div>
                </div>
                <AppAlertDialogChromeFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setAgreeReturn(false);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!batch.formID) return;
                      try {
                        await onSign?.(batch.formID);
                        setShowConfirmDialog(false);
                        setAgreeReturn(false);
                      } catch (e) {
                        // Error handled by parent
                      }
                    }}
                    disabled={!agreeReturn}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Sign Form
                  </AlertDialogAction>
                </AppAlertDialogChromeFooter>
              </AppAlertDialogFrame>
            </AlertDialog>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="hover:bg-red-600 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
};

// Transfer Form Card (mirrors ReturnFormCard – for past owner: View, Sign, Download)
export const TransferFormCard: React.FC<{
  batch: AssetTransferFormBatch;
  onView: () => void;
  onDownload: () => void;
  onSign?: (formId: string) => Promise<void>;
  viewOnly?: boolean;
}> = ({ batch, onView, onDownload, onSign, viewOnly = false }) => {
  const { user: currentUser } = useCurrentUser();
  const canSign =
    !!currentUser?.id &&
    currentUser.id === batch.user_id &&
    !!batch.formID &&
    !batch.signed_at;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreeTransfer, setAgreeTransfer] = useState(false);
  const [signDialogPdfUrl, setSignDialogPdfUrl] = useState<string>('');
  const signDialogPdfUrlRef = useRef<string>('');

  useEffect(() => {
    if (!showConfirmDialog || !canSign) return;
    let cancelled = false;
    const run = async () => {
      const data = buildTransferDataForPDFFromBatch(batch);
      if (!data) return;
      try {
        const pdfBlob = await generateAssetTransferPDF(data);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        signDialogPdfUrlRef.current = url;
        setSignDialogPdfUrl(url);
      } catch (e) {
        if (!cancelled) setSignDialogPdfUrl('');
      }
    };
    run();
    return () => {
      cancelled = true;
      if (signDialogPdfUrlRef.current) {
        URL.revokeObjectURL(signDialogPdfUrlRef.current);
        signDialogPdfUrlRef.current = '';
      }
    };
  }, [showConfirmDialog, canSign, batch]);

  const first = batch.returns[0];
  if (!first?.assignment?.asset) {
    return (
      <Card className="hover:shadow-md transition-shadow flex flex-col">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            Transfer form data is incomplete
          </div>
        </CardContent>
      </Card>
    );
  }

  const formNumber =
    batch.form_number ??
    `Transfer ${new Date(batch.created_at).toLocaleDateString()}`;
  const transferrerName =
    first.assignment?.user &&
    `${first.assignment.user.first_name || ''} ${first.assignment.user.last_name || ''}`.trim();

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={
              batch.signed_at
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }
          >
            {batch.signed_at ? 'Signed' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-2 grid h-auto w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-0 flex-1">
          <CardContent className="space-y-4 flex-1 pt-0">
            {/* Assets list (bullets) - same as ReturnFormCard */}
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {batch.returns.length === 0
                    ? 'No assets'
                    : `${batch.returns.length} asset${batch.returns.length === 1 ? '' : 's'} transferred`}
                </p>
                {batch.returns.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                    {batch.returns.slice(0, 5).map(r => (
                      <li key={r.return_id} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                        <span className="truncate">
                          {r.assignment?.asset?.name ??
                            r.assignment?.asset?.code ??
                            '—'}
                          {r.assignment?.asset?.code && (
                            <span className="text-gray-400 font-mono ml-1">
                              ({r.assignment.asset.code})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                    {batch.returns.length > 5 && (
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                        <span className="text-gray-400">
                          +{batch.returns.length - 5} more
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            {batch.new_assigned_user && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Transferred to:{' '}
                    {[
                      batch.new_assigned_user.first_name,
                      batch.new_assigned_user.last_name,
                    ]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </p>
                </div>
              </div>
            )}
            {transferrerName && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Transferrer: {transferrerName}
                  </p>
                </div>
              </div>
            )}
            {/* Processed by (processor name only, no signature) */}
            {(batch.processed_by || batch.process_signed_at) && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {batch.dept_head_signed_at
                      ? batch.process_signed_at
                        ? `Processed by: ${batch.processed_by ?? '—'}`
                        : `Processor: ${batch.processed_by ?? '—'} (pending sign)`
                      : 'Processor: Pending manager approval'}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Transfer date:{' '}
                  {batch.created_at &&
                  !isNaN(new Date(batch.created_at).getTime())
                    ? new Date(batch.created_at).toLocaleDateString() +
                      ' ' +
                      new Date(batch.created_at).toLocaleTimeString()
                    : '—'}
                </p>
              </div>
            </div>
            {batch.transfer_type && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600">
                    Transfer type: {batch.transfer_type}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </TabsContent>
        <TabsContent value="timeline" className="mt-0 flex-1">
          <CardContent className="pt-0">
            <FormTimeline
              type="transfer"
              created_at={batch.created_at}
              signerName={transferrerName ?? ''}
              dept_head_signed_at={batch.dept_head_signed_at}
              dept_head_user_name={batch.dept_head_user_name}
              process_signed_at={batch.process_signed_at}
            />
          </CardContent>
        </TabsContent>
      </Tabs>
      <div className="flex gap-2 p-4 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 hover:bg-purple-600 hover:text-white"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        {canSign && !viewOnly && (
          <>
            <Button
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sign Form
            </Button>
            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AppAlertDialogFrame className="flex !max-w-2xl flex-col overflow-hidden">
                <AppAlertDialogGradientHeader title="Confirm Transfer Form Signing" />
                <AppAlertDialogMessage>
                  <AlertDialogDescription className="text-base text-gray-600">
                    Please review your asset transfer form below. By signing this
                    form you confirm that the transfer details are correct.
                  </AlertDialogDescription>
                </AppAlertDialogMessage>
                <div className="min-h-0 flex-1 overflow-auto px-6">
                  <div className="my-4 h-[50vh] w-full overflow-hidden rounded-lg border sm:h-[600px]">
                    {signDialogPdfUrl ? (
                      <iframe
                        src={signDialogPdfUrl}
                        className="h-full w-full"
                        title="Transfer form preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          maxWidth: 'none',
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-500">
                        Loading form preview...
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 py-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={agreeTransfer}
                        onCheckedChange={c => setAgreeTransfer(Boolean(c))}
                      />
                      <span className="text-sm">
                        I agree that the transfer details are correct
                      </span>
                    </label>
                  </div>
                </div>
                <AppAlertDialogChromeFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setAgreeTransfer(false);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!agreeTransfer}
                    onClick={async () => {
                      if (!batch.formID) return;
                      try {
                        await onSign?.(batch.formID);
                        setShowConfirmDialog(false);
                        setAgreeTransfer(false);
                      } catch {}
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Sign Form
                  </AlertDialogAction>
                </AppAlertDialogChromeFooter>
              </AppAlertDialogFrame>
            </AlertDialog>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="flex-1 hover:bg-green-600 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
};

/** Equipment borrowing request row (approvals / profile). */
export interface AssetBorrowFormBatch {
  borrow_request_id: string;
  user_id?: string;
  form_number?: string | null;
  created_at: string;
  borrow_scope: 'it' | 'admin';
  category_name?: string | null;
  type_name?: string | null;
  purpose: string;
  expected_return_at: string;
  requester_first_name?: string | null;
  requester_last_name?: string | null;
  requester_email?: string | null;
  requester_department_name?: string | null;
  requester_company_name?: string | null;
  requester_company_logo_url?: string | null;
  dept_head_signed_at?: string | null;
  approved_at?: string | null;
  pre_usage_condition?: string | null;
  asset_name?: string | null;
  asset_serial?: string | null;
  approved_by_name?: string | null;
  /** From API — used for badges / timeline (e.g. processor decline). */
  status?: string | null;
  declined_at?: string | null;
  processor_declined_at?: string | null;
  processor_decline_reason?: string | null;
  returned_at?: string | null;
  return_condition?: string | null;
  return_remarks?: string | null;
}

function parseMyBorrowRequestsResponse(res: unknown): AssetBorrowFormBatch[] {
  const payload =
    res &&
    typeof res === 'object' &&
    'success' in res &&
    (res as { success?: boolean }).success === true &&
    'data' in res
      ? (res as { data: { borrowRequests?: AssetBorrowFormBatch[] } }).data
      : (res as { borrowRequests?: AssetBorrowFormBatch[] });
  const list = payload?.borrowRequests ?? [];
  return Array.isArray(list) ? list : [];
}

export function isBorrowFormDeclined(batch: AssetBorrowFormBatch): boolean {
  return (
    batch.status === 'declined' ||
    Boolean(batch.declined_at) ||
    Boolean(batch.processor_declined_at)
  );
}

export function isBorrowFormReturned(batch: AssetBorrowFormBatch): boolean {
  return batch.status === 'returned' || Boolean(batch.returned_at);
}

export function buildBorrowDataForPDFFromBatch(
  batch: AssetBorrowFormBatch
): AssetBorrowingData | null {
  const borrowerName =
    `${batch.requester_first_name || ''} ${batch.requester_last_name || ''}`.trim() ||
    batch.requester_email?.trim() ||
    '—';
  const title =
    batch.borrow_scope === 'it'
      ? 'IT Equipment Borrowing'
      : 'Admin Equipment Borrowing';
  const formNumber =
    batch.form_number?.trim() ||
    `Borrow ${String(batch.borrow_request_id).slice(0, 8)}`;
  const equipmentName =
    batch.asset_name?.trim() ||
    batch.type_name?.trim() ||
    batch.category_name?.trim() ||
    '—';
  const serial = batch.asset_serial?.trim() || '';
  const pre = batch.pre_usage_condition?.trim() || '';
  const postParts: string[] = [];
  if (batch.return_condition?.trim()) {
    postParts.push(`Condition: ${batch.return_condition.trim()}`);
  }
  if (batch.return_remarks?.trim()) {
    postParts.push(batch.return_remarks.trim());
  }
  const post = postParts.join('\n\n');
  return {
    formNumber,
    title,
    borrowerName,
    borrowerDepartment: batch.requester_department_name?.trim() || '—',
    equipmentName,
    serialNumber: serial,
    preUsageCondition: pre,
    borrowingDate: batch.approved_at?.trim()
      ? batch.approved_at
      : batch.created_at || null,
    expectedReturnDate: batch.expected_return_at || null,
    purpose: batch.purpose || '',
    requestedBy: borrowerName,
    itReceivedBy: batch.approved_by_name?.trim() || '—',
    itApprovedBy: batch.approved_by_name?.trim() || '—',
    postUsageCondition: post,
    borrowerCompanyName: batch.requester_company_name ?? null,
    borrowerCompanyLogoUrl: batch.requester_company_logo_url ?? null,
  };
}

type BorrowStepVisual = 'done' | 'pending' | 'declined';

/** Timeline for borrow: Submitted → Dept head → IT/Admin processed (or declined / returned). */
function BorrowFormTimeline({ batch }: { batch: AssetBorrowFormBatch }) {
  const borrowerName =
    `${batch.requester_first_name || ''} ${batch.requester_last_name || ''}`.trim() ||
    batch.requester_email ||
    '—';
  const {
    created_at,
    dept_head_signed_at,
    approved_at,
    processor_declined_at,
    declined_at,
    processor_decline_reason,
    returned_at,
  } = batch;

  const formatDate = (d: string | null | undefined) =>
    d && !isNaN(new Date(d).getTime())
      ? new Date(d).toLocaleDateString() +
        ' ' +
        new Date(d).toLocaleTimeString()
      : null;

  const declined = isBorrowFormDeclined(batch);
  const returned = isBorrowFormReturned(batch);
  const step2Done = !!dept_head_signed_at;
  const step3Done = !declined && (!!approved_at || returned);

  const step3Visual: BorrowStepVisual = declined
    ? 'declined'
    : step3Done
      ? 'done'
      : 'pending';

  const stepNode = (visual: BorrowStepVisual, stepIndex: number) => {
    if (visual === 'declined') {
      return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white shadow-md shadow-red-500/25">
          <XCircle className="h-5 w-5" />
        </div>
      );
    }
    const done = visual === 'done';
    return (
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          done
            ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-500/25'
            : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <span className="text-sm font-semibold">{stepIndex}</span>
        )}
      </div>
    );
  };

  const stepBadgeClass = (
    dateOrPending: string | null,
    variant: 'pending' | 'neutral' | 'danger' | 'success'
  ) => {
    if (dateOrPending === 'Pending' || variant === 'pending') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
    }
    if (variant === 'danger') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    }
    if (variant === 'success') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    }
    return 'bg-muted text-muted-foreground';
  };

  const stepContent = (
    title: string,
    dateOrPending: string | null,
    description?: React.ReactNode,
    badgeVariant: 'pending' | 'neutral' | 'danger' | 'success' = 'neutral'
  ) => (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <span
        className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${stepBadgeClass(
          dateOrPending,
          badgeVariant
        )}`}
      >
        {dateOrPending ?? '—'}
      </span>
      {description != null && (
        <p className="mt-2 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );

  const step3Title = returned
    ? 'Returned'
    : declined
      ? 'Declined by IT / Admin'
      : 'Processed by IT / Admin';
  const step3When = returned
    ? formatDate(returned_at)
    : declined
      ? formatDate(processor_declined_at || declined_at)
      : step3Done
        ? formatDate(approved_at)
        : null;
  const step3BadgeVariant: 'pending' | 'neutral' | 'danger' | 'success' =
    returned ? 'success' : declined ? 'danger' : step3Done ? 'neutral' : 'pending';

  const step3Description =
    declined && processor_decline_reason?.trim() ? (
      <span className="block whitespace-pre-wrap">{processor_decline_reason.trim()}</span>
    ) : undefined;

  return (
    <div className="relative py-1">
      <div
        className="absolute left-[18px] top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-green-500 via-border to-muted-foreground/20"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode('done', 1)}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {stepContent(
              'Submitted',
              formatDate(created_at) ?? '—',
              <>Requested by {borrowerName || '—'}.</>,
              'neutral'
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode(step2Done ? 'done' : 'pending', 2)}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {stepContent(
              'Approved by the department head',
              step2Done ? (formatDate(dept_head_signed_at) ?? '—') : 'Pending',
              undefined,
              step2Done ? 'neutral' : 'pending'
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <div className="relative z-10 flex flex-col items-center">
            {stepNode(step3Visual, 3)}
          </div>
          <div className="flex-1 min-w-0">
            {stepContent(
              step3Title,
              step3When ?? (step3Done || declined || returned ? '—' : 'Pending'),
              step3Description,
              step3BadgeVariant
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Borrowing card — same shell as return/transfer form cards (Details / Timeline, View, Download). */
export const BorrowFormCard: React.FC<{
  batch: AssetBorrowFormBatch;
  onView: () => void;
  onDownload: () => void;
}> = ({ batch, onView, onDownload }) => {
  const formNumber =
    batch.form_number?.trim() ||
    `Borrow ${new Date(batch.created_at).toLocaleDateString()}`;
  const requesterName =
    `${batch.requester_first_name || ''} ${batch.requester_last_name || ''}`.trim() ||
    batch.requester_email ||
    'Employee';
  const declined = isBorrowFormDeclined(batch);
  const returned = isBorrowFormReturned(batch);
  const pendingDept = !batch.dept_head_signed_at;
  const pendingStaff =
    !!batch.dept_head_signed_at && !batch.approved_at && !declined;
  const completed = !!batch.approved_at && !declined;

  let badgeClass = 'bg-amber-100 text-amber-800';
  let badgeLabel = 'Pending approval';
  if (declined) {
    badgeClass = 'bg-red-100 text-red-800';
    badgeLabel = 'Declined';
  } else if (returned) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Returned';
  } else if (completed) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Completed';
  } else if (pendingStaff) {
    badgeClass = 'bg-blue-100 text-blue-800';
    badgeLabel = 'Pending IT/Admin';
  } else if (pendingDept) {
    badgeClass = 'bg-amber-100 text-amber-800';
    badgeLabel = 'Pending approval';
  }

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <HandHelping className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <CardTitle className="text-lg">{formNumber}</CardTitle>
              <p className="text-sm text-gray-500">
                Created {new Date(batch.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={badgeClass}>
            {badgeLabel}
          </Badge>
        </div>
      </CardHeader>

      <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-2 grid h-auto w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger
            value="details"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm"
          >
            Timeline
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-0 flex-1">
          <CardContent className="space-y-4 flex-1 pt-0">
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Requested equipment</p>
                <ul className="text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {batch.category_name ?? '—'}
                      {batch.type_name ? (
                        <span className="text-gray-400 ml-1">
                          — {batch.type_name}
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
                <p className="font-medium text-sm">Requested by: {requesterName}</p>
                {batch.requester_department_name?.trim() ? (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Department: {batch.requester_department_name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  Expected return:{' '}
                  {batch.expected_return_at &&
                  !isNaN(new Date(batch.expected_return_at).getTime())
                    ? new Date(batch.expected_return_at).toLocaleString()
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 line-clamp-3">
                  Purpose: {batch.purpose || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileCheck className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 uppercase">
                  Scope: {batch.borrow_scope}
                </p>
              </div>
            </div>
          </CardContent>
        </TabsContent>
        <TabsContent value="timeline" className="mt-0 flex-1">
          <CardContent className="pt-0">
            <BorrowFormTimeline batch={batch} />
          </CardContent>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 p-4 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 hover:bg-amber-600 hover:text-white"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="hover:bg-green-600 hover:text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
};

/** PDF preview for equipment borrowing form (mirrors TransferFormDetail). */
export const BorrowFormDetail: React.FC<{
  borrowFormBatch: AssetBorrowFormBatch;
  onClose: () => void;
  onDownload: () => void;
  contentOnly?: boolean;
}> = ({ borrowFormBatch, onClose, onDownload, contentOnly = false }) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    const generatePdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);
        setPdfUrl('');
        if (pdfUrlRef.current) {
          URL.revokeObjectURL(pdfUrlRef.current);
          pdfUrlRef.current = '';
        }
        const data = buildBorrowDataForPDFFromBatch(borrowFormBatch);
        if (!data) {
          setPdfError('Borrow form data is missing or incomplete');
          return;
        }
        const pdfBlob = await generateAssetBorrowingPDF(data);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (error) {
        if (!cancelled) {
          console.error('Error generating borrow PDF:', error);
          setPdfError('Failed to generate PDF. Please try again.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };
    generatePdf();
    return () => {
      cancelled = true;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = '';
      }
    };
  }, [
    borrowFormBatch.borrow_request_id,
    borrowFormBatch.approved_at,
    borrowFormBatch.returned_at,
    borrowFormBatch.return_condition,
    borrowFormBatch.return_remarks,
    borrowFormBatch.pre_usage_condition,
  ]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full min-h-0"
            title="Equipment Borrowing Form PDF Preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : pdfLoading ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-gray-500">
            Generating PDF preview...
          </div>
        ) : (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        )}
      </div>
    </div>
  );

  if (contentOnly) return pdfBody;

  const requesterName =
    `${borrowFormBatch.requester_first_name || ''} ${borrowFormBatch.requester_last_name || ''}`.trim() ||
    borrowFormBatch.requester_email ||
    'Borrower';
  const formTitle =
    borrowFormBatch.form_number?.trim() ||
    `Borrow ${borrowFormBatch.borrow_request_id.slice(0, 8)}`;

  return (
    <>
      <div className="flex-shrink-0 flex flex-col space-y-1.5 pb-2 text-left">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-gray-900">
          {requesterName} — {formTitle}
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          Equipment Borrowing Form Preview
        </p>
      </div>
      {pdfBody}
      <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-3 pt-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          size="sm"
          onClick={onDownload}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </>
  );
};

/** Asset transfer form batch (same structure as return form for UI compatibility) */
export interface AssetTransferFormBatch {
  formID: string;
  form_number: string;
  return_batch_id?: string;
  created_at: string;
  user_id: string;
  declined_at?: string | null;
  executed_at?: string | null;
  processed_by?: string | null;
  new_assigned_user_id?: string | null;
  new_assigned_user?: {
    first_name: string;
    last_name: string;
    position?: string | null;
    department?: string | null;
    company?: { id: string; name: string };
    user_department?: { id: string; name: string };
  } | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signed_digital_signature?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  transfer_type?: string | null;
  received_by?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_user_name?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_user_name?: string | null;
  returns: AssetReturnForm[];
}

interface AssetReturnForm {
  return_id: string;
  form_id?: string | null;
  form_number?: string | null;
  return_batch_id?: string | null;
  assignment_id: string;
  user_id: string;
  return_condition: string;
  return_notes: string;
  condition_images?: string[];
  pdf_file_path?: string;
  created_at: string;
  updated_at: string;
  processed_by?: string;
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
      company?: { id: string; name: string };
      companyLogoUrl?: string | null;
      department?: { id: string; name: string };
    };
    department: {
      id: string;
      name: string;
    } | null;
    location: {
      id: string;
      name: string;
      floor_unit?: string;
      building?: string;
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

/** One card = one batch (single return form containing one or more returned assets) */
export interface AssetReturnFormBatch {
  formID?: string | null;
  form_number?: string | null;
  return_batch_id: string | null;
  created_at: string;
  user_id: string;
  processed_by?: string;
  signed_at?: string | null;
  signed_by?: string | null;
  /** Returner's signature image (stored when they sign); used for PDF when viewing as non-returner */
  signed_digital_signature?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  return_type?: string | null;
  received_by?: string | null;
  process_user_position?: string | null;
  processor_declined_at?: string | null;
  processor_decline_reason?: string | null;
  /** Submitter-facing status from API */
  status?: string;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_user_name?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_signed_by?: string | null;
  it_manager_user_name?: string | null;
  /** Form's owning department (IT/Admin) for PDF header and scope; from category department */
  form_department?: { id: string; name: string } | null;
  returns: AssetReturnForm[];
}

function useDelayedLoading(loading: boolean, minDelayMs = 2000) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (loading) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), minDelayMs);
      return () => clearTimeout(t);
    }
  }, [loading, minDelayMs]);
  return loading || show;
}

export default function DocumentsTab({
  setActiveTab,
}: {
  setActiveTab: (tab: string) => void;
}) {
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  
  // Determine viewContext based on user permissions
  // Only show HR workflow (receive button) for users with HR accountability receiver role
  const hasHrAccountabilityReceiver =
    currentUser?.role?.hr_accountability_receiver === true ||
    currentUser?.hr_accountability_receiver === true;
  const accountabilityViewContext = hasHrAccountabilityReceiver ? 'hrCopy' : 'all';
  
  const [accountabilityForms, setAccountabilityForms] = useState<
    AccountabilityForm[]
  >([]);
  const [assetReturnForms, setAssetReturnForms] = useState<
    AssetReturnFormBatch[]
  >([]);
  const [assetTransferForms, setAssetTransferForms] = useState<
    AssetTransferFormBatch[]
  >([]);
  const [assetBorrowForms, setAssetBorrowForms] = useState<
    AssetBorrowFormBatch[]
  >([]);
  const [filteredForms, setFilteredForms] = useState<AccountabilityForm[]>([]);
  const [filteredReturnForms, setFilteredReturnForms] = useState<
    AssetReturnFormBatch[]
  >([]);
  const [filteredTransferForms, setFilteredTransferForms] = useState<
    AssetTransferFormBatch[]
  >([]);
  const [filteredBorrowForms, setFilteredBorrowForms] = useState<
    AssetBorrowFormBatch[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [borrowSearchQuery, setBorrowSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState<AccountabilityForm | null>(
    null
  );
  const [selectedReturnFormBatch, setSelectedReturnFormBatch] =
    useState<AssetReturnFormBatch | null>(null);
  const [selectedTransferFormBatch, setSelectedTransferFormBatch] =
    useState<AssetTransferFormBatch | null>(null);
  const [showFormDetail, setShowFormDetail] = useState(false);
  const [showReturnFormDetail, setShowReturnFormDetail] = useState(false);
  const [showTransferFormDetail, setShowTransferFormDetail] = useState(false);
  const [selectedBorrowFormBatch, setSelectedBorrowFormBatch] =
    useState<AssetBorrowFormBatch | null>(null);
  const [showBorrowFormDetail, setShowBorrowFormDetail] = useState(false);
  const [activeTab, setActiveTabState] = useState<'accountability' | 'returns'>(
    'accountability'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'disabled'
  >('active');

  const isLoading = useDelayedLoading(userLoading, 2000);

  const fetchAccountabilityForms = async () => {
    if (!currentUser?.id) {
      console.warn('User ID not available, skipping fetch');
      setAccountabilityForms([]);
      setFilteredForms([]);
      return;
    }

    try {
      const response = await api.get(
        `/accountability-forms?userId=${currentUser.id}`
      );
      const forms = response.forms || [];
      setAccountabilityForms(forms);
      setFilteredForms(forms);
    } catch (error) {
      console.error('Failed to fetch accountability forms:', error);
      setAccountabilityForms([]);
      setFilteredForms([]);
    }
  };

  const fetchAssetReturnForms = async () => {
    if (!currentUser?.id) {
      console.warn('User ID not available, skipping fetch');
      setAssetReturnForms([]);
      setFilteredReturnForms([]);
      return;
    }

    try {
      const response = await api.get(`/asset-returns/user/${currentUser.id}`);
      let batches: AssetReturnFormBatch[] = response.assetReturnForms || [];
      if (batches.length === 0 && Array.isArray(response.assetReturns)) {
        // Fallback: group flat list by return_batch_id ?? return_id (e.g. old API)
        const byBatch = new Map<string, AssetReturnForm[]>();
        for (const r of response.assetReturns) {
          const key = r.return_batch_id ?? r.return_id;
          if (!byBatch.has(key)) byBatch.set(key, []);
          byBatch.get(key)!.push(r);
        }
        batches = Array.from(byBatch.entries()).map(([_, returns]) => {
          const first = returns[0];
          return {
            formID: first?.form_id ?? null,
            form_number: first?.form_number ?? null,
            return_batch_id: first.return_batch_id ?? null,
            created_at: first.created_at,
            user_id: first.user_id,
            processed_by: first.processed_by,
            returns,
          };
        });
        batches.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      // Defense-in-depth: only show forms where current user is "Returned by"
      const forCurrentUser = batches.filter(
        batch => batch.user_id === currentUser.id
      );
      setAssetReturnForms(forCurrentUser);
      setFilteredReturnForms(forCurrentUser);
    } catch (error) {
      console.error('Failed to fetch asset return forms:', error);
      setAssetReturnForms([]);
      setFilteredReturnForms([]);
    }
  };

  const fetchAssetTransferForms = async () => {
    if (!currentUser?.id) {
      setAssetTransferForms([]);
      setFilteredTransferForms([]);
      return;
    }
    try {
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
        data?: { assetTransferForms?: AssetTransferFormBatch[] };
      }>(`/asset-transfers/user/${currentUser.id}`);
      const batches: AssetTransferFormBatch[] =
        response.assetTransferForms ?? response.data?.assetTransferForms ?? [];
      const forCurrentUser = batches.filter(
        batch => batch.user_id === currentUser.id
      );
      setAssetTransferForms(forCurrentUser);
      setFilteredTransferForms(forCurrentUser);
    } catch (error) {
      console.error('Failed to fetch asset transfer forms:', error);
      setAssetTransferForms([]);
      setFilteredTransferForms([]);
    }
  };

  // Filter forms based on search query and status filter
  useEffect(() => {
    let filtered = accountabilityForms;

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(
        form => form.status !== 'Disabled' && form.status !== 'Declined'
      );
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(
        form => form.status === 'Disabled' || form.status === 'Declined'
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(form =>
        matchesFormListSearch(form, searchQuery)
      );
    }

    setFilteredForms(filtered);
  }, [searchQuery, accountabilityForms, statusFilter]);

  // Filter return form batches based on search query (full batch payload)
  useEffect(() => {
    if (!returnSearchQuery.trim()) {
      setFilteredReturnForms(assetReturnForms);
    } else {
      const filtered = assetReturnForms.filter(batch =>
        matchesFormListSearch(batch, returnSearchQuery)
      );
      setFilteredReturnForms(filtered);
    }
  }, [returnSearchQuery, assetReturnForms]);

  useEffect(() => {
    if (!transferSearchQuery.trim()) {
      setFilteredTransferForms(assetTransferForms);
    } else {
      const filtered = assetTransferForms.filter(batch =>
        matchesFormListSearch(batch, transferSearchQuery)
      );
      setFilteredTransferForms(filtered);
    }
  }, [transferSearchQuery, assetTransferForms]);

  useEffect(() => {
    if (!borrowSearchQuery.trim()) {
      setFilteredBorrowForms(assetBorrowForms);
    } else {
      const filtered = assetBorrowForms.filter(batch =>
        matchesFormListSearch(batch, borrowSearchQuery)
      );
      setFilteredBorrowForms(filtered);
    }
  }, [borrowSearchQuery, assetBorrowForms]);

  const fetchAssetBorrowForms = async () => {
    if (!currentUser?.id) {
      setAssetBorrowForms([]);
      setFilteredBorrowForms([]);
      return;
    }
    try {
      const res = await api.get<unknown>('/asset-borrow-requests/mine');
      const list = parseMyBorrowRequestsResponse(res);
      setAssetBorrowForms(list);
      setFilteredBorrowForms(list);
    } catch (error) {
      console.error('Failed to fetch borrow forms:', error);
      setAssetBorrowForms([]);
      setFilteredBorrowForms([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) {
        return;
      }

      await Promise.all([
        fetchAccountabilityForms(),
        fetchAssetReturnForms(),
        fetchAssetTransferForms(),
        fetchAssetBorrowForms(),
      ]);
    };
    loadData();
  }, [currentUser?.id]);

  const handleSignForm = async (formId: string, acknowledgments?: Record<string, unknown>) => {
    try {
      await api.post(`/accountability-forms/${formId}/sign`, { acknowledgments });
      await fetchAccountabilityForms();
      // Update selectedForm if it's the one being signed
      if (selectedForm && selectedForm.id === formId) {
        setSelectedForm({
          ...selectedForm,
          status: 'Signed',
          signed_at: new Date().toISOString(),
        });
      }
      toast.success('Form signed successfully');
    } catch (error) {
      console.error('Failed to sign form:', error);
      toast.error('Failed to sign form');
      throw error;
    }
  };

  const handleDeclineAccountabilityForm = async (
    formId: string,
    reason: string
  ) => {
    try {
      await api.post(`/accountability-forms/${formId}/decline`, { reason });
      await fetchAccountabilityForms();
      toast.success('Accountability form declined');
    } catch (error: unknown) {
      console.error('Failed to decline accountability form:', error);
      const msg =
        error instanceof Error ? error.message : 'Failed to decline form';
      toast.error(msg);
      throw error;
    }
  };

  const handleSignTransferForm = async (formId: string) => {
    try {
      await api.post(`/asset-transfers/forms/${formId}/sign`, {});
      await fetchAssetTransferForms();
      toast.success('Transfer form signed successfully');
    } catch (error) {
      console.error('Failed to sign transfer form:', error);
      toast.error('Failed to sign transfer form');
      throw error;
    }
  };

  const handleSignReturnForm = async (formId: string) => {
    try {
      await api.post(`/asset-returns/forms/${formId}/sign`, {});
      await fetchAssetReturnForms();
      toast.success('Return form signed successfully');
    } catch (error) {
      console.error('Failed to sign return form:', error);
      toast.error('Failed to sign return form');
      throw error;
    }
  };

  const handleViewForm = (form: AccountabilityForm) => {
    setSelectedForm(form);
    setShowFormDetail(true);
  };

  const handleCloseFormDetail = () => {
    setShowFormDetail(false);
    setSelectedForm(null);
  };

  const handleDownloadReturnFormBatch = async (batch: AssetReturnFormBatch) => {
    try {
      const signature =
        batch.signed_at && currentUser?.id === batch.user_id
          ? {
              signed_at: batch.signed_at,
            }
          : undefined;
      const returnDataForPDF = buildReturnDataForPDFFromBatch(batch, signature);
      if (!returnDataForPDF) {
        throw new Error('Return form data is missing or incomplete');
      }
      const pdfBlob = await generateAssetReturnPDF(returnDataForPDF);
      const fileName =
        batch.returns.length === 1
          ? `Asset_Return_Form_${batch.returns[0].assignment?.asset?.code ?? 'return'}_${Date.now()}.pdf`
          : `Asset_Return_Form_${batch.returns.length}_assets_${Date.now()}.pdf`;
      downloadPDF(pdfBlob, fileName);
      toast.success('Return form downloaded successfully');
    } catch (error) {
      console.error('Failed to download return form:', error);
      toast.error('Failed to download return form');
    }
  };

  const handleDownloadBorrowFormBatch = async (batch: AssetBorrowFormBatch) => {
    try {
      const data = buildBorrowDataForPDFFromBatch(batch);
      if (!data) {
        throw new Error('Borrow form data is missing or incomplete');
      }
      const pdfBlob = await generateAssetBorrowingPDF(data);
      const fileName = `Equipment_Borrow_${batch.form_number ?? batch.borrow_request_id.slice(0, 8)}_${Date.now()}.pdf`;
      downloadPDF(pdfBlob, fileName);
      toast.success('Borrow form downloaded successfully');
    } catch (error) {
      console.error('Failed to download borrow form:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to download borrow form'
      );
    }
  };

  if (isLoading || !currentUser) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl border border-white/30">
              <Shimmer className="h-8 w-8 rounded bg-white/20" />
            </div>
            <div>
              <Shimmer className="h-8 w-32 rounded bg-white/20" />
              <Shimmer className="h-5 w-96 rounded mt-2 bg-white/20" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* Accountability Forms Section Shimmer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Shimmer className="w-6 h-6 rounded" />
              <Shimmer className="h-6 w-64 rounded" />
              <Shimmer className="h-6 w-8 rounded-full" />
            </div>

            {/* Search and Filter Controls Shimmer */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Shimmer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded" />
                <Shimmer className="h-10 w-full max-w-md rounded-lg" />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Shimmer className="h-10 w-16 rounded-lg" />
                <Shimmer className="h-10 w-16 rounded-lg" />
                <Shimmer className="h-10 w-20 rounded-lg" />
              </div>
            </div>

            {/* Shimmer cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Shimmer className="w-12 h-12 rounded-lg" />
                      <div>
                        <Shimmer className="h-5 w-32 rounded" />
                        <Shimmer className="h-4 w-24 rounded mt-1" />
                      </div>
                    </div>
                    <Shimmer className="h-6 w-16 rounded-full" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Shimmer className="w-4 h-4 rounded-full mt-0.5" />
                      <Shimmer className="h-4 w-48 rounded" />
                    </div>
                    <div className="flex items-start gap-3">
                      <Shimmer className="w-4 h-4 rounded-full mt-0.5" />
                      <Shimmer className="h-4 w-36 rounded" />
                    </div>
                    <div className="flex items-start gap-3">
                      <Shimmer className="w-4 h-4 rounded-full mt-0.5" />
                      <Shimmer className="h-4 w-40 rounded" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Shimmer className="h-10 flex-1 rounded-lg" />
                    <Shimmer className="h-10 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Return Forms Section Shimmer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Shimmer className="w-6 h-6 rounded" />
              <Shimmer className="h-6 w-64 rounded" />
              <Shimmer className="h-6 w-8 rounded-full" />
            </div>

            {/* Return Forms Search Bar Shimmer */}
            <div className="relative mb-6">
              <Shimmer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded" />
              <Shimmer className="h-10 w-full max-w-md rounded-lg" />
            </div>

            {/* Return Form Cards Shimmer */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shimmer className="h-5 w-48 rounded" />
                        <Shimmer className="h-4 w-20 rounded" />
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <Shimmer className="h-4 w-28 rounded" />
                      </div>
                      <div className="text-sm text-gray-600">
                        <Shimmer className="h-4 w-40 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Shimmer className="h-10 flex-1 rounded-lg" />
                    <Shimmer className="h-10 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Documents Section Shimmer */}
          <div className="border-t pt-8">
            <div className="text-center py-12 space-y-4">
              <Shimmer className="w-16 h-16 mx-auto rounded-full" />
              <Shimmer className="h-6 w-48 mx-auto rounded" />
              <Shimmer className="h-4 w-64 mx-auto rounded" />
              <Shimmer className="h-4 w-32 mx-auto rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Documents</CardTitle>
              <p className="text-red-100 text-sm opacity-90">
                Accountability, return, transfer, and equipment borrow forms
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator className="bg-gray-100" />

        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* Accountability Forms Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FileCheck className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Asset Accountability Forms
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {filteredForms.length}
              </span>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search form number, employee, assets, department..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full max-w-md"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={
                    statusFilter === 'all'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className={
                    statusFilter === 'active'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'disabled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('disabled')}
                  className={
                    statusFilter === 'disabled'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                >
                  Disabled
                </Button>
              </div>
            </div>

            {filteredForms.length === 0 ? (
              <div className="text-center py-12 rounded-lg">
                <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <p className="text-gray-500 text-lg">No forms found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      No forms match &quot;{searchQuery}&quot;. Try different
                      keywords (form number, employee, asset, etc.).
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">
                      No accountability forms yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Forms will appear here when assets are assigned to you
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredForms.map(form => (
                  <AccountabilityFormCard
                    key={form.id}
                    form={form}
                    onSign={handleSignForm}
                    onView={handleViewForm}
                    showDeclineButton
                    onDecline={handleDeclineAccountabilityForm}
                    showDownloadButton={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Asset Return Forms Section */}
          <div id="asset-return-forms" className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FileDown className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Asset Return Forms
              </h3>
              <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                {filteredReturnForms.length}
              </span>
            </div>

            {/* Return Forms Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search form number, assets, returner, department, notes..."
                value={returnSearchQuery}
                onChange={e => setReturnSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full max-w-md"
              />
            </div>

            {filteredReturnForms.length === 0 ? (
              <div className="text-center py-12 rounded-lg">
                <FileDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {returnSearchQuery ? (
                  <>
                    <p className="text-gray-500 text-lg">
                      No return forms found
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      No return forms match "{returnSearchQuery}". Try a
                      different search term.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">
                      No asset return forms yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Return forms will appear here when you return assets
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReturnForms.map(batch => (
                  <ReturnFormCard
                    key={
                      batch.formID ??
                      batch.return_batch_id ??
                      batch.returns[0]?.return_id ??
                      ''
                    }
                    batch={batch}
                    onView={() => {
                      setSelectedReturnFormBatch(batch);
                      setShowReturnFormDetail(true);
                    }}
                    onSign={handleSignReturnForm}
                    onDownload={async () => {
                      try {
                        const signature =
                          batch.signed_at &&
                          currentUser?.id === batch.user_id
                            ? {
                                signed_at: batch.signed_at,
                              }
                            : undefined;
                        const returnDataForPDF = buildReturnDataForPDFFromBatch(
                          batch,
                          signature
                        );
                        if (!returnDataForPDF) {
                          throw new Error(
                            'Return form data is missing or incomplete'
                          );
                        }
                        const pdfBlob =
                          await generateAssetReturnPDF(returnDataForPDF);
                        const fileName =
                          batch.returns.length === 1
                            ? `Asset_Return_Form_${batch.returns[0].assignment?.asset?.code ?? 'return'}_${Date.now()}.pdf`
                            : `Asset_Return_Form_${batch.returns.length}_assets_${Date.now()}.pdf`;
                        downloadPDF(pdfBlob, fileName);
                        toast.success('Return form downloaded successfully');
                      } catch (error) {
                        console.error('Failed to download return form:', error);
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Failed to download return form'
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Asset Transfer Forms Section */}
          <div id="asset-transfer-forms" className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ArrowRightLeft className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Asset Transfer Forms
              </h3>
              <span className="bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full">
                {filteredTransferForms.length}
              </span>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search form number, assets, users, department, recipient..."
                value={transferSearchQuery}
                onChange={e => setTransferSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full max-w-md"
              />
            </div>
            {filteredTransferForms.length === 0 ? (
              <div className="text-center py-12 rounded-lg">
                <ArrowRightLeft className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {transferSearchQuery ? (
                  <>
                    <p className="text-gray-500 text-lg">
                      No transfer forms found
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      No transfer forms match &quot;{transferSearchQuery}&quot;
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">
                      No asset transfer forms yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Transfer forms will appear here when assets are
                      transferred from you
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTransferForms.map(batch => (
                  <TransferFormCard
                    key={batch.formID ?? batch.returns[0]?.return_id ?? ''}
                    batch={batch}
                    onView={() => {
                      setSelectedTransferFormBatch(batch);
                      setShowTransferFormDetail(true);
                    }}
                    onSign={handleSignTransferForm}
                    onDownload={async () => {
                      try {
                        const data = buildTransferDataForPDFFromBatch(batch);
                        if (!data) {
                          throw new Error(
                            'Transfer form data is missing or incomplete'
                          );
                        }
                        const pdfBlob = await generateAssetTransferPDF(data);
                        const fileName = `Asset_Transfer_Form_${batch.form_number ?? 'transfer'}_${Date.now()}.pdf`;
                        downloadPDF(pdfBlob, fileName);
                        toast.success('Transfer form downloaded successfully');
                      } catch (error) {
                        console.error(
                          'Failed to download transfer form:',
                          error
                        );
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Failed to download transfer form'
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Asset Borrow Forms (equipment borrowing — same cards as staff borrow list) */}
          <div id="asset-borrow-forms" className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <HandHelping className="w-6 h-6 text-amber-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Asset Borrow Forms
              </h3>
              <span className="bg-amber-100 text-amber-800 text-sm px-2 py-1 rounded-full">
                {filteredBorrowForms.length}
              </span>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search form number, equipment, purpose, status..."
                value={borrowSearchQuery}
                onChange={e => setBorrowSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full max-w-md"
              />
            </div>
            {filteredBorrowForms.length === 0 ? (
              <div className="text-center py-12 rounded-lg">
                <HandHelping className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                {borrowSearchQuery ? (
                  <>
                    <p className="text-gray-500 text-lg">No borrow forms found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      No forms match &quot;{borrowSearchQuery}&quot;.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">No borrow forms yet</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Submitted equipment borrowing requests appear here
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBorrowForms.map(batch => (
                  <BorrowFormCard
                    key={batch.borrow_request_id}
                    batch={batch}
                    onView={() => {
                      setSelectedBorrowFormBatch(batch);
                      setShowBorrowFormDetail(true);
                    }}
                    onDownload={async () => {
                      try {
                        const data = buildBorrowDataForPDFFromBatch(batch);
                        if (!data) {
                          throw new Error(
                            'Borrow form data is missing or incomplete'
                          );
                        }
                        const pdfBlob =
                          await generateAssetBorrowingPDF(data);
                        const fileName = `Equipment_Borrow_${batch.form_number ?? batch.borrow_request_id.slice(0, 8)}_${Date.now()}.pdf`;
                        downloadPDF(pdfBlob, fileName);
                        toast.success('Borrow form downloaded successfully');
                      } catch (error) {
                        console.error('Failed to download borrow form:', error);
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Failed to download borrow form'
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Other Documents Placeholder */}
          <div className="border-t pt-8">
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">Other employee documents</p>
              <p className="text-sm mt-1">
                Contracts, certificates, payslips, etc.
              </p>
              <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Detail Dialog */}
      <Dialog open={showFormDetail} onOpenChange={setShowFormDetail}>
        <AppDialogFrame className="flex h-[min(96dvh,calc(100vh-0.5rem))] !max-h-[min(96dvh,calc(100vh-0.5rem))] min-h-0 !max-w-2xl flex-col overflow-hidden !gap-0 !border-0 !p-0">
          {selectedForm && (
            <>
              <AppDialogGradientHeader
                className="shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5"
                title={`${selectedForm.user.first_name} ${selectedForm.user.last_name} - ${selectedForm.formNumber}`}
                description="Asset Accountability Form Preview"
              />
              <AccountabilityFormDetail
                form={selectedForm}
                onClose={handleCloseFormDetail}
                onSign={handleSignForm}
                setActiveTab={setActiveTab}
                headerInParentChrome
                showDeclineButton
                onDecline={handleDeclineAccountabilityForm}
                viewContext={accountabilityViewContext}
              />
            </>
          )}
        </AppDialogFrame>
      </Dialog>

      {/* Transfer Form Detail Dialog (mirrors Return Form Detail – PDF preview) */}
      <Dialog
        open={showTransferFormDetail}
        onOpenChange={setShowTransferFormDetail}
      >
        <AppDialogFrame className="flex h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 max-w-3xl flex-col overflow-hidden">
          {selectedTransferFormBatch && (
            <>
              <AppDialogGradientHeader
                title={
                  <>
                    {selectedTransferFormBatch.returns[0]?.assignment?.user
                      ? `${selectedTransferFormBatch.returns[0].assignment.user.first_name || ''} ${selectedTransferFormBatch.returns[0].assignment.user.last_name || ''}`.trim() ||
                        'Transfer'
                      : 'Transfer'}{' '}
                    -{' '}
                    {selectedTransferFormBatch.form_number ??
                      `Transfer of ${selectedTransferFormBatch.returns.length} assets`}
                  </>
                }
                description="Asset Transfer Form Preview"
              />
              <AppDialogBody className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
                <TransferFormDetail
                  key={
                    selectedTransferFormBatch.formID ??
                    selectedTransferFormBatch.return_batch_id ??
                    'transfer-form'
                  }
                  transferFormBatch={selectedTransferFormBatch}
                  onClose={() => setShowTransferFormDetail(false)}
                  onDownload={() => {
                    const data = buildTransferDataForPDFFromBatch(
                      selectedTransferFormBatch
                    );
                    if (!data) {
                      toast.error('Cannot generate PDF for this form');
                      return;
                    }
                    generateAssetTransferPDF(data)
                      .then(blob => {
                        const fileName = `Asset_Transfer_Form_${selectedTransferFormBatch.form_number ?? 'transfer'}_${Date.now()}.pdf`;
                        downloadPDF(blob, fileName);
                        toast.success('Transfer form downloaded successfully');
                      })
                      .catch(err => {
                        console.error(err);
                        toast.error('Failed to download transfer form');
                      });
                  }}
                  contentOnly
                />
              </AppDialogBody>
              <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTransferFormDetail(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!selectedTransferFormBatch) return;
                    try {
                      const data = buildTransferDataForPDFFromBatch(
                        selectedTransferFormBatch
                      );
                      if (!data) {
                        throw new Error(
                          'Transfer form data is missing or incomplete'
                        );
                      }
                      const pdfBlob = await generateAssetTransferPDF(data);
                      const fileName = `Asset_Transfer_Form_${selectedTransferFormBatch.form_number ?? 'transfer'}_${Date.now()}.pdf`;
                      downloadPDF(pdfBlob, fileName);
                      toast.success('Transfer form downloaded successfully');
                    } catch (error) {
                      console.error('Failed to download transfer form:', error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : 'Failed to download transfer form'
                      );
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            </>
          )}
        </AppDialogFrame>
      </Dialog>

      {/* Borrow Form Detail Dialog */}
      <Dialog
        open={showBorrowFormDetail}
        onOpenChange={setShowBorrowFormDetail}
      >
        <AppDialogFrame className="flex h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 max-w-3xl flex-col overflow-hidden">
          {selectedBorrowFormBatch && (
            <>
              <AppDialogGradientHeader
                title={
                  <>
                    {`${selectedBorrowFormBatch.requester_first_name || ''} ${selectedBorrowFormBatch.requester_last_name || ''}`.trim() ||
                      selectedBorrowFormBatch.requester_email ||
                      'Borrower'}{' '}
                    —{' '}
                    {selectedBorrowFormBatch.form_number?.trim() ||
                      `Borrow ${selectedBorrowFormBatch.borrow_request_id.slice(0, 8)}`}
                  </>
                }
                description="Equipment Borrowing Form Preview"
              />
              <AppDialogBody className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
                <BorrowFormDetail
                  key={selectedBorrowFormBatch.borrow_request_id}
                  borrowFormBatch={selectedBorrowFormBatch}
                  onClose={() => setShowBorrowFormDetail(false)}
                  onDownload={() =>
                    void handleDownloadBorrowFormBatch(selectedBorrowFormBatch)
                  }
                  contentOnly
                />
              </AppDialogBody>
              <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBorrowFormDetail(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    void handleDownloadBorrowFormBatch(selectedBorrowFormBatch)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            </>
          )}
        </AppDialogFrame>
      </Dialog>

      {/* Return Form Detail Dialog */}
      <Dialog
        open={showReturnFormDetail}
        onOpenChange={setShowReturnFormDetail}
      >
        <AppDialogFrame className="flex h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 max-w-3xl flex-col overflow-hidden">
          {selectedReturnFormBatch && (
            <>
              <AppDialogGradientHeader
                title={
                  <>
                    {selectedReturnFormBatch.returns[0]?.assignment?.user
                      ? `${selectedReturnFormBatch.returns[0].assignment.user.first_name || ''} ${selectedReturnFormBatch.returns[0].assignment.user.last_name || ''}`.trim() ||
                        'Return'
                      : 'Return'}{' '}
                    -{' '}
                    {selectedReturnFormBatch.form_number ??
                      `Return of ${selectedReturnFormBatch.returns.length} assets`}
                  </>
                }
                description="Asset Return Form Preview"
              />
              <AppDialogBody className="flex min-h-0 flex-1 flex-col overflow-hidden py-4">
                <ReturnFormDetail
                  key={
                    selectedReturnFormBatch.formID ??
                    selectedReturnFormBatch.return_batch_id ??
                    selectedReturnFormBatch.returns[0]?.return_id ??
                    'return-form'
                  }
                  returnFormBatch={selectedReturnFormBatch}
                  onClose={() => setShowReturnFormDetail(false)}
                  onDownload={() =>
                    handleDownloadReturnFormBatch(selectedReturnFormBatch)
                  }
                  contentOnly
                />
              </AppDialogBody>
              <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReturnFormDetail(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    handleDownloadReturnFormBatch(selectedReturnFormBatch)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            </>
          )}
        </AppDialogFrame>
      </Dialog>
    </>
  );
}

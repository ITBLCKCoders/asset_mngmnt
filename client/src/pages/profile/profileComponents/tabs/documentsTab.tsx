'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  ClipboardList,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Shimmer } from '@/components/ui/shimmer';
import { Tabs, TabsList, TabsTrigger, TabsContent, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PDFViewer } from '@/components/PDFViewer';
import {
  AccountabilityFormCard,
  ClearanceFormCard,
  generateAccountabilityFormPDF,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { matchesFormListSearch } from '@/utils/formListSearch';
import {
  generateAssetReturnPDF,
  generateAssetTransferPDF,
  generateAssetBorrowingPDF,
  generateAssetChecklistPDF,
  generateAccountabilityClearancePDF,
  downloadPDF,
  type AssetReturnData,
  type AssetTransferData,
  type AssetBorrowingData,
  type AssetChecklistData,
} from '@/lib/pdfGenerator';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { GenerateClearanceModal } from '@/pages/profile/profileComponents/GenerateClearanceModal';

export function buildReturnDataForPDFFromBatch(
  batch: AssetReturnFormBatch,
  signature?: {
    signed_at: string;
    digital_signature?: string | null;
  } | null
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
    digital_signature:
      signature?.digital_signature ??
      batch.signed_digital_signature ??
      undefined,
    ...(() => {
      const processSignedAt =
        batch.process_signed_at ?? batch.processor_pending_signed_at ?? null;
      const processDigitalSignature =
        batch.process_digital_signature ?? batch.processor_pending_signature ?? null;
      const showProcessor =
        !!processSignedAt || !!processDigitalSignature;
      return showProcessor
        ? {
            showProcessorSignatureBlock: true,
            process_signed_at: processSignedAt ?? undefined,
            process_digital_signature: processDigitalSignature ?? undefined,
            process_user_name: batch.processed_by ?? undefined,
          }
        : { showProcessorSignatureBlock: false };
    })(),
    returnType: batch.return_type ?? undefined,
    processorPosition: batch.process_user_position?.trim() || undefined,
    receivedBy: batch.process_user_position?.trim()
      ? undefined
      : batch.received_by ?? undefined,
    dept_head_signed_at: batch.dept_head_signed_at ?? undefined,
    dept_head_digital_signature: batch.dept_head_digital_signature ?? undefined,
    dept_head_user_name: batch.dept_head_user_name ?? undefined,
    dept_head_position: batch.dept_head_position ?? undefined,
    sub_approver_1_signed_at: batch.sub_approver_1_signed_at ?? undefined,
    sub_approver_1_digital_signature:
      batch.sub_approver_1_digital_signature ?? undefined,
    sub_approver_1_user_name: batch.sub_approver_1_user_name ?? undefined,
    sub_approver_1_position: batch.sub_approver_1_position ?? undefined,
    it_manager_signed_at: batch.it_manager_signed_at ?? undefined,
    it_manager_digital_signature:
      batch.it_manager_digital_signature ?? undefined,
    it_manager_user_name: batch.it_manager_user_name ?? undefined,
    it_manager_position: batch.it_manager_position ?? undefined,
    sub_approver_2_signed_at: batch.sub_approver_2_signed_at ?? undefined,
    sub_approver_2_digital_signature:
      batch.sub_approver_2_digital_signature ?? undefined,
    sub_approver_2_user_name: batch.sub_approver_2_user_name ?? undefined,
    sub_approver_2_position: batch.sub_approver_2_position ?? undefined,
    ownerAbsent: batch.owner_absent === true,
  };
}

export function buildTransferDataForPDFFromBatch(
  batch: AssetTransferFormBatch,
  signature?: {
    signed_at: string;
    digital_signature?: string | null;
  } | null
): AssetTransferData | null {
  if (!batch.returns?.length) return null;
  const first = batch.returns[0];
  if (!first?.assignment?.asset) return null;
  const transferrerSignature =
    signature ??
    (batch.signed_at
      ? {
          signed_at: batch.signed_at,
          digital_signature: batch.signed_digital_signature ?? null,
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
    ...(() => {
      const processSignedAt =
        batch.process_signed_at ?? batch.processor_pending_signed_at ?? null;
      const processDigitalSignature =
        batch.process_digital_signature ??
        batch.processor_pending_signature ??
        null;
      const showProcessor =
        !!processSignedAt || !!processDigitalSignature;
      return showProcessor
        ? {
            showProcessorSignatureBlock: true,
            process_signed_at: processSignedAt ?? undefined,
            process_digital_signature: processDigitalSignature ?? undefined,
            process_user_name: batch.processed_by ?? undefined,
          }
        : { showProcessorSignatureBlock: false };
    })(),
    transferType: batch.transfer_type ?? undefined,
    receivedBy: batch.received_by ?? undefined,
    ...(transferrerSignature?.signed_at
      ? {
          signed_at: transferrerSignature.signed_at,
        }
      : {}),
    digital_signature:
      signature?.digital_signature ??
      transferrerSignature?.digital_signature ??
      batch.signed_digital_signature ??
      undefined,
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
    dept_head_position: batch.dept_head_position ?? undefined,
    sub_approver_1_signed_at: batch.sub_approver_1_signed_at ?? undefined,
    sub_approver_1_digital_signature:
      batch.sub_approver_1_digital_signature ?? undefined,
    sub_approver_1_user_name: batch.sub_approver_1_user_name ?? undefined,
    sub_approver_1_position: batch.sub_approver_1_position ?? undefined,
    it_manager_signed_at: batch.it_manager_signed_at ?? undefined,
    it_manager_digital_signature:
      batch.it_manager_digital_signature ?? undefined,
    it_manager_user_name: batch.it_manager_user_name ?? undefined,
    it_manager_position: batch.it_manager_position ?? undefined,
    sub_approver_2_signed_at: batch.sub_approver_2_signed_at ?? undefined,
    sub_approver_2_digital_signature:
      batch.sub_approver_2_digital_signature ?? undefined,
    sub_approver_2_user_name: batch.sub_approver_2_user_name ?? undefined,
    sub_approver_2_position: batch.sub_approver_2_position ?? undefined,
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

/** Drop cached PDF previews for a form so signature/approval updates regenerate. */
export function clearReturnPdfCacheForFormNumber(formNumber: string | null) {
  if (!formNumber) return;
  for (const key of [...returnFormPdfCache.keys()]) {
    if (!key.startsWith(formNumber)) continue;
    const u = returnFormPdfCache.get(key);
    if (u) URL.revokeObjectURL(u);
    returnFormPdfCache.delete(key);
    const idx = returnFormPdfCacheOrder.indexOf(key);
    if (idx !== -1) returnFormPdfCacheOrder.splice(idx, 1);
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
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const pdfUrlRef = useRef<string>('');
  const cacheKey = formNumber
    ? formNumber +
      (returnFormBatch.signed_at ? '-signed' : '') +
      (returnFormBatch.signed_digital_signature ? '-rsig' : '') +
      (returnFormBatch.process_signed_at ? '-process' : '') +
      (returnFormBatch.dept_head_signed_at ? '-depthead' : '') +
      (returnFormBatch.dept_head_digital_signature ? '-dhsig' : '') +
      (returnFormBatch.it_manager_signed_at ? '-itmanager' : '') +
      (returnFormBatch.it_manager_digital_signature ? '-itsig' : '')
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
            digital_signature:
              returnFormBatch.signed_digital_signature ?? null,
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

  useEffect(() => {
    if (!pdfUrl) return;
    setIframeLoaded(false);
    const timer = window.setTimeout(() => setIframeLoaded(true), 15000);
    return () => window.clearTimeout(timer);
  }, [pdfUrl]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
        {pdfError && !pdfLoading && !pdfUrl ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        ) : (
          <div className="relative w-full h-full min-h-[200px]">
            {(pdfLoading || !iframeLoaded) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                  <p className="text-sm">Loading PDF preview...</p>
                </div>
              </div>
            )}
            <iframe
              src={pdfUrl}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full min-h-0"
              title="PDF Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
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
  const [iframeLoaded, setIframeLoaded] = useState(false);
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

  useEffect(() => {
    if (!pdfUrl) return;
    setIframeLoaded(false);
    const timer = window.setTimeout(() => setIframeLoaded(true), 15000);
    return () => window.clearTimeout(timer);
  }, [pdfUrl]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
        {pdfError && !pdfLoading && !pdfUrl ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        ) : (
          <div className="relative w-full h-full min-h-[200px]">
            {(pdfLoading || !iframeLoaded) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                  <p className="text-sm">Loading PDF preview...</p>
                </div>
              </div>
            )}
            <iframe
              src={pdfUrl}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full min-h-0"
              title="Transfer Form PDF Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
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

/** Shared timeline for return/transfer forms: Submitted/Initiated → Approved by dept head → Completed */
export function FormTimeline({
  type,
  created_at,
  signerName,
  dept_head_signed_at,
  dept_head_user_name,
  sub_approver_1_signed_at,
  sub_approver_1_user_name,
  sub_approver_1_position,
  process_signed_at,
  executed_at,
  owner_absent,
  processorName,
}: {
  type: 'return' | 'transfer';
  created_at: string;
  signerName: string;
  dept_head_signed_at?: string | null;
  dept_head_user_name?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_user_name?: string | null;
  sub_approver_1_position?: string | null;
  process_signed_at?: string | null;
  /** Transfer execution timestamp (transfer completion signal). Optional: pages without it fall back to process_signed_at. */
  executed_at?: string | null;
  /** True when the processor (IT/Admin) initiated on behalf of an absent owner. */
  owner_absent?: boolean;
  /** Name of the processor who initiated a held (owner absent) form. */
  processorName?: string;
}) {
  const formatDate = (d: string | null | undefined) =>
    d && !isNaN(new Date(d).getTime())
      ? new Date(d).toLocaleDateString() +
        ' ' +
        new Date(d).toLocaleTimeString()
      : null;
  const step1Done = true;
  const ownerAbsent = !!owner_absent;
  const approvedBySub = !!sub_approver_1_signed_at;
  const step2Done = !!dept_head_signed_at || approvedBySub;
  const step3Done =
    type === 'transfer'
      ? executed_at === undefined
        ? !!process_signed_at
        : !!executed_at
      : ownerAbsent
        ? step2Done
        : !!process_signed_at;
  const step1Date = ownerAbsent
    ? formatDate(process_signed_at ?? created_at) ?? '—'
    : formatDate(created_at) ?? '—';
  const step3Date =
    type === 'transfer'
      ? formatDate(executed_at ?? process_signed_at)
      : ownerAbsent
        ? formatDate(
            sub_approver_1_signed_at ?? dept_head_signed_at ?? process_signed_at
          )
        : formatDate(process_signed_at);
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
      {/* Step 1: Submitted / Initiated by IT/Admin */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(step1Done, 1)}
          <div
            className={`w-0.5 flex-1 rounded-full ${
              step2Done ? 'bg-green-500' : 'bg-muted-foreground/20'
            }`}
            aria-hidden
          />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            ownerAbsent ? 'Initiated by IT / Admin' : 'Submitted',
            step1Date,
            ownerAbsent ? (
              <>
                The asset owner is marked absent.{' '}
                {processorName || 'IT/Admin'} initiated this{' '}
                {type === 'return' ? 'return' : 'transfer'} on the owner's
                behalf. Has been pending for approval of the department head.
              </>
            ) : (
              <>
                Signed by {signerName || '—'}. Has been pending for approval of
                your department head.
              </>
            )
          )}
        </div>
      </div>
      {/* Step 2: Approved by department head */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(step2Done, 2)}
          <div
            className={`w-0.5 flex-1 rounded-full ${
              step3Done ? 'bg-green-500' : 'bg-muted-foreground/20'
            }`}
            aria-hidden
          />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            'Approved by the department head',
            step2Done
              ? (formatDate(
                  sub_approver_1_signed_at ?? dept_head_signed_at
                ) ?? '—')
              : 'Pending',
            approvedBySub ? (
              <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Stand-in approver
              </span>
            ) : undefined,
            step2Done && (dept_head_user_name || sub_approver_1_user_name) ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                —{' '}
                {sub_approver_1_user_name ?? dept_head_user_name}
                {approvedBySub && sub_approver_1_position
                  ? ` (${sub_approver_1_position})`
                  : ''}
              </p>
            ) : undefined
          )}
        </div>
      </div>
      {/* Step 3: Completed */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(step3Done, 3)}
        </div>
        <div className="flex-1 min-w-0">
          {stepContent(
            completedLabel,
            step3Done ? (step3Date ?? '—') : 'Pending'
          )}
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
  onSign?: (
    formId: string,
    options?: { digitalSignature?: string | null }
  ) => Promise<void>;
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
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [agreeReturn, setAgreeReturn] = useState(false);
  const [signDialogPdfUrl, setSignDialogPdfUrl] = useState<string>('');
  const [signDialogIframeLoaded, setSignDialogIframeLoaded] = useState(false);
  const signDialogPdfUrlRef = useRef<string>('');
  const pendingSignActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!signDialogPdfUrl) return;
    setSignDialogIframeLoaded(false);
    const timer = window.setTimeout(() => setSignDialogIframeLoaded(true), 15000);
    return () => window.clearTimeout(timer);
  }, [signDialogPdfUrl]);

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

  const [activeCardTab, setActiveCardTab] = useState<'details' | 'timeline' | 'checklist'>('details');
  const [checklists, setChecklists] = useState<ReturnFormChecklistEntry[]>([]);
  const [activeChecklistKey, setActiveChecklistKey] = useState<string>('');
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [showChecklistPreview, setShowChecklistPreview] = useState(false);
  const [checklistPreviewUrl, setChecklistPreviewUrl] = useState<string>('');

  const hasChecklist = checklists.length > 0;

  function getChecklistTabKey(checklist: ReturnFormChecklistEntry): string {
    return checklist.assignment_id || checklist.id;
  }

  function getChecklistAssetLabel(
    checklist: ReturnFormChecklistEntry,
    allReturns: AssetReturnForm[]
  ): string {
    const checklistAsset = checklist.asset;
    const fallback = allReturns.find(r => r.assignment.asset.id === checklistAsset?.id) ?? allReturns[0];
    const name = checklistAsset?.name || fallback?.assignment.asset.name || 'Asset';
    const code = checklistAsset?.code || fallback?.assignment.asset.code || '—';
    return `${name} (${code})`;
  }

  const activeChecklist =
    checklists.find(c => getChecklistTabKey(c) === activeChecklistKey) ??
    checklists[0] ??
    null;

  // Fetch all offboarding checklists linked to this return form
  useEffect(() => {
    if (!batch.formID) return;
    const fetchChecklists = async () => {
      try {
        setChecklistLoading(true);
        const response = await api.get<{ checklists: ReturnFormChecklistEntry[] }>(
          `/asset-returns/forms/${batch.formID}/checklists`
        );
        const allChecklists = response?.checklists ?? [];
        const offboardingOnly = allChecklists.filter(c => c.type_offboarding === true);
        setChecklists(offboardingOnly);
        if (offboardingOnly.length > 0) {
          setActiveChecklistKey(getChecklistTabKey(offboardingOnly[0]!));
        } else {
          setActiveChecklistKey('');
        }
      } catch (error) {
        console.error('Failed to fetch return form checklists:', error);
        setChecklists([]);
        setActiveChecklistKey('');
      } finally {
        setChecklistLoading(false);
      }
    };
    fetchChecklists();
  }, [batch.formID]);

  const first = batch.returns[0];
  if (!first?.assignment?.asset) {
    return (
      <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
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
    <>
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <FileSignature className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                Return Form
              </p>
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

      <Tabs value={activeCardTab} onValueChange={(v) => setActiveCardTab(v as 'details' | 'timeline' | 'checklist')} className="flex-1 flex flex-col min-h-0">
        <TabsList className={`${segmentTabsListClassName} mx-4 mb-2 grid grid-cols-${hasChecklist ? '3' : '2'} w-[calc(100%-2rem)]`}>
          <TabsTrigger
            value="details"
            className={segmentTabsTriggerClassName}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className={segmentTabsTriggerClassName}
          >
            Timeline
          </TabsTrigger>
          {hasChecklist && (
            <TabsTrigger
              value="checklist"
              className={segmentTabsTriggerClassName}
            >
              Checklist
            </TabsTrigger>
          )}
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
                  <ul className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                    {batch.returns.map(r => (
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

            {/* Received by (IT Manager / IT Department Head) */}
            {batch.it_manager_signed_at && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Received by: {batch.it_manager_user_name ?? '—'}
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
              sub_approver_1_signed_at={batch.sub_approver_1_signed_at}
              sub_approver_1_user_name={batch.sub_approver_1_user_name}
              sub_approver_1_position={batch.sub_approver_1_position}
              process_signed_at={batch.process_signed_at}
              owner_absent={batch.owner_absent}
              processorName={batch.processed_by ?? ''}
            />
          </CardContent>
        </TabsContent>
        <TabsContent value="checklist" className="mt-0 flex-1">
          <CardContent className="pt-0">
            <ReturnChecklistCard
              checklists={checklists}
              checklistLoading={checklistLoading}
              activeChecklistKey={activeChecklistKey}
              setActiveChecklistKey={setActiveChecklistKey}
              activeChecklist={activeChecklist}
              batch={batch}
              getChecklistTabKey={getChecklistTabKey}
              getChecklistAssetLabel={getChecklistAssetLabel}
            />
          </CardContent>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 p-4 mt-auto border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (activeCardTab === 'checklist' && activeChecklist) {
              try {
                const blob = await generateAssetChecklistPDF({
                  ...activeChecklist,
                  asset_label: getChecklistAssetLabel(activeChecklist, batch.returns),
                });
                const url = URL.createObjectURL(blob);
                setChecklistPreviewUrl(url);
                setShowChecklistPreview(true);
              } catch {
                toast.error('Failed to generate checklist preview');
              }
            } else {
              onView();
            }
          }}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View</span>
          <span className="sm:hidden">View</span>
        </Button>
        {canSign && !viewOnly && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Form</span>
              <span className="sm:hidden">Sign</span>
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
                    <div className="relative w-full h-full">
                      {!signDialogIframeLoaded && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                            <p className="text-sm">Loading PDF preview...</p>
                          </div>
                        </div>
                      )}
                      <iframe
                        src={signDialogPdfUrl}
                        onLoad={() => setSignDialogIframeLoaded(true)}
                        className="h-full w-full"
                        title="Return form preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          maxWidth: 'none',
                        }}
                      />
                    </div>
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
                    onClick={() => {
                      if (!batch.formID) return;
                      const digitalSignature =
                        currentUser?.digitalSignature ?? null;
                      pendingSignActionRef.current = async () => {
                        await onSign?.(batch.formID!, {
                          digitalSignature,
                        });
                        setShowConfirmDialog(false);
                        setAgreeReturn(false);
                      };
                      setShowConfirmDialog(false);
                      setShowOtpDialog(true);
                    }}
                    disabled={!agreeReturn}
                    className="bg-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 text-white border border-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    Sign Form
                  </AlertDialogAction>
                </AppAlertDialogChromeFooter>
              </AppAlertDialogFrame>
            </AlertDialog>
            <SmsOtpDialog
              isOpen={showOtpDialog}
              onOpenChange={setShowOtpDialog}
              sendOtpEndpoint="/auth/initials/send-otp"
              verifyOtpEndpoint="/auth/initials/verify-otp"
              onVerified={() => {
                setShowOtpDialog(false);
                pendingSignActionRef.current = null;
              }}
              onCancel={() => {
                setShowOtpDialog(false);
                pendingSignActionRef.current = null;
              }}
              pendingActionRef={pendingSignActionRef}
              title="OTP Email Verification"
              description="OTP Email Verification has been sent to your registered email for return form signing."
              verifyButtonLabel="Verify & Sign Form"
            />
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (activeCardTab === 'checklist' && activeChecklist) {
              try {
                const blob = await generateAssetChecklistPDF({
                  ...activeChecklist,
                  asset_label: getChecklistAssetLabel(activeChecklist, batch.returns),
                });
                downloadPDF(blob, `Asset_Checklist_${activeChecklist.form_number || `CHK-${activeChecklist.assignment_id}`}.pdf`);
                toast.success('Checklist PDF downloaded successfully');
              } catch {
                toast.error('Failed to download checklist PDF');
              }
            } else {
              onDownload();
            }
          }}
          className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">DL</span>
        </Button>
      </div>
    </Card>
    <Dialog open={showChecklistPreview} onOpenChange={(open) => {
      setShowChecklistPreview(open);
      if (!open) {
        setChecklistPreviewUrl(url => {
          if (url) URL.revokeObjectURL(url);
          return '';
        });
      }
    }}>
      <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
        <AppDialogGradientHeader
          title={activeChecklist ? `${activeChecklist.employee_name} - ${activeChecklist.form_number || `CHK-${activeChecklist.assignment_id}`}` : 'Asset Checklist'}
          description="Asset Checklist Form Preview"
        />
        <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
          <div className="mx-4 my-4 h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mx-6">
            <PDFViewer pdfUrl={checklistPreviewUrl} className="h-full w-full" />
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter className="justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => {
            setShowChecklistPreview(false);
            if (checklistPreviewUrl) {
              URL.revokeObjectURL(checklistPreviewUrl);
              setChecklistPreviewUrl('');
            }
          }}>
            Close
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  </>);
};

// Borrow Request Card Component for Approvals Page
export const BorrowRequestCard: React.FC<{
  batch: any;
  onView: () => void;
}> = ({ batch, onView }) => {
  const formNumber =
    batch.form_number ?? `Borrow ${new Date(batch.created_at).toLocaleDateString()}`;
  const borrowerName =
    `${batch.requester_first_name || ''} ${batch.requester_last_name || ''}`.trim() ||
    batch.requester_email ||
    '—';
  const scope = batch.borrow_scope === 'it' ? 'IT Equipment' : 'Admin Equipment';

  const formatBorrowDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="hover:shadow-md transition-shadow flex flex-col bg-white border border-slate-200 rounded-lg p-4"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <HandHelping className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
              Borrow Form
            </p>
            <p className="text-lg font-semibold">
              {formNumber}
            </p>
            <p className="text-sm text-gray-500">
              Created {formatBorrowDateTime(batch.created_at)}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Approved
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
            <p className="font-medium text-sm">Requested by: {borrowerName}</p>
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
              {formatBorrowDateTime(batch.expected_return_at)}
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
          <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Processed by: {batch.approved_by_name || '—'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Approved by: {batch.dept_head_name || batch.received_by_name || batch.approved_by_name || '—'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <Button onClick={onView} variant="outline" className="w-full">
          View Details
        </Button>
      </div>
    </div>
  );
};

// Transfer Form Card (mirrors ReturnFormCard – for past owner: View, Sign, Download)
export const TransferFormCard: React.FC<{
  batch: AssetTransferFormBatch;
  onView: () => void;
  onDownload: () => void;
  onSign?: (
    formId: string,
    options?: { digitalSignature?: string | null }
  ) => Promise<void>;
  viewOnly?: boolean;
}> = ({ batch, onView, onDownload, onSign, viewOnly = false }) => {
  const { user: currentUser } = useCurrentUser();
  const canSign =
    !!currentUser?.id &&
    currentUser.id === batch.user_id &&
    !!batch.formID &&
    !batch.signed_at &&
    !batch.owner_absent;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [agreeTransfer, setAgreeTransfer] = useState(false);
  const [signDialogPdfUrl, setSignDialogPdfUrl] = useState<string>('');
  const [signDialogIframeLoaded, setSignDialogIframeLoaded] = useState(false);
  const signDialogPdfUrlRef = useRef<string>('');
  const pendingSignActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!signDialogPdfUrl) return;
    setSignDialogIframeLoaded(false);
    const timer = window.setTimeout(() => setSignDialogIframeLoaded(true), 15000);
    return () => window.clearTimeout(timer);
  }, [signDialogPdfUrl]);

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
      <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
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
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <ArrowRightLeft className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                Transfer Form
              </p>
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
        <TabsList className={segmentTabsListClassName + ' mx-4 mb-2 grid grid-cols-2 w-[calc(100%-2rem)]'}>
          <TabsTrigger
            value="details"
            className={segmentTabsTriggerClassName}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className={segmentTabsTriggerClassName}
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
                  <ul className="max-h-[120px] overflow-y-auto scrollbar-hide text-xs text-gray-600 mt-1 space-y-0.5 list-none">
                    {batch.returns.map(r => (
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
                    Transferred by: {transferrerName}
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

            {/* Received by (IT Manager) */}
            {batch.it_manager_signed_at && (
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Received by: {batch.it_manager_user_name ?? '—'}
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
              sub_approver_1_signed_at={batch.sub_approver_1_signed_at}
              sub_approver_1_user_name={batch.sub_approver_1_user_name}
              sub_approver_1_position={batch.sub_approver_1_position}
              process_signed_at={batch.process_signed_at}
              executed_at={batch.executed_at}
              owner_absent={batch.owner_absent}
              processorName={batch.processed_by ?? ''}
            />
          </CardContent>
        </TabsContent>
      </Tabs>
      <div className="flex flex-col sm:flex-row gap-2 p-4 mt-auto border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View</span>
          <span className="sm:hidden">View</span>
        </Button>
        {canSign && !viewOnly && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Form</span>
              <span className="sm:hidden">Sign</span>
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
                    <div className="relative w-full h-full">
                      {!signDialogIframeLoaded && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                          <div className="flex flex-col items-center gap-3 text-gray-500">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                            <p className="text-sm">Loading PDF preview...</p>
                          </div>
                        </div>
                      )}
                      <iframe
                        src={signDialogPdfUrl}
                        onLoad={() => setSignDialogIframeLoaded(true)}
                        className="h-full w-full"
                        title="Transfer form preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          maxWidth: 'none',
                        }}
                      />
                    </div>
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
                    onClick={() => {
                      if (!batch.formID) return;
                      const digitalSignature =
                        currentUser?.digitalSignature ?? null;
                      pendingSignActionRef.current = async () => {
                        await onSign?.(batch.formID!, {
                          digitalSignature,
                        });
                        setShowConfirmDialog(false);
                        setAgreeTransfer(false);
                      };
                      setShowConfirmDialog(false);
                      setShowOtpDialog(true);
                    }}
                    className="bg-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 text-white border border-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    Sign Form
                  </AlertDialogAction>
                </AppAlertDialogChromeFooter>
              </AppAlertDialogFrame>
            </AlertDialog>
            <SmsOtpDialog
              isOpen={showOtpDialog}
              onOpenChange={setShowOtpDialog}
              sendOtpEndpoint="/auth/initials/send-otp"
              verifyOtpEndpoint="/auth/initials/verify-otp"
              onVerified={() => {
                setShowOtpDialog(false);
                pendingSignActionRef.current = null;
              }}
              onCancel={() => {
                setShowOtpDialog(false);
                pendingSignActionRef.current = null;
              }}
              pendingActionRef={pendingSignActionRef}
              title="OTP Email Verification"
              description="OTP Email Verification has been sent to your registered email for transfer form signing."
              verifyButtonLabel="Verify & Sign Form"
            />
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">DL</span>
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
  dept_head_name?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_position?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_signed_by?: string | null;
  sub_approver_1_digital_signature?: string | null;
  sub_approver_1_name?: string | null;
  sub_approver_1_position?: string | null;
  approved_at?: string | null;
  pre_usage_condition?: string | null;
  asset_name?: string | null;
  asset_serial?: string | null;
  approved_by_name?: string | null;
  approved_by_position?: string | null;
  /** From API — used for badges / timeline (e.g. processor decline). */
  status?: string | null;
  declined_at?: string | null;
  processor_declined_at?: string | null;
  processor_decline_reason?: string | null;
  returned_at?: string | null;
  return_condition?: string | null;
  return_remarks?: string | null;
  requested_by_signature?: string | null;
  /** Processor's digital signature when approving the borrow request */
  processor_signature?: string | null;
  /** Timestamp when the processor signed the borrow request */
  processor_signed_at?: string | null;
  /** Manager Approver 2 who received the borrow request */
  received_by?: string | null;
  received_by_name?: string | null;
  received_by_position?: string | null;
  /** Manager Approver 2's digital signature when receiving */
  received_by_signature?: string | null;
  received_at?: string | null;
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
    itReceivedBySignature: batch.processor_signature ?? null,
    itReceivedBySignedAt: batch.processor_signed_at ?? null,
    // For the "IT Approved by:" or "Admin Approved by:" section, use the Manager Approver 2 who received
    itApprovedBy: batch.received_by_name?.trim() || batch.received_by?.trim() || '—',
    itApprovedBySignature: batch.received_by_signature ?? null,
    itApprovedBySignedAt: batch.received_at ?? null,
    postUsageCondition: post,
    borrowerCompanyName: batch.requester_company_name ?? null,
    borrowerCompanyLogoUrl: batch.requester_company_logo_url ?? null,
    requestedBySignature: batch.requested_by_signature ?? null,
    requestedAt: batch.created_at ?? null,
    deptHeadSignedAt: batch.sub_approver_1_signed_at ?? batch.dept_head_signed_at ?? null,
    deptHeadSignedBy: batch.sub_approver_1_name ?? batch.dept_head_name ?? null,
    deptHeadSignature:
      batch.sub_approver_1_digital_signature ?? batch.dept_head_digital_signature ?? null,
    deptHeadPosition: batch.dept_head_position ?? batch.sub_approver_1_position ?? null,
    subApprover1SignedAt: batch.sub_approver_1_signed_at ?? null,
    subApprover1SignedBy: batch.sub_approver_1_name ?? null,
    subApprover1Position: batch.sub_approver_1_position ?? null,
    subApprover1Signature: batch.sub_approver_1_digital_signature ?? null,
    itReceivedByPosition: batch.approved_by_position ?? null,
    itApprovedByPosition: batch.received_by_position ?? null,
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
  const received = Boolean(
    batch.received_at ||
    batch.received_by ||
    batch.received_by_signature ||
    (batch.received_by_name && batch.received_by_name.trim())
  );

  let badgeClass = 'bg-amber-100 text-amber-800';
  let badgeLabel = 'Pending approval';
  if (declined) {
    badgeClass = 'bg-red-100 text-red-800';
    badgeLabel = 'Declined';
  } else if (returned) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Returned';
  } else if (received) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Approved';
  } else if (completed) {
    badgeClass = 'bg-green-100 text-green-800';
    badgeLabel = 'Approved';
  } else if (pendingStaff) {
    badgeClass = 'bg-blue-100 text-blue-800';
    badgeLabel = 'Pending IT/Admin';
  } else if (pendingDept) {
    badgeClass = 'bg-amber-100 text-amber-800';
    badgeLabel = 'Pending approval';
  }

  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
              <HandHelping className="h-5 w-5 text-white" />
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
        <TabsList className={segmentTabsListClassName + ' mx-4 mb-2 grid grid-cols-2 w-[calc(100%-2rem)]'}>
          <TabsTrigger
            value="details"
            className={segmentTabsTriggerClassName}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className={segmentTabsTriggerClassName}
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

            {batch.approved_by_name && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Processed by: {batch.approved_by_name}</p>
                </div>
              </div>
            )}

            {(batch.dept_head_name || batch.received_by_name || batch.approved_by_name) && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Approved by: {batch.dept_head_name || batch.received_by_name || batch.approved_by_name || '—'}</p>
                </div>
              </div>
            )}

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

      <div className="flex flex-col sm:flex-row gap-2 p-4 mt-auto border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">View</span>
          <span className="sm:hidden">View</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">DL</span>
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
  const [iframeLoaded, setIframeLoaded] = useState(false);
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
    borrowFormBatch.received_at,
    borrowFormBatch.received_by,
    borrowFormBatch.received_by_signature,
  ]);

  useEffect(() => {
    if (!pdfUrl) return;
    setIframeLoaded(false);
    const timer = window.setTimeout(() => setIframeLoaded(true), 15000);
    return () => window.clearTimeout(timer);
  }, [pdfUrl]);

  const pdfBody = (
    <div className="flex-1 min-h-0 flex flex-col py-2 overflow-hidden">
      <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50 relative">
        {pdfError && !pdfLoading && !pdfUrl ? (
          <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
            {pdfError}
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full">
            {(pdfLoading || !iframeLoaded) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                  <p className="text-sm">Loading PDF preview...</p>
                </div>
              </div>
            )}
            <iframe
              src={pdfUrl}
              onLoad={() => setIframeLoaded(true)}
              className="absolute inset-0 w-full h-full"
              title="Equipment Borrowing Form PDF Preview"
              style={{
                border: 'none',
                display: 'block',
              }}
            />
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
  form_department?: { id: string; name: string } | null;
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
  processor_pending_signature?: string | null;
  processor_pending_signed_at?: string | null;
  transfer_type?: string | null;
  received_by?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_user_name?: string | null;
  dept_head_position?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_digital_signature?: string | null;
  sub_approver_1_user_name?: string | null;
  sub_approver_1_position?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_user_name?: string | null;
  it_manager_position?: string | null;
  sub_approver_2_signed_at?: string | null;
  sub_approver_2_digital_signature?: string | null;
  sub_approver_2_signed_by?: string | null;
  sub_approver_2_user_name?: string | null;
  sub_approver_2_position?: string | null;
  /** True when the asset owner is marked absent (processor-initiated hold transfer) */
  owner_absent?: boolean;
  /** Intangible assets linked to this transfer form (persisted at creation) */
  intangibleAssets?: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    notes: string | null;
  }>;
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
  processor_pending_signature?: string | null;
  processor_pending_signed_at?: string | null;
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
  dept_head_position?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_digital_signature?: string | null;
  sub_approver_1_signed_by?: string | null;
  sub_approver_1_user_name?: string | null;
  sub_approver_1_position?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_signed_by?: string | null;
  it_manager_user_name?: string | null;
  it_manager_position?: string | null;
  sub_approver_2_signed_at?: string | null;
  sub_approver_2_digital_signature?: string | null;
  sub_approver_2_signed_by?: string | null;
  sub_approver_2_user_name?: string | null;
  sub_approver_2_position?: string | null;
  /** Form's owning department (IT/Admin) for PDF header and scope; from category department */
  form_department?: { id: string; name: string } | null;
  /** True when the asset owner is marked absent (processor-initiated hold return) */
  owner_absent?: boolean;
  returns: AssetReturnForm[];
}

type ChecklistRow = {
  id: string;
  form_number?: string | null;
  assignment_id: string;
  employee_id: string;
  employee_name: string;
  employee_designation?: string | null;
  employee_department?: string | null;
  employee_company?: string | null;
  employee_company_logo_url?: string | null;
  type_onboarding: boolean;
  type_offboarding: boolean;
  received_by?: string | null;
  checklist_data: any;
  remarks?: string | null;
  created_at: string;
  creator_name?: string | null;
  creator_digital_signature?: string | null;
  employee_signed_at?: string | null;
  employee_digital_signature?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_name?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_signed_by?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_name?: string | null;
  asset?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
};

type ReturnFormChecklistEntry = AssetChecklistData & {
  asset?: { id: string; code: string | null; name: string | null } | null;
};

function ReturnChecklistCard({
  checklists,
  checklistLoading,
  activeChecklistKey,
  setActiveChecklistKey,
  activeChecklist,
  batch,
  getChecklistTabKey,
  getChecklistAssetLabel,
}: {
  checklists: ReturnFormChecklistEntry[];
  checklistLoading: boolean;
  activeChecklistKey: string;
  setActiveChecklistKey: (key: string) => void;
  activeChecklist: ReturnFormChecklistEntry | null;
  batch: AssetReturnFormBatch;
  getChecklistTabKey: (checklist: ReturnFormChecklistEntry) => string;
  getChecklistAssetLabel: (checklist: ReturnFormChecklistEntry, allReturns: AssetReturnForm[]) => string;
}) {
  if (checklistLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <Shimmer key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <Shimmer className="h-5 w-48 rounded" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="flex items-center gap-3">
                <Shimmer className="h-4 w-4 rounded" />
                <Shimmer className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeChecklist) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        No offboarding checklist data available
      </div>
    );
  }

  const checklist = activeChecklist;
  return (
    <div className="space-y-3">
      {checklists.length > 1 && (
        <Tabs
          value={activeChecklistKey}
          onValueChange={setActiveChecklistKey}
          className="w-full"
        >
          <TabsList
            className={
              segmentTabsListClassName +
              ' flex h-auto w-full flex-wrap justify-start gap-1'
            }
          >
            {checklists.map(entry => (
              <TabsTrigger
                key={getChecklistTabKey(entry)}
                value={getChecklistTabKey(entry)}
                className={segmentTabsTriggerClassName + ' text-xs'}
              >
                {getChecklistAssetLabel(entry, batch.returns)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="space-y-3 rounded-xl border border-red-200 bg-gradient-to-br from-red-50/80 via-white to-slate-50 p-4 shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-red-100 pb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">
              Offboarding Checklist
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {checklist.form_number || `CHK-${checklist.assignment_id}`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {checklist.type_onboarding && (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Onboarding</Badge>
            )}
            {checklist.type_offboarding && (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Offboarding</Badge>
            )}
            {checklist.employee_signed_at && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Employee Signed</Badge>
            )}
            {checklist.dept_head_signed_at && (
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Dept Head Approved</Badge>
            )}
            {checklist.it_manager_signed_at && (
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">IT Manager Received</Badge>
            )}
          </div>
        </div>

        {/* Employee info */}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Created</p>
            <p className="mt-1 font-medium text-slate-900">{new Date(checklist.created_at).toLocaleDateString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Employee</p>
            <p className="mt-1 font-medium text-slate-900">{checklist.employee_name}</p>
            {checklist.employee_designation && (
              <p className="text-xs text-slate-500">{checklist.employee_designation}</p>
            )}
            {checklist.employee_department && (
              <p className="text-xs text-slate-500">{checklist.employee_department}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Received By</p>
          <p className="mt-1 font-medium text-slate-900">{checklist.received_by || 'N/A'}</p>
        </div>

        {/* Remarks */}
        {checklist.remarks && (
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Remarks</p>
            <p className="mt-1 text-slate-700">{checklist.remarks}</p>
          </div>
        )}

        {/* Signatory status */}
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Employee</p>
            <p className={`mt-1 font-medium ${checklist.employee_signed_at ? 'text-green-700' : 'text-slate-400'}`}>
              {checklist.employee_signed_at ? 'Signed' : 'Pending'}
            </p>
            {checklist.employee_signed_at && (
              <p className="text-xs text-slate-500">
                {new Date(checklist.employee_signed_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Department Head</p>
            <p className={`mt-1 font-medium ${checklist.dept_head_signed_at ? 'text-green-700' : 'text-slate-400'}`}>
              {checklist.dept_head_signed_at ? 'Approved' : 'Pending'}
            </p>
            {checklist.dept_head_signed_at && (
              <p className="text-xs text-slate-500">
                {new Date(checklist.dept_head_signed_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">IT Manager</p>
            <p className={`mt-1 font-medium ${checklist.it_manager_signed_at ? 'text-green-700' : 'text-slate-400'}`}>
              {checklist.it_manager_signed_at ? 'Received' : 'Pending'}
            </p>
            {checklist.it_manager_signed_at && (
              <p className="text-xs text-slate-500">
                {new Date(checklist.it_manager_signed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsTab({
  setActiveTab,
  initialSubTab,
}: {
  setActiveTab: (tab: string) => void;
  initialSubTab?: string;
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
  const [checklistSearchQuery, setChecklistSearchQuery] = useState('');
  const [assetChecklistForms, setAssetChecklistForms] = useState<ChecklistRow[]>([]);
  const [filteredChecklistForms, setFilteredChecklistForms] = useState<ChecklistRow[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistRow | null>(null);
  const [showChecklistPreview, setShowChecklistPreview] = useState(false);
  const [checklistPdfUrl, setChecklistPdfUrl] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<AccountabilityForm | null>(
    null
  );
  const [formPdfUrl, setFormPdfUrl] = useState<string | null>(null);
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
  const [activeSubTab, setActiveSubTab] = useState<string>(
    initialSubTab || 'accountability'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'disabled'
  >('active');
  const [clearanceEligibility, setClearanceEligibility] = useState<{ canGenerate: boolean; reason: string | null; disabledFormNumbers: string[] } | null>(null);
  const [showGenerateClearance, setShowGenerateClearance] = useState(false);
  const [generatingClearance, setGeneratingClearance] = useState(false);

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubTab]);

  const [isTabLoading, setIsTabLoading] = useState(true);
  const isLoading = userLoading;

  useEffect(() => {
    const timer = setTimeout(() => setIsTabLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

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

  const fetchClearanceEligibility = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await api.get(`/accountability-forms/clearance/eligibility?userId=${currentUser.id}`);
      setClearanceEligibility({ canGenerate: !!res.canGenerate, reason: res.reason ?? null, disabledFormNumbers: res.disabledFormNumbers ?? res.disabledFormNumbersByScope?.Unified ?? [] });
    } catch {
      setClearanceEligibility(null);
    }
  };

  useEffect(() => {
    if (currentUser?.id) fetchClearanceEligibility();
  }, [currentUser?.id, accountabilityForms.length]);

  const handleGenerateClearance = async () => {
    if (!currentUser?.id) return;
    setGeneratingClearance(true);
    try {
      await api.post('/accountability-forms/clearance', { userId: currentUser.id });
      toast.success('Request has been sent to IT department');
      setShowGenerateClearance(false);
      await fetchAccountabilityForms();
      await fetchClearanceEligibility();
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.message ?? 'Failed to generate clearance');
    } finally {
      setGeneratingClearance(false);
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

  useEffect(() => {
    if (!checklistSearchQuery.trim()) {
      setFilteredChecklistForms(assetChecklistForms);
    } else {
      const q = checklistSearchQuery.trim().toLowerCase();
      const filtered = assetChecklistForms.filter(row =>
        [
          row.form_number,
          row.employee_name,
          row.employee_department,
          row.employee_company,
          row.asset?.name,
          row.asset?.code,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q))
      );
      setFilteredChecklistForms(filtered);
    }
  }, [checklistSearchQuery, assetChecklistForms]);

  const fetchAssetChecklistForms = async () => {
    if (!currentUser?.id) {
      setAssetChecklistForms([]);
      setFilteredChecklistForms([]);
      return;
    }
    try {
      const response = await api.get(`/asset-assignments/checklists?employee_id=${currentUser.id}`);
      const forms: ChecklistRow[] = Array.isArray(response.checklists) ? response.checklists : [];
      setAssetChecklistForms(forms);
      setFilteredChecklistForms(forms);
    } catch (error) {
      console.error('Failed to fetch checklist forms:', error);
      setAssetChecklistForms([]);
      setFilteredChecklistForms([]);
    }
  };

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
        fetchAssetChecklistForms(),
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

  const handleSignTransferForm = async (
    formId: string,
    options?: { digitalSignature?: string | null }
  ) => {
    try {
      await api.post(`/asset-transfers/forms/${formId}/sign`, {
        digitalSignature: options?.digitalSignature ?? undefined,
      });
      await fetchAssetTransferForms();
      toast.success('Transfer form signed successfully');
    } catch (error) {
      console.error('Failed to sign transfer form:', error);
      toast.error('Failed to sign transfer form');
      throw error;
    }
  };

  const handleSignReturnForm = async (
    formId: string,
    options?: { digitalSignature?: string | null }
  ) => {
    try {
      await api.post(`/asset-returns/forms/${formId}/sign`, {
        digitalSignature: options?.digitalSignature ?? undefined,
      });
      await fetchAssetReturnForms();
      toast.success('Return form signed successfully');
    } catch (error) {
      console.error('Failed to sign return form:', error);
      toast.error('Failed to sign return form');
      throw error;
    }
  };

  const handleViewForm = async (form: AccountabilityForm) => {
    setSelectedForm(form);
    try {
      const fullFormResponse = await api.get(`/accountability-forms/${form.id}`);
      const fullForm = fullFormResponse.form;
      if (fullForm?.formOrigin === 'clearance') {
        const pdfBlob = await generateAccountabilityClearancePDF(
          fullForm,
          currentUser
        );
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setFormPdfUrl(pdfUrl);
        setShowFormDetail(true);
        return;
      }
      const pdfBlob = await generateAccountabilityFormPDF(fullForm);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setFormPdfUrl(pdfUrl);
      setShowFormDetail(true);
    } catch (error) {
      toast.error('Failed to generate PDF for this accountability form');
    }
  };

  const handleDownloadClearanceForm = async (form: AccountabilityForm) => {
    try {
      const fullFormResponse = await api.get(`/accountability-forms/${form.id}`);
      const fullForm = fullFormResponse.form;
      // Printable only when fully approved
      const isApproved = (fullForm as any)?.approvalStatus === 'approved' || (fullForm as any)?.approval_status === 'approved';
      if (!isApproved) {
        toast.error('You can print this clearance only after it has been approved by all participating departments');
        return;
      }
      const pdfBlob = await generateAccountabilityClearancePDF(
        fullForm,
        currentUser
      );
      const safeNumber = (form.formNumber || 'clearance').replace(
        /[^a-zA-Z0-9-_]/g,
        '_'
      );
      downloadPDF(
        pdfBlob,
        `Asset_Clearance_${form.clearanceScope ?? 'Unified'}_${safeNumber}.pdf`
      );
      toast.success('Clearance certificate downloaded');
    } catch (error) {
      console.error('Failed to download clearance certificate:', error);
      toast.error('Failed to download clearance certificate');
    }
  };

  const handleCloseFormDetail = () => {
    setShowFormDetail(false);
    setSelectedForm(null);
    setFormPdfUrl(null);
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

  const handleDownloadChecklist = async (row: ChecklistRow) => {
    try {
      const assetLabel = row.asset
        ? `${row.asset.name || 'Asset'} (${row.asset.code || '—'})`
        : 'Asset';
      const blob = await generateAssetChecklistPDF({ ...row, asset_label: assetLabel });
      const formNumber = row.form_number || `CHK-${row.assignment_id}`;
      downloadPDF(blob, `Asset_Checklist_${formNumber}.pdf`);
      toast.success('Checklist PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download checklist PDF:', error);
      toast.error('Failed to download checklist PDF');
    }
  };

  const handleViewChecklist = async (row: ChecklistRow) => {
    setSelectedChecklist(row);
    setShowChecklistPreview(true);
  };

  useEffect(() => {
    if (!showChecklistPreview || !selectedChecklist) return;
    let cancelled = false;
    const generate = async () => {
      try {
        const assetLabel = selectedChecklist.asset
          ? `${selectedChecklist.asset.name || 'Asset'} (${selectedChecklist.asset.code || '—'})`
          : 'Asset';
        const blob = await generateAssetChecklistPDF({
          ...selectedChecklist,
          asset_label: assetLabel,
        });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setChecklistPdfUrl(url);
      } catch (error) {
        console.error('Failed to generate checklist preview:', error);
        toast.error('Failed to generate checklist PDF');
      }
    };
    generate();
    return () => {
      cancelled = true;
      setChecklistPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [showChecklistPreview, selectedChecklist]);

  if (isTabLoading || isLoading || !currentUser) {
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
          {/* Tab Triggers Shimmer */}
          <div className={cn(segmentTabsListClassName, 'grid grid-cols-2 sm:grid-cols-5 mb-6')}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100/90 px-3">
                <Shimmer className="w-4 h-4 rounded" />
                <Shimmer className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>

          {/* Content Shimmer — single tab */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Shimmer className="w-6 h-6 rounded" />
              <Shimmer className="h-6 w-48 rounded" />
              <Shimmer className="h-6 w-8 rounded-full" />
            </div>

            <div className="relative mb-6">
              <Shimmer className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded" />
              <Shimmer className="h-10 w-full max-w-md rounded-lg" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Shimmer className="w-10 h-10 rounded-lg" />
                      <div>
                        <Shimmer className="h-5 w-32 rounded" />
                        <Shimmer className="h-4 w-24 rounded mt-1" />
                      </div>
                    </div>
                    <Shimmer className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-3">
                    <Shimmer className="h-4 w-48 rounded" />
                    <Shimmer className="h-4 w-36 rounded" />
                    <Shimmer className="h-4 w-40 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Shimmer className="h-10 flex-1 rounded-lg" />
                    <Shimmer className="h-10 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
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
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            <TabsList className={cn(segmentTabsListClassName, 'grid grid-cols-2 sm:grid-cols-5 mb-6')}>
              <TabsTrigger value="accountability" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
                <FileCheck className="mr-1.5 h-4 w-4" /> Accountability
              </TabsTrigger>
              <TabsTrigger value="returns" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
                <FileDown className="mr-1.5 h-4 w-4" /> Returns
              </TabsTrigger>
              <TabsTrigger value="transfers" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
                <ArrowRightLeft className="mr-1.5 h-4 w-4" /> Transfers
              </TabsTrigger>
              <TabsTrigger value="borrows" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
                <HandHelping className="mr-1.5 h-4 w-4" /> Borrows
              </TabsTrigger>
              <TabsTrigger value="checklists" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
                <ClipboardList className="mr-1.5 h-4 w-4" /> Checklists
              </TabsTrigger>
            </TabsList>

            {/* TabsContent: Accountability */}
            <TabsContent value="accountability" className="mt-0">
              <div className="flex items-center gap-3 mb-2">
                <FileCheck className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Asset Accountability Forms
                </h3>
                <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                  {filteredForms.length}
                </span>
                {clearanceEligibility?.canGenerate && (
                  <Button size="sm" onClick={() => setShowGenerateClearance(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                    Generate Accountability Clearance Form
                  </Button>
                )}
              </div>
              {clearanceEligibility && !clearanceEligibility.canGenerate && clearanceEligibility.reason && (
                <p className="text-xs text-slate-500 mb-4">Clearance not available: {clearanceEligibility.reason}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
                    <FileCheck className="w-10 h-10 text-slate-400" />
                  </div>
                  {searchQuery ? (
                    <>
                      <p className="text-slate-600 text-lg font-medium">No forms found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        No forms match &quot;{searchQuery}&quot;. Try different
                        keywords (form number, employee, asset, etc.).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-600 text-lg font-medium">
                        No accountability forms yet
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        Forms will appear here when assets are assigned to you
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredForms.map(form =>
                    form.formOrigin === 'clearance' ? (
                      <ClearanceFormCard
                        key={form.id}
                        form={form}
                        onView={handleViewForm}
                        onDownload={handleDownloadClearanceForm}
                      />
                    ) : (
                      <AccountabilityFormCard
                        key={form.id}
                        form={form}
                        onSign={handleSignForm}
                        onView={handleViewForm}
                        showDeclineButton
                        onDecline={handleDeclineAccountabilityForm}
                        showDownloadButton={false}
                      />
                    )
                  )}
                </div>
              )}
            </TabsContent>

            {/* TabsContent: Returns */}
            <TabsContent value="returns" className="mt-0">
              <div className="flex items-center gap-3 mb-6">
                <FileDown className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Asset Return Forms
                </h3>
                <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                  {filteredReturnForms.length}
                </span>
              </div>

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
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
                    <FileDown className="w-10 h-10 text-slate-400" />
                  </div>
                  {returnSearchQuery ? (
                    <>
                      <p className="text-slate-600 text-lg font-medium">
                        No return forms found
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        No return forms match "{returnSearchQuery}". Try a
                        different search term.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-600 text-lg font-medium">
                        No asset return forms yet
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
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
            </TabsContent>

            {/* TabsContent: Transfers */}
            <TabsContent value="transfers" className="mt-0">
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
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
                    <ArrowRightLeft className="w-10 h-10 text-slate-400" />
                  </div>
                  {transferSearchQuery ? (
                    <>
                      <p className="text-slate-600 text-lg font-medium">
                        No transfer forms found
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        No transfer forms match &quot;{transferSearchQuery}&quot;
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-600 text-lg font-medium">
                        No asset transfer forms yet
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
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
            </TabsContent>

            {/* TabsContent: Borrows */}
            <TabsContent value="borrows" className="mt-0">
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
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
                    <HandHelping className="w-10 h-10 text-slate-400" />
                  </div>
                  {borrowSearchQuery ? (
                    <>
                      <p className="text-slate-600 text-lg font-medium">No borrow forms found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        No forms match &quot;{borrowSearchQuery}&quot;.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-600 text-lg font-medium">No borrow forms yet</p>
                      <p className="text-slate-400 text-sm mt-1">
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
            </TabsContent>

            {/* TabsContent: Checklists (NEW) */}
            <TabsContent value="checklists" className="mt-0">
              <div className="flex items-center gap-3 mb-6">
                <ClipboardList className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Asset Checklist Forms
                </h3>
                <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                  {filteredChecklistForms.length}
                </span>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search form number, employee, asset..."
                  value={checklistSearchQuery}
                  onChange={e => setChecklistSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full max-w-md"
                />
              </div>

              {filteredChecklistForms.length === 0 ? (
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4">
                    <ClipboardList className="w-10 h-10 text-slate-400" />
                  </div>
                  {checklistSearchQuery ? (
                    <>
                      <p className="text-slate-600 text-lg font-medium">No checklist forms found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        No forms match &quot;{checklistSearchQuery}&quot;.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-600 text-lg font-medium">No checklist forms yet</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Checklist forms will appear here when assigned.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredChecklistForms.map(row => (
                    <Card key={row.id} className="shadow-md hover:shadow-xl transition-all duration-200 border-slate-200 bg-white flex flex-col overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 shadow-sm rounded-xl">
                              <ClipboardList className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {row.form_number || `CHK-${row.assignment_id}`}
                              </CardTitle>
                              <p className="text-sm text-gray-500">
                                Created {new Date(row.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            {row.type_onboarding && row.type_offboarding
                              ? 'Onboarding/Offboarding'
                              : row.type_onboarding
                                ? 'Onboarding'
                                : row.type_offboarding
                                  ? 'Offboarding'
                                  : 'Checklist'}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{row.employee_name}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600">
                              {row.asset
                                ? `${row.asset.name || 'Asset'} (${row.asset.code || '—'})`
                                : 'Asset'}
                            </p>
                          </div>
                        </div>

                        {row.employee_department && (
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-600">
                                Department: {row.employee_department}
                              </p>
                            </div>
                          </div>
                        )}

                        {row.received_by && (
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-600">
                                Received by: {row.received_by}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600">
                              {new Date(row.created_at).toLocaleDateString()}{' '}
                              {new Date(row.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>

                      <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:flex-1 bg-red-600 text-white border-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 shadow-sm"
                          onClick={() => handleViewChecklist(row)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:flex-1 bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white shadow-sm"
                          onClick={() => handleDownloadChecklist(row)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">DL</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Detail Dialog */}
      <Dialog open={showFormDetail} onOpenChange={(open) => {
        if (!open) {
          handleCloseFormDetail();
        }
      }}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          {selectedForm && (
            <>
              <AppDialogGradientHeader
                title={`${selectedForm.user.first_name} ${selectedForm.user.last_name} - ${selectedForm.formNumber}`}
                description="Asset Accountability Form Preview"
              />
              <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
                <PDFViewer pdfUrl={formPdfUrl} className="h-full w-full" />
              </AppDialogBody>
              <AppDialogChromeFooter className="justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseFormDetail}
                >
                  Close
                </Button>
              </AppDialogChromeFooter>
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

      <GenerateClearanceModal
        open={showGenerateClearance}
        onOpenChange={setShowGenerateClearance}
        disabledFormNumbers={clearanceEligibility?.disabledFormNumbers ?? []}
        onConfirm={handleGenerateClearance}
      />

      {/* Checklist Preview Dialog */}
      <Dialog open={showChecklistPreview} onOpenChange={(open) => {
        if (!open) {
          setShowChecklistPreview(false);
          if (checklistPdfUrl) {
            URL.revokeObjectURL(checklistPdfUrl);
            setChecklistPdfUrl(null);
          }
        }
      }}>
        <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
          {selectedChecklist && (
            <>
              <AppDialogGradientHeader
                title={`${selectedChecklist.employee_name} - ${selectedChecklist.form_number || `CHK-${selectedChecklist.assignment_id}`}`}
                description="Asset Checklist Form Preview"
              />
              <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
                <PDFViewer pdfUrl={checklistPdfUrl} className="h-full w-full" />
              </AppDialogBody>
              <AppDialogChromeFooter className="justify-end gap-3">
                {selectedChecklist && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadChecklist(selectedChecklist)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowChecklistPreview(false);
                    if (checklistPdfUrl) {
                      URL.revokeObjectURL(checklistPdfUrl);
                      setChecklistPdfUrl(null);
                    }
                  }}
                >
                  Close
                </Button>
              </AppDialogChromeFooter>
            </>
          )}
        </AppDialogFrame>
      </Dialog>
    </>
  );
}

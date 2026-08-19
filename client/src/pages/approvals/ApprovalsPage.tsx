'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import {
  CheckSquare,
  Search,
  Download,
  CheckCircle2,
  PackageCheck,
  ClipboardCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  ReturnFormCard,
  ReturnFormDetail,
  TransferFormCard,
  TransferFormDetail,
  BorrowRequestCard,
  BorrowFormDetail,
  buildReturnDataForPDFFromBatch,
  buildTransferDataForPDFFromBatch,
  buildBorrowDataForPDFFromBatch,
  clearReturnPdfCacheForFormNumber,
  type AssetReturnFormBatch,
  type AssetTransferFormBatch,
  type AssetBorrowFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import {
  generateAssetReturnPDF,
  generateAssetTransferPDF,
  generateAssetChecklistPDF,
  generateAssetBorrowingPDF,
  downloadPDF,
} from '@/lib/pdfGenerator';
import {
  ChecklistApprovalCard,
  type ChecklistApprovalBatch,
} from '@/pages/approvals/ChecklistApprovalCard';
import { PDFViewer } from '@/components/PDFViewer';
import type { BorrowRequestRow } from '@/pages/assets/borrowRequestsPage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Shimmer } from '@/components/ui/shimmer';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const APPROVAL_TABS = ['for-approval', 'receive', 'approved'] as const;

type BorrowRequestBatch = BorrowRequestRow & {
  formType: 'borrow';
  received_at?: string | null;
  received_by?: string | null;
};

type FormApprovalBatch = (AssetReturnFormBatch | AssetTransferFormBatch) & {
  formType?: 'return' | 'transfer';
};

type ApprovalBatch = FormApprovalBatch | ChecklistApprovalBatch | BorrowRequestBatch;

function mapChecklistApiBatches(
  rows: ChecklistApprovalBatch[],
  withDeptHeadSigned: boolean
): ChecklistApprovalBatch[] {
  return rows.map(b => ({
    ...b,
    formType: 'checklist' as const,
    dept_head_signed_at: withDeptHeadSigned
      ? (b.checklists[0]?.dept_head_signed_at ??
        b.sub_approver_1_signed_at ??
        new Date().toISOString())
      : null,
    sub_approver_1_signed_at: withDeptHeadSigned
      ? (b.checklists[0]?.sub_approver_1_signed_at ?? null)
      : null,
  }));
}

export default function ApprovalsPage() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission, roleCustodian, loading: permissionsLoading } =
    useUserPermissions();

  const [batches, setBatches] = useState<ApprovalBatch[]>([]);
  const [approvedBatches, setApprovedBatches] = useState<ApprovalBatch[]>([]);
  const [receiveBatches, setReceiveBatches] = useState<ApprovalBatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [receiveLoading, setReceiveLoading] = useState(true);

  const displayLoading = loading;
  const displayApprovedLoading = approvedLoading;
  const displayReceiveLoading = receiveLoading;

  // ---------- Tabs ----------
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab && (APPROVAL_TABS as readonly string[]).includes(tab)
      ? tab
      : 'for-approval';
  });

  // ---------- Search (per-tab) ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [receiveSearchQuery, setReceiveSearchQuery] = useState('');
  const [approvedSearchQuery, setApprovedSearchQuery] = useState('');

  // ---------- Detail dialog ----------
  const [selectedBatch, setSelectedBatch] = useState<ApprovalBatch | null>(
    null
  );
  const [showDetail, setShowDetail] = useState(false);
  const [detailSourceTab, setDetailSourceTab] =
    useState<(typeof APPROVAL_TABS)[number]>('for-approval');
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [receiving, setReceiving] = useState(false);

  // ---------- SMS OTP Dialog ----------
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'approve' | 'decline' | 'receive'>(
    'approve'
  );
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  // ---------- Decline Reason Dialog ----------
  const [showDeclineReasonDialog, setShowDeclineReasonDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [checklistPreviewUrl, setChecklistPreviewUrl] = useState('');
  const [checklistPreviewIndex, setChecklistPreviewIndex] = useState(0);

  // ---------- Permissions ----------
  const canApprove =
    (hasPermission('Approvals', 'create') &&
      hasPermission('Approvals', 'edit')) ||
    roleCustodian?.managerApprover1 === true ||
    roleCustodian?.managerApprover3 === true;

  const canReceive =
    roleCustodian?.managerApprover2 === true ||
    roleCustodian?.subApprover2 === true;

  // ---------- Tab deep-linking (?tab= query param) ----------
  // Sync activeTab with ?tab= query, honoring receive-tab permission.
  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (!permissionsLoading && !canReceive && activeTab === 'receive') {
      setActiveTab('for-approval');
      return;
    }
    if (
      tabParam &&
      tabParam !== activeTab &&
      (APPROVAL_TABS as readonly string[]).includes(tabParam) &&
      (tabParam !== 'receive' || canReceive)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab, canReceive, permissionsLoading]);

  // ---------- Fetch ----------
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const [returnRes, transferRes, checklistRes, borrowRes] = await Promise.all([
        api.get<{ assetReturnForms?: AssetReturnFormBatch[] }>(
          '/asset-returns/forms/pending-approvals'
        ),
        api.get<{ assetTransferForms?: AssetTransferFormBatch[] }>(
          '/asset-transfers/forms/pending-approvals'
        ),
        api.get<{ checklistBatches?: ChecklistApprovalBatch[] }>(
          '/asset-checklists/pending-approvals'
        ),
        api.get<{ success: boolean; data: { borrowRequests?: any[] } }>(
          '/asset-borrow-requests/pending-dept-approvals'
        ),
      ]);
      const returns = (returnRes.assetReturnForms ?? []).map(b => ({
        ...b,
        formType: 'return' as const,
      })) as FormApprovalBatch[];
      const transfers = (transferRes.assetTransferForms ?? []).map(b => ({
        ...b,
        formType: 'transfer' as const,
      })) as FormApprovalBatch[];
      const checklists = mapChecklistApiBatches(
        checklistRes.checklistBatches ?? [],
        false
      );
      const borrowRequests = (borrowRes.data?.borrowRequests ?? []).map(b => ({
        ...b,
        formType: 'borrow' as const,
      })) as ApprovalBatch[];
      setBatches(
        ([...returns, ...transfers, ...checklists, ...borrowRequests] as ApprovalBatch[]).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      toast.error('Failed to load pending approvals');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedByMe = async () => {
    try {
      setApprovedLoading(true);
      const [returnRes, transferRes, checklistRes, borrowRes] = await Promise.all([
        api.get<{ assetReturnForms?: AssetReturnFormBatch[] }>(
          '/asset-returns/forms/approved-by-me'
        ),
        api.get<{ assetTransferForms?: AssetTransferFormBatch[] }>(
          '/asset-transfers/forms/approved-by-me'
        ),
        api.get<{ checklistBatches?: ChecklistApprovalBatch[] }>(
          '/asset-checklists/approved-by-dept-head-me'
        ),
        api.get<{ success: boolean; data: { borrowRequests?: any[] } }>(
          '/asset-borrow-requests/received-by-me'
        ),
      ]);
      const returns = (returnRes.assetReturnForms ?? []).map(b => ({
        ...b,
        formType: 'return' as const,
      })) as FormApprovalBatch[];
      const transfers = (transferRes.assetTransferForms ?? []).map(b => ({
        ...b,
        formType: 'transfer' as const,
      })) as FormApprovalBatch[];
      const checklists = mapChecklistApiBatches(
        checklistRes.checklistBatches ?? [],
        true
      );
      const borrowRequests = (borrowRes.data?.borrowRequests ?? []).map(b => ({
        ...b,
        formType: 'borrow' as const,
      })) as ApprovalBatch[];
      setApprovedBatches(
        ([...returns, ...transfers, ...checklists, ...borrowRequests] as ApprovalBatch[]).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Failed to fetch approved forms:', error);
      toast.error('Failed to load approved forms');
      setApprovedBatches([]);
    } finally {
      setApprovedLoading(false);
    }
  };

  const fetchReceivePendingApprovals = async () => {
    if (!canReceive) return;
    try {
      setReceiveLoading(true);
      const [returnRes, transferRes, checklistRes, borrowRes] = await Promise.all([
        api.get<{ assetReturnForms?: AssetReturnFormBatch[] }>(
          '/asset-returns/forms/receive-pending-approvals'
        ),
        api.get<{ assetTransferForms?: AssetTransferFormBatch[] }>(
          '/asset-transfers/forms/receive-pending-approvals'
        ),
        api.get<{ checklistBatches?: ChecklistApprovalBatch[] }>(
          '/asset-checklists/receive-pending-approvals'
        ),
        api.get<{ success: boolean; data: { borrowRequests?: any[] } }>(
          '/asset-borrow-requests/receive-pending-approvals'
        ),
      ]);
      const returns = (returnRes.assetReturnForms ?? []).map(b => ({
        ...b,
        formType: 'return' as const,
      })) as FormApprovalBatch[];
      const transfers = (transferRes.assetTransferForms ?? []).map(b => ({
        ...b,
        formType: 'transfer' as const,
      })) as FormApprovalBatch[];
      const checklists = (checklistRes.checklistBatches ?? []).map(
        (b: ChecklistApprovalBatch) => ({
          ...b,
          formType: 'checklist' as const,
          dept_head_signed_at:
            b.checklists[0]?.dept_head_signed_at ??
            b.dept_head_signed_at ??
            null,
          sub_approver_1_signed_at:
            b.checklists[0]?.sub_approver_1_signed_at ??
            b.sub_approver_1_signed_at ??
            null,
          it_manager_signed_at:
            b.checklists[0]?.it_manager_signed_at ??
            b.it_manager_signed_at ??
            null,
        })
      );
      const borrowRequests = (borrowRes.data?.borrowRequests ?? []).map(b => ({
        ...b,
        formType: 'borrow' as const,
      })) as ApprovalBatch[];
      setReceiveBatches(
        ([...returns, ...transfers, ...checklists, ...borrowRequests] as ApprovalBatch[]).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Failed to fetch receive-pending approvals:', error);
      toast.error('Failed to load receive approvals');
      setReceiveBatches([]);
    } finally {
      setReceiveLoading(false);
    }
  };

  const refreshAll = async () => {
    const promises: Promise<void>[] = [
      fetchPendingApprovals(),
      fetchApprovedByMe(),
    ];
    if (canReceive) promises.push(fetchReceivePendingApprovals());
    await Promise.all(promises);
  };

  useEffect(() => {
    fetchPendingApprovals();
    fetchApprovedByMe();
  }, []);

  useEffect(() => {
    if (canReceive) fetchReceivePendingApprovals();
  }, [canReceive]);

  // ---------- Filtering ----------
  const searchFilter = (batch: ApprovalBatch, q: string) => {
    if (batch.formType === 'checklist') {
      const c = batch as ChecklistApprovalBatch;
      const name = c.employee_name.toLowerCase();
      const dept = (c.employee_department_name || '').toLowerCase();
      const assets = c.checklists.some(
        cl =>
          (cl.asset?.name || '').toLowerCase().includes(q) ||
          (cl.asset?.code || '').toLowerCase().includes(q) ||
          (cl.form_number || '').toLowerCase().includes(q)
      );
      return name.includes(q) || dept.includes(q) || assets;
    }
    // Handle borrow requests
    if (batch.formType === 'borrow') {
      const borrowBatch = batch as BorrowRequestBatch;
      return (
        (borrowBatch.form_number || '').toLowerCase().includes(q) ||
        (borrowBatch.category_name || '').toLowerCase().includes(q) ||
        (borrowBatch.type_name || '').toLowerCase().includes(q) ||
        `${borrowBatch.requester_first_name || ''} ${borrowBatch.requester_last_name || ''}`.trim().toLowerCase().includes(q)
      );
    }
    const base =
      batch.returns?.some(
        (r: any) =>
          r.assignment?.asset?.name?.toLowerCase().includes(q) ||
          r.assignment?.asset?.code?.toLowerCase().includes(q) ||
          (r.assignment?.user?.first_name || '').toLowerCase().includes(q) ||
          (r.assignment?.user?.last_name || '').toLowerCase().includes(q) ||
          (batch.form_number || '').toLowerCase().includes(q)
      ) ?? false;
    if (base) return true;
    const tb = batch as AssetTransferFormBatch;
    if (tb.new_assigned_user) {
      const name =
        `${tb.new_assigned_user.first_name || ''} ${tb.new_assigned_user.last_name || ''}`
          .trim()
          .toLowerCase();
      if (name && name.includes(q)) return true;
    }
    return false;
  };

  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const q = searchQuery.toLowerCase();
    return batches.filter(b => searchFilter(b, q));
  }, [batches, searchQuery]);

  const filteredReceiveBatches = useMemo(() => {
    if (!receiveSearchQuery.trim()) return receiveBatches;
    const q = receiveSearchQuery.toLowerCase();
    return receiveBatches.filter(b => searchFilter(b, q));
  }, [receiveBatches, receiveSearchQuery]);

  const filteredApprovedBatches = useMemo(() => {
    if (!approvedSearchQuery.trim()) return approvedBatches;
    const q = approvedSearchQuery.toLowerCase();
    return approvedBatches.filter(b => searchFilter(b, q));
  }, [approvedBatches, approvedSearchQuery]);

  // ---------- Actions ----------
  const getChecklistAssetLabel = (c: ChecklistApprovalBatch['checklists'][0]) => {
    const name = c.asset?.name || 'Asset';
    const code = c.asset?.code || '—';
    return `${name} (${code})`;
  };

  const downloadChecklistBatch = async (batch: ChecklistApprovalBatch) => {
    const baseName = batch.employee_name.replace(/\s+/g, '_');
    for (let i = 0; i < batch.checklists.length; i++) {
      const entry = batch.checklists[i];
      const pdfBlob = await generateAssetChecklistPDF({
        ...entry,
        asset_label: getChecklistAssetLabel(entry),
        employee_company_logo_url: entry.employee_company_logo_url ?? null,
      });
      const assetSlug = getChecklistAssetLabel(entry)
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      const suffix =
        batch.checklists.length > 1 ? `_${assetSlug || `asset_${i + 1}`}` : '';
      downloadPDF(
        pdfBlob,
        `Asset_Checklist_${baseName}${suffix}_${Date.now() + i}.pdf`
      );
    }
    toast.success(
      batch.checklists.length > 1
        ? `Downloaded ${batch.checklists.length} checklist PDFs`
        : 'Checklist PDF downloaded'
    );
  };

  const loadChecklistPreview = async (
    batch: ChecklistApprovalBatch,
    index: number
  ) => {
    const entry = batch.checklists[index];
    if (!entry) return;
    const pdfBlob = await generateAssetChecklistPDF({
      ...entry,
      asset_label: getChecklistAssetLabel(entry),
      employee_company_logo_url: entry.employee_company_logo_url ?? null,
    });
    if (checklistPreviewUrl) URL.revokeObjectURL(checklistPreviewUrl);
    setChecklistPreviewUrl(URL.createObjectURL(pdfBlob));
    setChecklistPreviewIndex(index);
  };

  const handleDownload = async (batch: ApprovalBatch) => {
    try {
      if (batch.formType === 'checklist') {
        await downloadChecklistBatch(batch as ChecklistApprovalBatch);
        return;
      }
      if (batch.formType === 'borrow') {
        const data = buildBorrowDataForPDFFromBatch(batch as AssetBorrowFormBatch);
        if (!data) {
          toast.error('Cannot generate PDF for this form');
          return;
        }
        const blob = await generateAssetBorrowingPDF(data);
        const fileName = `Equipment_Borrow_${(batch as AssetBorrowFormBatch).form_number ?? (batch as AssetBorrowFormBatch).borrow_request_id.slice(0, 8)}_${Date.now()}.pdf`;
        downloadPDF(blob, fileName);
        toast.success('Download started');
        return;
      }
      if (batch.formType === 'transfer') {
        const data = buildTransferDataForPDFFromBatch(
          batch as AssetTransferFormBatch
        );
        if (!data) {
          toast.error('Cannot generate PDF for this form');
          return;
        }
        const blob = await generateAssetTransferPDF(data);
        const fileName = batch.form_number
          ? `Asset_Transfer_Form_${batch.form_number}_${Date.now()}.pdf`
          : `Asset_Transfer_Form_${Date.now()}.pdf`;
        downloadPDF(blob, fileName);
      } else {
        const data = buildReturnDataForPDFFromBatch(
          batch as AssetReturnFormBatch
        );
        if (!data) {
          toast.error('Cannot generate PDF for this form');
          return;
        }
        const blob = await generateAssetReturnPDF(data);
        const fileName = batch.form_number
          ? `Asset_Return_Form_${batch.form_number}_${Date.now()}.pdf`
          : `Asset_Return_Form_${Date.now()}.pdf`;
        downloadPDF(blob, fileName);
      }
      toast.success('Download started');
    } catch (e) {
      console.error(e);
      toast.error('Failed to download PDF');
    }
  };

  const handleApprove = async () => {
    if (!selectedBatch) return;
    
    // Get approver's digital signature from current user
    const digitalSignature = (currentUser as any)?.digitalSignature || '';
    
    // Set up the actual approval action as a pending action
    pendingActionRef.current = async () => {
      if (!selectedBatch) return;
      if (selectedBatch.formType === 'checklist') {
        const cb = selectedBatch as ChecklistApprovalBatch;
        try {
          setApproving(true);
          const sig =
            (currentUser as { digitalSignature?: string })?.digitalSignature || '';
          await api.post('/asset-checklists/dept-head-approve', {
            checklistIds: cb.checklists.map(c => c.id),
            digitalSignature: sig || undefined,
          });
          toast.success(
            cb.checklist_count > 1
              ? `Approved ${cb.checklist_count} checklists`
              : 'Checklist approved'
          );
          if (checklistPreviewUrl) URL.revokeObjectURL(checklistPreviewUrl);
          setChecklistPreviewUrl('');
          setShowDetail(false);
          setSelectedBatch(null);
          await refreshAll();
        } catch (error: unknown) {
          const msg =
            (error as { data?: { error?: string } })?.data?.error ||
            (error as Error)?.message ||
            'Failed to approve';
          toast.error(msg);
        } finally {
          setApproving(false);
        }
        return;
      }
      if (selectedBatch.formType === 'borrow') {
        const borrowBatch = selectedBatch as BorrowRequestBatch;
        const borrowRequestId = borrowBatch.borrow_request_id;
        if (!borrowRequestId) {
          toast.error('Borrow request ID not found');
          return;
        }
        try {
          setApproving(true);
          const sig =
            (currentUser as { digitalSignature?: string })?.digitalSignature || '';
          await api.post(
            `/asset-borrow-requests/${borrowRequestId}/dept-head-approve`,
            { digitalSignature: sig || undefined }
          );
          toast.success('Borrow request approved');
          setShowDetail(false);
          setSelectedBatch(null);
          await refreshAll();
        } catch (error: unknown) {
          const msg =
            (error as { data?: { error?: string } })?.data?.error ||
            (error as Error)?.message ||
            'Failed to approve borrow request';
          toast.error(msg);
        } finally {
          setApproving(false);
        }
        return;
      }
      if (
        selectedBatch.formType !== 'transfer' &&
        selectedBatch.formType !== 'return'
      ) {
        return;
      }
      const formBatch = selectedBatch as FormApprovalBatch;
      if (!formBatch.formID) return;
      const base =
        formBatch.formType === 'transfer'
          ? '/asset-transfers'
          : '/asset-returns';
      const successMsg =
        formBatch.formType === 'transfer'
          ? 'Transfer form approved successfully'
          : 'Return form approved successfully';
      try {
        setApproving(true);
        const sig =
          (typeof digitalSignature === 'string' && digitalSignature.trim()) ||
          (currentUser as { digitalSignature?: string })?.digitalSignature ||
          '';
        await api.post(`${base}/forms/${formBatch.formID}/approve`, {
          digitalSignature: sig || undefined,
        });
        toast.success(successMsg);
        if (formBatch.form_number) {
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const deptHeadSignedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          const approverName =
            currentUser?.name ||
            [currentUser?.firstName, currentUser?.lastName]
              .filter(Boolean)
              .join(' ')
              .trim();
          if (formBatch.formType === 'return') {
            clearReturnPdfCacheForFormNumber(formBatch.form_number);
            setSelectedBatch({
              ...(selectedBatch as AssetReturnFormBatch),
              dept_head_signed_at: deptHeadSignedAt,
              dept_head_digital_signature: sig || null,
              dept_head_signed_by: currentUser?.id ?? null,
              dept_head_user_name: approverName || null,
            } as FormApprovalBatch);
          } else {
            setSelectedBatch({
              ...(selectedBatch as AssetTransferFormBatch),
              dept_head_signed_at: deptHeadSignedAt,
              dept_head_digital_signature: sig || null,
              dept_head_user_name: approverName || null,
            } as FormApprovalBatch);
          }
        } else {
          setShowDetail(false);
          setSelectedBatch(null);
        }
        await refreshAll();
      } catch (error: any) {
        const msg =
          error?.response?.data?.error || error?.message || 'Failed to approve';
        const isMigrationError =
          typeof msg === 'string' &&
          (msg.includes('database schema may be outdated') ||
            msg.includes('migration_add_dept_head_signature_asset_return_forms'));
        if (isMigrationError) {
          toast.error('Database update required', {
            description:
              'Run db/migration_add_dept_head_signature_asset_return_forms.sql on your MySQL database, then try again.',
            duration: 10000,
          });
        } else {
          toast.error(msg);
        }
      } finally {
        setApproving(false);
      }
    };

    setOtpPurpose('approve');
    setShowOtpDialog(true);
  };

  const handleDecline = async () => {
    if (!selectedBatch) return;
    // Show decline reason dialog first
    setDeclineReason('');
    setShowDeclineReasonDialog(true);
  };

  const handleDeclineWithReason = async () => {
    if (!selectedBatch) return;
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }
    
    // Close decline reason dialog
    setShowDeclineReasonDialog(false);
    
    // Set up the actual decline action as a pending action
    pendingActionRef.current = async () => {
      if (!selectedBatch) return;
      if (selectedBatch.formType === 'borrow') {
        const borrowBatch = selectedBatch as BorrowRequestBatch;
        const borrowRequestId = borrowBatch.borrow_request_id;
        if (!borrowRequestId) {
          toast.error('Borrow request ID not found');
          return;
        }
        try {
          setDeclining(true);
          await api.post(
            `/asset-borrow-requests/${borrowRequestId}/dept-head-decline`,
            { reason: declineReason }
          );
          toast.success('Borrow request declined');
          setShowDetail(false);
          setSelectedBatch(null);
          await refreshAll();
        } catch (error: any) {
          const msg =
            error?.response?.data?.error || error?.message || 'Failed to decline';
          toast.error(msg);
        } finally {
          setDeclining(false);
        }
        return;
      }
      if (
        selectedBatch.formType !== 'transfer' &&
        selectedBatch.formType !== 'return'
      ) {
        return;
      }
      const formBatch = selectedBatch as FormApprovalBatch;
      if (!formBatch.formID) return;
      const base =
        formBatch.formType === 'transfer'
          ? '/asset-transfers'
          : '/asset-returns';
      const successMsg =
        formBatch.formType === 'transfer'
          ? 'Transfer declined'
          : 'Return declined. No asset will be transferred to the processor and no new accountability will be issued.';
      try {
        setDeclining(true);
        await api.post(`${base}/forms/${formBatch.formID}/decline`, { reason: declineReason });
        toast.success(successMsg);
        setShowDetail(false);
        setSelectedBatch(null);
        await refreshAll();
      } catch (error: any) {
        const msg =
          error?.response?.data?.error || error?.message || 'Failed to decline';
        toast.error(msg);
      } finally {
        setDeclining(false);
      }
    };

    setOtpPurpose('decline');
    setShowOtpDialog(true);
  };

  const handleReceive = () => {
    if (!selectedBatch) {
      return;
    }

    pendingActionRef.current = async () => {
      if (!selectedBatch) {
        return;
      }

      if (selectedBatch.formType === 'checklist') {
        const cb = selectedBatch as ChecklistApprovalBatch;
        try {
          setReceiving(true);
          const sig =
            (currentUser as { digitalSignature?: string })?.digitalSignature ||
            '';
          await api.post('/asset-checklists/it-manager-receive', {
            checklistIds: cb.checklists.map(c => c.id),
            digitalSignature: sig || undefined,
          });
          toast.success(
            cb.checklist_count > 1
              ? `Received ${cb.checklist_count} checklists`
              : 'Checklist received'
          );
          if (checklistPreviewUrl) URL.revokeObjectURL(checklistPreviewUrl);
          setChecklistPreviewUrl('');
          setShowDetail(false);
          setSelectedBatch(null);
          await refreshAll();
        } catch (error: unknown) {
          const msg =
            (error as { data?: { error?: string } })?.data?.error ||
            (error as Error)?.message ||
            'Failed to receive';
          toast.error(msg);
        } finally {
          setReceiving(false);
        }
        return;
      }

      // Handle borrow request receive
      if (selectedBatch.formType === 'borrow') {
        const borrowRequestId = (selectedBatch as any).borrow_request_id;
        if (!borrowRequestId) {
          toast.error('Borrow request ID not found');
          return;
        }
        try {
          setReceiving(true);
          const sig =
            (currentUser as { digitalSignature?: string })?.digitalSignature ||
            '';
          await api.post(`/asset-borrow-requests/${borrowRequestId}/receive`, {
            digitalSignature: sig || undefined,
          });
          toast.success('Borrow request received successfully');
          setShowDetail(false);
          setSelectedBatch(null);
          await refreshAll();
        } catch (error: unknown) {
          const msg =
            (error as { data?: { error?: string } })?.data?.error ||
            (error as Error)?.message ||
            'Failed to receive borrow request';
          toast.error(msg);
        } finally {
          setReceiving(false);
        }
        return;
      }

      if (!('formID' in selectedBatch) || !selectedBatch.formID) {
        return;
      }
      const formBatch = selectedBatch as FormApprovalBatch;
      const base =
        formBatch.formType === 'transfer'
          ? '/asset-transfers'
          : '/asset-returns';
      const successMsg =
        formBatch.formType === 'transfer'
          ? 'Transfer form received successfully'
          : 'Return form received successfully';
      try {
        setReceiving(true);
        const sig =
          (currentUser as { digitalSignature?: string })?.digitalSignature ||
          '';
        await api.post(`${base}/forms/${formBatch.formID}/receive`, {
          digitalSignature: sig || undefined,
        });
        toast.success(successMsg);
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const itManagerSignedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const receiverName =
          currentUser?.name ||
          [currentUser?.firstName, currentUser?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        const isSubApprover2Receiver =
          roleCustodian?.subApprover2 === true &&
          roleCustodian?.managerApprover2 !== true;
        const receiverFields = isSubApprover2Receiver
          ? {
              sub_approver_2_signed_at: itManagerSignedAt,
              sub_approver_2_digital_signature: sig || null,
              sub_approver_2_signed_by: currentUser?.id ?? null,
              sub_approver_2_user_name: receiverName || null,
            }
          : {
              it_manager_signed_at: itManagerSignedAt,
              it_manager_digital_signature: sig || null,
              it_manager_signed_by: currentUser?.id ?? null,
              it_manager_user_name: receiverName || null,
            };
        if (formBatch.formType === 'return' && formBatch.form_number) {
          clearReturnPdfCacheForFormNumber(formBatch.form_number);
          setSelectedBatch({
            ...(selectedBatch as AssetReturnFormBatch),
            ...receiverFields,
          } as FormApprovalBatch);
        } else if (formBatch.formType === 'transfer') {
          setSelectedBatch({
            ...(selectedBatch as AssetTransferFormBatch),
            ...receiverFields,
          } as FormApprovalBatch);
        } else {
          setShowDetail(false);
          setSelectedBatch(null);
        }
        await refreshAll();
      } catch (error: unknown) {
        const msg =
          (error as { data?: { error?: string } })?.data?.error ||
          (error as Error)?.message ||
          'Failed to receive';
        toast.error(msg);
      } finally {
        setReceiving(false);
      }
    };

    setOtpPurpose('receive');
    setShowOtpDialog(true);
  };

  const showReceiveButton =
    detailSourceTab !== 'approved' &&
    canReceive &&
    selectedBatch != null &&
    (selectedBatch.formType === 'checklist'
      ? (!!(selectedBatch as ChecklistApprovalBatch).dept_head_signed_at ||
          !!(selectedBatch as ChecklistApprovalBatch).sub_approver_1_signed_at) &&
        !(selectedBatch as ChecklistApprovalBatch).it_manager_signed_at
      : selectedBatch.formType === 'borrow'
        ? !!(selectedBatch as any).approved_at && !(selectedBatch as any).received_at
        : !!(selectedBatch as FormApprovalBatch).dept_head_signed_at &&
          (!!(selectedBatch as FormApprovalBatch).process_signed_at ||
            !!(selectedBatch as AssetTransferFormBatch).processor_pending_signed_at ||
            !!(selectedBatch as AssetReturnFormBatch).processor_pending_signed_at) &&
          !(selectedBatch as FormApprovalBatch).it_manager_signed_at);

  const handleDownloadCurrent = async () => {
    if (!selectedBatch) return;
    await handleDownload(selectedBatch);
  };

  const isAnyLoading =
    loading || approvedLoading || (canReceive && receiveLoading);

  // ---------- Shimmer card skeleton ----------
  const shimmerGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <Shimmer className="h-5 w-48 rounded bg-red-100/80" />
          <Shimmer className="h-4 w-20 rounded" />
          <Shimmer className="h-4 w-32 rounded" />
          <Shimmer className="h-4 w-28 rounded" />
          <div className="flex gap-2 pt-2">
            <Shimmer className="h-9 flex-1 rounded-lg" />
            <Shimmer className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  // ---------- Reusable card grid renderer ----------
  const renderCardGrid = (
    list: ApprovalBatch[],
    sourceTab: (typeof APPROVAL_TABS)[number]
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map(batch => {
        const key =
          batch.formType === 'checklist'
            ? (batch as ChecklistApprovalBatch).batchKey
            : batch.formType === 'borrow'
              ? (batch as BorrowRequestBatch).borrow_request_id
              : (batch as FormApprovalBatch).formID ??
                  (batch as FormApprovalBatch).return_batch_id ??
                  (batch as FormApprovalBatch).returns?.[0]?.return_id ??
                  '';
        if (batch.formType === 'checklist') {
          const cb = batch as ChecklistApprovalBatch;
          return (
            <ChecklistApprovalCard
              key={cb.batchKey}
              batch={cb}
              onView={() => {
                setDetailSourceTab(sourceTab);
                setSelectedBatch(batch);
                setChecklistPreviewIndex(0);
                setShowDetail(true);
                void loadChecklistPreview(cb, 0);
              }}
              onDownload={() => void downloadChecklistBatch(cb)}
            />
          );
        }
        if (batch.formType === 'transfer') {
          return (
            <TransferFormCard
              key={key}
              batch={batch as AssetTransferFormBatch}
              onView={() => {
                setDetailSourceTab(sourceTab);
                setSelectedBatch(batch);
                setShowDetail(true);
              }}
              onDownload={() => handleDownload(batch)}
              viewOnly
            />
          );
        }
        if (batch.formType === 'borrow') {
          return (
            <BorrowRequestCard
              key={key}
              batch={batch}
              onView={() => {
                setDetailSourceTab(sourceTab);
                setSelectedBatch(batch);
                setShowDetail(true);
              }}
            />
          );
        }
        return (
          <ReturnFormCard
            key={key}
            batch={batch as AssetReturnFormBatch}
            onView={() => {
              setDetailSourceTab(sourceTab);
              setSelectedBatch(batch);
              setShowDetail(true);
            }}
            onDownload={() => handleDownload(batch)}
            viewOnly
          />
        );
      })}
    </div>
  );

  const renderEmpty = (
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    query: string
  ) => (
    <div className="text-center py-12">
      {icon}
      {query.trim() ? (
        <>
          <p className="text-gray-500 text-lg">No forms match your search</p>
          <p className="text-gray-400 text-sm mt-1">
            Try a different search term.
          </p>
        </>
      ) : (
        <>
          <p className="text-gray-500 text-lg">{title}</p>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </>
      )}
    </div>
  );

  const tabTriggerClass =
    'data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-200 hover:text-gray-900 rounded-lg font-medium';

  // ---------- Render ----------
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* ───── Header ───── */}
        <PageHeader
          icon={CheckSquare}
          title="Approvals"
          description="Manage return and transfer form approvals and signatures"
        >
        </PageHeader>

        {/* ───── Tabs ───── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid ${canReceive ? 'grid-cols-3' : 'grid-cols-2'} w-full h-14 rounded-xl bg-white shadow-sm border`}
          >
            <TabsTrigger value="for-approval" className={tabTriggerClass}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              For Approval
              <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold bg-white/20">
                {batches.length}
              </span>
            </TabsTrigger>
            {canReceive && (
              <TabsTrigger value="receive" className={tabTriggerClass}>
                <PackageCheck className="w-4 h-4 mr-2" />
                Receive Approve
                <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold bg-white/20">
                  {receiveBatches.length}
                </span>
              </TabsTrigger>
            )}
            <TabsTrigger value="approved" className={tabTriggerClass}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approved
              <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold bg-white/20">
                {approvedBatches.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ──── For Approval Tab ──── */}
          <TabsContent value="for-approval" className="mt-8">
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by form number, asset, or returner..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {displayLoading
              ? shimmerGrid
              : filteredBatches.length === 0
                ? renderEmpty(
                    <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
                    'No pending approvals',
                    'Return, transfer, and asset checklist forms that need Department Head (Manager Approver 1) approval will appear here.',
                    searchQuery
                  )
                : renderCardGrid(filteredBatches, 'for-approval')}
          </TabsContent>

          {/* ──── Receive Approve Tab ──── */}
          {canReceive && (
            <TabsContent value="receive" className="mt-8">
              <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by form number, asset, or returner..."
                  value={receiveSearchQuery}
                  onChange={e => setReceiveSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {displayReceiveLoading
                ? shimmerGrid
                : filteredReceiveBatches.length === 0
                  ? renderEmpty(
                      <PackageCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
                      'No forms pending receive',
                      'Forms that need Department Head (IT/Admin Manager) signature will appear here.',
                      receiveSearchQuery
                    )
                  : renderCardGrid(filteredReceiveBatches, 'receive')}
            </TabsContent>
          )}

          {/* ──── Approved Tab ──── */}
          <TabsContent value="approved" className="mt-8">
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by form number, asset, or returner..."
                value={approvedSearchQuery}
                onChange={e => setApprovedSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {displayApprovedLoading
              ? shimmerGrid
              : filteredApprovedBatches.length === 0
                ? renderEmpty(
                    <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
                    'No approved forms yet',
                    'Forms you approve will appear here.',
                    approvedSearchQuery
                  )
                : renderCardGrid(filteredApprovedBatches, 'approved')}
          </TabsContent>
        </Tabs>

        {/* ───── Detail Dialog ───── */}
        {showDetail && selectedBatch && (
          <Dialog
            open={showDetail}
            onOpenChange={open => {
              setShowDetail(open);
              if (!open) {
                if (checklistPreviewUrl) URL.revokeObjectURL(checklistPreviewUrl);
                setChecklistPreviewUrl('');
                setSelectedBatch(null);
              }
            }}
          >
            <AppDialogFrame className="max-w-3xl h-[90vh] max-h-[90vh] overflow-hidden !flex !flex-col">
              <AppDialogGradientHeader
                title={
                  <>
                    {selectedBatch.formType === 'checklist'
                      ? `${(selectedBatch as ChecklistApprovalBatch).employee_name} — Asset Checklist (${(selectedBatch as ChecklistApprovalBatch).checklist_count} asset${(selectedBatch as ChecklistApprovalBatch).checklist_count !== 1 ? 's' : ''})`
                      : selectedBatch.formType === 'borrow'
                        ? (() => {
                            const borrowBatch = selectedBatch as BorrowRequestBatch;
                            const requesterName = `${borrowBatch.requester_first_name || ''} ${borrowBatch.requester_last_name || ''}`.trim() || borrowBatch.requester_email || 'Borrow Request';
                            return `${requesterName} — Asset Borrow`;
                          })()
                        : (selectedBatch as FormApprovalBatch).returns?.[0]?.assignment?.user
                          ? `${(selectedBatch as FormApprovalBatch).returns![0].assignment!.user!.first_name || ''} ${(selectedBatch as FormApprovalBatch).returns![0].assignment!.user!.last_name || ''}`.trim() ||
                            (selectedBatch.formType === 'transfer'
                              ? 'Transfer'
                              : 'Return')
                          : selectedBatch.formType === 'transfer'
                            ? 'Transfer'
                            : 'Return'}{' '}
                    {selectedBatch.formType !== 'checklist' && selectedBatch.formType !== 'borrow' && (
                      <>
                        -{' '}
                        {(selectedBatch as FormApprovalBatch).form_number ??
                          `${selectedBatch.formType === 'transfer' ? 'Transfer' : 'Return'} of ${(selectedBatch as FormApprovalBatch).returns?.length ?? 0} assets`}
                      </>
                    )}
                  </>
                }
                description={
                  selectedBatch.formType === 'checklist'
                    ? 'Asset Checklist Form Preview'
                    : selectedBatch.formType === 'transfer'
                      ? 'Asset Transfer Form Preview'
                      : selectedBatch.formType === 'borrow'
                        ? 'Asset Borrow Request Details'
                        : 'Asset Return Form Preview'
                }
              />
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
              {selectedBatch.formType === 'checklist' ? (
                <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
                  {(selectedBatch as ChecklistApprovalBatch).checklists.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {(selectedBatch as ChecklistApprovalBatch).checklists.map(
                        (entry, idx) => (
                          <Button
                            key={entry.id}
                            size="sm"
                            variant={
                              checklistPreviewIndex === idx ? 'default' : 'outline'
                            }
                            onClick={() => {
                              void loadChecklistPreview(
                                selectedBatch as ChecklistApprovalBatch,
                                idx
                              );
                            }}
                          >
                            {entry.asset?.name || `Asset ${idx + 1}`}
                          </Button>
                        )
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-slate-50">
                    <PDFViewer pdfUrl={checklistPreviewUrl} className="h-full w-full" />
                  </div>
                </div>
              ) : selectedBatch.formType === 'transfer' ? (
                <TransferFormDetail
                  key={
                    selectedBatch.formID ??
                    selectedBatch.return_batch_id ??
                    selectedBatch.returns?.[0]?.return_id ??
                    'transfer-form'
                  }
                  transferFormBatch={selectedBatch as AssetTransferFormBatch}
                  onClose={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                  onDownload={handleDownloadCurrent}
                  contentOnly
                />
              ) : selectedBatch.formType === 'borrow' ? (
                <BorrowFormDetail
                  key={(selectedBatch as BorrowRequestBatch).borrow_request_id}
                  borrowFormBatch={selectedBatch as AssetBorrowFormBatch}
                  onClose={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                  onDownload={handleDownloadCurrent}
                  contentOnly
                />
              ) : (
                <ReturnFormDetail
                  key={
                    selectedBatch.formID ??
                    selectedBatch.return_batch_id ??
                    selectedBatch.returns?.[0]?.return_id ??
                    'return-form'
                  }
                  returnFormBatch={selectedBatch as AssetReturnFormBatch}
                  onClose={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                  onDownload={handleDownloadCurrent}
                  onApprove={handleApprove}
                  showApproveButton={
                    detailSourceTab !== 'approved' &&
                    canApprove &&
                    !selectedBatch.dept_head_signed_at &&
                    !(
                      selectedBatch as { sub_approver_1_signed_at?: string | null }
                    ).sub_approver_1_signed_at
                  }
                  isApproving={approving}
                  contentOnly
                />
              )}
              </div>
              <AppDialogChromeFooter className="flex-shrink-0 flex-row flex-wrap justify-end gap-3 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedBatch(null);
                  }}
                >
                  Close
                </Button>
                {canApprove &&
                  detailSourceTab !== 'approved' &&
                  (selectedBatch.formType === 'checklist'
                    ? !(selectedBatch as ChecklistApprovalBatch).dept_head_signed_at &&
                      !(selectedBatch as ChecklistApprovalBatch).sub_approver_1_signed_at
                    : !(
                        selectedBatch as {
                          dept_head_signed_at?: string | null;
                          sub_approver_1_signed_at?: string | null;
                        }
                      ).dept_head_signed_at &&
                      !(
                        selectedBatch as {
                          dept_head_signed_at?: string | null;
                          sub_approver_1_signed_at?: string | null;
                        }
                      ).sub_approver_1_signed_at) && (
                    <>
                      {selectedBatch.formType !== 'checklist' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDecline}
                          disabled={declining || approving}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          {declining ? 'Declining...' : 'Decline'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={approving || declining}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {approving ? 'Approving...' : 'Approve'}
                      </Button>
                    </>
                  )}
                {showReceiveButton && (
                  <Button
                    size="sm"
                    onClick={handleReceive}
                    disabled={receiving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {receiving ? 'Receiving...' : 'Receive'}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleDownloadCurrent}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </AppDialogChromeFooter>
            </AppDialogFrame>
          </Dialog>
        )}

        {/* Decline Reason Dialog */}
        <Dialog open={showDeclineReasonDialog} onOpenChange={setShowDeclineReasonDialog}>
          <AppDialogFrame className="max-w-md">
            <AppDialogGradientHeader title="Decline Request" />
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for declining this request.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter reason for declining..."
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <AppDialogChromeFooter className="flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeclineReasonDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeclineWithReason}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Decline
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        {/* SMS OTP Dialog */}
        <SmsOtpDialog
          isOpen={showOtpDialog}
          onOpenChange={setShowOtpDialog}
          sendOtpEndpoint="/auth/initials/send-otp"
          verifyOtpEndpoint="/auth/initials/verify-otp"
          onVerified={() => {
            setShowOtpDialog(false);
            pendingActionRef.current = null;
          }}
          onCancel={() => {
            pendingActionRef.current = null;
            setShowOtpDialog(false);
          }}
          pendingActionRef={pendingActionRef}
          title="OTP SMS Verification"
          description={
            otpPurpose === 'receive'
              ? 'OTP SMS Verification has been sent to your registered mobile number for receive confirmation.'
              : otpPurpose === 'decline'
                ? 'OTP SMS Verification has been sent to your registered mobile number for decline confirmation.'
                : 'OTP SMS Verification has been sent to your registered mobile number for approval confirmation.'
          }
          verifyButtonLabel={
            otpPurpose === 'receive' ? 'Verify & Receive' : 'Verify & Confirm'
          }
        />
      </main>
    </div>
  );
}

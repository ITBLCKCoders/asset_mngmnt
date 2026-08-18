'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  GitBranch,
  Eye,
  Undo2,
  ArrowRightLeft,
  FileCheck2,
  Package,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { generateAccountabilityFormPDF } from '@/pages/assets/accountability/accountabilityForm';
import {
  ReturnFormDetail,
  TransferFormDetail,
  buildReturnDataForPDFFromBatch,
  buildTransferDataForPDFFromBatch,
  type AssetReturnFormBatch,
  type AssetTransferFormBatch,
} from '@/pages/profile/profileComponents/tabs/documentsTab';
import { generateAssetReturnPDF, generateAssetTransferPDF } from '@/lib/pdfGenerator';

interface MovementForm {
  id: string;
  formNumber: string;
  userId: string;
  userName: string;
  created_at: string;
}

interface MovementAsset {
  asset: {
    id: string;
    code: string;
    name: string;
    category?: string;
    type?: string;
    serialNo?: string;
    modelNo?: string;
  };
  returnForms: MovementForm[];
  transferForms: Array<
    MovementForm & {
      newAssignedUserId: string | null;
      newUserName: string;
    }
  >;
  newAccountabilityForms: Array<MovementForm & { status: string }>;
}

interface FormMovementResponse {
  form: {
    id: string;
    formNumber: string;
    status: string;
  };
  assets: MovementAsset[];
}

interface AssetMovementResponse {
  asset: {
    id: string;
    code?: string;
    name?: string;
    category?: string;
    type?: string;
    serialNo?: string;
    modelNo?: string;
  };
  forms: Array<{
    form: {
      id: string;
      formNumber: string;
      status: string;
      userId: string;
      userName: string;
      created_at: string;
    };
    returnForms: MovementForm[];
    transferForms: Array<
      MovementForm & {
        newAssignedUserId: string | null;
        newUserName: string;
      }
    >;
    newAccountabilityForms: Array<MovementForm & { status: string }>;
  }>;
}

interface AssetMovementTabProps {
  /** Form-based mode: shows where each asset on this form went. */
  formId?: string;
  /** Asset-based mode: shows the asset's full movement chain across its forms. */
  assetId?: string;
  formStatus?: string;
}

const formStatusBadgeClass: Record<string, string> = {
  Pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  Signed: 'bg-green-500/15 text-green-700 border-green-500/30',
  Completed: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  Disabled: 'bg-gray-500/15 text-gray-700 border-gray-500/30',
  Declined: 'bg-red-500/15 text-red-700 border-red-500/30',
  Revoked: 'bg-gray-500/15 text-gray-700 border-gray-500/30',
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AssetMovementTab({
  formId,
  assetId,
  formStatus,
}: AssetMovementTabProps) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormMovementResponse | null>(null);
  const [assetData, setAssetData] = useState<AssetMovementResponse | null>(
    null
  );

  // PDF preview state
  const [returnBatch, setReturnBatch] = useState<AssetReturnFormBatch | null>(
    null
  );
  const [transferBatch, setTransferBatch] =
    useState<AssetTransferFormBatch | null>(null);
  const [accountabilityPreviewId, setAccountabilityPreviewId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMovement = async () => {
      try {
        setLoading(true);
        if (formId) {
          const response = await api.get<FormMovementResponse>(
            `/accountability-forms/${formId}/movement`
          );
          if (cancelled) return;
          setFormData(response);
        } else if (assetId) {
          const response = await api.get<AssetMovementResponse>(
            `/assets/${assetId}/movement`
          );
          if (cancelled) return;
          setAssetData(response);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load asset movement:', error);
          toast.error('Failed to load asset movement');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMovement();
    return () => {
      cancelled = true;
    };
  }, [formId, assetId]);

  const formHasMovement = formData?.assets?.some(
    a =>
      a.returnForms.length > 0 ||
      a.transferForms.length > 0 ||
      a.newAccountabilityForms.length > 0
  );

  const assetHasMovement = assetData?.forms?.some(
    f =>
      f.returnForms.length > 0 ||
      f.transferForms.length > 0 ||
      f.newAccountabilityForms.length > 0
  );

  const hasMovement = formId ? formHasMovement : assetHasMovement;

  const handleViewReturnForm = async (formIdToView: string) => {
    try {
      const response = await api.get<{
        assetReturnForms?: AssetReturnFormBatch[];
        assetReturns?: any[];
      }>('/asset-returns');
      let list = response.assetReturnForms || [];
      if (list.length === 0 && Array.isArray(response.assetReturns)) {
        const byBatch = new Map<string, any[]>();
        for (const r of response.assetReturns) {
          const key = r.return_batch_id ?? r.return_id;
          if (!byBatch.has(key)) byBatch.set(key, []);
          byBatch.get(key)!.push(r);
        }
        list = Array.from(byBatch.entries()).map(([, returns]) => {
          const first = returns[0];
          return {
            return_batch_id: first.return_batch_id ?? null,
            created_at: first.created_at,
            user_id: first.user_id,
            processed_by: first.processed_by,
            returns,
          } as AssetReturnFormBatch;
        });
      }
      const batch = list.find(
        b => String(b.formID || '') === String(formIdToView)
      );
      if (!batch) {
        toast.error('Return form data not available');
        return;
      }
      setReturnBatch(batch);
    } catch {
      toast.error('Failed to load return form preview');
    }
  };

  const handleViewTransferForm = async (formIdToView: string) => {
    try {
      const response = await api.get<{
        assetTransferForms?: AssetTransferFormBatch[];
      }>('/asset-transfers/forms');
      const list = response.assetTransferForms || [];
      const batch = list.find(
        b => String(b.formID || '') === String(formIdToView)
      );
      if (!batch) {
        toast.error('Transfer form data not available');
        return;
      }
      setTransferBatch(batch);
    } catch {
      toast.error('Failed to load transfer form preview');
    }
  };

  const handleViewAccountabilityForm = (formIdToView: string) => {
    setAccountabilityPreviewId(formIdToView);
  };

  const handleDownloadReturn = async (batch: AssetReturnFormBatch) => {
    try {
      const data = buildReturnDataForPDFFromBatch(batch);
      if (!data) {
        toast.error('Return form data is missing or incomplete');
        return;
      }
      const blob = await generateAssetReturnPDF(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `return-form-${batch.form_number ?? 'export'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadTransfer = async (batch: AssetTransferFormBatch) => {
    try {
      const data = buildTransferDataForPDFFromBatch(batch);
      if (!data) {
        toast.error('Transfer form data is missing or incomplete');
        return;
      }
      const blob = await generateAssetTransferPDF(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transfer-form-${batch.form_number ?? 'export'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading asset movement...
      </div>
    );
  }

  if (!formData && !assetData) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No movement data available
      </div>
    );
  }

  if (!hasMovement) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <GitBranch className="h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No asset movement</p>
        <p className="text-xs text-gray-400">
          No linked return, transfer, or replacement accountability forms
          found.
        </p>
      </div>
    );
  }

  let orgRoot: OrgChartNodeData | null = null;

  if (formId && formData) {
    const assetNodes = formData.assets
      .map<OrgChartNodeData | null>(assetItem => {
        const children = buildChildNodes(
          assetItem.returnForms,
          assetItem.transferForms,
          assetItem.newAccountabilityForms,
          handleViewReturnForm,
          handleViewTransferForm,
          handleViewAccountabilityForm
        );
        if (children.length === 0) return null;
        return {
          id: `a-${assetItem.asset.id}`,
          icon: <Package className="h-4 w-4 text-slate-600" />,
          iconClass: 'bg-slate-100 text-slate-600',
          label: 'Asset',
          title: assetItem.asset.code || 'Asset',
          subtitle: assetItem.asset.name,
          children,
        };
      })
      .filter((n): n is OrgChartNodeData => n !== null);

    if (assetNodes.length > 0) {
      orgRoot = {
        id: `form-${formData.form.id}`,
        icon: <FileCheck2 className="h-4 w-4 text-green-600" />,
        iconClass: 'bg-green-50 text-green-700',
        label: 'Accountability Form',
        title: formData.form.formNumber,
        badge: formData.form.status,
        children: assetNodes,
      };
    }
  } else if (assetId && assetData) {
    const formNodes = assetData.forms
      .map<OrgChartNodeData | null>(formItem => {
        const children = buildChildNodes(
          formItem.returnForms,
          formItem.transferForms,
          formItem.newAccountabilityForms,
          handleViewReturnForm,
          handleViewTransferForm,
          handleViewAccountabilityForm
        );
        if (children.length === 0) return null;
        return {
          id: `f-${formItem.form.id}`,
          icon: <FileCheck2 className="h-4 w-4 text-green-600" />,
          iconClass: 'bg-green-50 text-green-700',
          label: 'Accountability Form',
          title: formItem.form.formNumber,
          subtitle: formItem.form.userName,
          badge: formItem.form.status,
          date: formItem.form.created_at,
          children,
        };
      })
      .filter((n): n is OrgChartNodeData => n !== null);

    if (formNodes.length > 0) {
      orgRoot = {
        id: `asset-${assetData.asset.id}`,
        icon: <Package className="h-4 w-4 text-slate-600" />,
        iconClass: 'bg-slate-100 text-slate-600',
        label: 'Asset',
        title: assetData.asset.code || assetData.asset.name || 'Asset',
        subtitle: assetData.asset.name,
        children: formNodes,
      };
    }
  }

  return (
    <div className="space-y-4">
      {formStatus && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Form status:</span>
          <Badge
            className={
              formStatusBadgeClass[formStatus] ||
              'bg-gray-500/15 text-gray-700 border-gray-500/30'
            }
          >
            {formStatus}
          </Badge>
        </div>
      )}

      {orgRoot && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max justify-center py-2">
            <OrgChartNode node={orgRoot} />
          </div>
        </div>
      )}

      {/* Return form preview dialog */}
      {returnBatch && (
        <Dialog open onOpenChange={open => !open && setReturnBatch(null)}>
          <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={`Return Form ${returnBatch.form_number ?? ''}`}
              description="Asset Return Form Preview"
            />
            <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
              <ReturnFormDetail
                returnFormBatch={returnBatch}
                onClose={() => setReturnBatch(null)}
                onDownload={() => handleDownloadReturn(returnBatch)}
                contentOnly
              />
            </div>
            <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
              <Button variant="outline" onClick={() => setReturnBatch(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => handleDownloadReturn(returnBatch)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      )}

      {/* Transfer form preview dialog */}
      {transferBatch && (
        <Dialog open onOpenChange={open => !open && setTransferBatch(null)}>
          <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={`Transfer Form ${transferBatch.form_number ?? ''}`}
              description="Asset Transfer Form Preview"
            />
            <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
              <TransferFormDetail
                transferFormBatch={transferBatch}
                onClose={() => setTransferBatch(null)}
                onDownload={() => handleDownloadTransfer(transferBatch)}
                contentOnly
              />
            </div>
            <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
              <Button variant="outline" onClick={() => setTransferBatch(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => handleDownloadTransfer(transferBatch)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      )}

      {/* New accountability form preview dialog */}
      {accountabilityPreviewId && (
        <AccountabilityPdfPreviewDialog
          formId={accountabilityPreviewId}
          onClose={() => setAccountabilityPreviewId(null)}
        />
      )}
    </div>
  );
}

interface OrgChartNodeData {
  id: string;
  icon?: React.ReactNode;
  iconClass?: string;
  label: string;
  title: string;
  subtitle?: string;
  badge?: string;
  date?: string;
  action?: () => void;
  children: OrgChartNodeData[];
}

function buildChildNodes(
  returnForms: MovementForm[],
  transferForms: Array<MovementForm & { newUserName: string }>,
  newAccountabilityForms: Array<MovementForm & { status: string }>,
  onViewReturn: (id: string) => void,
  onViewTransfer: (id: string) => void,
  onViewNew: (id: string) => void
): OrgChartNodeData[] {
  const nodes: OrgChartNodeData[] = [];

  for (const form of returnForms) {
    nodes.push({
      id: `r-${form.id}`,
      icon: <Undo2 className="h-4 w-4 text-amber-600" />,
      iconClass: 'bg-amber-50 text-amber-700',
      label: 'Return Form',
      title: form.formNumber,
      subtitle: form.userName,
      date: form.created_at,
      action: () => onViewReturn(form.id),
      children: [],
    });
  }

  for (const form of transferForms) {
    nodes.push({
      id: `t-${form.id}`,
      icon: <ArrowRightLeft className="h-4 w-4 text-blue-600" />,
      iconClass: 'bg-blue-50 text-blue-700',
      label: 'Transfer Form',
      title: form.formNumber,
      subtitle: form.newUserName
        ? `${form.userName} → ${form.newUserName}`
        : form.userName,
      date: form.created_at,
      action: () => onViewTransfer(form.id),
      children: [],
    });
  }

  for (const form of newAccountabilityForms) {
    nodes.push({
      id: `n-${form.id}`,
      icon: <FileCheck2 className="h-4 w-4 text-green-600" />,
      iconClass: 'bg-green-50 text-green-700',
      label: 'New Accountability Form',
      title: form.formNumber,
      subtitle: form.userName,
      date: form.created_at,
      badge: form.status,
      action: () => onViewNew(form.id),
      children: [],
    });
  }

  return nodes;
}

/** Org-chart card: fixed-width, truncated, with optional badge/date and a View action. */
function OrgCard({ node }: { node: OrgChartNodeData }) {
  return (
    <div className="flex w-[210px] flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            node.iconClass ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {node.icon ?? <Package className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-400">
            {node.label}
          </p>
          <p className="truncate font-mono text-sm font-semibold text-gray-800">
            {node.title}
          </p>
        </div>
      </div>
      {node.subtitle ? (
        <p className="truncate text-xs text-gray-500" title={node.subtitle}>
          {node.subtitle}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {node.badge ? (
            <Badge
              className={
                formStatusBadgeClass[node.badge] ||
                'bg-gray-500/15 text-gray-700 border-gray-500/30'
              }
            >
              {node.badge}
            </Badge>
          ) : null}
          {node.date ? (
            <span className="shrink-0 text-xs text-gray-400">
              {formatDate(node.date)}
            </span>
          ) : null}
        </div>
        {node.action ? (
          <Button variant="ghost" size="sm" onClick={node.action} className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Recursive org-chart node: centered card with connector lines branching to children. */
function OrgChartNode({ node }: { node: OrgChartNodeData }) {
  const hasChildren = node.children.length > 0;
  return (
    <div className="flex flex-col items-center">
      <OrgCard node={node} />
      {hasChildren ? (
        <div className="flex flex-col items-center">
          <div className="h-6 w-px bg-slate-300" />
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-px bg-slate-300" />
            <div className="flex items-start">
              {node.children.map(child => (
                <div key={child.id} className="flex flex-col items-center px-4">
                  <div className="h-6 w-px bg-slate-300" />
                  <OrgChartNode node={child} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountabilityPdfPreviewDialog({
  formId,
  onClose,
}: {
  formId: string;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ form: any }>(
          `/accountability-forms/${formId}`
        );
        if (cancelled) return;
        const pdfBlob = await generateAccountabilityFormPDF(response.form);
        if (cancelled) return;
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to generate accountability PDF:', error);
          toast.error('Failed to generate PDF preview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <AppDialogFrame className="max-w-3xl h-[min(90dvh,920px)] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
        <AppDialogGradientHeader
          title="New Accountability Form"
          description="Accountability Form Preview"
        />
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Generating preview...
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="h-full w-full border-0"
              title="Accountability Form Preview"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Preview not available
            </div>
          )}
        </div>
        <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3 sm:gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {pdfUrl && (
            <Button
              size="sm"
              asChild
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <a href={pdfUrl} download={`accountability-form-${formId}.pdf`}>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

export default AssetMovementTab;
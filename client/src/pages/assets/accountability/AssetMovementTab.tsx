'use client';

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, GitBranch, Eye } from 'lucide-react';
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
import { MermaidOrgChart } from './components/MermaidOrgChart';
import {
  buildMermaidOrgModel,
  type MovementInput,
} from './mermaidOrgChartModel';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import { transformApiAssetToAsset } from '../assets-list/useAssetsData';
import type { Asset } from '../assets-list/assetsComponents/assetTable/assetData';

// Lazy-loaded to avoid a circular import (assetViewModal -> AssetMovementTab).
const AssetViewModal = lazy(() =>
  import('../assets-list/assetsComponents/assetViewModal').then(
    m => ({ default: m.AssetViewModal })
  )
);

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
      returnFormId?: string | null;
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
        returnFormId?: string | null;
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

  // Asset details modal state (clicking an Asset box in the diagram)
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);

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

  const handleViewReturnForm = useCallback(async (formIdToView: string) => {
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
  }, []);

  const handleViewTransferForm = useCallback(async (formIdToView: string) => {
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
  }, []);

  const handleViewAccountabilityForm = useCallback((formIdToView: string) => {
    setAccountabilityPreviewId(formIdToView);
  }, []);

  const handleViewAsset = useCallback(async (assetIdOrCode: string) => {
    if (!assetIdOrCode) return;
    try {
      const response = await api.get<{ assets: AssetResponseDto[] }>(
        `/assets/${encodeURIComponent(assetIdOrCode)}`
      );
      const apiAsset = response.assets?.[0];
      if (!apiAsset) {
        toast.error('Asset details not available');
        return;
      }
      setViewAsset(transformApiAssetToAsset(apiAsset));
    } catch (error) {
      console.error('Failed to load asset details:', error);
      toast.error('Failed to load asset details');
    }
  }, []);

  const movementInput = useMemo<MovementInput | null>(() => {
    if (formId && formData) {
      return {
        mode: 'form',
        form: {
          id: formData.form.id,
          formNumber: formData.form.formNumber,
          status: formData.form.status,
        },
        assets: formData.assets,
      };
    }
    if (assetId && assetData) {
      return {
        mode: 'asset',
        asset: {
          id: assetData.asset.id,
          code: assetData.asset.code,
          name: assetData.asset.name,
        },
        forms: assetData.forms,
      };
    }
    return null;
  }, [formId, assetId, formData, assetData]);

  const orgModel = useMemo(
    () =>
      movementInput
        ? buildMermaidOrgModel(movementInput, {
            onViewReturn: handleViewReturnForm,
            onViewTransfer: handleViewTransferForm,
            onViewNew: handleViewAccountabilityForm,
            onViewAccountabilityForm: handleViewAccountabilityForm,
            onViewAsset: handleViewAsset,
          })
        : null,
    [
      movementInput,
      handleViewReturnForm,
      handleViewTransferForm,
      handleViewAccountabilityForm,
      handleViewAsset,
    ]
  );

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
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <span className="text-sm">Loading asset movement...</span>
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

      {orgModel && (
        <MermaidOrgChart
          model={orgModel}
          title={formId ? 'Asset Movement - Accountability Form' : 'Asset Movement - Org Chart'}
        />
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

      {/* Asset details modal (clicked Asset box) */}
      {viewAsset && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
            </div>
          }
        >
          <AssetViewModal
            isOpen
            onClose={() => setViewAsset(null)}
            asset={viewAsset}
            hideMovement
          />
        </Suspense>
      )}
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
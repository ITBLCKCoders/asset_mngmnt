'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import {
  generateAccountabilityFormPDF,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';

export interface AccountabilityDeclinedDetail {
  formId: string;
  declineReason: string;
  formNumber?: string;
}

interface AccountabilityDeclinedNotificationDialogProps {
  detail: AccountabilityDeclinedDetail | null;
  onClose: () => void;
}

export function AccountabilityDeclinedNotificationDialog({
  detail,
  onClose,
}: AccountabilityDeclinedNotificationDialogProps) {
  const open = !!detail;
  const [form, setForm] = useState<AccountabilityForm | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pdfObjectUrlRef = useRef<string | null>(null);

  const revokePdfObjectUrl = useCallback(() => {
    if (pdfObjectUrlRef.current) {
      URL.revokeObjectURL(pdfObjectUrlRef.current);
      pdfObjectUrlRef.current = null;
    }
    setPdfUrl(null);
  }, []);

  useEffect(() => {
    if (!open || !detail?.formId) {
      setForm(null);
      revokePdfObjectUrl();
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadingForm(true);
    setForm(null);
    setLoadError(null);

    api
      .get(`/accountability-forms/${detail.formId}`)
      .then((res: { form?: AccountabilityForm }) => {
        if (cancelled || !res.form) return;
        setForm(res.form);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Could not load accountability form');
          setLoadError('Could not load this form. You can close this dialog and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, detail?.formId, revokePdfObjectUrl]);

  useEffect(() => {
    if (!form) {
      revokePdfObjectUrl();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const blob = await generateAccountabilityFormPDF(form);
        if (cancelled) return;
        revokePdfObjectUrl();
        const url = URL.createObjectURL(blob);
        pdfObjectUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (!cancelled) toast.error('Could not generate PDF preview');
      }
    })();

    return () => {
      cancelled = true;
      revokePdfObjectUrl();
    };
  }, [form, revokePdfObjectUrl]);

  const handleDownload = async () => {
    if (!form) return;
    try {
      const blob = await generateAccountabilityFormPDF(form);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Accountability-${form.formNumber || form.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const reason =
    detail?.declineReason?.trim() ||
    form?.declineReason?.trim() ||
    'No reason provided.';

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <AppDialogFrame
        className="max-w-4xl w-[min(96vw,56rem)] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0 outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-2xl"
        showCloseButton
      >
        <AppDialogGradientHeader
          title={
            detail?.formNumber
              ? `Declined — ${detail.formNumber}`
              : 'Accountability form declined'
          }
          className="shrink-0 pb-3 pt-4 sm:pb-3 sm:pt-4"
        />
        <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-2 sm:px-6 max-h-[min(78vh,calc(100vh-7rem))]">
          <div>
            <p className="text-sm font-semibold text-slate-800">Decline reason</p>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3">
              {reason}
            </p>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Form PDF</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!form || loadingForm}
                onClick={() => void handleDownload()}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download PDF
              </Button>
            </div>
            {loadingForm && (
              <p className="text-sm text-muted-foreground">Loading form…</p>
            )}
            {loadError && (
              <p className="text-sm text-destructive">{loadError}</p>
            )}
            {!loadingForm && pdfUrl && (
              <iframe
                title="Accountability form PDF"
                src={pdfUrl}
                className="h-[min(60vh,520px)] w-full rounded-lg border border-slate-200 bg-white"
              />
            )}
            {!loadingForm && !loadError && form && !pdfUrl && (
              <p className="text-sm text-muted-foreground">
                Preview unavailable — use Download PDF.
              </p>
            )}
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter className="shrink-0 !py-2 sm:!py-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}

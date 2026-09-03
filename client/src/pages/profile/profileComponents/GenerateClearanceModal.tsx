'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface GenerateClearanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabledFormNumbers: string[];
  onConfirm: () => Promise<void>;
}

export function GenerateClearanceModal({ open, onOpenChange, disabledFormNumbers, onConfirm }: GenerateClearanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Generate Accountability Clearance Form
          </DialogTitle>
          <DialogDescription>
            You have no active accountability forms and all previous forms are disabled. This will generate a unified clearance certificate that will go through <span className="font-semibold text-slate-900">Approver → IT Asset → Admin Asset → HR Receiver</span> for approval. Once approved by all departments, you can print it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference disabled forms</p>
            <p className="text-sm mt-1 text-slate-700 break-words">{disabledFormNumbers.length ? disabledFormNumbers.join(', ') : '—'}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Clicking Generate Clearance will send an OTP to your registered email. Once verified, your signature, date and time will appear under <span className="font-medium">Employee Undergoing Clearance</span> on the certificate.
          </p>
          <p className="text-xs text-muted-foreground">
            After submission you will see a notification: <span className="font-medium">Request has been sent to IT department</span> and the form will appear in approvals.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Clearance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

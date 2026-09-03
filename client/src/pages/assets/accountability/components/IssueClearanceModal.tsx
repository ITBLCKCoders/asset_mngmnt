'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { ClearanceScope } from '@/pages/assets/accountability/accountabilityFormTypes';

interface IssueClearanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  eligibleScopes: ClearanceScope[];
  disabledFormNumbersByScope: Record<ClearanceScope, string[]>;
  onConfirm: (scopes: ClearanceScope[]) => Promise<void>;
}

export function IssueClearanceModal({
  open,
  onOpenChange,
  userName,
  eligibleScopes,
  disabledFormNumbersByScope,
  onConfirm,
}: IssueClearanceModalProps) {
  const { user: currentUser } = useCurrentUser();
  const [checked, setChecked] = useState<Record<ClearanceScope, boolean>>({
    IT: true,
    Admin: true,
    Unified: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setChecked({
        IT: eligibleScopes.includes('IT'),
        Admin: eligibleScopes.includes('Admin'),
        Unified: eligibleScopes.includes('Unified'),
      });
    }
  }, [open, eligibleScopes]);

  const selectedScopes = (['IT', 'Admin'] as ClearanceScope[]).filter(
    s => eligibleScopes.includes(s) && checked[s]
  );

  const handleConfirm = async () => {
    if (selectedScopes.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedScopes);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const processorName = currentUser
    ? `${currentUser.firstName ?? (currentUser as any).first_name ?? ''} ${currentUser.lastName ?? (currentUser as any).last_name ?? ''}`.trim() || currentUser.name || 'Processor'
    : 'Processor';
  const processorSig = (currentUser as any)?.digitalSignature ?? (currentUser as any)?.digital_signature ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Issue an accountability clearance
          </DialogTitle>
          <DialogDescription>
            {userName} will have <span className="font-semibold text-slate-900">0 remaining accountability</span> for the selected scope(s). Check the scope(s) to generate a clearance certificate. By default all eligible scopes are checked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {eligibleScopes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No eligible clearance scope.</p>
          ) : (
            eligibleScopes.map(scope => (
              <label
                key={scope}
                className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked[scope]}
                  onCheckedChange={v => setChecked(prev => ({ ...prev, [scope]: !!v }))}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="font-medium text-sm">
                    {scope === 'IT' ? 'IT Clearance' : 'Admin Clearance'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Reference disabled: {(disabledFormNumbersByScope[scope] ?? []).join(', ') || ' —'}
                  </span>
                </span>
              </label>
            ))
          )}

          <Separator />

          <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issued by</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{processorName}</p>
                <p className="text-xs text-muted-foreground">
                  {now.toLocaleDateString()} {now.toLocaleTimeString()}
                </p>
              </div>
              {processorSig && (
                <img
                  src={processorSig}
                  alt="Signature"
                  className="h-10 max-w-[120px] object-contain border bg-white rounded px-1"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Issuing this certificate routes it for approval. The clearance PDF carries <span className="font-medium">Copy for IT, Copy for Admin, Department Head, Employee Undergoing Clearance, and HR Copy (201 File)</span> signature blocks.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Skip
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || selectedScopes.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue {selectedScopes.length > 0 ? `(${selectedScopes.join(', ')})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

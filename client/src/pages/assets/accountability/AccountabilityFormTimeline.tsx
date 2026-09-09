import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AccountabilityForm } from './accountabilityFormTypes';

/**
 * Lifecycle timeline for a standard accountability form:
 * Created -> IT/Admin Copy Signed -> Owner Signed -> Approved -> HR Received Copy (201 File)
 *
 * Steps are derived from the form's own timestamps (always reliable).
 * The first incomplete step is highlighted as the current next step, the
 * steps after it render as upcoming, and a declined form renders its
 * remaining steps as cancelled with a red terminal node.
 */
export function AccountabilityFormTimeline({
  form,
}: {
  form: AccountabilityForm;
}) {
  const isDeclined = form.status === 'Declined';
  const copyType = form.adminCopyCopyType ?? 'IT';

  const done = [
    !!form.created_at,
    !!form.adminCopySignedAt,
    !!form.signed_at,
    !!form.approvedAt || !!form.deptHeadSignedAt,
    !!form.receivedCopy201FileSignedAt,
  ];

  // The next actionable step is the first incomplete one; a fully completed
  // or declined form has no current step.
  const firstIncomplete = done.findIndex(d => !d);
  const currentStep =
    isDeclined || firstIncomplete === -1 ? null : firstIncomplete + 1;

  type StepState = 'done' | 'current' | 'upcoming' | 'cancelled';

  const stateOf = (step: number): StepState =>
    done[step - 1]
      ? 'done'
      : isDeclined
        ? 'cancelled'
        : step === currentStep
          ? 'current'
          : 'upcoming';

  const formatDate = (d: string | null | undefined) =>
    d && !isNaN(new Date(d).getTime())
      ? new Date(d).toLocaleDateString() +
        ' ' +
        new Date(d).toLocaleTimeString()
      : null;

  const stepNode = (state: StepState, stepIndex: number) => (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        state === 'done'
          ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-500/25'
          : state === 'current'
            ? 'animate-pulse border-amber-500 bg-amber-500/10 text-amber-600 shadow-md shadow-amber-500/25 ring-4 ring-amber-500/15 dark:text-amber-300'
            : state === 'cancelled'
              ? 'border-muted-foreground/20 bg-muted/30 text-muted-foreground/70'
              : 'border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground'
      }`}
    >
      {state === 'done' ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : state === 'current' ? (
        <Clock className="h-5 w-5" />
      ) : state === 'cancelled' ? (
        <Ban className="h-4 w-4" />
      ) : (
        <span className="text-sm font-semibold">{stepIndex}</span>
      )}
    </div>
  );

  const stepContent = (
    title: string,
    state: StepState,
    date: string | null,
    signerName?: string | null,
    extra?: React.ReactNode
  ) => {
    const badgeClass =
      state === 'current'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
        : state === 'done'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
          : 'bg-muted text-muted-foreground';
    const cardClass =
      state === 'current'
        ? 'border-amber-300/70 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/20'
        : state === 'upcoming'
          ? 'border-dashed border-border/50 bg-transparent opacity-80'
          : state === 'cancelled'
            ? 'border-border/50 bg-muted/20 opacity-70'
            : 'border-border/60 bg-muted/30';
    const label =
      state === 'done'
        ? (date ?? '—')
        : state === 'current'
          ? 'Pending'
          : state === 'cancelled'
            ? 'Cancelled'
            : 'Upcoming';
    return (
      <div className={`rounded-lg border px-3 py-2.5 ${cardClass}`}>
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <span
          className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {label}
        </span>
        {signerName ? (
          <p className="mt-1.5 text-xs text-muted-foreground">— {signerName}</p>
        ) : null}
        {extra}
      </div>
    );
  };

  const connector = (toState: StepState) => (
    <div
      className={`w-0.5 flex-1 rounded-full ${
        toState === 'done'
          ? 'bg-green-500'
          : toState === 'current'
            ? 'bg-gradient-to-b from-green-500 to-amber-500'
            : toState === 'cancelled'
              ? 'bg-red-400/40'
              : 'bg-muted-foreground/20'
      }`}
      aria-hidden
    />
  );

  return (
    <div className="relative py-1">
      {/* Step 1: Created */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(stateOf(1), 1)}
          {connector(stateOf(2))}
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            'Form created',
            stateOf(1),
            formatDate(form.created_at),
            form.issuer
              ? `${form.issuer.first_name} ${form.issuer.last_name}`.trim() ||
                  undefined
              : undefined
          )}
        </div>
      </div>

      {/* Step 2: IT/Admin copy signed */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(stateOf(2), 2)}
          {connector(stateOf(3))}
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            `${copyType} copy signed`,
            stateOf(2),
            formatDate(form.adminCopySignedAt),
            stateOf(2) === 'done'
              ? form.adminCopySignerName ?? undefined
              : undefined
          )}
        </div>
      </div>

      {/* Step 3: Owner signed */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(stateOf(3), 3)}
          {connector(stateOf(4))}
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            'Signed by asset owner',
            stateOf(3),
            formatDate(form.signed_at),
            stateOf(3) === 'done'
              ? `${form.user.first_name} ${form.user.last_name}`.trim() ||
                undefined
              : undefined
          )}
        </div>
      </div>

      {/* Step 4: Approved (approver/sub-approver) */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {stepNode(stateOf(4), 4)}
          {connector(stateOf(5))}
        </div>
        <div className="flex-1 min-w-0 pb-4">
          {stepContent(
            'Approved by department head',
            stateOf(4),
            formatDate(form.deptHeadSignedAt ?? form.approvedAt),
            stateOf(4) === 'done'
              ? form.deptHeadSignedByName ?? form.approvedByName ?? undefined
              : undefined
          )}
        </div>
      </div>

      {/* Step 5: HR received copy for 201 file (or declined terminal node) */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          {isDeclined ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white shadow-md shadow-red-500/25">
              <XCircle className="h-5 w-5" />
            </div>
          ) : (
            stepNode(stateOf(5), 5)
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isDeclined ? (
            <div className="rounded-lg border border-red-300/70 bg-red-50/60 px-3 py-2.5 dark:border-red-800/50 dark:bg-red-950/20">
              <p className="font-semibold text-sm text-foreground">
                Declined by asset owner
              </p>
              <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                {formatDate(form.updated_at) ?? '—'}
              </span>
              {form.declineReason ? (
                <p className="mt-2 text-sm leading-snug text-red-600 dark:text-red-400">
                  Reason: {form.declineReason}
                </p>
              ) : null}
            </div>
          ) : (
            stepContent(
              'Received Copy for 201 File (HR)',
              stateOf(5),
              formatDate(form.receivedCopy201FileSignedAt),
              stateOf(5) === 'done'
                ? form.receivedCopy201FileSignedByName ?? undefined
                : undefined
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder used while a detail fetch is in flight. */
export function AccountabilityFormTimelineSkeleton() {
  return (
    <div className="space-y-6 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-9 w-9 rounded-full" />
            {i < 4 ? (
              <Skeleton className="w-0.5 flex-1 min-h-6 rounded-full" />
            ) : null}
          </div>
          <div className="flex-1 min-w-0 pb-4">
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

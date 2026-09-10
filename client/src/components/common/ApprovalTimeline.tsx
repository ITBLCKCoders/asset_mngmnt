import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react';

export interface ApprovalTimelineStep {
  title: string;
  date?: string | null;
  signerName?: string | null;
  done: boolean;
}

export function ApprovalTimeline({
  steps,
  isDeclined = false,
  declinedAt,
  declineReason,
}: {
  steps: ApprovalTimelineStep[];
  isDeclined?: boolean;
  declinedAt?: string | null;
  declineReason?: string | null;
}) {
  const firstIncomplete = steps.findIndex(step => !step.done);
  const currentStep = isDeclined || firstIncomplete === -1 ? null : firstIncomplete;
  type StepState = 'done' | 'current' | 'upcoming' | 'cancelled';
  const stateOf = (index: number): StepState =>
    steps[index].done
      ? 'done'
      : isDeclined
        ? 'cancelled'
        : index === currentStep
          ? 'current'
          : 'upcoming';
  const formatDate = (date?: string | null) =>
    date && !Number.isNaN(new Date(date).getTime())
      ? `${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString()}`
      : null;
  const node = (state: StepState, index: number) => (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
      state === 'done'
        ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-500/25'
        : state === 'current'
          ? 'animate-pulse border-amber-500 bg-amber-500/10 text-amber-600 shadow-md shadow-amber-500/25 ring-4 ring-amber-500/15 dark:text-amber-300'
          : state === 'cancelled'
            ? 'border-muted-foreground/20 bg-muted/30 text-muted-foreground/70'
            : 'border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground'
    }`}>
      {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : state === 'current' ? <Clock className="h-5 w-5" /> : state === 'cancelled' ? <Ban className="h-4 w-4" /> : <span className="text-sm font-semibold">{index + 1}</span>}
    </div>
  );
  const connector = (state: StepState) => (
    <div className={`w-0.5 flex-1 rounded-full ${state === 'done' ? 'bg-green-500' : state === 'current' ? 'bg-gradient-to-b from-green-500 to-amber-500' : state === 'cancelled' ? 'bg-red-400/40' : 'bg-muted-foreground/20'}`} aria-hidden />
  );
  const content = (step: ApprovalTimelineStep, state: StepState) => {
    const badge = state === 'current'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      : state === 'done'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
        : 'bg-muted text-muted-foreground';
    const card = state === 'current'
      ? 'border-amber-300/70 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/20'
      : state === 'upcoming'
        ? 'border-dashed border-border/50 bg-transparent opacity-80'
        : state === 'cancelled'
          ? 'border-border/50 bg-muted/20 opacity-70'
          : 'border-border/60 bg-muted/30';
    const label = state === 'done' ? (formatDate(step.date) ?? '—') : state === 'current' ? 'Pending' : state === 'cancelled' ? 'Cancelled' : 'Upcoming';
    return <div className={`rounded-lg border px-3 py-2.5 ${card}`}>
      <p className="font-semibold text-sm text-foreground">{step.title}</p>
      <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${badge}`}>{label}</span>
      {step.signerName ? <p className="mt-1.5 text-xs text-muted-foreground">— {step.signerName}</p> : null}
    </div>;
  };

  return <div className="relative py-1">
    {steps.map((step, index) => {
      const state = stateOf(index);
      const isLast = index === steps.length - 1;
      return <div key={step.title} className="flex gap-4">
        <div className="flex flex-col items-center">
          {isDeclined && isLast ? <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white shadow-md shadow-red-500/25"><XCircle className="h-5 w-5" /></div> : node(state, index)}
          {!isLast && connector(stateOf(index + 1))}
        </div>
        <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-4'}`}>
          {isDeclined && isLast ? <div className="rounded-lg border border-red-300/70 bg-red-50/60 px-3 py-2.5 dark:border-red-800/50 dark:bg-red-950/20">
            <p className="font-semibold text-sm text-foreground">Declined</p>
            <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">{formatDate(declinedAt) ?? '—'}</span>
            {declineReason ? <p className="mt-2 text-sm leading-snug text-red-600 dark:text-red-400">Reason: {declineReason}</p> : null}
          </div> : content(step, state)}
        </div>
      </div>;
    })}
  </div>;
}

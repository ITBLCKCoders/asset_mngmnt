import { addMonths, startOfDay } from 'date-fns';

// When API exposes last_maintenance_date, prefer it as anchor over purchase/created dates.

const INTERVAL_BY_SCHEDULE: Record<string, number> = {
  Monthly: 1,
  Quarterly: 3,
  'Semi-Annual': 6,
  Annually: 12,
};

function parseInputDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export type NextMaintenanceAnchorInput = {
  purchaseDate?: string | Date | null;
  createdAt?: string | Date | null;
  /** If set, used first so "next" follows last completed service. */
  lastMaintenanceDate?: string | Date | null;
};

/**
 * Projected next maintenance date from schedule + anchor (last service, else purchase, else created).
 * @param now — inject for tests; defaults to current time.
 */
export function computeNextMaintenanceDate(
  schedule: string | null | undefined,
  anchors: NextMaintenanceAnchorInput,
  now: Date = new Date()
): Date | null {
  const key = String(schedule ?? '').trim();
  const intervalMonths = INTERVAL_BY_SCHEDULE[key];
  if (intervalMonths == null) return null;

  const anchor =
    parseInputDate(anchors.lastMaintenanceDate) ??
    parseInputDate(anchors.purchaseDate) ??
    parseInputDate(anchors.createdAt) ??
    null;
  if (!anchor) return null;

  const todayStart = startOfDay(now);
  let next = startOfDay(anchor);

  if (next.getTime() > todayStart.getTime()) return next;

  let guard = 0;
  while (next.getTime() < todayStart.getTime() && guard < 5000) {
    next = addMonths(next, intervalMonths);
    guard += 1;
  }
  return next;
}

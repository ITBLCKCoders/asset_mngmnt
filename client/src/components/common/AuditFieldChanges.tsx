import { auditFieldLabel } from '@/utils/auditFieldLabels';

const FK_LOOKUP_KEYS = [
  'department_id',
  'location_id',
  'location_room_id',
  'category_id',
  'type_id',
  'company_id',
  'user_id',
  'assigned_to',
  'brand_id',
  'supplier_id',
  'builder_id',
] as const;

export type AuditFkLookupKey = (typeof FK_LOOKUP_KEYS)[number];

export type AuditFieldLookups = Partial<
  Record<AuditFkLookupKey, Record<string, string>>
>;

function uuidLooksLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s.trim()
  );
}

/**
 * Single map of entity id → display label for replacing UUIDs in prose (details, timeline).
 */
export function buildMergedIdLabelMap(
  lookups: AuditFieldLookups | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!lookups) return out;
  for (const m of Object.values(lookups)) {
    if (!m) continue;
    for (const [id, label] of Object.entries(m)) {
      if (id && label) out[id] = label;
    }
  }
  return out;
}

const UNRESOLVED_UUID_LABEL = 'Unknown reference';

/**
 * Replaces UUID substrings in free-text audit fields using merged entity labels.
 * Any UUID still unknown after lookup is shown as a short placeholder (never raw hex).
 */
export function formatAuditPlainText(
  text: string,
  mergedIdLabels: Record<string, string>
): string {
  if (!text) return text;
  return text.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    match => {
      const resolved = mergedIdLabels[match];
      if (resolved) return resolved;
      return uuidLooksLike(match) ? UNRESOLVED_UUID_LABEL : match;
    }
  );
}

const LONG_TEXT_KEYS = new Set(['description', 'location_notes']);

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

function resolveIdLabel(
  key: string,
  idStr: string,
  lookups: AuditFieldLookups | undefined
): string | null {
  if ((FK_LOOKUP_KEYS as readonly string[]).includes(key)) {
    const map = lookups?.[key as AuditFkLookupKey];
    if (map && map[idStr]) return map[idStr];
  }
  if (key === 'builder_ids') {
    const map = lookups?.builder_id;
    if (map && map[idStr]) return map[idStr];
  }
  if (lookups) {
    for (const m of Object.values(lookups)) {
      if (m && m[idStr]) return m[idStr];
    }
  }
  return null;
}

function formatScalarForAudit(
  key: string,
  value: unknown,
  lookups: AuditFieldLookups | undefined
): string {
  if (isEmpty(value)) return '(empty)';
  if (Array.isArray(value) && value.length === 0) return '(empty)';

  if (key === 'is_old_unit') {
    return value === 1 || value === true || value === '1' ? 'Yes' : 'No';
  }

  let s: string;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    s = JSON.stringify(value);
  } else if (Array.isArray(value)) {
    return value
      .map(v => formatScalarForAudit(key, v, lookups))
      .join(', ');
  } else {
    s = String(value);
  }

  const resolved = resolveIdLabel(key, s, lookups);
  if (resolved) return resolved;
  if (uuidLooksLike(s)) return UNRESOLVED_UUID_LABEL;

  if (key === 'image_url' || s === '[image]') {
    return s === '[image]' ? 'Image attached' : truncate(s, 80);
  }

  if (
    key.includes('url') ||
    (typeof s === 'string' && s.startsWith('http'))
  ) {
    return truncate(s, 80);
  }

  if (LONG_TEXT_KEYS.has(key)) {
    return truncate(s, 200);
  }

  return s;
}

function formatDisplayValue(
  key: string,
  value: unknown,
  lookups: AuditFieldLookups | undefined
): string {
  return formatScalarForAudit(key, value, lookups);
}

function collectKeys(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): string[] {
  const set = new Set<string>([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);
  return Array.from(set).sort();
}

/**
 * Coerces API/DB audit snapshots to plain objects (handles JSON strings and null).
 */
export function parseAuditFieldRecord(
  value: unknown
): Record<string, unknown> | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || t === 'null') return undefined;
    try {
      const parsed = JSON.parse(t) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function resolvedAuditRecords(
  oldValues: unknown,
  newValues: unknown
): { oldRec: Record<string, unknown>; newRec: Record<string, unknown> } {
  return {
    oldRec: parseAuditFieldRecord(oldValues) ?? {},
    newRec: parseAuditFieldRecord(newValues) ?? {},
  };
}

export interface AuditFieldChangesProps {
  oldValues: Record<string, unknown> | null | undefined;
  newValues: Record<string, unknown> | null | undefined;
  lookups?: AuditFieldLookups;
  className?: string;
  /** When true, omit wrapper spacing (inline use). */
  compact?: boolean;
}

/**
 * Renders old → new lines for audit log field snapshots.
 */
export function AuditFieldChanges({
  oldValues,
  newValues,
  lookups,
  className = '',
  compact = false,
}: AuditFieldChangesProps) {
  const { oldRec, newRec } = resolvedAuditRecords(oldValues, newValues);
  const keys = collectKeys(oldRec, newRec);
  if (keys.length === 0) return null;

  const items = keys.map(key => {
    const rawOld = oldRec[key];
    const rawNew = newRec[key];
    const label = auditFieldLabel(key);
    const from = formatDisplayValue(key, rawOld, lookups);
    const to = formatDisplayValue(key, rawNew, lookups);
    return { key, label, from, to };
  });

  const list = (
    <ul
      className={
        compact
          ? 'mt-1 space-y-0.5 text-xs text-muted-foreground list-none pl-0'
          : 'mt-2 space-y-1.5 text-sm text-muted-foreground list-none pl-0 border-l-2 border-muted pl-3'
      }
    >
      {items.map(({ key, label, from, to }) => (
        <li key={key}>
          <span className="font-medium text-foreground/90">{label}:</span>{' '}
          <span className="line-through decoration-muted-foreground/50">
            {from}
          </span>{' '}
          <span aria-hidden="true">→</span>{' '}
          <span>{to}</span>
        </li>
      ))}
    </ul>
  );

  if (compact) return <div className={className}>{list}</div>;

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Changes
      </p>
      {list}
    </div>
  );
}

/** True when a normalized old/new pair has at least one field key (supports JSON strings and one-sided snapshots). */
export function hasAuditFieldChanges(
  oldValues: unknown,
  newValues: unknown
): boolean {
  const { oldRec, newRec } = resolvedAuditRecords(oldValues, newValues);
  return collectKeys(oldRec, newRec).length > 0;
}

/** Short summary for tables: "3 fields" or first field pair truncated. */
export function auditChangesSummary(
  oldValues: unknown,
  newValues: unknown,
  maxLen = 120,
  lookups?: AuditFieldLookups
): string {
  const { oldRec, newRec } = resolvedAuditRecords(oldValues, newValues);
  const keys = collectKeys(oldRec, newRec);
  if (keys.length === 0) return '';
  if (keys.length === 1) {
    const k = keys[0];
    const label = auditFieldLabel(k);
    const from = formatDisplayValue(k, oldRec[k], lookups);
    const to = formatDisplayValue(k, newRec[k], lookups);
    const line = `${label}: ${from} → ${to}`;
    return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line;
  }
  return `${keys.length} fields changed`;
}

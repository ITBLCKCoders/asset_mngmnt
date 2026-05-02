/**
 * Builds parallel old/new snapshots for asset update audit logs.
 * Only includes user-meaningful columns that actually changed.
 */

export const ASSET_AUDIT_DIFF_KEYS = [
  'name',
  'description',
  'category_id',
  'type_id',
  'supplier',
  'brand',
  'model',
  'serial',
  'image_url',
  'purchase_date',
  'asset_value',
  'salvage_value',
  'depreciation_method',
  'useful_life_years',
  'annual_depreciation',
  'depreciation_start_date',
  'company_id',
  'location_id',
  'location_room_id',
  'department_id',
  'location_notes',
  'warranty_months',
  'condition',
  'maintenance_schedule',
  'status',
  'is_old_unit',
] as const;

export type AssetAuditDiffKey = (typeof ASSET_AUDIT_DIFF_KEYS)[number];

function normalizeForCompare(key: string, value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] ?? null;
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null;
    if (
      key === 'asset_value' ||
      key === 'salvage_value' ||
      key === 'annual_depreciation'
    ) {
      return String(Number(value));
    }
    if (key === 'is_old_unit' || key === 'warranty_months') {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    if (key === 'purchase_date' || key === 'depreciation_start_date') {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().split('T')[0] ?? null;
      }
    }
    if (
      key === 'asset_value' ||
      key === 'salvage_value' ||
      key === 'annual_depreciation'
    ) {
      const n = Number(t);
      return Number.isNaN(n) ? t : String(n);
    }
    return t;
  }
  return String(value);
}

/** Avoid storing full image URLs in audit JSON; mark presence of change only. */
function normalizeImageForAudit(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : '[image]';
}

export function buildAssetUpdateAuditDiff(
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>
): {
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  changeCount: number;
} {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const key of ASSET_AUDIT_DIFF_KEYS) {
    const rawOld = oldRow[key];
    const rawNew = newRow[key];

    if (key === 'image_url') {
      const cmpOld = normalizeForCompare(key, rawOld);
      const cmpNew = normalizeForCompare(key, rawNew);
      if (cmpOld !== cmpNew) {
        oldValues[key] = normalizeImageForAudit(rawOld);
        newValues[key] = normalizeImageForAudit(rawNew);
      }
      continue;
    }

    const cmpOld = normalizeForCompare(key, rawOld);
    const cmpNew = normalizeForCompare(key, rawNew);
    if (cmpOld !== cmpNew) {
      oldValues[key] = rawOld ?? null;
      newValues[key] = rawNew ?? null;
    }
  }

  return {
    oldValues,
    newValues,
    changeCount: Object.keys(oldValues).length,
  };
}

/**
 * Client-side "global" search over form/list payloads: walks nested objects
 * and matches a trimmed case-insensitive substring. Skips known binary /
 * signature fields and very long strings (e.g. base64).
 */

const SKIP_KEYS = new Set([
  'acknowledgments',
  'digitalSignature',
  'issuerSignature',
  'itCopySignature',
  'receivedCopy201FileSignature',
  'signed_digital_signature',
  'process_digital_signature',
  'dept_head_digital_signature',
  'it_manager_digital_signature',
  'condition_images',
  'pdf_file_path',
]);

const MAX_STRING_LEN = 500;

function collectSearchableStrings(value: unknown, depth: number): string[] {
  if (depth > 12) return [];
  if (value == null) return [];

  if (typeof value === 'string') {
    return value.length <= MAX_STRING_LEN ? [value] : [];
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => collectSearchableStrings(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: string[] = [];
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_KEYS.has(key)) continue;
      out.push(...collectSearchableStrings(v, depth + 1));
    }
    return out;
  }
  return [];
}

/** True if query is empty, or if any searchable string in `data` contains the query (case-insensitive). */
export function matchesFormListSearch(data: unknown, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const haystack = collectSearchableStrings(data, 0)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

const ALL_VALUE = 'all';

// Per-field key allowlists: which nested keys belong to each filter bucket.
// Used for multi-select filtering (formSearchFilterOptions).
const FIELD_KEY_MAP: Record<string, Set<string>> = {
  formNumber: new Set([
    'formNumber',
    'form_number',
    'formID',
    'form_batch_id',
    'return_batch_id',
    'batchKey',
    'id',
  ]),
  // Employee = the assignee/owner of the asset (user / employee_*). Excludes issuer fields.
  employee: new Set([
    'employee_name',
    'employee_id',
    'employee_designation',
    'employee_department',
    'employee_company',
    'user',
    // requester_* are intentionally NOT here to keep requester separate; borrow uses its own bucket
  ]),
  // Issued By = who created/issued the form (issuer, assigned_by, created_by). Separate from employee.
  issuedBy: new Set([
    'issuer',
    'assigned_by',
    'assignedBy',
    'created_by',
    'createdBy',
    'created_by_name',
    'creator_name',
    'creatorName',
    'processed_by',
    'processedBy',
    'issued_by',
    'issuedBy',
  ]),
  asset: new Set([
    'asset',
    'assets',
    'code',
    'asset_code',
    'asset_name',
    'category',
    'category_name',
    'type_name',
    'name',
    'description',
    'serialNo',
    'serial_no',
  ]),
  department: new Set([
    'department',
    'employee_department',
    'employee_department_name',
    'requester_department_name',
    'form_department',
    'user_department',
    'department_id',
  ]),
  company: new Set([
    'company',
    'employee_company',
    'employee_company_logo_url',
    'company_id',
    'company_name',
  ]),
  // Checklist/borrow/approval specifics
  status: new Set(['status']),
  notes: new Set(['notes', 'remarks', 'return_notes']),
  // returner/fromUser/toUser/requester buckets are scoped to their parent keys to avoid leaking into issuedBy
  returner: new Set(['user', 'employee_name', 'assignment']),
  fromUser: new Set(['user', 'assignment', 'from_user', 'fromUser']),
  toUser: new Set(['new_assigned_user', 'assigned_to', 'recipient', 'to_user', 'toUser']),
  requester: new Set([
    'requester_first_name',
    'requester_last_name',
    'requester_email',
    'requester_department_name',
    'requester',
    'requester_id',
  ]),
  purpose: new Set(['purpose', 'reason', 'expected_return_date', 'borrow_scope']),
  type: new Set(['type_onboarding', 'type_offboarding', 'checklist_data', 'asset_scope_type']),
  receivedBy: new Set(['received_by', 'receivedBy']),
};

function collectSearchableStringsForKeys(
  value: unknown,
  allowedKeys: Set<string>,
  depth: number
): string[] {
  if (depth > 12) return [];
  if (value == null) return [];
  // Primitives without an allowed ancestor key are NOT searchable — must be under an allowed key
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [];
  if (Array.isArray(value)) {
    return value.flatMap(item => collectSearchableStringsForKeys(item, allowedKeys, depth + 1));
  }
  if (typeof value === 'object') {
    const out: string[] = [];
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_KEYS.has(key)) continue;
      if (allowedKeys.has(key)) {
        out.push(...collectSearchableStrings(v, depth + 1));
      } else {
        out.push(...collectSearchableStringsForKeys(v, allowedKeys, depth + 1));
      }
    }
    return out;
  }
  return [];
}

/**
 * Multi-select filtered search: query is matched only against the selected field groups (OR union).
 * - If selectedFilters empty or includes 'all' => global search (matchesFormListSearch).
 * - Otherwise true if any selected field's bucket contains the query (case-insensitive).
 */
export function matchesFormListSearchWithFilters(
  data: unknown,
  rawQuery: string,
  selectedFilters: string[]
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const normalized = selectedFilters.filter(Boolean);
  if (normalized.length === 0 || normalized.includes(ALL_VALUE)) {
    return matchesFormListSearch(data, rawQuery);
  }
  for (const field of normalized) {
    const keys = FIELD_KEY_MAP[field];
    if (!keys) continue;
    const haystack = collectSearchableStringsForKeys(data, keys, 0).join(' ').toLowerCase();
    if (haystack.includes(q)) return true;
  }
  return false;
}

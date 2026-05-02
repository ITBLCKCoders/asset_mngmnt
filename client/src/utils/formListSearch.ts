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

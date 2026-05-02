export type ClientAssetScopeType = 'IT' | 'Admin' | 'Other';

/**
 * Classify a department-like name into IT/Admin/Other.
 * Mirrors server-side classifyDepartmentScopeByName to keep
 * asset list and PDFs consistent.
 */
export function classifyDepartmentScopeByName(
  name: string | null | undefined
): ClientAssetScopeType {
  const n = (name || '').toLowerCase();

  if (n.includes('it') || n.includes('information technology')) {
    return 'IT';
  }

  if (n.includes('admin') || n.includes('administration')) {
    return 'Admin';
  }

  return 'Other';
}

export function isITScope(name: string | null | undefined): boolean {
  return classifyDepartmentScopeByName(name) === 'IT';
}

export function isAdminScope(name: string | null | undefined): boolean {
  return classifyDepartmentScopeByName(name) === 'Admin';
}

/**
 * Parse a category department descriptor that may be a JSON string, a plain
 * object, or null/undefined. Returns the normalised `{ id, name, code }`
 * triplet (any field may be missing) or null when the input is empty/invalid.
 */
export function parseCategoryDepartment(
  raw: unknown
): { id?: string; name?: string; code?: string } | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as { id?: string; name?: string; code?: string };
      return o && typeof o === 'object' ? o : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return raw as { id?: string; name?: string; code?: string };
  }
  return null;
}

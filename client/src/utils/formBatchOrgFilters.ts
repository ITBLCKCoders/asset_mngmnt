/** Shared company/department filter helpers for return & transfer form batches. */

import { classifyDepartmentScopeByName } from '@/lib/assetScope';

type OrgRef = { id: string; name: string };

type AssignmentLike = {
  user?: {
    company?: OrgRef;
    department?: OrgRef;
  };
  department?: OrgRef | null;
} | null;

export type ReturnFormBatchLike = {
  form_department?: OrgRef | null;
  returns: Array<{ assignment?: AssignmentLike }>;
};

export type TransferFormBatchLike = {
  form_department?: OrgRef | null;
  new_assigned_user?: {
    company?: OrgRef;
    user_department?: OrgRef;
    department?: string | null;
  } | null;
  returns: Array<{ assignment?: AssignmentLike }>;
};

export function returnRowDepartmentId(
  batch: ReturnFormBatchLike,
  row: ReturnFormBatchLike['returns'][number]
): string {
  const a = row.assignment;
  return (
    a?.user?.department?.id ||
    a?.department?.id ||
    batch.form_department?.id ||
    ''
  );
}

export function returnBatchMatchesOrgFilters(
  batch: ReturnFormBatchLike,
  companyId: string,
  departmentId: string
): boolean {
  if (companyId) {
    const ok = batch.returns.some(
      r => r.assignment?.user?.company?.id === companyId
    );
    if (!ok) return false;
  }
  if (departmentId) {
    const ok = batch.returns.some(
      r => returnRowDepartmentId(batch, r) === departmentId
    );
    if (!ok) return false;
  }
  return true;
}

export function transferRowDepartmentId(
  row: TransferFormBatchLike['returns'][number]
): string {
  const a = row.assignment;
  return a?.user?.department?.id || a?.department?.id || '';
}

export function transferBatchMatchesOrgFilters(
  batch: TransferFormBatchLike,
  companyId: string,
  departmentId: string
): boolean {
  if (companyId) {
    const inRows = batch.returns.some(
      r => r.assignment?.user?.company?.id === companyId
    );
    const inRecipient = batch.new_assigned_user?.company?.id === companyId;
    if (!inRows && !inRecipient) return false;
  }
  if (departmentId) {
    const inRows = batch.returns.some(
      r => transferRowDepartmentId(r) === departmentId
    );
    const inRecipient =
      batch.new_assigned_user?.user_department?.id === departmentId;
    if (!inRows && !inRecipient) return false;
  }
  return true;
}

export function collectCompanyOptionsFromReturnBatches(
  batches: ReturnFormBatchLike[]
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const b of batches) {
    for (const r of b.returns) {
      const c = r.assignment?.user?.company;
      if (c?.id && c.name) map.set(c.id, c.name);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function collectDepartmentOptionsFromReturnBatches(
  batches: ReturnFormBatchLike[],
  companyId: string
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  const pool = companyId
    ? batches.filter(b =>
        b.returns.some(r => r.assignment?.user?.company?.id === companyId)
      )
    : batches;
  for (const b of pool) {
    if (b.form_department?.id && b.form_department?.name) {
      map.set(b.form_department.id, b.form_department.name);
    }
    for (const r of b.returns) {
      const a = r.assignment;
      const ud = a?.user?.department;
      const fd = a?.department;
      if (ud?.id && ud.name) map.set(ud.id, ud.name);
      else if (fd?.id && fd.name) map.set(fd.id, fd.name);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function collectCompanyOptionsFromTransferBatches(
  batches: TransferFormBatchLike[]
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const b of batches) {
    const rc = b.new_assigned_user?.company;
    if (rc?.id && rc.name) map.set(rc.id, rc.name);
    for (const r of b.returns) {
      const c = r.assignment?.user?.company;
      if (c?.id && c.name) map.set(c.id, c.name);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function collectDepartmentOptionsFromTransferBatches(
  batches: TransferFormBatchLike[],
  companyId: string
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  const pool = companyId
    ? batches.filter(b => {
        if (b.new_assigned_user?.company?.id === companyId) return true;
        return b.returns.some(r => r.assignment?.user?.company?.id === companyId);
      })
    : batches;
  for (const b of pool) {
    const rd = b.new_assigned_user?.user_department;
    if (rd?.id && rd.name) map.set(rd.id, rd.name);
    for (const r of b.returns) {
      const a = r.assignment;
      const ud = a?.user?.department;
      const fd = a?.department;
      if (ud?.id && ud.name) map.set(ud.id, ud.name);
      else if (fd?.id && fd.name) map.set(fd.id, fd.name);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Best-effort asset scope for a return row based on the asset's assignment
 * department (its category/IT vs Admin scope). Avoids the employee's department
 * to prevent Admin-scope forms leaking into the IT filter and vice versa.
 */
function assetScopeOfRow(row: { assignment?: AssignmentLike }): string {
  return classifyDepartmentScopeByName(row.assignment?.department?.name || '');
}

/** Classify a transfer batch by its assets' scope (IT/Admin). The form's category department is authoritative. */
export function transferBatchMatchesAssetType(
  batch: TransferFormBatchLike,
  scope: 'IT' | 'Admin'
): boolean {
  const rows = batch.returns || [];
  if (rows.some(r => assetScopeOfRow(r) === scope)) return true;
  return (
    classifyDepartmentScopeByName(batch.form_department?.name || '') === scope
  );
}

/** Classify a return batch by its assets' scope (IT/Admin). The form's category department is authoritative. */
export function returnBatchMatchesAssetType(
  batch: ReturnFormBatchLike,
  scope: 'IT' | 'Admin'
): boolean {
  const rows = batch.returns || [];
  if (rows.some(r => assetScopeOfRow(r) === scope)) return true;
  return (
    classifyDepartmentScopeByName(batch.form_department?.name || '') === scope
  );
}

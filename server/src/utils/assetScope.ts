import { Pool } from 'mysql2/promise';
import { getActiveCompany } from './activeCompany.js';

export interface AssetScope {
  companyId: string | null;
  departmentIds: string[] | null; // null means all departments (no filter)
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export type AssetScopeType = 'IT' | 'Admin' | 'Other';

export async function getAssetScope(
  pool: Pool,
  userId: string
): Promise<AssetScope> {
  const [userRows] = (await pool.execute(
    `SELECT u.company_id, r.name as role_name, r.asset_type, r.manager_role
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     WHERE u.userID = ?`,
    [userId]
  )) as any[];

  const user = userRows[0];
  if (!user) {
    return { companyId: null, departmentIds: null, isSuperAdmin: false, isAdmin: false };
  }

  const normalizedRoleName = String(user.role_name ?? '')
    .trim()
    .toLowerCase();
  const isSuperAdmin = normalizedRoleName === 'global admin';
  const isAdmin = normalizedRoleName === 'admin';
  let companyId = user.company_id;

  if (isSuperAdmin) {
    const activeCompany = await getActiveCompany(pool);
    if (activeCompany?.id) {
      companyId = activeCompany.id;
    } else {
      companyId = null;
    }
  }

  let departmentIds: string[] | null = null;

  // For Global Admin, we show everything for the company
  if (isSuperAdmin) {
    return { companyId, departmentIds: null, isSuperAdmin, isAdmin: false };
  }

  // Admin role: scoped to own company, sees ALL departments (both IT and Admin)
  if (isAdmin) {
    return { companyId: user.company_id, departmentIds: null, isSuperAdmin: false, isAdmin: true };
  }

  const managerRole = user.manager_role ?? 'none';
  const assetType = user.asset_type ?? null;

  // Determine effective scope
  const effectiveScope: 'it' | 'admin' | null =
    managerRole === 'overallManager'
      ? null
      : managerRole === 'itManager' || assetType === 'it'
        ? 'it'
        : managerRole === 'adminManager' || assetType === 'admin'
          ? 'admin'
          : null;

  if (effectiveScope) {
    let targetDeptPattern = '';
    if (effectiveScope === 'it') {
      targetDeptPattern = '%IT%';
    } else if (effectiveScope === 'admin') {
      targetDeptPattern = '%Admin%';
    }

    if (targetDeptPattern) {
      let sql = `SELECT departmentID 
         FROM asset_mngmnt_departments 
         WHERE (name LIKE ? OR name LIKE ? OR name LIKE ?) 
           AND deleted_at IS NULL`;
      const params: (string | number)[] = [
        targetDeptPattern,
        targetDeptPattern.replace('%IT%', '%Information Technology%'),
        targetDeptPattern.replace('%Admin%', '%Administration%'),
      ];

      if (companyId) {
        sql += ' AND company_id = ?';
        params.push(companyId);
      }

      const [deptRows] = (await pool.execute(sql, params)) as any[];

      departmentIds = deptRows.map((row: any) => row.departmentID);
    }
  }

  return { companyId, departmentIds, isSuperAdmin, isAdmin };
}

/** For borrow-request queue: Global Admin / unscoped managers see all scopes in company; IT/Admin roles see only their scope. */
export async function getBorrowRequestListScope(
  pool: Pool,
  userId: string
): Promise<{
  companyId: string | null;
  borrowScope: 'it' | 'admin' | null;
}> {
  const [userRows] = (await pool.execute(
    `SELECT u.company_id, r.name as role_name, r.asset_type, r.manager_role
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     WHERE u.userID = ?`,
    [userId]
  )) as any[];

  const user = userRows[0];
  if (!user) {
    return { companyId: null, borrowScope: null };
  }

  const normalizedRoleName = String(user.role_name ?? '')
    .trim()
    .toLowerCase();
  const isSuperAdmin = normalizedRoleName === 'global admin';
  let companyId = user.company_id;

  if (isSuperAdmin) {
    const activeCompany = await getActiveCompany(pool);
    if (activeCompany?.id) {
      companyId = activeCompany.id;
    } else {
      companyId = null;
    }
    return { companyId, borrowScope: null };
  }

  // Admin role: sees all scopes (both IT and Admin)
  if (normalizedRoleName === 'admin') {
    return { companyId: user.company_id, borrowScope: null };
  }

  const managerRole = user.manager_role ?? 'none';
  const assetType = user.asset_type ?? null;

  const effectiveScope: 'it' | 'admin' | null =
    managerRole === 'overallManager'
      ? null
      : managerRole === 'itManager' || assetType === 'it'
        ? 'it'
        : managerRole === 'adminManager' || assetType === 'admin'
          ? 'admin'
          : null;

  return { companyId, borrowScope: effectiveScope };
}

/**
 * Classify a department into IT/Admin/Other using the same naming patterns
 * that asset scope uses. This keeps server and client views of \"IT asset\"
 * vs \"Admin asset\" consistent without duplicating string checks.
 */
export function classifyDepartmentScopeByName(
  name: string | null | undefined
): AssetScopeType {
  const n = (name || '').toLowerCase();
  if (n.includes('it') || n.includes('information technology')) {
    return 'IT';
  }
  if (n.includes('admin') || n.includes('administration')) {
    return 'Admin';
  }
  return 'Other';
}

/**
 * Get department IDs for a given scope (it | admin). Used by dashboard when Global Admin
 * requests a specific scope. When companyId is provided, only departments for that company
 * are returned so that changing company shows correct data (e.g. available in movement chart).
 */
export async function getDepartmentIdsForScope(
  pool: Pool,
  scope: 'it' | 'admin',
  companyId?: string | null
): Promise<string[]> {
  const targetDeptPattern = scope === 'it' ? '%IT%' : '%Admin%';
  const patterns = [
    targetDeptPattern,
    targetDeptPattern === '%IT%'
      ? '%Information Technology%'
      : '%Administration%',
  ];
  let sql = `SELECT departmentID 
     FROM asset_mngmnt_departments 
     WHERE (name LIKE ? OR name LIKE ?) AND deleted_at IS NULL`;
  const params: (string | number)[] = [...patterns];
  if (companyId) {
    sql += ` AND company_id = ?`;
    params.push(companyId);
  }
  const [deptRows] = (await pool.execute(sql, params)) as any[];
  return deptRows.map((row: any) => row.departmentID);
}

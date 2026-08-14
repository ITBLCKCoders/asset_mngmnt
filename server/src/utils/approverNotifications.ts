/**
 * Helpers for notifying approver users (e.g. Manager Approver 1) when forms are signed.
 */
import { pool } from '../db.js';
import { getAssetScope, getDepartmentIdsForScope } from './assetScope.js';
import { getActiveCompany } from './activeCompany.js';

/**
 * Returns true if the given user is Manager Approver 1 (role or user_custodian_settings).
 * Used to restrict pending-approvals list and approve/decline actions.
 */
export async function isUserManagerApprover1(userId: string): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT 1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (r.manager_approver_1 = 1 OR COALESCE(uc.manager_approver_1, 0) = 1)
     LIMIT 1`,
    [userId]
  )) as [unknown[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Returns true if the given user is Manager Approver 2 (role or user_custodian_settings).
 * Used to restrict receive-pending lists and receive actions.
 */
export async function isUserManagerApprover2(userId: string): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT 1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (r.manager_approver_2 = 1 OR COALESCE(uc.manager_approver_2, 0) = 1)
     LIMIT 1`,
    [userId]
  )) as [unknown[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Returns user IDs of users who are Manager Approver 1 in the given department.
 * Checks role (asset_mngmnt_roles.manager_approver_1) and per-user override (user_custodian_settings.manager_approver_1).
 * Returns [] if departmentId is null.
 */
export async function getManagerApprover1UserIdsInDepartment(
  departmentId: string | null
): Promise<string[]> {
  if (departmentId == null || departmentId === '') {
    return [];
  }
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.department_id = ? AND u.is_active = 1
       AND (r.manager_approver_1 = 1 OR COALESCE(uc.manager_approver_1, 0) = 1)`,
    [departmentId]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/**
 * Manager Approver 1 users who can see a pending dept-head approval for a form in the
 * given department/company. Mirrors the Approvals "pending approvals" visibility
 * (getPendingApprovalsHandler):
 *  - Global Admins see all forms in the currently active company
 *  - everyone else sees only forms in their own department + company
 */
export async function getManagerApprover1UserIdsInDepartmentAndCompany(
  departmentId: string | null,
  companyId: string | null
): Promise<string[]> {
  if (
    departmentId == null ||
    departmentId === '' ||
    companyId == null ||
    companyId === ''
  ) {
    return [];
  }
  const activeCompany = await getActiveCompany(pool);
  const activeCompanyId = activeCompany?.id ?? null;
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.is_active = 1
       AND (r.manager_approver_1 = 1 OR COALESCE(uc.manager_approver_1, 0) = 1)
       AND (
         (u.company_id = ? AND u.department_id = ?)
         OR (LOWER(r.name) = 'global admin' AND ? = ?)
       )`,
    [companyId, departmentId, companyId, activeCompanyId]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/**
 * Returns user IDs of users who are Manager Approver 2 in the given department.
 * Checks role (asset_mngmnt_roles.manager_approver_2) and per-user override (user_custodian_settings.manager_approver_2).
 * Returns [] if departmentId is null.
 */
export async function getManagerApprover2UserIdsInDepartment(
  departmentId: string | null
): Promise<string[]> {
  if (departmentId == null || departmentId === '') {
    return [];
  }
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.department_id = ? AND u.is_active = 1
       AND (r.manager_approver_2 = 1 OR COALESCE(uc.manager_approver_2, 0) = 1)`,
    [departmentId]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/**
 * Manager Approver 2 users in the company's IT department(s) (checklist IT receive step).
 */
export async function getManagerApprover2UserIdsInItDepartmentAndCompany(
  companyId: string | null
): Promise<string[]> {
  if (companyId == null || companyId === '') {
    return [];
  }
  const itDepartmentIds = await getDepartmentIdsForScope(pool, 'it', companyId);
  if (itDepartmentIds.length === 0) {
    return [];
  }
  const placeholders = itDepartmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.company_id = ?
       AND u.department_id IN (${placeholders})
       AND u.is_active = 1
       AND (r.manager_approver_2 = 1 OR COALESCE(uc.manager_approver_2, 0) = 1)`,
    [companyId, ...itDepartmentIds]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/** True when user belongs to an IT department in the given company. */
export async function isUserInItDepartmentForCompany(
  userId: string,
  companyId: string | null
): Promise<boolean> {
  if (companyId == null || companyId === '') {
    return false;
  }
  const [userRows] = (await pool.execute(
    `SELECT department_id, company_id FROM users WHERE userID = ? LIMIT 1`,
    [userId]
  )) as [{ department_id: string | null; company_id: string | null }[], unknown];
  const row = userRows[0];
  if (!row?.department_id || row.company_id !== companyId) {
    return false;
  }
  const itDepartmentIds = await getDepartmentIdsForScope(pool, 'it', companyId);
  return itDepartmentIds.includes(String(row.department_id));
}

/**
 * Returns user IDs of active Manager Approver 1 users in a company.
 * If companyId is null/empty, returns all active Manager Approver 1 users.
 */
export async function getManagerApprover1UserIdsByCompany(
  companyId: string | null
): Promise<string[]> {
  const hasCompanyScope = companyId != null && companyId !== '';
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.is_active = 1
       AND (? = 0 OR u.company_id = ?)
       AND (r.manager_approver_1 = 1 OR COALESCE(uc.manager_approver_1, 0) = 1)`,
    [hasCompanyScope ? 1 : 0, companyId]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/**
 * Manager Approver 2 users who can see a processed return form in the Approvals
 * "Receive Approve" tab for the given company/department. Mirrors
 * getReceivePendingApprovalsHandler visibility:
 *  - broad-scope users (Global Admin / Admin / overallManager / unscoped) see all forms
 *  - IT/Admin-scoped users only see forms whose department is within their scope
 */
export async function getManagerApprover2UserIdsForProcessedReturn(
  companyId: string | null,
  departmentId: string | null
): Promise<string[]> {
  if (companyId == null || companyId === '') {
    return [];
  }
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.company_id = ?
       AND u.is_active = 1
       AND (r.manager_approver_2 = 1 OR COALESCE(uc.manager_approver_2, 0) = 1)`,
    [companyId]
  )) as [{ userID: string }[], unknown];

  const recipients: string[] = [];
  for (const row of rows || []) {
    const userId = String(row.userID);
    const scope = await getAssetScope(pool, userId);
    if (!scope.companyId || scope.companyId !== companyId) continue;
    if (
      scope.departmentIds === null ||
      (departmentId != null &&
        departmentId !== '' &&
        scope.departmentIds.includes(String(departmentId)))
    ) {
      recipients.push(userId);
    }
  }
  return recipients;
}

/**
 * Returns user IDs of active users who should receive return-workflow notifications:
 * those with any granted permission on the Asset Return module in user_permissions.
 */
export async function getCustodianReturnAccessUserIds(): Promise<string[]> {
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     INNER JOIN user_permissions up ON u.userID = up.user_id
     WHERE u.is_active = 1
       AND up.module_name = 'Asset Return'
       AND up.granted = 1
       AND up.permission_type IN ('view', 'create', 'edit', 'delete')`
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}
/**
 * Active users flagged as HR accountability / 201-file receivers:
 * role `hr_accountability_receiver` or per-user `user_custodian_settings.hr_accountability_receiver`.
 */
export async function getHrAccountabilityReceiverUserIds(): Promise<string[]> {
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.is_active = 1
       AND (
         COALESCE(r.hr_accountability_receiver, 0) = 1
         OR COALESCE(uc.hr_accountability_receiver, 0) = 1
       )`
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => String(row.userID));
}

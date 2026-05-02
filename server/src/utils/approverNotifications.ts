/**
 * Helpers for notifying approver users (e.g. Manager Approver 1) when forms are signed.
 */
import { pool } from '../db.js';

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

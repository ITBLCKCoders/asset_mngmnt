/**
 * Helpers for notifying approver users when forms are signed.
 * 
 * MA1/MA3/Sub1 now use designated user approvers (user_approvers table) with fallback to local admins.
 * MA2/Sub2/Finance/HR still use role-based logic.
 */
import { pool } from '../db.js';
import {
  getAssetScope,
  getDepartmentIdsForScope,
  classifyDepartmentScopeByName,
} from './assetScope.js';
import {
  getDesignatedApproverUserId,
  getEligibleApprovers,
} from '../services/userApprovers.service.js';

/**
 * Check if user is the designated MA1/MA3 approver for a specific user
 */
export async function isDesignatedApprover(
  userId: string,
  requesterUserId: string
): Promise<boolean> {
  const designated = await getDesignatedApproverUserId(requesterUserId, 'approver');
  return designated === userId;
}

/**
 * Check if user is the designated Sub1 approver for a specific user
 */
export async function isDesignatedSubApprover(
  userId: string,
  requesterUserId: string
): Promise<boolean> {
  const designated = await getDesignatedApproverUserId(requesterUserId, 'sub_approver');
  return designated === userId;
}

/**
 * Get the designated approver user ID for a user (with fallback to local admins)
 */
export async function getDesignatedApproverUserIdForRequester(requesterUserId: string): Promise<string | null> {
  return getDesignatedApproverUserId(requesterUserId, 'approver');
}

/**
 * Get the designated sub approver user ID for a user (with fallback to local admins)
 */
export async function getDesignatedSubApproverUserIdForRequester(requesterUserId: string): Promise<string | null> {
  return getDesignatedApproverUserId(requesterUserId, 'sub_approver');
}

/**
 * Get eligible users for Approver dropdown (MA1 or MA3 flag) for a specific user
 */
export async function getEligibleApproversForUser(requesterUserId: string, approverListType: 'approver' | 'ma3' = 'approver') {
  const eligible = await getEligibleApprovers(requesterUserId, approverListType);
  return eligible.approver;
}

/**
 * Get eligible users for Sub Approver dropdown (Sub1 flag) for a specific user
 */
export async function getEligibleSubApproversForUser(requesterUserId: string) {
  const eligible = await getEligibleApprovers(requesterUserId, 'sub_approver');
  return eligible.sub_approver;
}

/**
 * Check if requestor has MA1 custodian access (for routing MA1 vs MA3)
 */
export async function getRequestorMA1Status(userId: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT 
      COALESCE(uc.manager_approver_1, 0) as user_ma1,
      COALESCE(r.manager_approver_1, 0) as role_ma1
    FROM users u
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    WHERE u.userID = ?`,
    [userId]
  );
  const row = (rows as any[])[0];
  return (row?.user_ma1 === 1) || (row?.role_ma1 === 1);
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
 * Returns true if the given user is Sub Approver 2 (role or user_custodian_settings).
 * Sub Approver 2 is the stand-in for Manager Approver 2 (IT/Admin dept head/manager receive step).
 */
export async function isUserSubApprover2(userId: string): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT 1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (r.sub_approver_2 = 1 OR COALESCE(uc.sub_approver_2, 0) = 1)
     LIMIT 1`,
    [userId]
  )) as [unknown[], unknown];
  return Array.isArray(rows) && rows.length > 0;
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
 * Manager Approver 2 users in the company's IT and Admin department(s)
 * (receive/approve step covering both scopes).
 */
export async function getManagerApprover2UserIdsInItAndAdminDepartmentsAndCompany(
  companyId: string | null
): Promise<string[]> {
  if (companyId == null || companyId === '') {
    return [];
  }
  const itDepartmentIds = await getDepartmentIdsForScope(pool, 'it', companyId);
  const adminDepartmentIds = await getDepartmentIdsForScope(
    pool,
    'admin',
    companyId
  );
  const departmentIds = [...new Set([...itDepartmentIds, ...adminDepartmentIds])];
  if (departmentIds.length === 0) {
    return [];
  }
  const placeholders = departmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.company_id = ?
       AND u.department_id IN (${placeholders})
       AND u.is_active = 1
       AND (r.manager_approver_2 = 1 OR COALESCE(uc.manager_approver_2, 0) = 1)`,
    [companyId, ...departmentIds]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/**
 * Sub Approver 2 users in the company's IT and Admin department(s).
 * Sub Approver 2 stands in for Manager Approver 2 (IT/Admin dept head receive step).
 */
export async function getSubApprover2UserIdsInItAndAdminDepartmentsAndCompany(
  companyId: string | null
): Promise<string[]> {
  if (companyId == null || companyId === '') {
    return [];
  }
  const itDepartmentIds = await getDepartmentIdsForScope(pool, 'it', companyId);
  const adminDepartmentIds = await getDepartmentIdsForScope(
    pool,
    'admin',
    companyId
  );
  const departmentIds = [...new Set([...itDepartmentIds, ...adminDepartmentIds])];
  if (departmentIds.length === 0) {
    return [];
  }
  const placeholders = departmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.company_id = ?
       AND u.department_id IN (${placeholders})
       AND u.is_active = 1
       AND (r.sub_approver_2 = 1 OR COALESCE(uc.sub_approver_2, 0) = 1)`,
    [companyId, ...departmentIds]
  )) as [{ userID: string }[], unknown];
  return (rows || []).map(row => row.userID);
}

/** True when user belongs to an IT or Admin department in the given company. */
export async function isUserInItOrAdminDepartmentForCompany(
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
  const adminDepartmentIds = await getDepartmentIdsForScope(
    pool,
    'admin',
    companyId
  );
  return (
    itDepartmentIds.includes(String(row.department_id)) ||
    adminDepartmentIds.includes(String(row.department_id))
  );
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
 * Returns user IDs of active users whose role matches the borrow request scope
 * ('IT Asset' for it scope, 'Admin Asset' for admin scope) within the given company.
 */
export async function getAssetRoleUsersForScopeAndCompany(
  companyId: string,
  scope: 'it' | 'admin'
): Promise<string[]> {
  const roleName = scope === 'it' ? 'IT Asset' : 'Admin Asset';
  const [rows] = await pool.execute(
    `SELECT DISTINCT u.userID
     FROM users u
     JOIN asset_mngmnt_roles r ON u.role_id = r.roleID
     WHERE r.name = ?
       AND r.deleted_at IS NULL
       AND u.company_id = ?
       AND u.is_active = 1`,
    [roleName, companyId]
  ) as [{ userID: string }[], unknown];
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

/**
 * Returns same-company active users whose role matches the scope of the assets
 * involved in a return/transfer form:
 *  - Admin-scope assets target users with the 'Admin Asset' role
 *  - IT/Other-scope assets target users with the 'IT Asset' role
 * When no asset can be resolved, falls back to classifying the form department
 * name (mirrors the previous form-department-based targeting).
 */
export async function getAssetRoleUsersForAssignmentsAndCompany(
  companyId: string | null,
  assignmentIds: string[],
  fallbackDepartmentName?: string | null
): Promise<
  Array<{ userID: string; first_name?: string | null; last_name?: string | null }>
> {
  if (companyId == null || companyId === '') {
    return [];
  }
  const cleanAssignmentIds = (assignmentIds || []).filter(
    (id) => id && String(id).trim()
  );
  const neededRoles = new Set<'IT Asset' | 'Admin Asset'>();
  let resolvedAny = false;

  if (cleanAssignmentIds.length > 0) {
    const assignmentPlaceholders = cleanAssignmentIds.map(() => '?').join(',');
    const [assetRows] = (await pool.execute(
      `SELECT DISTINCT aa.asset_id
       FROM asset_assignments aa
       WHERE aa.assignmentID IN (${assignmentPlaceholders}) AND aa.deleted_at IS NULL`,
      cleanAssignmentIds
    )) as [{ asset_id: string }[], unknown];
    const assetIds = (assetRows || [])
      .map((r) => r.asset_id)
      .filter(Boolean);

    if (assetIds.length > 0) {
      const assetPlaceholders = assetIds.map(() => '?').join(',');
      const [deptRows] = (await pool.execute(
        `SELECT DISTINCT a.assetID, d.name AS department_name
         FROM assets a
         LEFT JOIN asset_categories c ON a.category_id = c.categoryID
         LEFT JOIN asset_mngmnt_departments d ON c.department_id = d.departmentID AND d.deleted_at IS NULL
         WHERE a.assetID IN (${assetPlaceholders}) AND a.deleted_at IS NULL`,
        assetIds
      )) as [{ assetID: string; department_name: string | null }[], unknown];

      for (const row of deptRows || []) {
        const scope = classifyDepartmentScopeByName(row.department_name);
        neededRoles.add(scope === 'Admin' ? 'Admin Asset' : 'IT Asset');
        resolvedAny = true;
      }
    }
  }

  if (!resolvedAny) {
    const scope = classifyDepartmentScopeByName(fallbackDepartmentName);
    neededRoles.add(scope === 'Admin' ? 'Admin Asset' : 'IT Asset');
  }

  const recipients: Array<{
    userID: string;
    first_name?: string | null;
    last_name?: string | null;
  }> = [];
  const seen = new Set<string>();

  for (const roleName of Array.from(neededRoles)) {
    const [exactRows] = (await pool.execute(
      `SELECT DISTINCT u.userID, u.first_name, u.last_name, r.name as role_name
       FROM users u
       JOIN asset_mngmnt_roles r ON u.role_id = r.roleID
       WHERE r.name = ?
         AND r.deleted_at IS NULL
         AND u.company_id = ?
         AND u.is_active = 1`,
      [roleName, companyId]
    )) as [
      { userID: string; first_name?: string | null; last_name?: string | null; role_name?: string | null }[],
      unknown
    ];
    let roleUsers = Array.isArray(exactRows) ? exactRows : [];

    if (roleUsers.length === 0) {
      const [caseInsensitiveRows] = (await pool.execute(
        `SELECT DISTINCT u.userID, u.first_name, u.last_name, r.name as role_name
         FROM users u
         JOIN asset_mngmnt_roles r ON u.role_id = r.roleID
         WHERE LOWER(r.name) = LOWER(?)
           AND r.deleted_at IS NULL
           AND u.company_id = ?
           AND u.is_active = 1`,
        [roleName, companyId]
      )) as [
        { userID: string; first_name?: string | null; last_name?: string | null; role_name?: string | null }[],
        unknown
      ];
      roleUsers = Array.isArray(caseInsensitiveRows)
        ? caseInsensitiveRows
        : [];
    }

    for (const row of roleUsers) {
      if (seen.has(row.userID)) continue;
      seen.add(row.userID);
      recipients.push({
        userID: row.userID,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
      });
    }
  }

  return recipients;
}
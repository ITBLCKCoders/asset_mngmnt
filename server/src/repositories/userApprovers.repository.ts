import { randomUUID } from 'crypto';
import { pool } from '../db.js';

export interface UserApprover {
  id: string;
  user_id: string;
  approver_type: 'approver' | 'sub_approver';
  approver_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DesignatedApproverWithDetails extends UserApprover {
  first_name: string;
  last_name: string;
  email: string;
}

export interface EligibleApprover {
  userID: string;
  first_name: string;
  last_name: string;
  email: string;
  department_name?: string | null;
}

/**
 * Get all designated approvers for a user
 */
export async function getUserApprovers(userId: string): Promise<DesignatedApproverWithDetails[]> {
  const [rows] = await pool.execute(
    `SELECT 
      ua.id, ua.user_id, ua.approver_type, ua.approver_user_id, ua.created_at, ua.updated_at,
      u.first_name, u.last_name, u.email
    FROM user_approvers ua
    JOIN users u ON ua.approver_user_id = u.userID
    WHERE ua.user_id = ?`,
    [userId]
  );
  return rows as DesignatedApproverWithDetails[];
}

/**
 * Get designated approver by type for a user
 */
export async function getUserApproverByType(
  userId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<{ approver_user_id: string } | null> {
  const [rows] = await pool.execute(
    `SELECT approver_user_id FROM user_approvers 
     WHERE user_id = ? AND approver_type = ? LIMIT 1`,
    [userId, approverType]
  );
  const result = rows as { approver_user_id: string }[];
  return result[0] || null;
}

/**
 * Set or replace designated approver for a user
 */
export async function setUserApprover(
  userId: string,
  approverType: 'approver' | 'sub_approver',
  approverUserId: string
): Promise<void> {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO user_approvers (id, user_id, approver_type, approver_user_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       approver_user_id = VALUES(approver_user_id),
       updated_at = CURRENT_TIMESTAMP`,
    [id, userId, approverType, approverUserId]
  );
}

/**
 * Remove designated approver for a user
 */
export async function removeUserApprover(
  userId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<void> {
  await pool.execute(
    `DELETE FROM user_approvers WHERE user_id = ? AND approver_type = ?`,
    [userId, approverType]
  );
}

/**
 * Get eligible users who can be approvers for a user
 * approverListType: 'approver' (MA1), 'ma3' (MA3), 'sub_approver' (Sub1)
 */
export async function getEligibleApproversForUser(
  userId: string,
  approverListType: 'approver' | 'ma3' | 'sub_approver'
): Promise<EligibleApprover[]> {
  let column: string;
  switch (approverListType) {
    case 'approver':
      column = 'manager_approver_1';
      break;
    case 'ma3':
      column = 'manager_approver_3';
      break;
    case 'sub_approver':
      column = 'sub_approver_1';
      break;
  }

  const [rows] = await pool.execute(
    `SELECT 
      u.userID, u.first_name, u.last_name, u.email, d.name as department_name
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    WHERE u.company_id = (SELECT company_id FROM users WHERE userID = ?)
      AND u.is_active = 1
      AND u.userID <> ?
      AND (COALESCE(uc.${column}, 0) = 1 OR COALESCE(r.${column}, 0) = 1)
    ORDER BY u.first_name, u.last_name`,
    [userId, userId]
  );
  return rows as EligibleApprover[];
}

/**
 * Get local admin users in a company (for fallback)
 */
export async function getLocalAdminsInCompany(companyId: string): Promise<EligibleApprover[]> {
  const [rows] = await pool.execute(
    `SELECT 
      u.userID, u.first_name, u.last_name, u.email, d.name as department_name
    FROM users u
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
    WHERE u.company_id = ?
      AND u.is_active = 1
      AND (r.name = 'Admin' OR r.name = 'Global Admin')
    ORDER BY u.first_name, u.last_name`,
    [companyId]
  );
  return rows as EligibleApprover[];
}
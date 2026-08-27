import { pool } from '../db.js';
import type { RowDataPacket } from 'mysql2/promise';

export interface CompanyApprover {
  id: string;
  company_id: string;
  approver_type: 'approver' | 'sub_approver';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleApprover {
  userID: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
  department_name?: string | null;
}

/**
 * Get all designated approvers for a company
 */
export async function getCompanyApprovers(companyId: string): Promise<CompanyApprover[]> {
  const [rows] = (await pool.execute(
    `SELECT id, company_id, approver_type, user_id, created_at, updated_at
     FROM company_approvers
     WHERE company_id = ?`,
    [companyId]
  )) as [CompanyApprover[], any];
  return rows || [];
}

/**
 * Get designated approver by type for a company
 */
export async function getDesignatedApprover(
  companyId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<string | null> {
  const [rows] = (await pool.execute(
    `SELECT user_id FROM company_approvers WHERE company_id = ? AND approver_type = ? LIMIT 1`,
    [companyId, approverType]
  )) as [{ user_id: string }[], any];
  return rows[0]?.user_id ?? null;
}

/**
 * Set or replace designated approver for a company
 */
export async function setCompanyApprover(
  companyId: string,
  approverType: 'approver' | 'sub_approver',
  userId: string
): Promise<void> {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO company_approvers (id, company_id, approver_type, user_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP`,
    [id, companyId, approverType, userId]
  );
}

/**
 * Remove designated approver for a company
 */
export async function removeCompanyApprover(
  companyId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<void> {
  await pool.execute(
    `DELETE FROM company_approvers WHERE company_id = ? AND approver_type = ?`,
    [companyId, approverType]
  );
}

/**
 * Get eligible users for a specific approver type in a company
 * Filters by role flag or user_custodian_settings flag
 *
 * - 'approver' → Manager Approver 1 (dept head for normal users)
 * - 'ma3'      → Manager Approver 3 (company-wide approver for MA1 users)
 * - 'sub_approver' → Sub Approver 1 (stand-in for the Approver)
 */
export async function getEligibleApproversByType(
  companyId: string,
  approverType: 'approver' | 'ma3' | 'sub_approver'
): Promise<EligibleApprover[]> {
  let flagColumn: string;
  let custodianColumn: string;
  
  if (approverType === 'approver') {
    flagColumn = 'manager_approver_1';
    custodianColumn = 'manager_approver_1';
  } else if (approverType === 'ma3') {
    flagColumn = 'manager_approver_3';
    custodianColumn = 'manager_approver_3';
  } else {
    flagColumn = 'sub_approver_1';
    custodianColumn = 'sub_approver_1';
  }

  const [rows] = (await pool.execute(
    `SELECT DISTINCT u.userID, u.first_name, u.last_name, u.email, u.department_id, d.name AS department_name
     FROM users u
     LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.company_id = ? AND u.is_active = 1
       AND (COALESCE(r.${flagColumn}, 0) = 1 OR COALESCE(uc.${custodianColumn}, 0) = 1)
     ORDER BY u.first_name, u.last_name`,
    [companyId]
  )) as [EligibleApprover[], any];
  return rows || [];
}

/**
 * Check if a user has MA1 custodian access (for routing logic)
 */
export async function getUserCustodianMA1Status(userId: string): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT COALESCE(r.manager_approver_1, 0) as role_ma1, COALESCE(uc.manager_approver_1, 0) as custodian_ma1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ? LIMIT 1`,
    [userId]
  )) as [{ role_ma1: number; custodian_ma1: number }[], any];
  
  const row = rows[0];
  return row ? (row.role_ma1 === 1 || row.custodian_ma1 === 1) : false;
}
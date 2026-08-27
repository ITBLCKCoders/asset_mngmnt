import { pool } from '../db.js';
import {
  getUserApprovers,
  getUserApproverByType,
  setUserApprover,
  removeUserApprover,
  getEligibleApproversForUser,
  getLocalAdminsInCompany,
  EligibleApprover,
} from '../repositories/userApprovers.repository.js';

export interface DesignatedApprovers {
  approver: { user_id: string; first_name: string; last_name: string; email: string } | null;
  sub_approver: { user_id: string; first_name: string; last_name: string; email: string } | null;
}

export interface EligibleApprovers {
  approver: EligibleApprover[];
  sub_approver: EligibleApprover[];
}

/**
 * Get all designated approvers for a user
 */
export async function getUserDesignatedApprovers(userId: string): Promise<DesignatedApprovers> {
  const approvers = await getUserApprovers(userId);
  const approver = approvers.find(a => a.approver_type === 'approver') || null;
  const sub_approver = approvers.find(a => a.approver_type === 'sub_approver') || null;
  
  return {
    approver: approver ? {
      user_id: approver.approver_user_id,
      first_name: approver.first_name,
      last_name: approver.last_name,
      email: approver.email,
    } : null,
    sub_approver: sub_approver ? {
      user_id: sub_approver.approver_user_id,
      first_name: sub_approver.first_name,
      last_name: sub_approver.last_name,
      email: sub_approver.email,
    } : null,
  };
}

/**
 * Get designated approver user ID for a user (with fallback to local admins)
 */
export async function getDesignatedApproverUserId(
  userId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<string | null> {
  // First try user-level approver
  const result = await getUserApproverByType(userId, approverType);
  if (result) return result.approver_user_id;

  // Fallback: get user's company and find local admins
  const [userRows] = await pool.execute(
    'SELECT company_id FROM users WHERE userID = ?',
    [userId]
  );
  const user = (userRows as any[])[0];
  if (!user?.company_id) return null;

  const localAdmins = await getLocalAdminsInCompany(user.company_id);
  return localAdmins[0]?.userID || null;
}

/**
 * Set designated approver for a user
 */
export async function setUserDesignatedApprover(
  userId: string,
  approverType: 'approver' | 'sub_approver',
  approverUserId: string
): Promise<void> {
  await setUserApprover(userId, approverType, approverUserId);
}

/**
 * Remove designated approver for a user
 */
export async function removeUserDesignatedApprover(
  userId: string,
  approverType: 'approver' | 'sub_approver'
): Promise<void> {
  await removeUserApprover(userId, approverType);
}

/**
 * Get eligible approvers for a user
 */
export async function getEligibleApprovers(
  userId: string,
  approverListType: 'approver' | 'ma3' | 'sub_approver'
): Promise<EligibleApprovers> {
  const approverListTypeMap: Record<string, 'approver' | 'ma3' | 'sub_approver'> = {
    approver: 'approver',
    ma3: 'ma3',
    sub_approver: 'sub_approver',
  };
  
  const mappedType = approverListTypeMap[approverListType] || 'approver';
  
  const [approvers, subApprovers] = await Promise.all([
    getEligibleApproversForUser(userId, mappedType),
    getEligibleApproversForUser(userId, 'sub_approver'),
  ]);

  return {
    approver: approvers,
    sub_approver: subApprovers,
  };
}

/**
 * Return the requester user IDs for whom `approverUserId` acts as designated
 * approver or sub-approver within `companyId`:
 *
 *  - requesters explicitly assigned via `user_approvers`
 *  - requesters without any assigned 'approver' when `approverUserId` is the
 *    company's fallback local admin (first Admin/Global Admin), matching the
 *    `getDesignatedApproverUserId` fallback rule
 */
export async function getRequestersAssignedToApprover(
  approverUserId: string,
  companyId: string | null | undefined
): Promise<string[]> {
  if (!companyId) return [];

  const [assignedRows] = await pool.execute(
    `SELECT ua.user_id AS requester_id
     FROM user_approvers ua
     WHERE ua.approver_user_id = ?
       AND ua.approver_type IN ('approver', 'sub_approver')`,
    [approverUserId]
  );
  const requesterSet = new Set<string>(
    (assignedRows as { requester_id: string }[]).map(r => r.requester_id)
  );

  const localAdmins = await getLocalAdminsInCompany(companyId);
  if (localAdmins[0]?.userID !== approverUserId) {
    return Array.from(requesterSet);
  }

  const [unassignedRows] = await pool.execute(
    `SELECT u.userID AS requester_id
     FROM users u
     WHERE u.company_id = ?
       AND u.is_active = 1
       AND NOT EXISTS (
         SELECT 1 FROM user_approvers ua2
          WHERE ua2.user_id = u.userID AND ua2.approver_type = 'approver'
       )`,
    [companyId]
  );
  for (const row of unassignedRows as { requester_id: string }[]) {
    requesterSet.add(row.requester_id);
  }
  return Array.from(requesterSet);
}
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { pool } from '../db.js';

export interface DeactivationFormRow extends RowDataPacket {
  formID: string;
  form_number: string;
  user_id: string;
  department_id: string | null;
  company_id: string | null;
  status: string;
  assets_data: unknown;
  requester_signature: string | null;
  requested_at: string | null;
  dept_head_approver_id: string | null;
  dept_head_sub_approver_id: string | null;
  dept_head_signed_at: string | null;
  dept_head_signed_by: string | null;
  dept_head_signature: string | null;
  hr_signed_at: string | null;
  hr_signed_by: string | null;
  hr_signature: string | null;
  decline_reason: string | null;
  declined_by: string | null;
  declined_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // joined
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  employee_number: string | null;
  position: string | null;
  department_name: string | null;
  company_name: string | null;
  dept_head_first_name: string | null;
  dept_head_last_name: string | null;
  hr_first_name: string | null;
  hr_last_name: string | null;
}

const FORM_SELECT = `
SELECT
  f.*,
  u.first_name, u.last_name, u.email, u.employee_number, u.position,
  d.name as department_name,
  c.name as company_name,
  dh.first_name as dept_head_first_name, dh.last_name as dept_head_last_name,
  hr.first_name as hr_first_name, hr.last_name as hr_last_name
FROM intangible_deactivation_forms f
LEFT JOIN users u ON f.user_id = u.userID
LEFT JOIN asset_mngmnt_departments d ON f.department_id = d.departmentID
LEFT JOIN companies c ON f.company_id = c.companyID
LEFT JOIN users dh ON f.dept_head_signed_by = dh.userID
LEFT JOIN users hr ON f.hr_signed_by = hr.userID`;

export async function getIntangibleAssetDetailsByIds(ids: string[]): Promise<Array<{ id: string; description: string | null; risk_level_name: string | null }>> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ia.id, ia.description, rl.name AS risk_level_name
     FROM intangible_assets ia
     LEFT JOIN risk_levels rl ON ia.risk_level_id = rl.id AND rl.deleted_at IS NULL
     WHERE ia.id IN (${placeholders})`,
    ids
  );
  return rows as Array<{ id: string; description: string | null; risk_level_name: string | null }>;
}

export async function insertForm(args: {
  formNumber: string;
  userId: string;
  departmentId: string | null;
  companyId: string | null;
  assetsDataJson: string;
  requesterSignature: string | null;
  deptHeadApproverId: string | null;
  deptHeadSubApproverId: string | null;
  createdBy: string;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO intangible_deactivation_forms
     (form_number, user_id, department_id, company_id, status, assets_data, requester_signature, dept_head_approver_id, dept_head_sub_approver_id, created_by)
     VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)`,
    [args.formNumber, args.userId, args.departmentId, args.companyId, args.assetsDataJson, args.requesterSignature, args.deptHeadApproverId, args.deptHeadSubApproverId, args.createdBy]
  );
}

export async function findFormIdByNumber(formNumber: string): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT formID FROM intangible_deactivation_forms WHERE form_number = ? LIMIT 1`, [formNumber]
  );
  return (rows[0] as any)?.formID ?? null;
}

export async function getNextSequence(likeParam: string): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)),0)+1 as next_seq
     FROM intangible_deactivation_forms WHERE form_number LIKE CONCAT(?, '-%')`, [likeParam]
  );
  return Number((rows[0] as any)?.next_seq ?? 1);
}

export async function getFormById(formId: string): Promise<DeactivationFormRow | null> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.formID = ? AND f.deleted_at IS NULL LIMIT 1`, [formId]
  );
  return rows[0] ?? null;
}

export async function listForms(filters: { companyId?: string; userId?: string; status?: string }): Promise<DeactivationFormRow[]> {
  const where: string[] = ['f.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (filters.companyId) { where.push('f.company_id = ?'); params.push(filters.companyId); }
  if (filters.userId) { where.push('f.user_id = ?'); params.push(filters.userId); }
  if (filters.status) { where.push('f.status = ?'); params.push(filters.status); }
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE ${where.join(' AND ')} ORDER BY f.created_at DESC`, params
  );
  return rows;
}

export async function listAll(): Promise<DeactivationFormRow[]> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.deleted_at IS NULL ORDER BY f.created_at DESC`
  );
  return rows;
}

export async function listPendingForUser(userId: string): Promise<DeactivationFormRow[]> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.deleted_at IS NULL AND f.user_id = ?
     AND f.status IN ('Pending', 'PendingHrApproval')
     ORDER BY f.created_at DESC`, [userId]
  );
  return rows;
}

export async function listPendingForApprover(approverUserId: string): Promise<DeactivationFormRow[]> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.deleted_at IS NULL AND f.status = 'Pending'
     AND (f.dept_head_approver_id = ? OR f.dept_head_sub_approver_id = ?)
     ORDER BY f.created_at DESC`, [approverUserId, approverUserId]
  );
  return rows;
}

export async function listPendingHrApproval(): Promise<DeactivationFormRow[]> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.deleted_at IS NULL AND f.status = 'PendingHrApproval' ORDER BY f.created_at DESC`
  );
  return rows;
}

export async function listApprovedByUser(userId: string): Promise<DeactivationFormRow[]> {
  const [rows] = await pool.execute<DeactivationFormRow[]>(
    `${FORM_SELECT} WHERE f.deleted_at IS NULL AND f.status = 'Approved'
     AND (f.dept_head_signed_by = ? OR f.hr_signed_by = ?) ORDER BY f.updated_at DESC`, [userId, userId]
  );
  return rows;
}

export async function updateDeptHeadApproval(formId: string, signedBy: string, signature: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE intangible_deactivation_forms SET status='PendingHrApproval', dept_head_signed_by=?, dept_head_signed_at=NOW(), dept_head_signature=?, updated_at=NOW()
     WHERE formID=? AND status='Pending' AND deleted_at IS NULL`, [signedBy, signature, formId]
  );
  return result.affectedRows;
}

export async function updateHrApproval(formId: string, signedBy: string, signature: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE intangible_deactivation_forms SET status='Approved', hr_signed_by=?, hr_signed_at=NOW(), hr_signature=?, updated_at=NOW()
     WHERE formID=? AND status='PendingHrApproval' AND deleted_at IS NULL`, [signedBy, signature, formId]
  );
  return result.affectedRows;
}

export async function updateDeclined(formId: string, reason: string, declinedBy: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE intangible_deactivation_forms SET status='Declined', decline_reason=?, declined_by=?, declined_at=NOW(), updated_at=NOW()
     WHERE formID=? AND status IN ('Pending','PendingHrApproval') AND deleted_at IS NULL`, [reason, declinedBy, formId]
  );
  return result.affectedRows;
}

// Intangible assignment helpers
export async function getActiveIntangibleAssignmentsForUser(userId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT iaa.*, ia.name, ia.type, ia.description, ia.company_id,
            iat.department_id as type_department_id, td.name as type_department_name,
            d.name as department_name,
            rl.name as risk_level_name
     FROM intangible_asset_assignments iaa
      JOIN intangible_assets ia ON iaa.intangible_asset_id = ia.id
     LEFT JOIN intangible_asset_types iat ON ia.type = iat.name AND iat.company_id = ia.company_id AND iat.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments td ON iat.department_id = td.departmentID AND td.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments d ON iaa.department_id = d.departmentID AND d.deleted_at IS NULL
     LEFT JOIN risk_levels rl ON ia.risk_level_id = rl.id AND rl.deleted_at IS NULL
     WHERE iaa.user_id = ? AND iaa.status='Active' AND iaa.deleted_at IS NULL`, [userId]
  );
  return rows;
}

export async function deactivateAssignments(intangibleAssetIds: string[], userId: string, conn?: PoolConnection): Promise<void> {
  const executor: any = conn ?? pool;
  const ph = intangibleAssetIds.map(() => '?').join(',');
  await executor.execute(
    `UPDATE intangible_asset_assignments SET status='Inactive', updated_at=NOW()
     WHERE intangible_asset_id IN (${ph}) AND user_id = ? AND status='Active' AND deleted_at IS NULL`,
    [...intangibleAssetIds, userId]
  );
  // update intangible_assets status if no more active assignments
  for (const id of intangibleAssetIds) {
    const [remaining] = await executor.execute(
      `SELECT 1 FROM intangible_asset_assignments WHERE intangible_asset_id=? AND status='Active' AND deleted_at IS NULL LIMIT 1`, [id]
    ) as any;
    if (!remaining || remaining.length === 0) {
      await executor.execute(
        `UPDATE intangible_assets SET status='available', updated_at=NOW() WHERE id=?`, [id]
      ) as any;
    }
  }
}

export async function getUserCompanyAndDept(userId: string): Promise<{ company_id: string | null; department_id: string | null; first_name: string | null; last_name: string | null } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT company_id, department_id, first_name, last_name FROM users WHERE userID=? LIMIT 1`, [userId]
  );
  return (rows[0] as any) ?? null;
}

export async function getCompanyPrefix(companyId: string): Promise<{ code: string | null; prefix: string | null } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT code, prefix FROM companies WHERE companyID=? LIMIT 1`, [companyId]);
  return (rows[0] as any) ?? null;
}

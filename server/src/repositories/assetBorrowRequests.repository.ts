import type { Pool, RowDataPacket } from 'mysql2/promise';

export interface AssetBorrowRequestRow extends RowDataPacket {
  borrow_request_id: string;
  company_id: string;
  user_id: string;
  borrow_scope: 'it' | 'admin';
  category_id: string;
  type_id: string;
  expected_return_at: Date;
  purpose: string;
  status: string;
  form_number?: string | null;
  created_at: Date;
  updated_at: Date;
  category_name?: string;
  type_name?: string;
  requester_department_name?: string | null;
  requester_first_name?: string | null;
  requester_last_name?: string | null;
  requester_username?: string | null;
  requester_email?: string | null;
  dept_head_signed_at?: Date | string | null;
  requester_company_name?: string | null;
  requester_company_logo_url?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_name?: string | null;
  approved_at?: Date | string | null;
  approved_by?: string | null;
  pre_usage_condition?: string | null;
  asset_code?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  asset_serial?: string | null;
  approved_by_name?: string | null;
  declined_at?: Date | string | null;
  requester_department_id?: string | null;
  processor_remarks?: string | null;
  processor_declined_at?: Date | string | null;
  processor_decline_reason?: string | null;
  returned_at?: Date | string | null;
  return_condition?: string | null;
  return_remarks?: string | null;
  return_condition_images?: string | null;
  processor_wet_borrow_pdf_url?: string | null;
  due_5m_notified_at?: Date | string | null;
  due_notified_at?: Date | string | null;
  pre_usage_condition_images?: string | null;
  requested_by_signature?: string | null;
  processor_signature?: string | null;
  processor_signed_at?: Date | string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  received_by_signature?: string | null;
  received_at?: Date | string | null;
}

export async function insertAssetBorrowRequest(
  pool: Pool,
  params: {
    id: string;
    companyId: string;
    userId: string;
    borrowScope: 'it' | 'admin';
    categoryId: string;
    typeId: string;
    formNumber: string;
    expectedReturnAt: string;
    purpose: string;
    requestedBySignature?: string | null;
  }
): Promise<void> {
  await pool.execute(
    `INSERT INTO asset_borrow_requests (
      borrow_request_id, company_id, user_id, borrow_scope,
      category_id, type_id, form_number, expected_return_at, purpose, status, requested_by_signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_staff', ?)`,
    [
      params.id,
      params.companyId,
      params.userId,
      params.borrowScope,
      params.categoryId,
      params.typeId,
      params.formNumber,
      params.expectedReturnAt,
      params.purpose,
      params.requestedBySignature ?? null,
    ]
  );
}

export async function findBorrowRequestsForList(
  pool: Pool,
  companyId: string,
  borrowScope: 'it' | 'admin' | null
): Promise<AssetBorrowRequestRow[]> {
  const scopeClause =
    borrowScope === null ? '' : ' AND br.borrow_scope = ? ';
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      br.approved_at,
      br.pre_usage_condition,
      br.processor_remarks,
      br.pre_usage_condition_images,
      DATE_FORMAT(br.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
      br.processor_decline_reason,
      DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
      br.return_condition,
      br.return_remarks,
      br.return_condition_images,
      br.processor_wet_borrow_pdf_url,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      u.first_name AS requester_first_name,
      u.last_name AS requester_last_name,
      u.username AS requester_username,
      u.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      a.asset_code AS asset_code,
      a.assetID AS asset_id,
      a.name AS asset_name,
      a.serial AS asset_serial,
      CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name,
      IFNULL(CONCAT(dh.first_name, ' ', dh.last_name), NULL) AS dept_head_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at,
      br.received_by,
      CONCAT(rb.first_name, ' ', rb.last_name) AS received_by_name,
      br.received_by_signature,
      DATE_FORMAT(br.received_at, '%Y-%m-%d %H:%i:%s') AS received_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users u ON br.user_id = u.userID
    LEFT JOIN companies co ON u.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN assets a ON br.asset_id = a.assetID AND a.deleted_at IS NULL
    LEFT JOIN users ap ON br.approved_by = ap.userID
    LEFT JOIN users dh ON br.dept_head_signed_by = dh.userID
    LEFT JOIN users rb ON br.received_by = rb.userID
    WHERE br.company_id = ?
    AND br.declined_at IS NULL
    ${scopeClause}
    ORDER BY br.created_at DESC
  `;

  const args: string[] = [companyId];
  if (borrowScope !== null) {
    args.push(borrowScope);
  }

  const [rows] = await pool.execute(sql, args);
  return rows as AssetBorrowRequestRow[];
}

export async function findBorrowRequestsForUser(
  pool: Pool,
  companyId: string,
  userId: string
): Promise<AssetBorrowRequestRow[]> {
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.dept_head_signed_by,
      DATE_FORMAT(br.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
      br.approved_by,
      br.pre_usage_condition,
      br.processor_remarks,
      br.pre_usage_condition_images,
      DATE_FORMAT(br.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
      br.processor_decline_reason,
      DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
      br.return_condition,
      br.return_remarks,
      br.return_condition_images,
      br.processor_wet_borrow_pdf_url,
      DATE_FORMAT(br.declined_at, '%Y-%m-%d %H:%i:%s') AS declined_at,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      u.first_name AS requester_first_name,
      u.last_name AS requester_last_name,
      u.username AS requester_username,
      u.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      a.asset_code AS asset_code,
      a.assetID AS asset_id,
      a.name AS asset_name,
      a.serial AS asset_serial,
      CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name,
      IFNULL(CONCAT(dh.first_name, ' ', dh.last_name), NULL) AS dept_head_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at,
      br.received_by,
      CONCAT(rb.first_name, ' ', rb.last_name) AS received_by_name,
      br.received_by_signature,
      DATE_FORMAT(br.received_at, '%Y-%m-%d %H:%i:%s') AS received_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users u ON br.user_id = u.userID
    LEFT JOIN companies co ON u.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN assets a ON br.asset_id = a.assetID AND a.deleted_at IS NULL
    LEFT JOIN users ap ON br.approved_by = ap.userID
    LEFT JOIN users dh ON br.dept_head_signed_by = dh.userID
    LEFT JOIN users rb ON br.received_by = rb.userID
    WHERE br.company_id = ? AND br.user_id = ?
    ORDER BY br.created_at DESC
  `;

  const [rows] = await pool.execute(sql, [companyId, userId]);
  return rows as AssetBorrowRequestRow[];
}

/** Pending department head approval: same department as Manager Approver 1, company match. */
export async function findPendingDeptHeadBorrowRequests(
  pool: Pool,
  approverDepartmentId: string,
  companyId: string
): Promise<AssetBorrowRequestRow[]> {
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      req.first_name AS requester_first_name,
      req.last_name AS requester_last_name,
      req.username AS requester_username,
      req.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users req ON br.user_id = req.userID
    LEFT JOIN companies co ON req.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON req.department_id = d.departmentID AND d.deleted_at IS NULL
    WHERE br.company_id = ?
      AND br.dept_head_signed_at IS NULL
      AND br.declined_at IS NULL
      AND req.department_id <=> ?
    ORDER BY br.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [companyId, approverDepartmentId]);
  return rows as AssetBorrowRequestRow[];
}

export async function findBorrowRequestsApprovedByDeptHeadMe(
  pool: Pool,
  companyId: string,
  deptHeadUserId: string
): Promise<AssetBorrowRequestRow[]> {
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.dept_head_signed_by,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      req.first_name AS requester_first_name,
      req.last_name AS requester_last_name,
      req.username AS requester_username,
      req.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users req ON br.user_id = req.userID
    LEFT JOIN companies co ON req.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON req.department_id = d.departmentID AND d.deleted_at IS NULL
    WHERE br.company_id = ?
      AND br.dept_head_signed_by = ?
      AND br.dept_head_signed_at IS NOT NULL
    ORDER BY br.dept_head_signed_at DESC
  `;
  const [rows] = await pool.execute(sql, [companyId, deptHeadUserId]);
  return rows as AssetBorrowRequestRow[];
}

export async function getBorrowRequestById(
  pool: Pool,
  borrowRequestId: string
): Promise<AssetBorrowRequestRow | null> {
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.dept_head_signed_by,
      DATE_FORMAT(br.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
      br.approved_by,
      br.pre_usage_condition,
      br.processor_remarks,
      br.pre_usage_condition_images,
      DATE_FORMAT(br.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
      br.processor_decline_reason,
      DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
      br.return_condition,
      br.return_remarks,
      br.return_condition_images,
      br.processor_wet_borrow_pdf_url,
      DATE_FORMAT(br.declined_at, '%Y-%m-%d %H:%i:%s') AS declined_at,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      req.first_name AS requester_first_name,
      req.last_name AS requester_last_name,
      req.username AS requester_username,
      req.email AS requester_email,
      req.department_id AS requester_department_id,
      d.name AS requester_department_name,
      a.asset_code AS asset_code,
      a.assetID AS asset_id,
      a.name AS asset_name,
      a.serial AS asset_serial,
      CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name,
      IFNULL(CONCAT(dh.first_name, ' ', dh.last_name), NULL) AS dept_head_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users req ON br.user_id = req.userID
    LEFT JOIN asset_mngmnt_departments d ON req.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN assets a ON br.asset_id = a.assetID AND a.deleted_at IS NULL
    LEFT JOIN users ap ON br.approved_by = ap.userID
    LEFT JOIN users dh ON br.dept_head_signed_by = dh.userID
    WHERE br.borrow_request_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [borrowRequestId]);
  const row = (rows as AssetBorrowRequestRow[])[0];
  return row ?? null;
}

export async function updateBorrowRequestDeptHeadApprove(
  pool: Pool,
  borrowRequestId: string,
  signedByUserId: string
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET dept_head_signed_at = NOW(),
         dept_head_signed_by = ?,
         dept_head_digital_signature = NULL,
         status = 'pending_staff',
         updated_at = NOW()
     WHERE borrow_request_id = ?
       AND dept_head_signed_at IS NULL
       AND declined_at IS NULL`,
    [signedByUserId, borrowRequestId]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export async function updateBorrowRequestDeptHeadDecline(
  pool: Pool,
  borrowRequestId: string
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET declined_at = NOW(),
         status = 'declined',
         updated_at = NOW()
     WHERE borrow_request_id = ?
       AND dept_head_signed_at IS NULL
       AND declined_at IS NULL`,
    [borrowRequestId]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export async function getCategoryDepartmentForCompany(
  pool: Pool,
  categoryId: string,
  companyId: string
): Promise<{ departmentId: string | null; departmentName: string | null } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT d.departmentID AS department_id, d.name AS department_name
     FROM asset_categories ac
     LEFT JOIN asset_mngmnt_departments d
       ON ac.department_id = d.departmentID AND d.deleted_at IS NULL
     WHERE ac.categoryID = ? AND ac.company_id = ? AND ac.deleted_at IS NULL`,
    [categoryId, companyId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
  };
}

export async function getTypeForCategoryAndCompany(
  pool: Pool,
  typeId: string,
  categoryId: string,
  companyId: string
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM asset_types
     WHERE typeID = ? AND category_id = ? AND company_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [typeId, categoryId, companyId]
  );
  return rows.length > 0;
}

export async function updateBorrowRequestStaffApprove(
  pool: Pool,
  params: {
    borrowRequestId: string;
    approvedBy: string;
    assetId: string;
    preUsageCondition: string;
    processorRemarks?: string | null;
    preUsageConditionImages?: string[] | null;
    processorSignature?: string | null;
    processorSignedAt?: string | null;
  }
): Promise<boolean> {
  // Convert ISO 8601 datetime to MySQL DATETIME format
  let mysqlSignedAt = null;
  if (params.processorSignedAt) {
    const date = new Date(params.processorSignedAt);
    if (!isNaN(date.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      mysqlSignedAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
  }

  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET approved_at = NOW(),
         approved_by = ?,
         asset_id = ?,
         pre_usage_condition = ?,
         processor_remarks = ?,
         pre_usage_condition_images = ?,
         processor_signature = ?,
         processor_signed_at = ?,
         status = 'approved',
         updated_at = NOW()
     WHERE borrow_request_id = ?
       AND declined_at IS NULL
       AND approved_at IS NULL`,
    [
      params.approvedBy,
      params.assetId,
      params.preUsageCondition,
      params.processorRemarks ?? null,
      params.preUsageConditionImages?.length
        ? JSON.stringify(params.preUsageConditionImages)
        : null,
      params.processorSignature ?? null,
      mysqlSignedAt,
      params.borrowRequestId,
    ]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export async function findApprovedBorrowRequestsForReceive(
  pool: Pool,
  companyId: string,
  borrowScope: 'it' | 'admin' | null
): Promise<AssetBorrowRequestRow[]> {
  const scopeClause =
    borrowScope === null ? '' : ' AND br.borrow_scope = ? ';
  const sql = `
    SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      br.approved_at,
      br.pre_usage_condition,
      br.processor_remarks,
      br.pre_usage_condition_images,
      DATE_FORMAT(br.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
      br.processor_decline_reason,
      DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
      br.return_condition,
      br.return_remarks,
      br.return_condition_images,
      br.processor_wet_borrow_pdf_url,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      u.first_name AS requester_first_name,
      u.last_name AS requester_last_name,
      u.username AS requester_username,
      u.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      a.asset_code AS asset_code,
      a.assetID AS asset_id,
      a.name AS asset_name,
      a.serial AS asset_serial,
      CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name,
      IFNULL(CONCAT(dh.first_name, ' ', dh.last_name), NULL) AS dept_head_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at,
      br.received_by,
      CONCAT(rb.first_name, ' ', rb.last_name) AS received_by_name,
      br.received_by_signature,
      DATE_FORMAT(br.received_at, '%Y-%m-%d %H:%i:%s') AS received_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users u ON br.user_id = u.userID
    LEFT JOIN companies co ON u.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN assets a ON br.asset_id = a.assetID AND a.deleted_at IS NULL
    LEFT JOIN users ap ON br.approved_by = ap.userID
    LEFT JOIN users dh ON br.dept_head_signed_by = dh.userID
    LEFT JOIN users rb ON br.received_by = rb.userID
    WHERE br.company_id = ?
      AND br.status = 'approved'
      AND br.approved_at IS NOT NULL
      AND br.returned_at IS NULL
      AND br.received_at IS NULL
      ${scopeClause}
    ORDER BY br.approved_at DESC
  `;

  const args: string[] = [companyId];
  if (borrowScope !== null) {
    args.push(borrowScope);
  }

  const [rows] = await pool.execute(sql, args);
  return rows as AssetBorrowRequestRow[];
}

export async function updateBorrowRequestStaffDecline(
  pool: Pool,
  params: { borrowRequestId: string; reason: string }
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET processor_declined_at = NOW(),
         processor_decline_reason = ?,
         status = 'declined',
         updated_at = NOW()
     WHERE borrow_request_id = ?
       AND declined_at IS NULL
       AND approved_at IS NULL`,
    [params.reason, params.borrowRequestId]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export async function updateBorrowRequestReturnProcess(
  pool: Pool,
  params: {
    borrowRequestId: string;
    returnCondition: string;
    returnRemarks?: string | null;
    returnConditionImages: string[];
  }
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET returned_at = NOW(),
         return_condition = ?,
         return_remarks = ?,
         return_condition_images = ?,
         status = 'returned',
         updated_at = NOW()
     WHERE borrow_request_id = ?
       AND approved_at IS NOT NULL
       AND returned_at IS NULL`,
    [
      params.returnCondition,
      params.returnRemarks ?? null,
      JSON.stringify(params.returnConditionImages),
      params.borrowRequestId,
    ]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

/** Available assets in the IT or Admin “temporary accountability” pool (unassigned, in-scope departments). */
export async function findAvailableAssetsForBorrowStaffPool(
  pool: Pool,
  params: {
    companyId: string;
    departmentIds: string[];
    preferredCategoryId: string;
    preferredTypeId: string;
  }
): Promise<
  {
    assetID: string;
    asset_code: string;
    name: string | null;
    serial: string | null;
    category_name: string | null;
    type_name: string | null;
    department_name: string | null;
  }[]
> {
  const ids = params.departmentIds.filter(Boolean);
  if (ids.length === 0) {
    return [];
  }
  const ph = ids.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT
       a.assetID,
       a.asset_code,
       a.name,
       a.serial,
       ac.name AS category_name,
       t.name AS type_name,
       d.name AS department_name
     FROM assets a
     LEFT JOIN asset_categories ac
       ON ac.categoryID = a.category_id
      AND ac.company_id = a.company_id
      AND ac.deleted_at IS NULL
     LEFT JOIN asset_types t
       ON t.typeID = a.type_id
      AND t.deleted_at IS NULL
     INNER JOIN asset_mngmnt_departments d
       ON d.departmentID = COALESCE(a.department_id, ac.department_id)
      AND d.deleted_at IS NULL
     WHERE a.company_id = ?
       AND a.deleted_at IS NULL
       AND a.asset_code IS NOT NULL
       AND TRIM(a.asset_code) <> ''
       AND a.status = 'Available'
       AND d.departmentID IN (${ph})
     ORDER BY
       CASE WHEN a.category_id <=> ? THEN 0 ELSE 1 END,
       CASE WHEN a.type_id <=> ? THEN 0 ELSE 1 END,
       COALESCE(ac.name, '') ASC,
       a.asset_code ASC`,
    [
      params.companyId,
      ...ids,
      params.preferredCategoryId,
      params.preferredTypeId,
    ]
  )) as [
    {
      assetID: string;
      asset_code: string;
      name: string | null;
      serial: string | null;
      category_name: string | null;
      type_name: string | null;
      department_name: string | null;
    }[],
    unknown
  ];
  return rows ?? [];
}

export async function getAvailableAssetByCodeForBorrowStaffPool(
  pool: Pool,
  params: {
    companyId: string;
    departmentIds: string[];
    assetCode: string;
  }
): Promise<{
  assetID: string;
  asset_code: string;
  name: string | null;
  serial: string | null;
} | null> {
  const ids = params.departmentIds.filter(Boolean);
  if (ids.length === 0) {
    return null;
  }
  const ph = ids.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT a.assetID, a.asset_code, a.name, a.serial
     FROM assets a
     LEFT JOIN asset_categories ac
       ON ac.categoryID = a.category_id
      AND ac.company_id = a.company_id
      AND ac.deleted_at IS NULL
     INNER JOIN asset_mngmnt_departments d
       ON d.departmentID = COALESCE(a.department_id, ac.department_id)
      AND d.deleted_at IS NULL
     WHERE a.company_id = ?
       AND a.deleted_at IS NULL
       AND a.status = 'Available'
       AND a.asset_code IS NOT NULL
       AND a.asset_code = ?
       AND d.departmentID IN (${ph})
     LIMIT 1`,
    [params.companyId, params.assetCode, ...ids]
  )) as [{ assetID: string; asset_code: string; name: string | null; serial: string | null }[], unknown];
  return rows?.[0] ?? null;
}

/**
 * Get borrow forms by asset ID. Queries asset_borrow_requests table
 * to find forms that include the specified asset.
 */
export async function getBorrowFormsByAssetId(
  pool: Pool,
  assetId: string
): Promise<AssetBorrowRequestRow[]> {
  const [rows] = await pool.execute<AssetBorrowRequestRow[]>(
    `SELECT
      br.borrow_request_id,
      br.company_id,
      br.user_id,
      br.borrow_scope,
      br.category_id,
      br.type_id,
      br.form_number,
      br.expected_return_at,
      br.purpose,
      br.status,
      DATE_FORMAT(br.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
      br.dept_head_signed_by,
      DATE_FORMAT(br.approved_at, '%Y-%m-%d %H:%i:%s') AS approved_at,
      br.approved_by,
      br.pre_usage_condition,
      br.processor_remarks,
      br.pre_usage_condition_images,
      DATE_FORMAT(br.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
      br.processor_decline_reason,
      DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at,
      br.return_condition,
      br.return_remarks,
      br.return_condition_images,
      br.processor_wet_borrow_pdf_url,
      DATE_FORMAT(br.declined_at, '%Y-%m-%d %H:%i:%s') AS declined_at,
      br.created_at,
      br.updated_at,
      c.name AS category_name,
      t.name AS type_name,
      u.first_name AS requester_first_name,
      u.last_name AS requester_last_name,
      u.username AS requester_username,
      u.email AS requester_email,
      co.name AS requester_company_name,
      co.logo_url AS requester_company_logo_url,
      d.name AS requester_department_name,
      a.asset_code AS asset_code,
      a.assetID AS asset_id,
      a.name AS asset_name,
      a.serial AS asset_serial,
      CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name,
      IFNULL(CONCAT(dh.first_name, ' ', dh.last_name), NULL) AS dept_head_name,
      br.requested_by_signature,
      br.processor_signature,
      DATE_FORMAT(br.processor_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_signed_at
    FROM asset_borrow_requests br
    INNER JOIN asset_categories c ON br.category_id = c.categoryID AND c.deleted_at IS NULL
    INNER JOIN asset_types t ON br.type_id = t.typeID AND t.deleted_at IS NULL
    INNER JOIN users u ON br.user_id = u.userID
    LEFT JOIN companies co ON u.company_id = co.companyID AND co.deleted_at IS NULL
    LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
    LEFT JOIN assets a ON br.asset_id = a.assetID AND a.deleted_at IS NULL
    LEFT JOIN users ap ON br.approved_by = ap.userID
    LEFT JOIN users dh ON br.dept_head_signed_by = dh.userID
    WHERE br.asset_id = ?
    ORDER BY br.created_at DESC`,
    [assetId]
  );
  return rows;
}

export async function getAssignmentForBorrowRequest(
  pool: Pool,
  assetId: string,
  userId: string
): Promise<{ assignmentID: string; status: string } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT assignmentID, status FROM asset_assignments
     WHERE asset_id = ? AND user_id = ? AND deleted_at IS NULL
     ORDER BY assigned_date DESC LIMIT 1`,
    [assetId, userId]
  );
  const row = rows[0];
  if (!row) return null;
  return { assignmentID: row.assignmentID as string, status: row.status as string };
}

export async function updateAssignmentStatusActive(
  pool: Pool,
  assignmentId: string
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_assignments SET status = 'Active', updated_at = NOW()
     WHERE assignmentID = ? AND deleted_at IS NULL`,
    [assignmentId]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

export async function updateBorrowRequestReceived(
  pool: Pool,
  borrowRequestId: string,
  receivedByUserId: string,
  receivedBySignature?: string | null
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE asset_borrow_requests
     SET received_at = NOW(), received_by = ?, received_by_signature = ?, status = 'approved', updated_at = NOW()
     WHERE borrow_request_id = ? AND approved_at IS NOT NULL AND received_at IS NULL`,
    [receivedByUserId, receivedBySignature ?? null, borrowRequestId]
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
}

import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { pool } from '../db.js';

/**
 * Accountability-form repository: every SQL touching `accountability_forms`,
 * `accountability_form_settings`, plus validation lookups against
 * `users`, `assets`, `asset_assignments`, and `notifications` lives here.
 *
 * Behaviour mirrors the inline SQL that previously lived in
 * `controllers/accountabilityForms.controller.ts`. Transactional helpers
 * accept a `PoolConnection` so the controller's existing transaction
 * boundaries (decline + re-assign + re-enable previous form) are preserved
 * 1:1.
 */

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface UserPermissionFlagRow extends RowDataPacket {
  permission_type: 'view' | 'create' | 'edit' | 'delete' | string;
  granted: 0 | 1;
}

export interface AccountabilityFormSettingsRow extends RowDataPacket {
  id: string;
  company_id: string;
  it_asset_code: string | null;
  admin_asset_code: string | null;
  company_format: string | null;
  department_format: string | null;
  date_format: string | null;
  include_date: 0 | 1 | null;
  clearance_form_code: string | null;
  clearance_department_format: string | null;
  clearance_include_date: 0 | 1 | null;
  clearance_date_format: string | null;
}

export interface CompanyCodePrefixRow extends RowDataPacket {
  code: string | null;
  prefix: string | null;
}

export interface NextSeqRow extends RowDataPacket {
  next_seq: number;
}

export interface FormIdRow extends RowDataPacket {
  formID: string;
}

export interface CompanyIdRow extends RowDataPacket {
  company_id: string | null;
}

export interface UserCompanyNameRow extends RowDataPacket {
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface UserNameRow extends RowDataPacket {
  first_name: string | null;
  last_name: string | null;
}

export interface AssignmentMiniRow extends RowDataPacket {
  assignmentID: string;
  status: string;
}

export interface AssetForFormRow extends RowDataPacket {
  category_id: string | null;
  type_id: string | null;
  category_name: string | null;
  type_name: string | null;
  department_name: string | null;
}

export interface FormFullRow extends RowDataPacket {
  formID: string;
  form_number: string;
  user_id: string;
  asset_id: string | null;
  assignment_id: string | null;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  status: string;
  decline_reason: string | null;
  acknowledgments: unknown;
  assets_data: unknown;
  issuer_signature: string | null;
  it_copy_signature: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
  received_copy_201_file_signature: string | null;
  received_copy_201_file_signed_at: string | null;
  received_copy_201_file_signed_by: string | null;
  received_copy_201_file_signed_by_name: string | null;
  received_copy_wet_pdf_url: string | null;
  dept_head_signed_by?: string | null;
  dept_head_signed_by_name?: string | null;
  dept_head_signature?: string | null;
  dept_head_signed_at?: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssetsDataOnlyRow extends RowDataPacket {
  assets_data: unknown;
}

export interface ActiveAssignmentForUserAssetRow extends RowDataPacket {
  assignmentID: string;
  asset_id: string;
  user_id: string;
  status: string;
}

export interface AssetExistsRow extends RowDataPacket {
  assetID: string;
}

export interface UnsignedFormRow extends RowDataPacket {
  formID: string;
  form_number: string;
  user_id: string;
  status: string;
  created_at: string | null;
  asset_code: string | null;
  asset_name: string | null;
}

// ---------------------------------------------------------------------------
// Permissions / settings / generation lookups
// ---------------------------------------------------------------------------

export async function getUserAccountabilityFormPermissions(
  userId: string
): Promise<UserPermissionFlagRow[]> {
  const [rows] = await pool.execute<UserPermissionFlagRow[]>(
    `SELECT permission_type, granted FROM user_permissions
     WHERE user_id = ? AND module_name = 'Accountability Form'`,
    [userId]
  );
  return rows;
}

export async function getAccountabilityFormSettings(
  companyId: string
): Promise<AccountabilityFormSettingsRow | null> {
  const [rows] = await pool.execute<AccountabilityFormSettingsRow[]>(
    `SELECT * FROM accountability_form_settings
     WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getAccountabilityClearanceFormSettings(companyId: string): Promise<{
  company_format: string | null;
  department_format: string | null;
  form_code: string | null;
  include_date: 0 | 1 | null;
  date_format: string | null;
} | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT company_format, department_format, form_code, include_date, date_format
     FROM accountability_clearance_form_settings
     WHERE company_id = ? AND deleted_at IS NULL LIMIT 1`,
    [companyId]
  );
  return (rows[0] as any) ?? null;
}

export async function getCompanyCodePrefix(
  companyId: string
): Promise<CompanyCodePrefixRow | null> {
  const [rows] = await pool.execute<CompanyCodePrefixRow[]>(
    `SELECT code, prefix FROM companies WHERE companyID = ? AND deleted_at IS NULL`,
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getHrDepartmentCodePrefix(
  companyId: string
): Promise<CompanyCodePrefixRow | null> {
  const [rows] = await pool.execute<CompanyCodePrefixRow[]>(
    `SELECT code, prefix FROM asset_mngmnt_departments
     WHERE company_id = ? AND deleted_at IS NULL
       AND (
         LOWER(TRIM(name)) = 'hr'
         OR LOWER(TRIM(name)) LIKE 'hr department%'
         OR LOWER(TRIM(name)) = 'human resource'
         OR LOWER(TRIM(name)) LIKE 'human resource department%'
         OR LOWER(TRIM(name)) = 'human resources'
         OR LOWER(TRIM(name)) LIKE 'human resources department%'
       )
     ORDER BY CASE WHEN LOWER(TRIM(name)) = 'hr' THEN 0 ELSE 1 END
     LIMIT 1`,
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getDepartmentCodePrefix(
  departmentId: string
): Promise<CompanyCodePrefixRow | null> {
  const [rows] = await pool.execute<CompanyCodePrefixRow[]>(
    `SELECT code, prefix FROM asset_mngmnt_departments
     WHERE departmentID = ? AND deleted_at IS NULL`,
    [departmentId]
  );
  return rows[0] ?? null;
}

export async function getNextFormSequence(likeParam: string): Promise<number> {
  const [rows] = await pool.execute<NextSeqRow[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM accountability_forms
     WHERE form_number LIKE CONCAT(?, '-%')`,
    [likeParam]
  );
  return Number(rows[0]?.next_seq ?? 1);
}

export async function findFormIdByFormNumber(
  formNumber: string
): Promise<string | null> {
  const [rows] = await pool.execute<FormIdRow[]>(
    `SELECT formID FROM accountability_forms
     WHERE form_number = ? AND deleted_at IS NULL LIMIT 1`,
    [formNumber]
  );
  return rows[0]?.formID ?? null;
}

export async function getCompanyIdByDepartmentId(
  departmentId: string
): Promise<string | null> {
  const [rows] = await pool.execute<CompanyIdRow[]>(
    `SELECT company_id FROM asset_mngmnt_departments
     WHERE departmentID = ? AND deleted_at IS NULL`,
    [departmentId]
  );
  return rows[0]?.company_id ?? null;
}

export async function getUserCompanyAndName(
  userId: string
): Promise<UserCompanyNameRow | null> {
  const [rows] = await pool.execute<UserCompanyNameRow[]>(
    `SELECT company_id, first_name, last_name FROM users WHERE userID = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserNameById(
  userId: string
): Promise<UserNameRow | null> {
  const [rows] = await pool.execute<UserNameRow[]>(
    'SELECT first_name, last_name FROM users WHERE userID = ?',
    [userId]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export async function getAssignmentForFormCheck(
  assignmentId: string
): Promise<AssignmentMiniRow | null> {
  const [rows] = await pool.execute<AssignmentMiniRow[]>(
    'SELECT assignmentID, status FROM asset_assignments WHERE assignmentID = ? AND deleted_at IS NULL',
    [assignmentId]
  );
  return rows[0] ?? null;
}

export async function findFormIdByAssignmentId(
  assignmentId: string
): Promise<string | null> {
  const [rows] = await pool.execute<FormIdRow[]>(
    'SELECT formID FROM accountability_forms WHERE assignment_id = ? AND deleted_at IS NULL',
    [assignmentId]
  );
  return rows[0]?.formID ?? null;
}

export async function getAssetForFormCreation(
  assetId: string
): Promise<AssetForFormRow | null> {
  const [rows] = await pool.execute<AssetForFormRow[]>(
    `SELECT a.category_id, a.type_id, ac.name as category_name, at.name as type_name,
            d.name as department_name
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.assetID = ? AND a.deleted_at IS NULL`,
    [assetId]
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Inserts / mutations
// ---------------------------------------------------------------------------

export async function insertAccountabilityFormMulti(args: {
  formNumber: string;
  userId: string;
  departmentId: string | null;
  locationId: string | null;
  createdBy: string;
  assetsDataJson: string;
  issuerSignature: string | null;
  itCopySignature: string | null;
  assignmentId?: string | null;
  approvalStatus?: string;
  adminCopySignerId?: string | null;
  adminCopyCopyType?: 'IT' | 'Admin' | null;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO accountability_forms
     (form_number, assignment_id, asset_id, user_id, department_id, location_id, created_by, assets_data, issuer_signature, it_copy_signature,
      approval_status, admin_copy_signer_id, admin_copy_copy_type)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      args.formNumber,
      args.assignmentId || null,
      args.userId,
      args.departmentId,
      args.locationId,
      args.createdBy,
      args.assetsDataJson,
      args.issuerSignature,
      args.itCopySignature,
      args.approvalStatus ?? 'approved',
      args.adminCopySignerId ?? null,
      args.adminCopyCopyType ?? null,
    ]
  );
}

export async function insertAccountabilityFormSingle(args: {
  formNumber: string;
  assignmentId: string;
  assetId: string;
  userId: string;
  departmentId: string | null;
  locationId: string | null;
  createdBy: string;
  issuerSignature: string | null;
  itCopySignature: string | null;
  approvalStatus?: string;
  adminCopySignerId?: string | null;
  adminCopyCopyType?: 'IT' | 'Admin' | null;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO accountability_forms
     (form_number, assignment_id, asset_id, user_id, department_id, location_id, created_by, issuer_signature, it_copy_signature,
      approval_status, admin_copy_signer_id, admin_copy_copy_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      args.formNumber,
      args.assignmentId,
      args.assetId,
      args.userId,
      args.departmentId,
      args.locationId,
      args.createdBy,
      args.issuerSignature,
      args.itCopySignature,
      args.approvalStatus ?? 'approved',
      args.adminCopySignerId ?? null,
      args.adminCopyCopyType ?? null,
    ]
  );
}

export async function updateFormSigned(
  formId: string,
  acknowledgmentsJson: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await pool.execute(
    `UPDATE accountability_forms
     SET status = 'Signed', acknowledgments = ?, signed_at = NOW(),
         signed_ip = ?, signed_user_agent = ?, updated_at = NOW()
     WHERE formID = ?`,
    [acknowledgmentsJson, ip, userAgent, formId]
  );
}

export async function updateFormReceivedCopySignature(
  formId: string,
  digitalInitials: string | null,
  signedBy: string,
  signedByName: string | null
): Promise<void> {
  await pool.execute(
    `UPDATE accountability_forms
     SET received_copy_201_file_signature = ?,
         received_copy_201_file_signed_at = NOW(),
         received_copy_201_file_signed_by = ?,
         received_copy_201_file_signed_by_name = ?, updated_at = NOW()
     WHERE formID = ?`,
    [digitalInitials, signedBy, signedByName, formId]
  );
}

export async function insertDeclineNotification(
  recipientUserId: string,
  title: string,
  message: string,
  type: string,
  dataJson: string
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO notifications (user_id, title, message, type, data, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'unread', NOW())`,
    [recipientUserId, title, message, type, dataJson]
  );
  return result.insertId;
}

// ---------------------------------------------------------------------------
// Intangible asset helpers (update snapshot in form assets_data)
// ---------------------------------------------------------------------------

export interface FormAssetsDataRow extends RowDataPacket {
  formID: string;
  assets_data: unknown;
  status: string;
}

export async function findActiveFormsByIntangibleAssetId(
  intangibleAssetId: string
): Promise<FormAssetsDataRow[]> {
  const [rows] = await pool.execute<FormAssetsDataRow[]>(
    `SELECT formID, assets_data, status FROM accountability_forms
     WHERE deleted_at IS NULL
       AND status IN ('Pending', 'Signed')
       AND JSON_SEARCH(assets_data, 'one', ?) IS NOT NULL`,
    [intangibleAssetId]
  );
  return rows;
}

export async function updateFormAssetsDataById(
  formId: string,
  assetsDataJson: string
): Promise<void> {
  await pool.execute(
    `UPDATE accountability_forms SET assets_data = ?, updated_at = NOW() WHERE formID = ?`,
    [assetsDataJson, formId]
  );
}

/**
 * Merge newly assigned assets into an in-flight accountability form instead
 * of disabling + recreating it, so a single live form carries the whole
 * issuance flow (mixed tangible+intangible or repeat issuance while
 * pending). Unions `assets` by id and `assignment_ids`, preserving every
 * other `assets_data` key. Returns the merged totals.
 */
export async function mergeAssetsIntoFormAssetsData(
  formId: string,
  newAssets: any[],
  newAssignmentIds: string[]
): Promise<{ assetCount: number; assignmentIds: string[] }> {
  const [rows] = await pool.execute(
    'SELECT assets_data FROM accountability_forms WHERE formID = ? AND deleted_at IS NULL',
    [formId]
  );
  const raw = (rows as Array<{ assets_data?: unknown }>)[0]?.assets_data;
  let existing: Record<string, any> = {};
  if (raw != null && raw !== '') {
    try {
      const parsed = Buffer.isBuffer(raw)
        ? JSON.parse(raw.toString('utf8'))
        : typeof raw === 'string'
          ? JSON.parse(raw)
          : raw;
      if (parsed && typeof parsed === 'object') {
        existing = parsed as Record<string, any>;
      }
    } catch {
      /* fall through with empty base */
    }
  }
  const assets = Array.isArray(existing.assets) ? [...existing.assets] : [];
  const seen = new Set(
    assets.map((a: any) => String(a?.id ?? a?.assetID ?? '').trim()).filter(Boolean)
  );
  for (const asset of newAssets ?? []) {
    const key = String((asset as any)?.id ?? '').trim();
    if (key && !seen.has(key)) {
      assets.push(asset);
      seen.add(key);
    }
  }
  const assignmentIds = Array.isArray(existing.assignment_ids)
    ? (existing.assignment_ids as unknown[]).map(v => String(v ?? '').trim()).filter(Boolean)
    : [];
  for (const id of newAssignmentIds ?? []) {
    const key = String(id ?? '').trim();
    if (key && !assignmentIds.includes(key)) assignmentIds.push(key);
  }
  await updateFormAssetsDataById(
    formId,
    JSON.stringify({ ...existing, assets, assignment_ids: assignmentIds })
  );
  return { assetCount: assets.length, assignmentIds };
}

export interface ActiveIntangibleAssetForFormRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  risk_level_id: string | null;
  risk_level_id_resolved: string | null;
  risk_level_name: string | null;
  risk_level_color: string | null;
  department_id: string | null;
  department_name: string | null;
  type_department_id: string | null;
  type_department_name: string | null;
  type_department_code: string | null;
}

export async function getActiveIntangibleAssetsByUserAndDepartment(
  userId: string,
  departmentId: string
): Promise<ActiveIntangibleAssetForFormRow[]> {
  const [rows] = await pool.execute<ActiveIntangibleAssetForFormRow[]>(
    `SELECT
       ia.id,
       ia.name,
       ia.description,
       ia.type,
       ia.risk_level_id,
       iaa.department_id,
       d.name AS department_name,
       td.departmentID AS type_department_id,
       td.name AS type_department_name,
       td.code AS type_department_code,
       rl.id AS risk_level_id_resolved,
       rl.name AS risk_level_name,
       rl.color AS risk_level_color
     FROM intangible_asset_assignments iaa
     INNER JOIN intangible_assets ia ON iaa.intangible_asset_id = ia.id
     LEFT JOIN intangible_asset_types iat
       ON ia.type = iat.name
       AND iat.company_id = ia.company_id
       AND iat.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments td
       ON iat.department_id = td.departmentID
       AND td.deleted_at IS NULL
     LEFT JOIN risk_levels rl
       ON ia.risk_level_id = rl.id
       AND rl.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments d
       ON iaa.department_id = d.departmentID
       AND d.deleted_at IS NULL
     WHERE iaa.user_id = ?
       AND iaa.department_id = ?
       AND iaa.status = 'Active'
       AND iaa.deleted_at IS NULL`,
    [userId, departmentId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Form lookups (single)
// ---------------------------------------------------------------------------

export async function getFormById(
  formId: string
): Promise<FormFullRow | null> {
  const [rows] = await pool.execute<FormFullRow[]>(
    'SELECT * FROM accountability_forms WHERE formID = ? AND deleted_at IS NULL',
    [formId]
  );
  return rows[0] ?? null;
}

export async function getFormAssetsDataById(
  formId: string
): Promise<unknown | null> {
  const [rows] = await pool.execute<AssetsDataOnlyRow[]>(
    'SELECT assets_data FROM accountability_forms WHERE formID = ? AND deleted_at IS NULL',
    [formId]
  );
  return rows[0]?.assets_data ?? null;
}

// ---------------------------------------------------------------------------
// Joined form list / view (used by getByAssetId, getList, getById full-detail)
// ---------------------------------------------------------------------------

/** SELECT clause shared by getByAssetId, getList, and getById full views. */
const FORM_FULL_SELECT_AND_JOINS = `
SELECT
  af.*,
  a.asset_code,
  a.name as asset_name,
  a.category_id,
  a.type_id,
  a.serial,
  a.model as assetModelNo,
  ac.name as category_name,
  at.name as type_name,
  u.first_name,
  u.last_name,
  u.email,
  u.employee_number as employeeNumber,
  u.position as position,
  c.logo_url as user_company_logo_url,
  c.companyID as user_company_id,
  c.name as user_company_name,
  ud.departmentID as user_department_id,
  ud.name as user_department_name,
  d.name as department_name,
  l.name as location_name,
  l.floor_unit,
  l.building,
  lr.room_name,
  aa.assigned_date,
  aa.expected_return_date,
  aa.assignment_notes,
  aa.assigned_by,
  assigned_by_user.first_name as assigned_by_first_name,
  assigned_by_user.last_name as assigned_by_last_name,
  assigned_by_user.email as assigned_by_email,
  af.created_by,
  created_by_user.first_name as created_by_first_name,
  created_by_user.last_name as created_by_last_name,
  created_by_user.email as created_by_email,
  received_copy_signer.first_name as received_copy_signer_first_name,
  received_copy_signer.last_name as received_copy_signer_last_name,
  admin_copy_signer.first_name as admin_copy_signer_first_name,
  admin_copy_signer.last_name as admin_copy_signer_last_name,
  approved_by_user.first_name as approved_by_first_name,
  approved_by_user.last_name as approved_by_last_name,
  approved_by_user.digital_signature as approved_by_digital_signature,
  dept_head_signer.first_name as dept_head_signer_first_name,
  dept_head_signer.last_name as dept_head_signer_last_name,
  dept_head_signer.digital_signature as dept_head_signer_digital_signature,
  clearance_it_signer.first_name as clearance_it_signer_first_name,
  clearance_it_signer.last_name as clearance_it_signer_last_name,
  clearance_admin_signer.first_name as clearance_admin_signer_first_name,
  clearance_admin_signer.last_name as clearance_admin_signer_last_name,
  clearance_hr_signer.first_name as clearance_hr_signer_first_name,
  clearance_hr_signer.last_name as clearance_hr_signer_last_name
FROM accountability_forms af
LEFT JOIN assets a ON af.asset_id = a.assetID
LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
LEFT JOIN asset_types at ON a.type_id = at.typeID
LEFT JOIN users u ON af.user_id = u.userID
LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
LEFT JOIN asset_mngmnt_departments d ON af.department_id = d.departmentID
LEFT JOIN asset_mngmnt_locations l ON af.location_id = l.locationID
LEFT JOIN asset_mngmnt_location_rooms lr ON af.location_room_id = lr.roomID
LEFT JOIN asset_assignments aa ON af.assignment_id = aa.assignmentID
LEFT JOIN users assigned_by_user ON aa.assigned_by = assigned_by_user.userID
LEFT JOIN users created_by_user ON af.created_by = created_by_user.userID
LEFT JOIN users received_copy_signer ON af.received_copy_201_file_signed_by = received_copy_signer.userID
LEFT JOIN users admin_copy_signer ON af.admin_copy_signer_id = admin_copy_signer.userID
LEFT JOIN users approved_by_user ON af.approved_by = approved_by_user.userID
LEFT JOIN users dept_head_signer ON af.dept_head_signed_by = dept_head_signer.userID
LEFT JOIN users clearance_it_signer ON af.clearance_it_signer_id = clearance_it_signer.userID
LEFT JOIN users clearance_admin_signer ON af.clearance_admin_signer_id = clearance_admin_signer.userID
LEFT JOIN users clearance_hr_signer ON af.clearance_hr_signer_id = clearance_hr_signer.userID`;

export async function findFormsByAssetId(
  assetId: string
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL
       AND (
         af.asset_id = ?
         OR af.assets_data LIKE ?
         OR af.formID IN (
           SELECT af2.formID
           FROM accountability_forms af2
           JOIN intangible_asset_assignments iaa
             ON af2.user_id = iaa.user_id
            AND af2.department_id = iaa.department_id
           WHERE iaa.intangible_asset_id = ?
             AND iaa.status = 'Active'
             AND iaa.deleted_at IS NULL
             AND af2.deleted_at IS NULL
             AND af2.status IN ('Pending', 'Signed')
         )
       )
     ORDER BY af.created_at DESC`,
    [assetId, `%${assetId}%`, assetId]
  );
  return rows;
}

export async function listAccountabilityForms(filters: {
  userId?: string | undefined;
  status?: string | undefined;
  companyId?: string | undefined;
  departmentIds?: string[] | undefined;
}): Promise<RowDataPacket[]> {
  const where: string[] = ['af.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (filters.userId) {
    where.push('af.user_id = ?');
    params.push(filters.userId);
  }
  if (filters.status) {
    where.push('af.status = ?');
    params.push(filters.status);
  }
  if (filters.companyId) {
    where.push('u.company_id = ?');
    params.push(filters.companyId);
  }
  if (filters.departmentIds && filters.departmentIds.length > 0) {
    const ph = filters.departmentIds.map(() => '?').join(',');
    where.push(
      `(ud.departmentID IN (${ph}) OR d.departmentID IN (${ph}))`
    );
    params.push(...filters.departmentIds, ...filters.departmentIds);
  }
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE ${where.join(' AND ')}
     ORDER BY af.created_at DESC`,
    params
  );
  return rows;
}

export async function getFormFullDetailById(
  formId: string
): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.formID = ? AND af.deleted_at IS NULL`,
    [formId]
  );
  return rows[0] ?? null;
}

export async function findUnsignedFormsByUserId(
  userId: string
): Promise<UnsignedFormRow[]> {
  const [rows] = await pool.execute<UnsignedFormRow[]>(
    `SELECT
       af.formID, af.form_number, af.user_id, af.status, af.created_at,
       a.asset_code, a.name as asset_name
     FROM accountability_forms af
     LEFT JOIN assets a ON af.asset_id = a.assetID
     WHERE af.user_id = ?
       AND af.deleted_at IS NULL
       AND af.status = 'Pending'
     ORDER BY af.created_at DESC`,
    [userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Transactional helpers (decline flow)
//
// These accept a `PoolConnection` so the controller's existing
// `beginTransaction / commit / rollback` boundaries remain intact.
// ---------------------------------------------------------------------------

export async function findActiveAssignmentForUserAssetTx(
  conn: PoolConnection,
  userId: string,
  assetId: string
): Promise<ActiveAssignmentForUserAssetRow | null> {
  const [rows] = await conn.execute<ActiveAssignmentForUserAssetRow[]>(
    `SELECT assignmentID, asset_id, user_id, status FROM asset_assignments
     WHERE user_id = ? AND asset_id = ? AND status = 'Active' AND deleted_at IS NULL
     LIMIT 1`,
    [userId, assetId]
  );
  return rows[0] ?? null;
}

export async function callReturnAssignmentTx(
  conn: PoolConnection,
  assignmentId: string,
  returnNotes: string,
  returnedBy: string
): Promise<void> {
  await conn.execute('CALL sp_return_assignment(?, ?, ?, ?)', [
    assignmentId,
    returnNotes,
    null,
    returnedBy,
  ]);
}

export async function findAssignmentIdForUserAssetTx(
  conn: PoolConnection,
  userId: string,
  assetId: string
): Promise<string | null> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT assignmentID FROM asset_assignments
     WHERE user_id = ? AND asset_id = ? AND status = 'Active' AND deleted_at IS NULL`,
    [userId, assetId]
  );
  const id = (rows[0] as { assignmentID?: string } | undefined)?.assignmentID;
  return id ?? null;
}

export async function assetExistsTx(
  conn: PoolConnection,
  assetId: string
): Promise<boolean> {
  const [rows] = await conn.execute<AssetExistsRow[]>(
    'SELECT assetID FROM assets WHERE assetID = ? AND deleted_at IS NULL',
    [assetId]
  );
  return rows.length > 0;
}

export async function callCreateAssignmentTx(
  conn: PoolConnection,
  args: {
    assignmentId: string;
    assetId: string;
    userId: string;
    departmentId: string | null;
    locationId: string | null;
    locationRoomId: string | null;
    expectedReturnDate: string | null;
    assignmentNotes: string;
    assignedBy: string;
  }
): Promise<void> {
  await conn.execute('CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    args.assignmentId,
    args.assetId,
    args.userId,
    args.departmentId,
    args.locationId,
    args.locationRoomId,
    args.expectedReturnDate,
    args.assignmentNotes,
    args.assignedBy,
  ]);
}

export async function updateFormDeclinedTx(
  conn: PoolConnection,
  formId: string,
  reason: string
): Promise<number> {
  const [result] = await conn.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET status = 'Disabled', decline_reason = ?, updated_at = NOW()
     WHERE formID = ? AND status = 'Pending' AND deleted_at IS NULL`,
    [reason, formId]
  );
  return result.affectedRows;
}

export async function getFormByIdTx(
  conn: PoolConnection,
  formId: string
): Promise<FormFullRow | null> {
  const [rows] = await conn.execute<FormFullRow[]>(
    'SELECT * FROM accountability_forms WHERE formID = ? AND deleted_at IS NULL',
    [formId]
  );
  return rows[0] ?? null;
}

export async function updateFormStatusTx(
  conn: PoolConnection,
  formId: string,
  status: string
): Promise<void> {
  await conn.execute(
    'UPDATE accountability_forms SET status = ?, updated_at = NOW() WHERE formID = ?',
    [status, formId]
  );
}

// ---------------------------------------------------------------------------
// Asset Movement (disabled form lineage)
// ---------------------------------------------------------------------------

/**
 * Resolve the assignment → asset mapping for the assignment ids stored in a
 * form's assets_data. Used by the movement resolver to attribute return /
 * transfer forms to the correct asset.
 */
export async function getAssignmentAssetMapping(
  assignmentIds: string[]
): Promise<Array<{ assignment_id: string; asset_id: string }>> {
  if (assignmentIds.length === 0) return [];
  const placeholders = assignmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT assignmentID AS assignment_id, asset_id
     FROM asset_assignments
     WHERE assignmentID IN (${placeholders}) AND deleted_at IS NULL`,
    assignmentIds
  )) as any[];
  return rows as any[];
}

/**
 * Find return forms linked to the given assignment ids. A return form groups
 * one or more returned assignments (`asset_returns.assignment_id` →
 * `asset_return_forms.formID`).
 */
export async function getReturnFormsByAssignmentIds(
  assignmentIds: string[]
): Promise<
  Array<{
    formID: string;
    form_number: string;
    assignment_id: string;
    user_id: string;
    user_name: string;
    created_at: string;
  }>
> {
  if (assignmentIds.length === 0) return [];
  const placeholders = assignmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT arf.formID, arf.form_number, ar.assignment_id, arf.user_id,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            DATE_FORMAT(arf.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM asset_returns ar
     JOIN asset_return_forms arf
       ON ar.form_id = arf.formID AND arf.deleted_at IS NULL
     LEFT JOIN users u ON arf.user_id = u.userID
     WHERE ar.assignment_id IN (${placeholders}) AND ar.deleted_at IS NULL
     ORDER BY arf.created_at DESC`,
    assignmentIds
  )) as any[];
  return rows as any[];
}

/**
 * Find transfer forms linked to the given assignments (via
 * `transfer_form_assignments.assignment_id`) or to the given return forms
 * (via `asset_transfer_forms.return_form_id`).
 */
export async function getTransferFormsForMovement(
  assignmentIds: string[],
  _returnFormIds: string[] = []
): Promise<
  Array<{
    formID: string;
    form_number: string;
    assignment_id: string | null;
    return_form_id: string | null;
    user_id: string;
    user_name: string;
    new_assigned_user_id: string | null;
    new_user_name: string;
    created_at: string;
  }>
> {
  // Strictly filter by assignment – the previous OR with return_form_id caused
  // transfers for *other* assets sharing the same return batch (and therefore
  // transfers from other companies) to leak into this asset's movement chain.
  // Every transfer created from a return also writes its assignment into
  // transfer_form_assignments, so the assignment path is sufficient and precise.
  if (assignmentIds.length === 0) return [];
  const ph = assignmentIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT DISTINCT atf.formID, atf.form_number, tfa.assignment_id,
            atf.return_form_id, atf.user_id,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            atf.new_assigned_user_id,
            CONCAT(nu.first_name, ' ', nu.last_name) AS new_user_name,
            DATE_FORMAT(atf.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM asset_transfer_forms atf
     JOIN transfer_form_assignments tfa ON atf.formID = tfa.form_id
     LEFT JOIN users u ON atf.user_id = u.userID
     LEFT JOIN users nu ON atf.new_assigned_user_id = nu.userID
     WHERE atf.deleted_at IS NULL
       AND tfa.assignment_id IN (${ph})
     ORDER BY created_at DESC`,
    [...assignmentIds]
  )) as any[];
  return rows as any[];
}

// ---------------------------------------------------------------------------
// Approval-flow helpers
//
// `approval_status` on `accountability_forms` drives flows:
// Standard (IT/Admin asset): 1. `pending_admin_copy_signature` -> 2. `pending_owner_signature` -> 3. `pending_approval` -> 4. `approved`
// Unified clearance (`form_origin='clearance', clearance_scope='Unified'`):
//   1. `pending_approval` -> waiting for owner's designated approver/sub-approver
//   2. `pending_it`       -> waiting for IT Asset role
//   3. `pending_admin`    -> waiting for Admin Asset role
//   4. `pending_hr`       -> waiting for HR Receiver
//   5. `approved`
// ---------------------------------------------------------------------------

export interface AdminCopySignerUserRow extends RowDataPacket {
  userID: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/**
 * Resolve a user-shaped row by id (used to enrich signer/approver names in
 * approval responses).
 */
export async function getAdminCopySignerUser(
  userId: string
): Promise<AdminCopySignerUserRow | null> {
  const [rows] = await pool.execute<AdminCopySignerUserRow[]>(
    `SELECT userID, first_name, last_name, email
     FROM users
     WHERE userID = ? AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Update the IT/Admin copy signature columns and (optionally) flip the
 * approval status. Returns the new approval status.
 */
export async function updateAdminCopySignature(
  formId: string,
  signature: string | null,
  newApprovalStatus: 'pending_owner_signature' | 'pending_approval' | 'approved'
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET admin_copy_signature = ?,
         admin_copy_signed_at = NOW(),
         approval_status = ?,
         updated_at = NOW()
     WHERE formID = ? AND approval_status = 'pending_admin_copy_signature'`,
    [signature, newApprovalStatus, formId]
  );
  return result.affectedRows;
}

/**
 * Flip `approval_status` after the accountability owner signs. Only acts on
 * forms currently in `pending_owner_signature`; returns affected rows.
 */
export async function updateOwnerSignatureApproval(
  formId: string,
  newApprovalStatus: 'pending_approval' | 'approved'
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET approval_status = ?,
         updated_at = NOW()
     WHERE formID = ? AND approval_status = 'pending_owner_signature'`,
    [newApprovalStatus, formId]
  );
  return result.affectedRows;
}

/**
 * Set `approval_status = 'approved'`. Only acts on forms currently in
 * `pending_approval`; returns affected rows.
 */
export async function updateFormApproval(args: {
  formId: string;
  approvedBy: string;
  approvalNotes: string | null;
  deptHeadSignature?: string | null;
  deptHeadSignedByName?: string | null;
}): Promise<number> {
  // Stamp the Department head signatory (new field set) together with the
  // generic approval columns. Falls back to the legacy update when the
  // dept_head_* migration has not been applied yet.
  // The status guard ensures a superseded (Disabled/Revoked) form can never
  // be approved, even if an approval request was in flight concurrently.
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE accountability_forms
       SET approval_status = 'approved',
           approved_by = ?,
           approved_at = NOW(),
           approval_notes = ?,
           dept_head_signed_by = ?,
           dept_head_signed_by_name = ?,
           dept_head_signature = ?,
           dept_head_signed_at = NOW(),
           updated_at = NOW()
       WHERE formID = ? AND approval_status = 'pending_approval'
         AND status IN ('Pending', 'Signed')`,
      [
        args.approvedBy,
        args.approvalNotes,
        args.approvedBy,
        args.deptHeadSignedByName ?? null,
        args.deptHeadSignature ?? null,
        args.formId,
      ]
    );
    return result.affectedRows;
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE accountability_forms
       SET approval_status = 'approved',
           approved_by = ?,
           approved_at = NOW(),
           approval_notes = ?,
           updated_at = NOW()
       WHERE formID = ? AND approval_status = 'pending_approval'
         AND status IN ('Pending', 'Signed')`,
      [args.approvedBy, args.approvalNotes, args.formId]
    );
    return result.affectedRows;
  }
}

/**
 * Fetch full-detail rows for forms awaiting an IT/Admin copy signature that
 * the given user may sign: either designated approver or sub-approver of the
 * issuer/creator (both are notified; first to sign wins, after which the form
 * leaves this list for both), plus legacy forms where the user is the stored
 * `admin_copy_signer_id`.
 */
export async function listFormsPendingAdminCopySignature(
  signerUserId: string
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL
       AND af.approval_status = 'pending_admin_copy_signature'
       AND af.status = 'Pending'
       AND (
         af.admin_copy_signer_id = ?
         OR EXISTS (
           SELECT 1 FROM user_approvers ua
           WHERE ua.user_id = af.created_by
             AND ua.approver_user_id = ?
             AND ua.approver_type IN ('approver', 'sub_approver')
         )
       )
     ORDER BY af.created_at DESC`,
    [signerUserId, signerUserId]
  );
  return rows;
}

/**
 * Fetch full-detail rows for forms waiting on this user's approval
 * (designated approver or sub-approver of the form's user).
 */
export async function listFormsPendingApprovalForApprover(
  approverUserId: string
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL
       AND af.approval_status = 'pending_approval'
       AND af.status IN ('Pending', 'Signed')
       AND (
         JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) IS NULL
         OR JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) <> 'clearance'
       )
AND (
          EXISTS (
            SELECT 1 FROM user_approvers ua
            WHERE ua.user_id = af.user_id
              AND ua.approver_user_id = ?
              AND ua.approver_type = 'approver'
          )
          OR EXISTS (
            SELECT 1 FROM user_approvers ua
            WHERE ua.user_id = af.user_id
              AND ua.approver_user_id = ?
              AND ua.approver_type = 'sub_approver'
          )
        )
     ORDER BY af.created_at DESC`,
    [approverUserId, approverUserId]
  );
  return rows;
}

/**
 * Get the next/previous approval_status for a given form (helper for the
 * approval workflow when combining the copy-signing and approval steps).
 */
export async function getFormApprovalStatus(
  formId: string
): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT approval_status FROM accountability_forms
     WHERE formID = ? AND deleted_at IS NULL LIMIT 1`,
    [formId]
  );
  const row = rows[0] as { approval_status?: string | null } | undefined;
  return row?.approval_status ?? null;
}

/**
 * Find the currently-active accountability forms that still cover the given
 * asset ids (i.e. where each asset went after this form was disabled). Excludes
 * the form itself and disabled/declined/revoked forms.
 */
export async function getActiveAccountabilityFormsForAssetIds(
  assetIds: string[],
  excludeFormId: string,
  afterDate?: string | null
): Promise<
  Array<{
    formID: string;
    form_number: string;
    user_id: string;
    user_name: string;
    status: string;
    created_at: string;
    assets_data: unknown;
  }>
> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const params: unknown[] = [excludeFormId, ...assetIds, JSON.stringify(assetIds)];
  let dateFilter = '';
  if (afterDate) {
    dateFilter = ' AND af.created_at > ? ';
    params.push(afterDate);
  }
  const [rows] = (await pool.execute(
    `SELECT af.formID, af.form_number, af.user_id, af.status,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            DATE_FORMAT(af.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            af.assets_data
     FROM accountability_forms af
     LEFT JOIN users u ON af.user_id = u.userID
     WHERE af.deleted_at IS NULL
        AND af.formID != ?
        AND af.status NOT IN ('Disabled', 'Revoked', 'Declined')
        AND (af.asset_id IN (${placeholders})
             OR (af.assets_data IS NOT NULL
                 AND JSON_OVERLAPS(JSON_EXTRACT(af.assets_data, '$.assets[*].id'), ?)))
        ${dateFilter}
     ORDER BY af.created_at ASC
     LIMIT 1`,
    params
  )) as any[];
  return rows as any[];
}

// ---------------------------------------------------------------------------
// Unified clearance 4-step helpers
// ---------------------------------------------------------------------------

export async function updateClearanceItApproval(
  formId: string,
  signerId: string,
  signature: string | null
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET clearance_it_signer_id = ?, clearance_it_signature = ?, clearance_it_signed_at = NOW(),
         approval_status = 'pending_admin', updated_at = NOW()
     WHERE formID = ? AND approval_status = 'pending_it' AND deleted_at IS NULL`,
    [signerId, signature, formId]
  );
  return result.affectedRows;
}

export async function updateClearanceAdminApproval(
  formId: string,
  signerId: string,
  signature: string | null
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET clearance_admin_signer_id = ?, clearance_admin_signature = ?, clearance_admin_signed_at = NOW(),
         approval_status = 'pending_hr', updated_at = NOW()
     WHERE formID = ? AND approval_status = 'pending_admin' AND deleted_at IS NULL`,
    [signerId, signature, formId]
  );
  return result.affectedRows;
}

export async function updateClearanceHrApproval(
  formId: string,
  signerId: string,
  signature: string | null
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE accountability_forms
     SET clearance_hr_signer_id = ?, clearance_hr_signature = ?, clearance_hr_signed_at = NOW(),
         approval_status = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
     WHERE formID = ? AND approval_status = 'pending_hr' AND deleted_at IS NULL`,
    [signerId, signature, signerId, formId]
  );
  return result.affectedRows;
}

export async function updateClearanceApproverToIt(
  formId: string,
  approverId: string,
  signature: string | null,
  approverName?: string | null
): Promise<number> {
  // Stamp the Department head signatory (owner's approver/sub-approver) so the
  // clearance PDF "Reviewed/Checked by Department Head" block renders with the
  // approver's name, signature, date and time. Falls back gracefully when the
  // dept_head_* migration has not been applied yet.
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE accountability_forms
       SET approved_by = ?, approved_at = NOW(), approval_notes = ?, updated_at = NOW(),
           dept_head_signed_by = ?, dept_head_signed_by_name = ?,
           dept_head_signature = ?, dept_head_signed_at = NOW(),
           approval_status = 'pending_it'
       WHERE formID = ? AND approval_status = 'pending_approval' AND deleted_at IS NULL
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) = 'clearance'`,
      [approverId, signature, approverId, approverName ?? null, signature, formId]
    );
    return result.affectedRows;
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE accountability_forms
       SET approved_by = ?, approved_at = NOW(), approval_notes = ?, updated_at = NOW(),
           approval_status = 'pending_it'
       WHERE formID = ? AND approval_status = 'pending_approval' AND deleted_at IS NULL
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) = 'clearance'`,
      [approverId, signature, formId]
    );
    return result.affectedRows;
  }
}

/**
 * Stamp the employee's OTP-verified signature on a newly created clearance
 * certificate. Sets `acknowledgments` + `signed_at` without touching `status`
 * so the 4-step approval flow is unaffected.
 */
export async function stampClearanceEmployeeSignature(
  formId: string,
  acknowledgmentsJson: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await pool.execute(
    `UPDATE accountability_forms
     SET acknowledgments = ?, signed_at = NOW(),
         signed_ip = ?, signed_user_agent = ?, updated_at = NOW()
     WHERE formID = ? AND deleted_at IS NULL`,
    [acknowledgmentsJson, ip, userAgent, formId]
  );
}

export async function hasRole(
  userId: string,
  roleName: 'IT Asset' | 'Admin Asset'
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (LOWER(TRIM(r.name)) = LOWER(TRIM(?)) OR LOWER(TRIM(r.name)) LIKE CONCAT('%', LOWER(TRIM(?)), '%'))
     LIMIT 1`,
    [userId, roleName, roleName]
  );
  // Fallback broader check via user_custodian_settings is not role-based but we also support direct role name match above.
  // For custodian table drop, role name is authoritative.
  return Array.isArray(rows) && rows.length > 0;
}

export async function listFormsPendingItForUser(userId: string): Promise<RowDataPacket[]> {
  // Only users with IT Asset role should see these, but filter at query by status only
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL AND af.approval_status = 'pending_it'
       AND af.status IN ('Pending', 'Signed')
       AND JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) = 'clearance'
     ORDER BY af.created_at DESC`
  );
  return rows;
}

export async function listFormsPendingAdminForUser(userId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL AND af.approval_status = 'pending_admin'
       AND af.status IN ('Pending', 'Signed')
       AND JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) = 'clearance'
     ORDER BY af.created_at DESC`
  );
  return rows;
}

export async function listFormsPendingHrForUser(userId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL AND af.approval_status = 'pending_hr'
       AND af.status IN ('Pending', 'Signed')
       AND JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) = 'clearance'
     ORDER BY af.created_at DESC`
  );
  return rows;
}

export async function listFormsPendingClearanceForApprover(approverUserId: string): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL AND af.approval_status = 'pending_approval'
       AND af.status IN ('Pending', 'Signed')
       AND JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) = 'clearance'
       AND (
         EXISTS (SELECT 1 FROM user_approvers ua WHERE ua.user_id = af.user_id AND ua.approver_user_id = ? AND ua.approver_type = 'approver')
         OR EXISTS (SELECT 1 FROM user_approvers ua WHERE ua.user_id = af.user_id AND ua.approver_user_id = ? AND ua.approver_type = 'sub_approver')
       )
     ORDER BY af.created_at DESC`,
    [approverUserId, approverUserId]
  );
  return rows;
}

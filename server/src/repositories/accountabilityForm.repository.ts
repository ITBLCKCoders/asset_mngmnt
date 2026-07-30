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

export async function getCompanyCodePrefix(
  companyId: string
): Promise<CompanyCodePrefixRow | null> {
  const [rows] = await pool.execute<CompanyCodePrefixRow[]>(
    `SELECT code, prefix FROM companies WHERE companyID = ? AND deleted_at IS NULL`,
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
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 as next_seq
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
}): Promise<void> {
  await pool.execute(
    `INSERT INTO accountability_forms
     (form_number, assignment_id, asset_id, user_id, department_id, location_id, created_by, assets_data, issuer_signature, it_copy_signature)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
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
}): Promise<void> {
  await pool.execute(
    `INSERT INTO accountability_forms
     (form_number, assignment_id, asset_id, user_id, department_id, location_id, created_by, issuer_signature, it_copy_signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  received_copy_signer.last_name as received_copy_signer_last_name
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
LEFT JOIN users received_copy_signer ON af.received_copy_201_file_signed_by = received_copy_signer.userID`;

export async function findFormsByAssetId(
  assetId: string
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${FORM_FULL_SELECT_AND_JOINS}
     WHERE af.deleted_at IS NULL AND (af.asset_id = ? OR af.assets_data LIKE ?)
     ORDER BY af.created_at DESC`,
    [assetId, `%${assetId}%`]
  );
  return rows;
}

export async function listAccountabilityForms(filters: {
  userId?: string | undefined;
  status?: string | undefined;
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

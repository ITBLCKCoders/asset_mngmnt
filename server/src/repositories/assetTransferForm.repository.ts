import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../db.js';

/**
 * Asset transfer form repository: encapsulates discrete query helpers for
 * asset_transfer_forms and related lookups. Behaviour preserved 1:1 with the
 * inline SQL previously inside `controllers/assetTransfers.controller.ts`.
 */

/** Convert undefined to null for MySQL2 bind params (driver rejects undefined). */
export function toBind(v: unknown): unknown {
  return v === undefined ? null : v;
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface AssignmentRow extends RowDataPacket {
  assignmentID: string;
  asset_id: string;
  user_id: string;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  status: string;
}

export interface RoomRow extends RowDataPacket {
  roomID: string;
}

export interface DepartmentRow extends RowDataPacket {
  departmentID: string;
  company_id: string | null;
}

export interface UserRow extends RowDataPacket {
  userID: string;
  first_name: string | null;
  last_name: string | null;
  company_id: string | null;
}

export interface CategoryDepartmentRow extends RowDataPacket {
  departmentID: string;
}

export interface BuilderItemRow extends RowDataPacket {
  builder_id: string;
  asset_id: string;
}

export interface BuilderCountRow extends RowDataPacket {
  cnt: number;
}

export interface BuilderRow extends RowDataPacket {
  builderID: string;
  name: string;
}

export interface AssetCodeRow extends RowDataPacket {
  asset_code: string;
}

export interface AssetBuilderRow extends RowDataPacket {
  assetID: string;
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function getActiveAssignmentsByIds(
  assignmentIds: string[]
): Promise<AssignmentRow[]> {
  if (assignmentIds.length === 0) return [];
  const placeholders = assignmentIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssignmentRow[]>(
    `SELECT * FROM asset_assignments WHERE assignmentID IN (${placeholders}) AND status = "Active" AND deleted_at IS NULL`,
    assignmentIds
  );
  return rows;
}

export async function getRoomByLocationIdAndName(
  locationId: string,
  roomName: string
): Promise<RoomRow | null> {
  const [rows] = await pool.execute<RoomRow[]>(
    'SELECT roomID FROM asset_mngmnt_location_rooms WHERE locationID = ? AND room_name = ? AND deleted_at IS NULL',
    [locationId, roomName]
  );
  return rows[0] ?? null;
}

export async function getDepartmentById(
  departmentId: string
): Promise<DepartmentRow | null> {
  const [rows] = await pool.execute<DepartmentRow[]>(
    `SELECT departmentID, company_id FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL`,
    [departmentId]
  );
  return rows[0] ?? null;
}

export async function getUserById(
  userId: string
): Promise<UserRow | null> {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT userID, first_name, last_name, company_id FROM users WHERE userID = ?',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserNamesById(
  userId: string
): Promise<{ first_name: string | null; last_name: string | null } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT first_name, last_name FROM users WHERE userID = ?',
    [userId]
  );
  return (rows[0] as { first_name: string | null; last_name: string | null } | null) ?? null;
}

export async function getReturnFormById(
  formId: string
): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM asset_return_forms WHERE formID = ? AND deleted_at IS NULL',
    [formId]
  );
  return rows[0] ?? null;
}

export async function getUserDepartmentId(
  userId: string
): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT department_id FROM users WHERE userID = ?',
    [userId]
  );
  return (rows[0] as { department_id: string | null } | undefined)?.department_id ?? null;
}

export async function getUserNamesByIds(
  userIds: string[]
): Promise<Array<{ userID: string; first_name: string | null; last_name: string | null }>> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT userID, first_name, last_name FROM users WHERE userID IN (${placeholders})`,
    userIds
  );
  return rows as Array<{ userID: string; first_name: string | null; last_name: string | null }>;
}

export async function getCategoryDepartmentsByAssetIds(
  assetIds: string[]
): Promise<CategoryDepartmentRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<CategoryDepartmentRow[]>(
    `SELECT d.departmentID
     FROM assets a
     JOIN asset_categories c ON a.category_id = c.categoryID
     JOIN asset_mngmnt_departments d ON c.department_id = d.departmentID
     WHERE a.assetID IN (${placeholders}) AND a.deleted_at IS NULL`,
    assetIds
  );
  return rows;
}

export async function getBuilderItemsByAssetIds(
  assetIds: string[]
): Promise<BuilderItemRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderItemRow[]>(
    `SELECT abi.builder_id, abi.asset_id
     FROM asset_builder_items abi
     WHERE abi.asset_id IN (${placeholders}) AND abi.deleted_at IS NULL`,
    assetIds
  );
  return rows;
}

export async function getBuilderItemCount(
  builderId: string
): Promise<number> {
  const [rows] = await pool.execute<BuilderCountRow[]>(
    'SELECT COUNT(*) as cnt FROM asset_builder_items WHERE builder_id = ?',
    [builderId]
  );
  return rows[0]?.cnt ?? 0;
}

export async function getBuilderByAssetId(
  assetId: string
): Promise<BuilderRow | null> {
  const [rows] = await pool.execute<BuilderRow[]>(
    `SELECT ab.builderID, ab.name
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getAssetCodeByAssetId(
  assetId: string
): Promise<AssetCodeRow | null> {
  const [rows] = await pool.execute<AssetCodeRow[]>(
    'SELECT asset_code FROM assets WHERE assetID = ?',
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getAssetBuilderByAssetId(
  assetId: string
): Promise<AssetBuilderRow | null> {
  const [rows] = await pool.execute<AssetBuilderRow[]>(
    'SELECT assetID FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
    [assetId]
  );
  return rows[0] ?? null;
}

export async function executeRawWrite(
  query: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(query, params as never[]);
  return result;
}

export interface AssetDetailsRow extends RowDataPacket {
  assetID: string;
  asset_code: string;
  name: string;
  serial: string | null;
  model: string | null;
  brand: string | null;
  category_name: string | null;
  type_name: string | null;
  department_name: string | null;
  department_id: string | null;
}

export async function getAssetDetailsByIds(
  assetIds: string[]
): Promise<AssetDetailsRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetDetailsRow[]>(
    `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.assetID IN (${placeholders}) AND a.deleted_at IS NULL`,
    assetIds
  );
  return rows;
}

export async function getAssetAssignmentDetailsByUserIdAndCategoryIds(
  userId: string,
  categoryIds: string[]
): Promise<AssetDetailsRow[]> {
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetDetailsRow[]>(
    `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
     FROM asset_assignments aa
     JOIN assets a ON aa.asset_id = a.assetID
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
     AND ac.categoryID IN (${placeholders})
     ORDER BY aa.assigned_date ASC`,
    [userId, ...categoryIds]
  );
  return rows;
}

export async function getAssetAssignmentDetailsByUserIdAndAssetIds(
  userId: string,
  assetIds: string[]
): Promise<AssetDetailsRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetDetailsRow[]>(
    `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
     FROM asset_assignments aa
     JOIN assets a ON aa.asset_id = a.assetID
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
     AND a.assetID IN (${placeholders})
     ORDER BY aa.assigned_date ASC`,
    [userId, ...assetIds]
  );
  return rows;
}

export interface AccountabilityFormRow extends RowDataPacket {
  formID: string;
  form_number: string;
  status: string;
  assets_data: string | null;
}

export async function getAccountabilityFormsByUserIdAndStatus(
  userId: string,
  statuses: string[]
): Promise<AccountabilityFormRow[]> {
  if (statuses.length === 0) return [];
  const placeholders = statuses.map(() => '?').join(',');
  const [rows] = await pool.execute<AccountabilityFormRow[]>(
    `SELECT formID, form_number, status, assets_data FROM accountability_forms
     WHERE user_id = ? AND status IN (${placeholders}) AND deleted_at IS NULL`,
    [userId, ...statuses]
  );
  return rows;
}

export interface ApprovedTransferFormRow extends RowDataPacket {
  formID: string;
  form_number: string;
  user_id: string;
  new_assigned_user_id: string;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  signed_at: string | null;
  signed_by: string | null;
  signed_digital_signature: string | null;
  dept_head_signed_at: string | null;
  dept_head_signed_by: string | null;
  dept_head_digital_signature: string | null;
  form_company_id: string | null;
}

export async function getApprovedTransferFormsByCompanyId(
  companyId: string
): Promise<ApprovedTransferFormRow[]> {
  const sql = `SELECT atf.formID, atf.form_number, atf.user_id, atf.new_assigned_user_id,
              atf.department_id, atf.location_id, atf.location_room_id,
              atf.signed_at, atf.signed_by, atf.signed_digital_signature,
              atf.dept_head_signed_at, atf.dept_head_signed_by,
              atf.dept_head_digital_signature, d.company_id AS form_company_id
       FROM asset_transfer_forms atf
       LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
       WHERE atf.deleted_at IS NULL
         AND (atf.declined_at IS NULL)
         AND atf.signed_at IS NOT NULL
         AND atf.dept_head_signed_at IS NOT NULL
         AND atf.executed_at IS NULL
         AND d.company_id = ?
       ORDER BY atf.dept_head_signed_at DESC`;
  const [rows] = await pool.execute<ApprovedTransferFormRow[]>(sql, [companyId]);
  return rows;
}

/**
 * Fetch all transfer-form linkage rows that point at a return form ID. Used by
 * the asset returns list to surface "via asset transfer" status / dept-head
 * approval timestamps.
 */
export async function getTransferFormLinksForReturnForms(): Promise<any[]> {
  const [rows] = (await pool.execute(
    `SELECT formID, return_form_id,
        DATE_FORMAT(dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
        declined_at, declined_by
       FROM asset_transfer_forms WHERE return_form_id IS NOT NULL AND deleted_at IS NULL`
  )) as any[];
  return rows as any[];
}

/**
 * Fetch a single transfer form linked to a return form ID.
 * Returns the first row or null.
 */
export async function getTransferFormByReturnFormId(
  returnFormId: string
): Promise<any | null> {
  const [rows] = (await pool.execute(
    `SELECT created_by,
            DATE_FORMAT(process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
            process_digital_signature
     FROM asset_transfer_forms
     WHERE return_form_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [returnFormId]
  )) as any[];
  return (rows as any[])[0] ?? null;
}

/** Fetch transfer-form IDs linked to a given return form. */
export async function getTransferFormIdsByReturnFormId(
  returnFormId: string
): Promise<string[]> {
  const [rows] = (await pool.execute(
    'SELECT formID FROM asset_transfer_forms WHERE return_form_id = ? AND deleted_at IS NULL',
    [returnFormId]
  )) as any[];
  return (rows as any[]).map(r => r.formID);
}

/** Look up assignments referenced by a transfer form. */
export async function getTransferFormAssignments(
  transferFormId: string
): Promise<
  { assignment_id: string; transfer_condition: string | null; transfer_notes: string | null }[]
> {
  const [rows] = (await pool.execute(
    'SELECT assignment_id, transfer_condition, transfer_notes FROM transfer_form_assignments WHERE form_id = ?',
    [transferFormId]
  )) as any[];
  return rows as any[];
}

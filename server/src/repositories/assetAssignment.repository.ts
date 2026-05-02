import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';

/**
 * Asset-assignment repository: every SQL touching `asset_assignments`,
 * `asset_builders`, `asset_builder_items`, `accountability_forms` (read-side),
 * and validation lookups against `users`, `assets`, `asset_mngmnt_*` lives
 * here. All functions preserve the exact behaviour of the inline SQL that
 * previously lived in `controllers/assetAssignments.controller.ts`.
 *
 * Row shapes use explicit `RowDataPacket`-extending interfaces so the
 * controller / service consumers don't need `any` casts.
 */

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface UserBasicRow extends RowDataPacket {
  userID: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_id: string | null;
}

export interface UserNameRow extends RowDataPacket {
  first_name: string | null;
  last_name: string | null;
}

export interface CompanyIdRow extends RowDataPacket {
  company_id: string | null;
}

export interface AccountabilityFormSettingsRow extends RowDataPacket {
  id: string;
}

export interface DepartmentLookupRow extends RowDataPacket {
  departmentID: string;
}

export interface LocationLookupRow extends RowDataPacket {
  locationID: string;
}

export interface RoomLookupRow extends RowDataPacket {
  roomID: string;
}

export interface AssetByCodeRow extends RowDataPacket {
  assetID: string;
  status: string;
}

export interface ActiveAssignmentMiniRow extends RowDataPacket {
  assignmentID: string;
  user_id: string;
}

export interface BuilderRow extends RowDataPacket {
  builderID: string;
  name: string;
  builder_status: string;
}

export interface BuilderAssetCodeRow extends RowDataPacket {
  asset_code: string | null;
}

export interface NameOnlyRow extends RowDataPacket {
  name: string;
}

export interface RoomNameRow extends RowDataPacket {
  room_name: string;
}

export interface AssetDetailsForFormRow extends RowDataPacket {
  name: string | null;
  serial: string | null;
  model: string | null;
  brand: string | null;
  category_id: string | null;
  type_id: string | null;
  category_name: string | null;
  type_name: string | null;
}

export interface AssetCategoryDeptRow extends RowDataPacket {
  categoryID: string | null;
  category_name: string | null;
  department_name: string | null;
}

export interface DepartmentAssetRow extends RowDataPacket {
  assetID: string;
  asset_code: string;
  name: string | null;
  serial: string | null;
  model: string | null;
  brand: string | null;
  category_name: string | null;
  type_name: string | null;
  department_name: string | null;
  department_id: string | null;
}

export interface ExistingAccountabilityFormRow extends RowDataPacket {
  formID: string;
  form_number: string;
  status: string;
  assets_data: string | null;
}

export interface AccountabilityFormByAssignmentRow extends RowDataPacket {
  formID: string;
  form_number: string;
  assignment_id: string | null;
  status: string;
  decline_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccountabilityFormByUserRow extends RowDataPacket {
  formID: string;
  form_number: string;
  user_id: string;
  asset_id: string | null;
  assets_data: string | null;
  status: string;
  decline_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssetCodeRow extends RowDataPacket {
  asset_code: string | null;
}

export interface AssignedCountRow extends RowDataPacket {
  assigned_count: number;
}

export interface AssignmentRow extends RowDataPacket {
  assignmentID: string;
  asset_id: string;
  user_id: string;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  expected_return_date: string | null;
  actual_return_date: string | null;
  assignment_notes: string | null;
  assigned_by: string | null;
  status: string;
  assigned_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserPermissionRow extends RowDataPacket {
  module_name: string;
  permission_type: 'view' | 'create' | 'edit' | 'delete' | string;
  granted: 0 | 1;
}

// ---------------------------------------------------------------------------
// Validation lookups
// ---------------------------------------------------------------------------

export async function getUserBasic(userId: string): Promise<UserBasicRow | null> {
  const [rows] = await pool.execute<UserBasicRow[]>(
    'SELECT userID, first_name, last_name, email, company_id FROM users WHERE userID = ?',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserFullName(userId: string): Promise<string> {
  const [rows] = await pool.execute<UserNameRow[]>(
    'SELECT first_name, last_name FROM users WHERE userID = ?',
    [userId]
  );
  const u = rows[0];
  return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || userId : userId;
}

export async function getCompanyIdByDepartment(
  departmentId: string
): Promise<string | null> {
  const [rows] = await pool.execute<CompanyIdRow[]>(
    'SELECT company_id FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL',
    [departmentId]
  );
  return rows[0]?.company_id ?? null;
}

export async function hasAccountabilityFormSettings(
  companyId: string
): Promise<boolean> {
  const [rows] = await pool.execute<AccountabilityFormSettingsRow[]>(
    'SELECT id FROM accountability_form_settings WHERE company_id = ? AND deleted_at IS NULL',
    [companyId]
  );
  return rows.length > 0;
}

export async function departmentExists(departmentId: string): Promise<boolean> {
  const [rows] = await pool.execute<DepartmentLookupRow[]>(
    'SELECT departmentID FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL',
    [departmentId]
  );
  return rows.length > 0;
}

export async function locationExists(locationId: string): Promise<boolean> {
  const [rows] = await pool.execute<LocationLookupRow[]>(
    'SELECT locationID FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
    [locationId]
  );
  return rows.length > 0;
}

/**
 * Try to resolve a room by its ID first; fall back to room_name. Returns
 * `null` if neither matches (caller should treat as "invalid"), otherwise
 * returns the canonical roomID.
 */
export async function resolveRoomIdByIdOrName(
  idOrName: string
): Promise<string | null> {
  const [byId] = await pool.execute<RoomLookupRow[]>(
    'SELECT roomID FROM asset_mngmnt_location_rooms WHERE roomID = ? AND deleted_at IS NULL',
    [idOrName]
  );
  if (byId.length > 0) return idOrName;
  const [byName] = await pool.execute<RoomLookupRow[]>(
    'SELECT roomID FROM asset_mngmnt_location_rooms WHERE room_name = ? AND deleted_at IS NULL',
    [idOrName]
  );
  return byName[0]?.roomID ?? null;
}

export async function getDepartmentName(departmentId: string): Promise<string | null> {
  const [rows] = await pool.execute<NameOnlyRow[]>(
    'SELECT name FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL',
    [departmentId]
  );
  return rows[0]?.name ?? null;
}

export async function getLocationName(locationId: string): Promise<string | null> {
  const [rows] = await pool.execute<NameOnlyRow[]>(
    'SELECT name FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
    [locationId]
  );
  return rows[0]?.name ?? null;
}

export async function getRoomName(roomId: string): Promise<string | null> {
  const [rows] = await pool.execute<RoomNameRow[]>(
    'SELECT room_name FROM asset_mngmnt_location_rooms WHERE roomID = ? AND deleted_at IS NULL',
    [roomId]
  );
  return rows[0]?.room_name ?? null;
}

// ---------------------------------------------------------------------------
// Asset / assignment operations
// ---------------------------------------------------------------------------

export async function getAssetByCode(code: string): Promise<AssetByCodeRow | null> {
  const [rows] = await pool.execute<AssetByCodeRow[]>(
    'SELECT assetID, status FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
    [code]
  );
  return rows[0] ?? null;
}

export async function getAssetCodeById(assetId: string): Promise<string | null> {
  const [rows] = await pool.execute<AssetCodeRow[]>(
    'SELECT asset_code FROM assets WHERE assetID = ?',
    [assetId]
  );
  return rows[0]?.asset_code ?? null;
}

export async function getActiveAssignmentsByAssetId(
  assetId: string
): Promise<ActiveAssignmentMiniRow[]> {
  const [rows] = await pool.execute<ActiveAssignmentMiniRow[]>(
    'SELECT assignmentID, user_id FROM asset_assignments WHERE asset_id = ? AND status = "Active" AND deleted_at IS NULL',
    [assetId]
  );
  return rows;
}

export async function setAssignmentInactive(
  assignmentId: string,
  noteSuffix: string
): Promise<void> {
  await pool.execute('CALL sp_set_assignment_inactive(?, ?)', [
    assignmentId,
    noteSuffix,
  ]);
}

export async function callCreateAssignment(args: {
  assignmentId: string;
  assetId: string;
  userId: string;
  departmentId: string | null;
  locationId: string | null;
  locationRoomId: string | null;
  expectedReturnDate: string | null;
  assignmentNotes: string | null;
  assignedBy: string;
}): Promise<void> {
  await pool.execute('CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
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

export async function getAssignmentById(
  assignmentId: string
): Promise<AssignmentRow | null> {
  const [rows] = await pool.execute<AssignmentRow[]>(
    'SELECT * FROM asset_assignments WHERE assignmentID = ? AND deleted_at IS NULL',
    [assignmentId]
  );
  return rows[0] ?? null;
}

export async function callReturnAssignment(
  assignmentId: string,
  returnNotes: string,
  returnedBy: string
): Promise<void> {
  await pool.execute('CALL sp_return_assignment(?, ?, ?, ?)', [
    assignmentId,
    returnNotes,
    null,
    returnedBy,
  ]);
}

// ---------------------------------------------------------------------------
// Asset builder operations (cross-cutting, but tightly coupled to assignment
// flows — co-locating here avoids creating an intermediate repo just for two
// callers)
// ---------------------------------------------------------------------------

export async function getBuildersForAsset(assetId: string): Promise<BuilderRow[]> {
  const [rows] = await pool.execute<BuilderRow[]>(
    `SELECT ab.builderID, ab.name, ab.status as builder_status
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
    [assetId]
  );
  return rows;
}

export async function setBuilderStatus(
  builderId: string,
  status: string,
  updatedBy: string
): Promise<void> {
  await pool.execute(
    'UPDATE asset_builders SET status = ?, updated_by = ?, updated_at = NOW() WHERE builderID = ?',
    [status, updatedBy, builderId]
  );
}

export async function getBuilderAssetCodes(builderId: string): Promise<string[]> {
  const [rows] = await pool.execute<BuilderAssetCodeRow[]>(
    `SELECT a.asset_code FROM asset_builder_items abi
     JOIN assets a ON abi.asset_id = a.assetID
     WHERE abi.builder_id = ? AND a.deleted_at IS NULL
     ORDER BY a.asset_code`,
    [builderId]
  );
  return rows.map(r => r.asset_code).filter((c): c is string => Boolean(c));
}

export async function countAssignedAssetsInBuilder(
  builderId: string
): Promise<number> {
  const [rows] = await pool.execute<AssignedCountRow[]>(
    `SELECT COUNT(*) as assigned_count
     FROM asset_builder_items abi
     JOIN assets a ON abi.asset_id = a.assetID
     WHERE abi.builder_id = ? AND a.status = 'Assigned' AND a.deleted_at IS NULL`,
    [builderId]
  );
  return Number(rows[0]?.assigned_count ?? 0);
}

export async function removeAssetFromAllBuilders(assetId: string): Promise<void> {
  await pool.execute('DELETE FROM asset_builder_items WHERE asset_id = ?', [
    assetId,
  ]);
}

// ---------------------------------------------------------------------------
// Asset details for accountability-form orchestration
// ---------------------------------------------------------------------------

export async function getAssetDetailsForForm(
  assetId: string
): Promise<AssetDetailsForFormRow | null> {
  const [rows] = await pool.execute<AssetDetailsForFormRow[]>(
    `SELECT a.name, a.serial, a.model, a.brand, a.category_id, a.type_id,
            ac.name as category_name, at.name as type_name
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     WHERE a.assetID = ?`,
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getCategoryDeptForAssetCodes(
  codes: string[]
): Promise<AssetCategoryDeptRow[]> {
  if (codes.length === 0) return [];
  const placeholders = codes.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetCategoryDeptRow[]>(
    `SELECT DISTINCT ac.categoryID, ac.name as category_name, d.name as department_name
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.asset_code IN (${placeholders})`,
    codes
  );
  return rows;
}

export async function getActiveAssignmentsByUserAndCategories(
  userId: string,
  categoryIds: string[]
): Promise<DepartmentAssetRow[]> {
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => '?').join(',');
  const [rows] = await pool.execute<DepartmentAssetRow[]>(
    `SELECT
       a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
       ac.name as category_name, at.name as type_name, d.name as department_name,
       d.departmentID as department_id
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

export async function getActiveAssignmentsByUserAndAssetIds(
  userId: string,
  assetIds: string[]
): Promise<DepartmentAssetRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<DepartmentAssetRow[]>(
    `SELECT
       a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
       ac.name as category_name, at.name as type_name, d.name as department_name,
       d.departmentID as department_id
     FROM asset_assignments aa
     JOIN assets a ON aa.asset_id = a.assetID
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
       AND a.deleted_at IS NULL
       AND a.assetID IN (${placeholders})
     ORDER BY aa.assigned_date ASC`,
    [userId, ...assetIds]
  );
  return rows;
}

export async function getExistingAccountabilityForms(
  userId: string,
  departmentName: string
): Promise<ExistingAccountabilityFormRow[]> {
  const [rows] = await pool.execute<ExistingAccountabilityFormRow[]>(
    `SELECT af.formID, af.form_number, af.status, af.assets_data
     FROM accountability_forms af
     WHERE af.user_id = ? AND af.status NOT IN ("Disabled", "Revoked", "Declined") AND af.deleted_at IS NULL
       AND JSON_EXTRACT(af.assets_data, '$.assets[0].department') = ?
       AND (JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) IS NULL
            OR JSON_UNQUOTE(JSON_EXTRACT(af.assets_data, '$.form_origin')) <> 'processor_return')`,
    [userId, departmentName]
  );
  return rows;
}

export async function disableAccountabilityForm(formId: string): Promise<void> {
  await pool.execute(
    'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
    [formId]
  );
}

// ---------------------------------------------------------------------------
// Listing / filtering
// ---------------------------------------------------------------------------

export async function callGetAssignments(
  assetId: string | null,
  userId: string | null,
  status: string | null
): Promise<RowDataPacket[]> {
  const [rowsResult] = await pool.execute<RowDataPacket[]>(
    'CALL sp_get_assignments(?, ?, ?)',
    [assetId, userId, status]
  );
  // sp returns nested array; unwrap.
  const r = rowsResult as unknown as RowDataPacket[][];
  return Array.isArray(r[0]) ? r[0] : (rowsResult as RowDataPacket[]);
}

export async function getAccountabilityFormsByAssignmentIds(
  assignmentIds: string[]
): Promise<AccountabilityFormByAssignmentRow[]> {
  if (assignmentIds.length === 0) return [];
  const placeholders = assignmentIds.map(() => '?').join(', ');
  const [rows] = await pool.execute<AccountabilityFormByAssignmentRow[]>(
    `SELECT formID, form_number, assignment_id, status, decline_reason, created_at, updated_at
     FROM accountability_forms
     WHERE deleted_at IS NULL AND assignment_id IN (${placeholders})`,
    assignmentIds
  );
  return rows;
}

export async function getAccountabilityFormsByUserIds(
  userIds: string[]
): Promise<AccountabilityFormByUserRow[]> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(', ');
  const [rows] = await pool.execute<AccountabilityFormByUserRow[]>(
    `SELECT formID, form_number, user_id, asset_id, assets_data, status, decline_reason, created_at, updated_at
     FROM accountability_forms
     WHERE deleted_at IS NULL AND user_id IN (${placeholders})`,
    userIds
  );
  return rows;
}

export async function getUserModulePermissions(
  userId: string
): Promise<UserPermissionRow[]> {
  const [rows] = await pool.execute<UserPermissionRow[]>(
    'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Reusable assignment SELECT (joined view used by /me and /filtered)
// ---------------------------------------------------------------------------

/**
 * The full SELECT projection used by both `getMyAssignmentsHandler` and
 * `getFilteredAssetAssignmentsHandler`. Behaviour is preserved 1:1; the
 * controller previously inlined this query twice.
 */
export const ASSIGNMENT_LIST_SELECT = `
SELECT
  aa.*,
  a.asset_code,
  a.name as asset_name,
  a.category_id,
  a.type_id,
  ac.department_id as category_department_id,
  u.first_name,
  u.last_name,
  u.email,
  u.employee_number as employeeNumber,
  u.position as position,
  d.name as department_name,
  l.name as location_name,
  l.floor_unit,
  l.building,
  lr.room_name,
  ab.first_name as assigned_by_first_name,
  ab.last_name as assigned_by_last_name,
  ab.employee_number as assigned_by_employee_number
FROM asset_assignments aa
LEFT JOIN assets a ON aa.asset_id = a.assetID
LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
LEFT JOIN users u ON aa.user_id = u.userID
LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
LEFT JOIN users ab ON aa.assigned_by = ab.userID
WHERE aa.deleted_at IS NULL`;

export async function listAssignmentsRaw(
  whereClause: string,
  orderClause: string,
  params: unknown[]
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${ASSIGNMENT_LIST_SELECT}${whereClause}${orderClause}`,
    params as never[]
  );
  return rows;
}

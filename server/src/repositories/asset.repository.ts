import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../db.js';

/**
 * Asset repository: every SQL touching `assets`, `asset_documents`,
 * `asset_assignments` (read-side joins for the asset detail / list view),
 * `asset_builders`, `asset_builder_items`, and the validation lookups
 * referenced by `assets.controller.ts` lives here.
 *
 * Behaviour mirrors the inline SQL that previously lived in the controller.
 */

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface AssetIdRow extends RowDataPacket {
  asset_id: string;
}

export interface AssetDocRow extends RowDataPacket {
  asset_id?: string;
  documentID: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string | null;
}

export interface AssetAssignmentJoinedRow extends RowDataPacket {
  asset_id: string;
  assignmentID: string;
  user_id: string;
  assigned_user_name: string | null;
  assigned_user_email: string | null;
  employee_number: string | null;
  position: string | null;
  department_name: string | null;
  location_name: string | null;
  room_name: string | null;
  assigned_date: string | null;
  actual_return_date?: string | null;
  status: string;
  assigned_by_name?: string | null;
  assignment_notes?: string | null;
}

export interface BuilderRow extends RowDataPacket {
  builderID: string;
  status: string;
  name?: string | null;
}

export interface BuilderChildRow extends RowDataPacket {
  assetID: string;
  asset_code: string;
  name: string | null;
}

export interface BuilderHistoryRow extends RowDataPacket {
  itemID: string;
  builder_name: string;
  builderID: string;
  created_at: string | null;
  added_by_name: string | null;
}

export interface AccountabilityFormForAssetRow extends RowDataPacket {
  formID: string;
  form_number: string;
  status: string;
  created_at: string | null;
  signed_at: string | null;
}

export interface UserBasicRow extends RowDataPacket {
  userID: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_id: string | null;
}

export interface CategoryAssetTypeRow extends RowDataPacket {
  categoryID: string;
  asset_type: string;
}

export interface CompanyRow extends RowDataPacket {
  companyID: string;
  prefix: string | null;
  code: string | null;
  name: string | null;
  logo_url: string | null;
}

export interface LocationRow extends RowDataPacket {
  locationID: string;
  name: string;
  floor_unit: string | null;
  building: string | null;
  description?: string | null;
  department_id?: string | null;
}

export interface RoomRow extends RowDataPacket {
  roomID: string;
  room_name: string;
}

export interface DepartmentRow extends RowDataPacket {
  departmentID: string;
  name: string;
  code: string | null;
  prefix: string | null;
  company_id?: string | null;
}

export interface AssetIdMiniRow extends RowDataPacket {
  assetID: string;
  asset_code?: string;
  status?: string;
}

export interface UserRoleRow extends RowDataPacket {
  role_name: string | null;
  company_id: string | null;
  manager_role: string | null;
}

export interface CategoryIdRow extends RowDataPacket {
  categoryID: string;
}

export interface BuilderHistoryBatchRow extends RowDataPacket {
  asset_id: string;
  itemID: string;
  builder_name: string;
  builderID: string;
  created_at: string | null;
  added_by_name: string | null;
}

export interface BuilderMetaBatchRow extends RowDataPacket {
  builderID: string;
  status: string;
}

export interface BuilderChildBatchRow extends RowDataPacket {
  builder_id: string;
  assetID: string;
  asset_code: string;
  name: string | null;
}

export interface BuilderLinkBatchRow extends RowDataPacket {
  asset_id: string;
  builder_id: string;
}

export interface BuilderItemBatchRow extends RowDataPacket {
  builder_id: string;
  asset_id: string;
  asset_code: string;
  name: string | null;
  is_parent: number;
  builder_status: string;
}

export interface AccountabilityFormBatchRow extends RowDataPacket {
  asset_id: string;
  formID: string;
  form_number: string;
  status: string;
  created_at: string | null;
  signed_at: string | null;
  assets_data: any;
}

export interface AssetForUpdateRow extends RowDataPacket {
  assetID: string;
  asset_code: string;
  name: string | null;
  description: string | null;
  category_id: string | null;
  type_id: string | null;
  supplier: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  image_url: string | null;
  purchase_date: string | null;
  asset_value: number | null;
  salvage_value: number | null;
  depreciation_method: string | null;
  useful_life_years: number | null;
  annual_depreciation: number | null;
  book_value: number | null;
  accumulated_depreciation: number | null;
  monthly_depreciation: number | null;
  depreciation_start_date: string | null;
  company_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  department_id: string | null;
  location_notes: string | null;
  warranty_months: number | null;
  condition: string | null;
  maintenance_schedule: string | null;
  next_maintenance_date: string | null;
  status: string | null;
  is_old_unit: number | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// sp_get_assets() wrappers (used by 4 handlers)
// ---------------------------------------------------------------------------

/**
 * Run `sp_get_assets()` and return the first result set (the actual asset
 * rows). The stored procedure returns a multi-result-set shape that mysql2
 * surfaces as `[[rows], <metadata>]`.
 */
export async function callGetAllAssets(): Promise<RowDataPacket[]> {
  const [rowsResult] = await pool.execute<RowDataPacket[]>('CALL sp_get_assets()');
  const r = rowsResult as unknown as RowDataPacket[][];
  return Array.isArray(r[0]) ? r[0] : (rowsResult as RowDataPacket[]);
}

// ---------------------------------------------------------------------------
// Assignment / document / builder / form lookups (single asset)
// ---------------------------------------------------------------------------

export async function getActiveAssignmentAssetIdsForUser(
  userId: string
): Promise<string[]> {
  const [rows] = await pool.execute<AssetIdRow[]>(
    `SELECT DISTINCT aa.asset_id FROM asset_assignments aa
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL`,
    [userId]
  );
  return rows.map(r => r.asset_id);
}

const ASSET_DOCUMENT_COLUMNS =
  'documentID, file_name, file_url, file_size, file_type, created_at';

export async function getAssetDocumentsForIds(
  assetIds: string[]
): Promise<AssetDocRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetDocRow[]>(
    `SELECT asset_id, ${ASSET_DOCUMENT_COLUMNS} FROM asset_documents
     WHERE asset_id IN (${placeholders}) AND deleted_at IS NULL
     ORDER BY asset_id, created_at`,
    assetIds
  );
  return rows;
}

export async function getAssetDocumentsByAssetId(
  assetId: string
): Promise<AssetDocRow[]> {
  const [rows] = await pool.execute<AssetDocRow[]>(
    `SELECT ${ASSET_DOCUMENT_COLUMNS} FROM asset_documents
     WHERE asset_id = ? AND deleted_at IS NULL ORDER BY created_at`,
    [assetId]
  );
  return rows;
}

const ASSIGNMENT_JOIN_SELECT_COMMON = `
  aa.asset_id, aa.assignmentID, aa.user_id,
  CONCAT(u.first_name, ' ', u.last_name) as assigned_user_name,
  u.email as assigned_user_email,
  u.employee_number as employee_number,
  u.position as position,
  d.name as department_name,
  l.name as location_name,
  lr.room_name`;

const ASSIGNMENT_JOIN_FROM = `
  FROM asset_assignments aa
  LEFT JOIN users u ON aa.user_id = u.userID
  LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
  LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
  LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID`;

export async function getCurrentAssignmentsForAssetIds(
  assetIds: string[]
): Promise<AssetAssignmentJoinedRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetAssignmentJoinedRow[]>(
    `SELECT ${ASSIGNMENT_JOIN_SELECT_COMMON}, aa.assigned_date, aa.status
     ${ASSIGNMENT_JOIN_FROM}
     WHERE aa.asset_id IN (${placeholders})
       AND aa.status IN (?, ?) AND aa.deleted_at IS NULL
     ORDER BY aa.asset_id, aa.assigned_date DESC`,
    [...assetIds, 'Active', 'Reserved']
  );
  return rows;
}

export async function getCurrentAssignmentForAssetId(
  assetId: string
): Promise<AssetAssignmentJoinedRow | null> {
  const [rows] = await pool.execute<AssetAssignmentJoinedRow[]>(
    `SELECT ${ASSIGNMENT_JOIN_SELECT_COMMON}, aa.assigned_date, aa.status
     ${ASSIGNMENT_JOIN_FROM}
     WHERE aa.asset_id = ?
       AND aa.status IN ('Active', 'Reserved') AND aa.deleted_at IS NULL
     ORDER BY aa.assigned_date DESC LIMIT 1`,
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getAssignmentHistoryForAssetIds(
  assetIds: string[]
): Promise<AssetAssignmentJoinedRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AssetAssignmentJoinedRow[]>(
    `SELECT ${ASSIGNMENT_JOIN_SELECT_COMMON},
       CONCAT(ab.first_name, ' ', ab.last_name) as assigned_by_name,
       aa.assigned_date, aa.actual_return_date, aa.status, aa.assignment_notes
     ${ASSIGNMENT_JOIN_FROM}
     LEFT JOIN users ab ON aa.assigned_by = ab.userID
     WHERE aa.asset_id IN (${placeholders}) AND aa.deleted_at IS NULL
     ORDER BY aa.asset_id, aa.assigned_date DESC`,
    assetIds
  );
  return rows;
}

export async function getAssignmentHistoryForAssetId(
  assetId: string
): Promise<AssetAssignmentJoinedRow[]> {
  const [rows] = await pool.execute<AssetAssignmentJoinedRow[]>(
    `SELECT ${ASSIGNMENT_JOIN_SELECT_COMMON},
       CONCAT(ab.first_name, ' ', ab.last_name) as assigned_by_name,
       aa.assigned_date, aa.actual_return_date, aa.status, aa.assignment_notes
     ${ASSIGNMENT_JOIN_FROM}
     LEFT JOIN users ab ON aa.assigned_by = ab.userID
     WHERE aa.asset_id = ? AND aa.deleted_at IS NULL
     ORDER BY aa.assigned_date DESC`,
    [assetId]
  );
  return rows;
}

export async function getBuilderByBuilderId(
  builderId: string
): Promise<BuilderRow | null> {
  const [rows] = await pool.execute<BuilderRow[]>(
    'SELECT builderID, status FROM asset_builders WHERE builderID = ? AND deleted_at IS NULL',
    [builderId]
  );
  return rows[0] ?? null;
}

export async function getBuilderByAssetId(
  assetId: string
): Promise<BuilderRow | null> {
  const [rows] = await pool.execute<BuilderRow[]>(
    `SELECT ab.builderID, ab.status
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL
     LIMIT 1`,
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getBuilderChildrenByBuilderId(
  builderId: string
): Promise<BuilderChildRow[]> {
  const [rows] = await pool.execute<BuilderChildRow[]>(
    `SELECT a.assetID, a.asset_code, a.name FROM asset_builder_items abi
     JOIN assets a ON abi.asset_id = a.assetID
     WHERE abi.builder_id = ? AND a.deleted_at IS NULL
     ORDER BY abi.created_at`,
    [builderId]
  );
  return rows;
}

export async function getBuilderHistoryForAsset(
  assetId: string
): Promise<BuilderHistoryRow[]> {
  const [rows] = await pool.execute<BuilderHistoryRow[]>(
    `SELECT abi.itemID, ab.name as builder_name, ab.builderID, abi.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as added_by_name
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     LEFT JOIN users u ON abi.created_by = u.userID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL
     ORDER BY abi.created_at DESC`,
    [assetId]
  );
  return rows;
}

export async function getBuilderMetaForAsset(
  assetId: string
): Promise<BuilderRow | null> {
  const [rows] = await pool.execute<BuilderRow[]>(
    `SELECT ab.builderID, ab.status
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id = ? AND ab.deleted_at IS NULL
     LIMIT 1`,
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getAccountabilityFormsForAsset(
  assetId: string,
  jsonContainsParam?: string
): Promise<AccountabilityFormForAssetRow[]> {
  // The original controller variants pass either a JSON object or a wildcard
  // string; both signatures need to be supported until callers are unified.
  const containsArg = jsonContainsParam ?? JSON.stringify({ id: assetId });
  const [rows] = await pool.execute<AccountabilityFormForAssetRow[]>(
    `SELECT formID, form_number, status, created_at, signed_at
     FROM accountability_forms
     WHERE (asset_id = ? OR JSON_CONTAINS(assets_data, ?, '$.assets'))
       AND deleted_at IS NULL ORDER BY created_at DESC`,
    [assetId, containsArg]
  );
  return rows;
}

export async function getAccountabilityFormsForAssetWithLike(
  assetId: string
): Promise<AccountabilityFormForAssetRow[]> {
  // Matches the LIKE-based variant used in `getAssetByCodeHandler`
  const [rows] = await pool.execute<AccountabilityFormForAssetRow[]>(
    `SELECT formID, form_number, status, created_at, signed_at
     FROM accountability_forms
     WHERE (asset_id = ? OR assets_data LIKE ?)
       AND deleted_at IS NULL ORDER BY created_at DESC`,
    [assetId, `%${assetId}%`]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Validation lookups (used in createAsset / updateAsset)
// ---------------------------------------------------------------------------

export async function getUserBasicById(
  userId: string
): Promise<UserBasicRow | null> {
  const [rows] = await pool.execute<UserBasicRow[]>(
    'SELECT userID, first_name, last_name, email, company_id FROM users WHERE userID = ?',
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserBasicByIdSimple(
  userId: string
): Promise<{ userID: string; first_name: string | null; last_name: string | null } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT userID, first_name, last_name FROM users WHERE userID = ?',
    [userId]
  );
  return (rows[0] as { userID: string; first_name: string | null; last_name: string | null } | null) ?? null;
}

export async function getCategoryAssetType(
  categoryId: string
): Promise<CategoryAssetTypeRow | null> {
  const [rows] = await pool.execute<CategoryAssetTypeRow[]>(
    'SELECT categoryID, asset_type FROM asset_categories WHERE categoryID = ? AND deleted_at IS NULL',
    [categoryId]
  );
  return rows[0] ?? null;
}

export async function getCompanyById(
  companyId: string
): Promise<CompanyRow | null> {
  const [rows] = await pool.execute<CompanyRow[]>(
    `SELECT companyID, prefix, code, name, logo_url FROM companies
     WHERE companyID = ? AND deleted_at IS NULL`,
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getLocationById(
  locationId: string
): Promise<LocationRow | null> {
  const [rows] = await pool.execute<LocationRow[]>(
    `SELECT locationID, name, floor_unit, building FROM asset_mngmnt_locations
     WHERE locationID = ? AND deleted_at IS NULL`,
    [locationId]
  );
  return rows[0] ?? null;
}

export async function getRoomById(roomId: string): Promise<RoomRow | null> {
  const [rows] = await pool.execute<RoomRow[]>(
    `SELECT roomID, room_name FROM asset_mngmnt_location_rooms
     WHERE roomID = ? AND deleted_at IS NULL`,
    [roomId]
  );
  return rows[0] ?? null;
}

export async function getDepartmentById(
  departmentId: string
): Promise<DepartmentRow | null> {
  const [rows] = await pool.execute<DepartmentRow[]>(
    `SELECT departmentID, name, code, prefix FROM asset_mngmnt_departments
     WHERE departmentID = ? AND deleted_at IS NULL`,
    [departmentId]
  );
  return rows[0] ?? null;
}

export async function getAccountabilityFormatSettings(
  companyId: string
): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM accountability_form_settings
     WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getCompanyIdByIdOrName(
  companyIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      companyIdOrName
    );
  const query = isUUID
    ? 'SELECT companyID FROM companies WHERE companyID = ? AND deleted_at IS NULL'
    : 'SELECT companyID FROM companies WHERE name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<CompanyRow[]>(query, [companyIdOrName]);
  return rows[0]?.companyID ?? null;
}

export async function getLocationIdById(
  locationId: string
): Promise<string | null> {
  const [rows] = await pool.execute<LocationRow[]>(
    'SELECT locationID FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
    [locationId]
  );
  return rows[0]?.locationID ?? null;
}

export async function getRoomIdByIdOrName(
  roomIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomIdOrName
    );
  const query = isUUID
    ? 'SELECT roomID FROM asset_mngmnt_location_rooms WHERE roomID = ? AND deleted_at IS NULL'
    : 'SELECT roomID FROM asset_mngmnt_location_rooms WHERE room_name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<RoomRow[]>(query, [roomIdOrName]);
  return rows[0]?.roomID ?? null;
}

export async function getDepartmentIdByIdOrName(
  departmentIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      departmentIdOrName
    );
  const query = isUUID
    ? 'SELECT departmentID FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL'
    : 'SELECT departmentID FROM asset_mngmnt_departments WHERE name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<DepartmentRow[]>(query, [departmentIdOrName]);
  return rows[0]?.departmentID ?? null;
}

export async function getAssetIdFormatSettings(
  companyId: string
): Promise<RowDataPacket | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM asset_id_format_settings WHERE company_id = ? AND deleted_at IS NULL',
    [companyId]
  );
  return rows[0] ?? null;
}

export async function getCategoryIdByIdOrName(
  categoryIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryIdOrName
    );
  const query = isUUID
    ? 'SELECT categoryID FROM asset_categories WHERE categoryID = ? AND deleted_at IS NULL'
    : 'SELECT categoryID FROM asset_categories WHERE name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<RowDataPacket[]>(query, [categoryIdOrName]);
  return (rows[0]?.categoryID as string) ?? null;
}

export async function getTypeIdByIdOrName(
  typeIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      typeIdOrName
    );
  const query = isUUID
    ? 'SELECT typeID FROM asset_types WHERE typeID = ? AND deleted_at IS NULL'
    : 'SELECT typeID FROM asset_types WHERE name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<RowDataPacket[]>(query, [typeIdOrName]);
  return (rows[0]?.typeID as string) ?? null;
}

export async function getLocationIdByIdOrName(
  locationIdOrName: string
): Promise<string | null> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      locationIdOrName
    );
  const query = isUUID
    ? 'SELECT locationID FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL'
    : 'SELECT locationID FROM asset_mngmnt_locations WHERE name = ? AND deleted_at IS NULL';
  const [rows] = await pool.execute<RowDataPacket[]>(query, [locationIdOrName]);
  return (rows[0]?.locationID as string) ?? null;
}

// ---------------------------------------------------------------------------
// Asset CRUD helpers
// ---------------------------------------------------------------------------

export async function getAssetByCodeForAssign(
  assetCode: string
): Promise<AssetIdMiniRow | null> {
  const [rows] = await pool.execute<AssetIdMiniRow[]>(
    'SELECT assetID, status FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
    [assetCode]
  );
  return rows[0] ?? null;
}

export async function getAssetForUpdateById(
  assetId: string
): Promise<AssetForUpdateRow | null> {
  const [rows] = await pool.execute<AssetForUpdateRow[]>(
    'SELECT * FROM assets WHERE assetID = ? AND deleted_at IS NULL',
    [assetId]
  );
  return rows[0] ?? null;
}

export async function getAssetForUpdateByCode(
  assetCode: string
): Promise<AssetForUpdateRow | null> {
  const [rows] = await pool.execute<AssetForUpdateRow[]>(
    'SELECT * FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
    [assetCode]
  );
  return rows[0] ?? null;
}

/**
 * Resolve a client-supplied identifier (assetID, asset_code or tag_code) to the
 * canonical `assets.assetID`. The client `Asset.id` is the human-readable
 * `asset_code` (see `assetDetails.tsx` / `assetData.tsx`), while all
 * return/transfer/borrow lookups join on `assetID`. Returning `null` means the
 * asset does not exist.
 */
export async function resolveAssetIdByCodeOrId(
  rawParam: string
): Promise<string | null> {
  const trimmed = String(rawParam ?? '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  const [rows] = await pool.execute<AssetIdMiniRow[]>(
    `SELECT assetID FROM assets
      WHERE deleted_at IS NULL
        AND (assetID = ? OR UPPER(asset_code) = ? OR UPPER(tag_code) = ?)
      LIMIT 1`,
    [trimmed, upper, upper]
  );
  return rows[0]?.assetID ?? null;
}

export async function updateAssetCode(
  assetId: string,
  newCode: string
): Promise<void> {
  await pool.execute('UPDATE assets SET asset_code = ? WHERE assetID = ?', [
    newCode,
    assetId,
  ]);
}

export async function executeRawSelect<
  T extends RowDataPacket = RowDataPacket,
>(query: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.execute<T[]>(query, params as never[]);
  return rows;
}

export async function executeRawWrite(
  query: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(query, params as never[]);
  return result;
}

// ---------------------------------------------------------------------------
// Batch functions for getAssetsHandler
// ---------------------------------------------------------------------------

export async function getUserRoleById(
  userId: string
): Promise<UserRoleRow | null> {
  const [rows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.name as role_name, u.company_id, r.manager_role
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     WHERE u.userID = ?`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getCategoryIdsByDepartmentIds(
  departmentIds: string[]
): Promise<string[]> {
  if (departmentIds.length === 0) return [];
  const placeholders = departmentIds.map(() => '?').join(',');
  const [rows] = await pool.execute<CategoryIdRow[]>(
    `SELECT categoryID FROM asset_categories
     WHERE department_id IN (${placeholders}) AND deleted_at IS NULL`,
    departmentIds
  );
  return rows.map(r => r.categoryID);
}

export async function getBuilderHistoryForAssetIds(
  assetIds: string[]
): Promise<BuilderHistoryBatchRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderHistoryBatchRow[]>(
    `SELECT abi.asset_id, abi.itemID, ab.name as builder_name, ab.builderID, abi.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as added_by_name
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     LEFT JOIN users u ON abi.created_by = u.userID
     WHERE abi.asset_id IN (${placeholders}) AND ab.deleted_at IS NULL
     ORDER BY abi.asset_id, abi.created_at DESC`,
    assetIds
  );
  return rows;
}

export async function getBuilderMetaForAssetIds(
  assetIds: string[]
): Promise<BuilderMetaBatchRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderMetaBatchRow[]>(
    `SELECT builderID, status FROM asset_builders
     WHERE builderID IN (${placeholders}) AND deleted_at IS NULL`,
    assetIds
  );
  return rows;
}

export async function getBuilderChildrenForBuilderIds(
  builderIds: string[]
): Promise<BuilderChildBatchRow[]> {
  if (builderIds.length === 0) return [];
  const placeholders = builderIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderChildBatchRow[]>(
    `SELECT abi.builder_id, a.assetID, a.asset_code, a.name
     FROM asset_builder_items abi
     JOIN assets a ON abi.asset_id = a.assetID
     WHERE abi.builder_id IN (${placeholders}) AND a.deleted_at IS NULL
     ORDER BY abi.builder_id, abi.created_at`,
    builderIds
  );
  return rows;
}

export async function getBuilderLinksForAssetIds(
  assetIds: string[]
): Promise<BuilderLinkBatchRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderLinkBatchRow[]>(
    `SELECT abi.asset_id, abi.builder_id
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     WHERE abi.asset_id IN (${placeholders}) AND ab.deleted_at IS NULL`,
    assetIds
  );
  return rows;
}

export async function getBuilderItemsForBuilderIds(
  builderIds: string[]
): Promise<BuilderItemBatchRow[]> {
  if (builderIds.length === 0) return [];
  const placeholders = builderIds.map(() => '?').join(',');
  const [rows] = await pool.execute<BuilderItemBatchRow[]>(
    `SELECT abi.builder_id, abi.asset_id, abi.is_parent,
            ab.status AS builder_status,
            a.asset_code, a.name
     FROM asset_builder_items abi
     JOIN asset_builders ab ON abi.builder_id = ab.builderID
     JOIN assets a ON abi.asset_id = a.assetID
     WHERE abi.builder_id IN (${placeholders})
       AND ab.deleted_at IS NULL
       AND a.deleted_at IS NULL
     ORDER BY abi.builder_id, abi.is_parent DESC, abi.created_at`,
    builderIds
  );
  return rows;
}

export async function getAccountabilityFormsForAssetIds(
  assetIds: string[]
): Promise<AccountabilityFormBatchRow[]> {
  if (assetIds.length === 0) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.execute<AccountabilityFormBatchRow[]>(
    `SELECT asset_id, formID, form_number, status, created_at, signed_at, assets_data
     FROM accountability_forms
     WHERE deleted_at IS NULL
       AND status != 'Disabled'
       AND (asset_id IN (${placeholders})
            OR (assets_data IS NOT NULL
                AND JSON_OVERLAPS(JSON_EXTRACT(assets_data, '$.assets[*].id'), ?)))
     ORDER BY asset_id, created_at DESC`,
    [...assetIds, JSON.stringify(assetIds)]
  );
  return rows;
}

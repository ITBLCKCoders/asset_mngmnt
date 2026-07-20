import { pool } from '../db.js';
import logger from '../logger.js';

/**
 * Asset return repository: encapsulates SQL/queries for asset_return_forms and
 * related lookups. Behaviour is preserved 1:1 with the previous inline SQL
 * inside `controllers/assetReturns.controller.ts`.
 */

// ---------------------------------------------------------------------------
// Column-availability fallback helpers
// ---------------------------------------------------------------------------

/** True for MySQL ER_BAD_FIELD_ERROR (column missing on older schemas). */
export function isMysqlUnknownColumnError(e: unknown): boolean {
  const err = e as { code?: string; errno?: number; message?: string };
  const msg = typeof err?.message === 'string' ? err.message : '';
  return (
    err?.code === 'ER_BAD_FIELD_ERROR' ||
    err?.errno === 1054 ||
    msg.includes('Unknown column')
  );
}

// ---------------------------------------------------------------------------
// Asset return forms list
// ---------------------------------------------------------------------------

/**
 * Lists asset_return_forms for getAssetReturnsHandler. Full SELECT includes columns from later
 * migrations; if the DB is behind, MySQL returns ER_BAD_FIELD_ERROR — use a narrower SELECT.
 */
export const ASSET_RETURN_FORMS_LIST_SQL_FULL = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
       arf.signed_at, arf.signed_by, arf.signed_digital_signature,
       DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
       arf.process_digital_signature, arf.return_type, arf.received_by,
       arf.process_user_position,
       DATE_FORMAT(arf.processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
       arf.processor_declined_by, arf.processor_decline_reason,
       DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
       arf.dept_head_digital_signature, arf.dept_head_signed_by,
       DATE_FORMAT(arf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
       arf.it_manager_digital_signature, arf.it_manager_signed_by,
       arf.declined_at, arf.declined_by, arf.owner_absent,
       d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL ORDER BY arf.created_at DESC`;

export const ASSET_RETURN_FORMS_LIST_SQL_FALLBACK = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
       arf.signed_at, arf.signed_by, arf.signed_digital_signature,
       DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
       arf.process_digital_signature, arf.return_type, arf.received_by,
       DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
       arf.dept_head_digital_signature, arf.dept_head_signed_by,
       DATE_FORMAT(arf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
       arf.it_manager_digital_signature, arf.it_manager_signed_by,
       arf.declined_at, arf.declined_by,
       d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL ORDER BY arf.created_at DESC`;

export async function fetchAssetReturnFormsRowsForUserList(): Promise<any[]> {
  try {
    const [rows] = await pool.execute(ASSET_RETURN_FORMS_LIST_SQL_FULL);
    return rows as any[];
  } catch (e: unknown) {
    if (!isMysqlUnknownColumnError(e)) throw e;
    logger.warn(
      'asset_return_forms: full column list unavailable; using fallback query',
      e
    );
    const [rows] = await pool.execute(ASSET_RETURN_FORMS_LIST_SQL_FALLBACK);
    return (rows as any[]).map(r => ({
      ...r,
      process_user_position: null,
      processor_declined_at: null,
      processor_declined_by: null,
      processor_decline_reason: null,
      owner_absent: 0,
      dept_head_digital_signature: r.dept_head_digital_signature || null,
    }));
  }
}

// ---------------------------------------------------------------------------
// Pending dept-head approval list
// ---------------------------------------------------------------------------

/** Dept-head pending list: prefers owner_absent + declined_at; falls back for older schemas. */
export const PENDING_DH_APPROVAL_FORMS_SQL_FULL = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  arf.owner_absent,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.declined_at IS NULL) AND (arf.signed_at IS NOT NULL OR arf.owner_absent = 1) AND arf.dept_head_signed_at IS NULL
   AND arf.department_id <=> ? AND d.company_id = ?`;

export const PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.declined_at IS NULL) AND (arf.signed_at IS NOT NULL) AND arf.dept_head_signed_at IS NULL
   AND arf.department_id <=> ? AND d.company_id = ?`;

export const PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.signed_at IS NOT NULL) AND arf.dept_head_signed_at IS NULL
   AND arf.department_id <=> ? AND d.company_id = ?`;

/** Same as FULL but without department filter — for Global Admin / full-scope users */
export const PENDING_DH_APPROVAL_FORMS_SQL_FULL_NO_DEPT = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  arf.owner_absent,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.declined_at IS NULL) AND (arf.signed_at IS NOT NULL OR arf.owner_absent = 1) AND arf.dept_head_signed_at IS NULL
   AND d.company_id = ?`;

export const PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT_NO_DEPT = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.declined_at IS NULL) AND (arf.signed_at IS NOT NULL) AND arf.dept_head_signed_at IS NULL
   AND d.company_id = ?`;

export const PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED_NO_DEPT = `
SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
  arf.signed_at, arf.signed_by, arf.signed_digital_signature,
  DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
  arf.process_digital_signature, arf.return_type, arf.received_by,
  DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
  arf.dept_head_digital_signature, arf.dept_head_signed_by,
  d.company_id AS form_company_id, d.name AS form_department_name
 FROM asset_return_forms arf
 LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
 WHERE arf.deleted_at IS NULL AND (arf.signed_at IS NOT NULL) AND arf.dept_head_signed_at IS NULL
   AND d.company_id = ?`;

export async function fetchPendingDeptHeadApprovalFormRows(
  approverDepartmentId: string,
  companyId: string
): Promise<any[]> {
  const params = [approverDepartmentId, companyId];
  try {
    const [rows] = await pool.execute(
      PENDING_DH_APPROVAL_FORMS_SQL_FULL,
      params
    );
    return rows as any[];
  } catch (e: unknown) {
    if (!isMysqlUnknownColumnError(e)) throw e;
    logger.warn(
      'pending-approvals: full query failed (unknown column); trying without owner_absent',
      e
    );
  }
  try {
    const [rows] = await pool.execute(
      PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT,
      params
    );
    return (rows as any[]).map(r => ({ ...r, owner_absent: 0 }));
  } catch (e: unknown) {
    if (!isMysqlUnknownColumnError(e)) throw e;
    logger.warn('pending-approvals: retrying without declined_at filter', e);
  }
  const [rows] = await pool.execute(
    PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED,
    params
  );
  return (rows as any[]).map(r => ({ ...r, owner_absent: 0 }));
}

/** Fetch pending dept-head approval forms for a whole company (no department filter). */
export async function fetchPendingDeptHeadApprovalFormRowsByCompany(
  companyId: string
): Promise<any[]> {
  const params = [companyId];
  try {
    const [rows] = await pool.execute(
      PENDING_DH_APPROVAL_FORMS_SQL_FULL_NO_DEPT,
      params
    );
    return rows as any[];
  } catch (e: unknown) {
    if (!isMysqlUnknownColumnError(e)) throw e;
    logger.warn(
      'pending-approvals (no-dept): full query failed; trying without owner_absent',
      e
    );
  }
  try {
    const [rows] = await pool.execute(
      PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT_NO_DEPT,
      params
    );
    return (rows as any[]).map(r => ({ ...r, owner_absent: 0 }));
  } catch (e: unknown) {
    if (!isMysqlUnknownColumnError(e)) throw e;
    logger.warn('pending-approvals (no-dept): retrying without declined_at filter', e);
  }
  const [rows] = await pool.execute(
    PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED_NO_DEPT,
    params
  );
  return (rows as any[]).map(r => ({ ...r, owner_absent: 0 }));
}

// ---------------------------------------------------------------------------
// User / processor helpers
// ---------------------------------------------------------------------------

export async function fetchUserPosition(userId: string): Promise<string | null> {
  const [rows] = (await pool.execute(
    'SELECT position FROM users WHERE userID = ?',
    [userId]
  )) as any[];
  const p = rows?.[0]?.position;
  if (p == null) return null;
  const s = String(p).trim();
  return s || null;
}

export async function fetchUserDigitalSignature(
  userId: string
): Promise<string | null> {
  const [rows] = (await pool.execute(
    'SELECT digital_signature FROM users WHERE userID = ?',
    [userId]
  )) as any[];
  const sig = rows?.[0]?.digital_signature;
  if (sig == null) return null;
  const s = String(sig).trim();
  return s || null;
}

export type ProcessorReturnTarget = {
  processorName: string;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
  locationName: string | null;
  locationFloorUnit: string;
  locationBuilding: string;
  locationRoomId: string | null;
  locationRoomName: string | null;
};

export async function resolveProcessorReturnTarget(
  processorId: string
): Promise<ProcessorReturnTarget> {
  const [userRows] = (await pool.execute(
    `SELECT u.first_name, u.last_name, u.department_id,
            d.name AS department_name
     FROM users u
     LEFT JOIN asset_mngmnt_departments d
       ON u.department_id = d.departmentID
      AND d.deleted_at IS NULL
     WHERE u.userID = ?`,
    [processorId]
  )) as any[];
  const userRow = userRows?.[0] ?? null;

  const [directAssignmentRows] = (await pool.execute(
    `SELECT aa.department_id, aa.location_id, aa.location_room_id,
            d.name AS assignment_department_name,
            l.name AS location_name,
            l.floor_unit,
            l.building,
            lr.room_name
     FROM asset_assignments aa
     LEFT JOIN asset_mngmnt_departments d
       ON aa.department_id = d.departmentID
      AND d.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_locations l
       ON aa.location_id = l.locationID
      AND l.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_location_rooms lr
       ON aa.location_room_id = lr.roomID
      AND lr.deleted_at IS NULL
     WHERE aa.user_id = ?
       AND aa.status = 'Active'
       AND aa.deleted_at IS NULL
       AND (
         aa.assignment_notes IS NULL OR
         aa.assignment_notes NOT LIKE 'Assigned via asset return%'
       )
     ORDER BY aa.assigned_date DESC
     LIMIT 1`,
    [processorId]
  )) as any[];

  const [fallbackAssignmentRows] =
    directAssignmentRows?.length > 0
      ? [directAssignmentRows]
      : ((await pool.execute(
          `SELECT aa.department_id, aa.location_id, aa.location_room_id,
                  d.name AS assignment_department_name,
                  l.name AS location_name,
                  l.floor_unit,
                  l.building,
                  lr.room_name
           FROM asset_assignments aa
           LEFT JOIN asset_mngmnt_departments d
             ON aa.department_id = d.departmentID
            AND d.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_locations l
             ON aa.location_id = l.locationID
            AND l.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_location_rooms lr
             ON aa.location_room_id = lr.roomID
            AND lr.deleted_at IS NULL
           WHERE aa.user_id = ?
             AND aa.status = 'Active'
             AND aa.deleted_at IS NULL
           ORDER BY aa.assigned_date DESC
           LIMIT 1`,
          [processorId]
        )) as any[]);

  const assignmentRow =
    directAssignmentRows?.[0] ?? fallbackAssignmentRows?.[0] ?? null;
  const processorName = userRow
    ? `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown';

  return {
    processorName,
    departmentId:
      userRow?.department_id != null
        ? String(userRow.department_id)
        : assignmentRow?.department_id != null
          ? String(assignmentRow.department_id)
          : null,
    departmentName:
      userRow?.department_name ??
      assignmentRow?.assignment_department_name ??
      null,
    locationId:
      assignmentRow?.location_id != null
        ? String(assignmentRow.location_id)
        : null,
    locationName: assignmentRow?.location_name ?? null,
    locationFloorUnit: assignmentRow?.floor_unit ?? '',
    locationBuilding: assignmentRow?.building ?? '',
    locationRoomId:
      assignmentRow?.location_room_id != null
        ? String(assignmentRow.location_room_id)
        : null,
    locationRoomName: assignmentRow?.room_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Discrete reusable query helpers used by multiple handlers
// ---------------------------------------------------------------------------

/** Fetch active, non-deleted assignments for a list of assignment IDs. */
export async function getActiveAssignmentsByIds(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT * FROM asset_assignments
     WHERE assignmentID IN (${placeholders})
       AND status = 'Active'
       AND deleted_at IS NULL`,
    ids
  )) as any[];
  return rows as any[];
}

/**
 * Pick the asset-category department for a list of asset IDs (first hit).
 * Returns the departmentID of the first asset whose category has a department
 * mapping, or null if none of the assets belong to a category-mapped department.
 */
export async function getCategoryDepartmentForAssetIds(
  assetIds: string[]
): Promise<string | null> {
  if (assetIds.length === 0) return null;
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = (await pool.execute(
    `SELECT d.departmentID
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.assetID IN (${placeholders}) AND d.departmentID IS NOT NULL
     LIMIT 1`,
    assetIds
  )) as any[];
  return (rows[0] as any)?.departmentID ?? null;
}

export async function getCompanyIdByDepartment(
  departmentId: string
): Promise<string | null> {
  const [rows] = (await pool.execute(
    `SELECT company_id FROM asset_mngmnt_departments
     WHERE departmentID = ? AND deleted_at IS NULL`,
    [departmentId]
  )) as any[];
  return rows[0]?.company_id ?? null;
}

export async function getCompanyIdByUser(userId: string): Promise<string | null> {
  const [rows] = (await pool.execute(
    `SELECT company_id FROM users WHERE userID = ?`,
    [userId]
  )) as any[];
  return rows[0]?.company_id ?? null;
}

/**
 * Resolve the company_id for a return form using the same precedence as the
 * inline logic that previously lived in submit/create handlers:
 *   1. department.company_id (if department resolvable),
 *   2. user.company_id (fallback).
 */
export async function resolveReturnFormCompanyId(
  departmentId: string | null,
  fallbackUserId: string | null
): Promise<string | null> {
  if (departmentId) {
    const cid = await getCompanyIdByDepartment(departmentId);
    if (cid != null) return cid;
  }
  if (fallbackUserId) {
    const cid = await getCompanyIdByUser(fallbackUserId);
    if (cid != null) return cid;
  }
  return null;
}

/**
 * Get return forms by asset ID. Since asset_return_forms doesn't have a direct
 * asset_id column and return_form_assignments table doesn't exist, return empty array.
 * This would need database schema changes to properly link return forms to assets.
 */
export async function getReturnFormsByAssetId(
  assetId: string
): Promise<any[]> {
  // Return empty array since there's no way to link return forms to assets
  // with the current database schema
  return [];
}

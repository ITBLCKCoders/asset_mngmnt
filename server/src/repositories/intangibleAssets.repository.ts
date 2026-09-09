import { pool } from '../db.js';
import logger from '../logger.js';

/**
 * Intangible assets repository: encapsulates SQL/queries for intangible_assets table
 */

export interface IntangibleAssetAssignee {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedDate?: string;
}

function parseAssignees(raw: unknown): IntangibleAssetAssignee[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as IntangibleAssetAssignee[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildAssigneesFromFlatColumns(asset: any): IntangibleAssetAssignee[] | null {
  if (asset.assigned_first_name || asset.assigned_last_name || asset.assigned_email) {
    return [
      {
        userId: asset.assigned_to || '',
        firstName: asset.assigned_first_name || '',
        lastName: asset.assigned_last_name || '',
        email: asset.assigned_email || '',
        assignedDate: asset.assigned_date || undefined,
      },
    ];
  }
  return null;
}

export async function getAllIntangibleAssets(companyId: string): Promise<any[]> {
  const [rows] = (await pool.query('CALL sp_GetAllIntangibleAssets(?)', [
    companyId,
  ])) as any[];
  const assets = (rows[0] ?? []) as any[];
  // Pending (unsigned IT/Admin copy) intangible assignments held as
  // `Inactive` — display-only, so the list can badge them as pending.
  let pendingByAssetId = new Map<string, IntangibleAssetAssignee[]>();
  try {
    const ids = assets.map((a: any) => String(a.id ?? '')).filter(Boolean);
    if (ids.length > 0) {
      const pendingRows = await getPendingIntangibleAssignmentsForAssets(ids);
      for (const row of pendingRows) {
        const key = String((row as any).intangible_asset_id ?? '');
        const list = pendingByAssetId.get(key) ?? [];
        list.push({
          userId: String((row as any).user_id ?? ''),
          firstName: String((row as any).first_name ?? ''),
          lastName: String((row as any).last_name ?? ''),
          email: String((row as any).email ?? ''),
          assignedDate: (row as any).assigned_date
            ? String((row as any).assigned_date)
            : undefined,
        });
        pendingByAssetId.set(key, list);
      }
    }
  } catch (err) {
    logger.warn('Failed to fetch pending intangible assignments:', err);
  }
  return assets.map((asset: any) => {
    const parsed = parseAssignees(asset.assignees);
    const pendingAssignees = pendingByAssetId.get(String(asset.id ?? '')) ?? [];
    return {
      ...asset,
      assignees: parsed.length > 0 ? parsed : (buildAssigneesFromFlatColumns(asset) ?? parsed),
      pendingAssignees,
      isPendingSignature: pendingAssignees.length > 0,
      created_by_name: (asset.created_by_name || '').trim() || null,
      updated_by_name: (asset.updated_by_name || '').trim() || null,
      risk_level: parseRiskLevel(asset.risk_level),
      type_department: parseTypeDepartment(asset.type_department),
    };
  });
}

/**
 * Intangible assignments held as `Inactive` while their accountability form
 * awaits the IT/Admin copy signature. Display-only (badge support).
 */
export async function getPendingIntangibleAssignmentsForAssets(
  intangibleAssetIds: string[]
): Promise<any[]> {
  const ids = [...new Set((intangibleAssetIds ?? []).map(id => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = (await pool.query(
    `SELECT iaa.intangible_asset_id, iaa.user_id, iaa.assigned_date,
            u.first_name, u.last_name, u.email
     FROM intangible_asset_assignments iaa
     INNER JOIN users u ON iaa.user_id = u.userID
     WHERE iaa.intangible_asset_id IN (${placeholders})
       AND iaa.status = 'Inactive' AND iaa.deleted_at IS NULL
     ORDER BY iaa.intangible_asset_id, iaa.assigned_date DESC`,
    [...ids]
  )) as any[];
  return rows;
}

function parseRiskLevel(raw: unknown): { id: string; name: string; color?: string } | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as { id: string; name: string; color?: string };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseTypeDepartment(raw: unknown): { id: string; name: string; code?: string } | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as { id: string; name: string; code?: string };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function createIntangibleAsset(data: {
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  riskLevelId?: string | null;
  status: string;
  companyId: string;
  createdBy: string;
}): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_CreateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description,
      data.remarks,
      data.type,
      data.riskLevelId ?? null,
      data.status,
      data.companyId,
      data.createdBy,
    ]
  )) as any[];
  return result;
}

export async function createIntangibleAssetsBulk(
  assets: Array<{
    name: string;
    description: string | null;
    remarks: string | null;
    type: string;
    riskLevelId?: string | null;
    status: string;
  }>,
  companyId: string,
  createdBy: string
): Promise<any[]> {
  const results = [];
  for (const asset of assets) {
    try {
      const result = await createIntangibleAsset({
        ...asset,
        companyId,
        createdBy,
      });
      results.push(result);
    } catch (error) {
      logger.error('Error creating intangible asset in bulk', { error, asset });
      results.push({ error: true, asset });
    }
  }
  return results;
}

export async function updateIntangibleAsset(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    remarks?: string | null;
    type?: string;
    riskLevelId?: string | null;
    status?: string;
    companyId: string;
    updatedBy: string;
    assignedTo?: string | null;
    assignedDate?: string | null;
    assignmentId?: string | null;
  }
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_UpdateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description,
      data.remarks,
      data.type,
      data.riskLevelId ?? null,
      data.status,
      data.companyId,
      data.updatedBy,
    ]
  )) as any[];
  return result;
}

export async function getIntangibleAssetById(
  id: string,
  companyId: string
): Promise<any> {
  const [rows] = (await pool.query(
    'SELECT * FROM intangible_assets WHERE id = ? AND company_id = ?',
    [id, companyId]
  )) as any[];
  return rows[0];
}

export async function hasActiveAssignment(
  intangibleAssetId: string,
  userId: string
): Promise<boolean> {
  const [rows] = (await pool.query(
    `SELECT 1 FROM intangible_asset_assignments
     WHERE intangible_asset_id = ? AND user_id = ? AND status = 'Active' AND deleted_at IS NULL
     LIMIT 1`,
    [intangibleAssetId, userId]
  )) as any[];
  return rows.length > 0;
}

export async function getActiveAssignmentsByAsset(
  intangibleAssetId: string
): Promise<any[]> {
  const [rows] = (await pool.query(
    `SELECT iaa.*, u.first_name, u.last_name, u.email
     FROM intangible_asset_assignments iaa
     INNER JOIN users u ON iaa.user_id = u.userID
     WHERE iaa.intangible_asset_id = ? AND iaa.status = 'Active' AND iaa.deleted_at IS NULL`,
    [intangibleAssetId]
  )) as any[];
  return rows;
}

export async function getActiveAssignmentsByUser(
  userId: string,
  companyId: string
): Promise<any[]> {
  const [rows] = (await pool.query(
    `SELECT iaa.*, ia.name, ia.description, ia.type, ia.status AS asset_status
     FROM intangible_asset_assignments iaa
     INNER JOIN intangible_assets ia ON iaa.intangible_asset_id = ia.id
     WHERE iaa.user_id = ? AND ia.company_id = ? AND iaa.status = 'Active' AND iaa.deleted_at IS NULL`,
    [userId, companyId]
  )) as any[];
  return rows;
}

export async function assignIntangibleAsset(data: {
  id: string;
  assignedTo: string;
  assignmentId: string;
  companyId: string;
  assignedBy?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  locationRoomId?: string | null;
}): Promise<{ assigned: boolean }> {
  const alreadyAssigned = await hasActiveAssignment(data.id, data.assignedTo);
  if (alreadyAssigned) {
    return { assigned: false };
  }

  await pool.query(`CALL sp_AssignIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?)`, [
    data.id,
    data.assignedTo,
    data.assignmentId,
    data.companyId,
    data.assignedBy || null,
    data.departmentId || null,
    data.locationId || null,
    data.locationRoomId || null,
  ]);
  return { assigned: true };
}

/**
 * Reveal intangible assignments linked to the given tangible assignmentIDs
 * (via `accountability_assignment_id`) once the IT/Admin copy is signed.
 */
export async function setIntangibleActiveByAccountabilityAssignmentIds(
  accountabilityAssignmentIds: string[],
  userId: string
): Promise<number> {
  const ids = [...new Set((accountabilityAssignmentIds ?? []).map(id => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0 || !userId) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = (await pool.query(
    `UPDATE intangible_asset_assignments
      SET status = 'Active', updated_at = NOW()
      WHERE accountability_assignment_id IN (${placeholders})
        AND user_id = ? AND status = 'Inactive' AND deleted_at IS NULL`,
    [...ids, userId]
  )) as any[];
  return (result as { affectedRows?: number })?.affectedRows ?? 0;
}

/**
 * Hide intangible assignments linked to the given tangible assignmentIDs
 * while their accountability form awaits the IT/Admin copy signature.
 */
export async function setIntangibleInactiveByAccountabilityAssignmentIds(
  accountabilityAssignmentIds: string[],
  userId: string
): Promise<number> {
  const ids = [...new Set((accountabilityAssignmentIds ?? []).map(id => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0 || !userId) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = (await pool.query(
    `UPDATE intangible_asset_assignments
      SET status = 'Inactive', updated_at = NOW()
      WHERE accountability_assignment_id IN (${placeholders})
        AND user_id = ? AND status = 'Active' AND deleted_at IS NULL`,
    [...ids, userId]
  )) as any[];
  return (result as { affectedRows?: number })?.affectedRows ?? 0;
}

export async function unassignIntangibleAsset(
  id: string,
  userId: string,
  companyId: string
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_UnassignIntangibleAsset(?, ?, ?)`,
    [id, userId, companyId]
  )) as any[];
  return result;
}

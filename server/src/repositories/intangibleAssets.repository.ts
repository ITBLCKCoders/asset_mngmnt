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

export async function getAllIntangibleAssets(companyId: string): Promise<any[]> {
  const [rows] = (await pool.query('CALL sp_GetAllIntangibleAssets(?)', [
    companyId,
  ])) as any[];
  const assets = rows[0] ?? [];
  return assets.map((asset: any) => ({
    ...asset,
    assignees: parseAssignees(asset.assignees),
    created_by_name: (asset.created_by_name || '').trim() || null,
    updated_by_name: (asset.updated_by_name || '').trim() || null,
  }));
}

export async function createIntangibleAsset(data: {
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  status: string;
  companyId: string;
  createdBy: string;
}): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_CreateIntangibleAsset(?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description,
      data.remarks,
      data.type,
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
    status?: string;
    companyId: string;
    updatedBy: string;
  }
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_UpdateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description,
      data.remarks,
      data.type,
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

import { pool } from '../db.js';
import logger from '../logger.js';

/**
 * Intangible assets repository: encapsulates SQL/queries for intangible_assets table
 */

export async function getAllIntangibleAssets(companyId: string): Promise<any[]> {
  const [rows] = (await pool.query('CALL sp_GetAllIntangibleAssets(?)', [
    companyId,
  ])) as any[];
  return rows[0] ?? [];
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
    assignedTo?: string | null;
    assignedDate?: Date | null;
    assignmentId?: string | null;
  }
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_UpdateIntangibleAsset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description,
      data.remarks,
      data.type,
      data.status,
      data.companyId,
      data.updatedBy,
      data.assignedTo || null,
      data.assignedDate || null,
      data.assignmentId || null,
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

export async function assignIntangibleAsset(
  id: string,
  assignedTo: string,
  assignmentId: string,
  companyId: string
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_AssignIntangibleAsset(?, ?, ?, ?)`,
    [id, assignedTo, assignmentId, companyId]
  )) as any[];
  return result;
}

export async function unassignIntangibleAsset(
  id: string,
  companyId: string
): Promise<any> {
  const [result] = (await pool.query(
    `CALL sp_UnassignIntangibleAsset(?, ?)`,
    [id, companyId]
  )) as any[];
  return result;
}

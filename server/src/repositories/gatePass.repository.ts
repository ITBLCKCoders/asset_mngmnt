import { pool } from '../db.js';
import logger from '../logger.js';

/**
 * Gate pass repository: encapsulates SQL/queries for gate_passes table
 */

export async function createGatePass(data: {
  gatePassId: string;
  assignmentId: string;
  assetId: string;
  userId: string;
  purpose: string;
  expectedReturnDate: string | null;
  destinationLocationId: string | null;
  destinationDepartmentId: string | null;
  condition: string;
  notes: string | null;
  createdBy: string;
}): Promise<any> {
  const [result] = (await pool.execute(
    `INSERT INTO gate_passes 
     (gate_pass_id, assignment_id, asset_id, user_id, purpose, expected_return_date, 
      destination_location_id, destination_department_id, condition, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.gatePassId,
      data.assignmentId,
      data.assetId,
      data.userId,
      data.purpose,
      data.expectedReturnDate,
      data.destinationLocationId,
      data.destinationDepartmentId,
      data.condition,
      data.notes,
      data.createdBy,
    ]
  )) as any[];
  return result;
}

export async function getGatePassById(gatePassId: string): Promise<any> {
  const [rows] = (await pool.execute(
    `SELECT gp.*, 
            a.name as asset_name, a.code as asset_code,
            u.first_name, u.last_name, u.email,
            d.name as department_name,
            l.name as location_name,
            aa.status as assignment_status
     FROM gate_passes gp
     LEFT JOIN assets a ON gp.asset_id = a.assetID
     LEFT JOIN users u ON gp.user_id = u.userID
     LEFT JOIN asset_mngmnt_departments d ON gp.destination_department_id = d.departmentID
     LEFT JOIN asset_mngmnt_locations l ON gp.destination_location_id = l.locationID
     LEFT JOIN asset_assignments aa ON gp.assignment_id = aa.assignmentID
     WHERE gp.gate_pass_id = ?`,
    [gatePassId]
  )) as any[];
  return rows[0];
}

export async function getAllGatePasses(filters?: {
  userId?: string;
  assetId?: string;
  status?: string;
  destinationDepartmentId?: string;
  destinationLocationId?: string;
}): Promise<any[]> {
  let query = `
    SELECT gp.*, 
           a.name as asset_name, a.code as asset_code,
           u.first_name, u.last_name, u.email,
           d.name as department_name,
           l.name as location_name,
           aa.status as assignment_status
    FROM gate_passes gp
    LEFT JOIN assets a ON gp.asset_id = a.assetID
    LEFT JOIN users u ON gp.user_id = u.userID
    LEFT JOIN asset_mngmnt_departments d ON gp.destination_department_id = d.departmentID
    LEFT JOIN asset_mngmnt_locations l ON gp.destination_location_id = l.locationID
    LEFT JOIN asset_assignments aa ON gp.assignment_id = aa.assignmentID
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.userId) {
    query += ' AND gp.user_id = ?';
    params.push(filters.userId);
  }
  if (filters?.assetId) {
    query += ' AND gp.asset_id = ?';
    params.push(filters.assetId);
  }
  if (filters?.status) {
    query += ' AND gp.status = ?';
    params.push(filters.status);
  }
  if (filters?.destinationDepartmentId) {
    query += ' AND gp.destination_department_id = ?';
    params.push(filters.destinationDepartmentId);
  }
  if (filters?.destinationLocationId) {
    query += ' AND gp.destination_location_id = ?';
    params.push(filters.destinationLocationId);
  }

  query += ' ORDER BY gp.created_at DESC';

  const [rows] = (await pool.execute(query, params)) as any[];
  return rows;
}

export async function updateGatePass(
  gatePassId: string,
  data: {
    purpose?: string;
    expectedReturnDate?: string | null;
    destinationLocationId?: string | null;
    destinationDepartmentId?: string | null;
    condition?: string;
    notes?: string | null;
    status?: string;
    processedBy?: string;
    actualReturnDate?: string | null;
  }
): Promise<any> {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.purpose !== undefined) {
    updates.push('purpose = ?');
    params.push(data.purpose);
  }
  if (data.expectedReturnDate !== undefined) {
    updates.push('expected_return_date = ?');
    params.push(data.expectedReturnDate);
  }
  if (data.destinationLocationId !== undefined) {
    updates.push('destination_location_id = ?');
    params.push(data.destinationLocationId);
  }
  if (data.destinationDepartmentId !== undefined) {
    updates.push('destination_department_id = ?');
    params.push(data.destinationDepartmentId);
  }
  if (data.condition !== undefined) {
    updates.push('condition = ?');
    params.push(data.condition);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    params.push(data.notes);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.processedBy !== undefined) {
    updates.push('processed_by = ?');
    params.push(data.processedBy);
  }
  if (data.actualReturnDate !== undefined) {
    updates.push('actual_return_date = ?');
    params.push(data.actualReturnDate);
  }

  if (updates.length === 0) {
    return null;
  }

  params.push(gatePassId);
  const [result] = (await pool.execute(
    `UPDATE gate_passes SET ${updates.join(', ')} WHERE gate_pass_id = ?`,
    params
  )) as any[];
  return result;
}

export async function deleteGatePass(gatePassId: string): Promise<any> {
  const [result] = (await pool.execute(
    'DELETE FROM gate_passes WHERE gate_pass_id = ?',
    [gatePassId]
  )) as any[];
  return result;
}

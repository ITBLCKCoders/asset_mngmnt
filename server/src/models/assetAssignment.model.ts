import { pool } from '../db.js';

export interface AssetAssignment {
  assetAssignmentID: string;
  asset_id: string;
  user_id: string;
  assigned_date: string;
  due_date: string;
  returned_date: string | null;
  status: 'active' | 'returned' | 'overdue';
  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class AssetAssignmentModel {
  static async findAll(): Promise<AssetAssignment[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_assignments WHERE deleted_at IS NULL'
      );
      return rows as AssetAssignment[];
    } catch (error) {
      console.error('Error finding all asset assignments:', error);
      throw error;
    }
  }

  static async findById(
    assetAssignmentID: string
  ): Promise<AssetAssignment | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_assignments WHERE assetAssignmentID = ? AND deleted_at IS NULL',
        [assetAssignmentID]
      );
      const assignments = rows as AssetAssignment[];
      return assignments[0] ?? null;
    } catch (error) {
      console.error('Error finding asset assignment by ID:', error);
      throw error;
    }
  }

  static async findByAssetId(asset_id: string): Promise<AssetAssignment[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_assignments WHERE asset_id = ? AND deleted_at IS NULL',
        [asset_id]
      );
      return rows as AssetAssignment[];
    } catch (error) {
      console.error('Error finding asset assignments by asset ID:', error);
      throw error;
    }
  }

  static async findByUserId(user_id: string): Promise<AssetAssignment[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_assignments WHERE user_id = ? AND deleted_at IS NULL',
        [user_id]
      );
      return rows as AssetAssignment[];
    } catch (error) {
      console.error('Error finding asset assignments by user ID:', error);
      throw error;
    }
  }

  static async create(
    assignmentData: Partial<AssetAssignment>,
    userId: string
  ): Promise<AssetAssignment | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_assignments (asset_id, user_id, assigned_date, due_date, notes, created_by, updated_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          assignmentData.asset_id,
          assignmentData.user_id,
          assignmentData.assigned_date,
          assignmentData.due_date,
          assignmentData.notes,
          userId,
          userId,
          'active',
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating asset assignment:', error);
      throw error;
    }
  }

  static async update(
    assetAssignmentID: string,
    assignmentData: Partial<AssetAssignment>,
    userId: string
  ): Promise<AssetAssignment | null> {
    try {
      await pool.execute(
        'UPDATE asset_assignments SET asset_id = ?, user_id = ?, assigned_date = ?, due_date = ?, returned_date = ?, status = ?, notes = ?, updated_by = ?, updated_at = NOW() WHERE assetAssignmentID = ? AND deleted_at IS NULL',
        [
          assignmentData.asset_id,
          assignmentData.user_id,
          assignmentData.assigned_date,
          assignmentData.due_date,
          assignmentData.returned_date,
          assignmentData.status,
          assignmentData.notes,
          userId,
          assetAssignmentID,
        ]
      );
      return this.findById(assetAssignmentID);
    } catch (error) {
      console.error('Error updating asset assignment:', error);
      throw error;
    }
  }

  static async delete(
    assetAssignmentID: string,
    userId: string
  ): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_assignments SET deleted_at = NOW(), updated_by = ? WHERE assetAssignmentID = ? AND deleted_at IS NULL',
        [userId, assetAssignmentID]
      );
    } catch (error) {
      console.error('Error deleting asset assignment:', error);
      throw error;
    }
  }
}

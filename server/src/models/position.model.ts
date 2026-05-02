import { pool } from '../db.js';

export interface Position {
  positionID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class PositionModel {
  static async findAll(): Promise<Position[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_positions WHERE deleted_at IS NULL'
      );
      return rows as Position[];
    } catch (error) {
      console.error('Error finding all positions:', error);
      throw error;
    }
  }

  static async findById(positionID: string): Promise<Position | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_positions WHERE positionID = ? AND deleted_at IS NULL',
        [positionID]
      );
      const positions = rows as Position[];
      return positions[0] ?? null;
    } catch (error) {
      console.error('Error finding position by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Position | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_positions WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const positions = rows as Position[];
      return positions[0] ?? null;
    } catch (error) {
      console.error('Error finding position by name:', error);
      throw error;
    }
  }

  static async create(
    positionData: Partial<Position>,
    userId: string
  ): Promise<Position | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_positions (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          positionData.name,
          positionData.description,
          positionData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating position:', error);
      throw error;
    }
  }

  static async update(
    positionID: string,
    positionData: Partial<Position>,
    userId: string
  ): Promise<Position | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_positions SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE positionID = ? AND deleted_at IS NULL',
        [
          positionData.name,
          positionData.description,
          positionData.status,
          userId,
          positionID,
        ]
      );
      return this.findById(positionID);
    } catch (error) {
      console.error('Error updating position:', error);
      throw error;
    }
  }

  static async delete(positionID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_positions SET deleted_at = NOW(), updated_by = ? WHERE positionID = ? AND deleted_at IS NULL',
        [userId, positionID]
      );
    } catch (error) {
      console.error('Error deleting position:', error);
      throw error;
    }
  }
}

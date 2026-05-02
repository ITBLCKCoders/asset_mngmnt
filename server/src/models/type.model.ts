import { pool } from '../db.js';

export interface Type {
  typeID: string;
  name: string;
  description: string;
  category_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class TypeModel {
  static async findAll(): Promise<Type[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_types WHERE deleted_at IS NULL'
      );
      return rows as Type[];
    } catch (error) {
      console.error('Error finding all types:', error);
      throw error;
    }
  }

  static async findById(typeID: string): Promise<Type | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_types WHERE typeID = ? AND deleted_at IS NULL',
        [typeID]
      );
      const types = rows as Type[];
      return types[0] ?? null;
    } catch (error) {
      console.error('Error finding type by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Type | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_types WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const types = rows as Type[];
      return types[0] ?? null;
    } catch (error) {
      console.error('Error finding type by name:', error);
      throw error;
    }
  }

  static async create(
    typeData: Partial<Type>,
    userId: string
  ): Promise<Type | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_types (name, description, category_id, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          typeData.name,
          typeData.description,
          typeData.category_id,
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating type:', error);
      throw error;
    }
  }

  static async update(
    typeID: string,
    typeData: Partial<Type>,
    userId: string
  ): Promise<Type | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_types SET name = ?, description = ?, category_id = ?, updated_by = ?, updated_at = NOW() WHERE typeID = ? AND deleted_at IS NULL',
        [
          typeData.name,
          typeData.description,
          typeData.category_id,
          userId,
          typeID,
        ]
      );
      return this.findById(typeID);
    } catch (error) {
      console.error('Error updating type:', error);
      throw error;
    }
  }

  static async delete(typeID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_types SET deleted_at = NOW(), updated_by = ? WHERE typeID = ? AND deleted_at IS NULL',
        [userId, typeID]
      );
    } catch (error) {
      console.error('Error deleting type:', error);
      throw error;
    }
  }
}

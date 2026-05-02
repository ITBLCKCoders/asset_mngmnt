import { pool } from '../db.js';

export interface Permission {
  permissionID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class PermissionModel {
  static async findAll(): Promise<Permission[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_permissions WHERE deleted_at IS NULL'
      );
      return rows as Permission[];
    } catch (error) {
      console.error('Error finding all permissions:', error);
      throw error;
    }
  }

  static async findById(permissionID: string): Promise<Permission | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_permissions WHERE permissionID = ? AND deleted_at IS NULL',
        [permissionID]
      );
      const permissions = rows as Permission[];
      return permissions[0] ?? null;
    } catch (error) {
      console.error('Error finding permission by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Permission | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_permissions WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const permissions = rows as Permission[];
      return permissions[0] ?? null;
    } catch (error) {
      console.error('Error finding permission by name:', error);
      throw error;
    }
  }

  static async create(
    permissionData: Partial<Permission>,
    userId: string
  ): Promise<Permission | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_permissions (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          permissionData.name,
          permissionData.description,
          permissionData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating permission:', error);
      throw error;
    }
  }

  static async update(
    permissionID: string,
    permissionData: Partial<Permission>,
    userId: string
  ): Promise<Permission | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_permissions SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE permissionID = ? AND deleted_at IS NULL',
        [
          permissionData.name,
          permissionData.description,
          permissionData.status,
          userId,
          permissionID,
        ]
      );
      return this.findById(permissionID);
    } catch (error) {
      console.error('Error updating permission:', error);
      throw error;
    }
  }

  static async delete(permissionID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_permissions SET deleted_at = NOW(), updated_by = ? WHERE permissionID = ? AND deleted_at IS NULL',
        [userId, permissionID]
      );
    } catch (error) {
      console.error('Error deleting permission:', error);
      throw error;
    }
  }
}

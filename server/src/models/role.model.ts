import { pool } from '../db.js';

export interface Role {
  roleID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class RoleModel {
  static async findAll(): Promise<Role[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_roles WHERE deleted_at IS NULL'
      );
      return rows as Role[];
    } catch (error) {
      console.error('Error finding all roles:', error);
      throw error;
    }
  }

  static async findById(roleID: string): Promise<Role | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_roles WHERE roleID = ? AND deleted_at IS NULL',
        [roleID]
      );
      const roles = rows as Role[];
      return roles[0] ?? null;
    } catch (error) {
      console.error('Error finding role by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Role | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_roles WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const roles = rows as Role[];
      return roles[0] ?? null;
    } catch (error) {
      console.error('Error finding role by name:', error);
      throw error;
    }
  }

  static async create(
    roleData: Partial<Role>,
    userId: string
  ): Promise<Role | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_roles (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          roleData.name,
          roleData.description,
          roleData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  static async update(
    roleID: string,
    roleData: Partial<Role>,
    userId: string
  ): Promise<Role | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_roles SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE roleID = ? AND deleted_at IS NULL',
        [roleData.name, roleData.description, roleData.status, userId, roleID]
      );
      return this.findById(roleID);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  static async delete(roleID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_roles SET deleted_at = NOW(), updated_by = ? WHERE roleID = ? AND deleted_at IS NULL',
        [userId, roleID]
      );
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }
}

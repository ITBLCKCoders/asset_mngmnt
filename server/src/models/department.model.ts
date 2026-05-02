import { pool } from '../db.js';

export interface Department {
  departmentID: string;
  name: string;
  description: string;
  manager_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class DepartmentModel {
  static async findAll(): Promise<Department[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_departments WHERE deleted_at IS NULL'
      );
      return rows as Department[];
    } catch (error) {
      console.error('Error finding all departments:', error);
      throw error;
    }
  }

  static async findById(departmentID: string): Promise<Department | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL',
        [departmentID]
      );
      const departments = rows as Department[];
      return departments[0] ?? null;
    } catch (error) {
      console.error('Error finding department by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Department | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_departments WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const departments = rows as Department[];
      return departments[0] ?? null;
    } catch (error) {
      console.error('Error finding department by name:', error);
      throw error;
    }
  }

  static async create(
    departmentData: Partial<Department>,
    userId: string
  ): Promise<Department | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_departments (name, description, manager_id, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          departmentData.name,
          departmentData.description,
          departmentData.manager_id,
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  static async update(
    departmentID: string,
    departmentData: Partial<Department>,
    userId: string
  ): Promise<Department | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_departments SET name = ?, description = ?, manager_id = ?, updated_by = ?, updated_at = NOW() WHERE departmentID = ? AND deleted_at IS NULL',
        [
          departmentData.name,
          departmentData.description,
          departmentData.manager_id,
          userId,
          departmentID,
        ]
      );
      return this.findById(departmentID);
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  }

  static async delete(departmentID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_departments SET deleted_at = NOW(), updated_by = ? WHERE departmentID = ? AND deleted_at IS NULL',
        [userId, departmentID]
      );
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }
}

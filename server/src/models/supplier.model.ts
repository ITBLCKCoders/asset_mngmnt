import { pool } from '../db.js';

export interface Supplier {
  supplierID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class SupplierModel {
  static async findAll(): Promise<Supplier[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_suppliers WHERE deleted_at IS NULL'
      );
      return rows as Supplier[];
    } catch (error) {
      console.error('Error finding all suppliers:', error);
      throw error;
    }
  }

  static async findById(supplierID: string): Promise<Supplier | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_suppliers WHERE supplierID = ? AND deleted_at IS NULL',
        [supplierID]
      );
      const suppliers = rows as Supplier[];
      return suppliers[0] ?? null;
    } catch (error) {
      console.error('Error finding supplier by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Supplier | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_suppliers WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const suppliers = rows as Supplier[];
      return suppliers[0] ?? null;
    } catch (error) {
      console.error('Error finding supplier by name:', error);
      throw error;
    }
  }

  static async create(
    supplierData: Partial<Supplier>,
    userId: string
  ): Promise<Supplier | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_suppliers (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          supplierData.name,
          supplierData.description,
          supplierData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  static async update(
    supplierID: string,
    supplierData: Partial<Supplier>,
    userId: string
  ): Promise<Supplier | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_suppliers SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE supplierID = ? AND deleted_at IS NULL',
        [
          supplierData.name,
          supplierData.description,
          supplierData.status,
          userId,
          supplierID,
        ]
      );
      return this.findById(supplierID);
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  static async delete(supplierID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_suppliers SET deleted_at = NOW(), updated_by = ? WHERE supplierID = ? AND deleted_at IS NULL',
        [userId, supplierID]
      );
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
}

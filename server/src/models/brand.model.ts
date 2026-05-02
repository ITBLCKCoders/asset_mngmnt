import { pool } from '../db.js';

export interface Brand {
  brandID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class BrandModel {
  static async findAll(): Promise<Brand[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_brands WHERE deleted_at IS NULL'
      );
      return rows as Brand[];
    } catch (error) {
      console.error('Error finding all brands:', error);
      throw error;
    }
  }

  static async findById(brandID: string): Promise<Brand | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_brands WHERE brandID = ? AND deleted_at IS NULL',
        [brandID]
      );
      const brands = rows as Brand[];
      return brands[0] ?? null;
    } catch (error) {
      console.error('Error finding brand by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Brand | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_brands WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const brands = rows as Brand[];
      return brands[0] ?? null;
    } catch (error) {
      console.error('Error finding brand by name:', error);
      throw error;
    }
  }

  static async create(
    brandData: Partial<Brand>,
    userId: string
  ): Promise<Brand | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_brands (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          brandData.name,
          brandData.description,
          brandData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating brand:', error);
      throw error;
    }
  }

  static async update(
    brandID: string,
    brandData: Partial<Brand>,
    userId: string
  ): Promise<Brand | null> {
    try {
      await pool.execute(
        'UPDATE asset_brands SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE brandID = ? AND deleted_at IS NULL',
        [
          brandData.name,
          brandData.description,
          brandData.status,
          userId,
          brandID,
        ]
      );
      return this.findById(brandID);
    } catch (error) {
      console.error('Error updating brand:', error);
      throw error;
    }
  }

  static async delete(brandID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_brands SET deleted_at = NOW(), updated_by = ? WHERE brandID = ? AND deleted_at IS NULL',
        [userId, brandID]
      );
    } catch (error) {
      console.error('Error deleting brand:', error);
      throw error;
    }
  }
}

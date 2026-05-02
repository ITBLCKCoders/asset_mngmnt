import { pool } from '../db.js';

export interface Category {
  categoryID: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class CategoryModel {
  static async findAll(): Promise<Category[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_categories WHERE deleted_at IS NULL'
      );
      return rows as Category[];
    } catch (error) {
      console.error('Error finding all categories:', error);
      throw error;
    }
  }

  static async findById(categoryID: string): Promise<Category | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_categories WHERE categoryID = ? AND deleted_at IS NULL',
        [categoryID]
      );
      const categories = rows as Category[];
      return categories[0] ?? null;
    } catch (error) {
      console.error('Error finding category by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Category | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_categories WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const categories = rows as Category[];
      return categories[0] ?? null;
    } catch (error) {
      console.error('Error finding category by name:', error);
      throw error;
    }
  }

  static async create(
    categoryData: Partial<Category>,
    userId: string
  ): Promise<Category | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_categories (name, description, created_by, updated_by) VALUES (?, ?, ?, ?)',
        [categoryData.name, categoryData.description, userId, userId]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  static async update(
    categoryID: string,
    categoryData: Partial<Category>,
    userId: string
  ): Promise<Category | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_categories SET name = ?, description = ?, updated_by = ?, updated_at = NOW() WHERE categoryID = ? AND deleted_at IS NULL',
        [categoryData.name, categoryData.description, userId, categoryID]
      );
      return this.findById(categoryID);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  static async delete(categoryID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_categories SET deleted_at = NOW(), updated_by = ? WHERE categoryID = ? AND deleted_at IS NULL',
        [userId, categoryID]
      );
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
}

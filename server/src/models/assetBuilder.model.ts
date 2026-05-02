import { pool } from '../db.js';

export interface AssetBuilder {
  assetBuilderID: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class AssetBuilderModel {
  static async findAll(): Promise<AssetBuilder[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_builders WHERE deleted_at IS NULL'
      );
      return rows as AssetBuilder[];
    } catch (error) {
      console.error('Error finding all asset builders:', error);
      throw error;
    }
  }

  static async findById(assetBuilderID: string): Promise<AssetBuilder | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_builders WHERE assetBuilderID = ? AND deleted_at IS NULL',
        [assetBuilderID]
      );
      const builders = rows as AssetBuilder[];
      return builders[0] ?? null;
    } catch (error) {
      console.error('Error finding asset builder by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<AssetBuilder | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_builders WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const builders = rows as AssetBuilder[];
      return builders[0] ?? null;
    } catch (error) {
      console.error('Error finding asset builder by name:', error);
      throw error;
    }
  }

  static async create(
    builderData: Partial<AssetBuilder>,
    userId: string
  ): Promise<AssetBuilder | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_builders (name, description, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          builderData.name,
          builderData.description,
          builderData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating asset builder:', error);
      throw error;
    }
  }

  static async update(
    assetBuilderID: string,
    builderData: Partial<AssetBuilder>,
    userId: string
  ): Promise<AssetBuilder | null> {
    try {
      await pool.execute(
        'UPDATE asset_builders SET name = ?, description = ?, status = ?, updated_by = ?, updated_at = NOW() WHERE assetBuilderID = ? AND deleted_at IS NULL',
        [
          builderData.name,
          builderData.description,
          builderData.status,
          userId,
          assetBuilderID,
        ]
      );
      return this.findById(assetBuilderID);
    } catch (error) {
      console.error('Error updating asset builder:', error);
      throw error;
    }
  }

  static async delete(assetBuilderID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_builders SET deleted_at = NOW(), updated_by = ? WHERE assetBuilderID = ? AND deleted_at IS NULL',
        [userId, assetBuilderID]
      );
    } catch (error) {
      console.error('Error deleting asset builder:', error);
      throw error;
    }
  }
}

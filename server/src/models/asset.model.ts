import { pool } from '../db.js';

export interface Asset {
  assetID: string;
  asset_code: string;
  name: string;
  description: string | null;
  category_id: string;
  supplier: string | null;
  type_id: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  image_url: string | null;
  purchase_date: string | null;
  asset_value: number | null;
  salvage_value: number;
  depreciation_method: string | null;
  useful_life_years: number | null;
  annual_depreciation: number | null;
  depreciation_start_date: string | null;
  company_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  department_id: string | null;
  location_notes: string | null;
  warranty_months: number | null;
  condition: string;
  maintenance_schedule: string;
  status: string;
  is_old_unit: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class AssetModel {
  static async findAll(): Promise<Asset[]> {
    try {
      const [rows] = await pool.execute('CALL sp_get_assets()');
      return (rows as any[])[0];
    } catch (error) {
      console.error('Error finding all assets:', error);
      throw error;
    }
  }

  static async findById(assetCode: string): Promise<Asset | null> {
    try {
      const [rows] = await pool.execute('CALL sp_get_assets()');
      const assets = (rows as any[])[0];
      return (
        assets.find((asset: Asset) => asset.asset_code === assetCode) || null
      );
    } catch (error) {
      console.error('Error finding asset by code:', error);
      throw error;
    }
  }

  static async create(
    assetData: Partial<Asset>,
    userId: string
  ): Promise<Asset> {
    try {
      // This is a placeholder - in your actual implementation, you would call your stored procedure
      // with the appropriate parameters
      const [rows] = await pool.execute(
        'CALL sp_create_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          assetData.name,
          assetData.description,
          assetData.category_id,
          assetData.supplier,
          assetData.type_id,
          assetData.brand,
          assetData.model,
          assetData.serial,
          assetData.image_url,
          assetData.purchase_date,
          assetData.asset_value,
          assetData.salvage_value,
          assetData.depreciation_method,
          assetData.useful_life_years,
          assetData.annual_depreciation,
          assetData.depreciation_start_date,
          assetData.company_id,
          assetData.location_id,
          assetData.location_room_id,
          assetData.department_id,
          assetData.location_notes,
          assetData.warranty_months,
          assetData.condition,
          assetData.maintenance_schedule,
          assetData.status,
          assetData.is_old_unit,
          userId,
          userId,
          null,
        ]
      );
      return (rows as any[])[0][0];
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }

  static async update(
    assetCode: string,
    assetData: Partial<Asset>,
    userId: string
  ): Promise<Asset> {
    try {
      // First, find the asset ID by code
      const [assetRows] = await pool.execute(
        'SELECT assetID FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
        [assetCode]
      );
      const assets = assetRows as any[];

      if (assets.length === 0) {
        throw new Error('Asset not found');
      }

      const assetID = assets[0].assetID;

      // Call the update stored procedure
      const [rows] = await pool.execute(
        'CALL sp_update_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          assetID,
          assetData.name,
          assetData.description,
          assetData.category_id,
          assetData.supplier,
          assetData.type_id,
          assetData.brand,
          assetData.model,
          assetData.serial,
          assetData.image_url,
          assetData.purchase_date,
          assetData.asset_value,
          assetData.salvage_value,
          assetData.depreciation_method,
          assetData.useful_life_years,
          assetData.annual_depreciation,
          assetData.depreciation_start_date,
          assetData.company_id,
          assetData.location_id,
          assetData.location_room_id,
          assetData.department_id,
          assetData.location_notes,
          assetData.warranty_months,
          assetData.condition,
          assetData.maintenance_schedule,
          assetData.status,
          assetData.is_old_unit,
          userId,
        ]
      );

      return (rows as any[])[0][0];
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  }

  static async delete(assetCode: string, userId: string): Promise<void> {
    try {
      // Soft delete the asset
      const [assetRows] = await pool.execute(
        'SELECT assetID FROM assets WHERE asset_code = ? AND deleted_at IS NULL',
        [assetCode]
      );
      const assets = assetRows as any[];

      if (assets.length === 0) {
        throw new Error('Asset not found');
      }

      const assetID = assets[0].assetID;

      await pool.execute(
        'UPDATE assets SET deleted_at = NOW(), updated_by = ? WHERE assetID = ?',
        [userId, assetID]
      );
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }
}

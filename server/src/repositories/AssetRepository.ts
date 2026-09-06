import { BaseRepository } from './BaseRepository.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import { AppError } from '../middleware/enhancedErrorHandling.js';
import { withPastAndPresentDepreciationFields } from '../utils/depreciation.js';

export class AssetRepository extends BaseRepository<any> {
  constructor() {
    super('assets', 'assetID');
  }

  /**
   * Get all assets with pagination and filtering
   */
  async getAllAssets(
    page: number = 1,
    limit: number = 10,
    filters: any = {}
  ): Promise<{ assets: any[]; pagination: any }> {
    try {
      const offset = (page - 1) * limit;
      const searchParam =
        filters.search && String(filters.search).trim()
          ? String(filters.search).trim()
          : null;

      // Get total count using stored procedure
      const [countResult] = (await pool.execute(
        'CALL sp_get_assets_count_filtered(?, ?, ?, ?, ?)',
        [
          filters.status ?? null,
          filters.categoryId ?? null,
          filters.departmentId ?? null,
          filters.locationId ?? null,
          searchParam,
        ]
      )) as any[];

      const total =
        (Array.isArray(countResult[0]) ? countResult[0][0] : countResult[0])
          ?.total ?? 0;
      const totalPages = Math.ceil(total / limit);

      // Get assets using stored procedure
      const [rowsResult] = (await pool.execute(
        'CALL sp_get_assets_filtered(?, ?, ?, ?, ?, ?, ?)',
        [
          filters.status ?? null,
          filters.categoryId ?? null,
          filters.departmentId ?? null,
          filters.locationId ?? null,
          searchParam,
          limit,
          offset,
        ]
      )) as any[];

      const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;

      // Process assets to include related data
      const assets = rows.map((row: any) => ({
        assetID: row.assetID,
        asset_code: row.asset_code,
        name: row.name,
        description: row.description,
        category_id: row.category_id,
        category: row.category_name
          ? {
              id: row.category_id,
              name: row.category_name,
            }
          : null,
        supplier: row.supplier_name
          ? {
              id: row.supplier,
              name: row.supplier_name,
            }
          : null,
        type_id: row.type_id,
        type: row.type_name
          ? {
              id: row.type_id,
              name: row.type_name,
            }
          : null,
        brand: row.brand_name
          ? {
              id: row.brand,
              name: row.brand_name,
            }
          : null,
        model: row.model,
        serial: row.serial,
        image_url: row.image_url,
        purchase_date: row.purchase_date,
        asset_value: row.asset_value,
        salvage_value: row.salvage_value,
        depreciation_method: row.depreciation_method,
        useful_life_years: row.useful_life_years,
        annual_depreciation: row.annual_depreciation,
        ...withPastAndPresentDepreciationFields(row),
        depreciation_start_date: row.depreciation_start_date,
        company_id: row.company_id,
        company: row.company_name
          ? {
              id: row.company_id,
              name: row.company_name,
            }
          : null,
        location_id: row.location_id,
        location: row.location_name
          ? {
              id: row.location_id,
              name: row.location_name,
              room: row.location_room_name,
            }
          : null,
        department_id: row.department_id,
        department: row.department_name
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location_notes: row.location_notes,
        warranty_months: row.warranty_months,
        condition: row.condition,
        maintenance_schedule: row.maintenance_schedule,
        status: row.status,
        is_old_unit: row.is_old_unit,
        created_at: row.created_at,
        created_by: row.created_by,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
        assignedTo: row.assigned_first_name
          ? `${row.assigned_first_name} ${row.assigned_last_name}`
          : null,
        assignedUser: row.assigned_first_name
          ? {
              id: row.assigned_email,
              name: `${row.assigned_first_name} ${row.assigned_last_name}`,
              email: row.assigned_email,
            }
          : null,
      }));

      return {
        assets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('AssetRepository.getAllAssets failed:', error);
      throw new AppError('Failed to fetch assets', 500);
    }
  }

  /**
   * Get asset by ID with all related data
   */
  async getAssetById(assetId: string): Promise<any> {
    try {
      const [rowsResult] = (await pool.execute('CALL sp_get_asset_by_code(?)', [
        assetId,
      ])) as any[];

      const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        assetID: row.assetID,
        asset_code: row.asset_code,
        name: row.name,
        description: row.description,
        category_id: row.category_id,
        category: row.category_name
          ? {
              id: row.category_id,
              name: row.category_name,
            }
          : null,
        supplier: row.supplier_name
          ? {
              id: row.supplier,
              name: row.supplier_name,
            }
          : null,
        type_id: row.type_id,
        type: row.type_name
          ? {
              id: row.type_id,
              name: row.type_name,
            }
          : null,
        brand: row.brand_name
          ? {
              id: row.brand,
              name: row.brand_name,
            }
          : null,
        model: row.model,
        serial: row.serial,
        image_url: row.image_url,
        purchase_date: row.purchase_date,
        asset_value: row.asset_value,
        salvage_value: row.salvage_value,
        depreciation_method: row.depreciation_method,
        useful_life_years: row.useful_life_years,
        annual_depreciation: row.annual_depreciation,
        ...withPastAndPresentDepreciationFields(row),
        depreciation_start_date: row.depreciation_start_date,
        company_id: row.company_id,
        company: row.company_name
          ? {
              id: row.company_id,
              name: row.company_name,
            }
          : null,
        location_id: row.location_id,
        location: row.location_name
          ? {
              id: row.location_id,
              name: row.location_name,
              room: row.location_room_name,
            }
          : null,
        department_id: row.department_id,
        department: row.department_name
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location_notes: row.location_notes,
        warranty_months: row.warranty_months,
        condition: row.condition,
        maintenance_schedule: row.maintenance_schedule,
        status: row.status,
        is_old_unit: row.is_old_unit,
        created_at: row.created_at,
        created_by: row.created_by,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      };
    } catch (error) {
      logger.error('AssetRepository.getAssetById failed:', error);
      throw new AppError('Failed to fetch asset', 500);
    }
  }

  /**
   * Create new asset using stored procedure
   */
  async createAsset(assetData: any, userId: string): Promise<any> {
    try {
      const [rows] = (await pool.execute(
        `CALL sp_create_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assetData.name.trim(),
          assetData.description?.trim() || null,
          assetData.category_id,
          assetData.supplier || null,
          assetData.type_id || null,
          assetData.brand?.trim() || null,
          assetData.model?.trim() || null,
          assetData.serial?.trim() || null,
          assetData.image_url || null,
          assetData.purchase_date
            ? new Date(assetData.purchase_date).toISOString().split('T')[0]
            : null,
          assetData.asset_value || null,
          assetData.salvage_value || 0,
          assetData.depreciation_method || null,
          assetData.useful_life_years || null,
          assetData.annual_depreciation || null,
          assetData.depreciation_start_date
            ? new Date(assetData.depreciation_start_date)
                .toISOString()
                .split('T')[0]
            : null,
          assetData.company_id || null,
          assetData.location_id || null,
          assetData.location_room_id || null,
          assetData.department_id || null,
          assetData.location_notes?.trim() || null,
          assetData.warranty_months || null,
          assetData.condition || null,
          assetData.maintenance_schedule || 'None',
          assetData.status || 'Available',
          assetData.is_old_unit || 0,
          userId,
          userId,
          null,
        ]
      )) as any[];

      const asset = rows[0][0];
      return asset;
    } catch (error) {
      logger.error('AssetRepository.createAsset failed:', error);
      throw new AppError('Failed to create asset', 500);
    }
  }

  /**
   * Update asset using stored procedure
   */
  async updateAsset(
    assetId: string,
    assetData: any,
    userId: string
  ): Promise<any> {
    try {
      // First get the existing asset to preserve unchanged values
      const existingAsset = await this.getAssetById(assetId);
      if (!existingAsset) {
        throw new AppError(`Asset with ID ${assetId} not found`, 404);
      }

      const [rows] = (await pool.execute(
        `CALL sp_update_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          existingAsset.assetID,
          assetData.name?.trim() || existingAsset.name,
          assetData.description?.trim() || existingAsset.description,
          assetData.category_id || existingAsset.category_id,
          assetData.supplier || existingAsset.supplier,
          assetData.type_id || existingAsset.type_id,
          assetData.brand?.trim() || existingAsset.brand,
          assetData.model?.trim() || existingAsset.model,
          assetData.serial?.trim() || existingAsset.serial,
          assetData.image_url || existingAsset.image_url,
          assetData.purchase_date
            ? new Date(assetData.purchase_date).toISOString().split('T')[0]
            : existingAsset.purchase_date,
          assetData.asset_value || existingAsset.asset_value,
          assetData.salvage_value || existingAsset.salvage_value,
          assetData.depreciation_method || existingAsset.depreciation_method,
          assetData.useful_life_years || existingAsset.useful_life_years,
          assetData.annual_depreciation || existingAsset.annual_depreciation,
          assetData.depreciation_start_date
            ? new Date(assetData.depreciation_start_date)
                .toISOString()
                .split('T')[0]
            : existingAsset.depreciation_start_date,
          assetData.company_id || existingAsset.company_id,
          assetData.location_id || existingAsset.location_id,
          assetData.location_id || existingAsset.location_id,
          assetData.department_id || existingAsset.department_id,
          assetData.location_notes?.trim() || existingAsset.location_notes,
          assetData.warranty_months || existingAsset.warranty_months,
          assetData.condition || existingAsset.condition,
          assetData.maintenance_schedule || existingAsset.maintenance_schedule,
          assetData.status || existingAsset.status,
          assetData.is_old_unit || existingAsset.is_old_unit,
          userId,
        ]
      )) as any[];

      const updatedAsset = rows[0][0];
      return updatedAsset;
    } catch (error) {
      logger.error('AssetRepository.updateAsset failed:', error);
      throw new AppError('Failed to update asset', 500);
    }
  }

  /**
   * Get asset assignments
   */
  async getAssetAssignments(assetId: string): Promise<any[]> {
    try {
      const [rowsResult] = (await pool.execute(
        'CALL sp_get_assignments_by_asset_id(?)',
        [assetId]
      )) as any[];

      const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;

      return rows.map((row: any) => ({
        assignmentID: row.assignmentID,
        asset_id: row.asset_id,
        user_id: row.user_id,
        user: row.first_name
          ? {
              id: row.user_id,
              name: `${row.first_name} ${row.last_name}`,
              email: row.email,
              employee_number: row.employee_number,
              position: row.position,
            }
          : null,
        department_id: row.department_id,
        department: row.department_name,
        location_id: row.location_id,
        location: row.location_name
          ? `${row.location_name}${row.room_name ? ` - ${row.room_name}` : ''}`
          : null,
        location_room_id: row.location_room_id,
        assigned_date: row.assigned_date,
        actual_return_date: row.actual_return_date,
        status: row.status,
        assigned_by: row.assigned_by,
        assignment_notes: row.assignment_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      logger.error('AssetRepository.getAssetAssignments failed:', error);
      throw new AppError('Failed to fetch asset assignments', 500);
    }
  }

  /**
   * Get asset documents
   */
  async getAssetDocuments(assetId: string): Promise<any[]> {
    try {
      const [rowsResult] = (await pool.execute(
        'CALL sp_get_asset_documents(?)',
        [assetId]
      )) as any[];

      const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;

      return rows.map((row: any) => ({
        documentID: row.documentID,
        asset_id: row.asset_id,
        file_name: row.file_name,
        file_url: row.file_url,
        file_size: row.file_size,
        file_type: row.file_type,
        created_at: row.created_at,
      }));
    } catch (error) {
      logger.error('AssetRepository.getAssetDocuments failed:', error);
      throw new AppError('Failed to fetch asset documents', 500);
    }
  }
}

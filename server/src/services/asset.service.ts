import { pool } from '../db.js';
import logger from '../logger.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../middleware/enhancedErrorHandling.js';
import { AssetRepository } from '../repositories/AssetRepository.js';

export class AssetService {
  private assetRepository: AssetRepository;

  constructor() {
    this.assetRepository = new AssetRepository();
  }
  /**
   * Get all assets with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 10, filters: any = {}) {
    try {
      return await this.assetRepository.getAllAssets(page, limit, filters);
    } catch (error) {
      logger.error('AssetService.getAll failed:', error);
      throw new AppError('Failed to fetch assets', 500);
    }
  }

  /**
   * Get asset by ID
   */
  async getById(assetId: string) {
    try {
      const asset = await this.assetRepository.getAssetById(assetId);
      if (!asset) {
        throw new NotFoundError(`Asset with ID ${assetId} not found`);
      }
      return asset;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('AssetService.getById failed:', error);
      throw new AppError('Failed to fetch asset', 500);
    }
  }

  /**
   * Create new asset
   */
  async create(assetData: any, userId: string) {
    try {
      // Validate required fields
      if (!assetData.name || !assetData.category_id) {
        throw new ValidationError('Name and category are required');
      }

      // Validate foreign keys
      await this.validateForeignKeys(assetData);

      return await this.assetRepository.createAsset(assetData, userId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('AssetService.create failed:', error);
      throw new AppError('Failed to create asset', 500);
    }
  }

  /**
   * Update asset
   */
  async update(assetId: string, assetData: any, userId: string) {
    try {
      // Check if asset exists
      const existingAsset = await this.getById(assetId);
      if (!existingAsset) {
        throw new NotFoundError(`Asset with ID ${assetId} not found`);
      }

      // Validate foreign keys
      await this.validateForeignKeys(assetData);

      return await this.assetRepository.updateAsset(assetId, assetData, userId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('AssetService.update failed:', error);
      throw new AppError('Failed to update asset', 500);
    }
  }

  /**
   * Delete asset (soft delete)
   */
  async delete(assetId: string, userId: string) {
    try {
      const [rows] = (await pool.execute(`CALL sp_delete_asset(?, ?)`, [
        assetId,
        userId,
      ])) as any[];

      if (rows[0][0].affected_rows === 0) {
        throw new NotFoundError(`Asset with ID ${assetId} not found`);
      }

      return { message: 'Asset deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('AssetService.delete failed:', error);
      throw new AppError('Failed to delete asset', 500);
    }
  }

  /**
   * Validate foreign key relationships
   */
  private async validateForeignKeys(assetData: any) {
    const validations = [];

    if (assetData.company_id) {
      validations.push(
        pool
          .execute(
            'SELECT companyID FROM companies WHERE companyID = ? AND deleted_at IS NULL',
            [assetData.company_id]
          )
          .then(([rows]: any) => {
            if (rows.length === 0) {
              throw new ValidationError('Invalid company ID');
            }
          })
      );
    }

    if (assetData.location_id) {
      validations.push(
        pool
          .execute(
            'SELECT locationID FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
            [assetData.location_id]
          )
          .then(([rows]: any) => {
            if (rows.length === 0) {
              throw new ValidationError('Invalid location ID');
            }
          })
      );
    }

    if (assetData.location_room_id) {
      validations.push(
        pool
          .execute(
            'SELECT roomID FROM asset_mngmnt_location_rooms WHERE roomID = ? AND deleted_at IS NULL',
            [assetData.location_room_id]
          )
          .then(([rows]: any) => {
            if (rows.length === 0) {
              throw new ValidationError('Invalid location room ID');
            }
          })
      );
    }

    if (assetData.department_id) {
      validations.push(
        pool
          .execute(
            'SELECT departmentID FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL',
            [assetData.department_id]
          )
          .then(([rows]: any) => {
            if (rows.length === 0) {
              throw new ValidationError('Invalid department ID');
            }
          })
      );
    }

    if (assetData.category_id) {
      validations.push(
        pool
          .execute(
            'SELECT categoryID FROM asset_categories WHERE categoryID = ? AND deleted_at IS NULL',
            [assetData.category_id]
          )
          .then(([rows]: any) => {
            if (rows.length === 0) {
              throw new ValidationError('Invalid category ID');
            }
          })
      );
    }

    await Promise.all(validations);
  }

  /**
   * Get asset assignments
   */
  async getAssignments(assetId: string) {
    try {
      return await this.assetRepository.getAssetAssignments(assetId);
    } catch (error) {
      logger.error('AssetService.getAssignments failed:', error);
      throw new AppError('Failed to fetch asset assignments', 500);
    }
  }

  /**
   * Get asset documents
   */
  async getDocuments(assetId: string) {
    try {
      return await this.assetRepository.getAssetDocuments(assetId);
    } catch (error) {
      logger.error('AssetService.getDocuments failed:', error);
      throw new AppError('Failed to fetch asset documents', 500);
    }
  }
}

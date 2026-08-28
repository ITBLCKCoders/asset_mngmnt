import { AssetBuilder, AssetBuilderModel } from '../models/assetBuilder.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class AssetBuilderService {
  static async getAssetBuilders(): Promise<AssetBuilder[]> {
    try {
      logger.info('Fetching all asset builders from database');
      const builders = await AssetBuilderModel.findAll();
      logger.info(`Found ${builders.length} asset builders`);
      return builders;
    } catch (error) {
      logger.error('Error fetching asset builders:', error);
      throw new Error('Failed to fetch asset builders');
    }
  }

  static async getAssetBuilderById(
    assetBuilderID: string
  ): Promise<AssetBuilder | null> {
    try {
      logger.info(`Fetching asset builder by ID: ${assetBuilderID}`);
      const builder = await AssetBuilderModel.findById(assetBuilderID);

      if (builder) {
        logger.info(`Found asset builder: ${builder.name}`);
        return builder;
      }

      logger.warn(`Asset builder not found: ${assetBuilderID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching asset builder ${assetBuilderID}:`, error);
      throw new Error('Failed to fetch asset builder');
    }
  }

  static async getAssetBuilderByName(
    name: string
  ): Promise<AssetBuilder | null> {
    try {
      logger.info(`Fetching asset builder by name: ${name}`);
      const builder = await AssetBuilderModel.findByName(name);

      if (builder) {
        logger.info(`Found asset builder: ${builder.name}`);
        return builder;
      }

      logger.warn(`Asset builder not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching asset builder ${name}:`, error);
      throw new Error('Failed to fetch asset builder');
    }
  }

  static async createAssetBuilder(
    builderData: Partial<AssetBuilder>,
    userId: string
  ): Promise<AssetBuilder | null> {
    try {
      logger.info('Creating new asset builder:', { name: builderData.name });

      // Validate required fields
      if (!builderData.name) {
        throw new Error('Asset builder name is required');
      }

      // Check if asset builder with the same name already exists
      const existingBuilder = await AssetBuilderModel.findByName(
        builderData.name
      );
      if (existingBuilder) {
        throw new Error('Asset builder with this name already exists');
      }

      // Create the asset builder
      const newBuilder = await AssetBuilderModel.create(builderData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Asset Builder',
        resourceType: 'asset-builder',
        resourceId: newBuilder?.assetBuilderID || '',
        resourceName: newBuilder?.name || '',
        details: `Created asset builder: ${newBuilder?.name}`,
        newValues: {
          name: newBuilder?.name,
          description: newBuilder?.description,
          status: newBuilder?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Asset builder created successfully: ${newBuilder?.assetBuilderID}`
      );
      return newBuilder;
    } catch (error) {
      logger.error('Error creating asset builder:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create asset builder');
    }
  }

  static async updateAssetBuilder(
    assetBuilderID: string,
    builderData: Partial<AssetBuilder>,
    userId: string
  ): Promise<AssetBuilder | null> {
    try {
      logger.info(`Updating asset builder: ${assetBuilderID}`);

      // Check if asset builder exists
      const existingBuilder = await AssetBuilderModel.findById(assetBuilderID);

      if (!existingBuilder) {
        throw new Error('Asset builder not found');
      }

      // Check if asset builder name already exists for another builder
      if (builderData.name) {
        const existingBuilderByName = await AssetBuilderModel.findByName(
          builderData.name
        );
        if (
          existingBuilderByName &&
          existingBuilderByName.assetBuilderID !== assetBuilderID
        ) {
          throw new Error('Asset builder with this name already exists');
        }
      }

      // Update the asset builder
      const updatedBuilder = await AssetBuilderModel.update(
        assetBuilderID,
        builderData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Asset Builder',
        resourceType: 'asset-builder',
        resourceId: existingBuilder.assetBuilderID,
        resourceName: existingBuilder.name,
        details: 'Updated asset builder details',
        oldValues: {
          name: existingBuilder.name,
          description: existingBuilder.description,
          status: existingBuilder.status,
        },
        newValues: {
          name: updatedBuilder?.name,
          description: updatedBuilder?.description,
          status: updatedBuilder?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Asset builder updated successfully: ${assetBuilderID}`);
      return updatedBuilder;
    } catch (error) {
      logger.error(`Error updating asset builder ${assetBuilderID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update asset builder');
    }
  }

  static async deleteAssetBuilder(
    assetBuilderID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting asset builder: ${assetBuilderID}`);

      // Check if asset builder exists
      const existingBuilder = await AssetBuilderModel.findById(assetBuilderID);

      if (!existingBuilder) {
        throw new Error('Asset builder not found');
      }

      await AssetBuilderModel.delete(assetBuilderID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Asset Builder',
        resourceType: 'asset-builder',
        resourceId: existingBuilder.assetBuilderID,
        resourceName: existingBuilder.name,
        details: `Deleted asset builder: ${existingBuilder.name}`,
        oldValues: {
          name: existingBuilder.name,
          description: existingBuilder.description,
          status: existingBuilder.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Asset builder deleted successfully: ${assetBuilderID}`);
    } catch (error) {
      logger.error(`Error deleting asset builder ${assetBuilderID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete asset builder');
    }
  }
}

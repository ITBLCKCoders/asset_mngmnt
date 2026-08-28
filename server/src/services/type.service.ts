import { Type, TypeModel } from '../models/type.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class TypeService {
  static async getTypes(): Promise<Type[]> {
    try {
      logger.info('Fetching all types from database');
      const types = await TypeModel.findAll();
      logger.info(`Found ${types.length} types`);
      return types;
    } catch (error) {
      logger.error('Error fetching types:', error);
      throw new Error('Failed to fetch types');
    }
  }

  static async getTypeById(typeID: string): Promise<Type | null> {
    try {
      logger.info(`Fetching type by ID: ${typeID}`);
      const type = await TypeModel.findById(typeID);

      if (type) {
        logger.info(`Found type: ${type.name}`);
        return type;
      }

      logger.warn(`Type not found: ${typeID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching type ${typeID}:`, error);
      throw new Error('Failed to fetch type');
    }
  }

  static async getTypeByName(name: string): Promise<Type | null> {
    try {
      logger.info(`Fetching type by name: ${name}`);
      const type = await TypeModel.findByName(name);

      if (type) {
        logger.info(`Found type: ${type.name}`);
        return type;
      }

      logger.warn(`Type not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching type ${name}:`, error);
      throw new Error('Failed to fetch type');
    }
  }

  static async createType(
    typeData: Partial<Type>,
    userId: string
  ): Promise<Type | null> {
    try {
      logger.info('Creating new type:', { name: typeData.name });

      // Validate required fields
      if (!typeData.name || !typeData.category_id) {
        throw new Error('Type name and category are required');
      }

      // Check if type already exists
      const existingType = await TypeModel.findByName(typeData.name);
      if (existingType) {
        throw new Error('Type with this name already exists');
      }

      // Create the type
      const newType = await TypeModel.create(typeData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Type',
        resourceType: 'type',
        resourceId: newType?.typeID || '',
        resourceName: newType?.name || '',
        details: `Created new type ${newType?.name}`,
        newValues: {
          name: newType?.name,
          description: newType?.description,
          category_id: newType?.category_id,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Type created successfully: ${newType?.typeID}`);
      return newType;
    } catch (error) {
      logger.error('Error creating type:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create type');
    }
  }

  static async updateType(
    typeID: string,
    typeData: Partial<Type>,
    userId: string
  ): Promise<Type | null> {
    try {
      logger.info(`Updating type: ${typeID}`);

      // Check if type exists
      const existingType = await TypeModel.findById(typeID);

      if (!existingType) {
        throw new Error('Type not found');
      }

      // Check if type name already exists for a different type
      if (typeData.name) {
        const existingTypeByName = await TypeModel.findByName(typeData.name);
        if (existingTypeByName && existingTypeByName.typeID !== typeID) {
          throw new Error('Type with this name already exists');
        }
      }

      // Update the type
      const updatedType = await TypeModel.update(typeID, typeData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Type',
        resourceType: 'type',
        resourceId: existingType.typeID,
        resourceName: existingType.name,
        details: 'Updated type details',
        oldValues: {
          name: existingType.name,
          description: existingType.description,
          category_id: existingType.category_id,
        },
        newValues: {
          name: updatedType?.name,
          description: updatedType?.description,
          category_id: updatedType?.category_id,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Type updated successfully: ${typeID}`);
      return updatedType;
    } catch (error) {
      logger.error(`Error updating type ${typeID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update type');
    }
  }

  static async deleteType(typeID: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting type: ${typeID}`);

      // Check if type exists
      const existingType = await TypeModel.findById(typeID);

      if (!existingType) {
        throw new Error('Type not found');
      }

      await TypeModel.delete(typeID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Type',
        resourceType: 'type',
        resourceId: existingType.typeID,
        resourceName: existingType.name,
        details: `Deleted type ${existingType.name}`,
        oldValues: {
          name: existingType.name,
          description: existingType.description,
          category_id: existingType.category_id,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Type deleted successfully: ${typeID}`);
    } catch (error) {
      logger.error(`Error deleting type ${typeID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete type');
    }
  }
}

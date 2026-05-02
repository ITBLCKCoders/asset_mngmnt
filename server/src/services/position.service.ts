import { Position, PositionModel } from '../models/position.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class PositionService {
  static async getPositions(): Promise<Position[]> {
    try {
      logger.info('Fetching all positions from database');
      const positions = await PositionModel.findAll();
      logger.info(`Found ${positions.length} positions`);
      return positions;
    } catch (error) {
      logger.error('Error fetching positions:', error);
      throw new Error('Failed to fetch positions');
    }
  }

  static async getPositionById(positionID: string): Promise<Position | null> {
    try {
      logger.info(`Fetching position by ID: ${positionID}`);
      const position = await PositionModel.findById(positionID);

      if (position) {
        logger.info(`Found position: ${position.name}`);
        return position;
      }

      logger.warn(`Position not found: ${positionID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching position ${positionID}:`, error);
      throw new Error('Failed to fetch position');
    }
  }

  static async getPositionByName(name: string): Promise<Position | null> {
    try {
      logger.info(`Fetching position by name: ${name}`);
      const position = await PositionModel.findByName(name);

      if (position) {
        logger.info(`Found position: ${position.name}`);
        return position;
      }

      logger.warn(`Position not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching position ${name}:`, error);
      throw new Error('Failed to fetch position');
    }
  }

  static async createPosition(
    positionData: Partial<Position>,
    userId: string
  ): Promise<Position | null> {
    try {
      logger.info('Creating new position:', { name: positionData.name });

      // Validate required fields
      if (!positionData.name) {
        throw new Error('Position name is required');
      }

      // Check if position with the same name already exists
      const existingPosition = await PositionModel.findByName(
        positionData.name
      );
      if (existingPosition) {
        throw new Error('Position with this name already exists');
      }

      // Create the position
      const newPosition = await PositionModel.create(positionData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Position',
        resourceType: 'position',
        resourceId: newPosition?.positionID || '',
        resourceName: newPosition?.name || '',
        details: `Created position: ${newPosition?.name}`,
        newValues: {
          name: newPosition?.name,
          description: newPosition?.description,
          status: newPosition?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Position created successfully: ${newPosition?.positionID}`);
      return newPosition;
    } catch (error) {
      logger.error('Error creating position:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create position');
    }
  }

  static async updatePosition(
    positionID: string,
    positionData: Partial<Position>,
    userId: string
  ): Promise<Position | null> {
    try {
      logger.info(`Updating position: ${positionID}`);

      // Check if position exists
      const existingPosition = await PositionModel.findById(positionID);

      if (!existingPosition) {
        throw new Error('Position not found');
      }

      // Check if position name already exists for another position
      if (positionData.name) {
        const existingPositionByName = await PositionModel.findByName(
          positionData.name
        );
        if (
          existingPositionByName &&
          existingPositionByName.positionID !== positionID
        ) {
          throw new Error('Position with this name already exists');
        }
      }

      // Update the position
      const updatedPosition = await PositionModel.update(
        positionID,
        positionData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Position',
        resourceType: 'position',
        resourceId: existingPosition.positionID,
        resourceName: existingPosition.name,
        details: 'Updated position details',
        oldValues: {
          name: existingPosition.name,
          description: existingPosition.description,
          status: existingPosition.status,
        },
        newValues: {
          name: updatedPosition?.name,
          description: updatedPosition?.description,
          status: updatedPosition?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Position updated successfully: ${positionID}`);
      return updatedPosition;
    } catch (error) {
      logger.error(`Error updating position ${positionID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update position');
    }
  }

  static async deletePosition(
    positionID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting position: ${positionID}`);

      // Check if position exists
      const existingPosition = await PositionModel.findById(positionID);

      if (!existingPosition) {
        throw new Error('Position not found');
      }

      await PositionModel.delete(positionID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Position',
        resourceType: 'position',
        resourceId: existingPosition.positionID,
        resourceName: existingPosition.name,
        details: `Deleted position: ${existingPosition.name}`,
        oldValues: {
          name: existingPosition.name,
          description: existingPosition.description,
          status: existingPosition.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Position deleted successfully: ${positionID}`);
    } catch (error) {
      logger.error(`Error deleting position ${positionID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete position');
    }
  }
}

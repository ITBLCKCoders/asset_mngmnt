import { Location, LocationModel } from '../models/location.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class LocationService {
  static async getLocations(): Promise<Location[]> {
    try {
      logger.info('Fetching all locations from database');
      const locations = await LocationModel.findAll();
      logger.info(`Found ${locations.length} locations`);
      return locations;
    } catch (error) {
      logger.error('Error fetching locations:', error);
      throw new Error('Failed to fetch locations');
    }
  }

  static async getLocationById(locationID: string): Promise<Location | null> {
    try {
      logger.info(`Fetching location by ID: ${locationID}`);
      const location = await LocationModel.findById(locationID);

      if (location) {
        logger.info(`Found location: ${location.name}`);
        return location;
      }

      logger.warn(`Location not found: ${locationID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching location ${locationID}:`, error);
      throw new Error('Failed to fetch location');
    }
  }

  static async getLocationByName(name: string): Promise<Location | null> {
    try {
      logger.info(`Fetching location by name: ${name}`);
      const location = await LocationModel.findByName(name);

      if (location) {
        logger.info(`Found location: ${location.name}`);
        return location;
      }

      logger.warn(`Location not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching location ${name}:`, error);
      throw new Error('Failed to fetch location');
    }
  }

  static async createLocation(
    locationData: Partial<Location>,
    userId: string
  ): Promise<Location | null> {
    try {
      logger.info('Creating new location:', { name: locationData.name });

      // Validate required fields
      if (!locationData.name) {
        throw new Error('Location name is required');
      }

      // Check if location already exists
      const existingLocation = await LocationModel.findByName(
        locationData.name
      );
      if (existingLocation) {
        throw new Error('Location with this name already exists');
      }

      // Create the location
      const newLocation = await LocationModel.create(locationData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Location',
        resourceType: 'location',
        resourceId: newLocation?.locationID || '',
        resourceName: newLocation?.name || '',
        details: `Created new location ${newLocation?.name}`,
        newValues: {
          name: newLocation?.name,
          description: newLocation?.description,
          address: newLocation?.address,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Location created successfully: ${newLocation?.locationID}`);
      return newLocation;
    } catch (error) {
      logger.error('Error creating location:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create location');
    }
  }

  static async updateLocation(
    locationID: string,
    locationData: Partial<Location>,
    userId: string
  ): Promise<Location | null> {
    try {
      logger.info(`Updating location: ${locationID}`);

      // Check if location exists
      const existingLocation = await LocationModel.findById(locationID);

      if (!existingLocation) {
        throw new Error('Location not found');
      }

      // Check if location name already exists for a different location
      if (locationData.name) {
        const existingLocationByName = await LocationModel.findByName(
          locationData.name
        );
        if (
          existingLocationByName &&
          existingLocationByName.locationID !== locationID
        ) {
          throw new Error('Location with this name already exists');
        }
      }

      // Update the location
      const updatedLocation = await LocationModel.update(
        locationID,
        locationData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Location',
        resourceType: 'location',
        resourceId: existingLocation.locationID,
        resourceName: existingLocation.name,
        details: 'Updated location details',
        oldValues: {
          name: existingLocation.name,
          description: existingLocation.description,
          address: existingLocation.address,
        },
        newValues: {
          name: updatedLocation?.name,
          description: updatedLocation?.description,
          address: updatedLocation?.address,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Location updated successfully: ${locationID}`);
      return updatedLocation;
    } catch (error) {
      logger.error(`Error updating location ${locationID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update location');
    }
  }

  static async deleteLocation(
    locationID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting location: ${locationID}`);

      // Check if location exists
      const existingLocation = await LocationModel.findById(locationID);

      if (!existingLocation) {
        throw new Error('Location not found');
      }

      await LocationModel.delete(locationID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Location',
        resourceType: 'location',
        resourceId: existingLocation.locationID,
        resourceName: existingLocation.name,
        details: `Deleted location ${existingLocation.name}`,
        oldValues: {
          name: existingLocation.name,
          description: existingLocation.description,
          address: existingLocation.address,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Location deleted successfully: ${locationID}`);
    } catch (error) {
      logger.error(`Error deleting location ${locationID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete location');
    }
  }
}

import { Permission, PermissionModel } from '../models/permission.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class PermissionService {
  static async getPermissions(): Promise<Permission[]> {
    try {
      logger.info('Fetching all permissions from database');
      const permissions = await PermissionModel.findAll();
      logger.info(`Found ${permissions.length} permissions`);
      return permissions;
    } catch (error) {
      logger.error('Error fetching permissions:', error);
      throw new Error('Failed to fetch permissions');
    }
  }

  static async getPermissionById(
    permissionID: string
  ): Promise<Permission | null> {
    try {
      logger.info(`Fetching permission by ID: ${permissionID}`);
      const permission = await PermissionModel.findById(permissionID);

      if (permission) {
        logger.info(`Found permission: ${permission.name}`);
        return permission;
      }

      logger.warn(`Permission not found: ${permissionID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching permission ${permissionID}:`, error);
      throw new Error('Failed to fetch permission');
    }
  }

  static async getPermissionByName(name: string): Promise<Permission | null> {
    try {
      logger.info(`Fetching permission by name: ${name}`);
      const permission = await PermissionModel.findByName(name);

      if (permission) {
        logger.info(`Found permission: ${permission.name}`);
        return permission;
      }

      logger.warn(`Permission not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching permission ${name}:`, error);
      throw new Error('Failed to fetch permission');
    }
  }

  static async createPermission(
    permissionData: Partial<Permission>,
    userId: string
  ): Promise<Permission | null> {
    try {
      logger.info('Creating new permission:', { name: permissionData.name });

      // Validate required fields
      if (!permissionData.name) {
        throw new Error('Permission name is required');
      }

      // Check if permission with the same name already exists
      const existingPermission = await PermissionModel.findByName(
        permissionData.name
      );
      if (existingPermission) {
        throw new Error('Permission with this name already exists');
      }

      // Create the permission
      const newPermission = await PermissionModel.create(
        permissionData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Permission',
        resourceType: 'permission',
        resourceId: newPermission?.permissionID || '',
        resourceName: newPermission?.name || '',
        details: `Created permission: ${newPermission?.name}`,
        newValues: {
          name: newPermission?.name,
          description: newPermission?.description,
          status: newPermission?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Permission created successfully: ${newPermission?.permissionID}`
      );
      return newPermission;
    } catch (error) {
      logger.error('Error creating permission:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create permission');
    }
  }

  static async updatePermission(
    permissionID: string,
    permissionData: Partial<Permission>,
    userId: string
  ): Promise<Permission | null> {
    try {
      logger.info(`Updating permission: ${permissionID}`);

      // Check if permission exists
      const existingPermission = await PermissionModel.findById(permissionID);

      if (!existingPermission) {
        throw new Error('Permission not found');
      }

      // Check if permission name already exists for another permission
      if (permissionData.name) {
        const existingPermissionByName = await PermissionModel.findByName(
          permissionData.name
        );
        if (
          existingPermissionByName &&
          existingPermissionByName.permissionID !== permissionID
        ) {
          throw new Error('Permission with this name already exists');
        }
      }

      // Update the permission
      const updatedPermission = await PermissionModel.update(
        permissionID,
        permissionData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Permission',
        resourceType: 'permission',
        resourceId: existingPermission.permissionID,
        resourceName: existingPermission.name,
        details: 'Updated permission details',
        oldValues: {
          name: existingPermission.name,
          description: existingPermission.description,
          status: existingPermission.status,
        },
        newValues: {
          name: updatedPermission?.name,
          description: updatedPermission?.description,
          status: updatedPermission?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Permission updated successfully: ${permissionID}`);
      return updatedPermission;
    } catch (error) {
      logger.error(`Error updating permission ${permissionID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update permission');
    }
  }

  static async deletePermission(
    permissionID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting permission: ${permissionID}`);

      // Check if permission exists
      const existingPermission = await PermissionModel.findById(permissionID);

      if (!existingPermission) {
        throw new Error('Permission not found');
      }

      await PermissionModel.delete(permissionID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Permission',
        resourceType: 'permission',
        resourceId: existingPermission.permissionID,
        resourceName: existingPermission.name,
        details: `Deleted permission: ${existingPermission.name}`,
        oldValues: {
          name: existingPermission.name,
          description: existingPermission.description,
          status: existingPermission.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Permission deleted successfully: ${permissionID}`);
    } catch (error) {
      logger.error(`Error deleting permission ${permissionID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete permission');
    }
  }
}

import { Role, RoleModel } from '../models/role.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class RoleService {
  static async getRoles(): Promise<Role[]> {
    try {
      logger.info('Fetching all roles from database');
      const roles = await RoleModel.findAll();
      logger.info(`Found ${roles.length} roles`);
      return roles;
    } catch (error) {
      logger.error('Error fetching roles:', error);
      throw new Error('Failed to fetch roles');
    }
  }

  static async getRoleById(roleID: string): Promise<Role | null> {
    try {
      logger.info(`Fetching role by ID: ${roleID}`);
      const role = await RoleModel.findById(roleID);

      if (role) {
        logger.info(`Found role: ${role.name}`);
        return role;
      }

      logger.warn(`Role not found: ${roleID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching role ${roleID}:`, error);
      throw new Error('Failed to fetch role');
    }
  }

  static async getRoleByName(name: string): Promise<Role | null> {
    try {
      logger.info(`Fetching role by name: ${name}`);
      const role = await RoleModel.findByName(name);

      if (role) {
        logger.info(`Found role: ${role.name}`);
        return role;
      }

      logger.warn(`Role not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching role ${name}:`, error);
      throw new Error('Failed to fetch role');
    }
  }

  static async createRole(
    roleData: Partial<Role>,
    userId: string
  ): Promise<Role | null> {
    try {
      logger.info('Creating new role:', { name: roleData.name });

      // Validate required fields
      if (!roleData.name) {
        throw new Error('Role name is required');
      }

      // Check if role with the same name already exists
      const existingRole = await RoleModel.findByName(roleData.name);
      if (existingRole) {
        throw new Error('Role with this name already exists');
      }

      // Create the role
      const newRole = await RoleModel.create(roleData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Role',
        resourceType: 'role',
        resourceId: newRole?.roleID || '',
        resourceName: newRole?.name || '',
        details: `Created role: ${newRole?.name}`,
        newValues: {
          name: newRole?.name,
          description: newRole?.description,
          status: newRole?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Role created successfully: ${newRole?.roleID}`);
      return newRole;
    } catch (error) {
      logger.error('Error creating role:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create role');
    }
  }

  static async updateRole(
    roleID: string,
    roleData: Partial<Role>,
    userId: string
  ): Promise<Role | null> {
    try {
      logger.info(`Updating role: ${roleID}`);

      // Check if role exists
      const existingRole = await RoleModel.findById(roleID);

      if (!existingRole) {
        throw new Error('Role not found');
      }

      // Check if role name already exists for another role
      if (roleData.name) {
        const existingRoleByName = await RoleModel.findByName(roleData.name);
        if (existingRoleByName && existingRoleByName.roleID !== roleID) {
          throw new Error('Role with this name already exists');
        }
      }

      // Update the role
      const updatedRole = await RoleModel.update(roleID, roleData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Role',
        resourceType: 'role',
        resourceId: existingRole.roleID,
        resourceName: existingRole.name,
        details: 'Updated role details',
        oldValues: {
          name: existingRole.name,
          description: existingRole.description,
          status: existingRole.status,
        },
        newValues: {
          name: updatedRole?.name,
          description: updatedRole?.description,
          status: updatedRole?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Role updated successfully: ${roleID}`);
      return updatedRole;
    } catch (error) {
      logger.error(`Error updating role ${roleID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update role');
    }
  }

  static async deleteRole(roleID: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting role: ${roleID}`);

      // Check if role exists
      const existingRole = await RoleModel.findById(roleID);

      if (!existingRole) {
        throw new Error('Role not found');
      }

      await RoleModel.delete(roleID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Role',
        resourceType: 'role',
        resourceId: existingRole.roleID,
        resourceName: existingRole.name,
        details: `Deleted role: ${existingRole.name}`,
        oldValues: {
          name: existingRole.name,
          description: existingRole.description,
          status: existingRole.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Role deleted successfully: ${roleID}`);
    } catch (error) {
      logger.error(`Error deleting role ${roleID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete role');
    }
  }
}

import { Department, DepartmentModel } from '../models/department.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class DepartmentService {
  static async getDepartments(): Promise<Department[]> {
    try {
      logger.info('Fetching all departments from database');
      const departments = await DepartmentModel.findAll();
      logger.info(`Found ${departments.length} departments`);
      return departments;
    } catch (error) {
      logger.error('Error fetching departments:', error);
      throw new Error('Failed to fetch departments');
    }
  }

  static async getDepartmentById(
    departmentID: string
  ): Promise<Department | null> {
    try {
      logger.info(`Fetching department by ID: ${departmentID}`);
      const department = await DepartmentModel.findById(departmentID);

      if (department) {
        logger.info(`Found department: ${department.name}`);
        return department;
      }

      logger.warn(`Department not found: ${departmentID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching department ${departmentID}:`, error);
      throw new Error('Failed to fetch department');
    }
  }

  static async getDepartmentByName(name: string): Promise<Department | null> {
    try {
      logger.info(`Fetching department by name: ${name}`);
      const department = await DepartmentModel.findByName(name);

      if (department) {
        logger.info(`Found department: ${department.name}`);
        return department;
      }

      logger.warn(`Department not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching department ${name}:`, error);
      throw new Error('Failed to fetch department');
    }
  }

  static async createDepartment(
    departmentData: Partial<Department>,
    userId: string
  ): Promise<Department | null> {
    try {
      logger.info('Creating new department:', { name: departmentData.name });

      // Validate required fields
      if (!departmentData.name) {
        throw new Error('Department name is required');
      }

      // Check if department already exists
      const existingDepartment = await DepartmentModel.findByName(
        departmentData.name
      );
      if (existingDepartment) {
        throw new Error('Department with this name already exists');
      }

      // Create the department
      const newDepartment = await DepartmentModel.create(
        departmentData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Department',
        resourceType: 'department',
        resourceId: newDepartment?.departmentID || '',
        resourceName: newDepartment?.name || '',
        details: `Created new department ${newDepartment?.name}`,
        newValues: {
          name: newDepartment?.name,
          description: newDepartment?.description,
          manager_id: newDepartment?.manager_id,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Department created successfully: ${newDepartment?.departmentID}`
      );
      return newDepartment;
    } catch (error) {
      logger.error('Error creating department:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create department');
    }
  }

  static async updateDepartment(
    departmentID: string,
    departmentData: Partial<Department>,
    userId: string
  ): Promise<Department | null> {
    try {
      logger.info(`Updating department: ${departmentID}`);

      // Check if department exists
      const existingDepartment = await DepartmentModel.findById(departmentID);

      if (!existingDepartment) {
        throw new Error('Department not found');
      }

      // Check if department name already exists for a different department
      if (departmentData.name) {
        const existingDepartmentByName = await DepartmentModel.findByName(
          departmentData.name
        );
        if (
          existingDepartmentByName &&
          existingDepartmentByName.departmentID !== departmentID
        ) {
          throw new Error('Department with this name already exists');
        }
      }

      // Update the department
      const updatedDepartment = await DepartmentModel.update(
        departmentID,
        departmentData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Department',
        resourceType: 'department',
        resourceId: existingDepartment.departmentID,
        resourceName: existingDepartment.name,
        details: 'Updated department details',
        oldValues: {
          name: existingDepartment.name,
          description: existingDepartment.description,
          manager_id: existingDepartment.manager_id,
        },
        newValues: {
          name: updatedDepartment?.name,
          description: updatedDepartment?.description,
          manager_id: updatedDepartment?.manager_id,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Department updated successfully: ${departmentID}`);
      return updatedDepartment;
    } catch (error) {
      logger.error(`Error updating department ${departmentID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update department');
    }
  }

  static async deleteDepartment(
    departmentID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting department: ${departmentID}`);

      // Check if department exists
      const existingDepartment = await DepartmentModel.findById(departmentID);

      if (!existingDepartment) {
        throw new Error('Department not found');
      }

      await DepartmentModel.delete(departmentID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Department',
        resourceType: 'department',
        resourceId: existingDepartment.departmentID,
        resourceName: existingDepartment.name,
        details: `Deleted department ${existingDepartment.name}`,
        oldValues: {
          name: existingDepartment.name,
          description: existingDepartment.description,
          manager_id: existingDepartment.manager_id,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Department deleted successfully: ${departmentID}`);
    } catch (error) {
      logger.error(`Error deleting department ${departmentID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete department');
    }
  }
}

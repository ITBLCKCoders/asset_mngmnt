import { Supplier, SupplierModel } from '../models/supplier.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class SupplierService {
  static async getSuppliers(): Promise<Supplier[]> {
    try {
      logger.info('Fetching all suppliers from database');
      const suppliers = await SupplierModel.findAll();
      logger.info(`Found ${suppliers.length} suppliers`);
      return suppliers;
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }
  }

  static async getSupplierById(supplierID: string): Promise<Supplier | null> {
    try {
      logger.info(`Fetching supplier by ID: ${supplierID}`);
      const supplier = await SupplierModel.findById(supplierID);

      if (supplier) {
        logger.info(`Found supplier: ${supplier.name}`);
        return supplier;
      }

      logger.warn(`Supplier not found: ${supplierID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching supplier ${supplierID}:`, error);
      throw new Error('Failed to fetch supplier');
    }
  }

  static async getSupplierByName(name: string): Promise<Supplier | null> {
    try {
      logger.info(`Fetching supplier by name: ${name}`);
      const supplier = await SupplierModel.findByName(name);

      if (supplier) {
        logger.info(`Found supplier: ${supplier.name}`);
        return supplier;
      }

      logger.warn(`Supplier not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching supplier ${name}:`, error);
      throw new Error('Failed to fetch supplier');
    }
  }

  static async createSupplier(
    supplierData: Partial<Supplier>,
    userId: string
  ): Promise<Supplier | null> {
    try {
      logger.info('Creating new supplier:', { name: supplierData.name });

      // Validate required fields
      if (!supplierData.name) {
        throw new Error('Supplier name is required');
      }

      // Check if supplier with the same name already exists
      const existingSupplier = await SupplierModel.findByName(
        supplierData.name
      );
      if (existingSupplier) {
        throw new Error('Supplier with this name already exists');
      }

      // Create the supplier
      const newSupplier = await SupplierModel.create(supplierData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Supplier',
        resourceType: 'supplier',
        resourceId: newSupplier?.supplierID || '',
        resourceName: newSupplier?.name || '',
        details: `Created supplier: ${newSupplier?.name}`,
        newValues: {
          name: newSupplier?.name,
          description: newSupplier?.description,
          status: newSupplier?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Supplier created successfully: ${newSupplier?.supplierID}`);
      return newSupplier;
    } catch (error) {
      logger.error('Error creating supplier:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create supplier');
    }
  }

  static async updateSupplier(
    supplierID: string,
    supplierData: Partial<Supplier>,
    userId: string
  ): Promise<Supplier | null> {
    try {
      logger.info(`Updating supplier: ${supplierID}`);

      // Check if supplier exists
      const existingSupplier = await SupplierModel.findById(supplierID);

      if (!existingSupplier) {
        throw new Error('Supplier not found');
      }

      // Check if supplier name already exists for another supplier
      if (supplierData.name) {
        const existingSupplierByName = await SupplierModel.findByName(
          supplierData.name
        );
        if (
          existingSupplierByName &&
          existingSupplierByName.supplierID !== supplierID
        ) {
          throw new Error('Supplier with this name already exists');
        }
      }

      // Update the supplier
      const updatedSupplier = await SupplierModel.update(
        supplierID,
        supplierData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Supplier',
        resourceType: 'supplier',
        resourceId: existingSupplier.supplierID,
        resourceName: existingSupplier.name,
        details: 'Updated supplier details',
        oldValues: {
          name: existingSupplier.name,
          description: existingSupplier.description,
          status: existingSupplier.status,
        },
        newValues: {
          name: updatedSupplier?.name,
          description: updatedSupplier?.description,
          status: updatedSupplier?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Supplier updated successfully: ${supplierID}`);
      return updatedSupplier;
    } catch (error) {
      logger.error(`Error updating supplier ${supplierID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update supplier');
    }
  }

  static async deleteSupplier(
    supplierID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting supplier: ${supplierID}`);

      // Check if supplier exists
      const existingSupplier = await SupplierModel.findById(supplierID);

      if (!existingSupplier) {
        throw new Error('Supplier not found');
      }

      await SupplierModel.delete(supplierID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Supplier',
        resourceType: 'supplier',
        resourceId: existingSupplier.supplierID,
        resourceName: existingSupplier.name,
        details: `Deleted supplier: ${existingSupplier.name}`,
        oldValues: {
          name: existingSupplier.name,
          description: existingSupplier.description,
          status: existingSupplier.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Supplier deleted successfully: ${supplierID}`);
    } catch (error) {
      logger.error(`Error deleting supplier ${supplierID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete supplier');
    }
  }
}

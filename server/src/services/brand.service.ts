import { Brand, BrandModel } from '../models/brand.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class BrandService {
  static async getBrands(): Promise<Brand[]> {
    try {
      logger.info('Fetching all brands from database');
      const brands = await BrandModel.findAll();
      logger.info(`Found ${brands.length} brands`);
      return brands;
    } catch (error) {
      logger.error('Error fetching brands:', error);
      throw new Error('Failed to fetch brands');
    }
  }

  static async getBrandById(brandID: string): Promise<Brand | null> {
    try {
      logger.info(`Fetching brand by ID: ${brandID}`);
      const brand = await BrandModel.findById(brandID);

      if (brand) {
        logger.info(`Found brand: ${brand.name}`);
        return brand;
      }

      logger.warn(`Brand not found: ${brandID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching brand ${brandID}:`, error);
      throw new Error('Failed to fetch brand');
    }
  }

  static async getBrandByName(name: string): Promise<Brand | null> {
    try {
      logger.info(`Fetching brand by name: ${name}`);
      const brand = await BrandModel.findByName(name);

      if (brand) {
        logger.info(`Found brand: ${brand.name}`);
        return brand;
      }

      logger.warn(`Brand not found: ${name}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching brand ${name}:`, error);
      throw new Error('Failed to fetch brand');
    }
  }

  static async createBrand(
    brandData: Partial<Brand>,
    userId: string
  ): Promise<Brand | null> {
    try {
      logger.info('Creating new brand:', { name: brandData.name });

      // Validate required fields
      if (!brandData.name) {
        throw new Error('Brand name is required');
      }

      // Check if brand with the same name already exists
      const existingBrand = await BrandModel.findByName(brandData.name);
      if (existingBrand) {
        throw new Error('Brand with this name already exists');
      }

      // Create the brand
      const newBrand = await BrandModel.create(brandData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Brand',
        resourceType: 'brand',
        resourceId: newBrand?.brandID || '',
        resourceName: newBrand?.name || '',
        details: `Created brand: ${newBrand?.name}`,
        newValues: {
          name: newBrand?.name,
          description: newBrand?.description,
          status: newBrand?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Brand created successfully: ${newBrand?.brandID}`);
      return newBrand;
    } catch (error) {
      logger.error('Error creating brand:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create brand');
    }
  }

  static async updateBrand(
    brandID: string,
    brandData: Partial<Brand>,
    userId: string
  ): Promise<Brand | null> {
    try {
      logger.info(`Updating brand: ${brandID}`);

      // Check if brand exists
      const existingBrand = await BrandModel.findById(brandID);

      if (!existingBrand) {
        throw new Error('Brand not found');
      }

      // Check if brand name already exists for another brand
      if (brandData.name) {
        const existingBrandByName = await BrandModel.findByName(brandData.name);
        if (existingBrandByName && existingBrandByName.brandID !== brandID) {
          throw new Error('Brand with this name already exists');
        }
      }

      // Update the brand
      const updatedBrand = await BrandModel.update(brandID, brandData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Brand',
        resourceType: 'brand',
        resourceId: existingBrand.brandID,
        resourceName: existingBrand.name,
        details: 'Updated brand details',
        oldValues: {
          name: existingBrand.name,
          description: existingBrand.description,
          status: existingBrand.status,
        },
        newValues: {
          name: updatedBrand?.name,
          description: updatedBrand?.description,
          status: updatedBrand?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Brand updated successfully: ${brandID}`);
      return updatedBrand;
    } catch (error) {
      logger.error(`Error updating brand ${brandID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update brand');
    }
  }

  static async deleteBrand(brandID: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting brand: ${brandID}`);

      // Check if brand exists
      const existingBrand = await BrandModel.findById(brandID);

      if (!existingBrand) {
        throw new Error('Brand not found');
      }

      await BrandModel.delete(brandID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Brand',
        resourceType: 'brand',
        resourceId: existingBrand.brandID,
        resourceName: existingBrand.name,
        details: `Deleted brand: ${existingBrand.name}`,
        oldValues: {
          name: existingBrand.name,
          description: existingBrand.description,
          status: existingBrand.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Brand deleted successfully: ${brandID}`);
    } catch (error) {
      logger.error(`Error deleting brand ${brandID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete brand');
    }
  }
}

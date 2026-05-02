import { Setting, SettingModel } from '../models/setting.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class SettingService {
  static async getSettings(): Promise<Setting[]> {
    try {
      logger.info('Fetching all settings from database');
      const settings = await SettingModel.findAll();
      logger.info(`Found ${settings.length} settings`);
      return settings;
    } catch (error) {
      logger.error('Error fetching settings:', error);
      throw new Error('Failed to fetch settings');
    }
  }

  static async getSettingById(settingID: string): Promise<Setting | null> {
    try {
      logger.info(`Fetching setting by ID: ${settingID}`);
      const setting = await SettingModel.findById(settingID);

      if (setting) {
        logger.info(`Found setting: ${setting.key}`);
        return setting;
      }

      logger.warn(`Setting not found: ${settingID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching setting ${settingID}:`, error);
      throw new Error('Failed to fetch setting');
    }
  }

  static async getSettingByKey(key: string): Promise<Setting | null> {
    try {
      logger.info(`Fetching setting by key: ${key}`);
      const setting = await SettingModel.findByKey(key);

      if (setting) {
        logger.info(`Found setting: ${setting.key}`);
        return setting;
      }

      logger.warn(`Setting not found: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching setting ${key}:`, error);
      throw new Error('Failed to fetch setting');
    }
  }

  static async getSettingValue(key: string): Promise<any> {
    try {
      logger.info(`Fetching setting value for key: ${key}`);
      const value = await SettingModel.getValue(key);
      logger.debug(`Setting value for ${key}: ${value}`);
      return value;
    } catch (error) {
      logger.error(`Error fetching setting value for ${key}:`, error);
      throw new Error('Failed to fetch setting value');
    }
  }

  static async createSetting(
    settingData: Partial<Setting>,
    userId: string
  ): Promise<Setting | null> {
    try {
      logger.info('Creating new setting:', { key: settingData.key });

      // Validate required fields
      if (!settingData.key || !settingData.value) {
        throw new Error('Setting key and value are required');
      }

      // Check if setting with the same key already exists
      const existingSetting = await SettingModel.findByKey(settingData.key);
      if (existingSetting) {
        throw new Error('Setting with this key already exists');
      }

      // Create the setting
      const newSetting = await SettingModel.create(settingData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Setting',
        resourceType: 'setting',
        resourceId: newSetting?.settingID || '',
        resourceName: newSetting?.key || '',
        details: `Created setting: ${newSetting?.key}`,
        newValues: {
          key: newSetting?.key,
          value: newSetting?.value,
          type: newSetting?.type,
          status: newSetting?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Setting created successfully: ${newSetting?.settingID}`);
      return newSetting;
    } catch (error) {
      logger.error('Error creating setting:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create setting');
    }
  }

  static async updateSetting(
    settingID: string,
    settingData: Partial<Setting>,
    userId: string
  ): Promise<Setting | null> {
    try {
      logger.info(`Updating setting: ${settingID}`);

      // Check if setting exists
      const existingSetting = await SettingModel.findById(settingID);

      if (!existingSetting) {
        throw new Error('Setting not found');
      }

      // Check if setting key already exists for another setting
      if (settingData.key && settingData.key !== existingSetting.key) {
        const existingSettingByKey = await SettingModel.findByKey(
          settingData.key
        );
        if (
          existingSettingByKey &&
          existingSettingByKey.settingID !== settingID
        ) {
          throw new Error('Setting with this key already exists');
        }
      }

      // Update the setting
      const updatedSetting = await SettingModel.update(
        settingID,
        settingData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Setting',
        resourceType: 'setting',
        resourceId: existingSetting.settingID,
        resourceName: existingSetting.key,
        details: 'Updated setting details',
        oldValues: {
          key: existingSetting.key,
          value: existingSetting.value,
          type: existingSetting.type,
          status: existingSetting.status,
        },
        newValues: {
          key: updatedSetting?.key,
          value: updatedSetting?.value,
          type: updatedSetting?.type,
          status: updatedSetting?.status,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Setting updated successfully: ${settingID}`);
      return updatedSetting;
    } catch (error) {
      logger.error(`Error updating setting ${settingID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update setting');
    }
  }

  static async deleteSetting(settingID: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting setting: ${settingID}`);

      // Check if setting exists
      const existingSetting = await SettingModel.findById(settingID);

      if (!existingSetting) {
        throw new Error('Setting not found');
      }

      await SettingModel.delete(settingID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Setting',
        resourceType: 'setting',
        resourceId: existingSetting.settingID,
        resourceName: existingSetting.key,
        details: `Deleted setting: ${existingSetting.key}`,
        oldValues: {
          key: existingSetting.key,
          value: existingSetting.value,
          type: existingSetting.type,
          status: existingSetting.status,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`Setting deleted successfully: ${settingID}`);
    } catch (error) {
      logger.error(`Error deleting setting ${settingID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete setting');
    }
  }

  static async setSettingValue(
    key: string,
    value: any,
    type: 'string' | 'number' | 'boolean',
    userId: string
  ): Promise<Setting | null> {
    try {
      logger.info(`Setting value for ${key}: ${value} (${type})`);

      const setting = await SettingModel.setValue(key, value, type, userId);

      logger.info(`Setting value updated successfully: ${key} = ${value}`);
      return setting;
    } catch (error) {
      logger.error(`Error setting value for ${key}:`, error);
      throw new Error('Failed to set setting value');
    }
  }
}

import { pool } from '../db.js';

export interface Setting {
  settingID: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class SettingModel {
  static async findAll(): Promise<Setting[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_settings WHERE deleted_at IS NULL'
      );
      return rows as Setting[];
    } catch (error) {
      console.error('Error finding all settings:', error);
      throw error;
    }
  }

  static async findById(settingID: string): Promise<Setting | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_settings WHERE settingID = ? AND deleted_at IS NULL',
        [settingID]
      );
      const settings = rows as Setting[];
      return settings[0] ?? null;
    } catch (error) {
      console.error('Error finding setting by ID:', error);
      throw error;
    }
  }

  static async findByKey(key: string): Promise<Setting | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_settings WHERE `key` = ? AND deleted_at IS NULL',
        [key]
      );
      const settings = rows as Setting[];
      return settings[0] ?? null;
    } catch (error) {
      console.error('Error finding setting by key:', error);
      throw error;
    }
  }

  static async create(
    settingData: Partial<Setting>,
    userId: string
  ): Promise<Setting | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_settings (`key`, `value`, `type`, `description`, `status`, `created_by`, `updated_by`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          settingData.key,
          settingData.value,
          settingData.type || 'string',
          settingData.description,
          settingData.status || 'active',
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating setting:', error);
      throw error;
    }
  }

  static async update(
    settingID: string,
    settingData: Partial<Setting>,
    userId: string
  ): Promise<Setting | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_settings SET `key` = ?, `value` = ?, `type` = ?, `description` = ?, `status` = ?, `updated_by` = ?, `updated_at` = NOW() WHERE settingID = ? AND deleted_at IS NULL',
        [
          settingData.key,
          settingData.value,
          settingData.type,
          settingData.description,
          settingData.status,
          userId,
          settingID,
        ]
      );
      return this.findById(settingID);
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  static async delete(settingID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_settings SET deleted_at = NOW(), updated_by = ? WHERE settingID = ? AND deleted_at IS NULL',
        [userId, settingID]
      );
    } catch (error) {
      console.error('Error deleting setting:', error);
      throw error;
    }
  }

  static async getValue(key: string): Promise<any> {
    try {
      const setting = await this.findByKey(key);
      if (!setting) {
        return null;
      }

      switch (setting.type) {
        case 'number':
          return Number(setting.value);
        case 'boolean':
          return setting.value === 'true' || setting.value === '1';
        default:
          return setting.value;
      }
    } catch (error) {
      console.error('Error getting setting value:', error);
      throw error;
    }
  }

  static async setValue(
    key: string,
    value: any,
    type: 'string' | 'number' | 'boolean',
    userId: string
  ): Promise<Setting | null> {
    try {
      const setting = await this.findByKey(key);
      const stringValue = value.toString();

      if (setting) {
        // Update only value, type, updated_by, updated_at - keep other fields intact
        await pool.execute(
          'UPDATE asset_mngmnt_settings SET `value` = ?, `type` = ?, `updated_by` = ?, `updated_at` = NOW() WHERE settingID = ? AND deleted_at IS NULL',
          [stringValue, type, userId, setting.settingID]
        );
        return this.findById(setting.settingID);
      } else {
        // Create new setting
        return this.create(
          {
            key,
            value: stringValue,
            type,
            description: `Setting for ${key}`,
          },
          userId
        );
      }
    } catch (error) {
      console.error('Error setting value:', error);
      throw error;
    }
  }
}

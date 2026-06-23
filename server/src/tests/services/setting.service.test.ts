import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockModel = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByKey: jest.fn(),
  getValue: jest.fn(),
  setValue: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../models/setting.model.js', () => ({
  SettingModel: mockModel,
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { SettingService } = require('../../services/setting.service.js');

describe('SettingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return all settings', async () => {
      const expected = [{ settingID: 's1', key: 'site_name', value: 'Test' }];
      mockModel.findAll.mockResolvedValue(expected);
      const result = await SettingService.getSettings();
      expect(result).toEqual(expected);
    });
  });

  describe('getSettingById', () => {
    it('should return setting by id', async () => {
      const expected = { settingID: 's1' };
      mockModel.findById.mockResolvedValue(expected);
      const result = await SettingService.getSettingById('s1');
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      const result = await SettingService.getSettingById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getSettingByKey', () => {
    it('should return setting by key', async () => {
      const expected = { settingID: 's1', key: 'site_name' };
      mockModel.findByKey.mockResolvedValue(expected);
      const result = await SettingService.getSettingByKey('site_name');
      expect(result).toEqual(expected);
    });
  });

  describe('getSettingValue', () => {
    it('should return setting value', async () => {
      mockModel.getValue.mockResolvedValue('test-value');
      const result = await SettingService.getSettingValue('site_name');
      expect(result).toBe('test-value');
    });

    it('should return null when key not found', async () => {
      mockModel.getValue.mockResolvedValue(null);
      const result = await SettingService.getSettingValue('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createSetting', () => {
    it('should create setting with valid data', async () => {
      mockModel.findByKey.mockResolvedValue(null);
      mockModel.create.mockResolvedValue({ settingID: 'new-s1', key: 'new_key' });
      const result = await SettingService.createSetting({ key: 'new_key', value: 'val' }, 'u1');
      expect(result).toEqual({ settingID: 'new-s1', key: 'new_key' });
    });

    it('should throw when key already exists', async () => {
      mockModel.findByKey.mockResolvedValue({ settingID: 's1' });
      await expect(SettingService.createSetting({ key: 'existing_key' }, 'u1')).rejects.toThrow();
    });
  });

  describe('updateSetting', () => {
    it('should update existing setting', async () => {
      mockModel.findById.mockResolvedValue({ settingID: 's1' });
      mockModel.findByKey.mockResolvedValue(null);
      mockModel.update.mockResolvedValue({ settingID: 's1', value: 'updated' });
      const result = await SettingService.updateSetting('s1', { value: 'updated' }, 'u1');
      expect(result).toEqual({ settingID: 's1', value: 'updated' });
    });

    it('should throw when setting not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(SettingService.updateSetting('nope', {}, 'u1')).rejects.toThrow();
    });
  });

  describe('deleteSetting', () => {
    it('should delete existing setting', async () => {
      mockModel.findById.mockResolvedValue({ settingID: 's1' });
      await SettingService.deleteSetting('s1', 'u1');
      expect(mockModel.delete).toHaveBeenCalledWith('s1', 'u1');
    });

    it('should throw when setting not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(SettingService.deleteSetting('nope', 'u1')).rejects.toThrow();
    });
  });

  describe('setSettingValue', () => {
    it('should set setting value by key', async () => {
      mockModel.setValue.mockResolvedValue({ key: 'test_key', value: 'new_val' });
      const result = await SettingService.setSettingValue('test_key', 'new_val', 'string', 'u1');
      expect(result).toEqual({ key: 'test_key', value: 'new_val' });
    });
  });
});

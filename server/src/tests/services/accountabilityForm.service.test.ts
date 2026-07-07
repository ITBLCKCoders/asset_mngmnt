import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockModel = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByAssetId: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../models/accountabilityForm.model.js', () => ({
  AccountabilityFormModel: mockModel,
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { AccountabilityFormService } = require('../../services/accountabilityForm.service.js');
const { createAuditLog } = jest.requireMock('../../utils/audit.js');

describe('AccountabilityFormService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccountabilityForms', () => {
    it('should return all forms', async () => {
      const expected = [{ formID: 'f1' }];
      mockModel.findAll.mockResolvedValue(expected);
      const result = await AccountabilityFormService.getAccountabilityForms();
      expect(result).toEqual(expected);
    });
  });

  describe('getAccountabilityFormById', () => {
    it('should return form by id', async () => {
      const expected = { formID: 'f1' };
      mockModel.findById.mockResolvedValue(expected);
      const result = await AccountabilityFormService.getAccountabilityFormById('f1');
      expect(result).toEqual(expected);
      expect(mockModel.findById).toHaveBeenCalledWith('f1');
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      const result = await AccountabilityFormService.getAccountabilityFormById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAccountabilityFormsByAssetId', () => {
    it('should return forms by asset id', async () => {
      const expected = [{ formID: 'f1' }];
      mockModel.findByAssetId.mockResolvedValue(expected);
      const result = await AccountabilityFormService.getAccountabilityFormsByAssetId('a1');
      expect(result).toEqual(expected);
    });
  });

  describe('getAccountabilityFormsByUserId', () => {
    it('should return forms by user id', async () => {
      const expected = [{ formID: 'f1' }];
      mockModel.findByUserId.mockResolvedValue(expected);
      const result = await AccountabilityFormService.getAccountabilityFormsByUserId('u1');
      expect(result).toEqual(expected);
    });
  });

  describe('createAccountabilityForm', () => {
    it('should create form with valid data', async () => {
      const formData = { asset_id: 'a1', user_id: 'u1', assigned_date: '2026-01-01', due_date: '2026-12-31', form_number: 'F-001' };
      mockModel.create.mockResolvedValue({ formID: 'new-f1' });
      const result = await AccountabilityFormService.createAccountabilityForm(formData, 'u1');
      expect(result).toEqual({ formID: 'new-f1' });
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw when missing required fields', async () => {
      await expect(AccountabilityFormService.createAccountabilityForm({}, 'u1')).rejects.toThrow();
    });
  });

  describe('updateAccountabilityForm', () => {
    it('should update existing form', async () => {
      mockModel.findById.mockResolvedValue({ formID: 'f1' });
      mockModel.update.mockResolvedValue({ formID: 'f1', status: 'Signed' });
      const result = await AccountabilityFormService.updateAccountabilityForm('f1', { status: 'Signed' }, 'u1');
      expect(result).toEqual({ formID: 'f1', status: 'Signed' });
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw when form not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(AccountabilityFormService.updateAccountabilityForm('nonexistent', {}, 'u1')).rejects.toThrow();
    });
  });

  describe('deleteAccountabilityForm', () => {
    it('should delete existing form', async () => {
      mockModel.findById.mockResolvedValue({ formID: 'f1' });
      mockModel.delete.mockResolvedValue(undefined);
      await AccountabilityFormService.deleteAccountabilityForm('f1', 'u1');
      expect(mockModel.delete).toHaveBeenCalledWith('f1', 'u1');
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw when form not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(AccountabilityFormService.deleteAccountabilityForm('nonexistent', 'u1')).rejects.toThrow();
    });
  });

  describe('markFormAsReturned', () => {
    it('should update form status to returned', async () => {
      mockModel.findById.mockResolvedValue({ formID: 'f1' });
      mockModel.update.mockResolvedValue({ formID: 'f1', status: 'returned' });
      const result = await AccountabilityFormService.markFormAsReturned('f1', '2026-01-15', 'u1');
      expect(result).toBeDefined();
      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});

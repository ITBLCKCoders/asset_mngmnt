import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockModel = {
  getAll: jest.fn(),
  getByUserId: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../models/assetRequest.model.js', () => ({
  __esModule: true,
  default: mockModel,
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const AssetRequestService = require('../../services/assetRequest.service.js').default;

describe('AssetRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all requests', async () => {
      const expected = [{ id: 1, asset_name: 'Laptop' }];
      mockModel.getAll.mockResolvedValue(expected);
      const result = await AssetRequestService.getAll();
      expect(result).toEqual(expected);
    });
  });

  describe('getByUserId', () => {
    it('should return requests for user', async () => {
      const expected = [{ id: 1 }];
      mockModel.getByUserId.mockResolvedValue(expected);
      const result = await AssetRequestService.getByUserId(1);
      expect(result).toEqual(expected);
    });
  });

  describe('getById', () => {
    it('should return request by id', async () => {
      const expected = { id: 1, asset_name: 'Laptop' };
      mockModel.getById.mockResolvedValue(expected);
      const result = await AssetRequestService.getById(1);
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockModel.getById.mockResolvedValue(null);
      const result = await AssetRequestService.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create request with valid data', async () => {
      const data = { department_id: 1, category_id: 1, type_id: 1, quantity: 1, user_id: 1 };
      mockModel.create.mockResolvedValue(1);
      const result = await AssetRequestService.create(data);
      expect(result).toBe(1);
    });

    it('should throw when missing department_id', async () => {
      await expect(AssetRequestService.create({ category_id: 1, type_id: 1, quantity: 1, user_id: 1 } as any)).rejects.toThrow();
    });
  });

  describe('approve', () => {
    it('should approve pending request', async () => {
      mockModel.getById.mockResolvedValue({ id: 1, status: 'pending' });
      mockModel.approve.mockResolvedValue(true);
      const result = await AssetRequestService.approve(1, 'Approved');
      expect(result).toBe(true);
    });

    it('should throw when request not found', async () => {
      mockModel.getById.mockResolvedValue(null);
      await expect(AssetRequestService.approve(999, '')).rejects.toThrow();
    });
  });

  describe('reject', () => {
    it('should reject pending request', async () => {
      mockModel.getById.mockResolvedValue({ id: 1, status: 'pending' });
      mockModel.reject.mockResolvedValue(true);
      const result = await AssetRequestService.reject(1, 'Rejected');
      expect(result).toBe(true);
    });

    it('should throw when request not found', async () => {
      mockModel.getById.mockResolvedValue(null);
      await expect(AssetRequestService.reject(999, '')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete existing request', async () => {
      mockModel.getById.mockResolvedValue({ id: 1 });
      mockModel.delete.mockResolvedValue(true);
      const result = await AssetRequestService.delete(1);
      expect(result).toBe(true);
    });

    it('should throw when not found', async () => {
      mockModel.getById.mockResolvedValue(null);
      await expect(AssetRequestService.delete(999)).rejects.toThrow();
    });
  });
});

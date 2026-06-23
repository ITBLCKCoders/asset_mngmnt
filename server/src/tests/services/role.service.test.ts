import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockModel = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../models/role.model.js', () => ({
  RoleModel: mockModel,
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { RoleService } = require('../../services/role.service.js');

describe('RoleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRoles', () => {
    it('should return all roles', async () => {
      const expected = [{ roleID: 'r1', name: 'Admin' }];
      mockModel.findAll.mockResolvedValue(expected);
      const result = await RoleService.getRoles();
      expect(result).toEqual(expected);
    });
  });

  describe('getRoleById', () => {
    it('should return role by id', async () => {
      const expected = { roleID: 'r1' };
      mockModel.findById.mockResolvedValue(expected);
      const result = await RoleService.getRoleById('r1');
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      const result = await RoleService.getRoleById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('should return role by name', async () => {
      const expected = { roleID: 'r1', name: 'Admin' };
      mockModel.findByName.mockResolvedValue(expected);
      const result = await RoleService.getRoleByName('Admin');
      expect(result).toEqual(expected);
    });
  });

  describe('createRole', () => {
    it('should create role with unique name', async () => {
      mockModel.findByName.mockResolvedValue(null);
      mockModel.create.mockResolvedValue({ roleID: 'new-r1', name: 'New Role' });
      const result = await RoleService.createRole({ name: 'New Role' }, 'u1');
      expect(result).toEqual({ roleID: 'new-r1', name: 'New Role' });
    });

    it('should throw when name already exists', async () => {
      mockModel.findByName.mockResolvedValue({ roleID: 'r1', name: 'Existing' });
      await expect(RoleService.createRole({ name: 'Existing' }, 'u1')).rejects.toThrow();
    });

    it('should throw when name is missing', async () => {
      await expect(RoleService.createRole({}, 'u1')).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    it('should update existing role', async () => {
      mockModel.findById.mockResolvedValue({ roleID: 'r1', name: 'Old' });
      mockModel.findByName.mockResolvedValue(null);
      mockModel.update.mockResolvedValue({ roleID: 'r1', name: 'Updated' });
      const result = await RoleService.updateRole('r1', { name: 'Updated' }, 'u1');
      expect(result).toEqual({ roleID: 'r1', name: 'Updated' });
    });

    it('should throw when role not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(RoleService.updateRole('nonexistent', {}, 'u1')).rejects.toThrow();
    });
  });

  describe('deleteRole', () => {
    it('should delete existing role', async () => {
      mockModel.findById.mockResolvedValue({ roleID: 'r1' });
      await RoleService.deleteRole('r1', 'u1');
      expect(mockModel.delete).toHaveBeenCalledWith('r1', 'u1');
    });

    it('should throw when role not found', async () => {
      mockModel.findById.mockResolvedValue(null);
      await expect(RoleService.deleteRole('nope', 'u1')).rejects.toThrow();
    });
  });
});

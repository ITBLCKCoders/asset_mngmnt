import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserService } from '../../services/user.service.js';

const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockFindByEmail = jest.fn();

jest.mock('../../models/user.model.js', () => ({
  UserModel: {
    findAll: (...args: any[]) => mockFindAll(...args),
    findById: (...args: any[]) => mockFindById(...args),
    findByEmail: (...args: any[]) => mockFindByEmail(...args),
  },
}));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: { info: noop, warn: noop, error: noop, debug: noop },
  };
});
jest.mock('../../utils/audit.js', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users from UserModel.findAll', async () => {
      const users = [{ userID: '1', first_name: 'John', last_name: 'Doe' }];
      mockFindAll.mockResolvedValue(users);

      const result = await UserService.getUsers();

      expect(mockFindAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it('should throw when UserModel.findAll fails', async () => {
      mockFindAll.mockRejectedValue(new Error('DB error'));

      await expect(UserService.getUsers()).rejects.toThrow(
        'Failed to fetch users'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = { userID: '1', first_name: 'Jane', last_name: 'Doe' };
      mockFindById.mockResolvedValue(user);

      const result = await UserService.getUserById('1');

      expect(mockFindById).toHaveBeenCalledWith('1');
      expect(result).toEqual(user);
    });

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await UserService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const user = {
        userID: '1',
        email: 'a@b.co',
        first_name: 'A',
        last_name: 'B',
      };
      mockFindByEmail.mockResolvedValue(user);

      const result = await UserService.getUserByEmail('a@b.co');

      expect(mockFindByEmail).toHaveBeenCalledWith('a@b.co');
      expect(result).toEqual(user);
    });
  });
});

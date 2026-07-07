import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  findFormsByUserId,
  findFormsByAssetId,
  findFormsByFormId,
  createAccountabilityForm,
} = require('../../repositories/accountabilityForm.repository.js');

describe('accountabilityForm.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findFormsByUserId', () => {
    it('should return forms for user', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1', form_number: 'AF-001' }], []]);
      const result = await findFormsByUserId('u1');
      expect(result).toEqual([{ formID: 'f1', form_number: 'AF-001' }]);
    });
  });

  describe('findFormsByAssetId', () => {
    it('should return forms for asset', async () => {
      mockPool.execute.mockResolvedValue([[{ formID: 'f1' }], []]);
      const result = await findFormsByAssetId('a1');
      expect(result).toEqual([{ formID: 'f1' }]);
    });
  });

  describe('findFormsByFormId', () => {
    it('should return form by id with joins', async () => {
      const expected = { formID: 'f1', user_name: 'John Doe' };
      mockPool.execute.mockResolvedValue([[expected], []]);
      const result = await findFormsByFormId('f1');
      expect(result).toEqual(expected);
    });
  });

  describe('createAccountabilityForm', () => {
    it('should insert form and return insertId', async () => {
      const data = { form_number: 'AF-001', user_id: 'u1', status: 'Pending' };
      mockPool.execute.mockResolvedValue([[{ insertId: 'new-f1' }], []]);
      const result = await createAccountabilityForm(data);
      expect(result).toEqual({ insertId: 'new-f1' });
    });
  });
});

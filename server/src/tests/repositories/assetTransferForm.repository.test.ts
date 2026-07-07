import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  getTransferFormsByAssetId,
  getTransferFormById,
  toBind,
  getTransferFormAssignments,
  getTransferFormByReturnFormId,
  getTransferFormIdsByReturnFormId,
  getTransferFormLinksForReturnForms,
} = require('../../repositories/assetTransferForm.repository.js');

describe('assetTransferForm.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransferFormsByAssetId', () => {
    it('should return transfer forms for asset', async () => {
      mockPool.execute.mockResolvedValue([[{ transfer_form_id: 'tf1' }], []]);
      const result = await getTransferFormsByAssetId('a1');
      expect(result).toEqual([{ transfer_form_id: 'tf1' }]);
    });
  });

  describe('getTransferFormById', () => {
    it('should return transfer form by id', async () => {
      mockPool.execute.mockResolvedValue([[{ transfer_form_id: 'tf1', form_number: 'TF-001' }], []]);
      const result = await getTransferFormById('tf1');
      expect(result).toEqual({ transfer_form_id: 'tf1', form_number: 'TF-001' });
    });
  });

  describe('toBind', () => {
    it('should generate placeholder string', () => {
      const result = toBind(['a', 'b', 'c']);
      expect(result).toBe('?,?,?');
    });

    it('should return empty string for empty array', () => {
      expect(toBind([])).toBe('');
    });
  });

  describe('getTransferFormAssignments', () => {
    it('should return transfer form assignments', async () => {
      mockPool.execute.mockResolvedValue([[{ assignmentID: 'as1' }], []]);
      const result = await getTransferFormAssignments('tf1');
      expect(result).toEqual([{ assignmentID: 'as1' }]);
    });
  });

  describe('getTransferFormByReturnFormId', () => {
    it('should return transfer form linked to return form', async () => {
      mockPool.execute.mockResolvedValue([[{ transfer_form_id: 'tf1' }], []]);
      const result = await getTransferFormByReturnFormId('rf1');
      expect(result).toEqual({ transfer_form_id: 'tf1' });
    });
  });

  describe('getTransferFormIdsByReturnFormId', () => {
    it('should return transfer form ids for return', async () => {
      mockPool.execute.mockResolvedValue([[{ transfer_form_id: 'tf1' }], []]);
      const result = await getTransferFormIdsByReturnFormId('rf1');
      expect(result).toEqual(['tf1']);
    });
  });

  describe('getTransferFormLinksForReturnForms', () => {
    it('should return return form transfers', async () => {
      mockPool.execute.mockResolvedValue([[{ return_form_id: 'rf1', transfer_form_id: 'tf1' }], []]);
      const result = await getTransferFormLinksForReturnForms(['rf1', 'rf2']);
      expect(result).toEqual([{ return_form_id: 'rf1', transfer_form_id: 'tf1' }]);
    });
  });
});

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
  findAccountabilityFormForAsset,
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

  describe('findAccountabilityFormForAsset', () => {
    it('should return the latest matching accountability form', async () => {
      mockPool.execute.mockResolvedValue([
        [{ form_number: 'AF-001', created_at: '2026-01-01 00:00:00', user_id: 'u1', owner_first_name: 'John', owner_last_name: 'Doe' }],
        [],
      ]);
      const result = await findAccountabilityFormForAsset({
        assetId: 'a1',
        userId: 'u1',
        dateBoundary: '2026-01-02 00:00:00',
        direction: 'before',
      });
      expect(result).toEqual({ form_number: 'AF-001', created_at: '2026-01-01 00:00:00', user_id: 'u1', owner_first_name: 'John', owner_last_name: 'Doe' });
      const sql = mockPool.execute.mock.calls[0][0];
      expect(sql).toContain('af.deleted_at IS NULL');
      expect(sql).toContain('ORDER BY af.created_at DESC');
      expect(mockPool.execute.mock.calls[0][1]).toEqual(['u1', '2026-01-02 00:00:00', 'a1', '%a1%']);
    });

    it('should support processor_return origin with after direction', async () => {
      mockPool.execute.mockResolvedValue([
        [{ form_number: 'AF-PR', created_at: '2026-01-03 00:00:00', user_id: 'u2', owner_first_name: 'Jane', owner_last_name: 'Smith' }],
        [],
      ]);
      const result = await findAccountabilityFormForAsset({
        assetId: 'a1',
        dateBoundary: '2026-01-02 00:00:00',
        direction: 'after',
        formOrigin: 'processor_return',
      });
      expect(result?.form_number).toBe('AF-PR');
      const sql = mockPool.execute.mock.calls[0][0];
      expect(sql).toContain('form_origin');
      expect(sql).toContain('ORDER BY af.created_at ASC');
      expect(mockPool.execute.mock.calls[0][1]).toEqual(['processor_return', '2026-01-02 00:00:00', 'a1', '%a1%']);
    });

    it('should return null when no form matches', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      const result = await findAccountabilityFormForAsset({ assetId: 'a1' });
      expect(result).toBeNull();
    });

    it('should fall back to any form when origin-restricted lookup misses', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[], []])
        .mockResolvedValueOnce([
          [{ form_number: 'AF-NEXT', created_at: '2026-01-03 00:00:00', user_id: 'u3', owner_first_name: 'Sam', owner_last_name: 'Lee' }],
          [],
        ]);
      const result = await findAccountabilityFormForAsset({
        assetId: 'a1',
        dateBoundary: '2026-01-02 00:00:00',
        direction: 'after',
        formOrigin: 'processor_return',
      });
      expect(result?.form_number).toBe('AF-NEXT');
      expect(mockPool.execute).toHaveBeenCalledTimes(2);
      const firstSql = mockPool.execute.mock.calls[0][0];
      const secondSql = mockPool.execute.mock.calls[1][0];
      expect(firstSql).toContain('form_origin');
      expect(secondSql).not.toContain('form_origin');
      expect(mockPool.execute.mock.calls[0][1]).toEqual(['processor_return', '2026-01-02 00:00:00', 'a1', '%a1%']);
      expect(mockPool.execute.mock.calls[1][1]).toEqual(['2026-01-02 00:00:00', 'a1', '%a1%']);
    });
  });
});

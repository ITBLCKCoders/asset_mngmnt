import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  createGatePass,
  getGatePassById,
  getAllGatePasses,
  updateGatePass,
  deleteGatePass,
} = require('../../repositories/gatePass.repository.js');

describe('gatePass.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGatePass', () => {
    it('should insert gate pass with all fields', async () => {
      const data = {
        gatePassId: 'gp-1',
        assignmentId: 'as-1',
        assetId: 'a-1',
        userId: 'u-1',
        purpose: 'Delivery',
        expectedReturnDate: '2026-07-01',
        destinationLocationId: 'loc-1',
        destinationDepartmentId: 'dept-1',
        condition: 'Good',
        notes: 'Handle with care',
        createdBy: 'admin',
      };
      mockPool.execute.mockResolvedValue([{ insertId: 1 }, []]);
      const result = await createGatePass(data);
      expect(result.insertId).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO gate_passes'),
        expect.arrayContaining([data.gatePassId, data.assignmentId, data.assetId, data.userId, data.purpose])
      );
    });
  });

  describe('getGatePassById', () => {
    it('should return gate pass with joins', async () => {
      const expected = { gate_pass_id: 'gp-1', asset_name: 'Laptop' };
      mockPool.execute.mockResolvedValue([[expected], []]);
      const result = await getGatePassById('gp-1');
      expect(result).toEqual(expected);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN assets'),
        ['gp-1']
      );
    });

    it('should return undefined when not found', async () => {
      mockPool.execute.mockResolvedValue([[[]], []]);
      const result = await getGatePassById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllGatePasses', () => {
    it('should return all gate passes without filters', async () => {
      const expected = [{ gate_pass_id: 'gp-1' }];
      mockPool.execute.mockResolvedValue([expected, []]);
      const result = await getAllGatePasses();
      expect(result).toEqual(expected);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        []
      );
    });

    it('should apply userId filter', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      await getAllGatePasses({ userId: 'u-1' });
      const call = mockPool.execute.mock.calls[0];
      expect(call[1]).toContain('u-1');
    });

    it('should apply status filter', async () => {
      mockPool.execute.mockResolvedValue([[], []]);
      await getAllGatePasses({ status: 'Active' });
      const call = mockPool.execute.mock.calls[0];
      expect(call[1]).toContain('Active');
    });
  });

  describe('updateGatePass', () => {
    it('should update specified fields', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
      const result = await updateGatePass('gp-1', { status: 'Returned', condition: 'Damaged' });
      expect(result.affectedRows).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE gate_passes SET'),
        expect.arrayContaining(['Returned', 'Damaged', 'gp-1'])
      );
    });

    it('should return null when no fields to update', async () => {
      const result = await updateGatePass('gp-1', {});
      expect(result).toBeNull();
    });
  });

  describe('deleteGatePass', () => {
    it('should delete by id', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
      const result = await deleteGatePass('gp-1');
      expect(result.affectedRows).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM gate_passes'),
        ['gp-1']
      );
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as positionsController from '../../controllers/positions.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/activeCompany.js', () => ({
  getScopedActiveCompany: jest.fn(),
}));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js') as {
  getScopedActiveCompany: jest.Mock;
};

describe('positions.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getPositionsHandler', () => {
    it('returns positions list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      const mockRow = { positionID: 'p-1', name: 'Developer', description: null, department_id: 'd-1', department_name: 'Eng', department_code: 'ENG', created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null };
      mockPool.pool.execute.mockResolvedValue([[ [mockRow] ]]);
      await positionsController.getPositionsHandler(req, res);
      expect(res._json.positions).toHaveLength(1);
      expect(res._json.positions[0].name).toBe('Developer');
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await positionsController.getPositionsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      getScopedActiveCompany.mockRejectedValue(new Error('DB error'));
      await positionsController.getPositionsHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('getPositionsByDepartmentHandler', () => {
    it('returns positions by department', async () => {
      req.params = { departmentId: 'dept-1' };
      const mockRow = { positionID: 'p-1', name: 'Tester', description: null, department_id: 'd-1', department_name: 'QA', department_code: 'QA', created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null };
      mockPool.pool.execute.mockResolvedValue([[ [mockRow] ]]);
      await positionsController.getPositionsByDepartmentHandler(req, res);
      expect(res._json.positions).toHaveLength(1);
    });
  });

  describe('createPositionHandler', () => {
    it('returns 400 on validation error', async () => {
      await positionsController.createPositionHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('creates position successfully', async () => {
      req.body = { name: 'Developer', department_id: 'dept-1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ positionID: 'pos-1' }] ]]);
      await positionsController.createPositionHandler(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updatePositionHandler', () => {
    it('updates position successfully', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Sr Developer', department_id: 'dept-1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await positionsController.updatePositionHandler(req, res);
      expect(res._json.message).toBe('Position updated successfully');
    });

    it('returns 404 when position not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Ghost', department_id: 'dept-1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await positionsController.updatePositionHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('deletePositionHandler', () => {
    it('deletes position successfully', async () => {
      req.params = { id: '1' };
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ department_id: 'dept-1' }] ]]);
      mockPool.pool.execute.mockResolvedValueOnce([[ [{ affected_rows: 1 }] ]]);
      await positionsController.deletePositionHandler(req, res);
      expect(res._json).toEqual({ message: 'Position deleted successfully' });
    });

    it('returns 404 when position not found for delete', async () => {
      req.params = { id: '999' };
      mockPool.pool.execute.mockResolvedValueOnce([[ [{}] ]]);
      await positionsController.deletePositionHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as departmentsController from '../../controllers/departments.controller.js';
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

describe('departments.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getDepartmentsHandler', () => {
    it('returns departments list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      const mockRow = { departmentID: 'd-1', name: 'Engineering', code: 'ENG', prefix: 'EN', company_id: 'c-1', description: null, created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null };
      mockPool.pool.execute.mockResolvedValue([[ [mockRow] ]]);
      await departmentsController.getDepartmentsHandler(req, res);
      expect(res._json.departments).toHaveLength(1);
      expect(res._json.departments[0].name).toBe('Engineering');
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await departmentsController.getDepartmentsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('createDepartmentHandler', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', code: '' };
      await departmentsController.createDepartmentHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('creates department successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Engineering', code: 'ENG' };
      mockPool.pool.execute.mockResolvedValue([[ [{ departmentID: 'dept-1' }] ]]);
      await departmentsController.createDepartmentHandler(req, res);
      expect(res._status).toBe(201);
    });

    it('handles duplicate entry error', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Engineering', code: 'ENG' };
      const err = new Error('Duplicate') as any;
      err.code = 'ER_DUP_ENTRY';
      mockPool.pool.execute.mockRejectedValue(err);
      await departmentsController.createDepartmentHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateDepartmentHandler', () => {
    it('updates department successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ companyID: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Dept', code: 'UPD' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await departmentsController.updateDepartmentHandler(req, res);
      expect(res._json.message).toBe('Department updated successfully');
    });

    it('returns 404 when department not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ companyID: 'company-1' });
      req.params = { id: '999' };
      req.body = { name: 'Ghost', code: 'GST' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await departmentsController.updateDepartmentHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('deleteDepartmentHandler', () => {
    it('deletes department successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ companyID: 'company-1' });
      req.params = { id: '1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await departmentsController.deleteDepartmentHandler(req, res);
      expect(res._json).toEqual({ message: 'Department deleted successfully' });
    });

    it('returns 404 when department not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ companyID: 'company-1' });
      req.params = { id: '999' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await departmentsController.deleteDepartmentHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

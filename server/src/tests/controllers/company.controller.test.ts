import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as companyController from '../../controllers/company.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };

describe('company.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn(), headers: {} };
    res = createMockRes();
  });

  describe('getCompaniesPublicHandler', () => {
    it('returns public companies', async () => {
      mockPool.pool.query.mockResolvedValue([[{ id: 'c-1', name: 'Acme', prefix: 'AC', logo_url: null }]]);
      await companyController.getCompaniesPublicHandler(req, res);
      expect(res._json).toEqual({ companies: [{ id: 'c-1', name: 'Acme', prefix: 'AC', logo_url: null }] });
    });

    it('returns 500 on error', async () => {
      mockPool.pool.query.mockRejectedValue(new Error('DB error'));
      await companyController.getCompaniesPublicHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('getAllCompanies', () => {
    it('returns all companies', async () => {
      mockPool.pool.query.mockResolvedValue([[{ id: 'c-1', name: 'Acme' }]]);
      await companyController.getAllCompanies(req, res);
      expect(res._json.companies).toHaveLength(1);
    });
  });

  describe('getActiveCompanyHandler', () => {
    it('returns active company', async () => {
      mockPool.pool.query.mockResolvedValue([[{ id: 'c-1', name: 'Acme' }]]);
      await companyController.getActiveCompanyHandler(req, res);
      expect(res._json.data).toHaveLength(1);
    });

    it('returns empty array when no active company', async () => {
      mockPool.pool.query.mockResolvedValue([[]]);
      await companyController.getActiveCompanyHandler(req, res);
      expect(res._json.data).toEqual([]);
    });
  });

  describe('getMyCompanyHandler', () => {
    it('returns user company', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ company_id: 'c-1' }]]);
      mockPool.pool.query.mockResolvedValue([[{ id: 'c-1', name: 'Acme' }]]);
      await companyController.getMyCompanyHandler(req, res);
      expect(res._json.data).toHaveLength(1);
    });

    it('returns empty array when user has no company', async () => {
      mockPool.pool.execute.mockResolvedValue([[{}]]);
      await companyController.getMyCompanyHandler(req, res);
      expect(res._json.data).toEqual([]);
    });
  });

  describe('setActiveCompany', () => {
    it('sets active company', async () => {
      req.params = { id: 'c-1' };
      await companyController.setActiveCompany(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('setMainCompany', () => {
    it('sets main company', async () => {
      req.params = { id: 'c-1' };
      await companyController.setMainCompany(req, res);
      expect(res._json).toEqual({ success: true });
    });
  });

  describe('deleteCompany', () => {
    it('returns 401 when user not authenticated', async () => {
      req.user = {};
      req.params = { id: 'c-1' };
      await companyController.deleteCompany(req, res);
      expect(res._status).toBe(401);
    });

    it('deletes company successfully', async () => {
      req.params = { id: 'c-1' };
      await companyController.deleteCompany(req, res);
      expect(res._json).toEqual({ message: 'Company deleted successfully' });
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as locationsController from '../../controllers/locations.controller.js';
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

describe('locations.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getLocationsHandler', () => {
    it('returns locations list', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      const mockRow = { locationID: 'l-1', name: 'Office A', floor_unit: 'Floor 2', building: null, room_areas: null, department_id: null, company_id: 'c-1', department_name: null, department_code: null, department_prefix: null, department_description: null, department_created_at: null, department_created_by: null, department_updated_at: null, department_updated_by: null, department_deleted_at: null, department_deleted_by: null, description: null, created_at: null, created_by: null, updated_at: null, updated_by: null, deleted_at: null, deleted_by: null };
      mockPool.pool.execute.mockResolvedValue([[ [mockRow] ]]);
      await locationsController.getLocationsHandler(req, res);
      expect(res._json.locations).toHaveLength(1);
      expect(res._json.locations[0].name).toBe('Office A');
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await locationsController.getLocationsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('createLocationHandler', () => {
    it('returns 400 on validation error', async () => {
      req.body = { name: '', floor_unit: '' };
      await locationsController.createLocationHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('creates location successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { name: 'Office A', floor_unit: 'Floor 2' };
      mockPool.pool.execute.mockResolvedValue([[ [{ locationID: 'loc-1' }] ]]);
      await locationsController.createLocationHandler(req, res);
      expect(res._status).toBe(201);
    });
  });

  describe('updateLocationHandler', () => {
    it('updates location successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      req.body = { name: 'Updated Office', floor_unit: 'Floor 3' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await locationsController.updateLocationHandler(req, res);
      expect(res._json.message).toBe('Location updated successfully');
    });

    it('returns 404 when location not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '999' };
      req.body = { name: 'Ghost', floor_unit: 'N/A' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await locationsController.updateLocationHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('deleteLocationHandler', () => {
    it('deletes location successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '1' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 1 }] ]]);
      await locationsController.deleteLocationHandler(req, res);
      expect(res._json).toEqual({ message: 'Location deleted successfully' });
    });

    it('returns 404 when location not found', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.params = { id: '999' };
      mockPool.pool.execute.mockResolvedValue([[ [{ affected_rows: 0 }] ]]);
      await locationsController.deleteLocationHandler(req, res);
      expect(res._status).toBe(404);
    });
  });
});

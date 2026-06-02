import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as reportsController from '../../controllers/reports.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../services/reports.service.js', () => ({
  ReportsService: {
    getMaintenanceAndRepairHistory: jest.fn(),
    getFinanceReports: jest.fn(),
  },
}));

const { ReportsService } = jest.requireMock('../../services/reports.service.js') as {
  ReportsService: { getMaintenanceAndRepairHistory: jest.Mock; getFinanceReports: jest.Mock };
};

describe('reports.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, query: {} };
    res = createMockRes();
  });

  describe('getMaintenanceAndRepairHistoryHandler', () => {
    it('returns maintenance and repair history', async () => {
      const mockData = [{ id: '1', action: 'Maintenance' }];
      ReportsService.getMaintenanceAndRepairHistory.mockResolvedValue(mockData);
      await reportsController.getMaintenanceAndRepairHistoryHandler(req, res);
      expect(res._json).toEqual({ success: true, data: mockData });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await reportsController.getMaintenanceAndRepairHistoryHandler(req, res);
      expect(res._status).toBe(401);
    });

    it('returns 500 on error', async () => {
      ReportsService.getMaintenanceAndRepairHistory.mockRejectedValue(new Error('Service error'));
      await reportsController.getMaintenanceAndRepairHistoryHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('getFinanceReportsHandler', () => {
    it('returns finance reports', async () => {
      const mockData = { fixedAssetRegister: [], depreciationSchedule: [] };
      ReportsService.getFinanceReports.mockResolvedValue(mockData);
      await reportsController.getFinanceReportsHandler(req, res);
      expect(res._json).toEqual({ success: true, data: mockData });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await reportsController.getFinanceReportsHandler(req, res);
      expect(res._status).toBe(401);
    });

    it('returns 500 on error', async () => {
      ReportsService.getFinanceReports.mockRejectedValue(new Error('Service error'));
      await reportsController.getFinanceReportsHandler(req, res);
      expect(res._status).toBe(500);
    });
  });
});

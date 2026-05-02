import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getDashboardStatsHandler } from '../../controllers/dashboard.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../services/dashboard.service.js', () => ({
  getDashboardData: jest.fn(),
}));
jest.mock('../../db.js', () => ({ pool: {} }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const dashboardService = jest.requireMock(
  '../../services/dashboard.service.js'
) as {
  getDashboardData: jest.Mock;
};
const getDashboardData = dashboardService.getDashboardData;

/** Cast so mockResolvedValue/mockRejectedValue accept our payloads (jest.Mock can infer never). */
const getDashboardDataMock = getDashboardData as jest.Mock & {
  mockResolvedValue: (value: unknown) => void;
  mockRejectedValue: (value: unknown) => void;
};

describe('dashboard.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userID: 'user-123' },
      query: {},
    };
    res = createMockRes();
  });

  describe('getDashboardStatsHandler', () => {
    it('should return 200 and dashboard data on success', async () => {
      const mockData = {
        stats: { totalAssets: 5, activeAssignments: 2 },
        assetByType: [],
        movement: { weekly: [], monthly: [] },
        statusDistribution: [],
      };
      getDashboardDataMock.mockResolvedValue(mockData);

      await getDashboardStatsHandler(req, res);

      expect(getDashboardData).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        undefined,
        undefined
      );
      expect(res._status).toBe(200);
      expect((res._json as any).success).toBe(true);
      expect((res._json as any).data).toEqual(mockData);
    });

    it('should pass scope and companyId from query when provided', async () => {
      req.query = { scope: 'it', companyId: 'company-1' };
      getDashboardDataMock.mockResolvedValue({
        stats: {},
        assetByType: [],
        movement: { weekly: [], monthly: [] },
        statusDistribution: [],
      });

      await getDashboardStatsHandler(req, res);

      expect(getDashboardData).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        'it',
        'company-1'
      );
    });

    it('should return 500 when getDashboardData throws', async () => {
      getDashboardDataMock.mockRejectedValue(new Error('DB error'));

      await getDashboardStatsHandler(req, res);

      expect(res._status).toBe(500);
      expect((res._json as any).success).toBe(false);
      expect((res._json as any).error).toBe('DASHBOARD_STATS_FAILED');
    });
  });
});

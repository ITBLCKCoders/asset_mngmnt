import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import AssetRequestsController from '../../controllers/assetRequests.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../services/assetRequest.service.js', () => ({
  __esModule: true,
  default: {
    getByUserId: jest.fn(),
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
const assetRequestService = jest.requireMock(
  '../../services/assetRequest.service.js'
) as {
  default: {
    getByUserId: jest.Mock;
  };
};

describe('assetRequests.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { userID: '12345678-1234-1234-1234-123456789012' },
      body: {},
      params: {},
    };
    res = createMockRes();
  });

  describe('getByCurrentUser', () => {
    it('returns the authenticated user requests using the UUID user ID', async () => {
      const userId = '12345678-1234-1234-1234-123456789012';
      req.user = { userID: userId };
      const requests = [
        { id: 1, user_id: userId, status: 'pending' },
        { id: 2, user_id: userId, status: 'approved' },
      ];
      assetRequestService.default.getByUserId.mockResolvedValue(requests);

      await AssetRequestsController.getByCurrentUser(req, res);

      expect(assetRequestService.default.getByUserId).toHaveBeenCalledWith(
        userId
      );
      expect(res.json).toHaveBeenCalledWith({ requests });
    });

    it('returns 500 when the asset-request query fails', async () => {
      assetRequestService.default.getByUserId.mockRejectedValue(new Error('Database error'));

      await AssetRequestsController.getByCurrentUser(req, res);

      expect(assetRequestService.default.getByUserId).toHaveBeenCalledWith(
        '12345678-1234-1234-1234-123456789012'
      );
      expect(res._status).toBe(500);
      expect(res._json).toEqual({ error: 'Failed to fetch asset requests' });
    });

    it('returns 401 when no authenticated user is attached', async () => {
      req.user = undefined;

      await AssetRequestsController.getByCurrentUser(req, res);

      expect(assetRequestService.default.getByUserId).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
      expect(res._json).toEqual({ error: 'Unauthorized' });
    });
  });
});

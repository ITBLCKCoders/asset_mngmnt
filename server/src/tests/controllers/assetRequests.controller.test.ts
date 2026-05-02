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
      user: { userID: '123' },
      body: {},
      params: {},
    };
    res = createMockRes();
  });

  describe('getByCurrentUser', () => {
    it('returns the authenticated user requests using req.user.userID (parsed to number)', async () => {
      const requests = [
        { id: 1, user_id: '123', status: 'pending' },
        { id: 2, user_id: '123', status: 'approved' },
      ];
      assetRequestService.default.getByUserId.mockResolvedValue(requests);

      await AssetRequestsController.getByCurrentUser(req, res);

      // The service signature is `getByUserId(userId: number)` so the
      // controller calls parseInt on req.user.userID before delegating.
      expect(assetRequestService.default.getByUserId).toHaveBeenCalledWith(
        123
      );
      expect(res.json).toHaveBeenCalledWith({ requests });
    });

    it('returns 400 when req.user.userID cannot be parsed as a number', async () => {
      req.user = { userID: 'not-a-number' };

      await AssetRequestsController.getByCurrentUser(req, res);

      expect(assetRequestService.default.getByUserId).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect(res._json).toEqual({ error: 'Invalid user ID' });
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

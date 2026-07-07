import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockRes } from '../helpers/mockRes.js';
import { createMockPool } from '../helpers/mockPool.js';
import { ASSET_ACCESS_COOKIE_NAME } from '../../auth/cookieNames.js';

const mockVerifyAccessToken = jest.fn();
const mockCheckInactivity = jest.fn();
const mockUpdateActivity = jest.fn();
const mockPool = createMockPool([[[1]], []]);

jest.mock('../../auth/index.js', () => ({
  verifyAccessToken: (...args: any[]) => mockVerifyAccessToken(...args),
  checkInactivity: (...args: any[]) => mockCheckInactivity(...args),
  updateActivity: (...args: any[]) => mockUpdateActivity(...args),
}));
jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: { warn: noop, error: noop, info: noop, debug: noop },
  };
});

const { authenticate } = require('../../middleware/authenticate.js');

describe('authenticate middleware', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    req = { headers: {}, signedCookies: {}, header: jest.fn() };
    res = createMockRes();
    next = jest.fn();
    mockVerifyAccessToken.mockReset();
    mockCheckInactivity.mockResolvedValue(false);
    mockUpdateActivity.mockResolvedValue(undefined);
    (mockPool.execute as jest.Mock).mockResolvedValue([[[1]], []]);
  });

  it('should return 401 when no access-token cookie is present', async () => {
    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect((res._json as any).error).toBe('No token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization: Bearer header is sent (bearer no longer honoured)', async () => {
    req.headers.authorization = 'Bearer some-token';
    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect((res._json as any).error).toBe('No token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid or expired', async () => {
    req.signedCookies[ASSET_ACCESS_COOKIE_NAME] = 'some-token';
    mockVerifyAccessToken.mockReturnValue(null);

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect((res._json as any).error).toContain('Invalid or expired');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when payload has no sessionId', async () => {
    req.signedCookies[ASSET_ACCESS_COOKIE_NAME] = 'some-token';
    mockVerifyAccessToken.mockReturnValue({ userID: 'u1' });

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user when token and session valid', async () => {
    req.signedCookies[ASSET_ACCESS_COOKIE_NAME] = 'valid-token';
    mockVerifyAccessToken.mockReturnValue({
      userID: 'user-1',
      sessionId: 'sess-1',
    });

    await authenticate(req, res, next);

    expect(mockPool.execute).toHaveBeenCalled();
    expect(mockCheckInactivity).toHaveBeenCalledWith('user-1');
    expect(mockUpdateActivity).toHaveBeenCalledWith('user-1');
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeDefined();
    expect((req as any).user.userID).toBe('user-1');
    expect((req as any).user.sessionId).toBe('sess-1');
  });

  it('should return 401 when session not found in db', async () => {
    req.signedCookies[ASSET_ACCESS_COOKIE_NAME] = 'valid-token';
    mockVerifyAccessToken.mockReturnValue({
      userID: 'user-1',
      sessionId: 'sess-1',
    });
    (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);

    await authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockRes } from '../helpers/mockRes.js';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: { warn: noop, error: noop, info: noop, debug: noop },
  };
});

const { requirePermission, userHasPermission } = require('../../middleware/requirePermission.js');

describe('requirePermission middleware', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    req = { user: { userID: 'u1' } };
    res = createMockRes();
    next = jest.fn();
    (mockPool.execute as any).mockReset();
  });

  it('should return 401 when req.user is missing', async () => {
    delete req.user;

    await requirePermission('Users', 'create')(req, res, next);

    expect(res._status).toBe(401);
    expect((res._json as any).error).toBe('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user lacks the permission', async () => {
    (mockPool.execute as any)
      .mockResolvedValueOnce([[{ name: 'User' }], []]) // role check
      .mockResolvedValueOnce([[], []]); // permission check (no rows)

    await requirePermission('Users', 'create')(req, res, next);

    expect(res._status).toBe(403);
    expect((res._json as any).error).toBe('Forbidden');
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when user has the permission', async () => {
    (mockPool.execute as any)
      .mockResolvedValueOnce([[{ name: 'User' }], []]) // role check
      .mockResolvedValueOnce([[{ granted: 1 }], []]); // permission check (granted)

    await requirePermission('Users', 'create')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).not.toBe(403);
  });

  it('should bypass permission check for admin role', async () => {
    (mockPool.execute as any).mockResolvedValueOnce([[{ name: 'admin' }], []]); // role check

    await requirePermission('Users', 'delete')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockPool.execute).toHaveBeenCalledTimes(1); // only role check, no permission lookup
  });

  it('should bypass permission check for super admin role', async () => {
    (mockPool.execute as any).mockResolvedValueOnce([[{ name: 'super admin' }], []]); // role check

    await requirePermission('Roles', 'delete')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockPool.execute).toHaveBeenCalledTimes(1);
  });

  it('should return 500 on database error', async () => {
    (mockPool.execute as any).mockRejectedValue(new Error('DB error'));

    await requirePermission('Users', 'create')(req, res, next);

    expect(res._status).toBe(500);
    expect((res._json as any).error).toBe('Authorization check failed');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('userHasPermission helper', () => {
  beforeEach(() => {
    (mockPool.execute as any).mockReset();
  });

  it('should return true for admin users', async () => {
    (mockPool.execute as any).mockResolvedValueOnce([[{ name: 'admin' }], []]);

    const result = await userHasPermission('u1', 'Users', 'delete');

    expect(result).toBe(true);
    expect(mockPool.execute).toHaveBeenCalledTimes(1);
  });

  it('should return true for super admin users', async () => {
    (mockPool.execute as any).mockResolvedValueOnce([[{ name: 'super admin' }], []]);

    const result = await userHasPermission('u1', 'Users', 'delete');

    expect(result).toBe(true);
  });

  it('should return true when permission row has granted=1', async () => {
    (mockPool.execute as any)
      .mockResolvedValueOnce([[{ name: 'User' }], []]) // role check
      .mockResolvedValueOnce([[{ granted: 1 }], []]); // permission check

    const result = await userHasPermission('u1', 'Users', 'create');

    expect(result).toBe(true);
  });

  it('should return false when permission row has granted=0', async () => {
    (mockPool.execute as any)
      .mockResolvedValueOnce([[{ name: 'User' }], []]) // role check
      .mockResolvedValueOnce([[{ granted: 0 }], []]); // permission check

    const result = await userHasPermission('u1', 'Users', 'create');

    expect(result).toBe(false);
  });

  it('should return false when no permission row exists', async () => {
    (mockPool.execute as any)
      .mockResolvedValueOnce([[{ name: 'User' }], []]) // role check
      .mockResolvedValueOnce([[], []]); // permission check (no rows)

    const result = await userHasPermission('u1', 'Users', 'create');

    expect(result).toBe(false);
  });
});

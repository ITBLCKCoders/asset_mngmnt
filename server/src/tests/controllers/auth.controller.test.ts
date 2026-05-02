import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  registerHandler,
  loginHandler,
} from '../../controllers/auth.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../auth/index.js', () => {
  const noop = () => {};
  return {
    register: jest.fn(),
    login: jest.fn(),
    forgotPassword: noop,
    verifyPasswordResetOTP: noop,
    resetPassword: noop,
    verifyRefreshToken: noop,
    revokeRefreshToken: noop,
    generateTokens: noop,
    refreshSessionTokens: noop,
    logout: noop,
    updateActivity: noop,
    verifyOTP: noop,
    sendVerificationOTP: noop,
  };
});

const authModule = jest.requireMock('../../auth/index.js');
const mockRegister = authModule.register;
const mockLogin = authModule.login;
jest.mock('../../db.js', () => ({
  pool: {
    execute: jest.fn().mockResolvedValue([[]]),
    query: jest.fn().mockResolvedValue([[]]),
  },
}));
jest.mock('../../utils/audit.js', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../logger.js', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../utils/cloudinary.js', () => ({
  uploadToCloudinary: jest.fn(),
}));
jest.mock('../../cookieConfig.js', () => ({ cookieOptions: {} }));

describe('auth.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('registerHandler', () => {
    it('should return 400 when required fields are missing', async () => {
      req.body = { email: 'a@b.co' };

      await registerHandler(req, res);

      expect(res._status).toBe(400);
      expect((res._json as any).error).toContain('required');
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should return 400 when register returns error', async () => {
      req.body = {
        email: 'a@b.co',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };
      mockRegister.mockResolvedValue({ error: 'Email already exists' });

      await registerHandler(req, res);

      expect(res._status).toBe(400);
      expect((res._json as any).error).toBe('Email already exists');
    });

    it('should return 201 and userId when registration succeeds', async () => {
      req.body = {
        email: 'new@b.co',
        password: 'pass',
        firstName: 'New',
        lastName: 'User',
      };
      mockRegister.mockResolvedValue({ userId: 'user-1', message: 'Created' });

      await registerHandler(req, res);

      expect(res._status).toBe(201);
      expect((res._json as any).userId).toBe('user-1');
    });
  });

  describe('loginHandler', () => {
    it('should return 401 when login returns error', async () => {
      req.body = { email: 'a@b.co', password: 'wrong' };
      mockLogin.mockResolvedValue({ error: 'Invalid credentials' });

      await loginHandler(req, res);

      expect(res._status).toBe(401);
      expect((res._json as any).error).toBeDefined();
    });
  });
});

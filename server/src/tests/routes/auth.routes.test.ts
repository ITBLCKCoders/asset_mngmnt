import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockHandlers: Record<string, jest.Mock> = {};
const mockAuthMiddleware = jest.fn((req: any, res: any, next: any) => {
  req.user = { userID: 'test-user', email: 'test@test.com' };
  next();
});

jest.mock('../../controllers/auth.controller.js', () => {
  const handlers: Record<string, jest.Mock> = {};
  const names = [
    'registerHandler', 'loginHandler', 'verifyOTPHandler', 'resendOTPHandler',
    'forgotPasswordHandler', 'verifyPasswordResetOTPHandler', 'resetPasswordHandler',
    'refreshTokenHandler', 'logoutHandler', 'getMeHandler', 'changePasswordHandler',
    'updateProfileHandler', 'uploadAvatarHandler', 'checkInitialsAvailabilityHandler',
    'sendInitialsOtpHandler', 'verifyInitialsOtpHandler', 'setupMFAHandler',
    'verifyMFASetupHandler', 'verifyMFAHandler', 'disableMFAHandler',
    'regenerateBackupCodesHandler', 'getMFAStatusHandler', 'sendMFARecoveryOTPHandler',
    'verifyMFARecoveryOTPHandler', 'sendPasswordChangeOTPHandler', 'forceChangePasswordHandler',
    'getPasswordStatusHandler',
  ];
  for (const name of names) {
    handlers[name] = jest.fn((req: any, res: any) => {
      if (!res.headersSent) res.status(200).json({ success: true, handler: name });
    });
  }
  return handlers;
});

jest.mock('../../middleware/authenticate.js', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => {
    mockAuthMiddleware(req, res, next);
    req.user = { userID: 'test-user', email: 'test@test.com' };
    next();
  }),
}));

jest.mock('../../middleware/rateLimiters.js', () => ({
  emailBasedLimiter: jest.fn((req: any, res: any, next: any) => next()),
  ipBasedLimiter: jest.fn((req: any, res: any, next: any) => next()),
  otpResendLimiter: jest.fn((req: any, res: any, next: any) => next()),
  otpVerifyLimiter: jest.fn((req: any, res: any, next: any) => next()),
  refreshTokenLimiter: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../../middleware/verifyFileMagicBytes.js', () => ({
  verifyFileMagicBytes: jest.fn((type: string) => (req: any, res: any, next: any) => next()),
}));

jest.mock('../../utils/validation.js', () => ({
  validateDto: jest.fn((schema: any) => (req: any, res: any, next: any) => next()),
}));

const authController = require('../../controllers/auth.controller.js');

describe('Auth Routes', () => {
  let app: express.Express;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    const router = (await import('../../routes/auth.routes.js')).default;
    app.use('/api/auth', router);
  });

  it('POST /api/auth/register should route to registerHandler', async () => {
    await request(app).post('/api/auth/register').send({ email: 'a@b.co', password: 'Pass123@' });
    expect(authController.registerHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/login should route to loginHandler', async () => {
    await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'pass' });
    expect(authController.loginHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/verify-otp should route to verifyOTPHandler', async () => {
    await request(app).post('/api/auth/verify-otp').send({ otp: '123456' });
    expect(authController.verifyOTPHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/resend-otp should route to resendOTPHandler', async () => {
    await request(app).post('/api/auth/resend-otp').send({ email: 'a@b.co' });
    expect(authController.resendOTPHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/forgot-password should route to forgotPasswordHandler', async () => {
    await request(app).post('/api/auth/forgot-password').send({ channel: 'email', email: 'a@b.co' });
    expect(authController.forgotPasswordHandler).toHaveBeenCalled();
  });

  it('GET /api/auth/me should route to getMeHandler via authenticate', async () => {
    await request(app).get('/api/auth/me');
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.getMeHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/logout should route to logoutHandler', async () => {
    await request(app).post('/api/auth/logout');
    expect(authController.logoutHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/refresh should route to refreshTokenHandler', async () => {
    await request(app).post('/api/auth/refresh');
    expect(authController.refreshTokenHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/change-password should require authenticate', async () => {
    await request(app).post('/api/auth/change-password').send({ currentPassword: 'old', newPassword: 'new' });
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.changePasswordHandler).toHaveBeenCalled();
  });

  it('PATCH /api/auth/profile should require authenticate', async () => {
    await request(app).patch('/api/auth/profile').send({ firstName: 'John' });
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.updateProfileHandler).toHaveBeenCalled();
  });

  it('GET /api/auth/password-status should require authenticate', async () => {
    await request(app).get('/api/auth/password-status');
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.getPasswordStatusHandler).toHaveBeenCalled();
  });

  it('GET /api/auth/mfa/status should not require authenticate', async () => {
    await request(app).get('/api/auth/mfa/status');
    expect(authController.getMFAStatusHandler).toHaveBeenCalled();
    expect(mockAuthMiddleware).not.toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/setup should require authenticate', async () => {
    await request(app).post('/api/auth/mfa/setup');
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.setupMFAHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/verify-setup should require authenticate', async () => {
    await request(app).post('/api/auth/mfa/verify-setup').send({ token: '123456' });
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.verifyMFASetupHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/verify should route to verifyMFAHandler', async () => {
    await request(app).post('/api/auth/mfa/verify').send({ tempToken: 'tok', totp: '123456' });
    expect(authController.verifyMFAHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/disable should require authenticate', async () => {
    await request(app).post('/api/auth/mfa/disable').send({ password: 'pass' });
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.disableMFAHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/recovery/send should route to sendMFARecoveryOTPHandler', async () => {
    await request(app).post('/api/auth/mfa/recovery/send').send({ tempToken: 'tok' });
    expect(authController.sendMFARecoveryOTPHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/mfa/recovery/verify should route to verifyMFARecoveryOTPHandler', async () => {
    await request(app).post('/api/auth/mfa/recovery/verify').send({ tempToken: 'tok', otp: '123456' });
    expect(authController.verifyMFARecoveryOTPHandler).toHaveBeenCalled();
  });

  it('POST /api/auth/initials/send-otp should require authenticate', async () => {
    await request(app).post('/api/auth/initials/send-otp');
    expect(mockAuthMiddleware).toHaveBeenCalled();
    expect(authController.sendInitialsOtpHandler).toHaveBeenCalled();
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockSettingGetValue = jest.fn();
const mockSendEmail = jest.fn();
// SMS mocks disabled — all OTP now uses email
// const mockSendSmsVerification = jest.fn();
// const mockCheckSmsVerification = jest.fn();
const mockGenerateTokens = jest.fn();
const mockNormalizePhone = jest.fn((p: string) => p);
const mockBuildPhoneLookupVariants = jest.fn((p: string) => [p]);

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../config/validation.js', () => ({
  config: { FRONTEND_URL: 'http://localhost:5173', JWT_SECRET: 'test-secret' },
}));
jest.mock('../../models/setting.model.js', () => ({
  SettingModel: { getValue: (...args: any[]) => mockSettingGetValue(...args) },
}));
jest.mock('../../email.js', () => ({ sendEmail: (...args: any[]) => mockSendEmail(...args) }));
// SMS OTP replaced by email OTP — kept for reference
// jest.mock('../../auth/sms.js', () => ({
//   sendSmsVerification: (...args: any[]) => mockSendSmsVerification(...args),
//   checkSmsVerification: (...args: any[]) => mockCheckSmsVerification(...args),
// }));
jest.mock('../../auth/tokens.js', () => ({
  generateTokens: (...args: any[]) => mockGenerateTokens(...args),
}));
jest.mock('../../utils/phone.js', () => ({
  normalizePhoneToE164PH: (...args: any[]) => mockNormalizePhone(...args),
  buildPhoneLookupVariants: (...args: any[]) => mockBuildPhoneLookupVariants(...args),
}));
jest.mock('../../utils/redact.js', () => ({
  redactEmail: (e: string) => e,
  redactPhone: (p: string) => p,
}));

const { validatePassword, checkPasswordExpiration, forgotPassword, verifyPasswordResetOTP, resetPassword } = require('../../auth/password.js');

describe('Auth Password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingGetValue.mockResolvedValue(null);
  });

  describe('validatePassword', () => {
    it('should accept valid password meeting all requirements', async () => {
      mockSettingGetValue.mockResolvedValue(8);
      const result = await validatePassword('StrongP@ss1');
      expect(result.valid).toBe(true);
    });

    it('should reject password shorter than min length', async () => {
      mockSettingGetValue.mockImplementation((key: string) => {
        if (key === 'password_min_length') return 10;
        return true;
      });
      const result = await validatePassword('Short1A@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10');
    });

    it('should reject password without uppercase', async () => {
      const result = await validatePassword('weakpass1@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject password without lowercase', async () => {
      const result = await validatePassword('WEAKPASS1@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject password without number', async () => {
      const result = await validatePassword('WeakPass@');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject password without special char when required', async () => {
      mockSettingGetValue.mockImplementation((key: string) => {
        if (key === 'password_require_special') return true;
        return true;
      });
      const result = await validatePassword('WeakPass1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('special');
    });
  });

  describe('checkPasswordExpiration', () => {
    it('should return never expired when expiration days is 0', async () => {
      mockSettingGetValue.mockResolvedValue(0);
      const result = await checkPasswordExpiration(new Date().toISOString());
      expect(result.expired).toBe(false);
      expect(result.expiringSoon).toBe(false);
    });

    it('should return expired when passwordLastChanged is null', async () => {
      mockSettingGetValue.mockResolvedValue(90);
      const result = await checkPasswordExpiration(null);
      expect(result.expired).toBe(true);
    });

    it('should return expired when days remaining <= 0', async () => {
      mockSettingGetValue.mockResolvedValue(90);
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      const result = await checkPasswordExpiration(oldDate);
      expect(result.expired).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });

    it('should return expiringSoon when within 7 days', async () => {
      mockSettingGetValue.mockResolvedValue(90);
      const recentDate = new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString();
      const result = await checkPasswordExpiration(recentDate);
      expect(result.expired).toBe(false);
      expect(result.expiringSoon).toBe(true);
      expect(result.daysRemaining).toBeLessThanOrEqual(7);
    });

    it('should return not expired when plenty of days remain', async () => {
      mockSettingGetValue.mockResolvedValue(90);
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const result = await checkPasswordExpiration(recentDate);
      expect(result.expired).toBe(false);
      expect(result.expiringSoon).toBe(false);
      expect(result.daysRemaining).toBeGreaterThan(7);
    });
  });

  describe('forgotPassword (email channel)', () => {
    it('should send OTP when user found by email', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      const result = await forgotPassword('email', { email: 'user@test.com' });
      expect(result.message).toBe('If account exists, OTP sent');
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('should return silent message when user not found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[[]], []]);
      const result = await forgotPassword('email', { email: 'missing@test.com' });
      expect(result.message).toBe('If account exists, OTP sent');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // SMS OTP replaced by email OTP — kept for reference
  // describe('forgotPassword (sms channel)', () => {
  //   it('should send SMS OTP when normalized phone is valid', async () => {
  //     mockNormalizePhone.mockReturnValue('+639123456789');
  //     mockBuildPhoneLookupVariants.mockReturnValue(['+639123456789']);
  //     (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1' }], []]);
  //     mockSendSmsVerification.mockResolvedValue({ success: true as const });
  //     const result = await forgotPassword('sms', { contactNumber: '09123456789' });
  //     expect(result.message).toBe('If account exists, OTP sent');
  //   });
  //
  //   it('should return error when SMS send fails', async () => {
  //     mockNormalizePhone.mockReturnValue('+639123456789');
  //     mockBuildPhoneLookupVariants.mockReturnValue(['+639123456789']);
  //     (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1' }], []]);
  //     mockSendSmsVerification.mockResolvedValue({ error: 'SMS failed' });
  //     const result = await forgotPassword('sms', { contactNumber: '09123456789' });
  //     expect(result.error).toBe('SMS failed');
  //   });
  // });

  describe('verifyPasswordResetOTP', () => {
    it('should return success when OTP is valid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1', token: '123456' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1', email: 'user@test.com' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      const result = await verifyPasswordResetOTP('123456');
      expect(result.success).toBe(true);
      expect(result.userId).toBe('u1');
    });

    it('should return error when OTP is invalid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[[]], []]);
      const result = await verifyPasswordResetOTP('000000');
      expect(result.error).toBe('Invalid or expired OTP');
    });
  });

  describe('resetPassword', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;

    it('should reset password and return tokens when valid', async () => {
      const hashed = await bcrypt.hash('NewStr0ng@Pass', 4);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1' }], []]);
      mockSettingGetValue.mockResolvedValue(8);
      mockGenerateTokens.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      (mockPool.execute as jest.Mock).mockResolvedValue([[[{ userID: 'u1', email: 'user@test.com' }], []]]);

      const result = await resetPassword('u1', 'NewStr0ng@Pass', mockReq);
      expect(result).toHaveProperty('accessToken');
    });

    it('should return error when token is invalid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      const result = await resetPassword('u1', 'NewStr0ng@Pass', mockReq);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should return error when password is weak', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'u1' }], []]);
      const result = await resetPassword('u1', 'weak', mockReq);
      expect(result.error).toContain('Password must be at least');
    });
  });
});

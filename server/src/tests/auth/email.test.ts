import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockSendEmail = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../email.js', () => ({ sendEmail: (...args: any[]) => mockSendEmail(...args) }));
jest.mock('../../config/validation.js', () => ({
  config: { FRONTEND_URL: 'http://localhost:5173' },
}));
jest.mock('../../utils/redact.js', () => ({
  redactEmail: (e: string) => e,
}));

const { sendVerificationOTP, verifyOTP, sendSigningOTP, verifySigningOTP, normalizeSigningOtpPurpose, getSigningOtpTemplate } = require('../../auth/email.js');

describe('Auth Email (OTP)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationOTP', () => {
    it('should delete old tokens and insert new OTP', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      await sendVerificationOTP('user-1', 'user@test.com');
      expect(mockPool.execute).toHaveBeenCalledWith('DELETE FROM verification_tokens WHERE userID = ?', ['user-1']);
      expect(mockPool.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO verification_tokens'), expect.arrayContaining(['user-1']));
    });

    it('should send verification email', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      mockSendEmail.mockResolvedValue(undefined);
      await sendVerificationOTP('user-1', 'user@test.com');
      expect(mockSendEmail).toHaveBeenCalledWith('user@test.com', 'Verify your email – Asset Management', expect.any(String), expect.any(String));
    });
  });

  describe('verifyOTP', () => {
    it('should mark user verified and return success when OTP is valid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'user-1', token: '123456' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'user-1', email: 'user@test.com', name: 'Test' }], []]);

      const result = await verifyOTP('123456');
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('user@test.com');
    });

    it('should return error when OTP is invalid or expired', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await verifyOTP('000000');
      expect(result.error).toBe('Invalid or expired OTP');
    });

    it('should return error when user not found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'user-1', token: '123456' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);

      const result = await verifyOTP('123456');
      expect(result.error).toBe('User not found');
    });
  });

  describe('normalizeSigningOtpPurpose', () => {
    it('should accept known purposes and reject unknown values', () => {
      expect(normalizeSigningOtpPurpose('transfer')).toBe('transfer');
      expect(normalizeSigningOtpPurpose('clearance')).toBe('clearance');
      expect(normalizeSigningOtpPurpose('registration')).toBeNull();
      expect(normalizeSigningOtpPurpose(undefined)).toBeNull();
    });
  });

  describe('sendSigningOTP', () => {
    it('should send a purpose-specific subject without touching registration template', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      mockSendEmail.mockResolvedValue(undefined);
      await sendSigningOTP('user-1', 'user@test.com', 'transfer');
      expect(mockSendEmail).toHaveBeenCalledWith(
        'user@test.com',
        'Asset transfer signing code – Asset Management',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should expose distinct templates per purpose', () => {
      expect(getSigningOtpTemplate('issuance').subject).toContain('issuance');
      expect(getSigningOtpTemplate('profile_initials').subject).toContain('initials');
    });
  });

  describe('verifySigningOTP', () => {
    it('should verify without flipping users.verified', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ userID: 'user-1', token: '123456' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);

      const result = await verifySigningOTP('123456');
      expect(result.success).toBe(true);
      const updates = (mockPool.execute as jest.Mock).mock.calls.filter((c: any[]) =>
        String(c[0]).includes('UPDATE users SET verified')
      );
      expect(updates.length).toBe(0);
    });

    it('should return error when OTP is invalid or expired', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await verifySigningOTP('000000');
      expect(result.error).toBe('Invalid or expired OTP');
    });
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockSendEmail = jest.fn();
const mockSpeakeasyGenerateSecret = jest.fn();
const mockSpeakeasyOtpauthURL = jest.fn();
const mockSpeakeasyTOTPVerify = jest.fn();
const mockQRCodeToDataURL = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('speakeasy', () => ({
  generateSecret: (...args: any[]) => mockSpeakeasyGenerateSecret(...args),
  otpauthURL: (...args: any[]) => mockSpeakeasyOtpauthURL(...args),
  totp: { verify: (...args: any[]) => mockSpeakeasyTOTPVerify(...args) },
}));
jest.mock('qrcode', () => ({
  toDataURL: (...args: any[]) => mockQRCodeToDataURL(...args),
}));
jest.mock('../../email.js', () => ({ sendEmail: (...args: any[]) => mockSendEmail(...args) }));

const { generateTOTPSecret, verifyTOTPSetup, verifyTOTP, disableMFA, isMFAEnabled, regenerateBackupCodes, sendMFARecoveryOTP, verifyMFARecoveryOTP } = require('../../auth/mfa.js');

describe('Auth MFA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTOTPSecret', () => {
    it('should generate secret and QR code', async () => {
      mockSpeakeasyGenerateSecret.mockReturnValue({ base32: 'BASE32SECRET', ascii: 'asciisecret' });
      mockSpeakeasyOtpauthURL.mockReturnValue('otpauth://totp/...');
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,...');
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);

      const result = await generateTOTPSecret('user-1', 'user@test.com');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(mockPool.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET mfa_secret'), expect.arrayContaining(['user-1']));
    });
  });

  describe('verifyTOTPSetup', () => {
    it('should enable MFA when TOTP is valid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_secret: 'BASE32SECRET' }], []]);
      mockSpeakeasyTOTPVerify.mockReturnValue(true);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);

      const result = await verifyTOTPSetup('user-1', '123456');
      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should return error when no secret stored', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{}], []]);
      const result = await verifyTOTPSetup('user-1', '123456');
      expect(result.error).toBe('MFA not set up');
    });

    it('should return error when TOTP is invalid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_secret: 'BASE32SECRET' }], []]);
      mockSpeakeasyTOTPVerify.mockReturnValue(false);
      const result = await verifyTOTPSetup('user-1', '000000');
      expect(result.error).toBe('Invalid TOTP code');
    });
  });

  describe('verifyTOTP', () => {
    it('should return success with method=totp for valid TOTP', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_secret: 'SECRET', mfa_enabled: 1 }], []]);
      mockSpeakeasyTOTPVerify.mockReturnValue(true);
      const result = await verifyTOTP('user-1', '123456');
      expect(result.success).toBe(true);
      expect(result.method).toBe('totp');
    });

    it('should return error when MFA not enabled', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_secret: 'SECRET', mfa_enabled: 0 }], []]);
      const result = await verifyTOTP('user-1', '123456');
      expect(result.error).toBe('MFA not enabled');
    });

    it('should return error for invalid code', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_secret: 'SECRET', mfa_enabled: 1 }], []]);
      mockSpeakeasyTOTPVerify.mockReturnValue(false);
      const result = await verifyTOTP('user-1', '000000');
      expect(result.error).toBe('Invalid code');
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA with correct password', async () => {
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash('correct-password', 4);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ password: hashed }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);

      const result = await disableMFA('user-1', 'correct-password', 'user@test.com');
      expect(result.success).toBe(true);
    });

    it('should return error with wrong password', async () => {
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash('correct-password', 4);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ password: hashed }], []]);
      const result = await disableMFA('user-1', 'wrong-password', 'user@test.com');
      expect(result.error).toBe('Invalid password');
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true when mfa_enabled is 1', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_enabled: 1 }], []]);
      const result = await isMFAEnabled('user-1');
      expect(result).toBe(true);
    });

    it('should return false when mfa_enabled is 0', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ mfa_enabled: 0 }], []]);
      const result = await isMFAEnabled('user-1');
      expect(result).toBe(false);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate codes with correct password', async () => {
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash('pass', 4);
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ password: hashed, mfa_enabled: 1 }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);

      const result = await regenerateBackupCodes('user-1', 'pass');
      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should return error when MFA not enabled', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ password: 'hash', mfa_enabled: 0 }], []]);
      const result = await regenerateBackupCodes('user-1', 'pass');
      expect(result.error).toBe('MFA not enabled');
    });
  });

  describe('sendMFARecoveryOTP', () => {
    it('should send recovery OTP via email', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      mockSendEmail.mockResolvedValue(undefined);
      const result = await sendMFARecoveryOTP('user-1', 'user@test.com');
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith('user@test.com', expect.stringContaining('MFA Recovery'), expect.any(String));
    });
  });

  describe('verifyMFARecoveryOTP', () => {
    it('should verify recovery OTP when valid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ user_id: 'user-1', token: '123456' }], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await verifyMFARecoveryOTP('user-1', '123456');
      expect(result.success).toBe(true);
    });

    it('should return error when OTP invalid', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[], []]);
      const result = await verifyMFARecoveryOTP('user-1', '000000');
      expect(result.error).toBe('Invalid or expired recovery code');
    });
  });
});

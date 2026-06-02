import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../config/validation.js', () => ({
  config: { VONAGE_API_KEY: '', VONAGE_API_SECRET: '' },
}));

const { sendSmsVerification, checkSmsVerification } = require('../../auth/sms.js');

describe('Auth SMS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSmsVerification (dev mode)', () => {
    it('should return success with in-memory code', async () => {
      const result = await sendSmsVerification('+639123456789');
      expect(result.success).toBe(true);
    });

    it('should store code for later verification', async () => {
      await sendSmsVerification('+639123456789');
      const checkResult = await checkSmsVerification('+639123456789', 'wrong');
      expect(checkResult.error).toBeDefined();
    });
  });

  describe('checkSmsVerification', () => {
    it('should return error when no code was sent', async () => {
      const result = await checkSmsVerification('+639000000000', '123456');
      expect(result.error).toBe('Invalid or expired OTP');
    });

    it('should return success when code matches', async () => {
      await sendSmsVerification('+639123456789');
      const storedResult = await checkSmsVerification('+639123456789', '000000');
      expect(storedResult.error).toBe('Invalid or expired OTP');
    });

    it('should return error when code is wrong', async () => {
      await sendSmsVerification('+639987654321');
      const result = await checkSmsVerification('+639987654321', 'wrong-code');
      expect(result.error).toBe('Invalid or expired OTP');
    });

    it('should return error when code is expired', async () => {
      jest.useFakeTimers();
      await sendSmsVerification('+639555555555');
      jest.advanceTimersByTime(11 * 60 * 1000);
      const result = await checkSmsVerification('+639555555555', '000000');
      expect(result.error).toBe('Invalid or expired OTP');
      jest.useRealTimers();
    });
  });
});

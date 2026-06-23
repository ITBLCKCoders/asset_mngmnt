import { describe, it, expect } from '@jest/globals';

const {
  emailBasedLimiter,
  ipBasedLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
  refreshTokenLimiter,
} = require('../../middleware/rateLimiters.js');

describe('rateLimiters', () => {
  describe('emailBasedLimiter', () => {
    it('should export configured limiter', () => {
      expect(emailBasedLimiter).toBeDefined();
      expect(typeof emailBasedLimiter).toBe('function');
      expect(typeof emailBasedLimiter.resetKey).toBe('function');
      expect(typeof emailBasedLimiter.getKey).toBe('function');
    });
  });

  describe('ipBasedLimiter', () => {
    it('should export configured limiter', () => {
      expect(ipBasedLimiter).toBeDefined();
      expect(typeof ipBasedLimiter).toBe('function');
      expect(typeof ipBasedLimiter.resetKey).toBe('function');
    });
  });

  describe('otpResendLimiter', () => {
    it('should export configured limiter', () => {
      expect(otpResendLimiter).toBeDefined();
      expect(typeof otpResendLimiter).toBe('function');
      expect(typeof otpResendLimiter.resetKey).toBe('function');
    });
  });

  describe('otpVerifyLimiter', () => {
    it('should export configured limiter', () => {
      expect(otpVerifyLimiter).toBeDefined();
      expect(typeof otpVerifyLimiter).toBe('function');
      expect(typeof otpVerifyLimiter.resetKey).toBe('function');
    });
  });

  describe('refreshTokenLimiter', () => {
    it('should export configured limiter', () => {
      expect(refreshTokenLimiter).toBeDefined();
      expect(typeof refreshTokenLimiter).toBe('function');
      expect(typeof refreshTokenLimiter.resetKey).toBe('function');
    });
  });
});

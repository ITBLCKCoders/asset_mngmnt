import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('dotenv', () => ({ config: jest.fn() }));

const ORIGINAL_ENV = { ...process.env };

function clearAll() {
  delete process.env.NODE_ENV;
  delete process.env.JWT_SECRET;
  delete process.env.COOKIE_SECRET;
  delete process.env.HTTP_PORT;
  delete process.env.PORT;
  delete process.env.MYSQL_PASSWORD;
  delete process.env.VONAGE_API_KEY;
  delete process.env.VONAGE_API_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
}

beforeEach(() => {
  jest.resetModules();
  clearAll();
});

afterEach(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('config/validation', () => {
  describe('env schema', () => {
    it('should use defaults for optional fields when not set', () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { config } = require('../../config/validation.js');
      expect(config.HTTP_PORT).toBe(6996);
      expect(config.NODE_ENV).toBe('development');
      expect(config.MYSQL_HOST).toBe('localhost');
    });

    it('should exit when required vars are missing', () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      require('../../config/validation.js');
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should throw if MYSQL_PASSWORD missing in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { validateDatabaseConfig } = require('../../config/validation.js');
      expect(() => validateDatabaseConfig()).toThrow('MYSQL_PASSWORD is required in production');
    });

    it('should not throw if MYSQL_PASSWORD is set in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      process.env.MYSQL_PASSWORD = 'secret';
      const { validateDatabaseConfig } = require('../../config/validation.js');
      expect(() => validateDatabaseConfig()).not.toThrow();
    });

    it('should not throw in non-production even without password', () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { validateDatabaseConfig } = require('../../config/validation.js');
      expect(() => validateDatabaseConfig()).not.toThrow();
    });
  });

  describe('validateJWTConfig', () => {
    it('should throw if JWT_SECRET is too short in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(100);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { validateJWTConfig, config } = require('../../config/validation.js');
      config.JWT_SECRET = 'short';
      expect(() => validateJWTConfig()).toThrow('JWT_SECRET must be at least 64 characters');
    });
  });

  // Vonage SMS config tests disabled — all OTP now uses email
  // describe('validateVonageConfig', () => {
  //   it('should not throw in non-production when Vonage keys are missing', () => {
  //     process.env.JWT_SECRET = 'a'.repeat(64);
  //     process.env.COOKIE_SECRET = 'a'.repeat(32);
  //     const { validateVonageConfig } = require('../../config/validation.js');
  //     expect(() => validateVonageConfig()).not.toThrow();
  //   });
  //
  //   it('should throw in production when Vonage keys are missing', () => {
  //     process.env.NODE_ENV = 'production';
  //     process.env.JWT_SECRET = 'a'.repeat(64);
  //     process.env.COOKIE_SECRET = 'a'.repeat(32);
  //     const { validateVonageConfig } = require('../../config/validation.js');
  //     expect(() => validateVonageConfig()).toThrow('Vonage SMS configuration is required in production');
  //   });
  // });

  describe('validateEmailConfig', () => {
    it('should throw in production when RESEND_API_KEY and RESEND_FROM_EMAIL missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { validateEmailConfig } = require('../../config/validation.js');
      expect(() => validateEmailConfig()).toThrow('RESEND_API_KEY is required in production');
    });

    it('should not throw in production when both are set', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      process.env.RESEND_API_KEY = 're_xxx';
      process.env.RESEND_FROM_EMAIL = 'test@test.com';
      const { validateEmailConfig } = require('../../config/validation.js');
      expect(() => validateEmailConfig()).not.toThrow();
    });
  });

  describe('validateCloudinaryConfig', () => {
    it('should throw in production when Cloudinary config missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      const { validateCloudinaryConfig } = require('../../config/validation.js');
      expect(() => validateCloudinaryConfig()).toThrow('Cloudinary configuration is required in production');
    });
  });

  describe('validateAllConfigs', () => {
    it('should not throw when all prod configs are valid', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      process.env.MYSQL_PASSWORD = 'secret';
      process.env.RESEND_API_KEY = 're_xxx';
      process.env.RESEND_FROM_EMAIL = 'test@test.com';
      process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
      process.env.CLOUDINARY_API_KEY = 'key';
      process.env.CLOUDINARY_API_SECRET = 'secret';
      process.env.VONAGE_API_KEY = 'key';
      process.env.VONAGE_API_SECRET = 'secret';
      const { validateAllConfigs } = require('../../config/validation.js');
      expect(() => validateAllConfigs()).not.toThrow();
    });

    it('should throw when a sub-validation fails', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.COOKIE_SECRET = 'a'.repeat(32);
      process.env.MYSQL_PASSWORD = 'secret';
      const { validateAllConfigs } = require('../../config/validation.js');
      expect(() => validateAllConfigs()).toThrow('RESEND_API_KEY is required in production');
    });
  });
});

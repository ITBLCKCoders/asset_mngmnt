import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockAllowedOrigins: string[] = [];
const mockAllowedOriginPatterns: string[] = [];
const mockPort = 6996;

jest.mock('../../config/validation.js', () => ({
  config: { NODE_ENV: 'development' },
}));
jest.mock('../../config/database.js', () => ({
  serverConfig: {
    allowedOrigins: mockAllowedOrigins,
    allowedOriginPatterns: mockAllowedOriginPatterns,
    port: mockPort,
  },
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const {
  normalizeOrigin,
  compileOriginPattern,
  resolveCorsDecision,
} = require('../../middleware/corsPolicy.js');

describe('corsPolicy', () => {
  beforeEach(() => {
    mockAllowedOrigins.length = 0;
    mockAllowedOriginPatterns.length = 0;
  });

  describe('normalizeOrigin', () => {
    it('should parse and normalize a full URL', () => {
      expect(normalizeOrigin('https://example.com:6996')).toBe('https://example.com:6996');
    });

    it('should strip trailing slash', () => {
      expect(normalizeOrigin('http://localhost:3000/')).toBe('http://localhost:3000');
    });

    it('should handle already clean origins', () => {
      expect(normalizeOrigin('http://localhost')).toBe('http://localhost');
    });

    it('should fallback to trimmed lowercase for invalid URLs', () => {
      expect(normalizeOrigin('  NOT_A_URL  ')).toBe('not_a_url');
    });
  });

  describe('compileOriginPattern', () => {
    it('should return null for empty pattern', () => {
      expect(compileOriginPattern('')).toBeNull();
      expect(compileOriginPattern('  ')).toBeNull();
    });

    it('should compile exact origin regex', () => {
      const regex = compileOriginPattern('https://example.com');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('https://example.com')).toBe(true);
      expect(regex!.test('https://other.com')).toBe(false);
    });

    it('should handle wildcard patterns', () => {
      const regex = compileOriginPattern('https://*.example.com');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('https://sub.example.com')).toBe(true);
      expect(regex!.test('https://other.com')).toBe(false);
    });

    it('should handle regex literal patterns', () => {
      const regex = compileOriginPattern('/^https:\\/\\/.*\\.example\\.com$/i');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('https://foo.example.com')).toBe(true);
    });

    it('should fallback to exact match for input that looks like a regex literal', () => {
      const regex = compileOriginPattern('/[/invalid');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex!.test('/[/invalid')).toBe(true);
    });
  });

  describe('resolveCorsDecision', () => {
    it('should allow missing origin', () => {
      const result = resolveCorsDecision(undefined);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('no_origin_header');
    });

    it('should allow self origin', () => {
      const result = resolveCorsDecision(`http://localhost:${mockPort}`);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('self_origin');
    });

    it('should allow exact match in allowedOrigins', () => {
      mockAllowedOrigins.push('http://trusted.com');
      const result = resolveCorsDecision('http://trusted.com');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('exact_allowlist');
    });

    it('should allow pattern match', () => {
      mockAllowedOriginPatterns.push('https://*.trusted.com');
      const result = resolveCorsDecision('https://sub.trusted.com');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('pattern_allowlist');
    });

    it('should allow LAN origins in development', () => {
      const result = resolveCorsDecision('http://192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('lan_origin');
    });

    it('should reject unknown origins', () => {
      const result = resolveCorsDecision('http://evil.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_in_allowlist');
    });
  });
});

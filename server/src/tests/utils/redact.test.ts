import { describe, it, expect } from '@jest/globals';

const { redactEmail, redactPhone, redactToken } = require('../../utils/redact.js');

describe('redact', () => {
  describe('redactEmail', () => {
    it('should redact local part keeping first char', () => {
      expect(redactEmail('john.doe@example.com')).toBe('j***@example.com');
    });

    it('should return <empty> for null/undefined', () => {
      expect(redactEmail(null)).toBe('<empty>');
      expect(redactEmail(undefined)).toBe('<empty>');
    });

    it('should return <invalid> when no @ found', () => {
      expect(redactEmail('notanemail')).toBe('<invalid>');
    });
  });

  describe('redactPhone', () => {
    it('should redact middle digits keeping code and last 4', () => {
      const result = redactPhone('+639171234567');
      expect(result).toMatch(/^\+63\*{3}4567$/);
    });

    it('should return <empty> for null/undefined', () => {
      expect(redactPhone(null)).toBe('<empty>');
      expect(redactPhone(undefined)).toBe('<empty>');
    });

    it('should return <short> for very short input', () => {
      expect(redactPhone('12345')).toBe('<short>');
    });
  });

  describe('redactToken', () => {
    it('should show first 4 chars with ellipsis', () => {
      expect(redactToken('abcdef123456')).toBe('abcd…');
    });

    it('should return <empty> for null/undefined', () => {
      expect(redactToken(null)).toBe('<empty>');
      expect(redactToken(undefined)).toBe('<empty>');
    });
  });
});

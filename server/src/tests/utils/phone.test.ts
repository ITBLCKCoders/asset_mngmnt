import { describe, it, expect } from '@jest/globals';

const { normalizePhoneToE164PH, buildPhoneLookupVariants } = require('../../utils/phone.js');

describe('phone', () => {
  describe('normalizePhoneToE164PH', () => {
    it('should normalize +639 format', () => {
      expect(normalizePhoneToE164PH('+639171234567')).toBe('+639171234567');
    });

    it('should normalize 639 format', () => {
      expect(normalizePhoneToE164PH('639171234567')).toBe('+639171234567');
    });

    it('should normalize 09 format', () => {
      expect(normalizePhoneToE164PH('09171234567')).toBe('+639171234567');
    });

    it('should normalize 9 format', () => {
      expect(normalizePhoneToE164PH('9171234567')).toBe('+639171234567');
    });

    it('should strip formatting characters', () => {
      expect(normalizePhoneToE164PH('+63 917 123 4567')).toBe('+639171234567');
      expect(normalizePhoneToE164PH('0917-123-4567')).toBe('+639171234567');
      expect(normalizePhoneToE164PH('(0917) 123 4567')).toBe('+639171234567');
    });

    it('should return null for empty input', () => {
      expect(normalizePhoneToE164PH('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(normalizePhoneToE164PH('12345')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(normalizePhoneToE164PH(null as any)).toBeNull();
    });
  });

  describe('buildPhoneLookupVariants', () => {
    it('should return 4 variants for valid PH number', () => {
      const variants = buildPhoneLookupVariants('+639171234567');
      expect(variants).toContain('+639171234567');
      expect(variants).toContain('639171234567');
      expect(variants).toContain('09171234567');
      expect(variants).toContain('9171234567');
      expect(variants.length).toBe(4);
    });

    it('should return single variant for non-PH number', () => {
      const variants = buildPhoneLookupVariants('+14155551234');
      expect(variants).toEqual(['+14155551234']);
    });

    it('should deduplicate variants', () => {
      const variants = buildPhoneLookupVariants('+639171234567');
      const unique = new Set(variants);
      expect(unique.size).toBe(variants.length);
    });
  });
});

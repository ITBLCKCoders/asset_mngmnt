import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency } from '@/lib/currency';

describe('currency', () => {
  describe('formatCurrency', () => {
    it('should format number as PHP currency', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('should format zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0.00');
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency string', () => {
      expect(parseCurrency('1,234.56')).toBe(1234.56);
    });

    it('should parse plain number string', () => {
      expect(parseCurrency('1000')).toBe(1000);
    });

    it('should handle empty string', () => {
      expect(parseCurrency('')).toBe(0);
    });
  });
});

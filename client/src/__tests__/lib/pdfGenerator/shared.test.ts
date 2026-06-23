import { describe, it, expect } from 'vitest';
import { pdfDefaultStyles, formatPdfDate } from '@/lib/pdfGenerator/shared';

describe('pdfGenerator shared', () => {
  describe('pdfDefaultStyles', () => {
    it('should provide default style constants', () => {
      expect(pdfDefaultStyles).toBeDefined();
      expect(typeof pdfDefaultStyles.primaryColor).toBe('string');
    });
  });

  describe('formatPdfDate', () => {
    it('should format date string', () => {
      const result = formatPdfDate('2026-06-23');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty input', () => {
      expect(formatPdfDate('')).toBe('');
    });
  });
});

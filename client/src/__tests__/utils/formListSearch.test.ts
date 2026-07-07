import { describe, it, expect } from 'vitest';
import { matchesFormListSearch } from '@/utils/formListSearch';

describe('formListSearch', () => {
  describe('matchesFormListSearch', () => {
    it('should return true for empty query', () => {
      expect(matchesFormListSearch({ name: 'test' }, '')).toBe(true);
    });

    it('should match string fields', () => {
      expect(matchesFormListSearch({ name: 'Laptop' }, 'lap')).toBe(true);
    });

    it('should match nested fields', () => {
      expect(matchesFormListSearch({ asset: { name: 'Monitor' } }, 'moni')).toBe(true);
    });

    it('should match number fields', () => {
      expect(matchesFormListSearch({ quantity: 5 }, '5')).toBe(true);
    });

    it('should not match when query not found', () => {
      expect(matchesFormListSearch({ name: 'Laptop' }, 'xyz')).toBe(false);
    });

    it('should skip known binary/signature keys', () => {
      const data = { name: 'Laptop', digitalSignature: 'very-long-base64-string' };
      expect(matchesFormListSearch(data, 'base64')).toBe(false);
      expect(matchesFormListSearch(data, 'Laptop')).toBe(true);
    });

    it('should handle null values', () => {
      expect(matchesFormListSearch(null, 'test')).toBe(false);
    });

    it('should handle array fields', () => {
      expect(matchesFormListSearch({ items: ['Mouse', 'Keyboard'] }, 'key')).toBe(true);
    });
  });
});

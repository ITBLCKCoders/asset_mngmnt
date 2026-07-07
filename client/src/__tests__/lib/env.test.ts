import { describe, it, expect } from 'vitest';
import { getApiBase } from '@/lib/env';

describe('env', () => {
  describe('getApiBase', () => {
    it('should return VITE_API_BASE or default', () => {
      const base = getApiBase();
      expect(base).toBeDefined();
      expect(typeof base).toBe('string');
    });
  });
});

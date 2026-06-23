import { describe, it, expect } from 'vitest';
import { generateUUID } from '@/utils/uuid';

describe('uuid', () => {
  describe('generateUUID', () => {
    it('should generate a UUID string', () => {
      const uuid = generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
    });

    it('should generate unique values', () => {
      const uuids = Array.from({ length: 100 }, () => generateUUID());
      const unique = new Set(uuids);
      expect(unique.size).toBe(100);
    });
  });
});

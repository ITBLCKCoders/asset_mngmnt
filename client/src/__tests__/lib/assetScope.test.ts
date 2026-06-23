import { describe, it, expect } from 'vitest';
import { getAssetScope } from '@/lib/assetScope';

describe('assetScope', () => {
  describe('getAssetScope', () => {
    it('should return scope for user', () => {
      const scope = getAssetScope('it');
      expect(scope).toBeDefined();
    });
  });
});

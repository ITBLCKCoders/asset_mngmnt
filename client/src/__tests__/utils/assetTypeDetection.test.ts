import { describe, it, expect } from 'vitest';
import { isComputerAsset, isComponentAsset } from '@/utils/assetTypeDetection';

describe('assetTypeDetection', () => {
  describe('isComputerAsset', () => {
    it('should return true for laptop', () => {
      expect(isComputerAsset({ name: 'Laptop' }, 'laptop')).toBe(true);
    });

    it('should return false for component', () => {
      expect(isComputerAsset({ name: 'RAM' }, 'ram')).toBe(false);
    });

    it('should return false for null type', () => {
      expect(isComputerAsset({ name: 'Test' }, null)).toBe(false);
    });
  });

  describe('isComponentAsset', () => {
    it('should return true for component keyword', () => {
      expect(isComponentAsset('Monitor')).toBe(true);
    });

    it('should return false for computer keyword', () => {
      expect(isComponentAsset('Laptop')).toBe(false);
    });
  });
});

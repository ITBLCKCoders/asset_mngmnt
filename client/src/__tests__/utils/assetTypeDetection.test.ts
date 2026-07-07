import { describe, it, expect } from 'vitest';
import { isComputerTypeAsset } from '@/utils/assetTypeDetection';

describe('assetTypeDetection', () => {
  describe('isComputerTypeAsset', () => {
    it('should return true for laptop', () => {
      expect(isComputerTypeAsset({ id: '1', name: 'Laptop' })).toBe(true);
    });

    it('should return false for component', () => {
      expect(isComputerTypeAsset({ id: '2', name: 'RAM Module' })).toBe(false);
    });

    it('should return false for computer when name contains component keywords', () => {
      expect(isComputerTypeAsset({ id: '3', name: 'Monitor', type: 'Monitor' })).toBe(false);
    });

    it('should return true for computer via type field', () => {
      expect(isComputerTypeAsset({ id: '4', name: 'Asset', type: 'laptop' })).toBe(true);
    });

    it('should return false for unrelated asset', () => {
      expect(isComputerTypeAsset({ id: '5', name: 'Test', type: 'Printer' })).toBe(false);
    });
  });
});

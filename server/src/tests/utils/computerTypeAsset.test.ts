import { describe, it, expect } from '@jest/globals';

const { isComputerTypeName } = require('../../utils/computerTypeAsset.js');

describe('computerTypeAsset', () => {
  describe('isComputerTypeName', () => {
    it('should return true for laptop', () => {
      expect(isComputerTypeName('Laptop')).toBe(true);
    });

    it('should return true for desktop', () => {
      expect(isComputerTypeName('Desktop')).toBe(true);
    });

    it('should return true for "All in One"', () => {
      expect(isComputerTypeName('All in One')).toBe(true);
    });

    it('should return true for "Mini PC"', () => {
      expect(isComputerTypeName('Mini PC')).toBe(true);
    });

    it('should return true for "Workstation"', () => {
      expect(isComputerTypeName('Workstation')).toBe(true);
    });

    it('should return false for component keywords (RAM)', () => {
      expect(isComputerTypeName('RAM')).toBe(false);
    });

    it('should return false for component keywords (SSD)', () => {
      expect(isComputerTypeName('SSD')).toBe(false);
    });

    it('should return false for component keywords (Monitor)', () => {
      expect(isComputerTypeName('Monitor')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isComputerTypeName(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isComputerTypeName(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isComputerTypeName('')).toBe(false);
    });

    it('should handle mixed case', () => {
      expect(isComputerTypeName('NOTEBOOK')).toBe(true);
    });
  });
});

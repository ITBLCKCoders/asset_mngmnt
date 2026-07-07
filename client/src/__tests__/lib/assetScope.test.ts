import { describe, it, expect } from 'vitest';
import { classifyDepartmentScopeByName } from '@/lib/assetScope';

describe('assetScope', () => {
  describe('classifyDepartmentScopeByName', () => {
    it('should return IT for IT department', () => {
      expect(classifyDepartmentScopeByName('Information Technology')).toBe('IT');
    });

    it('should return Admin for admin scope', () => {
      expect(classifyDepartmentScopeByName('Admin')).toBe('Admin');
    });

    it('should return Other for unrelated scope', () => {
      expect(classifyDepartmentScopeByName('HR')).toBe('Other');
    });
  });
});

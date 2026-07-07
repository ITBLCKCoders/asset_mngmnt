import { describe, it, expect } from 'vitest';
import { auditFieldLabel, AUDIT_FIELD_LABELS } from '@/utils/auditFieldLabels';

describe('auditFieldLabels', () => {
  describe('AUDIT_FIELD_LABELS', () => {
    it('should contain expected field labels', () => {
      expect(AUDIT_FIELD_LABELS.name).toBe('Name');
      expect(AUDIT_FIELD_LABELS.status).toBe('Status');
      expect(AUDIT_FIELD_LABELS.category_id).toBe('Category');
    });
  });

  describe('auditFieldLabel', () => {
    it('should return label for known key', () => {
      expect(auditFieldLabel('name')).toBe('Name');
    });

    it('should fallback to humanized key for unknown key', () => {
      expect(auditFieldLabel('unknown_field')).toBe('unknown field');
    });

    it('should handle empty string', () => {
      expect(auditFieldLabel('')).toBe('');
    });
  });
});

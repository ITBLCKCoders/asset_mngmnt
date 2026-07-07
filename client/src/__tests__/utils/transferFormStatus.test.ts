import { describe, it, expect } from 'vitest';
import {
  getTransferFormUiStatus,
  formatTransferFormUiStatus,
} from '@/utils/transferFormStatus';

describe('transferFormStatus', () => {
  describe('getTransferFormUiStatus', () => {
    it('should return declined when declined_at is set', () => {
      expect(getTransferFormUiStatus({ declined_at: '2026-01-01' })).toBe('declined');
    });

    it('should return completed when executed_at is set', () => {
      expect(getTransferFormUiStatus({ executed_at: '2026-01-02' })).toBe('completed');
    });

    it('should return completed when all returns have return_id', () => {
      expect(getTransferFormUiStatus({
        returns: [{ return_id: 'r1' }, { return_id: 'r2' }],
      })).toBe('completed');
    });

    it('should return approved when dept_head_signed_at is set', () => {
      expect(getTransferFormUiStatus({ dept_head_signed_at: '2026-01-03' })).toBe('approved');
    });

    it('should return pending otherwise', () => {
      expect(getTransferFormUiStatus({})).toBe('pending');
    });

    it('should return pending when returns array has empty strings', () => {
      expect(getTransferFormUiStatus({
        returns: [{ return_id: '' }, { return_id: null }],
      })).toBe('pending');
    });
  });

  describe('formatTransferFormUiStatus', () => {
    it('should format declined', () => {
      expect(formatTransferFormUiStatus('declined')).toBe('Declined');
    });

    it('should format completed as Transferred', () => {
      expect(formatTransferFormUiStatus('completed')).toBe('Transferred');
    });

    it('should format approved', () => {
      expect(formatTransferFormUiStatus('approved')).toBe('Approved');
    });

    it('should format pending', () => {
      expect(formatTransferFormUiStatus('pending')).toBe('Pending');
    });
  });
});

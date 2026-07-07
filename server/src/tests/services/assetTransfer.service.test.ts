import { describe, it, expect } from '@jest/globals';

describe('AssetTransferService (re-export barrel)', () => {
  const service = require('../../services/assetTransfer.service.js');

  describe('re-exports from transferFormNumber utils', () => {
    it('should export generateTransferFormNumber', () => {
      expect(service.generateTransferFormNumber).toBeDefined();
      expect(typeof service.generateTransferFormNumber).toBe('function');
    });

    it('should export generateTransferFormNumberFallback', () => {
      expect(service.generateTransferFormNumberFallback).toBeDefined();
      expect(typeof service.generateTransferFormNumberFallback).toBe('function');
    });
  });

  describe('re-exports from assetTransferForm repository', () => {
    it('should export toBind', () => {
      expect(service.toBind).toBeDefined();
      expect(typeof service.toBind).toBe('function');
    });

    it('should export getTransferFormLinksForReturnForms', () => {
      expect(service.getTransferFormLinksForReturnForms).toBeDefined();
      expect(typeof service.getTransferFormLinksForReturnForms).toBe('function');
    });

    it('should export getTransferFormByReturnFormId', () => {
      expect(service.getTransferFormByReturnFormId).toBeDefined();
      expect(typeof service.getTransferFormByReturnFormId).toBe('function');
    });

    it('should export getTransferFormIdsByReturnFormId', () => {
      expect(service.getTransferFormIdsByReturnFormId).toBeDefined();
      expect(typeof service.getTransferFormIdsByReturnFormId).toBe('function');
    });

    it('should export getTransferFormAssignments', () => {
      expect(service.getTransferFormAssignments).toBeDefined();
      expect(typeof service.getTransferFormAssignments).toBe('function');
    });
  });
});

import { describe, it, expect } from 'vitest';

const pdfGenerator = await import('@/lib/pdfGenerator');

describe('pdfGenerator index', () => {
  it('should export all PDF generators', () => {
    expect(pdfGenerator.generateAssetBorrowingPdf).toBeDefined();
    expect(pdfGenerator.generateAssetChecklistPdf).toBeDefined();
    expect(pdfGenerator.generateAssetReturnPdf).toBeDefined();
    expect(pdfGenerator.generateAssetTransferPdf).toBeDefined();
    expect(pdfGenerator.generateDashboardPdf).toBeDefined();
    expect(typeof pdfGenerator.generateAssetBorrowingPdf).toBe('function');
  });
});

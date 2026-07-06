import { describe, it, expect } from 'vitest';

const pdfGenerator = await import('@/lib/pdfGenerator');

describe('pdfGenerator index', () => {
  it('should export all PDF generators', () => {
    expect(pdfGenerator.generateAssetBorrowingPDF).toBeDefined();
    expect(pdfGenerator.generateAssetChecklistPDF).toBeDefined();
    expect(pdfGenerator.generateAssetReturnPDF).toBeDefined();
    expect(pdfGenerator.generateAssetTransferPDF).toBeDefined();
    expect(pdfGenerator.generateDashboardPDF).toBeDefined();
    expect(typeof pdfGenerator.generateAssetBorrowingPDF).toBe('function');
  });
});

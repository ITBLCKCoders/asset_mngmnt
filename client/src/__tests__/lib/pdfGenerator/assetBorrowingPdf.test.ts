import { describe, it, expect, vi } from 'vitest';

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addImage: vi.fn().mockReturnThis(),
    addFont: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
  })),
  __esModule: true,
}));

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { generateAssetBorrowingPdf } from '@/lib/pdfGenerator/assetBorrowingPdf';

describe('assetBorrowingPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      formNumber: 'BR-001',
      borrowerName: 'John Doe',
      department: 'IT',
      borrowDate: '2026-01-15',
      expectedReturnDate: '2026-02-15',
      items: [{ assetName: 'Laptop', serial: 'S123', notes: 'Good condition' }],
      purpose: 'Testing',
      status: 'Approved',
    };
    await expect(generateAssetBorrowingPdf(data)).resolves.toBeDefined();
  });

  it('should handle empty items', async () => {
    const data = {
      formNumber: 'BR-002',
      borrowerName: 'Jane',
      department: 'HR',
      borrowDate: '2026-01-15',
      expectedReturnDate: '2026-02-15',
      items: [],
      purpose: '',
      status: 'Pending',
    };
    await expect(generateAssetBorrowingPdf(data)).resolves.toBeDefined();
  });
});

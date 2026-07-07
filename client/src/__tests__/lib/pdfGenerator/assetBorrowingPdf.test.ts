import { describe, it, expect, vi } from 'vitest';

vi.mock('jspdf', () => {
  const jsPDF = vi.fn(function () {
    return {
      setFontSize: vi.fn().mockReturnThis(),
      setTextColor: vi.fn().mockReturnThis(),
      setDrawColor: vi.fn().mockReturnThis(),
      setFillColor: vi.fn().mockReturnThis(),
      setFont: vi.fn().mockReturnThis(),
      setLineWidth: vi.fn().mockReturnThis(),
      setPage: vi.fn().mockReturnThis(),
      setProperties: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      rect: vi.fn().mockReturnThis(),
      line: vi.fn().mockReturnThis(),
      addPage: vi.fn().mockReturnThis(),
      addImage: vi.fn().mockReturnThis(),
      addFont: vi.fn().mockReturnThis(),
      splitTextToSize: vi.fn(() => ['']),
      getTextWidth: vi.fn(() => 10),
      output: vi.fn(() => new Blob()),
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    };
  });
  return { jsPDF, default: jsPDF };
});

vi.mock('jspdf-autotable', () => ({ default: vi.fn((doc: any) => { doc.lastAutoTable = { finalY: 100 }; }) }));

import { generateAssetBorrowingPDF } from '@/lib/pdfGenerator/assetBorrowingPdf';

describe('assetBorrowingPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      formNumber: 'BR-001',
      title: 'IT Equipment Borrowing',
      borrowerName: 'John Doe',
      borrowerDepartment: 'IT',
      equipmentName: 'Laptop',
      serialNumber: 'S123',
      preUsageCondition: 'Good',
      borrowingDate: '2026-01-15',
      expectedReturnDate: '2026-02-15',
      purpose: 'Testing',
      requestedBy: 'John Doe',
      itReceivedBy: 'IT Staff',
      itApprovedBy: 'IT Manager',
      postUsageCondition: 'Good',
    };
    await expect(generateAssetBorrowingPDF(data)).resolves.toBeDefined();
  });

  it('should handle empty items', async () => {
    const data = {
      formNumber: 'BR-002',
      title: 'Admin Equipment Borrowing',
      borrowerName: 'Jane',
      borrowerDepartment: 'HR',
      equipmentName: 'Monitor',
      serialNumber: '',
      preUsageCondition: '',
      borrowingDate: null,
      expectedReturnDate: null,
      purpose: '',
      requestedBy: 'Jane',
      itReceivedBy: 'Admin',
      itApprovedBy: 'Admin Manager',
      postUsageCondition: '',
    };
    await expect(generateAssetBorrowingPDF(data)).resolves.toBeDefined();
  });
});

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

import { generateAssetTransferPdf } from '@/lib/pdfGenerator/assetTransferPdf';

describe('assetTransferPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      formNumber: 'TF-001',
      transferDate: '2026-01-20',
      fromPerson: 'John Doe',
      toPerson: 'Jane Smith',
      department: 'IT',
      items: [{ assetName: 'Laptop', serial: 'S123' }],
      approvedBy: 'Manager',
    };
    await expect(generateAssetTransferPdf(data)).resolves.toBeDefined();
  });
});

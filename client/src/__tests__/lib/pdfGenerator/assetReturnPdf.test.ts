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

import { generateAssetReturnPdf } from '@/lib/pdfGenerator/assetReturnPdf';

describe('assetReturnPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      formNumber: 'RT-001',
      assigneeName: 'John Doe',
      department: 'IT',
      returnDate: '2026-02-15',
      items: [{ assetName: 'Laptop', serial: 'S123', condition: 'Good', remarks: '' }],
      receivedBy: 'Admin',
    };
    await expect(generateAssetReturnPdf(data)).resolves.toBeDefined();
  });
});

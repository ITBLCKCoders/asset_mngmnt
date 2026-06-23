import { describe, it, expect, vi } from 'vitest';

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  })),
  __esModule: true,
}));

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { generateAssetChecklistPdf } from '@/lib/pdfGenerator/assetChecklistPdf';

describe('assetChecklistPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      formNumber: 'CL-001',
      assigneeName: 'John Doe',
      department: 'IT',
      items: [{ name: 'Laptop', status: 'Good', remarks: '' }],
      preparedBy: 'Admin',
      notedBy: 'Manager',
    };
    await expect(generateAssetChecklistPdf(data)).resolves.toBeDefined();
  });
});

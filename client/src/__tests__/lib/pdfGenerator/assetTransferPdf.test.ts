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

import { generateAssetTransferPDF } from '@/lib/pdfGenerator/assetTransferPdf';

describe('assetTransferPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
      assets: [{ id: 'ast-1', code: 'LAP-001', name: 'Laptop', serialNo: 'S123' }],
      department: { id: 'dept-1', name: 'IT' },
      location: { id: 'loc-1', name: 'Main Office', floor_unit: '2F', building: 'Bldg A' },
      created_at: '2026-03-01',
    };
    await expect(generateAssetTransferPDF(data)).resolves.toBeDefined();
  });
});

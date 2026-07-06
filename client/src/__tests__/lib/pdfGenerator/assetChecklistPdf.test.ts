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

import { generateAssetChecklistPDF } from '@/lib/pdfGenerator/assetChecklistPdf';

describe('assetChecklistPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      id: 'test-id',
      assignment_id: 'assign-1',
      employee_id: 'emp-1',
      employee_name: 'John Doe',
      checklist_data: null,
      created_at: new Date().toISOString(),
      form_number: 'CL-001',
      employee_department: 'IT',
      type_onboarding: true,
      type_offboarding: false,
    };
    await expect(generateAssetChecklistPDF(data)).resolves.toBeDefined();
  });
});

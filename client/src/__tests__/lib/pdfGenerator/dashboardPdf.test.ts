import { describe, it, expect, vi } from 'vitest';

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    addImage: vi.fn().mockReturnThis(),
  })),
  __esModule: true,
}));

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { generateDashboardPdf } from '@/lib/pdfGenerator/dashboardPdf';

describe('dashboardPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      title: 'Asset Dashboard Report',
      generatedAt: '2026-06-23',
      stats: { totalAssets: 100, assigned: 60, available: 30, maintenance: 10 },
    };
    await expect(generateDashboardPdf(data)).resolves.toBeDefined();
  });
});

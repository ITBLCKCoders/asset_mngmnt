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

import { generateDashboardPDF } from '@/lib/pdfGenerator/dashboardPdf';
import type { DashboardData, AuditLogItem } from '@/pages/dashboard/dashboard';

describe('dashboardPdf', () => {
  it('should generate PDF without error', async () => {
    const data: DashboardData = {
      stats: { totalAssets: 100, activeAssignments: 60, availableAssets: 30, deployedAssets: 20, underMaintenance: 5, forDisposal: 2, assetReturnsCount: 0, borrowRequestsCount: 0, pendingReturnCount: 0, pendingTransferCount: 0, disposedAssets: 0, borrowedAssets: 0, underRepair: 0, transferedAssets: 0, returnedAssets: 0, forMaintenance: 0, forRepair: 0 },
      assetByType: [],
      movement: { weekly: [], monthly: [] },
      statusDistribution: [],
    };
    const auditLogs: AuditLogItem[] = [];
    await expect(generateDashboardPDF(data, 'Test Corp', auditLogs, 'weekly')).resolves.toBeDefined();
  });
});

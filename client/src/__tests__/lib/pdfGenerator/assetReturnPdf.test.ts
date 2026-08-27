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

import {
  generateAssetReturnPDF,
  formatSignedDate,
  formatSignedTime,
} from '@/lib/pdfGenerator/assetReturnPdf';

describe('assetReturnPdf', () => {
  it('should generate PDF without error', async () => {
    const data = {
      assignmentID: 'ASN-001',
      assets: [{ id: 'ast-1', code: 'LAP-001', name: 'Laptop', category: 'Electronics', type: 'Laptop', serialNo: 'S123' }],
      user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
      department: { id: 'dept-1', name: 'IT' },
      location: { id: 'loc-1', name: 'Main Office', floor_unit: '2F', building: 'Bldg A' },
      assigned_date: '2025-01-15',
      expected_return_date: '2026-02-15',
      actual_return_date: '2026-02-15',
      assignment_notes: 'Routine return',
      status: 'Returned',
      assigned_by: { id: 'u2', first_name: 'Admin', last_name: 'User' },
      returnCondition: 'Good',
      returnNotes: '',
    };
    await expect(generateAssetReturnPDF(data)).resolves.toBeDefined();
  });

  it('should generate PDF with all signature timestamps populated', async () => {
    const data = {
      assignmentID: 'ASN-001',
      assets: [{ id: 'ast-1', code: 'LAP-001', name: 'Laptop', category: 'Electronics', type: 'Laptop', serialNo: 'S123' }],
      user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
      department: { id: 'dept-1', name: 'IT' },
      location: { id: 'loc-1', name: 'Main Office', floor_unit: '2F', building: 'Bldg A' },
      assigned_date: '2025-01-15',
      expected_return_date: '2026-02-15',
      actual_return_date: '2026-02-15',
      assignment_notes: 'Routine return',
      status: 'Returned',
      assigned_by: { id: 'u2', first_name: 'Admin', last_name: 'User' },
      returnCondition: 'Good',
      returnNotes: '',
      signed_at: '2026-02-15T09:30:00',
      process_signed_at: '2026-02-15T10:00:00',
      dept_head_signed_at: '2026-02-15T11:00:00',
      it_manager_signed_at: '2026-02-15T12:00:00',
    };
    await expect(generateAssetReturnPDF(data)).resolves.toBeDefined();
  });

  it('should format signed date as MM/DD/YYYY', () => {
    expect(formatSignedDate('2026-02-15T09:30:00')).toBe('02/15/2026');
  });

  it('should format signed time as 12-hour with AM/PM', () => {
    expect(formatSignedTime('2026-02-15T15:45:00')).toBe('03:45 PM');
  });

  it('should return empty string for null or invalid timestamps', () => {
    expect(formatSignedDate(null)).toBe('');
    expect(formatSignedDate(undefined)).toBe('');
    expect(formatSignedDate('not-a-date')).toBe('');
    expect(formatSignedTime(null)).toBe('');
    expect(formatSignedTime(undefined)).toBe('');
    expect(formatSignedTime('not-a-date')).toBe('');
  });
});

'use client';

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  addCompanyLogoToPDF,
  getCompanyAccentColor,
  isBlackCoders,
  downloadPDF,
} from '@/lib/pdfGenerator/shared';

export interface MovementRow {
  assetCode: string;
  assetName: string;
  oldOwner: string;
  newOwner: string;
  oldAccountabilityFormNo: string | null;
  newAccountabilityFormNo: string | null;
  date: string;
  movementType: 'Transfer' | 'Return';
  transferFormNumber?: string | null;
  returnFormNumber?: string | null;
}

interface ExportFilters {
  fromDate: string;
  toDate: string;
  accountabilityFormNo: string;
  assetCode: string;
}

export function useAssetMovementExport() {
  const { user: currentUser } = useCurrentUser();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);
  const [exportStep, setExportStep] = useState<1 | 2>(1);
  const [filters, setFilters] = useState<ExportFilters>({
    fromDate: '',
    toDate: '',
    accountabilityFormNo: '',
    assetCode: '',
  });

  const handleExportClick = useCallback((type: 'pdf' | 'excel') => {
    setExportType(type);
    setExportStep(1);
    setIsExportDialogOpen(true);
  }, []);

  const handleExportConfirm = useCallback(async () => {
    if (!exportType) {
      toast.error('Please select export format');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append('from', filters.fromDate);
      if (filters.toDate) params.append('to', filters.toDate);
      if (filters.accountabilityFormNo) params.append('formNumber', filters.accountabilityFormNo);
      if (filters.assetCode) params.append('assetCode', filters.assetCode);

      const response = await api.get<{ data: MovementRow[] }>(`/asset-movements/my?${params.toString()}`);
      const movements = response.data ?? [];

      if (movements.length === 0) {
        toast.info('No movements found for the selected filters');
        return;
      }

      const company = await api.get<{ data?: any[] }>('/companies/my').then(r => r.data?.[0] ?? null);
      const companyBranding = company ? { name: company.name, logo_url: company.logo_url } : null;
      const accentColor = getCompanyAccentColor(companyBranding?.name);
      const headerFillColor: [number, number, number] = isBlackCoders(companyBranding?.name)
        ? [0, 0, 0]
        : [accentColor.r, accentColor.g, accentColor.b];
      const headerTextColor: [number, number, number] = [255, 255, 255];

      const exportBy = currentUser?.name || currentUser?.username || 'Unknown User';
      const exportDate = new Date().toLocaleString();
      const pageWidth = 297; // A4 landscape width in mm
      const margin = 14;

      const drawHeader = async (doc: jsPDF) => {
        await addCompanyLogoToPDF(doc, companyBranding?.logo_url, margin, 11, 45, 16);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Summary Report Asset Movement', pageWidth / 2, 16, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Export by: ${exportBy}`, pageWidth - margin, 11, { align: 'right' });
        doc.text(`Date: ${exportDate}`, pageWidth - margin, 16, { align: 'right' });
        if (filters.fromDate || filters.toDate) {
          const range = `Period: ${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`;
          doc.text(range, margin, 26);
        }
      };

      if (exportType === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        await drawHeader(doc);

        const drawFooter = () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text('Summary Report Asset Movement', margin, pageHeight - 8);
          doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
          doc.text(`Export by: ${exportBy} | ${exportDate}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        };

        const tableData = movements.map(m => [
          m.assetCode,
          m.assetName,
          m.oldOwner,
          m.newOwner,
          m.oldAccountabilityFormNo || '',
          m.newAccountabilityFormNo || '',
          m.movementType,
          new Date(m.date).toLocaleDateString(),
        ]);

        autoTable(doc, {
          startY: 34,
          head: [['Asset Code', 'Asset Name', 'Old Owner', 'New Owner', 'Old Form No', 'New Form No', 'Type', 'Date']],
          body: tableData,
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
          didDrawPage: drawFooter,
          margin: { left: margin, right: margin },
        });

        const blob = doc.output('blob');
        downloadPDF(blob, `Asset_Movement_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF exported successfully');
      } else {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Asset Movements');

        // Header rows
        sheet.addRow(['Summary Report Asset Movement']);
        sheet.addRow([`Export by: ${exportBy}`, `Date: ${exportDate}`]);
        if (filters.fromDate || filters.toDate) {
          sheet.addRow([`Period: ${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`]);
        }
        sheet.addRow([]);

        // Column headers
        const headerRow = sheet.addRow([
          'Asset Code',
          'Asset Name',
          'Old Owner',
          'New Owner',
          'Old Accountability Form No',
          'New Accountability Form No',
          'Movement Type',
          'Date',
        ]);

        headerRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isBlackCoders(companyBranding?.name) ? 'FF000000' : `FF${accentColor.r.toString(16).padStart(2, '0')}${accentColor.g.toString(16).padStart(2, '0')}${accentColor.b.toString(16).padStart(2, '0')}` },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        for (const m of movements) {
          const row = sheet.addRow([
            m.assetCode,
            m.assetName,
            m.oldOwner,
            m.newOwner,
            m.oldAccountabilityFormNo || '',
            m.newAccountabilityFormNo || '',
            m.movementType,
            new Date(m.date).toLocaleDateString(),
          ]);
          row.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle' };
          });
        }

        // Auto-fit columns
        sheet.columns.forEach(col => {
          col.width = Math.min(Math.max(col.width || 15, 15), 40);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Asset_Movement_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Excel exported successfully');
      }

      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export asset movements');
    }
  }, [exportType, filters, currentUser]);

  const handleFilterChange = useCallback((field: keyof ExportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePrevStep = useCallback(() => {
    setExportStep(1);
  }, []);

  const resetDialog = useCallback(() => {
    setIsExportDialogOpen(false);
    setExportType(null);
    setExportStep(1);
  }, []);

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportType,
    setExportType,
    exportStep,
    setExportStep,
    filters,
    setFilters,
    handleExportClick,
    handleExportConfirm,
    handleFilterChange,
    handlePrevStep,
    resetDialog,
  };
}
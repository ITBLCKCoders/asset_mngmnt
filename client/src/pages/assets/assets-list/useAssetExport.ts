'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { Asset } from './assetsComponents/assetTable/assetData';
import { Company } from './useAssetsData';

/**
 * Trigger a browser download for an ExcelJS-generated .xlsx buffer. ExcelJS
 * (unlike xlsx) doesn't ship a browser-side `writeFile`, so we wrap the
 * Blob+anchor dance once for reuse.
 */
async function downloadXlsx(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const useAssetExport = () => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set([
      'id',
      'name',
      'category',
      'type',
      'serialNo',
      'brand',
      'modelNo',
      'status',
      'assignedTo',
      'location',
      'purchasePrice',
      'purchaseDate',
    ])
  );

  const availableColumns = [
    { key: 'id', label: 'Asset Code' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    { key: 'serialNo', label: 'Serial No' },
    { key: 'brand', label: 'Brand' },
    { key: 'modelNo', label: 'Model' },
    { key: 'status', label: 'Status' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'purchasePrice', label: 'Purchase Price' },
    { key: 'purchaseDate', label: 'Purchase Date' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'warranty', label: 'Warranty' },
    { key: 'documents', label: 'Documents (count)' },
    { key: 'maintenanceSchedule', label: 'Maintenance Schedule' },
    { key: 'lastMaintenanceDate', label: 'Last Maintenance Date' },
    { key: 'nextMaintenanceDate', label: 'Next Maintenance Date' },
    { key: 'condition', label: 'Condition' },
    { key: 'usefulLifeYears', label: 'Useful Life (Years)' },
    { key: 'salvageValue', label: 'Salvage Value' },
    { key: 'depreciationMethod', label: 'Depreciation Method' },
    { key: 'annualDepreciation', label: 'Annual Depreciation' },
    { key: 'depreciationStartDate', label: 'Depreciation Start Date' },
    { key: 'company', label: 'Company' },
    { key: 'building', label: 'Building' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'createdAt', label: 'Date Created' },
    { key: 'updatedBy', label: 'Updated By' },
    { key: 'updatedAt', label: 'Last Updated' },
  ];

  const getExportValue = (
    asset: Asset,
    colKey: string,
    format: 'pdf' | 'excel'
  ): string | number => {
    const a = asset as any;
    let value = a[colKey];
    if (colKey === 'assignedTo' && !value && a.currentAssignment?.user?.name) {
      value = a.currentAssignment.user.name;
    }
    if (colKey === 'documents') {
      const docs = a.documents;
      return Array.isArray(docs) ? docs.length : 0;
    }
    const dateKeys = [
      'purchaseDate',
      'lastMaintenanceDate',
      'nextMaintenanceDate',
      'depreciationStartDate',
      'createdAt',
      'updatedAt',
    ];
    if (dateKeys.includes(colKey) && value) {
      const d = value instanceof Date ? value : new Date(value);
      return !isNaN(d.getTime()) ? d.toLocaleDateString() : '';
    }
    if (colKey === 'purchasePrice' && value)
      return format === 'pdf'
        ? `PHP ${value.toLocaleString()}`
        : formatCurrency(value);
    if (colKey === 'salvageValue' && value)
      return format === 'pdf'
        ? `PHP ${value.toLocaleString()}`
        : formatCurrency(value);
    if (colKey === 'annualDepreciation' && value)
      return format === 'pdf'
        ? `PHP ${value.toLocaleString()}`
        : formatCurrency(value);
    return value ?? '';
  };

  const exportToPDF = async (
    assets: Asset[],
    activeCompany: Company | null
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const doc = new jsPDF('l', 'mm', [330, 216]); // landscape long bond paper (8.5x13 inches)

    let currentY = 14;

    // Add report title with logo on the left
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    const logoMaxHeight = 20;
    const logoX = 14;
    let titleX = 14;

    if (activeCompany?.logo_url) {
      try {
        // Load the image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = activeCompany.logo_url!;
        });

        // Calculate logo dimensions (maintain aspect ratio, max height)
        const aspectRatio = img.width / img.height;
        const imgHeight = Math.min(logoMaxHeight, img.height);
        const imgWidth = imgHeight * aspectRatio;

        // Convert image to canvas for jsPDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', logoX, currentY - 2, imgWidth, imgHeight);

        // Position title to the right of logo
        titleX = logoX + imgWidth + 10;
      } catch (error) {
        console.error('Error loading company logo:', error);
        // Use default title position if logo fails
        titleX = 14;
      }
    }

    // Add report title next to logo
    doc.text('Asset List Report', titleX, currentY + 8);

    currentY += 8;

    // Prepare table data with selected columns
    const tableData = assets.map(asset => {
      return selectedCols.map(col =>
        String(getExportValue(asset, col.key, 'pdf'))
      );
    });

    // Calculate column widths dynamically
    const totalWidth = 320; // Available width minus margins
    const columnWidth = totalWidth / selectedCols.length;

    const columnStyles: any = {};
    selectedCols.forEach((_, index) => {
      columnStyles[index] = { cellWidth: columnWidth };
    });

    // Add table
    autoTable(doc, {
      head: [selectedCols.map(col => col.label)],
      body: tableData,
      startY: currentY + 18,
      styles: {
        fontSize: Math.max(5, 8 - selectedCols.length * 0.2),
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [220, 53, 69],
        fontSize: Math.max(6, 9 - selectedCols.length * 0.2),
      }, // Red header
      columnStyles,
      margin: { left: 5, right: 5 },
    });

    // Add footer with generation date and time
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const footerText = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(footerText, 14, pageHeight - 10);

    // Save the PDF
    doc.save('asset_list.pdf');
    toast.success('PDF exported successfully');
    setIsExportDialogOpen(false);
  };

  const exportToExcel = async (
    assets: Asset[],
    activeCompany: Company | null
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const workbook = new ExcelJS.Workbook();

    // Optional company-info sheet
    if (activeCompany) {
      const companySheet = workbook.addWorksheet('Company Info');
      companySheet.addRows([
        ['Company Information'],
        ['Company Name', activeCompany.name],
        ['Company Code', activeCompany.code],
        ['Email', activeCompany.email],
        ['Logo URL', activeCompany.logo_url || 'N/A'],
        [''],
        ['Asset List Report'],
        ['Generated on', new Date().toLocaleDateString()],
      ]);
    }

    // Assets sheet — header row + data rows derived from selected columns.
    const assetsSheet = workbook.addWorksheet('Assets');
    assetsSheet.columns = selectedCols.map(col => ({
      header: col.label,
      key: col.key,
      width: 18,
    }));
    assets.forEach(asset => {
      const row: Record<string, string | number> = {};
      selectedCols.forEach(col => {
        row[col.key] = getExportValue(asset, col.key, 'excel');
      });
      assetsSheet.addRow(row);
    });

    await downloadXlsx(workbook, 'asset_list.xlsx');
    toast.success('Excel exported successfully');
    setIsExportDialogOpen(false);
  };

  const handleExportClick = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setIsExportDialogOpen(true);
  };

  const handleColumnToggle = (columnKey: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnKey)) {
      newSelected.delete(columnKey);
    } else {
      newSelected.add(columnKey);
    }
    setSelectedColumns(newSelected);
  };

  const handleExportConfirm = async (
    assets: Asset[],
    activeCompany: Company | null
  ) => {
    if (exportType === 'pdf') {
      await exportToPDF(assets, activeCompany);
    } else if (exportType === 'excel') {
      await exportToExcel(assets, activeCompany);
    }
  };

  return {
    isExportDialogOpen,
    exportType,
    selectedColumns,
    availableColumns,
    handleExportClick,
    handleColumnToggle,
    handleExportConfirm,
    setIsExportDialogOpen,
  };
};

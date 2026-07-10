'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Asset } from './assetsComponents/assetTable/assetData';
import type { Company } from '@/types/assets.d';
import type { AssetResponseDto } from '@/types/assetsDTOs';
import {
  addCompanyLogoToPDF,
  getCompanyAccentColor,
  isBlackCoders,
} from '@/lib/pdfGenerator/shared';

/**
 * Fetch ALL assets matching the given filters (bypasses table pagination).
 */
async function fetchAllAssets(
  companyId?: string | null,
  scope?: string | null,
): Promise<Asset[]> {
  const params = new URLSearchParams({ limit: '-1' });
  if (companyId) params.append('companyId', companyId);
  if (scope) params.append('scope', scope);

  const res = await api.get<{ assets: AssetResponseDto[] }>(
    `/assets?${params.toString()}`,
  );

  return (res.assets ?? []).map(mapDtoToAsset);
}

function mapDtoToAsset(dto: AssetResponseDto): Asset {
  const createdAtParsed = dto.created_at
    ? new Date(
        dto.created_at.replace(' ', 'T') +
          (dto.created_at.includes('Z') ? '' : 'Z'),
      )
    : new Date();

  const nextMaintenanceDate = dto.next_maintenance_date
    ? new Date(dto.next_maintenance_date)
    : null;

  const lastMaintenanceDate = dto.last_maintenance_date
    ? new Date(dto.last_maintenance_date)
    : null;

  return {
    id: dto.asset_code,
    assetID: dto.assetID,
    name: dto.name,
    image: dto.image_url || '',
    description: dto.description || '',
    category: dto.category_name || dto.category_id || '',
    categoryId: dto.category_id || '',
    type: dto.type_name || dto.type_id || '',
    typeId: dto.type_id || '',
    serialNo: dto.serial || '',
    modelNo: dto.model || '',
    brand: dto.brand || '',
    status:
      dto.status === 'In Use' ? 'Assigned' : dto.status || 'Available',
    transferred_out: Boolean(dto.transferred_out),
    transferred_to_company_name: dto.transferred_to_company_name ?? null,
    assignedTo: dto.currentAssignment?.user?.name || '',
    department:
      dto.currentAssignment?.department ||
      (dto.department ? JSON.parse(dto.department).name : '') ||
      '',
    location:
      dto.currentAssignment?.location ||
      `${dto.location_name || ''}${dto.room_name ? ` - ${dto.room_name}` : ''}`,
    currentAssignment: dto.currentAssignment ?? undefined,
    assignmentHistory: dto.assignmentHistory,
    builderHistory: dto.builderHistory ?? undefined,
    purchaseDate: dto.purchase_date ? new Date(dto.purchase_date) : null,
    purchasePrice: dto.asset_value || 0,
    supplier: dto.supplier || '',
    warranty: dto.warranty_months
      ? `${dto.warranty_months} months`
      : null,
    warranty_months: dto.warranty_months || null,
    documents: dto.documents || [],
    maintenanceSchedule: dto.maintenance_schedule || 'None',
    lastMaintenanceDate:
      lastMaintenanceDate && !Number.isNaN(lastMaintenanceDate.getTime())
        ? lastMaintenanceDate
        : null,
    nextMaintenanceDate:
      nextMaintenanceDate && !Number.isNaN(nextMaintenanceDate.getTime())
        ? nextMaintenanceDate
        : createdAtParsed,
    condition: (dto.condition as Asset['condition']) || 'Good',
    usefulLifeYears: dto.useful_life_years || 0,
    salvageValue: dto.salvage_value || 0,
    depreciationMethod: dto.depreciation_method || '',
    annualDepreciation: dto.annual_depreciation || 0,
    depreciationStartDate: dto.depreciation_start_date
      ? new Date(dto.depreciation_start_date)
      : null,
    company: dto.company_name || '',
    company_id: dto.company_id || '',
    building: dto.building || '',
    createdAt: createdAtParsed,
    createdBy: dto.created_by_name || dto.created_by || '',
    updatedAt: dto.updated_at
      ? new Date(dto.updated_at)
      : new Date(dto.created_at),
    updatedBy: dto.updated_by_name || dto.updated_by || '',
  };
}

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
      return formatCurrency(value);
    if (colKey === 'salvageValue' && value)
      return formatCurrency(value);
    if (colKey === 'annualDepreciation' && value)
      return formatCurrency(value);
    return value ?? '';
  };

  const exportToPDF = async (
    assets: Asset[],
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    assetBuilders?: any[] | null
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const doc = new jsPDF('l', 'mm', [330, 216]); // landscape long bond paper (8.5x13 inches)

    // Add company logo using shared utility
    await addCompanyLogoToPDF(doc, activeCompany?.logo_url, 14, 12);

    // Center the report title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset List Report', 165, 25, { align: 'center' });

    // Add total asset count below title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Assets: ${assets.length}`, 165, 32, { align: 'center' });

    let currentY = 35;

    // Prepare table data with selected columns
    // Process assets with builder grouping logic (same as Excel)
    const flattenedAssets: (Asset & { isChild?: boolean; builderName?: string })[] = [];
    const processedAssetIds = new Set<string>();
    const builderGroups: { name: string; startIndex: number; endIndex: number }[] = [];

    // Process builders first
    if (assetBuilders && assetBuilders.length > 0) {
      assetBuilders.forEach(builder => {
        if (!builder.items || !Array.isArray(builder.items)) return;

        // Mark builder ID as processed to exclude parent asset
        processedAssetIds.add(builder.builderID);

        // Sort builder items by last 5 digits of asset code
        const sortedItems = [...builder.items].sort((a: any, b: any) => {
          const aCode = a.asset_code || '';
          const bCode = b.asset_code || '';
          const aLast5 = aCode.slice(-5);
          const bLast5 = bCode.slice(-5);
          const aNum = parseInt(aLast5, 10) || 0;
          const bNum = parseInt(bLast5, 10) || 0;
          return aNum - bNum;
        });

        // Record the start index for this builder group
        const groupStartIndex = flattenedAssets.length;

        // Add builder items as children
        sortedItems.forEach((item: any) => {
          const matchingAsset = assets.find(a => a.id === item.asset_code);
          if (matchingAsset) {
            // Exclude parent assets (those with CMTH-ITOFE-LAP- prefix) from being marked as children
            const isParentAsset = item.asset_code.startsWith('CMTH-ITOFE-LAP-');
            if (!isParentAsset) {
              flattenedAssets.push({ 
                ...matchingAsset, 
                isChild: true,
                builderName: builder.builderName 
              } as Asset & { isChild?: boolean; builderName?: string });
              processedAssetIds.add(item.asset_code);
            } else {
              // Parent asset is added as normal (not italic)
              flattenedAssets.push(matchingAsset);
              processedAssetIds.add(item.asset_code);
            }
          }
        });

        // Record the end index for this builder group
        const groupEndIndex = flattenedAssets.length - 1;
        if (groupStartIndex <= groupEndIndex) {
          builderGroups.push({
            name: builder.builderName,
            startIndex: groupStartIndex,
            endIndex: groupEndIndex,
          });
        }
      });
    }

    // Add remaining assets that are not part of any builder
    assets.forEach(asset => {
      if (!processedAssetIds.has(asset.id)) {
        flattenedAssets.push(asset);
      }
    });

    // Build table body rows with builder separator rows (like Excel)
    const bodyRows: { cells: string[]; isSeparator: boolean; isChild: boolean }[] = [];

    builderGroups.forEach(group => {
      // Add separator row with builder name
      const separatorCells = selectedCols.map((col, idx) =>
        idx === 0 ? group.name : ''
      );
      bodyRows.push({ cells: separatorCells, isSeparator: true, isChild: false });

      // Add builder items
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        const asset = flattenedAssets[i];
        const cells = selectedCols.map(col => {
          return String(getExportValue(asset, col.key));
        });
        bodyRows.push({ cells, isSeparator: false, isChild: !!asset.isChild });
      }
    });

    // Add remaining non-builder assets
    for (let i = 0; i < flattenedAssets.length; i++) {
      const asset = flattenedAssets[i];
      if (!asset.isChild) {
        const alreadyGrouped = builderGroups.some(
          g => i >= g.startIndex && i <= g.endIndex
        );
        if (!alreadyGrouped) {
          const cells = selectedCols.map(col => {
            return String(getExportValue(asset, col.key));
          });
          bodyRows.push({ cells, isSeparator: false, isChild: false });
        }
      }
    }

    const tableData = bodyRows.map(row => row.cells);

    // Define column widths based on content type (same as Excel)
    const columnWidths: Record<string, number> = {
      id: 15,
      name: 25,
      description: 40,
      category: 20,
      type: 20,
      serialNo: 18,
      brand: 18,
      modelNo: 18,
      status: 15,
      assignedTo: 30,
      department: 25,
      location: 25,
      purchasePrice: 18,
      purchaseDate: 18,
      supplier: 25,
      warranty: 18,
      documents: 18,
      maintenanceSchedule: 25,
      lastMaintenanceDate: 20,
      nextMaintenanceDate: 20,
      condition: 18,
      usefulLifeYears: 20,
      salvageValue: 18,
      depreciationMethod: 25,
      annualDepreciation: 20,
      depreciationStartDate: 22,
      company: 25,
      building: 20,
      createdBy: 25,
      createdAt: 18,
      updatedBy: 25,
      updatedAt: 18,
    };

    // Calculate proportional column widths based on total width of 320mm
    const totalWidth = 320;
    const totalDefinedWidth = selectedCols.reduce(
      (sum, col) => sum + (columnWidths[col.key] || 20),
      0,
    );
    const scaleFactor = totalWidth / totalDefinedWidth;

    const columnStyles: any = {};
    selectedCols.forEach((col, index) => {
      columnStyles[index] = {
        cellWidth: Math.max(10, (columnWidths[col.key] || 20) * scaleFactor),
      };
    });

    // Add table
    autoTable(doc, {
      head: [selectedCols.map(col => col.label)],
      body: tableData,
      startY: currentY + 8,
      styles: {
        fontSize: Math.max(5, 8 - selectedCols.length * 0.2),
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [224, 224, 224],
        fontSize: Math.max(6, 9 - selectedCols.length * 0.2),
      },
      columnStyles,
      margin: { left: 5, right: 5 },
      didParseCell: data => {
        const row = bodyRows[data.row.index];
        if (row.isSeparator) {
          data.cell.styles.fillColor = [211, 211, 211];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = Math.max(8, 14 - selectedCols.length * 0.2);
          data.cell.styles.halign = 'center';
          data.cell.styles.cellPadding = { top: 3, bottom: 3, left: 1, right: 1 };
        } else if (row.isChild) {
          data.cell.styles.fontStyle = 'italic';
        } else {
          data.cell.styles.fontStyle = 'normal';
        }
      },
    });

    // Add generation date, time, and user in upper right of table on first page
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const footerText = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} by ${currentUser?.name || 'Unknown'}`;

    // Ensure text is on the first page
    doc.setPage(1);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(footerText, 315, currentY, { align: 'right' });

    // Add colored bar and black line footer (from accountability form)
    const footerGoldY = pageHeight - 14; // Near bottom of first page
    const footerLineY = pageHeight - 10;
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const isBlackCodersCompany = isBlackCoders(activeCompany?.name);

    if (isBlackCodersCompany) {
      // Solid red bar for Black Coders
      doc.setDrawColor(220, 38, 38);
      doc.setFillColor(220, 38, 38);
      doc.setLineWidth(0.1);
      doc.rect(5, footerGoldY, 320, 1, 'FD');
    } else {
      // Solid color bar for other companies
      doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.setLineWidth(0.1);
      doc.rect(5, footerGoldY, 320, 1, 'FD');
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(6);
    doc.line(5, footerLineY, 325, footerLineY);

    // Save the PDF
    const fileName = activeCompany 
      ? `${activeCompany.name}_asset_list.pdf` 
      : 'asset_list.pdf';
    doc.save(fileName);
    toast.success('PDF exported successfully');
    setIsExportDialogOpen(false);
  };

  const exportToExcel = async (
    assets: Asset[],
    activeCompany: Company | null,
    assetBuilders?: any[] | null
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const workbook = new ExcelJS.Workbook();

    // Assets sheet — header row + data rows derived from selected columns.
    const assetsSheet = workbook.addWorksheet('Assets');

    // Define column widths based on content type
    const columnWidths: Record<string, number> = {
      id: 15,
      name: 25,
      description: 40,
      category: 20,
      type: 20,
      serialNo: 18,
      brand: 18,
      modelNo: 18,
      status: 15,
      assignedTo: 30,
      department: 25,
      location: 25,
      purchasePrice: 18,
      purchaseDate: 18,
      supplier: 25,
      warranty: 18,
      documents: 18,
      maintenanceSchedule: 25,
      lastMaintenanceDate: 20,
      nextMaintenanceDate: 20,
      condition: 18,
      usefulLifeYears: 20,
      salvageValue: 18,
      depreciationMethod: 25,
      annualDepreciation: 20,
      depreciationStartDate: 22,
      company: 25,
      building: 20,
      createdBy: 25,
      createdAt: 18,
      updatedBy: 25,
      updatedAt: 18,
    };

    assetsSheet.columns = selectedCols.map(col => ({
      header: col.label,
      key: col.key,
      width: columnWidths[col.key] || 20,
    }));

    // Process assets with builder grouping logic
    const flattenedAssets: (Asset & { isChild?: boolean; builderName?: string })[] = [];
    const processedAssetIds = new Set<string>();
    const builderGroups: { name: string; startIndex: number; endIndex: number }[] = [];

    // Process builders first
    if (assetBuilders && assetBuilders.length > 0) {
      assetBuilders.forEach(builder => {
        if (!builder.items || !Array.isArray(builder.items)) return;

        // Mark builder ID as processed to exclude parent asset
        processedAssetIds.add(builder.builderID);

        // Sort builder items by last 5 digits of asset code
        const sortedItems = [...builder.items].sort((a: any, b: any) => {
          const aCode = a.asset_code || '';
          const bCode = b.asset_code || '';
          const aLast5 = aCode.slice(-5);
          const bLast5 = bCode.slice(-5);
          const aNum = parseInt(aLast5, 10) || 0;
          const bNum = parseInt(bLast5, 10) || 0;
          return aNum - bNum;
        });

        // Record the start index for this builder group
        const groupStartIndex = flattenedAssets.length;

        // Add builder items as children
        sortedItems.forEach((item: any) => {
          const matchingAsset = assets.find(a => a.id === item.asset_code);
          if (matchingAsset) {
            // Exclude parent assets (those with CMTH-ITOFE-LAP- prefix) from being marked as children
            const isParentAsset = item.asset_code.startsWith('CMTH-ITOFE-LAP-');
            if (!isParentAsset) {
              flattenedAssets.push({ 
                ...matchingAsset, 
                isChild: true,
                builderName: builder.builderName 
              } as Asset & { isChild?: boolean; builderName?: string });
              processedAssetIds.add(item.asset_code);
            } else {
              // Parent asset is added as normal (not italic)
              flattenedAssets.push(matchingAsset);
              processedAssetIds.add(item.asset_code);
            }
          }
        });

        // Record the end index for this builder group
        const groupEndIndex = flattenedAssets.length - 1;
        if (groupStartIndex <= groupEndIndex) {
          builderGroups.push({
            name: builder.builderName,
            startIndex: groupStartIndex,
            endIndex: groupEndIndex,
          });
        }
      });
    }

    // Add remaining assets that are not part of any builder
    assets.forEach(asset => {
      if (!processedAssetIds.has(asset.id)) {
        flattenedAssets.push(asset);
      }
    });

    // Add header row with styling
    const headerRow = assetsSheet.addRow(selectedCols.map(col => col.label));
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { wrapText: true, vertical: 'top' };

    // Add data rows with builder grouping
    let currentRowIndex = 2; // Header is row 1
    let currentGroupIndex = 0;

    builderGroups.forEach(group => {
      // Add separator row with builder name
      const separatorRow = assetsSheet.addRow([]);
      separatorRow.height = 25;
      
      // Merge cells for builder name
      assetsSheet.mergeCells(`A${currentRowIndex}:${String.fromCharCode(64 + selectedCols.length)}${currentRowIndex}`);
      const separatorCell = assetsSheet.getCell(`A${currentRowIndex}`);
      separatorCell.value = group.name;
      separatorCell.font = { bold: true, size: 14 };
      separatorCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      separatorCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      currentRowIndex++;

      // Add builder items with indentation
      for (let i = group.startIndex; i <= group.endIndex; i++) {
        const asset = flattenedAssets[i];
        const row: Record<string, string | number> = {};
        selectedCols.forEach(col => {
          row[col.key] = getExportValue(asset, col.key);
        });
        const dataRow = assetsSheet.addRow(row);
        
        // Apply indentation and text wrapping to builder items
        if (asset.isChild) {
          dataRow.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
          });
        } else {
          dataRow.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: 'top' };
          });
        }
        currentRowIndex++;
      }

      // Note: ExcelJS doesn't support native row grouping in browser environment
      // The separator rows and indentation provide visual grouping
    });

    // Add remaining non-builder assets
    for (let i = 0; i < flattenedAssets.length; i++) {
      const asset = flattenedAssets[i];
      if (!asset.isChild) {
        // Check if this asset was already processed as part of a builder
        const alreadyProcessed = builderGroups.some(
          g => i >= g.startIndex && i <= g.endIndex
        );
        if (!alreadyProcessed) {
          const row: Record<string, string | number> = {};
          selectedCols.forEach(col => {
          row[col.key] = getExportValue(asset, col.key);
          });
          const dataRow = assetsSheet.addRow(row);
          dataRow.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: 'top' };
          });
          currentRowIndex++;
        }
      }
    }

    // Generate filename with company name
    const fileName = activeCompany 
      ? `${activeCompany.name}_asset_list.xlsx` 
      : 'asset_list.xlsx';

    await downloadXlsx(workbook, fileName);
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
    _assets: Asset[],
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    assetBuilders?: any[] | null,
    companyId?: string | null,
    scope?: string | null
  ) => {
    try {
      const allAssets = await fetchAllAssets(companyId, scope);
      if (exportType === 'pdf') {
        await exportToPDF(allAssets, activeCompany, currentUser, assetBuilders);
      } else if (exportType === 'excel') {
        await exportToExcel(allAssets, activeCompany, assetBuilders);
      }
    } catch (err) {
      toast.error('Failed to fetch assets for export');
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

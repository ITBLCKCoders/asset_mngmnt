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
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';
import {
  addCompanyLogoToPDF,
  getCompanyAccentColor,
  isBlackCoders,
} from '@/lib/pdfGenerator/shared';

const SUMMARY_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

function getConditionFillColor(condition: string): [number, number, number] | null {
  switch (condition) {
    case 'Excellent': return [212, 237, 218];
    case 'Good': return [207, 226, 243];
    case 'Fair': return [210, 244, 244];
    case 'Poor': return [255, 243, 205];
    case 'Damaged': return [248, 215, 218];
    default: return null;
  }
}

function getConditionExcelArgb(condition: string): string | null {
  switch (condition) {
    case 'Excellent': return 'FFD4EDDA';
    case 'Good': return 'FFCFE2F3';
    case 'Fair': return 'FFD2F4F4';
    case 'Poor': return 'FFFFF3CD';
    case 'Damaged': return 'FFF8D7DA';
    default: return null;
  }
}

export const EXPORT_SUMMARY_CONDITIONS = SUMMARY_CONDITIONS;

/**
 * Fetch ALL assets matching the given filters (bypasses table pagination).
 */
async function fetchAllAssets(
  companyId?: string | null,
  scope?: string | null,
  search?: string | null,
): Promise<Asset[]> {
  const params = new URLSearchParams({ limit: '-1' });
  if (companyId) params.append('companyId', companyId);
  if (scope) params.append('scope', scope);
  if (search) params.append('search', search);

  const apiUrl = `/assets?${params.toString()}`;
  const res = await api.get<{ assets: AssetResponseDto[] }>(apiUrl);

  console.log(
    '[AssetExport fetchAllAssets]',
    apiUrl,
    '→',
    res.assets?.length ?? 0,
    'assets returned',
  );

  return (res.assets ?? []).map(mapDtoToAsset);
}

function formatScopeLabel(scope: string): string {
  if (scope === 'it') return 'IT Department';
  if (scope === 'admin') return 'Admin Department';
  return scope.charAt(0).toUpperCase() + scope.slice(1);
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
    department: (() => {
      if (dto.currentAssignment?.department) return dto.currentAssignment.department;
      if (dto.department) {
        try {
          const parsed = JSON.parse(dto.department);
          return parsed?.name || '';
        } catch {
          return '';
        }
      }
      return '';
    })(),
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
    accountabilityForm: (() => {
      const form = dto.accountabilityForms?.[0];
      if (!form) return undefined;
      const assetsArray = form.assets_data?.assets || [{
        id: dto.assetID || dto.asset_code,
        code: dto.asset_code,
        name: dto.name,
        category: dto.category_name || dto.category_id,
        categoryDepartment: dto.department ? (() => {
          try {
            return JSON.parse(dto.department).name;
          } catch {
            return '';
          }
        })() : '',
        type: dto.type_name || dto.type_id,
        serialNo: dto.serial,
        modelNo: dto.model,
        brand: dto.brand,
      }];
      return { ...form, assets: assetsArray } as AccountabilityForm;
    })(),
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
  const [exportStep, setExportStep] = useState<1 | 2>(1);
  const [exportEmployeeOptions, setExportEmployeeOptions] = useState<string[]>([]);
  const [exportFormOptions, setExportFormOptions] = useState<string[]>([]);
  const [exportLocationOptions, setExportLocationOptions] = useState<string[]>([]);
  const [exportDepartmentOptions, setExportDepartmentOptions] = useState<string[]>([]);
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
      'accountabilityForm',
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
    { key: 'accountabilityForm', label: 'Accountability Form #' },
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
    if (colKey === 'accountabilityForm') {
      return a.accountabilityForm?.formNumber ?? '';
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

  const buildGroupedAssetListRows = (
    assets: Asset[],
    cols: { key: string; label: string }[],
    assetBuilders?: any[] | null,
  ): { cells: string[]; isSeparator: boolean; isChild: boolean }[] => {
    const flattenedAssets: (Asset & { isChild?: boolean; builderName?: string })[] = [];
    const processedAssetIds = new Set<string>();
    const builderGroups: { name: string; startIndex: number; endIndex: number }[] = [];

    if (assetBuilders && assetBuilders.length > 0) {
      assetBuilders.forEach(builder => {
        if (!builder.items || !Array.isArray(builder.items)) return;

        processedAssetIds.add(builder.builderID);

        const sortedItems = [...builder.items].sort((a: any, b: any) => {
          const aCode = a.asset_code || '';
          const bCode = b.asset_code || '';
          const aLast5 = aCode.slice(-5);
          const bLast5 = bCode.slice(-5);
          const aNum = parseInt(aLast5, 10) || 0;
          const bNum = parseInt(bLast5, 10) || 0;
          return aNum - bNum;
        });

        const groupStartIndex = flattenedAssets.length;

        sortedItems.forEach((item: any) => {
          const matchingAsset = assets.find(a => a.id === item.asset_code);
          if (matchingAsset) {
            const isParentAsset = item.asset_code.startsWith('CMTH-ITOFE-LAP-');
            if (!isParentAsset) {
              flattenedAssets.push({
                ...matchingAsset,
                isChild: true,
                builderName: builder.builderName,
              } as Asset & { isChild?: boolean; builderName?: string });
              processedAssetIds.add(item.asset_code);
            } else {
              flattenedAssets.push(matchingAsset);
              processedAssetIds.add(item.asset_code);
            }
          }
        });

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

    assets.forEach(asset => {
      if (!processedAssetIds.has(asset.id)) {
        flattenedAssets.push(asset);
      }
    });

    const rows: { cells: string[]; isSeparator: boolean; isChild: boolean }[] = [];

    builderGroups.forEach(group => {
      rows.push({
        cells: cols.map((_, idx) => (idx === 0 ? group.name : '')),
        isSeparator: true,
        isChild: false,
      });

      for (let i = group.startIndex; i <= group.endIndex; i++) {
        const asset = flattenedAssets[i];
        rows.push({
          cells: cols.map(col => String(getExportValue(asset, col.key))),
          isSeparator: false,
          isChild: !!asset.isChild,
        });
      }
    });

    for (let i = 0; i < flattenedAssets.length; i++) {
      const asset = flattenedAssets[i];
      if (!asset.isChild) {
        const alreadyGrouped = builderGroups.some(
          group => i >= group.startIndex && i <= group.endIndex,
        );
        if (!alreadyGrouped) {
          rows.push({
            cells: cols.map(col => String(getExportValue(asset, col.key))),
            isSeparator: false,
            isChild: false,
          });
        }
      }
    }

    return rows;
  };

  const exportToPDF = async (
    assets: Asset[],
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    assetBuilders?: any[] | null,
    filterLabel?: string
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
    doc.text(`Total Assets: ${assets.length}`, 165, 30, { align: 'center' });

    // Add filter label below total assets if present
    if (filterLabel) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(filterLabel, 165, 35, { align: 'center' });
    }

    let currentY = filterLabel ? 37 : 32;

    // Prepare table data with selected columns
    // Process assets with builder grouping (items go right after parent, no separator rows)
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

    // Build table body rows with builder separator rows
    const bodyRows: { cells: string[]; isSeparator: boolean; isChild: boolean }[] = [];

    builderGroups.forEach(group => {
      // Add separator row with builder name
      const separatorCells = selectedCols.map((_, idx) =>
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
      accountabilityForm: 25,
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
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const isBlackCodersCompany = isBlackCoders(activeCompany?.name);
    const headerFill: [number, number, number] = isBlackCodersCompany
      ? [0, 0, 0]
      : [accentColor.r, accentColor.g, accentColor.b];

    autoTable(doc, {
      head: [selectedCols.map(col => col.label)],
      body: tableData,
      startY: currentY + 4,
      styles: {
        fontSize: Math.max(5, 8 - selectedCols.length * 0.2),
        cellPadding: 1,
      },
      headStyles: {
        fillColor: headerFill,
        textColor: [255, 255, 255],
        fontSize: Math.max(6, 9 - selectedCols.length * 0.2),
      },
      columnStyles,
      margin: { left: 5, right: 5 },
      didParseCell: data => {
        const row = bodyRows[data.row.index];
        const colKey = selectedCols[data.column.index]?.key;
        if (row.isSeparator) {
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = Math.max(8, 14 - selectedCols.length * 0.2);
          data.cell.styles.halign = 'center';
        } else if (row.isChild) {
          data.cell.styles.fontStyle = 'italic';
        }
        if (colKey === 'condition') {
          const condColor = getConditionFillColor(String(data.cell.raw ?? ''));
          if (condColor) {
            data.cell.styles.fillColor = condColor;
          }
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
    assetBuilders?: any[] | null,
    filterLabel?: string
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const workbook = new ExcelJS.Workbook();

    // Assets sheet — header row + data rows derived from selected columns.
    const assetsSheet = workbook.addWorksheet('Assets');

    // Add filter label row at top if present
    if (filterLabel) {
      const filterRow = assetsSheet.insertRow(1, [filterLabel]);
      filterRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      assetsSheet.mergeCells(1, 1, 1, selectedCols.length || 5);
    }

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
      accountabilityForm: 25,
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

    // Compute company accent color for header
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const headerArgb = `FF${accentColor.r.toString(16).padStart(2, '0')}${accentColor.g.toString(16).padStart(2, '0')}${accentColor.b.toString(16).padStart(2, '0')}`;

    // Add header row with styling
    const headerRow = assetsSheet.addRow(selectedCols.map(col => col.label));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerArgb },
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
          dataRow.eachCell((cell, colIdx) => {
            cell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
            const key = selectedCols[colIdx]?.key;
            if (key === 'condition' && cell.value) {
              const argb = getConditionExcelArgb(String(cell.value));
              if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
            }
          });
        } else {
          dataRow.eachCell((cell, colIdx) => {
            cell.alignment = { wrapText: true, vertical: 'top' };
            const key = selectedCols[colIdx]?.key;
            if (key === 'condition' && cell.value) {
              const argb = getConditionExcelArgb(String(cell.value));
              if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
            }
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
          dataRow.eachCell((cell, colIdx) => {
            cell.alignment = { wrapText: true, vertical: 'top' };
            const key = selectedCols[colIdx]?.key;
            if (key === 'condition' && cell.value) {
              const argb = getConditionExcelArgb(String(cell.value));
              if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
            }
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

  // ── Summary export ─────────────────────────────────────────────
  const [isSummaryExportDialogOpen, setIsSummaryExportDialogOpen] = useState(false);
  const [summaryStep, setSummaryStep] = useState<1 | 2>(1);
  const [summaryExportType, setSummaryExportType] = useState<'pdf' | 'excel' | null>(null);
  const [summaryScope, setSummaryScope] = useState<'it' | 'admin' | 'all'>('it');
  const [summarySelectedTypes, setSummarySelectedTypes] = useState<string[]>([]);
  const [summaryAvailableTypes, setSummaryAvailableTypes] = useState<{ name: string; count: number }[]>([]);
  const [summaryIncludeCondition, setSummaryIncludeCondition] = useState(true);
  const [summarySelectedConditions, setSummarySelectedConditions] = useState<string[]>([...SUMMARY_CONDITIONS]);
  const [summaryDateAddedFrom, setSummaryDateAddedFrom] = useState('');
  const [summaryDateAddedTo, setSummaryDateAddedTo] = useState('');
  const [summaryDateBoughtFrom, setSummaryDateBoughtFrom] = useState('');
  const [summaryDateBoughtTo, setSummaryDateBoughtTo] = useState('');
  const [summaryWarrantyMonthsMin, setSummaryWarrantyMonthsMin] = useState('');
  const [summaryWarrantyMonthsMax, setSummaryWarrantyMonthsMax] = useState('');
  const [summaryMaintenanceFrom, setSummaryMaintenanceFrom] = useState('');
  const [summaryMaintenanceTo, setSummaryMaintenanceTo] = useState('');
  const [summaryEmployeeName, setSummaryEmployeeName] = useState('');
  const [summaryAccountabilityForm, setSummaryAccountabilityForm] = useState('');
  const [summaryEmployeeOptions, setSummaryEmployeeOptions] = useState<string[]>([]);
  const [summaryFormOptions, setSummaryFormOptions] = useState<string[]>([]);
  const [summaryLocation, setSummaryLocation] = useState('');
  const [summaryDepartment, setSummaryDepartment] = useState('');
  const [summaryLocationOptions, setSummaryLocationOptions] = useState<string[]>([]);
  const [summaryDepartmentOptions, setSummaryDepartmentOptions] = useState<string[]>([]);
  const [summarySelectedColumns, setSummarySelectedColumns] = useState<Set<string>>(
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

  interface TypeSummary {
    units: number;
    working: number;
    defective: number;
    Excellent: number;
    Good: number;
    Fair: number;
    Poor: number;
    Damaged: number;
  }

  interface EmployeeSummary {
    name: string;
    department: string;
    company: string;
    count: number;
  }

  function computeSummaryData(assets: Asset[]) {
    const typeMap: Record<string, TypeSummary> = {};
    const empMap: Record<string, EmployeeSummary> = {};
    const deptMap: Record<string, { department: string; company: string; count: number }> = {};

    const workingStatuses = new Set([
      'Available', 'Assigned', 'In Use', 'Borrowed', 'Service Unit',
    ]);

    assets.forEach(asset => {
      // Device Type summary
      const type = asset.type || 'Uncategorized';
      if (!typeMap[type]) {
        typeMap[type] = {
          units: 0, working: 0, defective: 0,
          Excellent: 0, Good: 0, Fair: 0, Poor: 0, Damaged: 0,
        };
      }
      const t = typeMap[type];
      t.units++;
      if (workingStatuses.has(asset.status)) {
        t.working++;
      } else {
        t.defective++;
      }
      const cond = asset.condition;
      if (cond in t) (t as any)[cond]++;

      // Employee summary (assigned assets only)
      if (asset.assignedTo) {
        const name = asset.assignedTo;
        if (!empMap[name]) {
          empMap[name] = { name, department: '', company: '', count: 0 };
        }
        empMap[name].count++;
        if (!empMap[name].department && asset.department) empMap[name].department = asset.department;
        if (!empMap[name].company && asset.company) empMap[name].company = asset.company;
      }

      // Department summary
      if (asset.department) {
        const deptKey = `${asset.company}|${asset.department}`;
        if (!deptMap[deptKey]) {
          deptMap[deptKey] = { department: asset.department, company: asset.company || '', count: 0 };
        }
        deptMap[deptKey].count++;
      }
    });

    const typeRows = Object.entries(typeMap).map(([type, d]) => ({ type, ...d }));
    const empRows = Object.values(empMap).sort((a, b) => b.count - a.count);
    const deptRows = Object.values(deptMap).sort((a, b) => b.count - a.count);

    // Group employees by company for sectioned display
    const grouped: Record<string, EmployeeSummary[]> = {};
    empRows.forEach(emp => {
      const company = emp.company || 'Unspecified';
      if (!grouped[company]) grouped[company] = [];
      grouped[company].push(emp);
    });
    const empByCompany = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

    return { typeRows, empRows, deptRows, empByCompany };
  }

  const exportSummaryToPDF = async (
    assets: Asset[],
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    listCols?: { key: string; label: string }[],
    filterLabel?: string,
    assetBuilders?: any[] | null
  ) => {
    const { typeRows, empByCompany, deptRows } = computeSummaryData(assets);

    const doc = new jsPDF('l', 'mm', [330, 216]);
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const isBlackCodersCompany = isBlackCoders(activeCompany?.name);
    const headerFill: [number, number, number] = isBlackCodersCompany
      ? [0, 0, 0]
      : [accentColor.r, accentColor.g, accentColor.b];

    await addCompanyLogoToPDF(doc, activeCompany?.logo_url, 14, 12);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Summary Report', 165, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Assets: ${assets.length}`, 165, 28, { align: 'center' });

    let infoY = 31;
    if (filterLabel) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(filterLabel, 165, 31, { align: 'center' });
      infoY = 34;
    }

    const now = new Date();
    const footerUserText = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} by ${currentUser?.name || 'Unknown'}`;
    doc.setFontSize(7);
    doc.text(footerUserText, 315, infoY, { align: 'right' });

    const tableY = infoY + 4;

    // ── Table 1: Device Type Summary (left) ──
    const conditionsToInclude = summaryIncludeCondition
      ? SUMMARY_CONDITIONS.filter(c => summarySelectedConditions.includes(c))
      : [];
    const typeColumns = ['Device Type', '# Units', 'Working', 'Defective', ...conditionsToInclude];
    const typeData = typeRows.map(r => {
      const row: (string | number)[] = [r.type, r.units, r.working, r.defective];
      conditionsToInclude.forEach(c => row.push((r as any)[c]));
      return row;
    });

    // Compute type totals (dynamic based on selected conditions)
    const typeTotalsInit: Record<string, number> = { units: 0, working: 0, defective: 0 };
    conditionsToInclude.forEach(c => { typeTotalsInit[c] = 0; });
    const typeTotals = typeRows.reduce((acc, r) => {
      acc.units += r.units;
      acc.working += r.working;
      acc.defective += r.defective;
      conditionsToInclude.forEach(c => { acc[c] += (r as any)[c]; });
      return acc;
    }, typeTotalsInit);
    const typeTotalRow: (string | number)[] = ['Grand Total', typeTotals.units, typeTotals.working, typeTotals.defective];
    conditionsToInclude.forEach(c => typeTotalRow.push(typeTotals[c]));
    typeData.push(typeTotalRow);

    const typeColStyles: Record<number, { cellWidth: number }> = {
      0: { cellWidth: 30 },
      1: { cellWidth: 14 },
      2: { cellWidth: 14 },
      3: { cellWidth: 16 },
    };
    conditionsToInclude.forEach((_, idx) => {
      typeColStyles[4 + idx] = { cellWidth: 14 };
    });

    autoTable(doc, {
      head: [typeColumns],
      body: typeData,
      startY: tableY,
      margin: { left: 5 },
      tableWidth: conditionsToInclude.length > 0 ? 80 + conditionsToInclude.length * 14 : 80,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      columnStyles: typeColStyles,
      didParseCell: data => {
        if (data.row.index === typeData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });

    const leftEndY = (doc as any).lastAutoTable?.finalY || tableY;

    // ── Table 2: Employee by Company (right, same Y, grouped with separator rows) ──
    const empColumns = ['Employee Name', 'Department', '# Assets'];
    const empBodyRows: { cells: string[]; isSeparator: boolean; isTotal: boolean }[] = [];
    let empGrandTotal = 0;

    empByCompany.forEach(([company, employees]) => {
      const sepCells = ['', '', ''];
      sepCells[0] = company;
      empBodyRows.push({ cells: sepCells, isSeparator: true, isTotal: false });
      employees.forEach(emp => {
        empBodyRows.push({ cells: [emp.name, emp.department, String(emp.count)], isSeparator: false, isTotal: false });
        empGrandTotal += emp.count;
      });
    });
    empBodyRows.push({ cells: ['Total', '', String(empGrandTotal)], isSeparator: false, isTotal: true });
    autoTable(doc, {
      head: [empColumns],
      body: empBodyRows.map(r => r.cells),
      startY: tableY,
      margin: { left: 160 },
      tableWidth: 160,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 65 },
        2: { cellWidth: 16 },
      },
      didParseCell: data => {
        const row = empBodyRows[data.row.index];
        if (row?.isSeparator) {
          data.cell.styles.fillColor = headerFill as any;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7;
          data.cell.styles.halign = 'center';
        } else if (row?.isTotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = headerFill as any;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontSize = 7;
        }
      },
    });

    const rightEndY = (doc as any).lastAutoTable?.finalY || tableY;
    let summaryEndY = Math.max(leftEndY, rightEndY);
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Table 3: Department Summary (below the side-by-side tables, full width) ──
    let deptStartY = summaryEndY + 10;
    if (deptStartY > pageHeight - 60) {
      doc.addPage();
      deptStartY = 20;
    }

    // Section label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Department Summary', 165, deptStartY, { align: 'center' });
    deptStartY += 7;

    const deptColumns = ['Department', 'Company', '# Assets'];
    const deptTotal = deptRows.reduce((sum, r) => sum + r.count, 0);
    const deptData = deptRows.map(r => [r.department, r.company, r.count]);
    deptData.push(['Total', '', deptTotal]);

    autoTable(doc, {
      head: [deptColumns],
      body: deptData,
      startY: deptStartY,
      margin: { left: 5, right: 5 },
      tableWidth: 320,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 120 },
        2: { cellWidth: 30 },
      },
      didParseCell: data => {
        if (data.row.index === deptData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
    });

    const deptEndY = (doc as any).lastAutoTable?.finalY || deptStartY;

    // ── Full Asset List (below department table) ──
    const summaryAssetColumns = listCols ?? availableColumns.filter(col =>
      summarySelectedColumns.has(col.key)
    );

    const listHeaders = summaryAssetColumns.map(col => col.label);
    const listRows = buildGroupedAssetListRows(
      assets,
      summaryAssetColumns,
      assetBuilders,
    );

    let listStartY = deptEndY + 10;
    if (listStartY > pageHeight - 50) {
      doc.addPage();
      listStartY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset List', 165, listStartY, { align: 'center' });
    listStartY += 7;

    const columnWidths: Record<string, number> = {
      id: 15, name: 25, description: 40, category: 20, type: 20,
      serialNo: 18, brand: 18, modelNo: 18, status: 15, assignedTo: 30,
      accountabilityForm: 25, department: 25, location: 25, purchasePrice: 18, purchaseDate: 18,
      supplier: 25, warranty: 18, documents: 18, maintenanceSchedule: 25,
      lastMaintenanceDate: 20, nextMaintenanceDate: 20, condition: 18,
      usefulLifeYears: 20, salvageValue: 18, depreciationMethod: 25,
      annualDepreciation: 20, depreciationStartDate: 22, company: 25,
      building: 20, createdBy: 25, createdAt: 18, updatedBy: 25, updatedAt: 18,
    };

    const totalWidth = 320;
    const totalDefinedWidth = summaryAssetColumns.reduce(
      (sum, col) => sum + (columnWidths[col.key] || 20), 0,
    );
    const scaleFactor = totalWidth / totalDefinedWidth;
    const colStyles: any = {};
    summaryAssetColumns.forEach((col, index) => {
      colStyles[index] = { cellWidth: Math.max(10, (columnWidths[col.key] || 20) * scaleFactor) };
    });

    const listFontSize = Math.max(5, Math.min(7, 8 - summaryAssetColumns.length * 0.15));

    autoTable(doc, {
      head: [listHeaders],
      body: listRows.map(row => row.cells),
      startY: listStartY,
      margin: { left: 5, right: 5 },
      theme: 'grid',
      styles: { fontSize: listFontSize, cellPadding: 0.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontSize: listFontSize, fontStyle: 'bold' },
      columnStyles: colStyles,
      didParseCell: data => {
        const row = listRows[data.row.index];
        const colKey = summaryAssetColumns[data.column.index]?.key;
        if (row?.isSeparator) {
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        } else if (row?.isChild) {
          data.cell.styles.fontStyle = 'italic';
        }
        if (colKey === 'condition') {
          const condColor = getConditionFillColor(String(data.cell.raw ?? ''));
          if (condColor) {
            data.cell.styles.fillColor = condColor;
          }
        }
      },
    });

    // ── Footer on the last page ──
    const pageCount = doc.getNumberOfPages();
    doc.setPage(pageCount);
    const lastPageHeight = doc.internal.pageSize.getHeight();
    const footerGoldY = lastPageHeight - 14;
    const footerLineY = lastPageHeight - 10;

    if (isBlackCodersCompany) {
      doc.setDrawColor(220, 38, 38);
      doc.setFillColor(220, 38, 38);
      doc.setLineWidth(0.1);
      doc.rect(5, footerGoldY, 320, 1, 'FD');
    } else {
      doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
      doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      doc.setLineWidth(0.1);
      doc.rect(5, footerGoldY, 320, 1, 'FD');
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(6);
    doc.line(5, footerLineY, 325, footerLineY);

    const fileName = activeCompany
      ? `${activeCompany.name}_asset_summary.pdf`
      : 'asset_summary.pdf';
    doc.save(fileName);
    toast.success('Summary PDF exported successfully');
    setIsSummaryExportDialogOpen(false);
  };

  const exportSummaryToExcel = async (
    assets: Asset[],
    activeCompany: Company | null,
    listCols?: { key: string; label: string }[],
    filterLabel?: string,
    assetBuilders?: any[] | null
  ) => {
    const { typeRows, empByCompany, deptRows } = computeSummaryData(assets);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Summary');

    // Compute company accent color for header
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const headerArgb = `FF${accentColor.r.toString(16).padStart(2, '0')}${accentColor.g.toString(16).padStart(2, '0')}${accentColor.b.toString(16).padStart(2, '0')}`;

    // Add filter label row at top if present
    if (filterLabel) {
      const filterRow = ws.addRow([filterLabel]);
      filterRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      ws.mergeCells(1, 1, 1, 9);
    }

    // ── Table 1: Device Type Summary (cols A-I) ──
    const conditionLabels = SUMMARY_CONDITIONS.filter(c => summarySelectedConditions.includes(c));
    const typeHeaders = ['Device Type', '# Units', 'Working', 'Defective'];
    if (summaryIncludeCondition) {
      typeHeaders.push(...conditionLabels);
    }

    const typeHeaderRow = ws.addRow(typeHeaders);
    typeHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    typeHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };

    typeRows.forEach(r => {
      const row: (string | number)[] = [r.type, r.units, r.working, r.defective];
      conditionLabels.forEach(c => row.push((r as any)[c]));
      ws.addRow(row);
    });
    // Total row (dynamic based on selected conditions)
    const typeETotalsInit: Record<string, number> = { units: 0, working: 0, defective: 0 };
    conditionLabels.forEach(c => { typeETotalsInit[c] = 0; });
    const typeETotals = typeRows.reduce((acc, r) => {
      acc.units += r.units;
      acc.working += r.working;
      acc.defective += r.defective;
      conditionLabels.forEach(c => { acc[c] += (r as any)[c]; });
      return acc;
    }, typeETotalsInit);
    const eTotalRow: (string | number)[] = ['Grand Total', typeETotals.units, typeETotals.working, typeETotals.defective];
    conditionLabels.forEach(c => eTotalRow.push(typeETotals[c]));
    const totalRowExcel = ws.addRow(eTotalRow);
    totalRowExcel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRowExcel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerArgb },
    };

    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 10;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 12;
    conditionLabels.forEach((_, idx) => {
      ws.getColumn(5 + idx).width = 12;
    });

    // ── Table 2: Employee by Company (starting at column L) ──
    const empColOffset = 12;
    const empHeaders = ['Employee Name', 'Department', '# Assets'];
    const gapRow = ws.addRow([]);

    empHeaders.forEach((h, i) => {
      const cell = ws.getCell(gapRow.number, empColOffset + i);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF333333' },
      };
    });

    let dataRowNum = gapRow.number + 1;
    let empTotal = 0;

    empByCompany.forEach(([company, employees]) => {
      // Company separator row
      const sepRow = ws.getRow(dataRowNum);
      const sepCell = sepRow.getCell(empColOffset);
      sepCell.value = company;
      sepCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sepCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF666666' },
      };
      const sepCell2 = sepRow.getCell(empColOffset + 1);
      sepCell2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF666666' },
      };
      const sepCell3 = sepRow.getCell(empColOffset + 2);
      sepCell3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF666666' },
      };
      dataRowNum++;

      employees.forEach(emp => {
        const row = ws.getRow(dataRowNum);
        row.getCell(empColOffset).value = emp.name;
        row.getCell(empColOffset + 1).value = emp.department;
        row.getCell(empColOffset + 2).value = emp.count;
        empTotal += emp.count;
        dataRowNum++;
      });
    });
    // Total row
    const empTotalRow = ws.getRow(dataRowNum);
    empTotalRow.getCell(empColOffset).value = 'Total';
    empTotalRow.getCell(empColOffset).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    empTotalRow.getCell(empColOffset).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    empTotalRow.getCell(empColOffset + 2).value = empTotal;
    empTotalRow.getCell(empColOffset + 2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    empTotalRow.getCell(empColOffset + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    empTotalRow.getCell(empColOffset + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    dataRowNum++;

    ws.getColumn(empColOffset).width = 30;
    ws.getColumn(empColOffset + 1).width = 22;
    ws.getColumn(empColOffset + 2).width = 12;

    // ── Table 3: Department Summary (below side-by-side tables, in line with cols A-I) ──
    ws.addRow([]);
    ws.addRow([]);

    const deptHeaderRow = ws.addRow(['Department', 'Company', '# Assets']);
    deptHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };

    const deptETotal = deptRows.reduce((sum, r) => sum + r.count, 0);
    deptRows.forEach(r => {
      ws.addRow([r.department, r.company, r.count]);
    });
    const deptTotalExcelRow = ws.addRow(['Total', '', deptETotal]);
    deptTotalExcelRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptTotalExcelRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerArgb },
    };

    // ── Full Asset List (below department table) ──
    ws.addRow([]);
    ws.addRow([]);

    const summaryAssetColumns = listCols ?? availableColumns.filter(col =>
      summarySelectedColumns.has(col.key)
    );

    const listHeaderRow = ws.addRow(['Asset List']);
    listHeaderRow.font = { bold: true, size: 14 };

    const listHeaderRow2 = ws.addRow(summaryAssetColumns.map(col => col.label));
    listHeaderRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    listHeaderRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };

    const listRows = buildGroupedAssetListRows(
      assets,
      summaryAssetColumns,
      assetBuilders,
    );

    listRows.forEach(row => {
      const dataRow = ws.addRow(row.cells);
      if (row.isSeparator) {
        ws.mergeCells(dataRow.number, 1, dataRow.number, summaryAssetColumns.length);
        dataRow.height = 25;
        const separatorCell = dataRow.getCell(1);
        separatorCell.font = { bold: true, size: 14 };
        separatorCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };
        separatorCell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        dataRow.eachCell((cell, colIdx) => {
          cell.alignment = {
            wrapText: true,
            vertical: 'top',
            indent: row.isChild ? 1 : 0,
          };
          if (row.isChild) {
            cell.font = { italic: true };
          }
          const key = summaryAssetColumns[colIdx]?.key;
          if (key === 'condition' && cell.value) {
            const argb = getConditionExcelArgb(String(cell.value));
            if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
          }
        });
      }
    });

    const excelColumnWidths: Record<string, number> = {
      id: 15, name: 25, description: 40, category: 20, type: 20,
      serialNo: 18, brand: 18, modelNo: 18, status: 15, assignedTo: 30,
      accountabilityForm: 25, department: 25, location: 25, purchasePrice: 18, purchaseDate: 18,
      supplier: 25, warranty: 18, documents: 18, maintenanceSchedule: 25,
      lastMaintenanceDate: 20, nextMaintenanceDate: 20, condition: 18,
      usefulLifeYears: 20, salvageValue: 18, depreciationMethod: 25,
      annualDepreciation: 20, depreciationStartDate: 22, company: 25,
      building: 20, createdBy: 25, createdAt: 18, updatedBy: 25, updatedAt: 18,
    };
    summaryAssetColumns.forEach((col, i) => {
      ws.getColumn(i + 1).width = excelColumnWidths[col.key] || 20;
    });

    const fileName = activeCompany
      ? `${activeCompany.name}_asset_summary.xlsx`
      : 'asset_summary.xlsx';

    await downloadXlsx(workbook, fileName);
    toast.success('Summary Excel exported successfully');
    setIsSummaryExportDialogOpen(false);
  };

  const handleSummaryExportClick = (currentScope?: string | null) => {
    setSummaryStep(1);
    setSummaryScope(currentScope === 'it' || currentScope === 'admin' ? currentScope : 'all');
    setSummarySelectedTypes([]);
    setSummaryAvailableTypes([]);
    setSummaryExportType('pdf');
    setSummaryDateAddedFrom('');
    setSummaryDateAddedTo('');
    setSummaryDateBoughtFrom('');
    setSummaryDateBoughtTo('');
    setSummaryWarrantyMonthsMin('');
    setSummaryWarrantyMonthsMax('');
    setSummaryMaintenanceFrom('');
    setSummaryMaintenanceTo('');
    setSummaryEmployeeName('');
    setSummaryAccountabilityForm('');
    setSummaryEmployeeOptions([]);
    setSummaryFormOptions([]);
    setSummaryLocation('');
    setSummaryDepartment('');
    setSummaryLocationOptions([]);
    setSummaryDepartmentOptions([]);
    setIsSummaryExportDialogOpen(true);
  };

  const handleSummaryNextStep = async (
    overrideScope: 'it' | 'admin' | 'all',
    companyId?: string | null,
  ) => {
    setSummaryScope(overrideScope);
    setSummarySelectedTypes([]);
    setSummaryAvailableTypes([]);

    // Determine the scope param for fetching: 'all' means fetch without scope filter
    const scopeParam = overrideScope === 'all' ? null : overrideScope;
    try {
      const allAssets = await fetchAllAssets(companyId ?? null, scopeParam);
      const typeCounts: Record<string, number> = {};
      allAssets.forEach(a => {
        const t = a.type || 'Uncategorized';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const available = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count }));
      setSummaryAvailableTypes(available);

      // Extract unique employee names, form numbers, locations, departments
      const employeeSet = new Set<string>();
      const formSet = new Set<string>();
      const locationSet = new Set<string>();
      const departmentSet = new Set<string>();
      allAssets.forEach(a => {
        if (a.assignedTo) employeeSet.add(a.assignedTo);
        const formNum = a.accountabilityForm?.formNumber;
        if (formNum) formSet.add(formNum);
        if (a.location) locationSet.add(a.location);
        if (a.department) departmentSet.add(a.department);
      });
      setSummaryEmployeeOptions(Array.from(employeeSet).sort());
      setSummaryFormOptions(Array.from(formSet).sort());
      setSummaryLocationOptions(Array.from(locationSet).sort());
      setSummaryDepartmentOptions(Array.from(departmentSet).sort());
    } catch {
      setSummaryAvailableTypes([]);
      setSummaryEmployeeOptions([]);
      setSummaryFormOptions([]);
      setSummaryLocationOptions([]);
      setSummaryDepartmentOptions([]);
      toast.error('Failed to load asset types for this scope');
    }

    setSummaryStep(2);
  };

  const handleSummaryPrevStep = () => {
    setSummaryStep(1);
  };

  const handleSummaryConditionToggle = (condition: string) => {
    setSummarySelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition],
    );
  };

  const handleSummaryTypeToggle = (type: string) => {
    setSummarySelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSummaryTypesToggleAll = () => {
    setSummarySelectedTypes(prev =>
      prev.length === summaryAvailableTypes.length
        ? []
        : summaryAvailableTypes.map(({ name }) => name)
    );
  };

  const handleSummaryScopeChange = (
    scope: 'it' | 'admin' | 'all',
    companyId?: string | null,
  ) => {
    handleSummaryNextStep(scope, companyId);
  };

  const handleSummaryExportConfirm = async (
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    assetBuilders?: any[] | null,
    companyId?: string | null,
    _scope?: string | null,
    searchTerm?: string | null
  ) => {
    try {
      // Use the dialog's scope override. 'all' means no scope filter.
      const scopeParam = summaryScope === 'all' ? null : summaryScope;
      const allAssets = await fetchAllAssets(companyId, scopeParam, searchTerm);
      const normalizeType = (t: string) => ((t || 'Uncategorized').trim().toLowerCase().replace(/\s+/g, ''));
      const normalizedSelected = summarySelectedTypes.map(normalizeType);

      // Filter by selected types (case/whitespace-insensitive comparison)
      let filteredAssets = summarySelectedTypes.length > 0
        ? allAssets.filter(a => normalizedSelected.includes(normalizeType(a.type)))
        : allAssets;

      // Date added filter
      if (summaryDateAddedFrom) {
        const from = new Date(summaryDateAddedFrom);
        filteredAssets = filteredAssets.filter(a => a.createdAt >= from);
      }
      if (summaryDateAddedTo) {
        const to = new Date(summaryDateAddedTo);
        to.setHours(23, 59, 59, 999);
        filteredAssets = filteredAssets.filter(a => a.createdAt <= to);
      }

      // Purchase date filter
      if (summaryDateBoughtFrom) {
        const from = new Date(summaryDateBoughtFrom);
        filteredAssets = filteredAssets.filter(a => a.purchaseDate && a.purchaseDate >= from);
      }
      if (summaryDateBoughtTo) {
        const to = new Date(summaryDateBoughtTo);
        to.setHours(23, 59, 59, 999);
        filteredAssets = filteredAssets.filter(a => a.purchaseDate && a.purchaseDate <= to);
      }

      // Warranty months filter
      if (summaryWarrantyMonthsMin) {
        const min = parseInt(summaryWarrantyMonthsMin, 10);
        if (!isNaN(min)) {
          filteredAssets = filteredAssets.filter(a => (a.warranty_months ?? 0) >= min);
        }
      }
      if (summaryWarrantyMonthsMax) {
        const max = parseInt(summaryWarrantyMonthsMax, 10);
        if (!isNaN(max)) {
          filteredAssets = filteredAssets.filter(a => (a.warranty_months ?? 0) <= max);
        }
      }

      // Maintenance date filter (matches if either last or next maintenance date is in range)
      if (summaryMaintenanceFrom) {
        const from = new Date(summaryMaintenanceFrom);
        filteredAssets = filteredAssets.filter(a =>
          (a.lastMaintenanceDate && a.lastMaintenanceDate >= from) ||
          (a.nextMaintenanceDate && a.nextMaintenanceDate >= from)
        );
      }
      if (summaryMaintenanceTo) {
        const to = new Date(summaryMaintenanceTo);
        to.setHours(23, 59, 59, 999);
        filteredAssets = filteredAssets.filter(a =>
          (a.lastMaintenanceDate && a.lastMaintenanceDate <= to) ||
          (a.nextMaintenanceDate && a.nextMaintenanceDate <= to)
        );
      }

      // Employee name filter
      if (summaryEmployeeName) {
        const term = summaryEmployeeName.toLowerCase();
        filteredAssets = filteredAssets.filter(a =>
          a.assignedTo.toLowerCase().includes(term)
        );
      }

      // Accountability form filter
      if (summaryAccountabilityForm) {
        const term = summaryAccountabilityForm.toLowerCase();
        filteredAssets = filteredAssets.filter(a =>
          (a.accountabilityForm?.formNumber ?? '').toLowerCase().includes(term)
        );
      }

      // Location filter
      if (summaryLocation) {
        filteredAssets = filteredAssets.filter(a => a.location === summaryLocation);
      }

      // Department filter
      if (summaryDepartment) {
        filteredAssets = filteredAssets.filter(a => a.department === summaryDepartment);
      }

      const selectedCols = availableColumns.filter(col =>
        summarySelectedColumns.has(col.key)
      );
      const parts: string[] = [];
      if (searchTerm) parts.push(`Search: "${searchTerm}"`);
      if (scopeParam) parts.push(`Scope: ${formatScopeLabel(scopeParam)}`);
      if (summaryDateAddedFrom || summaryDateAddedTo) {
        const d = [summaryDateAddedFrom || '…', summaryDateAddedTo || '…'].join(' – ');
        parts.push(`Added: ${d}`);
      }
      if (summaryDateBoughtFrom || summaryDateBoughtTo) {
        const d = [summaryDateBoughtFrom || '…', summaryDateBoughtTo || '…'].join(' – ');
        parts.push(`Bought: ${d}`);
      }
      if (summaryEmployeeName) parts.push(`Employee: "${summaryEmployeeName}"`);
      if (summaryAccountabilityForm) parts.push(`Form#: "${summaryAccountabilityForm}"`);
      if (summaryLocation) parts.push(`Location: "${summaryLocation}"`);
      if (summaryDepartment) parts.push(`Dept: "${summaryDepartment}"`);
      const filterLabel = parts.length > 0 ? parts.join(' | ') : undefined;
      if (summaryExportType === 'pdf') {
        await exportSummaryToPDF(filteredAssets, activeCompany, currentUser, selectedCols, filterLabel, assetBuilders);
      } else if (summaryExportType === 'excel') {
        await exportSummaryToExcel(filteredAssets, activeCompany, selectedCols, filterLabel, assetBuilders);
      }
    } catch (err) {
      toast.error('Failed to fetch assets for summary export');
    }
  };

  const handleSummaryColumnToggle = (columnKey: string) => {
    const newSelected = new Set(summarySelectedColumns);
    if (newSelected.has(columnKey)) {
      newSelected.delete(columnKey);
    } else {
      newSelected.add(columnKey);
    }
    setSummarySelectedColumns(newSelected);
  };

  const handleExportNextStep = (assets: Asset[]) => {
    // Extract unique employee names, form numbers, locations, departments from current data
    const employeeSet = new Set<string>();
    const formSet = new Set<string>();
    const locationSet = new Set<string>();
    const departmentSet = new Set<string>();
    assets.forEach(a => {
      if (a.assignedTo) employeeSet.add(a.assignedTo);
      const formNum = a.accountabilityForm?.formNumber;
      if (formNum) formSet.add(formNum);
      if (a.location) locationSet.add(a.location);
      if (a.department) departmentSet.add(a.department);
    });
    setExportEmployeeOptions(Array.from(employeeSet).sort());
    setExportFormOptions(Array.from(formSet).sort());
    setExportLocationOptions(Array.from(locationSet).sort());
    setExportDepartmentOptions(Array.from(departmentSet).sort());
    setExportStep(2);
  };

  const handleExportPrevStep = () => {
    setExportStep(1);
  };

  const handleExportClick = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setExportStep(1);
    setSummaryDateAddedFrom('');
    setSummaryDateAddedTo('');
    setSummaryDateBoughtFrom('');
    setSummaryDateBoughtTo('');
    setSummaryWarrantyMonthsMin('');
    setSummaryWarrantyMonthsMax('');
    setSummaryMaintenanceFrom('');
    setSummaryMaintenanceTo('');
    setSummaryEmployeeName('');
    setSummaryAccountabilityForm('');
    setSummaryLocation('');
    setSummaryDepartment('');
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
    scope?: string | null,
    searchTerm?: string | null
  ) => {
    try {
      let allAssets = await fetchAllAssets(companyId, scope, searchTerm);

      // Date added filter
      if (summaryDateAddedFrom) {
        const from = new Date(summaryDateAddedFrom);
        allAssets = allAssets.filter(a => a.createdAt >= from);
      }
      if (summaryDateAddedTo) {
        const to = new Date(summaryDateAddedTo);
        to.setHours(23, 59, 59, 999);
        allAssets = allAssets.filter(a => a.createdAt <= to);
      }

      // Purchase date filter
      if (summaryDateBoughtFrom) {
        const from = new Date(summaryDateBoughtFrom);
        allAssets = allAssets.filter(a => a.purchaseDate && a.purchaseDate >= from);
      }
      if (summaryDateBoughtTo) {
        const to = new Date(summaryDateBoughtTo);
        to.setHours(23, 59, 59, 999);
        allAssets = allAssets.filter(a => a.purchaseDate && a.purchaseDate <= to);
      }

      // Warranty months filter
      if (summaryWarrantyMonthsMin) {
        const min = parseInt(summaryWarrantyMonthsMin, 10);
        if (!isNaN(min)) {
          allAssets = allAssets.filter(a => (a.warranty_months ?? 0) >= min);
        }
      }
      if (summaryWarrantyMonthsMax) {
        const max = parseInt(summaryWarrantyMonthsMax, 10);
        if (!isNaN(max)) {
          allAssets = allAssets.filter(a => (a.warranty_months ?? 0) <= max);
        }
      }

      // Maintenance date filter
      if (summaryMaintenanceFrom) {
        const from = new Date(summaryMaintenanceFrom);
        allAssets = allAssets.filter(a =>
          (a.lastMaintenanceDate && a.lastMaintenanceDate >= from) ||
          (a.nextMaintenanceDate && a.nextMaintenanceDate >= from)
        );
      }
      if (summaryMaintenanceTo) {
        const to = new Date(summaryMaintenanceTo);
        to.setHours(23, 59, 59, 999);
        allAssets = allAssets.filter(a =>
          (a.lastMaintenanceDate && a.lastMaintenanceDate <= to) ||
          (a.nextMaintenanceDate && a.nextMaintenanceDate <= to)
        );
      }

      // Employee name filter
      if (summaryEmployeeName) {
        const term = summaryEmployeeName.toLowerCase();
        allAssets = allAssets.filter(a =>
          a.assignedTo.toLowerCase().includes(term)
        );
      }

      // Accountability form filter
      if (summaryAccountabilityForm) {
        const term = summaryAccountabilityForm.toLowerCase();
        allAssets = allAssets.filter(a =>
          (a.accountabilityForm?.formNumber ?? '').toLowerCase().includes(term)
        );
      }

      // Location filter
      if (summaryLocation) {
        allAssets = allAssets.filter(a => a.location === summaryLocation);
      }

      // Department filter
      if (summaryDepartment) {
        allAssets = allAssets.filter(a => a.department === summaryDepartment);
      }

      const parts: string[] = [];
      if (searchTerm) parts.push(`Search: "${searchTerm}"`);
      if (scope) parts.push(`Scope: ${formatScopeLabel(scope)}`);
      if (summaryDateAddedFrom || summaryDateAddedTo) {
        const d = [summaryDateAddedFrom || '…', summaryDateAddedTo || '…'].join(' – ');
        parts.push(`Added: ${d}`);
      }
      if (summaryDateBoughtFrom || summaryDateBoughtTo) {
        const d = [summaryDateBoughtFrom || '…', summaryDateBoughtTo || '…'].join(' – ');
        parts.push(`Bought: ${d}`);
      }
      if (summaryEmployeeName) parts.push(`Employee: "${summaryEmployeeName}"`);
      if (summaryAccountabilityForm) parts.push(`Form#: "${summaryAccountabilityForm}"`);
      if (summaryLocation) parts.push(`Location: "${summaryLocation}"`);
      if (summaryDepartment) parts.push(`Dept: "${summaryDepartment}"`);
      const filterLabel = parts.length > 0 ? parts.join(' | ') : undefined;
      if (exportType === 'pdf') {
        await exportToPDF(allAssets, activeCompany, currentUser, assetBuilders, filterLabel);
      } else if (exportType === 'excel') {
        await exportToExcel(allAssets, activeCompany, assetBuilders, filterLabel);
      }
    } catch (err) {
      toast.error('Failed to fetch assets for export');
    }
  };

  return {
    isExportDialogOpen,
    exportType,
    exportStep,
    selectedColumns,
    availableColumns,
    handleExportClick,
    handleExportNextStep,
    handleExportPrevStep,
    handleColumnToggle,
    handleExportConfirm,
    setIsExportDialogOpen,
    exportEmployeeOptions,
    exportFormOptions,
    exportLocationOptions,
    exportDepartmentOptions,
    isSummaryExportDialogOpen,
    summaryStep,
    summaryExportType,
    setSummaryExportType,
    summaryScope,
    summarySelectedTypes,
    summaryAvailableTypes,
    summaryIncludeCondition,
    setSummaryIncludeCondition,
    summarySelectedConditions,
    handleSummaryConditionToggle,
    summarySelectedColumns,
    handleSummaryColumnToggle,
    handleSummaryExportClick,
    handleSummaryNextStep,
    handleSummaryPrevStep,
    handleSummaryTypeToggle,
    handleSummaryTypesToggleAll,
    handleSummaryScopeChange,
    handleSummaryExportConfirm,
    setIsSummaryExportDialogOpen,
    summaryDateAddedFrom,
    setSummaryDateAddedFrom,
    summaryDateAddedTo,
    setSummaryDateAddedTo,
    summaryDateBoughtFrom,
    setSummaryDateBoughtFrom,
    summaryDateBoughtTo,
    setSummaryDateBoughtTo,
    summaryWarrantyMonthsMin,
    setSummaryWarrantyMonthsMin,
    summaryWarrantyMonthsMax,
    setSummaryWarrantyMonthsMax,
    summaryMaintenanceFrom,
    setSummaryMaintenanceFrom,
    summaryMaintenanceTo,
    setSummaryMaintenanceTo,
    summaryEmployeeName,
    setSummaryEmployeeName,
    summaryAccountabilityForm,
    setSummaryAccountabilityForm,
    summaryEmployeeOptions,
    summaryFormOptions,
    summaryLocation,
    setSummaryLocation,
    summaryDepartment,
    setSummaryDepartment,
    summaryLocationOptions,
    summaryDepartmentOptions,
  };
};

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

/**
 * Compute column widths based on the longest content in each column.
 * Uses the base width as a floor and caps at 50 to avoid overly wide columns.
 */
function calculateColumnWidths(
  selectedCols: { key: string; label: string }[],
  rows: { cells: string[] }[],
  baseWidths: Record<string, number>,
): Record<string, number> {
  const widths: Record<string, number> = {};
  selectedCols.forEach((col, idx) => {
    const headerLen = col.label.length;
    let maxLen = headerLen;
    rows.forEach(row => {
      const cell = row.cells[idx];
      if (cell) {
        const len = String(cell).length;
        if (len > maxLen) maxLen = len;
      }
    });
    const base = baseWidths[col.key] || 20;
    const computed = Math.min(Math.max(maxLen + 2, base), 50);
    widths[col.key] = computed;
  });
  return widths;
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

  const mapped = (res.assets ?? []).map(mapDtoToAsset);
  const flattened: Asset[] = [];
  const seen = new Set<string>();

  for (const asset of mapped) {
    if (!seen.has(asset.id)) {
      flattened.push(asset);
      seen.add(asset.id);
    }
    // The server hides builder component assets from the top-level response but
    // nests them under the parent's `children`. Flatten them so export lookups
    // (assets.find(a => a.id === item.asset_code)) can resolve builder items and
    // summary counts include the components. This only affects the export path:
    // the on-screen Asset List table reads from a separate data hook.
    if (asset.children?.length) {
      for (const child of asset.children) {
        if (!seen.has(child.id)) {
          flattened.push(child);
          seen.add(child.id);
        }
      }
    }
  }

  console.log(
    '[AssetExport fetchAllAssets]',
    apiUrl,
    '→',
    res.assets?.length ?? 0,
    'assets returned,',
    flattened.length,
    'after flattening builder children',
  );

  return flattened;
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
    assignedTo: dto.currentAssignment?.user?.name || dto.pendingAssignment?.user?.name || '',
    department: (() => {
      if (dto.currentAssignment?.department) return dto.currentAssignment.department;
      if (dto.pendingAssignment?.department) return dto.pendingAssignment.department;
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
      dto.pendingAssignment?.location ||
      `${dto.location_name || ''}${dto.room_name ? ` - ${dto.room_name}` : ''}`,
    currentAssignment: dto.currentAssignment ?? undefined,
    pendingAssignment: dto.pendingAssignment ?? undefined,
    isPendingSignature: Boolean(dto.isPendingSignature),
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
    bookValue: dto.book_value ?? undefined,
    accumulatedDepreciation: dto.accumulated_depreciation ?? undefined,
    monthlyDepreciation: dto.monthly_depreciation ?? undefined,
    pastBookValue: dto.past_book_value ?? undefined,
    pastAccumulatedDepreciation: dto.past_accumulated_depreciation ?? undefined,
    pastMonthlyDepreciation: dto.past_monthly_depreciation ?? undefined,
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
      const activeStatuses = ['Pending', 'Signed', 'Completed'];
      const form = dto.accountabilityForms?.find(
        (f: any) => activeStatuses.includes(f.status)
      );
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
    isAssetBuilder: Boolean(dto.isAssetBuilder),
    builderStatus: dto.builderStatus ?? undefined,
    children: Array.isArray(dto.children)
      ? dto.children.map((child: unknown) => {
        // Handles both a full AssetResponseDto (has asset_code) and the
        // server's minimal fallback { asset_code, name }.
        return 'asset_code' in (child as any) && (child as any).asset_code
          ? mapDtoToAsset(child as AssetResponseDto)
          : mapChildToAsset(child, dto.builderStatus);
      })
      : undefined,
  };
}

/**
 * Convert a builder child entry into an Asset. The server may send a full
 * asset DTO inside `children`, or a minimal fallback like { asset_code, name }
 * when the child isn't part of the current result set. Mirrors the child
 * resolution in the asset list data hook so export lookup + summary counts see
 * the same component assets the parent shows when expanded on screen.
 */
function mapChildToAsset(child: unknown, builderStatus?: string | null): Asset {
  const c = (child ?? {}) as Record<string, string>;
  const code = c.asset_code || c.id || '';
  return {
    id: code,
    assetID: c.assetID,
    name: c.name || code,
    image: '',
    description: '',
    category: c.category_name || '',
    type: c.type_name || '',
    serialNo: c.serial || '',
    modelNo: c.model || '',
    brand: c.brand || '',
    status: (builderStatus as Asset['status']) || 'Partial',
    assignedTo: '',
    department: '',
    location: '',
    purchaseDate: null,
    purchasePrice: 0,
    supplier: '',
    warranty: null,
    warranty_months: null,
    documents: [],
    maintenanceSchedule: 'None',
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
    condition: 'Good',
    usefulLifeYears: 0,
    salvageValue: 0,
    depreciationMethod: '',
    annualDepreciation: 0,
    depreciationStartDate: null,
    company: '',
    building: '',
    createdAt: new Date(0),
    createdBy: '',
    updatedAt: new Date(0),
    updatedBy: '',
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
      'usefulLifeYears',
      'salvageValue',
      'depreciationMethod',
      'depreciationStartDate',
      'annualDepreciation',
      'bookValue',
      'accumulatedDepreciation',
      'monthlyDepreciation',
      'pastBookValue',
      'pastAccumulatedDepreciation',
      'pastMonthlyDepreciation',
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
    { key: 'depreciationStartDate', label: 'Depreciation Start Date' },
    { key: 'annualDepreciation', label: 'Annual Depreciation' },
    { key: 'bookValue', label: 'Current Book Value' },
    { key: 'accumulatedDepreciation', label: 'Current Accumulated Depreciation' },
    { key: 'monthlyDepreciation', label: 'Current Depreciation / Month' },
    { key: 'pastBookValue', label: 'Past Book Value' },
    { key: 'pastAccumulatedDepreciation', label: 'Past Accumulated Depreciation' },
    { key: 'pastMonthlyDepreciation', label: 'Past Depreciation / Month' },
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
    if (colKey === 'assignedTo' && !value && (a.currentAssignment?.user?.name || a.pendingAssignment?.user?.name)) {
      value = a.currentAssignment?.user?.name || a.pendingAssignment?.user?.name;
      if (!a.currentAssignment && a.pendingAssignment) value = `${value} (Pending IT/Admin signature)`;
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
    if (colKey === 'bookValue' && value)
      return formatCurrency(value);
    if (colKey === 'accumulatedDepreciation' && value)
      return formatCurrency(value);
    if (colKey === 'monthlyDepreciation' && value)
      return formatCurrency(value);
    if (colKey === 'pastBookValue' && value != null)
      return formatCurrency(value);
    if (colKey === 'pastAccumulatedDepreciation' && value != null)
      return formatCurrency(value);
    if (colKey === 'pastMonthlyDepreciation' && value != null)
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
                builderName: builder.name,
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
            name: builder.name,
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
        cells: cols.map((_, idx) => idx === 0 ? group.name : ''),
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

    // Add "Asset List" section header (matches Excel export naming)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset List', 165, currentY, { align: 'center' });
    currentY += 5;

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
                builderName: builder.name 
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
            name: builder.name,
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
      // Add separator row with builder name only in first cell (colSpan handles visual merge)
      const separatorCells = selectedCols.map((_, idx) => idx === 0 ? group.name : '');
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
      depreciationStartDate: 22,
      annualDepreciation: 20,
      bookValue: 18,
      accumulatedDepreciation: 20,
      monthlyDepreciation: 18,
      pastBookValue: 18,
      pastAccumulatedDepreciation: 20,
      pastMonthlyDepreciation: 18,
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
        if (data.section !== 'body') return;
        const row = bodyRows[data.row.index];
        const colKey = selectedCols[data.column.index]?.key;
        if (row.isSeparator) {
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = Math.max(6, 9 - selectedCols.length * 0.2);
          data.cell.styles.halign = 'center';
          if (data.column.index !== 0) {
            data.cell.styles.cellWidth = 0;
            data.cell.styles.minCellWidth = 0;
          }
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
    currentUser?: { name: string } | null,
    assetBuilders?: any[] | null,
filterLabel?: string
  ) => {
    const selectedCols = availableColumns.filter(col =>
      selectedColumns.has(col.key)
    );

    const workbook = new ExcelJS.Workbook();

    // Assets sheet — header row + data rows derived from selected columns.
    const assetsSheet = workbook.addWorksheet('Assets');

    const lastCol = selectedCols.length || 5; // 1-based column index for last data column
    const logoEndCol = 3; // Logo spans columns A-C (1-3)

    // Define base column widths (used as floor for auto-sizing)
    const baseColumnWidths: Record<string, number> = {
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
      depreciationStartDate: 22,
      annualDepreciation: 20,
      bookValue: 18,
      accumulatedDepreciation: 20,
      monthlyDepreciation: 18,
      pastBookValue: 18,
      pastAccumulatedDepreciation: 20,
      pastMonthlyDepreciation: 18,
      company: 25,
      building: 20,
      createdBy: 25,
      createdAt: 18,
      updatedBy: 25,
      updatedAt: 18,
    };

    // Set column definitions BEFORE adding any rows so merges align correctly
    assetsSheet.columns = selectedCols.map(col => ({
      key: col.key,
      width: baseColumnWidths[col.key] || 20,
    }));

    // Add company logo if available - place in columns A-C, rows 1-3
    if (activeCompany?.logo_url) {
      try {
        const proxiedUrl = activeCompany.logo_url;
        const resolvedLogoUrl = proxiedUrl.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${proxiedUrl}`
          : proxiedUrl;
        const response = await fetch(resolvedLogoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Set column widths for A, B, C to make room for logo spanning 3 columns
          assetsSheet.getColumn(1).width = 15; // Column A
          assetsSheet.getColumn(2).width = 15; // Column B
          assetsSheet.getColumn(3).width = 15; // Column C

          // Add image to workbook and worksheet - place in columns A-C (0-2), rows 1-3 (0-2)
          const imageId = workbook.addImage({
            base64: dataUrl.split(',')[1],
            extension: dataUrl.includes('jpeg') || dataUrl.includes('jpg') ? 'jpeg' : 'png',
          });
          assetsSheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 360, height: 60 }, // width ~3 columns * 120px
            editAs: 'oneCell',
          });
        }
      } catch (error) {
        console.debug('Company logo not found for Excel export, continuing without it');
      }
    }

    // Row 1: "Asset List Report" centered in the full table (columns A to lastCol)
    const reportTitleRow = assetsSheet.addRow(['Asset List Report']);
    reportTitleRow.font = { bold: true, size: 14, color: { argb: 'FF333333' } };
    assetsSheet.mergeCells(1, 1, 1, lastCol);
    reportTitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Row 2: "Total Assets: X" centered in the full table
    const totalAssetsRow = assetsSheet.addRow([`Total Assets: ${assets.length}`]);
    totalAssetsRow.font = { size: 11, color: { argb: 'FF666666' } };
    assetsSheet.mergeCells(2, 1, 2, lastCol);
    totalAssetsRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Row 3: Scope/Filter label if present
    if (filterLabel) {
      const filterRow = assetsSheet.addRow([filterLabel]);
      filterRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      assetsSheet.mergeCells(3, 1, 3, lastCol);
      filterRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // Row 4: empty spacer
    assetsSheet.addRow([]);

    // Row: "Generated on: date time by user" at far right - last 3 columns only
    const now = new Date();
    const generatedBy = currentUser?.name || 'Unknown';
    const genColStart = Math.max(1, lastCol - 2); // Last 3 columns
    const generatedRow = assetsSheet.addRow([]);
    const genCell = generatedRow.getCell(genColStart);
    genCell.value = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} by ${generatedBy}`;
    genCell.font = { size: 9, color: { argb: 'FF999999' }, italic: true };
    assetsSheet.mergeCells(generatedRow.number, genColStart, generatedRow.number, lastCol);
    generatedRow.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    // Row 6: empty spacer before header
    assetsSheet.addRow([]);

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
                builderName: builder.name 
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
            name: builder.name,
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
    let currentRowIndex = headerRow.number + 1; // Start after header row
    let currentGroupIndex = 0;

    builderGroups.forEach(group => {
      // Add separator row with builder name
      const separatorRow = assetsSheet.addRow([]);
      separatorRow.height = 25;
      
      // Merge cells for builder name
      assetsSheet.mergeCells(`A${currentRowIndex}:${String.fromCharCode(64 + selectedCols.length)}${currentRowIndex}`);
      const separatorCell = assetsSheet.getCell(`A${currentRowIndex}`);
      separatorCell.value = group.name;
      separatorCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      separatorCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerArgb },
      };
      separatorCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
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

    // Auto-size column widths based on content
    const allRows = buildGroupedAssetListRows(assets, selectedCols, assetBuilders);
    const autoWidths = calculateColumnWidths(selectedCols, allRows, baseColumnWidths);
    selectedCols.forEach((col, i) => {
      assetsSheet.getColumn(i + 1).width = autoWidths[col.key] || baseColumnWidths[col.key] || 20;
    });

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
      'usefulLifeYears',
      'salvageValue',
      'depreciationMethod',
      'depreciationStartDate',
      'annualDepreciation',
      'bookValue',
      'accumulatedDepreciation',
      'monthlyDepreciation',
      'pastBookValue',
      'pastAccumulatedDepreciation',
      'pastMonthlyDepreciation',
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

  // Use separate interface for objects with dynamic condition properties
  interface TypeSummaryDynamic extends TypeSummary {
    [key: string]: number | string;
  }

  interface TypeSummaryWithMeta extends TypeSummaryDynamic {
    category: string;
    type: string;
  }

  interface CategoryTypeSummary {
    category: string;
    types: TypeSummaryWithMeta[];
    subtotal: TypeSummaryDynamic;
  }

  interface EmployeeSummary {
    name: string;
    department: string;
    company: string;
    count: number;
  }

  function computeSummaryData(assets: Asset[]) {
    const typeMap: Record<string, TypeSummaryWithMeta> = {};
    const empMap: Record<string, EmployeeSummary> = {};
    const deptMap: Record<string, { department: string; company: string; count: number }> = {};

    const workingStatuses = new Set([
      'Available', 'Assigned', 'In Use', 'Borrowed', 'Service Unit',
    ]);

    assets.forEach(asset => {
      // Device Type summary (grouped by category)
      const type = asset.type || 'Uncategorized';
      const category = asset.category || 'Uncategorized';
      const typeKey = `${category}|${type}`;
      if (!typeMap[typeKey]) {
        typeMap[typeKey] = {
          category,
          type,
          units: 0, working: 0, defective: 0,
          Excellent: 0, Good: 0, Fair: 0, Poor: 0, Damaged: 0,
        };
      }
      const t = typeMap[typeKey];
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

    // Group types by category and compute subtotals
    const categoryMap: Record<string, CategoryTypeSummary> = {};
    Object.values(typeMap).forEach(t => {
      const cat = t.category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          types: [],
          subtotal: {
            units: 0, working: 0, defective: 0,
            Excellent: 0, Good: 0, Fair: 0, Poor: 0, Damaged: 0,
          },
        };
      }
      categoryMap[cat].types.push(t);
      // Add to subtotal
      const sub = categoryMap[cat].subtotal;
      sub.units += t.units;
      sub.working += t.working;
      sub.defective += t.defective;
      sub.Excellent += t.Excellent;
      sub.Good += t.Good;
      sub.Fair += t.Fair;
      sub.Poor += t.Poor;
      sub.Damaged += t.Damaged;
    });

    // Sort categories and types within each category
    const sortedCategories = Object.values(categoryMap).sort((a, b) => a.category.localeCompare(b.category));
    sortedCategories.forEach(cat => {
      cat.types.sort((a, b) => a.type.localeCompare(b.type));
    });

    // Flatten for backward compatibility (if needed elsewhere)
    const typeRows = Object.values(typeMap).map(t => ({ type: t.type, category: t.category, units: t.units, working: t.working, defective: t.defective, Excellent: t.Excellent, Good: t.Good, Fair: t.Fair, Poor: t.Poor, Damaged: t.Damaged }));
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

    return { typeRows, categoryRows: sortedCategories, empRows, deptRows, empByCompany };
  }

const exportSummaryToPDF = async (
    assets: Asset[],
    activeCompany: Company | null,
    currentUser?: { name: string } | null,
    listCols?: { key: string; label: string }[],
    filterLabel?: string,
    assetBuilders?: any[] | null
  ) => {
    const { categoryRows, empByCompany, deptRows } = computeSummaryData(assets);

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

    // ── Table 1: Device Type Summary (left) - grouped by Category with subtotals and grand total ──
    const conditionsToInclude = summaryIncludeCondition
      ? SUMMARY_CONDITIONS.filter(c => summarySelectedConditions.includes(c))
      : [];
    const typeColumns = ['Device Type', '# Units', 'Working', 'Defective', ...conditionsToInclude];
    const typeData: (string | number)[][] = [];

    // Build rows grouped by category with subtotals
    categoryRows.forEach(cat => {
      // Category header row
      typeData.push([cat.category, '', '', '', ...conditionsToInclude.map(() => '')]);
      // Type rows
      cat.types.forEach(t => {
        const row: (string | number)[] = [t.type, t.units, t.working, t.defective];
        conditionsToInclude.forEach(c => row.push((t as any)[c]));
        typeData.push(row);
      });
      // Category subtotal row
      const sub = cat.subtotal;
      const subRow: (string | number)[] = [`${cat.category} Total`, sub.units, sub.working, sub.defective];
      conditionsToInclude.forEach(c => subRow.push(sub[c]));
      typeData.push(subRow);
    });

    // Grand total row
    const grandTotals = categoryRows.reduce((acc: TypeSummaryDynamic, cat) => {
      acc.units += cat.subtotal.units;
      acc.working += cat.subtotal.working;
      acc.defective += cat.subtotal.defective;
      conditionsToInclude.forEach(c => { acc[c] = ((acc[c] as number) ?? 0) + ((cat.subtotal[c] as number) ?? 0); });
      return acc;
    }, { units: 0, working: 0, defective: 0, Excellent: 0, Good: 0, Fair: 0, Poor: 0, Damaged: 0, ...Object.fromEntries(conditionsToInclude.map(c => [c, 0])) } as TypeSummaryDynamic);
    const grandTotalRow: (string | number)[] = ['Grand Total', grandTotals.units, grandTotals.working, grandTotals.defective];
    conditionsToInclude.forEach(c => grandTotalRow.push(grandTotals[c] ?? 0));
    typeData.push(grandTotalRow);

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
        const row = typeData[data.row.index];
        if (!row) return;
        const isCategoryHeader = row[1] === '' && row[2] === '' && row[3] === '';
        const isSubtotal = typeof row[0] === 'string' && row[0].endsWith(' Total') && row[0] !== 'Grand Total';
        const isGrandTotal = row[0] === 'Grand Total';

        if (isCategoryHeader) {
          data.cell.styles.fillColor = headerFill as any;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7;
        } else if (isSubtotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        } else if (isGrandTotal) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = headerFill as any;
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
        if (data.section !== 'body') return;
        const row = listRows[data.row.index];
        const colKey = summaryAssetColumns[data.column.index]?.key;
        if (row?.isSeparator) {
          data.cell.styles.fillColor = headerFill;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = listFontSize;
          data.cell.styles.halign = 'center';
          if (data.column.index !== 0) {
            data.cell.styles.cellWidth = 0;
            data.cell.styles.minCellWidth = 0;
          }
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
    currentUser?: { name: string } | null,
    listCols?: { key: string; label: string }[],
    filterLabel?: string,
    assetBuilders?: any[] | null
  ) => {
    const { categoryRows, empByCompany, deptRows } = computeSummaryData(assets);

    const workbook = new ExcelJS.Workbook();

    // Compute company accent color for header
    const accentColor = getCompanyAccentColor(activeCompany?.name);
    const headerArgb = `FF${accentColor.r.toString(16).padStart(2, '0')}${accentColor.g.toString(16).padStart(2, '0')}${accentColor.b.toString(16).padStart(2, '0')}`;

    const conditionLabels = SUMMARY_CONDITIONS.filter(c => summarySelectedConditions.includes(c));
    const typeHeaders = ['Device Type', '# Units', 'Working', 'Defective'];
    if (summaryIncludeCondition) {
      typeHeaders.push(...conditionLabels);
    }
    const typeColCount = typeHeaders.length;

    const empColOffset = 12;
    const lastCol = empColOffset + 2;

    // ============================================================
    // SHEET 1: Summary - Device Type, Employee, Department
    // ============================================================
    const wsSummary = workbook.addWorksheet('Summary');

    // ── Header Section (logo, title, totals, generated-by) ──
    if (activeCompany?.logo_url) {
      try {
        const proxiedUrl = activeCompany.logo_url;
        const resolvedLogoUrl = proxiedUrl.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${proxiedUrl}`
          : proxiedUrl;
        const response = await fetch(resolvedLogoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          wsSummary.getColumn(1).width = 15;
          wsSummary.getColumn(2).width = 15;
          wsSummary.getColumn(3).width = 15;
          const imageId = workbook.addImage({
            base64: dataUrl.split(',')[1],
            extension: dataUrl.includes('jpeg') || dataUrl.includes('jpg') ? 'jpeg' : 'png',
          });
          wsSummary.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 360, height: 60 },
            editAs: 'oneCell',
          });
        }
      } catch (_error) {
        console.debug('Company logo not found for summary Excel export, continuing without it');
      }
    }

    const titleRow = wsSummary.addRow(['Summary Report']);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF333333' } };
    wsSummary.mergeCells(titleRow.number, 1, titleRow.number, lastCol);
    titleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const totalAssetsRow = wsSummary.addRow([`Total Assets: ${assets.length}`]);
    totalAssetsRow.font = { size: 11, color: { argb: 'FF666666' } };
    wsSummary.mergeCells(totalAssetsRow.number, 1, totalAssetsRow.number, lastCol);
    totalAssetsRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    if (filterLabel) {
      const filterRow = wsSummary.addRow([filterLabel]);
      filterRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      wsSummary.mergeCells(filterRow.number, 1, filterRow.number, lastCol);
      filterRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    const now = new Date();
    const generatedBy = currentUser?.name || 'Unknown';
    const genColStart = Math.max(1, lastCol - 2);
    const generatedRow = wsSummary.addRow([]);
    const genCell = generatedRow.getCell(genColStart);
    genCell.value = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} by ${generatedBy}`;
    genCell.font = { size: 9, color: { argb: 'FF999999' }, italic: true };
    wsSummary.mergeCells(generatedRow.number, genColStart, generatedRow.number, lastCol);
    generatedRow.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    wsSummary.addRow([]); // spacer

    // ── Build device type display rows ──
    const typeDisplayRows: Array<{
      cells: (string | number)[];
      isCategory?: boolean;
      isSubtotal?: boolean;
      isGrandTotal?: boolean;
    }> = [];

    typeDisplayRows.push({ cells: typeHeaders });

    const categorySubtotals: Array<{ category: string; subtotal: TypeSummaryDynamic }> = [];

    categoryRows.forEach(cat => {
      typeDisplayRows.push({ cells: [cat.category, ...typeHeaders.slice(1).map(() => '')], isCategory: true });
      cat.types.forEach(t => {
        const row: (string | number)[] = [t.type, t.units, t.working, t.defective];
        conditionLabels.forEach(c => row.push((t as any)[c]));
        typeDisplayRows.push({ cells: row });
      });
      const sub: TypeSummaryDynamic = cat.subtotal;
      const subRow: (string | number)[] = [`${cat.category} Total`, sub.units, sub.working, sub.defective];
      conditionLabels.forEach(c => subRow.push(sub[c]));
      typeDisplayRows.push({ cells: subRow, isSubtotal: true });
      categorySubtotals.push({ category: cat.category, subtotal: sub });
    });

    const grandTotals = categorySubtotals.reduce((acc: TypeSummaryDynamic, cat) => {
      acc.units += cat.subtotal.units;
      acc.working += cat.subtotal.working;
      acc.defective += cat.subtotal.defective;
      conditionLabels.forEach(c => { acc[c] = ((acc[c] as number) ?? 0) + ((cat.subtotal[c] as number) ?? 0); });
      return acc;
    }, { units: 0, working: 0, defective: 0, Excellent: 0, Good: 0, Fair: 0, Poor: 0, Damaged: 0, ...Object.fromEntries(conditionLabels.map(c => [c, 0])) } as TypeSummaryDynamic);

    const eTotalRow: (string | number)[] = ['Grand Total', grandTotals.units, grandTotals.working, grandTotals.defective];
    conditionLabels.forEach(c => eTotalRow.push(grandTotals[c] ?? 0));
    typeDisplayRows.push({ cells: eTotalRow, isGrandTotal: true });

    // ── Build employee display rows ──
    const empHeaders = ['Employee Name', 'Department', '# Assets'];
    const empDisplayRows: Array<{
      cells: (string | number)[];
      isSeparator?: boolean;
      isTotal?: boolean;
    }> = [];

    empDisplayRows.push({ cells: empHeaders });

    let empTotal = 0;
    empByCompany.forEach(([company, employees]) => {
      empDisplayRows.push({ cells: [company, '', ''], isSeparator: true });
      employees.forEach(emp => {
        empDisplayRows.push({ cells: [emp.name, emp.department, emp.count] });
        empTotal += emp.count;
      });
    });
    empDisplayRows.push({ cells: ['Total', '', empTotal], isTotal: true });

    // ── Render side-by-side tables (device type left, employee right) ──
    const maxRows = Math.max(typeDisplayRows.length, empDisplayRows.length);

    for (let i = 0; i < maxRows; i++) {
      const row = wsSummary.addRow([]);
      const rowNum = row.number;

      // Device type side (cols 1..typeColCount)
      const tRow = typeDisplayRows[i];
      if (tRow) {
        tRow.cells.forEach((cell, idx) => {
          const c = row.getCell(idx + 1);
          c.value = cell;
          c.alignment = { wrapText: true, vertical: 'middle' };
        });
        if (i === 0) {
          // Type header
          row.eachCell((cell, colIdx) => {
            if (colIdx <= typeColCount) {
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
            }
          });
        } else if (tRow.isCategory) {
          wsSummary.mergeCells(rowNum, 1, rowNum, typeColCount);
          const cell = row.getCell(1);
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
          cell.alignment = { wrapText: true, vertical: 'middle' };
        } else if (tRow.isSubtotal) {
          row.eachCell((cell, colIdx) => {
            if (colIdx <= typeColCount) {
              cell.font = { bold: true };
              cell.alignment = { wrapText: true, vertical: 'middle' };
            }
          });
          for (let ci = 1; ci <= typeColCount; ci++) {
            row.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
          }
        } else if (tRow.isGrandTotal) {
          row.eachCell((cell, colIdx) => {
            if (colIdx <= typeColCount) {
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
              cell.alignment = { wrapText: true, vertical: 'middle' };
            }
          });
        }
      }

      // Employee side (cols empColOffset..empColOffset+2)
      const eRow = empDisplayRows[i];
      if (eRow) {
        eRow.cells.forEach((cell, idx) => {
          const c = row.getCell(empColOffset + idx);
          c.value = cell;
          c.alignment = { wrapText: true, vertical: 'middle' };
        });
        if (i === 0) {
          // Emp header
          for (let ci = 0; ci < 3; ci++) {
            const cell = row.getCell(empColOffset + ci);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
          }
        } else if (eRow.isSeparator) {
          for (let ci = 0; ci < 3; ci++) {
            const cell = row.getCell(empColOffset + ci);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF666666' } };
          }
        } else if (eRow.isTotal) {
          for (let ci = 0; ci < 3; ci++) {
            const cell = row.getCell(empColOffset + ci);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
          }
        }
      }
    }

    // Set column widths for type side
    wsSummary.getColumn(1).width = 22;
    wsSummary.getColumn(2).width = 10;
    wsSummary.getColumn(3).width = 10;
    wsSummary.getColumn(4).width = 12;
    conditionLabels.forEach((_, idx) => {
      wsSummary.getColumn(5 + idx).width = 12;
    });
    // Gap columns
    for (let ci = typeColCount + 1; ci < empColOffset; ci++) {
      wsSummary.getColumn(ci).width = 3;
    }
    // Employee columns
    wsSummary.getColumn(empColOffset).width = 30;
    wsSummary.getColumn(empColOffset + 1).width = 22;
    wsSummary.getColumn(empColOffset + 2).width = 12;

    // ── Table 3: Department Summary (below employee table, same column offset) ──
    const combinedStartRow = wsSummary.rowCount - maxRows + 1;
    const employeeEndRow = combinedStartRow + empDisplayRows.length - 1;
    const deptStartRow = employeeEndRow + 3; // 3 rows spacing after employee table

    // Ensure enough rows exist for the department table starting point
    while (wsSummary.rowCount < deptStartRow) {
      wsSummary.addRow([]);
    }

    const deptHeaderRow = wsSummary.getRow(deptStartRow);
    const deptH1 = deptHeaderRow.getCell(empColOffset);
    deptH1.value = 'Department';
    deptH1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptH1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    deptH1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const deptH2 = deptHeaderRow.getCell(empColOffset + 1);
    deptH2.value = 'Company';
    deptH2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    deptH2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const deptH3 = deptHeaderRow.getCell(empColOffset + 2);
    deptH3.value = '# Assets';
    deptH3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptH3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    deptH3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const deptETotal = deptRows.reduce((sum, r) => sum + r.count, 0);
    let deptRowNum = deptStartRow + 1;
    deptRows.forEach(r => {
      const deptRow = wsSummary.getRow(deptRowNum);
      deptRow.getCell(empColOffset).value = r.department;
      deptRow.getCell(empColOffset).alignment = { wrapText: true, vertical: 'middle' };
      deptRow.getCell(empColOffset + 1).value = r.company;
      deptRow.getCell(empColOffset + 1).alignment = { wrapText: true, vertical: 'middle' };
      deptRow.getCell(empColOffset + 2).value = r.count;
      deptRow.getCell(empColOffset + 2).alignment = { wrapText: true, vertical: 'middle' };
      deptRowNum++;
      if (deptRowNum > wsSummary.rowCount) wsSummary.addRow([]);
    });

    const deptTotalRow = wsSummary.getRow(deptRowNum);
    if (deptRowNum > wsSummary.rowCount) wsSummary.addRow([]);
    const deptT1 = deptTotalRow.getCell(empColOffset);
    deptT1.value = 'Total';
    deptT1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    deptT1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const deptT2 = deptTotalRow.getCell(empColOffset + 1);
    deptT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    const deptT3 = deptTotalRow.getCell(empColOffset + 2);
    deptT3.value = deptETotal;
    deptT3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    deptT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
    deptT3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // ============================================================
    // SHEET 2: Asset List - Full Asset Details
    // ============================================================
    const wsAssets = workbook.addWorksheet('Asset List');

    const summaryAssetColumns = listCols ?? availableColumns.filter(col =>
      summarySelectedColumns.has(col.key)
    );
    const totalAssetCols = summaryAssetColumns.length || 1;

    // ── Header section for Asset List sheet ──
    if (activeCompany?.logo_url) {
      try {
        const proxiedUrl = activeCompany.logo_url;
        const resolvedLogoUrl = proxiedUrl.startsWith('/') && typeof window !== 'undefined'
          ? `${window.location.origin}${proxiedUrl}`
          : proxiedUrl;
        const response = await fetch(resolvedLogoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          wsAssets.getColumn(1).width = 15;
          wsAssets.getColumn(2).width = 15;
          wsAssets.getColumn(3).width = 15;
          const imageId = workbook.addImage({
            base64: dataUrl.split(',')[1],
            extension: dataUrl.includes('jpeg') || dataUrl.includes('jpg') ? 'jpeg' : 'png',
          });
          wsAssets.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 360, height: 60 },
            editAs: 'oneCell',
          });
        }
      } catch (_error) {
        console.debug('Company logo not found for Asset List sheet, continuing without it');
      }
    }

    const assetsTitleRow = wsAssets.addRow(['Asset List Report']);
    assetsTitleRow.font = { bold: true, size: 14, color: { argb: 'FF333333' } };
    wsAssets.mergeCells(assetsTitleRow.number, 1, assetsTitleRow.number, totalAssetCols);
    assetsTitleRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const assetsTotalRow = wsAssets.addRow([`Total Assets: ${assets.length}`]);
    assetsTotalRow.font = { size: 11, color: { argb: 'FF666666' } };
    wsAssets.mergeCells(assetsTotalRow.number, 1, assetsTotalRow.number, totalAssetCols);
    assetsTotalRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    if (filterLabel) {
      const filterRow = wsAssets.addRow([filterLabel]);
      filterRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      wsAssets.mergeCells(filterRow.number, 1, filterRow.number, totalAssetCols);
      filterRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    const assetsGenColStart = Math.max(1, totalAssetCols - 2);
    const assetsGenRow = wsAssets.addRow([]);
    const assetsGenCell = assetsGenRow.getCell(assetsGenColStart);
    assetsGenCell.value = `Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} by ${generatedBy}`;
    assetsGenCell.font = { size: 9, color: { argb: 'FF999999' }, italic: true };
    wsAssets.mergeCells(assetsGenRow.number, assetsGenColStart, assetsGenRow.number, totalAssetCols);
    assetsGenRow.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

    wsAssets.addRow([]); // spacer

    const listHeaderRow = wsAssets.addRow(['Asset List']);
    listHeaderRow.font = { bold: true, size: 14 };

    const listHeaderRow2 = wsAssets.addRow(summaryAssetColumns.map(col => col.label));
    listHeaderRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    listHeaderRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
    };
    listHeaderRow2.alignment = { wrapText: true, vertical: 'top' };

    const listRows = buildGroupedAssetListRows(
      assets,
      summaryAssetColumns,
      assetBuilders,
    );

    listRows.forEach(row => {
      const dataRow = wsAssets.addRow(row.cells);
      if (row.isSeparator) {
        wsAssets.mergeCells(dataRow.number, 1, dataRow.number, totalAssetCols);
        dataRow.height = 25;
        const separatorCell = dataRow.getCell(1);
        separatorCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        separatorCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerArgb },
        };
        separatorCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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
    // Auto-size column widths based on content
    const summaryAutoWidths = calculateColumnWidths(summaryAssetColumns, listRows, excelColumnWidths);
    summaryAssetColumns.forEach((col, i) => {
      wsAssets.getColumn(i + 1).width = summaryAutoWidths[col.key] || excelColumnWidths[col.key] || 20;
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
      } else       if (summaryExportType === 'excel') {
        await exportSummaryToExcel(filteredAssets, activeCompany, currentUser, selectedCols, filterLabel, assetBuilders);
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
        await exportToExcel(allAssets, activeCompany, currentUser, assetBuilders, filterLabel);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export: ' + (err instanceof Error ? err.message : String(err)));
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

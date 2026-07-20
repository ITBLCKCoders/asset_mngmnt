import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface ParsedAssetRow {
  row: number;
  name: string;
  description?: string | null;
  category: string;
  type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  supplier?: string | null;
  purchaseDate?: string | null;
  assetValue?: number | null;
  salvageValue?: number | null;
  depreciationMethod?: string | null;
  usefulLifeYears?: number | null;
  depreciationStartDate?: string | null;
  company: string;
  building?: string | null;
  department?: string | null;
  locationSite?: string | null;
  locationRoom?: string | null;
  locationNotes?: string | null;
  warrantyMonths?: number | null;
  condition?: string | null;
  maintenanceSchedule?: string | null;
  status?: string | null;
  isOldUnit?: boolean | null;
  assignedUser?: string | null;
}

export interface ParsedBuilderRow {
  row: number;
  builderName: string;
  builderDescription?: string | null;
  assetCode: string;
  isParent: boolean;
}

export interface ImportResult {
  created: number;
  failed: number;
  assets: { row: number; assetCode: string; name: string }[];
  builders: { name: string; assetCodes: string[] }[];
  errors?: { row: number; message: string }[];
}

const ASSET_COLUMNS = [
  'name', 'description', 'category', 'type', 'brand', 'model', 'serial',
  'supplier', 'purchase_date', 'asset_value', 'salvage_value',
  'depreciation_method', 'useful_life_years', 'depreciation_start_date',
  'company', 'building', 'department', 'location_site', 'location_room',
  'location_notes', 'warranty_months', 'condition', 'maintenance_schedule',
  'status', 'is_old_unit', 'assigned_user',
] as const;

const BUILDER_COLUMNS = [
  'builder_name', 'builder_description', 'asset_code', 'is_parent',
] as const;

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  return String(val);
}

function parseNumber(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseBoolean(val: unknown): boolean | null {
  if (val == null || val === '') return null;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'yes' || s === 'true' || s === '1' ? true : s === 'no' || s === 'false' || s === '0' ? false : null;
}

function mapAssetRow(raw: Record<string, unknown>, rowNum: number): ParsedAssetRow {
  const h = (key: string) => raw[Object.keys(raw).find(k => normalizeHeader(k) === normalizeHeader(key)) ?? ''];
  return {
    row: rowNum,
    name: String(h('name') ?? ''),
    description: h('description') != null ? String(h('description')) : null,
    category: String(h('category') ?? ''),
    type: h('type') != null ? String(h('type')) : null,
    brand: h('brand') != null ? String(h('brand')) : null,
    model: h('model') != null ? String(h('model')) : null,
    serial: h('serial') != null ? String(h('serial')) : null,
    supplier: h('supplier') != null ? String(h('supplier')) : null,
    purchaseDate: parseDate(h('purchase_date')),
    assetValue: parseNumber(h('asset_value')),
    salvageValue: parseNumber(h('salvage_value')),
    depreciationMethod: h('depreciation_method') != null ? String(h('depreciation_method')) : null,
    usefulLifeYears: parseNumber(h('useful_life_years')),
    depreciationStartDate: parseDate(h('depreciation_start_date')),
    company: String(h('company') ?? ''),
    building: h('building') != null ? String(h('building')) : null,
    department: h('department') != null ? String(h('department')) : null,
    locationSite: h('location_site') != null ? String(h('location_site')) : null,
    locationRoom: h('location_room') != null ? String(h('location_room')) : null,
    locationNotes: h('location_notes') != null ? String(h('location_notes')) : null,
    warrantyMonths: parseNumber(h('warranty_months')),
    condition: h('condition') != null ? String(h('condition')) : null,
    maintenanceSchedule: h('maintenance_schedule') != null ? String(h('maintenance_schedule')) : null,
    status: h('status') != null ? String(h('status')) : null,
    isOldUnit: parseBoolean(h('is_old_unit')),
    assignedUser: h('assigned_user') != null ? String(h('assigned_user')) : null,
  };
}

function mapBuilderRow(raw: Record<string, unknown>, rowNum: number): ParsedBuilderRow {
  const h = (key: string) => raw[Object.keys(raw).find(k => normalizeHeader(k) === normalizeHeader(key)) ?? ''];
  return {
    row: rowNum,
    builderName: String(h('builder_name') ?? ''),
    builderDescription: h('builder_description') != null ? String(h('builder_description')) : null,
    assetCode: String(h('asset_code') ?? ''),
    isParent: parseBoolean(h('is_parent')) ?? false,
  };
}

export function useAssetImport() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedAssets, setParsedAssets] = useState<ParsedAssetRow[] | null>(null);
  const [parsedBuilders, setParsedBuilders] = useState<ParsedBuilderRow[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setParsedAssets(null);
    setParsedBuilders(null);
    setValidationErrors([]);
    setImportResult(null);
    setIsUploading(false);
    setFileName(null);
  }, []);

  const openDialog = useCallback(() => {
    reset();
    setIsImportDialogOpen(true);
  }, [reset]);

  const closeDialog = useCallback(() => {
    setIsImportDialogOpen(false);
    reset();
  }, [reset]);

  const handleFileUpload = useCallback(async (file: File) => {
    setValidationErrors([]);
    setImportResult(null);
    setParsedAssets(null);
    setParsedBuilders(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const errors: { row: number; field: string; message: string }[] = [];
      const assets: ParsedAssetRow[] = [];
      const builders: ParsedBuilderRow[] = [];

      // Parse Assets sheet
      const assetSheet = workbook.getWorksheet('Assets');
      if (assetSheet) {
        const assetRows: Record<string, unknown>[] = [];
        assetSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
          if (rowIndex === 1) return; // skip header
          const obj: Record<string, unknown> = {};
          const headerRow = assetSheet.getRow(1);
          headerRow.eachCell((cell, colIndex) => {
            const header = String(cell.value ?? '');
            obj[header] = row.getCell(colIndex).value;
          });
          assetRows.push(obj);
        });

        for (let i = 0; i < assetRows.length; i++) {
          const rowNum = i + 2;
          const raw = assetRows[i];
          const name = String(raw[Object.keys(raw).find(k => normalizeHeader(k) === 'name') ?? ''] ?? '');
          const category = String(raw[Object.keys(raw).find(k => normalizeHeader(k) === 'category') ?? ''] ?? '');
          const company = String(raw[Object.keys(raw).find(k => normalizeHeader(k) === 'company') ?? ''] ?? '');

          if (!name.trim()) {
            errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
            continue;
          }
          if (!category.trim()) {
            errors.push({ row: rowNum, field: 'category', message: 'Category is required' });
            continue;
          }
          if (!company.trim()) {
            errors.push({ row: rowNum, field: 'company', message: 'Company is required' });
            continue;
          }

          assets.push(mapAssetRow(raw, rowNum));
        }
      }

      // Parse Builders sheet
      const builderSheet = workbook.getWorksheet('Builders');
      if (builderSheet) {
        const builderRows: Record<string, unknown>[] = [];
        builderSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
          if (rowIndex === 1) return;
          const obj: Record<string, unknown> = {};
          const headerRow = builderSheet.getRow(1);
          headerRow.eachCell((cell, colIndex) => {
            const header = String(cell.value ?? '');
            obj[header] = row.getCell(colIndex).value;
          });
          builderRows.push(obj);
        });

        for (let i = 0; i < builderRows.length; i++) {
          const rowNum = i + 2;
          const raw = builderRows[i];
          const builderName = String(raw[Object.keys(raw).find(k => normalizeHeader(k) === 'builder_name') ?? ''] ?? '');
          const assetCode = String(raw[Object.keys(raw).find(k => normalizeHeader(k) === 'asset_code') ?? ''] ?? '');

          if (!builderName.trim()) {
            errors.push({ row: rowNum, field: 'builder_name', message: 'Builder name is required' });
            continue;
          }
          if (!assetCode.trim()) {
            errors.push({ row: rowNum, field: 'asset_code', message: 'Asset code is required' });
            continue;
          }

          builders.push(mapBuilderRow(raw, rowNum));
        }
      }

      if (assets.length === 0 && builders.length === 0 && errors.length === 0) {
        errors.push({ row: 0, field: 'file', message: 'No data found in the file. Ensure the "Assets" sheet has data starting from row 2.' });
      }

      setParsedAssets(assets);
      setParsedBuilders(builders);
      setValidationErrors(errors);
    } catch (err: any) {
      setValidationErrors([{ row: 0, field: 'file', message: err.message || 'Failed to parse Excel file' }]);
    }
  }, []);

  const handleImport = useCallback(async (): Promise<ImportResult | null> => {
    if (!parsedAssets || parsedAssets.length === 0) {
      toast.error('No valid asset rows to import');
      return null;
    }

    setIsUploading(true);
    try {
      const body: any = {
        assets: parsedAssets.map(a => ({
          name: a.name,
          description: a.description || null,
          category: a.category,
          type: a.type || null,
          brand: a.brand || null,
          model: a.model || null,
          serial: a.serial || null,
          supplier: a.supplier || null,
          purchaseDate: a.purchaseDate || null,
          assetValue: a.assetValue ?? null,
          salvageValue: a.salvageValue ?? null,
          depreciationMethod: a.depreciationMethod || null,
          usefulLifeYears: a.usefulLifeYears ?? null,
          depreciationStartDate: a.depreciationStartDate || null,
          company: a.company,
          building: a.building || null,
          department: a.department || null,
          locationSite: a.locationSite || null,
          locationRoom: a.locationRoom || null,
          locationNotes: a.locationNotes || null,
          warrantyMonths: a.warrantyMonths ?? null,
          condition: a.condition || null,
          maintenanceSchedule: a.maintenanceSchedule || null,
          status: a.status || null,
          isOldUnit: a.isOldUnit ?? null,
          assignedUser: a.assignedUser || null,
        })),
      };

      if (parsedBuilders && parsedBuilders.length > 0) {
        body.builders = parsedBuilders.map(b => ({
          builderName: b.builderName,
          builderDescription: b.builderDescription || null,
          assetCode: b.assetCode,
          isParent: b.isParent,
        }));
      }

      const response = await api.post('/assets/import', body);
      const result: ImportResult = response.data;
      setImportResult(result);

      if (result.failed > 0) {
        toast.warning(`Import completed with ${result.created} created, ${result.failed} errors`);
      } else {
        toast.success(`Successfully imported ${result.created} assets` + (result.builders.length > 0 ? ` and ${result.builders.length} builders` : ''));
      }

      return result;
    } catch (err: any) {
      const msg = err?.message || 'Import request failed';
      toast.error(msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [parsedAssets, parsedBuilders]);

  const downloadTemplate = useCallback(async () => {
    const workbook = new ExcelJS.Workbook();

    // Assets sheet
    const assetSheet = workbook.addWorksheet('Assets');
    const assetHeaders = [
      { header: 'name', width: 28 },
      { header: 'description', width: 30 },
      { header: 'category', width: 18 },
      { header: 'type', width: 16 },
      { header: 'brand', width: 16 },
      { header: 'model', width: 18 },
      { header: 'serial', width: 20 },
      { header: 'supplier', width: 20 },
      { header: 'purchase_date', width: 16 },
      { header: 'asset_value', width: 14 },
      { header: 'salvage_value', width: 14 },
      { header: 'depreciation_method', width: 22 },
      { header: 'useful_life_years', width: 18 },
      { header: 'depreciation_start_date', width: 24 },
      { header: 'company', width: 20 },
      { header: 'building', width: 18 },
      { header: 'department', width: 20 },
      { header: 'location_site', width: 20 },
      { header: 'location_room', width: 18 },
      { header: 'location_notes', width: 24 },
      { header: 'warranty_months', width: 18 },
      { header: 'condition', width: 16 },
      { header: 'maintenance_schedule', width: 22 },
      { header: 'status', width: 16 },
      { header: 'is_old_unit', width: 14 },
      { header: 'assigned_user', width: 20 },
    ];

    assetSheet.columns = assetHeaders.map(h => ({ header: h.header, key: h.header, width: h.width }));
    assetSheet.addRow({
      name: 'Dell OptiPlex 7090',
      description: 'IT Department Desktop',
      category: 'Computer',
      type: 'Desktop',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serial: 'SN-001-ABC',
      supplier: 'ABC Supplier Inc.',
      purchase_date: '2025-01-15',
      asset_value: 65000,
      salvage_value: 5000,
      depreciation_method: 'straight-line',
      useful_life_years: 5,
      depreciation_start_date: '2025-02-01',
      company: 'ACME Corp',
      building: 'Main Building',
      department: 'IT Department',
      location_site: 'Head Office',
      location_room: 'Room 301',
      location_notes: '3rd floor, left wing',
      warranty_months: 24,
      condition: 'Excellent',
      maintenance_schedule: 'Quarterly',
      status: 'Available',
      is_old_unit: 'no',
      assigned_user: 'EMP001',
    });

    // Style header row
    const assetHeaderRow = assetSheet.getRow(1);
    assetHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    assetHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    // Builders sheet
    const builderSheet = workbook.addWorksheet('Builders');
    const builderHeaders = [
      { header: 'builder_name', width: 24 },
      { header: 'builder_description', width: 30 },
      { header: 'asset_code', width: 16 },
      { header: 'is_parent', width: 12 },
    ];

    builderSheet.columns = builderHeaders.map(h => ({ header: h.header, key: h.header, width: h.width }));
    builderSheet.addRow({
      builder_name: 'Workstation Set A',
      builder_description: 'Complete workstation setup',
      asset_code: 'AST-001',
      is_parent: 'yes',
    });
    builderSheet.addRow({
      builder_name: 'Workstation Set A',
      builder_description: 'Complete workstation setup',
      asset_code: 'AST-002',
      is_parent: 'no',
    });

    const builderHeaderRow = builderSheet.getRow(1);
    builderHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    builderHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    isImportDialogOpen,
    setIsImportDialogOpen,
    parsedAssets,
    parsedBuilders,
    validationErrors,
    importResult,
    isUploading,
    fileName,
    openDialog,
    closeDialog,
    handleFileUpload,
    handleImport,
    downloadTemplate,
    reset,
  };
}

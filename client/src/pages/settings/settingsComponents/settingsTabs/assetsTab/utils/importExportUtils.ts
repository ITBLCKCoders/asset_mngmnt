import ExcelJS from 'exceljs';
import { api } from '@/lib/api';

export type EntityType =
  | 'categories'
  | 'suppliers'
  | 'types'
  | 'brands'
  | 'intangible-types'
  | 'risk-levels';

export interface ColumnDef {
  header: string;
  key: string;
  required: boolean;
  example: string;
  description: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const ENTITY_COLUMNS: Record<EntityType, ColumnDef[]> = {
  categories: [
    { header: 'Name', key: 'name', required: true, example: 'Vehicles', description: 'Category name' },
    { header: 'Prefix', key: 'prefix', required: true, example: 'VEH', description: 'Short prefix for asset IDs (2-10 chars)' },
    { header: 'GL Code', key: 'gl_code', required: true, example: '2003', description: 'General Ledger code' },
    { header: 'Department', key: 'department', required: true, example: 'IT Department', description: 'Department name (must exist in system)' },
  ],
  suppliers: [
    { header: 'Name', key: 'name', required: true, example: 'Dell Inc.', description: 'Supplier name' },
    { header: 'Category', key: 'category', required: true, example: 'Vehicles', description: 'Asset category name (must exist in system)' },
    { header: 'Contact', key: 'contact', required: false, example: '+1-234-567-8900', description: 'Contact number' },
    { header: 'Email', key: 'email', required: false, example: 'contact@dell.com', description: 'Email address' },
  ],
  types: [
    { header: 'Name', key: 'name', required: true, example: 'Laptop', description: 'Type name' },
    { header: 'Category', key: 'category', required: true, example: 'Vehicles', description: 'Asset category name (must exist in system)' },
    { header: 'Prefix', key: 'prefix', required: true, example: 'LAP', description: 'Type prefix for smart ID generation' },
  ],
  brands: [
    { header: 'Name', key: 'name', required: true, example: 'Dell', description: 'Brand name' },
    { header: 'Type', key: 'type', required: true, example: 'Laptop', description: 'Asset type name (must exist in system)' },
    { header: 'Prefix', key: 'prefix', required: false, example: 'DEL', description: 'Brand prefix (optional)' },
  ],
  'intangible-types': [
    { header: 'Name', key: 'name', required: true, example: 'Software License', description: 'Intangible asset type name' },
    { header: 'Department', key: 'department', required: true, example: 'IT Department', description: 'Department name (must exist in system)' },
    { header: 'Prefix', key: 'prefix', required: false, example: 'SW', description: 'Optional short code' },
  ],
  'risk-levels': [
    { header: 'Name', key: 'name', required: true, example: 'High', description: 'Risk level name' },
    { header: 'Color', key: 'color', required: false, example: '#ef4444', description: 'Hex color code (e.g., #ef4444)' },
  ],
};

const ENTITY_LABELS: Record<EntityType, string> = {
  categories: 'Asset Categories',
  suppliers: 'Suppliers',
  types: 'Asset Types',
  brands: 'Asset Brands',
  'intangible-types': 'Intangible Asset Types',
  'risk-levels': 'Risk Levels',
};

export function getEntityColumns(entityType: EntityType): ColumnDef[] {
  return ENTITY_COLUMNS[entityType];
}

export function getEntityLabel(entityType: EntityType): string {
  return ENTITY_LABELS[entityType];
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportToCSV(
  entityType: EntityType,
  data: Record<string, unknown>[]
): Promise<void> {
  const columns = ENTITY_COLUMNS[entityType];
  const header = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(col => escapeCsv(row[col.key])).join(',')
  );
  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  entityType: EntityType,
  data: Record<string, unknown>[]
): Promise<void> {
  const columns = ENTITY_COLUMNS[entityType];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(ENTITY_LABELS[entityType]);

  sheet.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: Math.max(c.header.length, c.example.length + 4),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  data.forEach(row => {
    sheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}-export-${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateTemplate(
  entityType: EntityType
): Promise<void> {
  const columns = ENTITY_COLUMNS[entityType];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  sheet.columns = columns.map(c => ({
    header: `${c.header}${c.required ? ' *' : ''}`,
    key: c.key,
    width: Math.max(c.header.length, c.example.length + 6),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const exampleRow: Record<string, string> = {};
  columns.forEach(col => {
    exampleRow[col.key] = col.example;
  });
  sheet.addRow(exampleRow);

  const instructionsSheet = workbook.addWorksheet('Instructions');
  instructionsSheet.columns = [
    { header: 'Column', key: 'col', width: 20 },
    { header: 'Required', key: 'req', width: 12 },
    { header: 'Example', key: 'example', width: 25 },
    { header: 'Description', key: 'desc', width: 50 },
  ];
  const instrHeader = instructionsSheet.getRow(1);
  instrHeader.font = { bold: true };
  columns.forEach(col => {
    instructionsSheet.addRow({
      col: col.header,
      req: col.required ? 'Yes' : 'No',
      example: col.example,
      desc: col.description,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityType}-template.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseImportFile(
  file: File
): Promise<Record<string, string>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(file);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  }
  throw new Error('Unsupported file format. Please use CSV or Excel (.xlsx)');
}

async function parseCSV(file: File): Promise<Record<string, string>[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('File is empty or has no data rows');

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.toLowerCase().replace(/\s+/g, '_')] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function parseExcel(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new Error('File is empty or has no data rows');
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/\s*\*\s*$/, '');
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      rowData[h] = String(cell.value ?? '').trim();
    });
    if (Object.values(rowData).some(v => v)) {
      rows.push(rowData);
    }
  });

  return rows;
}

function mapHeaderKey(header: string): string {
  const normalized = header.toLowerCase().replace(/\s+/g, '_');
  const keyMap: Record<string, string> = {
    name: 'name',
    prefix: 'prefix',
    gl_code: 'gl_code',
    glcode: 'gl_code',
    gl_code_code: 'gl_code',
    department: 'department',
    department_name: 'department',
    category: 'category',
    category_name: 'category',
    contact: 'contact',
    contact_number: 'contact',
    email: 'email',
    email_address: 'email',
    type: 'type',
    type_name: 'type',
    color: 'color',
  };
  return keyMap[normalized] || normalized;
}

export function mapImportRows(
  rows: Record<string, string>[]
): Record<string, string>[] {
  return rows.map(row => {
    const mapped: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = mapHeaderKey(key);
      mapped[mappedKey] = value;
    });
    return mapped;
  });
}

export function validateImportRows(
  entityType: EntityType,
  rows: Record<string, string>[]
): ValidationError[] {
  const columns = ENTITY_COLUMNS[entityType];
  const errors: ValidationError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    columns.forEach(col => {
      if (col.required && !row[col.key]?.trim()) {
        errors.push({
          row: rowNum,
          field: col.key,
          message: `${col.header} is required`,
        });
      }
    });

    if (entityType === 'risk-levels' && row.color?.trim()) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(row.color.trim())) {
        errors.push({
          row: rowNum,
          field: 'color',
          message: 'Color must be a valid hex code (e.g., #ef4444)',
        });
      }
    }
  });

  return errors;
}

export function checkDuplicates(
  entityType: EntityType,
  rows: Record<string, string>[],
  existingNames: string[]
): { duplicates: number; uniqueRows: Record<string, string>[] } {
  const existingSet = new Set(existingNames.map(n => n.toLowerCase()));
  const seen = new Set<string>();
  const uniqueRows: Record<string, string>[] = [];
  let duplicates = 0;

  rows.forEach(row => {
    const name = (row.name ?? '').trim().toLowerCase();
    if (!name) {
      uniqueRows.push(row);
      return;
    }
    if (existingSet.has(name) || seen.has(name)) {
      duplicates++;
    } else {
      seen.add(name);
      uniqueRows.push(row);
    }
  });

  return { duplicates, uniqueRows };
}

async function resolveCategoryIds(
  rows: Record<string, string>[]
): Promise<Record<string, string>[]> {
  const categories = await api.get('/categories') as any[];
  const catMap = new Map<string, string>();
  categories.forEach((c: any) => {
    catMap.set(c.name.toLowerCase(), String(c.categoryID || c.id));
  });

  return rows.map(row => ({
    ...row,
    categoryId: catMap.get((row.category ?? '').toLowerCase()) || '',
  }));
}

async function resolveTypeIds(
  rows: Record<string, string>[]
): Promise<Record<string, string>[]> {
  const types = await api.get('/types') as any[];
  const typeMap = new Map<string, string>();
  types.forEach((t: any) => {
    typeMap.set(t.name.toLowerCase(), String(t.typeID || t.id));
  });

  return rows.map(row => ({
    ...row,
    typeId: typeMap.get((row.type ?? '').toLowerCase()) || '',
  }));
}

async function resolveDepartmentIds(
  rows: Record<string, string>[]
): Promise<Record<string, string>[]> {
  const response = (await api.get('/departments')) as any;
  const departments: any[] = Array.isArray(response)
    ? response
    : response?.departments ?? [];
  const deptMap = new Map<string, string>();
  departments.forEach((d: any) => {
    deptMap.set(d.name.toLowerCase(), String(d.departmentID || d.id));
  });

  return rows.map(row => ({
    ...row,
    departmentId: deptMap.get((row.department ?? '').toLowerCase()) || '',
  }));
}

export async function resolveImportIds(
  entityType: EntityType,
  rows: Record<string, string>[]
): Promise<Record<string, string>[]> {
  switch (entityType) {
    case 'categories':
      return resolveDepartmentIds(rows);
    case 'suppliers':
      return resolveCategoryIds(rows);
    case 'types':
      return resolveCategoryIds(rows);
    case 'brands':
      return resolveTypeIds(rows);
    case 'intangible-types':
      return resolveDepartmentIds(rows);
    case 'risk-levels':
      return rows;
    default:
      return rows;
  }
}

export async function importRows(
  entityType: EntityType,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      await createEntity(entityType, row);
      result.created++;
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      if (msg.toLowerCase().includes('already exist') || msg.toLowerCase().includes('duplicate')) {
        result.skipped++;
      } else {
        result.failed++;
        result.errors.push({ row: rowNum, message: msg });
      }
    }
  }

  return result;
}

async function createEntity(
  entityType: EntityType,
  row: Record<string, string>
): Promise<void> {
  switch (entityType) {
    case 'categories':
      await api.post('/categories', {
        name: row.name,
        prefix: row.prefix?.toUpperCase(),
        gl_code: row.gl_code,
        departmentId: row.departmentId,
      });
      break;
    case 'suppliers':
      await api.post('/suppliers', {
        name: row.name,
        categoryId: row.categoryId,
        contact: row.contact || null,
        email: row.email || null,
      });
      break;
    case 'types':
      await api.post('/types', {
        name: row.name,
        categoryId: row.categoryId,
        prefix: row.prefix?.toUpperCase(),
      });
      break;
    case 'brands':
      await api.post('/brands', {
        name: row.name,
        typeId: row.typeId,
        prefix: row.prefix?.toUpperCase() || '',
      });
      break;
    case 'intangible-types':
      await api.post('/intangible-asset-types', {
        name: row.name,
        prefix: row.prefix?.toUpperCase() || '',
        departmentId: row.departmentId,
      });
      break;
    case 'risk-levels':
      await api.post('/risk-levels', {
        name: row.name,
        color: row.color || '#ef4444',
      });
      break;
  }
}

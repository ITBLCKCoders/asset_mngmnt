export interface ParsedRowRef {
  row: number;
  company: string;
  category: string;
  type?: string | null;
  brand?: string | null;
  supplier?: string | null;
}

export interface MissingRef {
  value: string;
  parentValue?: string;
  rows: number[];
}

export interface ReferenceMismatch {
  row: number;
  field: 'type' | 'brand' | 'supplier';
  message: string;
}

export interface CompanyMismatch {
  row: number;
  company: string;
}

export interface MasterReport {
  referenced: {
    category: boolean;
    type: boolean;
    brand: boolean;
    supplier: boolean;
  };
  empty: {
    category: boolean;
    type: boolean;
    brand: boolean;
    supplier: boolean;
  };
  missing: {
    categories: MissingRef[];
    types: MissingRef[];
    brands: MissingRef[];
    suppliers: MissingRef[];
  };
  mismatches: ReferenceMismatch[];
  companyMismatches: CompanyMismatch[];
  unresolvedRowNumbers: number[];
  blocked: boolean;
}

const norm = (v: unknown): string =>
  String(v ?? '').trim().toLowerCase();

function asId(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function buildNameMap(list: any[]) {
  const map = new Map<string, any>();
  for (const item of list || []) {
    const key = norm(item?.name);
    if (key && !map.has(key)) map.set(key, item);
  }
  return map;
}

export function buildMasterReport(
  rows: ParsedRowRef[],
  masters: {
    categories: any[];
    types: any[];
    brands: any[];
    suppliers: any[];
  },
  activeCompanyName?: string
): MasterReport {
  const categories = buildNameMap(masters.categories);
  const types = buildNameMap(masters.types);
  const brands = buildNameMap(masters.brands);
  const suppliers = buildNameMap(masters.suppliers);

  const referenced = {
    category: false,
    type: false,
    brand: false,
    supplier: false,
  };
  const empty = { category: false, type: false, brand: false, supplier: false };
  const missing: MasterReport['missing'] = {
    categories: [],
    types: [],
    brands: [],
    suppliers: [],
  };
  const mismatches: ReferenceMismatch[] = [];
  const companyMismatches: CompanyMismatch[] = [];
  const unresolvedRowNumbers: number[] = [];

  const pushMissing = (
    group: MissingRef[],
    value: string,
    parentValue: string | undefined,
    row: number
  ) => {
    const existing = group.find(
      g => norm(g.value) === norm(value) && norm(g.parentValue) === norm(parentValue)
    );
    if (existing) {
      existing.rows.push(row);
    } else {
      group.push({ value, parentValue, rows: [row] });
    }
  };

  for (const row of rows) {
    referenced.category = referenced.category || norm(row.category) !== '';
    referenced.type = referenced.type || norm(row.type) !== '';
    referenced.brand = referenced.brand || norm(row.brand) !== '';
    referenced.supplier = referenced.supplier || norm(row.supplier) !== '';

    let companyMatches = true;
    if (activeCompanyName) {
      companyMatches = norm(row.company) === norm(activeCompanyName);
      if (!companyMatches) {
        companyMismatches.push({ row: row.row, company: row.company });
      }
    }

    const cat = norm(row.category) !== '' ? categories.get(norm(row.category)) : undefined;
    const catId = asId(cat?.id ?? cat?.categoryID);
    let rowUnresolved = false;

    if (norm(row.category) !== '' && !cat) {
      pushMissing(missing.categories, row.category, undefined, row.row);
      rowUnresolved = true;
    }

    if (norm(row.type) !== '') {
      const type = types.get(norm(row.type));
      const typeId = asId(type?.id ?? type?.typeID);
      if (!type) {
        pushMissing(missing.types, row.type!, row.category, row.row);
        rowUnresolved = true;
      } else if (catId) {
        const typeCat = asId(type?.categoryId ?? type?.category_id ?? type?.categoryID);
        if (typeCat && typeCat !== catId) {
          mismatches.push({
            row: row.row,
            field: 'type',
            message: `Type "${row.type}" does not belong to category "${row.category}".`,
          });
          rowUnresolved = true;
        }
      }
    }

    if (norm(row.brand) !== '') {
      const brand = brands.get(norm(row.brand));
      const type = norm(row.type) !== '' ? types.get(norm(row.type)) : undefined;
      const typeId = asId(type?.id ?? type?.typeID);
      if (!brand) {
        pushMissing(missing.brands, row.brand!, row.type || undefined, row.row);
        rowUnresolved = true;
      } else if (typeId && norm(row.type) !== '') {
        const brandType = asId(brand?.typeId ?? brand?.type_id ?? brand?.typeID);
        if (brandType && brandType !== typeId) {
          mismatches.push({
            row: row.row,
            field: 'brand',
            message: `Brand "${row.brand}" does not belong to type "${row.type}".`,
          });
          rowUnresolved = true;
        }
      }
    }

    if (norm(row.supplier) !== '') {
      const supplier = suppliers.get(norm(row.supplier));
      if (!supplier) {
        pushMissing(missing.suppliers, row.supplier!, row.category, row.row);
        rowUnresolved = true;
      } else if (catId) {
        const sCat = asId(supplier?.categoryId ?? supplier?.category_id ?? supplier?.categoryID);
        if (sCat && sCat !== catId) {
          mismatches.push({
            row: row.row,
            field: 'supplier',
            message: `Supplier "${row.supplier}" does not belong to category "${row.category}".`,
          });
          rowUnresolved = true;
        }
      }
    }

    if (rowUnresolved) unresolvedRowNumbers.push(row.row);
  }

  empty.category = referenced.category && (masters.categories?.length ?? 0) === 0;
  empty.type = referenced.type && (masters.types?.length ?? 0) === 0;
  empty.brand = referenced.brand && (masters.brands?.length ?? 0) === 0;
  empty.supplier = referenced.supplier && (masters.suppliers?.length ?? 0) === 0;

  const blocked =
    empty.category ||
    empty.type ||
    empty.brand ||
    empty.supplier ||
    missing.categories.length > 0 ||
    missing.types.length > 0 ||
    missing.brands.length > 0 ||
    missing.suppliers.length > 0 ||
    mismatches.length > 0;

  return {
    referenced,
    empty,
    missing,
    mismatches,
    companyMismatches,
    unresolvedRowNumbers,
    blocked,
  };
}
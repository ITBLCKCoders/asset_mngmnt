import { describe, it, expect } from 'vitest';
import { buildMasterReport } from '@/pages/assets/assets-list/assetsComponents/importMasterValidation';

const masters = {
  categories: [{ id: 'cat-1', name: 'Computer' }],
  types: [{ id: 'type-1', name: 'Desktop', categoryId: 'cat-1' }],
  brands: [{ id: 'brand-1', name: 'Dell', typeId: 'type-1' }],
  suppliers: [{ id: 'sup-1', name: 'ABC Supplies', categoryId: 'cat-1' }],
};

describe('buildMasterReport', () => {
  it('passes when all references resolve under the active company', () => {
    const report = buildMasterReport(
      [
        {
          row: 2,
          company: 'ACME Corp',
          category: 'Computer',
          type: 'Desktop',
          brand: 'Dell',
          supplier: 'ABC Supplies',
        },
      ],
      masters,
      'ACME Corp'
    );
    expect(report.blocked).toBe(false);
    expect(report.companyMismatches).toHaveLength(0);
    expect(report.unresolvedRowNumbers).toHaveLength(0);
  });

  it('flags company mismatches against the active company (case-insensitive)', () => {
    const report = buildMasterReport(
      [
        { row: 2, company: 'Other Co', category: 'Computer' },
        { row: 3, company: 'acme corp', category: 'Computer' },
      ],
      masters,
      'ACME Corp'
    );
    expect(report.companyMismatches).toEqual([{ row: 2, company: 'Other Co' }]);
  });

  it('groups missing masters with parent and row numbers and blocks import', () => {
    const report = buildMasterReport(
      [
        { row: 2, company: 'ACME Corp', category: 'Vehicle', type: 'Sedan' },
        { row: 5, company: 'ACME Corp', category: 'Vehicle', type: 'Sedan' },
      ],
      masters,
      'ACME Corp'
    );
    expect(report.blocked).toBe(true);
    expect(report.missing.categories).toEqual([
      { value: 'Vehicle', parentValue: undefined, rows: [2, 5] },
    ]);
    expect(report.missing.types).toEqual([
      { value: 'Sedan', parentValue: 'Vehicle', rows: [2, 5] },
    ]);
    expect(report.unresolvedRowNumbers).toEqual([2, 5]);
  });

  it('detects type/category, brand/type and supplier/category cascade mismatches', () => {
    const report = buildMasterReport(
      [
        {
          row: 2,
          company: 'ACME Corp',
          category: 'Furniture',
          type: 'Desktop',
          brand: 'HP',
          supplier: 'ABC Supplies',
        },
      ],
      {
        ...masters,
        categories: [...masters.categories, { id: 'cat-2', name: 'Furniture' }],
        types: [...masters.types, { id: 'type-2', name: 'Laptop', categoryId: 'cat-1' }],
        brands: [...masters.brands, { id: 'brand-2', name: 'HP', typeId: 'type-2' }],
      },
      'ACME Corp'
    );
    expect(report.blocked).toBe(true);
    const fields = report.mismatches.map(m => m.field).sort();
    expect(fields).toEqual(['brand', 'supplier', 'type']);
    expect(report.unresolvedRowNumbers).toEqual([2]);
  });

  it('sets empty flags only when the file references a field whose master list is empty', () => {
    const report = buildMasterReport(
      [{ row: 2, company: 'ACME Corp', category: 'Computer', brand: 'Dell' }],
      { ...masters, brands: [] },
      'ACME Corp'
    );
    expect(report.empty.brand).toBe(true);
    expect(report.empty.type).toBe(false);
    expect(report.blocked).toBe(true);
  });
});

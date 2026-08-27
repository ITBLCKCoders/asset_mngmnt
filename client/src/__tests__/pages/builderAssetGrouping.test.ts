import { describe, expect, it } from 'vitest';
import {
  buildBuilderGroupedAssetRows,
  type AccountabilityAssetRow,
} from '@/pages/assets/accountability/builderAssetGrouping';

const asset = (code: string, name: string) => ({ code, name });

const builders = [
  {
    builderID: 'b1',
    name: 'Workstation Set A',
    items: [
      { asset_code: 'AST-001', is_parent: true, asset_name: 'Desktop' },
      { asset_code: 'AST-002', is_parent: false, asset_name: 'Monitor 1' },
      { asset_code: 'AST-003', is_parent: false, asset_name: 'Monitor 2' },
    ],
  },
  {
    builderID: 'b2',
    name: 'Workstation Set B',
    items: [
      { asset_code: 'AST-010', is_parent: true, asset_name: 'Desktop 2' },
      { asset_code: 'AST-011', is_parent: false, asset_name: 'Monitor 3' },
    ],
  },
];

type AssetRow = Extract<AccountabilityAssetRow, { kind: 'asset' }>;

const assetRows = (rows: AccountabilityAssetRow[]): AssetRow[] =>
  rows.filter((r): r is AssetRow => r.kind === 'asset');

describe('buildBuilderGroupedAssetRows', () => {
  it('returns plain asset rows when no builders are provided', () => {
    const rows = buildBuilderGroupedAssetRows([asset('AST-001', 'A')]);
    expect(rows).toEqual([{ kind: 'asset', asset: { code: 'AST-001', name: 'A' } }]);
  });

  it('prepends a builder-name separator and places the parent before children', () => {
    const rows = buildBuilderGroupedAssetRows(
      [
        asset('AST-002', 'Monitor 1'),
        asset('AST-001', 'Desktop'),
        asset('AST-003', 'Monitor 2'),
      ],
      builders
    );

    expect(rows[0]).toEqual({ kind: 'separator', name: 'Workstation Set A' });
    const kinds = rows.map(r => r.kind);
    expect(kinds[0]).toBe('separator');
    const grouped = assetRows(rows);
    expect(grouped[0].asset.code).toBe('AST-001');
    expect(grouped[1].asset.code).toBe('AST-002');
    expect(grouped[2].asset.code).toBe('AST-003');
  });

  it('sorts children by last 5 digits of the asset code after the parent', () => {
    const sortBuilder = {
      builderID: 'b3',
      name: 'Multi-set',
      items: [
        { asset_code: 'AST-100', is_parent: false, asset_name: 'C' },
        { asset_code: 'AST-050', is_parent: true, asset_name: 'P' },
        { asset_code: 'AST-200', is_parent: false, asset_name: 'B' },
        { asset_code: 'AST-300', is_parent: false, asset_name: 'A' },
      ],
    };

    const rows = buildBuilderGroupedAssetRows(
      [
        asset('AST-100', 'C'),
        asset('AST-200', 'B'),
        asset('AST-050', 'P'),
        asset('AST-300', 'A'),
      ],
      [sortBuilder]
    );

    const assetCodes = assetRows(rows).map(r => r.asset.code);

    expect(assetCodes).toEqual(['AST-050', 'AST-100', 'AST-200', 'AST-300']);
  });

  it('appends non-builder assets after all builder groups with a trailing separator', () => {
    const rows = buildBuilderGroupedAssetRows(
      [
        asset('AST-099', 'Standalone'),
        asset('AST-001', 'Desktop'),
        asset('AST-003', 'Monitor 2'),
      ],
      builders
    );

    // Separator, builder assets, then trailing separator, then non-builder assets
    const kinds = rows.map(r => r.kind);
    expect(kinds).toEqual([
      'separator',
      'asset',
      'asset',
      'separator',
      'asset',
    ]);
    expect(rows[3]).toEqual({ kind: 'separator', name: '' });
    expect(rows[4]).toEqual({
      kind: 'asset',
      asset: { code: 'AST-099', name: 'Standalone' },
    });
  });

  it('adds a single trailing separator before the non-builder section with multiple builder groups', () => {
    const rows = buildBuilderGroupedAssetRows(
      [
        asset('AST-099', 'Standalone'),
        asset('AST-001', 'Desktop'),
        asset('AST-003', 'Monitor 2'),
        asset('AST-010', 'Desktop 2'),
        asset('AST-011', 'Monitor 3'),
      ],
      builders
    );

    const kinds = rows.map(r => r.kind);
    expect(kinds.filter(k => k === 'separator')).toHaveLength(3); // 2 leading + 1 trailing
    const separators = rows
      .map((r, i) => ({ r, i }))
      .filter(x => x.r.kind === 'separator')
      .map(x => x.i);
    expect(separators[0]).toBe(0); // Workstation Set A
    const secondSeparator = rows[separators[1]];
    expect(secondSeparator.kind).toBe('separator');
    if (secondSeparator.kind === 'separator') {
      expect(secondSeparator.name).toBe('Workstation Set B');
    }
    expect(rows[separators[2]]).toEqual({ kind: 'separator', name: '' });
    const lastRow = rows[rows.length - 1];
    expect(lastRow.kind).toBe('asset');
    if (lastRow.kind === 'asset') {
      expect(lastRow.asset.code).toBe('AST-099');
    }
  });

  it('does not add a trailing separator when all assets belong to a builder group', () => {
    const rows = buildBuilderGroupedAssetRows(
      [
        asset('AST-001', 'Desktop'),
        asset('AST-002', 'Monitor 1'),
        asset('AST-003', 'Monitor 2'),
      ],
      builders
    );

    expect(rows.every(r => r.kind !== 'separator' || r.name !== '')).toBe(true);
    expect(rows[rows.length - 1]).toEqual({
      kind: 'asset',
      asset: { code: 'AST-003', name: 'Monitor 2' },
    });
  });

  it('skips builders with no matching assets in the list', () => {
    const rows = buildBuilderGroupedAssetRows([asset('AST-999', 'Other')], builders);
    expect(rows.every(r => r.kind === 'asset')).toBe(true);
    expect(assetRows(rows)[0].asset.code).toBe('AST-999');
  });

  it('does not emit a parent that is absent from the list', () => {
    const rows = buildBuilderGroupedAssetRows(
      [asset('AST-003', 'Monitor 2')],
      builders
    );

    expect(rows[0]).toEqual({ kind: 'separator', name: 'Workstation Set A' });
    expect(rows).toHaveLength(2);
    expect(assetRows(rows)[0].asset.code).toBe('AST-003');
  });

  it('adds no trailing separator when only a parentless group matches and no non-builders exist', () => {
    const singleGroupBuilders = [
      {
        builderID: 'b1',
        name: 'Workstation Set A',
        items: [
          { asset_code: 'AST-001', is_parent: true, asset_name: 'Desktop' },
          { asset_code: 'AST-002', is_parent: false, asset_name: 'Monitor 1' },
        ],
      },
    ];
    const rows = buildBuilderGroupedAssetRows(
      [asset('AST-001', 'Desktop'), asset('AST-002', 'Monitor 1')],
      singleGroupBuilders
    );

    expect(rows).toEqual([
      { kind: 'separator', name: 'Workstation Set A' },
      { kind: 'asset', asset: { code: 'AST-001', name: 'Desktop' } },
      { kind: 'asset', asset: { code: 'AST-002', name: 'Monitor 1' } },
    ]);
  });
});

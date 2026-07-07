import { describe, expect, it } from 'vitest';
import { findBuilderByParentAssetCode } from '@/utils/builderScan';

describe('findBuilderByParentAssetCode', () => {
  const builders = [
    {
      builderID: 'b1',
      name: 'Workstation Set',
      items: [
        { asset_code: 'AST-001', is_parent: true, asset_name: 'Desktop' },
        { asset_code: 'AST-002', is_parent: false, asset_name: 'Monitor' },
      ],
    },
    {
      builderID: 'b2',
      name: 'Other',
      items: [{ asset_code: 'AST-010', is_parent: true, asset_name: 'Laptop' }],
    },
  ];

  it('finds builder when scanned code matches parent asset', () => {
    expect(findBuilderByParentAssetCode(builders, 'AST-001')?.builderID).toBe('b1');
    expect(
      findBuilderByParentAssetCode(
        builders,
        'https://example.com/assets/details/AST-001'
      )?.builderID
    ).toBe('b1');
  });

  it('does not match child-only asset codes', () => {
    expect(findBuilderByParentAssetCode(builders, 'AST-002')).toBeUndefined();
  });

  it('matches case-insensitively', () => {
    expect(findBuilderByParentAssetCode(builders, 'ast-010')?.builderID).toBe('b2');
  });
});

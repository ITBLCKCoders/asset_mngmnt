import { describe, expect, it } from 'vitest';
import {
  assetCodesMatch,
  findAssetByScannedCode,
  parseScannedAssetCode,
} from '@/utils/barcodeScan';

describe('parseScannedAssetCode', () => {
  it('returns plain asset codes unchanged', () => {
    expect(parseScannedAssetCode('AST-001')).toBe('AST-001');
  });

  it('strips scanner prefixes and suffixes', () => {
    expect(parseScannedAssetCode(']C1AST-001\r')).toBe('AST-001');
  });

  it('extracts asset code from QR URLs', () => {
    expect(
      parseScannedAssetCode('https://example.com/assets/details/AST-001')
    ).toBe('AST-001');
  });

  it('matches asset codes case-insensitively', () => {
    expect(assetCodesMatch('ast-001', 'AST-001')).toBe(true);
  });

  it('finds assets in a list by scanned code', () => {
    const assets = [{ id: 'AST-001', name: 'Laptop' }];
    expect(findAssetByScannedCode(assets, ']C1ast-001'))?.toEqual(assets[0]);
  });
});

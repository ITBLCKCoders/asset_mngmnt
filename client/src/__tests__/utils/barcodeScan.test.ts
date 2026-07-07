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

  it('extracts long hyphenated asset codes from LAN URLs', () => {
    expect(
      parseScannedAssetCode(
        'http://192.168.68.32:9669/assets/details/CMTH-ITOFE-PRNTR-OU-00291'
      )
    ).toBe('CMTH-ITOFE-PRNTR-OU-00291');
  });

  it('extracts asset code from path-only QR values', () => {
    expect(parseScannedAssetCode('/assets/details/AST-001')).toBe('AST-001');
    expect(parseScannedAssetCode('assets/details/AST-001')).toBe('AST-001');
  });

  it('extracts asset code from truncated details/ paths', () => {
    expect(parseScannedAssetCode('details/CMTH-ITOFE-SW-OU-00288')).toBe(
      'CMTH-ITOFE-SW-OU-00288'
    );
    expect(parseScannedAssetCode(']Q1details/CMTH-ITOFE-SW-OU-00288\r')).toBe(
      'CMTH-ITOFE-SW-OU-00288'
    );
  });

  it('extracts full hyphenated codes from LAN URLs without protocol', () => {
    expect(
      parseScannedAssetCode(
        '192.168.68.32:9669/assets/details/CMTH-ITOFE-SRVR-OU-00289'
      )
    ).toBe('CMTH-ITOFE-SRVR-OU-00289');
    expect(
      parseScannedAssetCode(
        'http://192.168.68.32:9669/assets/details/CMTH-ITOFE-SRVR-OU-00289'
      )
    ).toBe('CMTH-ITOFE-SRVR-OU-00289');
  });

  it('extracts asset code from QR scanner prefixes and URLs', () => {
    expect(
      parseScannedAssetCode(']Q1https://localhost:5173/assets/details/AST-001\r')
    ).toBe('AST-001');
  });

  it('finds assets from scanned QR URLs', () => {
    const assets = [{ id: 'AST-001', name: 'Laptop' }];
    expect(
      findAssetByScannedCode(
        assets,
        'https://example.com/assets/details/ast-001'
      )
    )?.toEqual(assets[0]);
  });

  it('matches asset codes case-insensitively', () => {
    expect(assetCodesMatch('ast-001', 'AST-001')).toBe(true);
  });

  it('finds assets in a list by scanned code', () => {
    const assets = [{ id: 'AST-001', name: 'Laptop' }];
    expect(findAssetByScannedCode(assets, ']C1ast-001'))?.toEqual(assets[0]);
  });

  it('finds assets from truncated details/ scanner paths', () => {
    const assets = [{ id: 'CMTH-ITOFE-SW-OU-00288', name: 'Switch' }];
    expect(
      findAssetByScannedCode(assets, 'details/CMTH-ITOFE-SW-OU-00288')
    )?.toEqual(assets[0]);
  });

  it('finds assets from full LAN QR URLs case-insensitively', () => {
    const assets = [{ id: 'CMTH-ITOFE-SRVR-OU-00289', name: 'Server' }];
    expect(
      findAssetByScannedCode(
        assets,
        'http://192.168.68.32:9669/assets/details/cmth-itofe-srvr-ou-00289'
      )
    )?.toEqual(assets[0]);
  });
});

import { describe, it, expect } from '@jest/globals';
import {
  parseAssignmentIdsFromAssetsData,
  parseAssetsFromAssetsData,
} from '../../utils/accountabilityFormAssetsData.js';

describe('parseAssignmentIdsFromAssetsData', () => {
  it('returns assignment_ids from assets_data JSON', () => {
    const assetsData = {
      assets: [{ id: 'a1', code: 'X' }],
      assignment_ids: ['id-1', 'id-2', 'id-1'],
    };
    expect(parseAssignmentIdsFromAssetsData(assetsData)).toEqual([
      'id-1',
      'id-2',
    ]);
  });

  it('falls back to form assignment_id when assignment_ids missing', () => {
    const assetsData = { assets: [{ id: 'a1' }] };
    expect(
      parseAssignmentIdsFromAssetsData(assetsData, 'fallback-assignment')
    ).toEqual(['fallback-assignment']);
  });

  it('returns empty array when no ids available', () => {
    expect(parseAssignmentIdsFromAssetsData(null)).toEqual([]);
    expect(parseAssignmentIdsFromAssetsData('not-json')).toEqual([]);
  });

  it('parses assets array from assets_data', () => {
    const assets = parseAssetsFromAssetsData({
      assets: [{ id: 'a1', code: 'CODE1', type: 'Laptop' }],
      assignment_ids: ['x'],
    });
    expect(assets).toHaveLength(1);
    expect(assets[0]?.type).toBe('Laptop');
  });
});

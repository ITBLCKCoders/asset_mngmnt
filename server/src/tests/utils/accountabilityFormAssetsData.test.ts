import { describe, it, expect, jest } from '@jest/globals';

const {
  parseAssetsFromAssetsData,
  parseAssignmentIdsFromAssetsData,
  resolveChecklistAssignmentIds,
} = require('../../utils/accountabilityFormAssetsData.js');

describe('accountabilityFormAssetsData', () => {
  describe('parseAssetsFromAssetsData', () => {
    it('should parse assets from JSON string', () => {
      const assets = parseAssetsFromAssetsData('{"assets":[{"id":"a1"},{"id":"a2"}]}');
      expect(assets).toEqual([{ id: 'a1' }, { id: 'a2' }]);
    });

    it('should parse assets from parsed object', () => {
      const assets = parseAssetsFromAssetsData({ assets: [{ id: 'a1' }] });
      expect(assets).toEqual([{ id: 'a1' }]);
    });

    it('should return empty array for invalid JSON', () => {
      const assets = parseAssetsFromAssetsData('invalid');
      expect(assets).toEqual([]);
    });

    it('should return empty array for null', () => {
      expect(parseAssetsFromAssetsData(null)).toEqual([]);
    });
  });

  describe('parseAssignmentIdsFromAssetsData', () => {
    it('should extract assignment IDs from assets data', () => {
      const ids = parseAssignmentIdsFromAssetsData(
        JSON.stringify({ assignment_ids: ['as1', 'as2'], assets: [] })
      );
      expect(ids).toEqual(['as1', 'as2']);
    });

    it('should return empty array when no assignment_ids', () => {
      const ids = parseAssignmentIdsFromAssetsData(
        JSON.stringify({ assets: [{ id: 'a1' }, { id: 'a2' }] })
      );
      expect(ids).toEqual([]);
    });

    it('should use fallbackAssignmentId when ids are empty', () => {
      const ids = parseAssignmentIdsFromAssetsData(
        JSON.stringify({ assets: [] }),
        'fallback-id'
      );
      expect(ids).toEqual(['fallback-id']);
    });

    it('should return empty array for null', () => {
      expect(parseAssignmentIdsFromAssetsData(null)).toEqual([]);
    });
  });

  describe('resolveChecklistAssignmentIds', () => {
    it('should return stored assignment ids and computer asset ids', async () => {
      const mockGetActiveAssignmentIdsByAssetIds = jest.fn().mockResolvedValue(['as3']);
      const mockGetActiveAssignmentIdsByAssetCodes = jest.fn().mockResolvedValue(['as4']);
      const mockIsComputerType = jest.fn().mockReturnValue(true);

      const result = await resolveChecklistAssignmentIds({
        assetsDataRaw: JSON.stringify({
          assignment_ids: ['as1', 'as2'],
          assets: [{ id: 'a1', code: 'C001', type: 'Computer' }],
        }),
        userId: 'u1',
        getActiveAssignmentIdsByAssetIds: mockGetActiveAssignmentIdsByAssetIds,
        getActiveAssignmentIdsByAssetCodes: mockGetActiveAssignmentIdsByAssetCodes,
        isComputerType: mockIsComputerType,
      });

      expect(result).toContain('as1');
      expect(result).toContain('as2');
      expect(result).toContain('as3');
      expect(mockGetActiveAssignmentIdsByAssetIds).toHaveBeenCalledWith('u1', ['a1']);
    });

    it('should return empty array when no form assets', async () => {
      const result = await resolveChecklistAssignmentIds({
        assetsDataRaw: null,
        userId: 'u1',
        getActiveAssignmentIdsByAssetIds: jest.fn(),
        getActiveAssignmentIdsByAssetCodes: jest.fn(),
        isComputerType: jest.fn(),
      });
      expect(result).toEqual([]);
    });
  });
});

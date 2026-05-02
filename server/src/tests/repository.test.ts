import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { AssetRepository } from '../repositories/AssetRepository.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { pool } from '../db.js';
import { AppError } from '../middleware/enhancedErrorHandling.js';

class TestRepository extends BaseRepository<any> {
  constructor() {
    super('assets', 'assetID');
  }
}

describe('Repository Pattern Tests', () => {
  let assetRepository: AssetRepository;
  let baseRepository: TestRepository;
  let testAssetId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const [userRows] = (await pool.execute(
      'INSERT INTO users (email, first_name, last_name, employee_number, is_active) VALUES (?, ?, ?, ?, ?)',
      ['test-repo@example.com', 'Test', 'Repo', 'TESTREPO001', 1]
    )) as any[];

    testUserId = userRows.insertId;

    // Initialize repositories
    assetRepository = new AssetRepository();
    baseRepository = new TestRepository();
  });

  afterAll(async () => {
    // Clean up test data
    if (testAssetId) {
      await pool.execute('DELETE FROM assets WHERE asset_code = ?', [
        testAssetId,
      ]);
    }
    await pool.execute('DELETE FROM users WHERE email = ?', [
      'test-repo@example.com',
    ]);
  });

  describe('BaseRepository Tests', () => {
    it('should find all records with pagination', async () => {
      const result = await baseRepository.findAll(1, 10);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
    });

    it('should find record by ID', async () => {
      // First create a test asset
      const [rows] = (await pool.execute(
        `INSERT INTO assets (name, description, category_id, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'Test Asset',
          'Test description',
          1,
          'Available',
          testUserId,
          testUserId,
        ]
      )) as any[];

      testAssetId = rows.insertId;

      const asset = await baseRepository.findById(testAssetId);
      expect(asset).toHaveProperty('assetID');
      expect(asset.name).toBe('Test Asset');
    });

    it('should return null for non-existent record', async () => {
      const asset = await baseRepository.findById('999999');
      expect(asset).toBeNull();
    });

    it('should check if record exists', async () => {
      const exists = await baseRepository.exists(testAssetId);
      expect(exists).toBe(true);

      const notExists = await baseRepository.exists('999999');
      expect(notExists).toBe(false);
    });
  });

  describe('AssetRepository Tests', () => {
    it('should get all assets with pagination and filtering', async () => {
      const result = await assetRepository.getAllAssets(1, 10, {
        status: 'Available',
      });
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.assets)).toBe(true);
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
    });

    it('should get asset by ID with related data', async () => {
      const asset = await assetRepository.getAssetById(testAssetId);
      expect(asset).toHaveProperty('assetID');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('asset_code');
      expect(asset).toHaveProperty('category');
      expect(asset).toHaveProperty('location');
      expect(asset).toHaveProperty('department');
    });

    it('should return null for non-existent asset', async () => {
      const asset = await assetRepository.getAssetById('NONEXISTENT');
      expect(asset).toBeNull();
    });

    it('should get asset assignments', async () => {
      const assignments =
        await assetRepository.getAssetAssignments(testAssetId);
      expect(Array.isArray(assignments)).toBe(true);
    });

    it('should get asset documents', async () => {
      const documents = await assetRepository.getAssetDocuments(testAssetId);
      expect(Array.isArray(documents)).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by using invalid SQL
      class InvalidRepository extends BaseRepository<any> {
        constructor() {
          super('nonexistent_table', 'id');
        }
      }
      const invalidRepo = new InvalidRepository();

      await expect(invalidRepo.findAll(1, 10)).rejects.toThrow(AppError);
      await expect(invalidRepo.findById('1')).rejects.toThrow(AppError);
      await expect(invalidRepo.exists('1')).rejects.toThrow(AppError);
    });

    it('should handle invalid foreign key references', async () => {
      const invalidAssetData = {
        name: 'Invalid Asset',
        category_id: 999999, // Non-existent category
        status: 'Available',
      };

      await expect(
        assetRepository.createAsset(invalidAssetData, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle empty result sets', async () => {
      const result = await assetRepository.getAllAssets(1, 10, {
        status: 'NonExistentStatus',
      });
      expect(result.assets).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle pagination with no results', async () => {
      const result = await assetRepository.getAllAssets(999, 10);
      expect(result.assets).toHaveLength(0);
      expect(result.pagination.page).toBe(999);
    });
  });
});

describe('Repository Performance Tests', () => {
  let assetRepository: AssetRepository;

  beforeAll(() => {
    assetRepository = new AssetRepository();
  });

  it('should handle large datasets efficiently', async () => {
    const startTime = Date.now();
    const result = await assetRepository.getAllAssets(1, 100);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    expect(result.assets.length).toBeLessThanOrEqual(100);
  }, 10000); // 10 second timeout for performance test
});

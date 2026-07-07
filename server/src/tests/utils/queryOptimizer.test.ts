import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = {
  execute: jest.fn(),
  getConnection: jest.fn(),
  config: { connectionLimit: 10 },
};

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { QueryOptimizer, QueryBuilder, DatabaseMonitor, IndexOptimizer } = require('../../utils/queryOptimizer.js');

describe('queryOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    QueryOptimizer.clearCache();
  });

  describe('QueryOptimizer', () => {
    describe('executeQuery', () => {
      it('should execute query and return rows', async () => {
        mockPool.execute.mockResolvedValue([[{ id: 1 }], []]);
        const result = await QueryOptimizer.executeQuery('SELECT * FROM test', []);
        expect(result).toEqual([{ id: 1 }]);
      });

      it('should return cached result on subsequent call', async () => {
        mockPool.execute.mockResolvedValue([[{ id: 1 }], []]);
        await QueryOptimizer.executeQuery('SELECT * FROM test', [], { cache: true, cacheKey: 'test' });
        const result = await QueryOptimizer.executeQuery('SELECT * FROM test', [], { cache: true, cacheKey: 'test' });
        expect(result).toEqual([{ id: 1 }]);
        expect(mockPool.execute).toHaveBeenCalledTimes(1);
      });

      it('should timeout when query takes too long', async () => {
        mockPool.execute.mockImplementation(() => new Promise(() => {}));
        await expect(
          QueryOptimizer.executeQuery('SELECT 1', [], { timeout: 50 })
        ).rejects.toThrow('Query timeout');
      }, 10000);

      it('should retry on retryable errors', async () => {
        mockPool.execute
          .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'ECONNRESET' })
          .mockResolvedValueOnce([[{ id: 1 }], []]);
        const result = await QueryOptimizer.executeQuery('SELECT 1', [], { retries: 1 });
        expect(result).toEqual([{ id: 1 }]);
        expect(mockPool.execute).toHaveBeenCalledTimes(2);
      });

      it('should throw after exhausting retries', async () => {
        mockPool.execute.mockRejectedValue({ code: 'ECONNRESET', message: 'ECONNRESET' });
        await expect(
          QueryOptimizer.executeQuery('SELECT 1', [], { retries: 0 })
        ).rejects.toEqual({ code: 'ECONNRESET', message: 'ECONNRESET' });
      });
    });

    describe('clearCache', () => {
      it('should clear all cache when no key given', () => {
        QueryOptimizer['queryCache'].set('k1', { result: 'v1', timestamp: Date.now() });
        QueryOptimizer['queryCache'].set('k2', { result: 'v2', timestamp: Date.now() });
        QueryOptimizer.clearCache();
        expect(QueryOptimizer.getCacheStats().size).toBe(0);
      });

      it('should clear specific cache entry', () => {
        QueryOptimizer['queryCache'].set('k1', { result: 'v1', timestamp: Date.now() });
        QueryOptimizer['queryCache'].set('k2', { result: 'v2', timestamp: Date.now() });
        QueryOptimizer.clearCache('k1');
        expect(QueryOptimizer.getCacheStats().keys).not.toContain('k1');
        expect(QueryOptimizer.getCacheStats().keys).toContain('k2');
      });
    });

    describe('getCacheStats', () => {
      it('should return size and keys', () => {
        QueryOptimizer['queryCache'].set('k1', { result: 'v1', timestamp: Date.now() });
        const stats = QueryOptimizer.getCacheStats();
        expect(stats.size).toBe(1);
        expect(stats.keys).toEqual(['k1']);
      });
    });
  });

  describe('QueryBuilder', () => {
    describe('buildSelectQuery', () => {
      it('should build simple SELECT', () => {
        const { query, params } = QueryBuilder.buildSelectQuery('assets');
        expect(query).toContain('SELECT * FROM assets');
        expect(params).toEqual([]);
      });

      it('should build SELECT with conditions', () => {
        const { query, params } = QueryBuilder.buildSelectQuery('assets', ['id', 'name'], { status: 'Active', category_id: 'c1' });
        expect(query).toContain('WHERE status = ? AND category_id = ?');
        expect(params).toEqual(['Active', 'c1']);
      });

      it('should handle IN conditions', () => {
        const { query, params } = QueryBuilder.buildSelectQuery('assets', ['*'], { id: [1, 2, 3] });
        expect(query).toContain('IN (?, ?, ?)');
        expect(params).toEqual([1, 2, 3]);
      });

      it('should handle LIKE conditions', () => {
        const { query, params } = QueryBuilder.buildSelectQuery('assets', ['*'], { name: '%Laptop%' });
        expect(query).toContain('LIKE ?');
        expect(params).toEqual(['%Laptop%']);
      });

      it('should add LIMIT and OFFSET', () => {
        const { query, params } = QueryBuilder.buildSelectQuery('assets', ['*'], {}, { limit: 10, offset: 20 });
        expect(query).toContain('LIMIT ?');
        expect(query).toContain('OFFSET ?');
        expect(params).toEqual([10, 20]);
      });

      it('should add ORDER BY', () => {
        const { query } = QueryBuilder.buildSelectQuery('assets', ['*'], {}, { orderBy: 'created_at', orderDir: 'ASC' });
        expect(query).toContain('ORDER BY created_at ASC');
      });

      it('should add JOINs', () => {
        const { query } = QueryBuilder.buildSelectQuery('assets', ['*'], {}, { joins: ['LEFT JOIN categories ON assets.category_id = categories.categoryID'] });
        expect(query).toContain('LEFT JOIN');
      });

      it('should add GROUP BY', () => {
        const { query } = QueryBuilder.buildSelectQuery('assets', ['*'], {}, { groupBy: 'category_id' });
        expect(query).toContain('GROUP BY category_id');
      });

      it('should skip undefined/null conditions', () => {
        const { params } = QueryBuilder.buildSelectQuery('assets', ['*'], { status: undefined, name: null });
        expect(params).toEqual([]);
      });
    });

    describe('buildCountQuery', () => {
      it('should build COUNT query', () => {
        const { query, params } = QueryBuilder.buildCountQuery('assets');
        expect(query).toContain('COUNT(*)');
        expect(params).toEqual([]);
      });

      it('should add conditions', () => {
        const { query, params } = QueryBuilder.buildCountQuery('assets', { status: 'Active' });
        expect(query).toContain('WHERE');
        expect(params).toEqual(['Active']);
      });
    });

    describe('buildSearchQuery', () => {
      it('should build search query with OR conditions', () => {
        const { query, params } = QueryBuilder.buildSearchQuery('assets', ['name', 'asset_code'], 'Laptop');
        expect(query).toContain('LIKE');
        expect(query).toContain('OR');
        expect(params).toEqual(['%Laptop%', '%Laptop%']);
      });

      it('should add additional conditions', () => {
        const { query, params } = QueryBuilder.buildSearchQuery('assets', ['name'], 'Laptop', { status: 'Active' });
        expect(query).toContain('AND');
        expect(params).toEqual(['%Laptop%', 'Active']);
      });
    });
  });

  describe('DatabaseMonitor', () => {
    describe('getPoolStats', () => {
      it('should return pool stats', async () => {
        const mockConn = { release: jest.fn() };
        mockPool.getConnection.mockResolvedValue(mockConn);
        const stats = await DatabaseMonitor.getPoolStats();
        expect(stats.totalConnections).toBe(10);
        expect(stats.activeConnections).toBe(0);
        expect(mockConn.release).toHaveBeenCalled();
      });

      it('should return null on error', async () => {
        mockPool.getConnection.mockRejectedValue(new Error('DB down'));
        const stats = await DatabaseMonitor.getPoolStats();
        expect(stats).toBeNull();
      });
    });

    describe('healthCheck', () => {
      it('should return true when query succeeds', async () => {
        mockPool.execute.mockResolvedValue([[{ health: 1 }], []]);
        const result = await DatabaseMonitor.healthCheck();
        expect(result).toBe(true);
      });

      it('should return false when query fails', async () => {
        mockPool.execute.mockRejectedValue(new Error('DB down'));
        const result = await DatabaseMonitor.healthCheck();
        expect(result).toBe(false);
      });
    });
  });

  describe('IndexOptimizer', () => {
    describe('analyzeQueryPerformance', () => {
      it('should log query analysis without error', async () => {
        await expect(
          IndexOptimizer.analyzeQueryPerformance('SELECT * FROM assets')
        ).resolves.toBeUndefined();
      });
    });
  });
});

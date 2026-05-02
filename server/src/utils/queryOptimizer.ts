import { pool } from '../db.js';
import logger from '../logger.js';

// Query execution wrapper with performance monitoring
export class QueryOptimizer {
  private static queryCache = new Map<
    string,
    { result: any; timestamp: number }
  >();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Execute query with performance monitoring and caching
  static async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      cache?: boolean;
      cacheKey?: string;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const { cache = false, cacheKey, timeout = 30000, retries = 1 } = options;

    // Check cache if enabled
    if (cache && cacheKey) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.debug('[QUERY_CACHE] Cache hit:', { cacheKey });
        return cached.result;
      }
    }

    try {
      const queryResult = await Promise.race([
        pool.execute(query, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        ),
      ]);

      const rows = Array.isArray(queryResult) ? queryResult[0] : queryResult;

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        logger.warn('[SLOW_QUERY]', {
          query: query.substring(0, 100) + '...',
          duration: `${duration}ms`,
          params: params.length,
        });
      }

      const typedResult = rows as T[];

      // Cache result if enabled
      if (cache && cacheKey) {
        this.queryCache.set(cacheKey, {
          result: typedResult,
          timestamp: Date.now(),
        });
        logger.debug('[QUERY_CACHE] Cached:', { cacheKey });
      }

      return typedResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('[QUERY_ERROR]', {
        query: query.substring(0, 100) + '...',
        duration: `${duration}ms`,
        error: (error as Error).message,
        params,
      });

      // Retry logic for transient errors
      if (retries > 0 && this.isRetryableError(error as Error)) {
        logger.warn('[QUERY_RETRY]', {
          query: query.substring(0, 100) + '...',
          retries,
          error: (error as Error).message,
        });

        return this.executeQuery(query, params, {
          ...options,
          retries: retries - 1,
        });
      }

      throw error;
    }
  }

  // Check if error is retryable
  private static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EPIPE',
    ];

    return retryableCodes.some(
      code => error.code === code || error.message?.includes(code)
    );
  }

  // Clear cache
  static clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.queryCache.delete(cacheKey);
      logger.info('[QUERY_CACHE] Cache entry cleared:', { cacheKey });
    } else {
      this.queryCache.clear();
      logger.info('[QUERY_CACHE] Cache cleared');
    }
  }

  // Get cache statistics
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys()),
    };
  }
}

// Common query builders with optimization
export class QueryBuilder {
  // Build optimized SELECT query with pagination
  static buildSelectQuery(
    table: string,
    fields: string[] = ['*'],
    conditions: Record<string, any> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDir?: 'ASC' | 'DESC';
      joins?: string[];
      groupBy?: string;
    } = {}
  ): { query: string; params: any[] } {
    const {
      limit,
      offset,
      orderBy,
      orderDir = 'DESC',
      joins = [],
      groupBy,
    } = options;

    let query = `SELECT ${fields.join(', ')} FROM ${table}`;
    const params: any[] = [];
    const whereConditions: string[] = [];

    // Build WHERE conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          whereConditions.push(
            `${key} IN (${value.map(() => '?').join(', ')})`
          );
          params.push(...value);
        } else if (typeof value === 'string' && value.includes('%')) {
          whereConditions.push(`${key} LIKE ?`);
          params.push(value);
        } else {
          whereConditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add JOINs
    joins.forEach(join => {
      query += ` ${join}`;
    });

    // Add GROUP BY
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDir}`;
    }

    // Add LIMIT and OFFSET
    if (limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(limit);

      if (offset !== undefined) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return { query, params };
  }

  // Build optimized COUNT query
  static buildCountQuery(
    table: string,
    conditions: Record<string, any> = {},
    joins: string[] = []
  ): { query: string; params: any[] } {
    let query = `SELECT COUNT(*) as total FROM ${table}`;
    const params: any[] = [];
    const whereConditions: string[] = [];

    // Build WHERE conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          whereConditions.push(
            `${key} IN (${value.map(() => '?').join(', ')})`
          );
          params.push(...value);
        } else if (typeof value === 'string' && value.includes('%')) {
          whereConditions.push(`${key} LIKE ?`);
          params.push(value);
        } else {
          whereConditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add JOINs
    joins.forEach(join => {
      query += ` ${join}`;
    });

    return { query, params };
  }

  // Build optimized search query
  static buildSearchQuery(
    table: string,
    searchFields: string[],
    searchTerm: string,
    conditions: Record<string, any> = {}
  ): { query: string; params: any[] } {
    const params: any[] = [];
    const searchConditions: string[] = [];

    // Build search conditions
    searchFields.forEach(field => {
      searchConditions.push(`${field} LIKE ?`);
      params.push(`%${searchTerm}%`);
    });

    let query = `SELECT * FROM ${table}`;
    const whereConditions: string[] = [];

    // Add search conditions
    if (searchConditions.length > 0) {
      whereConditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Add additional conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` ORDER BY ${searchFields[0]} LIMIT 100`;

    return { query, params };
  }
}

// Database connection pool monitoring
export class DatabaseMonitor {
  static async getPoolStats() {
    try {
      const stats = {
        totalConnections: pool.config.connectionLimit,
        activeConnections: 0,
        idleConnections: 0,
        queuedRequests: 0,
      };

      // Get connection pool status
      const connection = await pool.getConnection();
      connection.release();

      return stats;
    } catch (error) {
      logger.error('[DB_MONITOR] Error getting pool stats:', error);
      return null;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await QueryOptimizer.executeQuery('SELECT 1 as health', [], {
        timeout: 5000,
      });
      return true;
    } catch (error) {
      logger.error('[DB_HEALTH] Database health check failed:', error);
      return false;
    }
  }
}

// Index optimization suggestions
export class IndexOptimizer {
  static async analyzeQueryPerformance(
    query: string,
    params: any[] = []
  ): Promise<void> {
    try {
      // This would require MySQL's EXPLAIN functionality
      // For now, we'll log the query for manual analysis
      logger.info('[QUERY_ANALYSIS]', {
        query: query.substring(0, 200) + '...',
        params: params.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[QUERY_ANALYSIS] Error analyzing query:', error);
    }
  }
}

export default {
  QueryOptimizer,
  QueryBuilder,
  DatabaseMonitor,
  IndexOptimizer,
};

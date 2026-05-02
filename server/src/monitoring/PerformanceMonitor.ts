import logger from '../logger.js';
import { AppError } from '../middleware/enhancedErrorHandling.js';
import { pool } from '../db.js';
import os from 'os';
import process from 'process';

interface PerformanceMetric {
  timestamp: Date;
  responseTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  cpuUsage: number;
  databaseQueryTime: number | null;
  endpoint: string;
  method: string;
  statusCode: number;
  success: boolean;
}

interface SystemHealth {
  timestamp: Date;
  system: {
    uptime: number;
    loadAvg: number[];
    totalMemory: number;
    freeMemory: number;
    cpuUsage: number;
  };
  process: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpuUsage: number;
  };
  database: {
    connections: number;
    queryPerformance: {
      avgResponseTime: number;
      maxResponseTime: number;
      minResponseTime: number;
    };
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000; // Keep last 1000 metrics
  private systemHealthTable: string = 'system_health_metrics';
  private performanceMetricsTable: string = 'performance_metrics';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Create performance metrics table if it doesn't exist
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${this.performanceMetricsTable} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          response_time DECIMAL(10,2) NOT NULL,
          memory_usage JSON NOT NULL,
          cpu_usage DECIMAL(5,2) NOT NULL,
          database_query_time DECIMAL(10,2) NULL,
          status_code INT NOT NULL,
          success BOOLEAN NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create system health table if it doesn't exist
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${this.systemHealthTable} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          system_metrics JSON NOT NULL,
          process_metrics JSON NOT NULL,
          database_metrics JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('Performance monitoring system initialized');
    } catch (error) {
      logger.error('Failed to initialize performance monitoring:', error);
      throw new AppError('Failed to initialize performance monitoring', 500);
    }
  }

  /**
   * Track API performance metrics
   */
  async trackPerformance(
    endpoint: string,
    method: string,
    startTime: number,
    statusCode: number,
    success: boolean,
    databaseQueryTime?: number
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate CPU usage percentage
      const cpuUsagePercent = this.calculateCpuUsage(cpuUsage);

      const metric: PerformanceMetric = {
        timestamp: new Date(),
        responseTime,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
        },
        cpuUsage: cpuUsagePercent,
        databaseQueryTime: databaseQueryTime || null,
        endpoint,
        method,
        statusCode,
        success,
      };

      // Store in memory (for recent analysis)
      this.storeMetric(metric);

      // Store in database (for long-term analysis)
      await this.storeMetricInDatabase(metric);
    } catch (error) {
      logger.error('Failed to track performance:', error);
    }
  }

  /**
   * Store metric in memory with size limit
   */
  private storeMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // Remove oldest metric
    }
  }

  /**
   * Store metric in database
   */
  private async storeMetricInDatabase(
    metric: PerformanceMetric
  ): Promise<void> {
    try {
      await pool.execute(
        `INSERT INTO ${this.performanceMetricsTable}
         (endpoint, method, response_time, memory_usage, cpu_usage, database_query_time, status_code, success)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metric.endpoint,
          metric.method,
          metric.responseTime,
          JSON.stringify(metric.memoryUsage),
          metric.cpuUsage,
          metric.databaseQueryTime || null,
          metric.statusCode,
          metric.success,
        ]
      );
    } catch (error) {
      logger.error('Failed to store performance metric in database:', error);
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simple CPU usage calculation (more accurate methods would require previous measurements)
    const totalUsage = cpuUsage.user + cpuUsage.system;
    const totalTime = process.uptime() * 1000000; // Convert to microseconds

    if (totalTime === 0) return 0;

    // Calculate percentage (this is a simplified approach)
    const cpuUsagePercent = (totalUsage / totalTime) * 100;
    return parseFloat(cpuUsagePercent.toFixed(2));
  }

  /**
   * Get recent performance metrics
   */
  async getRecentPerformanceMetrics(
    limit: number = 100
  ): Promise<PerformanceMetric[]> {
    try {
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.performanceMetricsTable}
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit]
      )) as any[];

      return rows.map((row: any) => ({
        timestamp: row.timestamp,
        responseTime: row.response_time,
        memoryUsage: JSON.parse(row.memory_usage),
        cpuUsage: row.cpu_usage,
        databaseQueryTime: row.database_query_time,
        endpoint: row.endpoint,
        method: row.method,
        statusCode: row.status_code,
        success: row.success,
      }));
    } catch (error) {
      logger.error('Failed to get recent performance metrics:', error);
      throw new AppError('Failed to get performance metrics', 500);
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStatistics(): Promise<{
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    errorRate: number;
    successRate: number;
    avgMemoryUsage: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    avgCpuUsage: number;
  }> {
    try {
      const [rows] = (await pool.execute(
        `SELECT
          AVG(response_time) as avgResponseTime,
          MAX(response_time) as maxResponseTime,
          MIN(response_time) as minResponseTime,
          SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as errorCount,
          SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successCount,
          AVG(JSON_EXTRACT(memory_usage, '$.heapUsed')) as avgHeapUsed,
          AVG(JSON_EXTRACT(memory_usage, '$.heapTotal')) as avgHeapTotal,
          AVG(JSON_EXTRACT(memory_usage, '$.rss')) as avgRss,
          AVG(cpu_usage) as avgCpuUsage,
          COUNT(*) as totalCount
         FROM ${this.performanceMetricsTable}
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`
      )) as any[];

      if (rows.length === 0) {
        return {
          avgResponseTime: 0,
          maxResponseTime: 0,
          minResponseTime: 0,
          errorRate: 0,
          successRate: 0,
          avgMemoryUsage: {
            heapUsed: 0,
            heapTotal: 0,
            rss: 0,
          },
          avgCpuUsage: 0,
        };
      }

      const row = rows[0];
      const totalCount = row.totalCount || 1;

      return {
        avgResponseTime: parseFloat(row.avgResponseTime) || 0,
        maxResponseTime: parseFloat(row.maxResponseTime) || 0,
        minResponseTime: parseFloat(row.minResponseTime) || 0,
        errorRate: totalCount > 0 ? (row.errorCount || 0) / totalCount : 0,
        successRate: totalCount > 0 ? (row.successCount || 0) / totalCount : 0,
        avgMemoryUsage: {
          heapUsed: parseFloat(row.avgHeapUsed) || 0,
          heapTotal: parseFloat(row.avgHeapTotal) || 0,
          rss: parseFloat(row.avgRss) || 0,
        },
        avgCpuUsage: parseFloat(row.avgCpuUsage) || 0,
      };
    } catch (error) {
      logger.error('Failed to get performance statistics:', error);
      throw new AppError('Failed to get performance statistics', 500);
    }
  }

  /**
   * Record system health metrics
   */
  async recordSystemHealth(): Promise<SystemHealth> {
    try {
      const systemMetrics = this.getSystemMetrics();
      const processMetrics = this.getProcessMetrics();
      const databaseMetrics = await this.getDatabaseMetrics();

      const healthData: SystemHealth = {
        timestamp: new Date(),
        system: systemMetrics,
        process: processMetrics,
        database: databaseMetrics,
      };

      // Store in database
      await pool.execute(
        `INSERT INTO ${this.systemHealthTable}
         (system_metrics, process_metrics, database_metrics)
         VALUES (?, ?, ?)`,
        [
          JSON.stringify(systemMetrics),
          JSON.stringify(processMetrics),
          JSON.stringify(databaseMetrics),
        ]
      );

      return healthData;
    } catch (error) {
      logger.error('Failed to record system health:', error);
      throw new AppError('Failed to record system health', 500);
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemHealth['system'] {
    return {
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuUsage: this.calculateSystemCpuUsage(),
    };
  }

  /**
   * Calculate system CPU usage
   */
  private calculateSystemCpuUsage(): number {
    const cpus = os.cpus();
    let totalUsage = 0;

    for (const cpu of cpus) {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const usage = total - cpu.times.idle;
      totalUsage += usage / total;
    }

    return parseFloat(((totalUsage / cpus.length) * 100).toFixed(2));
  }

  /**
   * Get process metrics
   */
  private getProcessMetrics(): SystemHealth['process'] {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      cpuUsage: this.calculateCpuUsage(cpuUsage),
    };
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics(): Promise<SystemHealth['database']> {
    try {
      // Get database connection count
      const [connectionRows] = (await pool.execute(
        'SELECT COUNT(*) as connectionCount FROM information_schema.processlist WHERE db = DATABASE()'
      )) as any[];

      // Get average query performance from our metrics table
      const [queryRows] = (await pool.execute(
        `SELECT
          AVG(response_time) as avgResponseTime,
          MAX(response_time) as maxResponseTime,
          MIN(response_time) as minResponseTime
         FROM ${this.performanceMetricsTable}
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`
      )) as any[];

      return {
        connections: connectionRows[0]?.connectionCount || 0,
        queryPerformance: {
          avgResponseTime: parseFloat(queryRows[0]?.avgResponseTime) || 0,
          maxResponseTime: parseFloat(queryRows[0]?.maxResponseTime) || 0,
          minResponseTime: parseFloat(queryRows[0]?.minResponseTime) || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      return {
        connections: 0,
        queryPerformance: {
          avgResponseTime: 0,
          maxResponseTime: 0,
          minResponseTime: 0,
        },
      };
    }
  }

  /**
   * Get system health history
   */
  async getSystemHealthHistory(limit: number = 24): Promise<SystemHealth[]> {
    try {
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.systemHealthTable}
         ORDER BY timestamp DESC
         LIMIT ?`,
        [limit]
      )) as any[];

      return rows.map((row: any) => ({
        timestamp: row.timestamp,
        system: JSON.parse(row.system_metrics),
        process: JSON.parse(row.process_metrics),
        database: JSON.parse(row.database_metrics),
      }));
    } catch (error) {
      logger.error('Failed to get system health history:', error);
      throw new AppError('Failed to get system health history', 500);
    }
  }

  /**
   * Get endpoint performance by endpoint
   */
  async getEndpointPerformance(): Promise<{
    [endpoint: string]: {
      count: number;
      avgResponseTime: number;
      errorRate: number;
      methods: {
        [method: string]: {
          count: number;
          avgResponseTime: number;
          errorRate: number;
        };
      };
    };
  }> {
    try {
      const [rows] = (await pool.execute(
        `SELECT
          endpoint,
          method,
          COUNT(*) as count,
          AVG(response_time) as avgResponseTime,
          SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as errorCount
         FROM ${this.performanceMetricsTable}
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY endpoint, method`
      )) as any[];

      const result: {
        [endpoint: string]: {
          count: number;
          avgResponseTime: number;
          errorRate: number;
          methods: {
            [method: string]: {
              count: number;
              avgResponseTime: number;
              errorRate: number;
            };
          };
        };
      } = {};

      for (const row of rows) {
        if (!result[row.endpoint]) {
          result[row.endpoint] = {
            count: 0,
            avgResponseTime: 0,
            errorRate: 0,
            methods: {},
          };
        }

        const endpointData = result[row.endpoint]!;
        endpointData.count += row.count;
        endpointData.avgResponseTime += parseFloat(row.avgResponseTime);
        endpointData.errorRate += row.errorCount;

        endpointData.methods[row.method] = {
          count: row.count,
          avgResponseTime: parseFloat(row.avgResponseTime),
          errorRate: row.count > 0 ? row.errorCount / row.count : 0,
        };
      }

      // Calculate averages
      for (const endpoint in result) {
        const endpointData = result[endpoint]!;
        const methodCount = Object.keys(endpointData.methods).length;

        endpointData.avgResponseTime =
          methodCount > 0 ? endpointData.avgResponseTime / methodCount : 0;
        endpointData.errorRate =
          endpointData.count > 0
            ? endpointData.errorRate / endpointData.count
            : 0;
      }

      return result;
    } catch (error) {
      logger.error('Failed to get endpoint performance:', error);
      throw new AppError('Failed to get endpoint performance', 500);
    }
  }

  /**
   * Get performance alerts (slow endpoints, high error rates, etc.)
   */
  async getPerformanceAlerts(): Promise<{
    slowEndpoints: Array<{
      endpoint: string;
      method: string;
      avgResponseTime: number;
      thresholdExceeded: number;
    }>;
    highErrorEndpoints: Array<{
      endpoint: string;
      method: string;
      errorRate: number;
      thresholdExceeded: number;
    }>;
    memoryWarnings: Array<{
      type: string;
      current: number;
      threshold: number;
      thresholdExceeded: number;
    }>;
  }> {
    try {
      const stats = await this.getPerformanceStatistics();
      const endpointPerformance = await this.getEndpointPerformance();
      const memoryUsage = process.memoryUsage();

      const alerts = {
        slowEndpoints: [] as Array<{
          endpoint: string;
          method: string;
          avgResponseTime: number;
          thresholdExceeded: number;
        }>,
        highErrorEndpoints: [] as Array<{
          endpoint: string;
          method: string;
          errorRate: number;
          thresholdExceeded: number;
        }>,
        memoryWarnings: [] as Array<{
          type: string;
          current: number;
          threshold: number;
          thresholdExceeded: number;
        }>,
      };

      // Check for slow endpoints (threshold: 1000ms)
      const responseTimeThreshold = 1000;

      for (const endpoint in endpointPerformance) {
        const endpointData = endpointPerformance[endpoint]!;

        for (const method in endpointData.methods) {
          const methodData = endpointData.methods[method]!;

          if (methodData.avgResponseTime > responseTimeThreshold) {
            alerts.slowEndpoints.push({
              endpoint,
              method,
              avgResponseTime: methodData.avgResponseTime,
              thresholdExceeded:
                methodData.avgResponseTime - responseTimeThreshold,
            });
          }
        }
      }

      // Check for high error rates (threshold: 10%)
      const errorRateThreshold = 0.1;

      for (const endpoint in endpointPerformance) {
        const endpointData = endpointPerformance[endpoint]!;

        for (const method in endpointData.methods) {
          const methodData = endpointData.methods[method]!;

          if (methodData.errorRate > errorRateThreshold) {
            alerts.highErrorEndpoints.push({
              endpoint,
              method,
              errorRate: methodData.errorRate,
              thresholdExceeded: methodData.errorRate - errorRateThreshold,
            });
          }
        }
      }

      // Check memory usage (thresholds in bytes)
      const memoryThresholds = {
        heapUsed: 500 * 1024 * 1024, // 500MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
        rss: 1500 * 1024 * 1024, // 1.5GB
      };

      for (const [type, threshold] of Object.entries(memoryThresholds)) {
        const currentUsage = (memoryUsage as any)[type];

        if (currentUsage > threshold) {
          alerts.memoryWarnings.push({
            type,
            current: currentUsage,
            threshold,
            thresholdExceeded: currentUsage - threshold,
          });
        }
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to get performance alerts:', error);
      throw new AppError('Failed to get performance alerts', 500);
    }
  }

  /**
   * Clean up old performance metrics
   */
  async cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
    try {
      const [result] = (await pool.execute(
        `DELETE FROM ${this.performanceMetricsTable}
         WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [retentionDays]
      )) as any[];

      return result.affectedRows || 0;
    } catch (error) {
      logger.error('Failed to cleanup old performance metrics:', error);
      throw new AppError('Failed to cleanup performance metrics', 500);
    }
  }
}

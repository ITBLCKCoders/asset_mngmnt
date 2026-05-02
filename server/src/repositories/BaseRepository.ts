import { pool } from '../db.js';
import logger from '../logger.js';
import { AppError } from '../middleware/enhancedErrorHandling.js';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find all records with optional pagination and filtering
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: Record<string, any> = {},
    joins: string[] = [],
    orderBy: string = `${this.primaryKey} DESC`
  ): Promise<{ data: T[]; pagination: any }> {
    try {
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          whereConditions.push(`${key} = ?`);
          params.push(value);
        }
      });

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(' AND ')}`
          : '';

      // Get total count
      const [countRows] = (await pool.execute(
        `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`,
        params
      )) as any[];

      const total = countRows[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get records with pagination
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )) as any[];

      return {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error(
        `BaseRepository.findAll failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to fetch ${this.tableName}`, 500);
    }
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<any> {
    try {
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`,
        [id]
      )) as any[];

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error(
        `BaseRepository.findById failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to fetch ${this.tableName}`, 500);
    }
  }

  /**
   * Create a new record
   */
  async create(data: any): Promise<T> {
    try {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data)
        .map(() => '?')
        .join(', ');
      const values = Object.values(data);

      const [result] = (await pool.execute(
        `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
        values
      )) as any[];

      // Return the created record
      return this.findById(result.insertId);
    } catch (error) {
      logger.error(
        `BaseRepository.create failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to create ${this.tableName}`, 500);
    }
  }

  /**
   * Update a record
   */
  async update(id: string, data: any): Promise<T | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (setClauses.length === 0) {
        return null;
      }

      values.push(id);

      await pool.execute(
        `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE ${this.primaryKey} = ?`,
        values
      );

      return this.findById(id);
    } catch (error) {
      logger.error(
        `BaseRepository.update failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to update ${this.tableName}`, 500);
    }
  }

  /**
   * Delete a record (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const [result] = (await pool.execute(
        `UPDATE ${this.tableName} SET deleted_at = CURRENT_TIMESTAMP WHERE ${this.primaryKey} = ?`,
        [id]
      )) as any[];

      return result.affectedRows > 0;
    } catch (error) {
      logger.error(
        `BaseRepository.delete failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to delete ${this.tableName}`, 500);
    }
  }

  /**
   * Execute raw SQL query
   */
  async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    try {
      const [rows] = (await pool.execute(query, params)) as any[];
      return rows;
    } catch (error) {
      logger.error(
        `BaseRepository.executeQuery failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to execute query on ${this.tableName}`, 500);
    }
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const [rows] = (await pool.execute(
        `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL LIMIT 1`,
        [id]
      )) as any[];
      return rows.length > 0;
    } catch (error) {
      logger.error(
        `BaseRepository.exists failed for ${this.tableName}:`,
        error
      );
      throw new AppError(`Failed to check existence in ${this.tableName}`, 500);
    }
  }
}

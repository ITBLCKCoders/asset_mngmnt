import { pool } from '../db.js';
import logger from '../logger.js';
import { AppError } from '../middleware/enhancedErrorHandling.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  id: string;
  name: string;
  version: string;
  description: string;
  executed_at: Date | null;
  status: 'pending' | 'completed' | 'failed';
}

export class MigrationManager {
  private migrationsPath: string;
  private migrationsTableName: string = 'database_migrations';

  constructor(migrationsPath: string = path.join(__dirname, '../../../db')) {
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration system - create migrations table if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          executed_at TIMESTAMP NULL,
          status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      logger.info('Migration system initialized');
    } catch (error: any) {
      logger.error('Failed to initialize migration system:', error);
      throw new AppError('Failed to initialize migration system', 500);
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<{
    success: boolean;
    migrationsRun: number;
    errors: any[];
  }> {
    try {
      await this.initialize();

      // Get list of migration files
      const migrationFiles = await this.getMigrationFiles();

      // Get list of already executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      const results = {
        success: true,
        migrationsRun: 0,
        errors: [] as any[],
      };

      // Run each migration that hasn't been executed yet
      for (const migrationFile of migrationFiles) {
        const migrationId = path.basename(migrationFile, '.sql');
        const migrationName = path.basename(migrationFile);

        // Check if migration has already been executed
        const alreadyExecuted = executedMigrations.some(
          m => m.name === migrationName
        );

        if (!alreadyExecuted) {
          try {
            logger.info(`Running migration: ${migrationName}`);

            // Read migration SQL file
            const migrationSql = await fs.readFile(migrationFile, 'utf-8');

            // Execute migration
            await pool.execute(migrationSql);

            // Record migration as completed
            await this.recordMigration({
              id: migrationId,
              name: migrationName,
              version: this.extractVersionFromFilename(migrationName),
              description: `Migration: ${migrationName}`,
              executed_at: new Date(),
              status: 'completed',
            });

            results.migrationsRun++;
            logger.info(`Completed migration: ${migrationName}`);
          } catch (error: unknown) {
            logger.error(`Failed to run migration ${migrationName}:`, error);

            // Record migration as failed
            await this.recordMigration({
              id: migrationId,
              name: migrationName,
              version: this.extractVersionFromFilename(migrationName),
              description: `Migration: ${migrationName}`,
              executed_at: new Date(),
              status: 'failed',
            });

            results.success = false;
            results.errors.push({
              migration: migrationName,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } else {
          logger.info(`Skipping already executed migration: ${migrationName}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to run migrations:', error);
      throw new AppError('Failed to run migrations', 500);
    }
  }

  /**
   * Get list of migration files from migrations directory
   */
  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.startsWith('migration_') && file.endsWith('.sql'))
        .map(file => path.join(this.migrationsPath, file))
        .sort(); // Sort to ensure migrations run in order
    } catch (error) {
      logger.error('Failed to read migration files:', error);
      throw new AppError('Failed to read migration files', 500);
    }
  }

  /**
   * Get list of already executed migrations from database
   */
  private async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.migrationsTableName} ORDER BY executed_at DESC`
      )) as any[];

      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        description: row.description,
        executed_at: row.executed_at,
        status: row.status,
      }));
    } catch (error) {
      logger.error('Failed to get executed migrations:', error);
      throw new AppError('Failed to get executed migrations', 500);
    }
  }

  /**
   * Record migration execution in database
   */
  private async recordMigration(
    migration: Omit<Migration, 'created_at' | 'updated_at'>
  ): Promise<void> {
    try {
      const { id, name, version, description, executed_at, status } = migration;

      await pool.execute(
        `INSERT INTO ${this.migrationsTableName}
         (id, name, version, description, executed_at, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         executed_at = VALUES(executed_at),
         status = VALUES(status),
         description = VALUES(description),
         version = VALUES(version)`,
        [id, name, version, description, executed_at, status]
      );
    } catch (error: any) {
      logger.error(`Failed to record migration ${migration.name}:`, error);
      throw new AppError(`Failed to record migration ${migration.name}`, 500);
    }
  }

  /**
   * Extract version from migration filename
   */
  private extractVersionFromFilename(filename: string): string {
    // Extract version from filename like "migration_create_users_table_v1.0.0.sql"
    const versionMatch = filename.match(/v(\d+\.\d+\.\d+)/);
    return versionMatch ? (versionMatch[1] ?? '1.0.0') : '1.0.0';
  }

  /**
   * Check if migrations table exists
   */
  async checkMigrationsTableExists(): Promise<boolean> {
    try {
      const [rows] = (await pool.execute(`SHOW TABLES LIKE ?`, [
        this.migrationsTableName,
      ])) as any[];

      return rows.length > 0;
    } catch (error) {
      logger.error('Failed to check if migrations table exists:', error);
      return false;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    totalMigrations: number;
    completedMigrations: number;
    failedMigrations: number;
    pendingMigrations: number;
    migrations: Migration[];
  }> {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      const totalMigrations = migrationFiles.length;
      const completedMigrations = executedMigrations.filter(
        m => m.status === 'completed'
      ).length;
      const failedMigrations = executedMigrations.filter(
        m => m.status === 'failed'
      ).length;
      const pendingMigrations =
        totalMigrations - completedMigrations - failedMigrations;

      return {
        totalMigrations,
        completedMigrations,
        failedMigrations,
        pendingMigrations,
        migrations: executedMigrations,
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw new AppError('Failed to get migration status', 500);
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<{
    success: boolean;
    migration?: Migration;
    error?: any;
  }> {
    try {
      // Get the last completed migration
      const [rows] = (await pool.execute(
        `SELECT * FROM ${this.migrationsTableName}
         WHERE status = 'completed'
         ORDER BY executed_at DESC
         LIMIT 1`
      )) as any[];

      if (rows.length === 0) {
        return {
          success: false,
          error: new Error('No migrations to rollback'),
        };
      }

      const lastMigration = rows[0] as Migration;

      // Check if there's a corresponding rollback file
      const rollbackFilePath = path.join(
        this.migrationsPath,
        `rollback_${lastMigration.name}`
      );

      try {
        await fs.access(rollbackFilePath);

        // Read and execute rollback SQL
        const rollbackSql = await fs.readFile(rollbackFilePath, 'utf-8');
        await pool.execute(rollbackSql);

        // Mark migration as rolled back
        await pool.execute(
          `UPDATE ${this.migrationsTableName} SET status = 'rolled_back' WHERE id = ?`,
          [lastMigration.id]
        );

        logger.info(`Rolled back migration: ${lastMigration.name}`);
        return { success: true, migration: lastMigration };
      } catch (rollbackError) {
        logger.error(
          `No rollback file found for migration ${lastMigration.name}`
        );
        return {
          success: false,
          error: new Error(
            `No rollback file found for migration ${lastMigration.name}`
          ),
        };
      }
    } catch (error) {
      logger.error('Failed to rollback migration:', error);
      throw new AppError('Failed to rollback migration', 500);
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(
    name: string,
    description: string,
    sqlContent: string,
    version: string = '1.0.0'
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const migrationFilename = `migration_${name}_v${version}.sql`;
      const migrationPath = path.join(this.migrationsPath, migrationFilename);

      // Create migration content with header
      const migrationContent =
        `-- Migration: ${name}\n` +
        `-- Version: v${version}\n` +
        `-- Description: ${description}\n` +
        `-- Created: ${new Date().toISOString()}\n\n` +
        sqlContent;

      await fs.writeFile(migrationPath, migrationContent);
      logger.info(`Created new migration: ${migrationFilename}`);

      return migrationPath;
    } catch (error) {
      logger.error('Failed to create migration file:', error);
      throw new AppError('Failed to create migration file', 500);
    }
  }
}

import { Request, Response } from 'express';
import { MigrationManager } from '../migration/MigrationManager.js';
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
} from '../utils/responseWrapper.js';
import logger from '../logger.js';

const migrationManager = new MigrationManager();

export const getMigrationStatus = async (req: Request, res: Response) => {
  try {
    const status = await migrationManager.getMigrationStatus();
    return createSuccessResponse(
      res,
      status,
      'Migration status retrieved successfully'
    );
  } catch (error) {
    logger.error('Failed to get migration status:', error);
    return createInternalErrorResponse(res, 'Failed to get migration status');
  }
};

export const runMigrations = async (req: Request, res: Response) => {
  try {
    const result = await migrationManager.runMigrations();

    if (result.success) {
      if (result.migrationsRun === 0) {
        return createSuccessResponse(
          res,
          result,
          'No new migrations to run - all migrations are up to date'
        );
      } else {
        return createSuccessResponse(
          res,
          result,
          `${result.migrationsRun} migrations executed successfully`
        );
      }
    } else {
      return createErrorResponse(
        res,
        'Some migrations failed',
        [],
        400,
        'Partial migration success with some failures'
      );
    }
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    return createInternalErrorResponse(res, 'Failed to run migrations');
  }
};

export const rollbackLastMigration = async (req: Request, res: Response) => {
  try {
    const result = await migrationManager.rollbackLastMigration();

    if (result.success) {
      return createSuccessResponse(
        res,
        result,
        `Migration ${result.migration?.name} rolled back successfully`
      );
    } else {
      return createErrorResponse(
        res,
        result.error?.message || 'Failed to rollback migration',
        [],
        400,
        'Migration rollback failed'
      );
    }
  } catch (error) {
    logger.error('Failed to rollback migration:', error);
    return createInternalErrorResponse(res, 'Failed to rollback migration');
  }
};

export const createMigration = async (req: Request, res: Response) => {
  try {
    const { name, description, sqlContent, version } = req.body;

    if (!name || !description || !sqlContent) {
      return createErrorResponse(
        res,
        'Missing required fields',
        [
          { field: 'name', message: 'Name is required' },
          { field: 'description', message: 'Description is required' },
          { field: 'sqlContent', message: 'SQL content is required' },
        ],
        400,
        'Validation failed'
      );
    }

    const migrationPath = await migrationManager.createMigration(
      name,
      description,
      sqlContent,
      version || '1.0.0'
    );

    return createSuccessResponse(
      res,
      { migrationPath },
      'Migration file created successfully',
      {},
      201
    );
  } catch (error) {
    logger.error('Failed to create migration:', error);
    return createInternalErrorResponse(res, 'Failed to create migration');
  }
};

export const checkMigrationsTable = async (req: Request, res: Response) => {
  try {
    const exists = await migrationManager.checkMigrationsTableExists();
    return createSuccessResponse(
      res,
      { exists },
      `Migrations table ${exists ? 'exists' : 'does not exist'}`
    );
  } catch (error) {
    logger.error('Failed to check migrations table:', error);
    return createInternalErrorResponse(res, 'Failed to check migrations table');
  }
};

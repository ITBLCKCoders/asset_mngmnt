import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as migrationController from '../../controllers/migration.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../migration/MigrationManager.js', () => ({
  MigrationManager: jest.fn(() => ({
    getMigrationStatus: jest.fn(),
    runMigrations: jest.fn(),
    rollbackLastMigration: jest.fn(),
    createMigration: jest.fn(),
    checkMigrationsTableExists: jest.fn(),
  })),
}));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { MigrationManager } = jest.requireMock('../../migration/MigrationManager.js');
const mockManager = MigrationManager.mock.results[0].value;

describe('migration.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getMigrationStatus', () => {
    it('returns migration status', async () => {
      mockManager.getMigrationStatus.mockResolvedValue({ status: 'up-to-date' });
      await migrationController.getMigrationStatus(req, res);
      expect(res._json).toEqual({ success: true, data: { status: 'up-to-date' }, message: 'Migration status retrieved successfully' });
    });

    it('returns 500 on error', async () => {
      mockManager.getMigrationStatus.mockRejectedValue(new Error('Fail'));
      await migrationController.getMigrationStatus(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('runMigrations', () => {
    it('runs migrations successfully', async () => {
      mockManager.runMigrations.mockResolvedValue({ success: true, migrationsRun: 2 });
      await migrationController.runMigrations(req, res);
      expect(res._json.message).toContain('2 migrations executed');
    });

    it('handles no new migrations', async () => {
      mockManager.runMigrations.mockResolvedValue({ success: true, migrationsRun: 0 });
      await migrationController.runMigrations(req, res);
      expect(res._json.message).toContain('No new migrations');
    });

    it('handles partial failure', async () => {
      mockManager.runMigrations.mockResolvedValue({ success: false, migrationsRun: 1 });
      await migrationController.runMigrations(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('rollbackLastMigration', () => {
    it('rolls back successfully', async () => {
      mockManager.rollbackLastMigration.mockResolvedValue({ success: true, migration: { id: 1, name: 'm001' } });
      await migrationController.rollbackLastMigration(req, res);
      expect(res._json.message).toContain('rolled back');
    });

    it('handles rollback failure', async () => {
      mockManager.rollbackLastMigration.mockResolvedValue({ success: false, error: { message: 'No migration to rollback' } });
      await migrationController.rollbackLastMigration(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('createMigration', () => {
    it('creates migration successfully', async () => {
      req.body = { name: 'add_table', description: 'Add new table', sqlContent: 'CREATE TABLE ...' };
      mockManager.createMigration.mockResolvedValue('/path/to/migration');
      await migrationController.createMigration(req, res);
      expect(res._status).toBe(201);
    });

    it('returns 400 when fields missing', async () => {
      req.body = { name: 'test' };
      await migrationController.createMigration(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('checkMigrationsTable', () => {
    it('returns table exists', async () => {
      mockManager.checkMigrationsTableExists.mockResolvedValue(true);
      await migrationController.checkMigrationsTable(req, res);
      expect(res._json.data.exists).toBe(true);
    });

    it('returns table does not exist', async () => {
      mockManager.checkMigrationsTableExists.mockResolvedValue(false);
      await migrationController.checkMigrationsTable(req, res);
      expect(res._json.data.exists).toBe(false);
    });
  });
});

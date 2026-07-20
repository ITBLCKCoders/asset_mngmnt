import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as auditRetentionController from '../../controllers/auditRetention.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/activeCompany.js', () => ({
  getScopedActiveCompany: jest.fn(),
}));
jest.mock('../../services/auditRetention.service.js', () => ({
  AuditRetentionService: {
    getByCompanyId: jest.fn(),
    upsertRetentionSetting: jest.fn(),
    getSystemDefaults: jest.fn(),
    updateSystemDefaults: jest.fn(),
    archiveOldLogs: jest.fn(),
  },
}));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js') as {
  getScopedActiveCompany: jest.Mock;
};
const { AuditRetentionService } = jest.requireMock('../../services/auditRetention.service.js') as {
  AuditRetentionService: {
    getByCompanyId: jest.Mock;
    upsertRetentionSetting: jest.Mock;
    getSystemDefaults: jest.Mock;
    updateSystemDefaults: jest.Mock;
    archiveOldLogs: jest.Mock;
  };
};

describe('auditRetention.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('getRetentionSettingsHandler', () => {
    it('returns retention settings', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      AuditRetentionService.getByCompanyId.mockResolvedValue({ retention_months: 12, is_active: true });
      await auditRetentionController.getRetentionSettingsHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { retention_months: 12, is_active: true } });
    });

    it('returns 400 when no userId', async () => {
      req.user = undefined;
      await auditRetentionController.getRetentionSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when no company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await auditRetentionController.getRetentionSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('upsertRetentionSettingsHandler', () => {
    it('upserts retention settings successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { retention_months: 24, is_active: true };
      AuditRetentionService.upsertRetentionSetting.mockResolvedValue({ retention_months: 24, is_active: true });
      await auditRetentionController.upsertRetentionSettingsHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { retention_months: 24, is_active: true } });
    });

    it('returns 400 when retention_months out of range', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      req.body = { retention_months: 3, is_active: true };
      await auditRetentionController.upsertRetentionSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 400 when no company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      req.body = { retention_months: 24, is_active: true };
      await auditRetentionController.upsertRetentionSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getSystemDefaultsHandler', () => {
    it('returns system defaults for global admin', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ role_name: 'Global Admin' }]]);
      AuditRetentionService.getSystemDefaults.mockResolvedValue({ default_months: 24, minimum_months: 12 });
      await auditRetentionController.getSystemDefaultsHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { default_months: 24, minimum_months: 12 } });
    });

    it('returns 403 for non-global-admin', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ role_name: 'User' }]]);
      await auditRetentionController.getSystemDefaultsHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('updateSystemDefaultsHandler', () => {
    it('updates system defaults successfully', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ role_name: 'Global Admin' }]]);
      req.body = { default_months: 36, minimum_months: 12 };
      await auditRetentionController.updateSystemDefaultsHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { success: true } });
    });

    it('validates month ranges', async () => {
      mockPool.pool.execute.mockResolvedValue([[{ role_name: 'Global Admin' }]]);
      req.body = { default_months: 5, minimum_months: 12 };
      await auditRetentionController.updateSystemDefaultsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('triggerArchiveHandler', () => {
    it('triggers archive successfully', async () => {
      getScopedActiveCompany.mockResolvedValue({ id: 'company-1' });
      AuditRetentionService.archiveOldLogs.mockResolvedValue({ archived: 10 });
      await auditRetentionController.triggerArchiveHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { archived: 10 } });
    });

    it('returns 400 when no company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await auditRetentionController.triggerArchiveHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});

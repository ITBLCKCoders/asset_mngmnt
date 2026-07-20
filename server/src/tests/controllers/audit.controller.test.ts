import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as auditController from '../../controllers/audit.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../services/audit.service.js', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    getByAssetId: jest.fn(),
    getByBuilderId: jest.fn(),
    verifyChain: jest.fn(),
  },
}));

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const AuditService = jest.requireMock('../../services/audit.service.js').default as {
  getAll: jest.Mock;
  getByAssetId: jest.Mock;
  getByBuilderId: jest.Mock;
  verifyChain: jest.Mock;
};

describe('audit.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {} };
    res = createMockRes();
  });

  describe('resolveAuditAccessContext', () => {
    function mockUserAndPermissions(roleName: string, hasAuditView: boolean) {
      mockPool.pool.query
        .mockResolvedValueOnce([[{ company_id: 'c-1', role_name: roleName }]])
        .mockResolvedValueOnce([
          hasAuditView
            ? [{ module_name: 'Audit Trail', permission_type: 'view', granted: 1 }]
            : [],
        ]);
    }

    it('allows global admin', async () => {
      mockUserAndPermissions('Global Admin', false);
      await auditController.getAuditLogsHandler(req, res);
      expect(AuditService.getAll).toHaveBeenCalled();
    });

    it('allows admin without explicit permission', async () => {
      mockUserAndPermissions('Admin', false);
      await auditController.getAuditLogsHandler(req, res);
      expect(AuditService.getAll).toHaveBeenCalled();
    });

    it('allows auditor role', async () => {
      mockUserAndPermissions('Auditor', false);
      await auditController.getAuditLogsHandler(req, res);
      expect(AuditService.getAll).toHaveBeenCalled();
    });

    it('allows user with Audit Trail view permission', async () => {
      mockUserAndPermissions('User', true);
      await auditController.getAuditLogsHandler(req, res);
      expect(AuditService.getAll).toHaveBeenCalled();
    });

    it('blocks user without permission', async () => {
      mockUserAndPermissions('User', false);
      await auditController.getAuditLogsHandler(req, res);
      expect(res._status).toBe(403);
    });
  });

  describe('getAuditLogsHandler', () => {
    it('returns audit logs with meta', async () => {
      mockPool.pool.query
        .mockResolvedValueOnce([[{ company_id: 'c-1', role_name: 'Global Admin' }]])
        .mockResolvedValueOnce([[]]);
      AuditService.getAll.mockResolvedValue({
        logs: [{ auditID: '1', action: 'login', user_name: 'Alice', user_id: 'u-1', user_email: 'alice@test.com', resource_name: null, resource_type: 'user', resource_id: 'u-1', details: null, old_values: null, new_values: null, ip_address: null, user_agent: null, company_id: 'c-1', status: 'success', severity: 'info', request_id: null, session_id: null, http_method: null, http_endpoint: null, prev_hash: null, row_hash: null, created_at: '2024-01-01' }],
        page: 1, limit: 20, total: 1, totalPages: 1,
      });
      await auditController.getAuditLogsHandler(req, res);
      expect(res._json.auditLogs).toHaveLength(1);
      expect(res._json.meta.page).toBe(1);
    });

    it('returns empty array on error', async () => {
      mockPool.pool.query
        .mockResolvedValueOnce([[{ company_id: 'c-1', role_name: 'Global Admin' }]])
        .mockResolvedValueOnce([[]]);
      AuditService.getAll.mockRejectedValue(new Error('Service error'));
      await auditController.getAuditLogsHandler(req, res);
      expect(res._json.auditLogs).toEqual([]);
    });
  });

  describe('getAssetAuditLogsHandler', () => {
    it('returns audit logs for asset', async () => {
      req.params = { assetId: 'asset-1' };
      AuditService.getByAssetId.mockResolvedValue({
        logs: [{ auditID: '1', action: 'update', user_name: 'System', user_id: null, user_email: null, resource_type: 'asset', resource_id: 'asset-1', resource_name: null, details: null, old_values: null, new_values: null, ip_address: null, user_agent: null, company_id: null, created_at: '2024-01-01' }],
      });
      await auditController.getAssetAuditLogsHandler(req, res);
      expect(res._json.auditLogs).toHaveLength(1);
    });

    it('returns 400 when no asset id', async () => {
      await auditController.getAssetAuditLogsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getBuilderAuditLogsHandler', () => {
    it('returns audit logs for builder', async () => {
      req.params = { builderId: 'builder-1' };
      AuditService.getByBuilderId.mockResolvedValue({
        logs: [{ auditID: '1', action: 'create_builder', user_name: 'System', user_id: null, user_email: null, resource_type: 'builder', resource_id: 'builder-1', resource_name: null, details: null, old_values: null, new_values: null, ip_address: null, user_agent: null, company_id: null, created_at: '2024-01-01' }],
      });
      await auditController.getBuilderAuditLogsHandler(req, res);
      expect(res._json.auditLogs).toHaveLength(1);
    });

    it('returns 400 when no builder id', async () => {
      await auditController.getBuilderAuditLogsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('verifyAuditChainHandler', () => {
    it('verifies audit chain successfully', async () => {
      mockPool.pool.query
        .mockResolvedValueOnce([[{ company_id: 'c-1', role_name: 'Global Admin' }]])
        .mockResolvedValueOnce([[]]);
      AuditService.verifyChain.mockResolvedValue({ valid: true, checked: 10 });
      await auditController.verifyAuditChainHandler(req, res);
      expect(res._json.success).toBe(true);
    });

    it('blocks non-admin', async () => {
      mockPool.pool.query
        .mockResolvedValueOnce([[{ company_id: 'c-1', role_name: 'User' }]])
        .mockResolvedValueOnce([[]]);
      await auditController.verifyAuditChainHandler(req, res);
      expect(res._status).toBe(403);
    });
  });
});

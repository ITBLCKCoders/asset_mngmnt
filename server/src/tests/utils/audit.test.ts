import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockAuditService = { create: jest.fn() };
const mockSettingModel = { getValue: jest.fn() };

jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../services/audit.service.js', () => ({ __esModule: true, default: mockAuditService }));
jest.mock('../../models/setting.model.js', () => ({ SettingModel: mockSettingModel }));

const { buildAuditContext, createAuditLog } = require('../../utils/audit.js');

describe('audit', () => {
  let req: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      ip: '192.168.1.1',
      method: 'POST',
      originalUrl: '/api/assets',
      url: '/api/assets',
      get: jest.fn((h: string) => {
        if (h === 'User-Agent') return 'test-agent';
        return undefined;
      }),
      headers: {},
    };
  });

  describe('buildAuditContext', () => {
    it('should extract IP, user-agent, method, endpoint', () => {
      const ctx = buildAuditContext(req);
      expect(ctx.ipAddress).toBe('192.168.1.1');
      expect(ctx.userAgent).toBe('test-agent');
      expect(ctx.httpMethod).toBe('POST');
      expect(ctx.httpEndpoint).toBe('/api/assets');
    });

    it('should use X-Forwarded-For when present', () => {
      req.headers['x-forwarded-for'] = '10.0.0.1, proxy';
      req.get.mockImplementation((h: string) => {
        if (h === 'X-Forwarded-For') return '10.0.0.1, proxy';
        if (h === 'User-Agent') return 'test-agent';
        return undefined;
      });
      const ctx = buildAuditContext(req);
      expect(ctx.ipAddress).toBe('10.0.0.1');
    });

    it('should capture X-Request-ID', () => {
      req.headers['x-request-id'] = 'req-123';
      req.get.mockImplementation((h: string) => {
        if (h === 'X-Request-ID') return 'req-123';
        if (h === 'User-Agent') return 'test-agent';
        return undefined;
      });
      const ctx = buildAuditContext(req);
      expect(ctx.requestId).toBe('req-123');
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log via service', async () => {
      mockSettingModel.getValue.mockResolvedValue(true);
      await createAuditLog({ action: 'Created', resourceType: 'asset', resourceId: 'a1' });
      expect(mockAuditService.create).toHaveBeenCalled();
      expect(mockAuditService.create.mock.calls[0][0].action).toBe('Created');
    });

    it('should skip when audit logging disabled', async () => {
      mockSettingModel.getValue.mockResolvedValue(false);
      await createAuditLog({ action: 'Created', resourceType: 'asset' });
      expect(mockAuditService.create).not.toHaveBeenCalled();
    });

    it('should not throw on service error', async () => {
      mockSettingModel.getValue.mockResolvedValue(true);
      mockAuditService.create.mockRejectedValue(new Error('DB error'));
      await expect(
        createAuditLog({ action: 'Test', resourceType: 'test' })
      ).resolves.toBeUndefined();
    });

    it('should stringify old/new values', async () => {
      mockSettingModel.getValue.mockResolvedValue(true);
      await createAuditLog({
        action: 'Updated',
        resourceType: 'asset',
        oldValues: { status: 'Active' },
        newValues: { status: 'Returned' },
      });
      const callArgs = mockAuditService.create.mock.calls[0][0];
      expect(callArgs.old_values).toBe('{"status":"Active"}');
      expect(callArgs.new_values).toBe('{"status":"Returned"}');
    });
  });
});

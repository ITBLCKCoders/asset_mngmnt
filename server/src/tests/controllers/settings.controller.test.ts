import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as settingsController from '../../controllers/settings.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn(), query: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/activeCompany.js', () => ({ getScopedActiveCompany: jest.fn() }));
jest.mock('../../models/setting.model.js', () => ({ SettingModel: { getValue: jest.fn(), setValue: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));

const { pool } = jest.requireMock('../../db.js');
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js');
const { SettingModel } = jest.requireMock('../../models/setting.model.js');
const createAuditLog = jest.requireMock('../../utils/audit.js').createAuditLog as jest.Mock;

const activeCompany = { id: 1, name: 'Acme Corp', code: 'ACME' };

describe('settings.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn(), user: { userID: '5' } };
    res = createMockRes();
    getScopedActiveCompany.mockResolvedValue(activeCompany);
  });

  describe('getAssetIdFormatSettingsHandler', () => {
    it('returns settings list', async () => {
      pool.execute.mockResolvedValue([[{ id: 1, company_format: 'code' }], []]);
      await settingsController.getAssetIdFormatSettingsHandler(req, res);
      expect(res._json).toEqual({ settings: [{ id: 1, company_format: 'code' }] });
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await settingsController.getAssetIdFormatSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateAssetIdFormatSettingsHandler', () => {
    it('updates existing settings', async () => {
      req.body = { company_id: 1, company_format: 'code' };
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1, company_format: 'code' }], []]);
      await settingsController.updateAssetIdFormatSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });

    it('inserts new settings when none exist', async () => {
      req.body = { company_id: 2, company_format: 'name' };
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 2, company_format: 'name' }], []]);
      await settingsController.updateAssetIdFormatSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });

    it('returns 400 when company_id missing', async () => {
      req.body = {};
      await settingsController.updateAssetIdFormatSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getAccountabilityFormSettingsHandler', () => {
    it('returns settings list', async () => {
      pool.execute.mockResolvedValue([[{ id: 1, company_format: 'code' }], []]);
      await settingsController.getAccountabilityFormSettingsHandler(req, res);
      expect(res._json).toEqual({ settings: [{ id: 1, company_format: 'code' }] });
    });

    it('returns 400 when no active company', async () => {
      getScopedActiveCompany.mockResolvedValue(null);
      await settingsController.getAccountabilityFormSettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('updateAccountabilityFormSettingsHandler', () => {
    it('updates existing settings', async () => {
      req.body = { company_id: 1 };
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      await settingsController.updateAccountabilityFormSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
      expect(pool.execute.mock.calls[1][0]).toEqual(expect.stringContaining('created_by = COALESCE(created_by, ?)'));
      expect(pool.execute.mock.calls[1][1].slice(-3)).toEqual(['5', '5', 1]);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        userId: '5',
        action: 'update_accountability_form_settings',
      }));
    });

    it('inserts new settings', async () => {
      req.body = { company_id: 2 };
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 2 }], []]);
      await settingsController.updateAccountabilityFormSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });
  });

  describe('updateIntangibleClearanceFormSettingsHandler', () => {
    it('saves both settings with creator fields and writes an audit log', async () => {
      req.body = {
        company_id: 1,
        deactivation_form_code: 'IDF',
        clearance_form_code: 'CLR',
      };
      pool.execute.mockResolvedValue([[], []]);

      await settingsController.updateIntangibleClearanceFormSettingsHandler(req, res);

      expect(pool.execute).toHaveBeenCalledTimes(2);
      expect(pool.execute.mock.calls[0][0]).toEqual(expect.stringContaining('created_by, updated_by'));
      expect(pool.execute.mock.calls[1][0]).toEqual(expect.stringContaining('created_by, updated_by'));
      expect(pool.execute.mock.calls[0][1].slice(-2)).toEqual(['5', '5']);
      expect(pool.execute.mock.calls[1][1].slice(-2)).toEqual(['5', '5']);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        userId: '5',
        action: 'update_intangible_clearance_form_settings',
        resourceType: 'settings',
        resourceId: '1',
      }));
      expect(res._json.message).toContain('updated');
    });
  });

  describe('getAssetReturnFormSettingsHandler', () => {
    it('returns settings', async () => {
      pool.execute.mockResolvedValue([[{ id: 1 }], []]);
      await settingsController.getAssetReturnFormSettingsHandler(req, res);
      expect(res._json.settings).toHaveLength(1);
    });
  });

  describe('updateAssetReturnFormSettingsHandler', () => {
    it('updates existing settings', async () => {
      req.body = { company_id: 1 };
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      await settingsController.updateAssetReturnFormSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });
  });

  describe('getAssetChecklistFormSettingsHandler', () => {
    it('returns settings', async () => {
      pool.execute.mockResolvedValue([[{ id: 1 }], []]);
      await settingsController.getAssetChecklistFormSettingsHandler(req, res);
      expect(res._json.settings).toHaveLength(1);
    });
  });

  describe('updateAssetChecklistFormSettingsHandler', () => {
    it('updates existing settings', async () => {
      req.body = { company_id: 1 };
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      await settingsController.updateAssetChecklistFormSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });
  });

  describe('getAssetTransferFormSettingsHandler', () => {
    it('returns settings', async () => {
      pool.execute.mockResolvedValue([[{ id: 1 }], []]);
      await settingsController.getAssetTransferFormSettingsHandler(req, res);
      expect(res._json.settings).toHaveLength(1);
    });
  });

  describe('updateAssetTransferFormSettingsHandler', () => {
    it('calls SP and returns updated settings', async () => {
      req.body = { company_id: 1, company_format: 'code' };
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1, company_format: 'code' }], []]);
      await settingsController.updateAssetTransferFormSettingsHandler(req, res);
      expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('CALL sp_upsert'), expect.any(Array));
      expect(res._json.message).toContain('updated');
    });
  });

  describe('getAssetBorrowFormSettingsHandler', () => {
    it('returns settings', async () => {
      pool.execute.mockResolvedValue([[{ id: 1 }], []]);
      await settingsController.getAssetBorrowFormSettingsHandler(req, res);
      expect(res._json.settings).toHaveLength(1);
    });
  });

  describe('updateAssetBorrowFormSettingsHandler', () => {
    it('updates existing settings', async () => {
      req.body = { company_id: 1 };
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      pool.execute.mockResolvedValueOnce([[], []]);
      pool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
      await settingsController.updateAssetBorrowFormSettingsHandler(req, res);
      expect(res._json.message).toContain('updated');
    });
  });

  describe('getGlobalMFASettingsHandler', () => {
    it('returns mfa enabled from SettingModel', async () => {
      SettingModel.getValue.mockResolvedValue('true');
      await settingsController.getGlobalMFASettingsHandler(req, res);
      expect(res._json).toEqual({ mfaEnabled: 'true' });
    });

    it('defaults to true when not set', async () => {
      SettingModel.getValue.mockResolvedValue(null);
      await settingsController.getGlobalMFASettingsHandler(req, res);
      expect(res._json).toEqual({ mfaEnabled: true });
    });
  });

  describe('updateGlobalMFASettingsHandler', () => {
    it('updates MFA setting', async () => {
      req.body = { mfaEnabled: false };
      SettingModel.setValue.mockResolvedValue({ key: 'mfa_enabled', value: 'false' });
      await settingsController.updateGlobalMFASettingsHandler(req, res);
      expect(res._json.mfaEnabled).toBe(false);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '5',
          action: 'Updated Global MFA Setting',
          resourceType: 'setting',
          resourceId: 'mfa_enabled',
          details: 'Global MFA disabled',
          newValues: { mfa_enabled: false },
        })
      );
    });

    it('returns 400 when mfaEnabled not boolean', async () => {
      req.body = { mfaEnabled: 'yes' };
      await settingsController.updateGlobalMFASettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('getSecuritySettingsHandler', () => {
    it('returns security settings with defaults', async () => {
      SettingModel.getValue.mockResolvedValue(null);
      await settingsController.getSecuritySettingsHandler(req, res);
      expect(res._json.settings.passwordMinLength).toBe(8);
      expect(res._json.settings.maxLoginAttempts).toBe(5);
    });

    it('returns configured values', async () => {
      SettingModel.getValue.mockImplementation((key: string) => {
        const vals: Record<string, string> = { password_min_length: '12', max_login_attempts: '3' };
        return Promise.resolve(vals[key] ?? null);
      });
      await settingsController.getSecuritySettingsHandler(req, res);
      expect(res._json.settings.passwordMinLength).toBe('12');
      expect(res._json.settings.maxLoginAttempts).toBe('3');
    });
  });

  describe('updateSecuritySettingsHandler', () => {
    it('updates each provided setting', async () => {
      req.body = { passwordMinLength: 10, maxLoginAttempts: 3 };
      SettingModel.setValue.mockResolvedValue({});
      await settingsController.updateSecuritySettingsHandler(req, res);
      expect(SettingModel.setValue).toHaveBeenCalledTimes(2);
      expect(res._json.message).toContain('updated');
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '5',
          action: 'Updated Security Settings',
          resourceType: 'setting',
          resourceId: 'security_settings',
          details: 'Updated security setting(s): password_min_length, max_login_attempts',
          newValues: { password_min_length: 10, max_login_attempts: 3 },
        })
      );
    });

    it('validates passwordMinLength', async () => {
      req.body = { passwordMinLength: 3 };
      await settingsController.updateSecuritySettingsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('validates maxLoginAttempts', async () => {
      req.body = { maxLoginAttempts: -1 };
      await settingsController.updateSecuritySettingsHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('validates otpExpirySeconds', async () => {
      req.body = { otpExpirySeconds: 30 };
      await settingsController.updateSecuritySettingsHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { AuditRetentionService } from '../services/auditRetention.service.js';
import { createSuccessResponse, createErrorResponse } from '../utils/responseWrapper.js';
import { pool } from '../db.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import { createAuditLog } from '../utils/audit.js';

export async function getRetentionSettingsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'User ID required');
    }

    const company = await getScopedActiveCompany(pool, userId);
    if (!company) {
      return createErrorResponse(res, 'Company ID required');
    }

    const setting = await AuditRetentionService.getByCompanyId(company.id);
    return createSuccessResponse(res, setting);
  } catch (error: any) {
    console.error('Failed to get retention settings:', error);
    return createErrorResponse(res, 'Failed to get retention settings');
  }
}

export async function upsertRetentionSettingsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'User ID required');
    }

    const company = await getScopedActiveCompany(pool, userId);
    if (!company) {
      return createErrorResponse(res, 'Company ID required');
    }

    const { retention_months, is_active } = req.body;

    if (typeof retention_months !== 'number' || retention_months < 6 || retention_months > 120) {
      return createErrorResponse(res, 'Retention months must be between 6 and 120');
    }

    const setting = await AuditRetentionService.upsertRetentionSetting(
      company.id,
      { company_id: company.id, retention_months, is_active },
      userId
    );

    await createAuditLog({
      userId,
      action: 'update_retention_settings',
      resourceType: 'audit_retention_settings',
      resourceId: String(company.id),
      details: `Updated retention settings to ${retention_months} months, active: ${is_active}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, setting);
  } catch (error: any) {
    console.error('Failed to upsert retention settings:', error);
    return createErrorResponse(res, 'Failed to save retention settings');
  }
}

export async function getSystemDefaultsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'User ID required');
    }

    const isSuperAdmin = await checkSuperAdmin(userId);
    if (!isSuperAdmin) {
      return createErrorResponse(res, 'Forbidden', [], 403);
    }

    const defaults = await AuditRetentionService.getSystemDefaults();
    return createSuccessResponse(res, defaults);
  } catch (error: any) {
    console.error('Failed to get system defaults:', error);
    return createErrorResponse(res, 'Failed to get system defaults');
  }
}

export async function updateSystemDefaultsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'User ID required');
    }

    const isSuperAdmin = await checkSuperAdmin(userId);
    if (!isSuperAdmin) {
      return createErrorResponse(res, 'Forbidden', [], 403);
    }

    const { default_months, minimum_months } = req.body;

    if (typeof default_months !== 'number' || default_months < 6 || default_months > 120) {
      return createErrorResponse(res, 'Default months must be between 6 and 120');
    }

    if (typeof minimum_months !== 'number' || minimum_months < 6 || minimum_months > 120) {
      return createErrorResponse(res, 'Minimum months must be between 6 and 120');
    }

    if (minimum_months > default_months) {
      return createErrorResponse(res, 'Minimum months cannot exceed default months');
    }

    await AuditRetentionService.updateSystemDefaults(default_months, minimum_months, userId);

    await createAuditLog({
      userId,
      action: 'update_system_defaults',
      resourceType: 'audit_retention_defaults',
      details: `Updated system defaults to ${default_months} months default, ${minimum_months} months minimum`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { success: true });
  } catch (error: any) {
    console.error('Failed to update system defaults:', error);
    return createErrorResponse(res, 'Failed to update system defaults');
  }
}

export async function triggerArchiveHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'User ID required');
    }

    const company = await getScopedActiveCompany(pool, userId);
    if (!company) {
      return createErrorResponse(res, 'Company ID required');
    }

    const result = await AuditRetentionService.archiveOldLogs(company.id, userId);

    await createAuditLog({
      userId,
      action: 'trigger_audit_archive',
      resourceType: 'audit_log',
      resourceId: String(company.id),
      details: `Triggered audit log archive for company: ${company.id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, result);
  } catch (error: any) {
    console.error('Failed to trigger archive:', error);
    return createErrorResponse(res, 'Failed to trigger archive');
  }
}

async function checkSuperAdmin(userId: string): Promise<boolean> {
  const [rows] = await pool.execute<any[]>(
    `SELECT r.name as role_name 
     FROM users u 
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL 
     WHERE u.userID = ?`,
    [userId]
  );
  return rows[0]?.role_name === 'Global Admin';
}

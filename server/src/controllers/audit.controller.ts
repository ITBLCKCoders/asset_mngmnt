import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import AuditService from '../services/audit.service.js';
import type { AuditLogFilters } from '../models/audit.model.js';

function parseCsvOrArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map(value => String(value).trim())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }
  return [];
}

function parseJsonSafely(value: unknown): any {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function resolveAuditAccessContext(req: AuthRequest): Promise<{
  isAuditAdmin: boolean;
  isSuperAdmin: boolean;
  companyId: string | null;
}> {
  const userId = req.user?.userID;
  if (!userId) {
    return { isAuditAdmin: false, isSuperAdmin: false, companyId: null };
  }

  const [rows] = (await pool.query(
    `SELECT
      u.company_id,
      r.name AS role_name
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     WHERE u.userID = ?
     LIMIT 1`,
    [userId]
  )) as any[];

  const userRow = rows[0] ?? null;
  const normalizedRole = String(userRow?.role_name ?? '')
    .trim()
    .toLowerCase();
  const isSuperAdmin = normalizedRole === 'super admin';

  // Check for Audit Trail module permission
  const [permRows] = (await pool.query(
    'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
    [userId]
  )) as any[];
  const hasAuditTrailView = permRows.some(
    (r: any) =>
      r.module_name === 'Audit Trail' &&
      r.permission_type === 'view' &&
      r.granted === 1
  );

  const isAuditAdmin =
    isSuperAdmin ||
    normalizedRole === 'admin' ||
    normalizedRole === 'auditor' ||
    hasAuditTrailView;

  return {
    isAuditAdmin,
    isSuperAdmin,
    companyId: userRow?.company_id ?? null,
  };
}

export async function getAuditLogsHandler(req: AuthRequest, res: Response) {
  try {
    const access = await resolveAuditAccessContext(req);
    if (!access.isAuditAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      page = '1',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit = '20',
      action,
      resourceType,
      userId,
      status,
      severity,
      dateFrom,
      dateTo,
      companyId,
      companyFilter,
      departmentFilter,
      excludeActions,
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(parseInt(String(limit), 10) || 20, 1000));
    const excludeList = parseCsvOrArray(excludeActions);
    const actionList = parseCsvOrArray(action);
    const resourceTypeList = parseCsvOrArray(resourceType);
    const userIdList = parseCsvOrArray(userId);

    const requestedCompanyId =
      access.isSuperAdmin && typeof companyId === 'string' && companyId.trim()
        ? companyId.trim()
        : access.companyId;

    // Use companyFilter if provided (for filtering by specific company)
    const effectiveCompanyId =
      typeof companyFilter === 'string' && companyFilter.trim() && companyFilter !== 'all'
        ? companyFilter.trim()
        : requestedCompanyId;

    const filters: AuditLogFilters = {
      page: pageNum,
      limit: limitNum,
      search: String(search ?? ''),
      sortBy: String(sortBy ?? 'created_at'),
      sortOrder: String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      action: actionList,
      resourceType: resourceTypeList,
      userId: userIdList,
      companyId: effectiveCompanyId,
      excludeActions: excludeList,
    };

    if (status === 'success' || status === 'failure') {
      filters.status = status;
    }
    if (severity === 'info' || severity === 'warning' || severity === 'critical') {
      filters.severity = severity;
    }
    if (typeof departmentFilter === 'string' && departmentFilter.trim() && departmentFilter !== 'all') {
      (filters as any).departmentId = departmentFilter.trim();
    }
    if (typeof dateFrom === 'string' && dateFrom) {
      filters.dateFrom = dateFrom;
    }
    if (typeof dateTo === 'string' && dateTo) {
      filters.dateTo = dateTo;
    }

    const result = await AuditService.getAll(filters);

    const auditLogs = result.logs.map((row: any) => ({
      id: row.auditID,
      timestamp: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name || 'System',
        email: row.user_email || null,
      },
      action: row.action,
      resource: row.resource_name || row.resource_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      oldValues: parseJsonSafely(row.old_values),
      newValues: parseJsonSafely(row.new_values),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      companyId: row.company_id,
      status: row.status ?? 'success',
      severity: row.severity ?? 'info',
      requestId: row.request_id ?? null,
      sessionId: row.session_id ?? null,
      httpMethod: row.http_method ?? null,
      httpEndpoint: row.http_endpoint ?? null,
      prevHash: row.prev_hash ?? null,
      rowHash: row.row_hash ?? null,
    }));

    return res.json({
      auditLogs,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    logger.error('Get audit logs failed:', error);
    return res.status(200).json({
      auditLogs: [],
      message:
        'Audit logs not available. Please ensure database migration is complete.',
    });
  }
}

export async function getAssetAuditLogsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId } = req.params;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    logger.debug('Getting audit logs for asset', { assetId });

    const result = await AuditService.getByAssetId(assetId);

    logger.debug('Audit service result', {
      assetId,
      logCount: result.logs.length,
      logs: result.logs.map((log: any) => ({
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
      })),
    });

    const auditLogs = result.logs.map((row: any) => ({
      id: row.auditID,
      timestamp: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name || 'System',
        email: row.user_email || null,
      },
      action: row.action,
      resource: row.resource_name || row.resource_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      oldValues: row.old_values ? JSON.parse(row.old_values) : null,
      newValues: row.new_values ? JSON.parse(row.new_values) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      companyId: row.company_id,
    }));

    logger.debug('Final audit logs', {
      logs: auditLogs.map(log => ({
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
      })),
    });

    return res.json({ auditLogs });
  } catch (error: any) {
    logger.error('Get asset audit logs failed:', error);
    return res.status(200).json({
      auditLogs: [],
      message:
        'Audit logs not available. Please ensure database migration is complete.',
    });
  }
}

export async function getBuilderAuditLogsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { builderId } = req.params;

    if (!builderId) {
      return res.status(400).json({ error: 'Builder ID is required' });
    }

    const result = await AuditService.getByBuilderId(builderId);

    const auditLogs = result.logs.map((row: any) => ({
      id: row.auditID,
      timestamp: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name || 'System',
        email: row.user_email || null,
      },
      action: row.action,
      resource: row.resource_name || row.resource_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      oldValues: row.old_values ? JSON.parse(row.old_values) : null,
      newValues: row.new_values ? JSON.parse(row.new_values) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      companyId: row.company_id,
    }));

    return res.json({ auditLogs });
  } catch (error: any) {
    logger.error('Get builder audit logs failed:', error);
    return res.status(200).json({
      auditLogs: [],
      message:
        'Audit logs not available. Please ensure database migration is complete.',
    });
  }
}

export async function verifyAuditChainHandler(req: AuthRequest, res: Response) {
  try {
    const access = await resolveAuditAccessContext(req);
    if (!access.isAuditAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const queryCompanyId =
      access.isSuperAdmin && typeof req.query.companyId === 'string'
        ? req.query.companyId
        : access.companyId;

    const result = await AuditService.verifyChain(queryCompanyId ?? null);
    return res.json({
      success: result.valid,
      ...result,
      companyId: queryCompanyId ?? null,
    });
  } catch (error: any) {
    logger.error('Verify audit chain failed:', error);
    return res.status(500).json({ error: 'Failed to verify audit chain' });
  }
}

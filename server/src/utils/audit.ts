import type { Request } from 'express';
import logger from '../logger.js';
import AuditService from '../services/audit.service.js';
import { SettingModel } from '../models/setting.model.js';

export interface AuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  companyId?: string;
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  requestId?: string;
  sessionId?: string;
  httpMethod?: string;
  httpEndpoint?: string;
}

export interface AuditContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string | undefined;
  sessionId?: string | undefined;
  httpMethod?: string | undefined;
  httpEndpoint?: string | undefined;
}

export function buildAuditContext(req: Request): AuditContext {
  const ctx: AuditContext = {};
  // Check X-Forwarded-For header first for real client IP when behind proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) ctx.ipAddress = ip;
  } else if (req.ip) {
    ctx.ipAddress = req.ip;
  }
  const userAgent = req.get('User-Agent');
  if (userAgent) ctx.userAgent = userAgent;
  const requestId = req.headers['x-request-id'];
  if (typeof requestId === 'string' && requestId.trim()) {
    ctx.requestId = requestId;
  }
  if (req.method) ctx.httpMethod = req.method;
  if (req.originalUrl || req.url) ctx.httpEndpoint = req.originalUrl || req.url;
  return ctx;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // Check if audit logging is enabled
    const auditLoggingEnabled = await SettingModel.getValue('audit_logging_enabled');
    if (auditLoggingEnabled === false) {
      // Audit logging is disabled, skip creating the log
      return;
    }

    await AuditService.create({
      user_id: data.userId ?? null,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId ?? null,
      resource_name: data.resourceName ?? null,
      details: data.details ?? null,
      old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
      new_values: data.newValues ? JSON.stringify(data.newValues) : null,
      ip_address: data.ipAddress ?? null,
      user_agent: data.userAgent ?? null,
      company_id: data.companyId ?? null,
      status: data.status ?? 'success',
      severity: data.severity ?? 'info',
      request_id: data.requestId ?? null,
      session_id: data.sessionId ?? null,
      http_method: data.httpMethod ?? null,
      http_endpoint: data.httpEndpoint ?? null,
    });
  } catch (error: any) {
    logger.error('Failed to create audit log', {
      error,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      userId: data.userId,
      companyId: data.companyId,
    });
    // Don't throw error to avoid breaking the main operation
  }
}

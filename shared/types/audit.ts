export type AuditStatus = 'success' | 'failure';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export const auditActions = [
  'asset.created',
  'asset.updated',
  'asset.deleted',
  'asset.assigned',
  'asset.returned',
  'asset.transferred',
  'asset.borrowed',
  'auth.login.success',
  'auth.login.failure',
  'auth.logout',
  'settings.updated',
  'settings.audit_retention.updated',
  'user.created',
  'user.updated',
  'user.deleted',
  'role.updated',
  'permission.updated',
  'audit.exported',
] as const;

export type AuditAction = (typeof auditActions)[number];

export const auditResourceTypes = [
  'asset',
  'asset_assignment',
  'asset_builder',
  'asset_return',
  'asset_transfer',
  'asset_borrow_request',
  'user',
  'role',
  'permission',
  'setting',
  'audit_log',
  'audit_retention_settings',
  'auth_session',
  'company',
  'department',
  'location',
  'brand',
  'category',
  'type',
  'supplier',
  'position',
] as const;

export type AuditResourceType = (typeof auditResourceTypes)[number];

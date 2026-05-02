// Shared audit-log + settings DTOs.

export interface AuditLogResponseDto {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  request_id?: string | null;
  session_id?: string | null;
  http_method?: string | null;
  http_endpoint?: string | null;
  prev_hash?: string | null;
  row_hash?: string | null;
  created_at: string;
}

export interface AuditLogListResponseDto {
  auditLogs: AuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Settings DTOs (kept here because the audit log surfaces the same
// admin-control concerns and they ship together in admin pages).
export interface SettingsDto {
  key: string;
  value: any;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  isPublic: boolean;
}

export interface SettingsListResponseDto {
  settings: SettingsDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

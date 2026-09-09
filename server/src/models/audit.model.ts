import crypto from 'crypto';
import { pool } from '../db.js';
import type { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';

export interface AuditLog {
  auditID: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  details: string | null;
  old_values?: string | null;
  new_values?: string | null;
  ip_address: string | null;
  user_agent?: string | null;
  company_id?: string | null;
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  request_id?: string | null;
  session_id?: string | null;
  http_method?: string | null;
  http_endpoint?: string | null;
  prev_hash?: string | null;
  row_hash?: string | null;
  created_at: string;
  deleted_at?: string;
}

export interface AuditLogWithUser extends AuditLog {
  user_name?: string;
  user_email?: string;
}

export interface AuditLogFilters {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  action?: string[];
  resourceType?: string[];
  userId?: string[];
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  dateFrom?: string;
  dateTo?: string;
  companyId?: string | null;
  departmentId?: string;
  excludeActions?: string[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function computeAuditHash(prevHash: string | null, payload: Record<string, unknown>) {
  return crypto
    .createHash('sha256')
    .update(`${prevHash ?? ''}|${stableStringify(payload)}`)
    .digest('hex');
}

class AuditModel {
  /**
   * Create a new audit log entry
   */
  static async create(
    logData: Omit<AuditLog, 'auditID' | 'created_at' | 'deleted_at'>
  ): Promise<string> {
    const [prevRows] = (await pool.query(
      `
      SELECT row_hash
      FROM audit_logs
      WHERE ((company_id = ? ) OR (company_id IS NULL AND ? IS NULL))
      ORDER BY created_at DESC, auditID DESC
      LIMIT 1
    `,
      [logData.company_id ?? null, logData.company_id ?? null]
    )) as any[];

    const prevHash: string | null = prevRows[0]?.row_hash ?? null;
    const hashPayload = {
      user_id: logData.user_id,
      action: logData.action,
      resource_type: logData.resource_type,
      resource_id: logData.resource_id,
      resource_name: logData.resource_name,
      details: logData.details,
      old_values: logData.old_values ?? null,
      new_values: logData.new_values ?? null,
      ip_address: logData.ip_address,
      user_agent: logData.user_agent ?? null,
      company_id: logData.company_id ?? null,
      status: logData.status ?? 'success',
      severity: logData.severity ?? 'info',
      request_id: logData.request_id ?? null,
      session_id: logData.session_id ?? null,
      http_method: logData.http_method ?? null,
      http_endpoint: logData.http_endpoint ?? null,
    };
    const rowHash = computeAuditHash(prevHash, hashPayload);

    const [result] = await pool.query(
      `
      INSERT INTO audit_logs
        (user_id, action, resource_type, resource_id, resource_name, details, old_values, new_values, ip_address, user_agent, company_id, status, severity, request_id, session_id, http_method, http_endpoint, prev_hash, row_hash, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        logData.user_id,
        logData.action,
        logData.resource_type,
        logData.resource_id,
        logData.resource_name,
        logData.details,
        logData.old_values,
        logData.new_values,
        logData.ip_address,
        logData.user_agent,
        logData.company_id,
        logData.status ?? 'success',
        logData.severity ?? 'info',
        logData.request_id ?? null,
        logData.session_id ?? null,
        logData.http_method ?? null,
        logData.http_endpoint ?? null,
        prevHash,
        rowHash,
      ]
    );

    return (result as any).insertId || (result as any).auditID;
  }

  /**
   * Get all audit logs with server-side pagination and filters.
   */
  static async getAll(
    filters: AuditLogFilters
  ): Promise<{
    logs: AuditLogWithUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page,
      limit,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      action = [],
      resourceType = [],
      userId = [],
      status,
      severity,
      dateFrom,
      dateTo,
      companyId,
      departmentId,
      excludeActions = [],
    } = filters;
    const validSortColumns = [
      'auditID',
      'created_at',
      'action',
      'resource_type',
      'resource_name',
      'user_name',
      'status',
      'severity',
    ];
    const actualSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : 'created_at';
    const actualSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    let whereClause = 'al.deleted_at IS NULL';
    const queryParams: any[] = [];

    if (companyId !== undefined && companyId !== null) {
      whereClause += ' AND al.company_id = ?';
      queryParams.push(companyId);
    }

    if (departmentId) {
      whereClause += ' AND JSON_EXTRACT(al.new_values, \'$.department_id\') = ?';
      queryParams.push(departmentId);
    }

    if (search) {
      whereClause += ` AND (
        al.action LIKE ? OR 
        al.resource_type LIKE ? OR 
        al.resource_name LIKE ? OR 
        al.details LIKE ? OR 
        u.first_name LIKE ? OR 
        u.last_name LIKE ? OR 
        u.email LIKE ? OR
        CONCAT(u.first_name, ' ', u.last_name) LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    if (excludeActions.length > 0) {
      whereClause += ` AND al.action NOT IN (${excludeActions.map(() => '?').join(',')})`;
      queryParams.push(...excludeActions);
    }

    if (action.length > 0) {
      whereClause += ` AND al.action IN (${action.map(() => '?').join(',')})`;
      queryParams.push(...action);
    }

    if (resourceType.length > 0) {
      whereClause += ` AND al.resource_type IN (${resourceType.map(() => '?').join(',')})`;
      queryParams.push(...resourceType);
    }

    if (userId.length > 0) {
      whereClause += ` AND al.user_id IN (${userId.map(() => '?').join(',')})`;
      queryParams.push(...userId);
    }

    if (status) {
      whereClause += ' AND al.status = ?';
      queryParams.push(status);
    }

    if (severity) {
      whereClause += ' AND al.severity = ?';
      queryParams.push(severity);
    }

    if (dateFrom) {
      whereClause += ' AND al.created_at >= ?';
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND al.created_at <= ?';
      queryParams.push(dateTo);
    }

    const boundedLimit = Math.max(1, Math.min(limit || 20, 1000));
    const offset = Math.max(0, (Math.max(1, page || 1) - 1) * boundedLimit);

    const [countRows] = (await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs al LEFT JOIN users u ON al.user_id = u.userID WHERE ${whereClause}`,
      queryParams
    )) as any[];
    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / boundedLimit));

    const logsQuery = `
      SELECT
        al.auditID,
        al.created_at,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.resource_name,
        al.details,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.company_id,
        al.status,
        al.severity,
        al.request_id,
        al.session_id,
        al.http_method,
        al.http_endpoint,
        al.prev_hash,
        al.row_hash,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.userID
      WHERE ${whereClause}
      ORDER BY ${actualSortBy === 'user_name' ? 'user_name' : `al.${actualSortBy}`} ${actualSortOrder}
      LIMIT ? OFFSET ?
    `;

    const [logRows] = (await pool.query(logsQuery, [
      ...queryParams,
      boundedLimit,
      offset,
    ])) as any[];

    return {
      logs: logRows as AuditLogWithUser[],
      total,
      page: Math.max(1, page || 1),
      limit: boundedLimit,
      totalPages,
    };
  }

  /**
   * Get audit logs for a specific asset (no pagination).
   * Accepts either assetID (UUID) or asset_code - resolves to match logs stored by either.
   */
  static async getByAssetId(
    assetId: string
  ): Promise<{ logs: AuditLogWithUser[] }> {
    const [assetRows] = (await pool.query(
      `SELECT assetID, asset_code FROM assets WHERE (assetID = ? OR asset_code = ?) AND deleted_at IS NULL LIMIT 1`,
      [assetId, assetId]
    )) as any[];
    const resolvedAssetCode = assetRows[0]?.asset_code;
    const resolvedAssetId = assetRows[0]?.assetID;
    const assetCodesForResourceId = [
      assetId,
      ...(resolvedAssetCode && resolvedAssetCode !== assetId
        ? [resolvedAssetCode]
        : []),
    ].filter((v, i, a) => a.indexOf(v) === i);
    const uuidForAssignments = resolvedAssetId || assetId;

    const assetMatchPlaceholders = assetCodesForResourceId
      .map(() => '?')
      .join(', ');

    const [logRows] = await pool.query(
      `
      SELECT
        al.auditID,
        al.created_at,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.resource_name,
        al.details,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.company_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.userID
      WHERE (
        (al.resource_type = 'asset' AND al.resource_id IN (${assetMatchPlaceholders}))
        OR 
        (al.resource_type = 'asset_assignment' AND al.resource_id IN (
          SELECT assignmentID FROM asset_assignments WHERE asset_id = ? AND deleted_at IS NULL
        ))
      )
      AND al.deleted_at IS NULL
      ORDER BY al.created_at DESC
    `,
      [...assetCodesForResourceId, uuidForAssignments]
    );

    return { logs: logRows as AuditLogWithUser[] };
  }

  /**
   * Get audit logs for a specific asset builder (no pagination)
   */
  static async getByBuilderId(
    builderId: string
  ): Promise<{ logs: AuditLogWithUser[] }> {
    const [logRows] = await pool.query(
      `
      SELECT
        al.auditID,
        al.created_at,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.resource_name,
        al.details,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.company_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.userID
      WHERE al.resource_type = 'asset_builder' AND al.resource_id = ? AND al.deleted_at IS NULL
      ORDER BY al.created_at DESC
    `,
      [builderId]
    );

    return { logs: logRows as AuditLogWithUser[] };
  }

  /**
   * Get audit logs for a specific accountability form (no pagination).
   * Used by the per-form timeline; returns an empty list when audit logging
   * is disabled so callers can fall back to form timestamps.
   */
  static async getByAccountabilityFormId(
    formId: string
  ): Promise<{ logs: AuditLogWithUser[] }> {
    const [logRows] = await pool.query(
      `
      SELECT
        al.auditID,
        al.created_at,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.resource_name,
        al.details,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.company_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.userID
      WHERE al.resource_type = 'accountability_form' AND al.resource_id = ? AND al.deleted_at IS NULL
      ORDER BY al.created_at DESC
    `,
      [formId]
    );

    return { logs: logRows as AuditLogWithUser[] };
  }

  /**
   * Get audit log by ID
   */
  static async getById(id: number): Promise<AuditLog | null> {
    const [result] = await pool.query(
      `
      SELECT * FROM audit_logs WHERE auditID = ?
    `,
      [id]
    );

    return (result as any[])[0] || null;
  }

  static async getChain(companyId?: string | null): Promise<AuditLog[]> {
    const [rows] = (await pool.query(
      `
      SELECT
        auditID,
        user_id,
        action,
        resource_type,
        resource_id,
        resource_name,
        details,
        old_values,
        new_values,
        ip_address,
        user_agent,
        company_id,
        status,
        severity,
        request_id,
        session_id,
        http_method,
        http_endpoint,
        prev_hash,
        row_hash,
        created_at,
        deleted_at
      FROM audit_logs
      WHERE deleted_at IS NULL
        AND ((company_id = ?) OR (company_id IS NULL AND ? IS NULL))
      ORDER BY created_at ASC, auditID ASC
    `,
      [companyId ?? null, companyId ?? null]
    )) as any[];

    return rows as AuditLog[];
  }

  static verifyLogHash(prevHash: string | null, row: AuditLog): boolean {
    const payload = {
      user_id: row.user_id,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      resource_name: row.resource_name,
      details: row.details,
      old_values: row.old_values ?? null,
      new_values: row.new_values ?? null,
      ip_address: row.ip_address,
      user_agent: row.user_agent ?? null,
      company_id: row.company_id ?? null,
      status: row.status ?? 'success',
      severity: row.severity ?? 'info',
      request_id: row.request_id ?? null,
      session_id: row.session_id ?? null,
      http_method: row.http_method ?? null,
      http_endpoint: row.http_endpoint ?? null,
    };
    const computed = computeAuditHash(prevHash, payload);
    return computed === row.row_hash;
  }

  static async getLogsOlderThan(companyId: string, cutoffDate: Date): Promise<AuditLog[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_logs WHERE company_id = ? AND created_at < ? ORDER BY created_at ASC',
      [companyId, cutoffDate.toISOString()]
    );
    return rows as AuditLog[];
  }

  static async archiveLog(auditId: string, archivedBy: string): Promise<void> {
    const [log] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_logs WHERE auditID = ?',
      [auditId]
    );

    if (!log[0]) return;

    const logData = log[0] as AuditLog;
    await pool.execute(
      `INSERT INTO audit_logs_archive 
       (auditID, user_id, action, resource_type, resource_id, resource_name, details, old_values, new_values, 
        ip_address, user_agent, company_id, status, severity, request_id, session_id, http_method, 
        http_endpoint, prev_hash, row_hash, created_at, archived_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logData.auditID,
        logData.user_id,
        logData.action,
        logData.resource_type,
        logData.resource_id,
        logData.resource_name,
        logData.details,
        logData.old_values,
        logData.new_values,
        logData.ip_address,
        logData.user_agent,
        logData.company_id,
        logData.status,
        logData.severity,
        logData.request_id,
        logData.session_id,
        logData.http_method,
        logData.http_endpoint,
        logData.prev_hash,
        logData.row_hash,
        logData.created_at,
        archivedBy,
      ]
    );

    await pool.execute('DELETE FROM audit_logs WHERE auditID = ?', [auditId]);
  }
}

export default AuditModel;

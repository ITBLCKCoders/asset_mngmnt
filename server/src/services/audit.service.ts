import AuditModel, {
  AuditLog,
  AuditLogFilters,
  AuditLogWithUser,
} from '../models/audit.model.js';
import logger from '../logger.js';

class AuditService {
  /**
   * Create a new audit log entry
   */
  static async create(
    logData: Omit<AuditLog, 'auditID' | 'created_at' | 'deleted_at'>
  ): Promise<string> {
    try {
      // Validate log data
      if (!logData.action || logData.action.trim() === '') {
        throw new Error('Action is required');
      }

      if (!logData.resource_type || logData.resource_type.trim() === '') {
        throw new Error('Resource type is required');
      }

      const logId = String(await AuditModel.create(logData));
      logger.info(
        `[AUDIT_SERVICE] Created audit log ${logId} for ${logData.resource_type} ${logData.resource_id}`
      );
      return logId;
    } catch (error) {
      logger.error('[AUDIT_SERVICE] Error creating audit log:', error);
      throw new Error('Failed to create audit log');
    }
  }

  /**
   * Get all audit logs with pagination and filtering.
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
    try {
      const result = await AuditModel.getAll(filters);
      logger.info(
        `[AUDIT_SERVICE] Retrieved ${result.logs.length} audit logs (page: ${result.page}, total: ${result.total})`
      );
      return result;
    } catch (error) {
      logger.error('[AUDIT_SERVICE] Error getting all audit logs:', error);
      throw new Error('Failed to get audit logs');
    }
  }

  /**
   * Get audit logs for a specific asset (no pagination)
   */
  static async getByAssetId(
    assetId: string
  ): Promise<{ logs: AuditLogWithUser[] }> {
    try {
      if (!assetId || assetId.trim() === '') {
        throw new Error('Invalid asset ID');
      }

      const result = await AuditModel.getByAssetId(assetId);
      logger.info(
        `[AUDIT_SERVICE] Retrieved ${result.logs.length} audit logs for asset ${assetId}`
      );
      return result;
    } catch (error) {
      logger.error(
        `[AUDIT_SERVICE] Error getting audit logs for asset ${assetId}:`,
        error
      );
      throw new Error('Failed to get asset audit logs');
    }
  }

  /**
   * Get audit logs for a specific asset builder (no pagination)
   */
  static async getByBuilderId(
    builderId: string
  ): Promise<{ logs: AuditLogWithUser[] }> {
    try {
      if (!builderId || builderId.trim() === '') {
        throw new Error('Invalid builder ID');
      }

      const result = await AuditModel.getByBuilderId(builderId);
      logger.info(
        `[AUDIT_SERVICE] Retrieved ${result.logs.length} audit logs for builder ${builderId}`
      );
      return result;
    } catch (error) {
      logger.error(
        `[AUDIT_SERVICE] Error getting audit logs for builder ${builderId}:`,
        error
      );
      throw new Error('Failed to get builder audit logs');
    }
  }

  /**
   * Get audit log by ID
   */
  static async getById(id: number): Promise<AuditLog | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid audit log ID');
      }

      const log = await AuditModel.getById(id);
      logger.info(`[AUDIT_SERVICE] Retrieved audit log ${id}`);
      return log;
    } catch (error) {
      logger.error(`[AUDIT_SERVICE] Error getting audit log ${id}:`, error);
      throw new Error('Failed to get audit log');
    }
  }

  static async verifyChain(companyId?: string | null): Promise<{
    valid: boolean;
    checked: number;
    brokenAtAuditId: string | null;
    expectedPrevHash: string | null;
  }> {
    try {
      const rows = await AuditModel.getChain(companyId ?? null);
      let prevHash: string | null = null;
      for (const row of rows) {
        if ((row.prev_hash ?? null) !== prevHash) {
          return {
            valid: false,
            checked: rows.length,
            brokenAtAuditId: row.auditID,
            expectedPrevHash: prevHash,
          };
        }
        const validHash = AuditModel.verifyLogHash(prevHash, row);
        if (!validHash) {
          return {
            valid: false,
            checked: rows.length,
            brokenAtAuditId: row.auditID,
            expectedPrevHash: prevHash,
          };
        }
        prevHash = row.row_hash ?? null;
      }

      return {
        valid: true,
        checked: rows.length,
        brokenAtAuditId: null,
        expectedPrevHash: prevHash,
      };
    } catch (error) {
      logger.error('[AUDIT_SERVICE] Error verifying audit chain:', error);
      throw new Error('Failed to verify audit chain');
    }
  }
}

export default AuditService;

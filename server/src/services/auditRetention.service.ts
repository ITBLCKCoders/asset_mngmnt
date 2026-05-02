import { AuditRetentionModel, AuditRetentionSetting, AuditRetentionSettingInput } from '../models/auditRetention.model.js';
import AuditModel from '../models/audit.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class AuditRetentionService {
  static async getByCompanyId(companyId: string): Promise<AuditRetentionSetting | null> {
    return AuditRetentionModel.getByCompanyId(companyId);
  }

  static async getSystemDefaults(): Promise<{ default_months: number; minimum_months: number }> {
    return AuditRetentionModel.getSystemDefaults();
  }

  static async updateSystemDefaults(defaultMonths: number, minimumMonths: number, userId: string): Promise<void> {
    await AuditRetentionModel.updateSystemDefaults(defaultMonths, minimumMonths);

    await createAuditLog({
      userId,
      action: 'settings.audit_retention.updated',
      resourceType: 'setting',
      resourceName: 'Audit Retention Defaults',
      details: `Updated system defaults: ${defaultMonths} months default, ${minimumMonths} months minimum`,
      status: 'success',
      severity: 'info',
    });
  }

  static async upsertRetentionSetting(
    companyId: string,
    data: AuditRetentionSettingInput,
    userId: string
  ): Promise<AuditRetentionSetting> {
    const existing = await AuditRetentionModel.getByCompanyId(companyId);

    if (existing) {
      const updateData: Partial<AuditRetentionSettingInput> = {
        retention_months: data.retention_months,
        updated_by: userId,
      };
      if (data.is_active !== undefined) {
        updateData.is_active = data.is_active;
      }

      await AuditRetentionModel.update(companyId, updateData);

      await createAuditLog({
        userId,
        action: 'settings.audit_retention.updated',
        resourceType: 'audit_retention_settings',
        resourceId: existing.id,
        resourceName: `Company ${companyId} Retention Settings`,
        details: `Updated retention to ${data.retention_months} months`,
        companyId,
        status: 'success',
        severity: 'info',
      });

      return (await AuditRetentionModel.getByCompanyId(companyId))!;
    } else {
      const createData: AuditRetentionSettingInput = {
        company_id: companyId,
        retention_months: data.retention_months,
        created_by: userId,
        updated_by: userId,
      };
      if (data.is_active !== undefined) {
        createData.is_active = data.is_active;
      }

      const id = await AuditRetentionModel.create(createData);

      await createAuditLog({
        userId,
        action: 'settings.audit_retention.created',
        resourceType: 'audit_retention_settings',
        resourceId: id,
        resourceName: `Company ${companyId} Retention Settings`,
        details: `Created retention setting with ${data.retention_months} months`,
        companyId,
        status: 'success',
        severity: 'info',
      });

      return (await AuditRetentionModel.getByCompanyId(companyId))!;
    }
  }

  static async archiveOldLogs(companyId: string, userId: string): Promise<{ archivedCount: number }> {
    const setting = await AuditRetentionModel.getByCompanyId(companyId);
    
    if (!setting || !setting.is_active) {
      return { archivedCount: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - setting.retention_months);

    const logsToArchive = await AuditModel.getLogsOlderThan(companyId, cutoffDate);
    const archivedCount = logsToArchive.length;

    if (archivedCount === 0) {
      return { archivedCount: 0 };
    }

    for (const log of logsToArchive) {
      await AuditModel.archiveLog(log.auditID, userId);
    }

    await AuditRetentionModel.updateArchiveStats(companyId, archivedCount);

    await createAuditLog({
      userId,
      action: 'audit.logs_archived',
      resourceType: 'audit_logs',
      details: `Archived ${archivedCount} audit logs older than ${setting.retention_months} months`,
      companyId,
      status: 'success',
      severity: 'info',
    });

    return { archivedCount };
  }
}

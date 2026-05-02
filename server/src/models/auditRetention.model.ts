import { pool } from '../db.js';
import type { RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';

export interface AuditRetentionSetting {
  id: string;
  company_id: string;
  retention_months: number;
  is_active: boolean;
  last_archived_at: string | null;
  archived_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AuditRetentionSettingInput {
  company_id: string;
  retention_months: number;
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
}

export class AuditRetentionModel {
  static async getByCompanyId(companyId: string): Promise<AuditRetentionSetting | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM audit_retention_settings WHERE company_id = ?',
      [companyId]
    );
    return (rows[0] as AuditRetentionSetting) || null;
  }

  static async create(data: AuditRetentionSettingInput): Promise<string> {
    const id = randomUUID();
    await pool.execute(
      `INSERT INTO audit_retention_settings (id, company_id, retention_months, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.company_id, data.retention_months, data.is_active ?? true, data.created_by ?? null, data.updated_by ?? null]
    );
    return id;
  }

  static async update(companyId: string, data: Partial<AuditRetentionSettingInput>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.retention_months !== undefined) {
      fields.push('retention_months = ?');
      values.push(data.retention_months);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.updated_by !== undefined) {
      fields.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (fields.length === 0) return;

    values.push(companyId);
    await pool.execute(
      `UPDATE audit_retention_settings SET ${fields.join(', ')} WHERE company_id = ?`,
      values
    );
  }

  static async updateArchiveStats(companyId: string, archivedCount: number): Promise<void> {
    await pool.execute(
      `UPDATE audit_retention_settings 
       SET last_archived_at = CURRENT_TIMESTAMP, 
           archived_count = archived_count + ?
       WHERE company_id = ?`,
      [archivedCount, companyId]
    );
  }

  static async getSystemDefaults(): Promise<{ default_months: number; minimum_months: number }> {
    const [rows] = await pool.execute<any[]>(
      `SELECT \`key\`, \`value\` 
       FROM asset_mngmnt_settings 
       WHERE \`key\` IN ('audit_retention_default_months', 'audit_retention_minimum_months')`
    );

    const settings = {
      default_months: 36,
      minimum_months: 12,
    };

    rows.forEach(row => {
      if (row.key === 'audit_retention_default_months') {
        settings.default_months = parseInt(row.value, 10);
      } else if (row.key === 'audit_retention_minimum_months') {
        settings.minimum_months = parseInt(row.value, 10);
      }
    });

    return settings;
  }

  static async updateSystemDefaults(defaultMonths: number, minimumMonths: number): Promise<void> {
    await pool.execute(
      `INSERT INTO asset_mngmnt_settings (\`key\`, \`value\`, description)
       VALUES 
         ('audit_retention_default_months', ?, 'Default retention horizon in months for new companies'),
         ('audit_retention_minimum_months', ?, 'Minimum retention horizon in months (system-wide floor)')
       ON DUPLICATE KEY UPDATE 
         \`value\` = VALUES(\`value\`),
         description = VALUES(description)`,
      [defaultMonths.toString(), minimumMonths.toString()]
    );
  }
}

import type { Pool } from 'mysql2/promise';
import { getAssetScope } from '../utils/assetScope.js';

export type ReportsAuditHistoryRow = {
  id: string;
  auditId: string;
  assetId: string | null;
  /** Asset category — same scope axis as dashboard (category → department). */
  categoryId: string | null;
  assetCode: string | null;
  assetName: string | null;
  companyId: string | null;
  companyName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  action: string;
  details: string | null;
  status: string | null;
  performedBy: string | null;
  createdAt: string;
};

type ReportsHistoryResult = {
  maintenanceHistory: ReportsAuditHistoryRow[];
  repairHistory: ReportsAuditHistoryRow[];
};

export class ReportsService {
  static async getMaintenanceAndRepairHistory(
    pool: Pool,
    userId: string,
    requestedCompanyId?: string | null
  ): Promise<ReportsHistoryResult> {
    const scope = await getAssetScope(pool, userId);
    const companyId =
      scope.isSuperAdmin && requestedCompanyId
        ? requestedCompanyId
        : scope.companyId;

    if (!companyId) {
      return {
        maintenanceHistory: [],
        repairHistory: [],
      };
    }

    const baseQuery = `
      SELECT
        al.auditID,
        al.resource_id,
        al.action,
        al.details,
        al.created_at,
        a.assetID,
        a.category_id AS category_id,
        a.asset_code,
        a.name AS asset_name,
        c.companyID AS company_id,
        c.name AS company_name,
        d.departmentID AS department_id,
        d.name AS department_name,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name
      FROM audit_logs al
      LEFT JOIN assets a
        ON al.resource_type = 'asset'
       AND a.assetID = al.resource_id
       AND a.deleted_at IS NULL
      LEFT JOIN companies c
        ON a.company_id = c.companyID
       AND c.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_departments d
        ON a.department_id = d.departmentID
       AND d.deleted_at IS NULL
      LEFT JOIN users u
        ON al.user_id = u.userID
      WHERE al.deleted_at IS NULL
        AND al.resource_type = 'asset'
        AND a.company_id = ?
        AND (
          LOWER(al.action) LIKE ?
          OR LOWER(COALESCE(al.details, '')) LIKE ?
        )
      ORDER BY al.created_at DESC
    `;

    const toRows = (rows: any[], status: string): ReportsAuditHistoryRow[] =>
      rows.map(row => ({
        id: `${status}-${row.auditID}`,
        auditId: String(row.auditID),
        assetId: row.assetID ? String(row.assetID) : null,
        categoryId: row.category_id != null ? String(row.category_id) : null,
        assetCode: row.asset_code ?? null,
        assetName: row.asset_name ?? null,
        companyId: row.company_id ? String(row.company_id) : null,
        companyName: row.company_name ?? null,
        departmentId: row.department_id ? String(row.department_id) : null,
        departmentName: row.department_name ?? null,
        action: row.action ?? '',
        details: row.details ?? null,
        status,
        performedBy:
          row.actor_first_name || row.actor_last_name
            ? `${row.actor_first_name ?? ''} ${row.actor_last_name ?? ''}`.trim()
            : null,
        createdAt: row.created_at,
      }));

    const [maintenanceRows] = (await pool.execute(baseQuery, [
      companyId,
      '%maintenance%',
      '%maintenance%',
    ])) as any[];

    const [repairRows] = (await pool.execute(baseQuery, [
      companyId,
      '%repair%',
      '%repair%',
    ])) as any[];

    return {
      maintenanceHistory: toRows(maintenanceRows as any[], 'Maintenance'),
      repairHistory: toRows(repairRows as any[], 'Repair'),
    };
  }
}

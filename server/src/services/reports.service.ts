import type { Pool } from 'mysql2/promise';
import { getAssetScope } from '../utils/assetScope.js';
import logger from '../logger.js';

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

export type FinanceAssetRow = {
  assetID: string;
  asset_code: string;
  name: string;
  category_name: string | null;
  type_name: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  purchase_date: string | null;
  asset_value: number | null;
  salvage_value: number;
  depreciation_method: string | null;
  useful_life_years: number | null;
  annual_depreciation: number | null;
  depreciation_start_date: string | null;
  company_name: string | null;
  department_name: string | null;
  location_name: string | null;
  room_name: string | null;
  condition: string;
  status: string;
  is_old_unit: number;
  created_at: string;
};

export type FinanceDepreciationRow = FinanceAssetRow & {
  accumulated_depreciation: number;
  net_book_value: number;
  years_depreciated: number;
  remaining_useful_life: number | null;
};

type FinanceReportsResult = {
  fixedAssetRegister: FinanceAssetRow[];
  depreciationSchedule: FinanceDepreciationRow[];
  assetValuationSummary: {
    totalAssetValue: number;
    totalAccumulatedDepreciation: number;
    totalNetBookValue: number;
    byCategory: Array<{
      category: string;
      totalAssetValue: number;
      totalAccumulatedDepreciation: number;
      totalNetBookValue: number;
      assetCount: number;
    }>;
    byDepartment: Array<{
      department: string;
      totalAssetValue: number;
      totalAccumulatedDepreciation: number;
      totalNetBookValue: number;
      assetCount: number;
    }>;
  };
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

  static async getFinanceReports(
    pool: Pool,
    userId: string,
    requestedCompanyId?: string | null
  ): Promise<FinanceReportsResult> {
    const scope = await getAssetScope(pool, userId);
    const companyId =
      scope.isSuperAdmin && requestedCompanyId
        ? requestedCompanyId
        : scope.companyId;

    if (!companyId) {
      return {
        fixedAssetRegister: [],
        depreciationSchedule: [],
        assetValuationSummary: {
          totalAssetValue: 0,
          totalAccumulatedDepreciation: 0,
          totalNetBookValue: 0,
          byCategory: [],
          byDepartment: [],
        },
      };
    }

    const baseQuery = `
      SELECT
        a.assetID,
        a.asset_code,
        a.name,
        ac.name AS category_name,
        at.name AS type_name,
        a.brand,
        a.model,
        a.serial,
        a.purchase_date,
        a.asset_value,
        a.salvage_value,
        a.depreciation_method,
        a.useful_life_years,
        a.annual_depreciation,
        a.depreciation_start_date,
        c.name AS company_name,
        d.name AS department_name,
        l.name AS location_name,
        lr.room_name,
        a.condition,
        a.status,
        a.is_old_unit,
        a.created_at
      FROM assets a
      LEFT JOIN asset_categories ac
        ON a.category_id = ac.categoryID
       AND ac.deleted_at IS NULL
      LEFT JOIN asset_types at
        ON a.type_id = at.typeID
       AND at.deleted_at IS NULL
      LEFT JOIN companies c
        ON a.company_id = c.companyID
       AND c.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_departments d
        ON a.department_id = d.departmentID
       AND d.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_locations l
        ON a.location_id = l.locationID
       AND l.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_location_rooms lr
        ON a.location_room_id = lr.roomID
       AND lr.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
        AND a.company_id = ?
      ORDER BY a.asset_code
    `;

    const [assetRows] = (await pool.execute(baseQuery, [companyId])) as any[];

    const assets = assetRows as FinanceAssetRow[];

    logger.info(`[finance-reports] Found ${assets.length} assets for company ${companyId}`);

    // Calculate depreciation for each asset
    const depreciationSchedule: FinanceDepreciationRow[] = assets.map(asset => {
      const accumulatedDepreciation = this.calculateAccumulatedDepreciation(asset);
      const netBookValue = (asset.asset_value || 0) - accumulatedDepreciation;
      const yearsDepreciated = this.calculateYearsDepreciated(asset);
      const remainingUsefulLife = asset.useful_life_years
        ? Math.max(0, asset.useful_life_years - yearsDepreciated)
        : null;

      return {
        ...asset,
        accumulated_depreciation: accumulatedDepreciation,
        net_book_value: netBookValue,
        years_depreciated: yearsDepreciated,
        remaining_useful_life: remainingUsefulLife,
      };
    });

    // Calculate valuation summary
    const totalAssetValue = assets.reduce((sum, a) => sum + (parseFloat(String(a.asset_value)) || 0), 0);
    const totalAccumulatedDepreciation = depreciationSchedule.reduce(
      (sum, a) => sum + a.accumulated_depreciation,
      0
    );
    const totalNetBookValue = totalAssetValue - totalAccumulatedDepreciation;

    // Group by category
    const byCategoryMap = new Map<string, any>();
    assets.forEach(asset => {
      const category = asset.category_name || 'Uncategorized';
      if (!byCategoryMap.has(category)) {
        byCategoryMap.set(category, {
          category,
          totalAssetValue: 0,
          totalAccumulatedDepreciation: 0,
          totalNetBookValue: 0,
          assetCount: 0,
        });
      }
      const group = byCategoryMap.get(category);
      group.totalAssetValue += parseFloat(String(asset.asset_value)) || 0;
      group.assetCount += 1;
    });

    // Add depreciation to category groups
    depreciationSchedule.forEach(asset => {
      const category = asset.category_name || 'Uncategorized';
      const group = byCategoryMap.get(category);
      if (group) {
        group.totalAccumulatedDepreciation += asset.accumulated_depreciation;
        group.totalNetBookValue += asset.net_book_value;
      }
    });

    // Group by department
    const byDepartmentMap = new Map<string, any>();
    assets.forEach(asset => {
      const department = asset.department_name || 'Unassigned';
      if (!byDepartmentMap.has(department)) {
        byDepartmentMap.set(department, {
          department,
          totalAssetValue: 0,
          totalAccumulatedDepreciation: 0,
          totalNetBookValue: 0,
          assetCount: 0,
        });
      }
      const group = byDepartmentMap.get(department);
      group.totalAssetValue += parseFloat(String(asset.asset_value)) || 0;
      group.assetCount += 1;
    });

    // Add depreciation to department groups
    depreciationSchedule.forEach(asset => {
      const department = asset.department_name || 'Unassigned';
      const group = byDepartmentMap.get(department);
      if (group) {
        group.totalAccumulatedDepreciation += asset.accumulated_depreciation;
        group.totalNetBookValue += asset.net_book_value;
      }
    });

    return {
      fixedAssetRegister: assets,
      depreciationSchedule,
      assetValuationSummary: {
        totalAssetValue,
        totalAccumulatedDepreciation,
        totalNetBookValue,
        byCategory: Array.from(byCategoryMap.values()),
        byDepartment: Array.from(byDepartmentMap.values()),
      },
    };
  }

  private static calculateAccumulatedDepreciation(asset: FinanceAssetRow): number {
    if (!asset.asset_value || asset.is_old_unit === 1) {
      return 0;
    }

    if (!asset.depreciation_start_date || !asset.annual_depreciation) {
      return 0;
    }

    const startDate = new Date(asset.depreciation_start_date);
    const today = new Date();
    const yearsDiff = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (asset.useful_life_years && yearsDiff >= asset.useful_life_years) {
      // Asset is fully depreciated
      return asset.asset_value - asset.salvage_value;
    }

    return Math.min(asset.annual_depreciation * yearsDiff, asset.asset_value - asset.salvage_value);
  }

  private static calculateYearsDepreciated(asset: FinanceAssetRow): number {
    if (!asset.depreciation_start_date) {
      return 0;
    }

    const startDate = new Date(asset.depreciation_start_date);
    const today = new Date();
    return (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }
}

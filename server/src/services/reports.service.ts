import type { Pool } from 'mysql2/promise';
import { getAssetScope, getDepartmentIdsForScope } from '../utils/assetScope.js';
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
  assigned_department_name: string | null;
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
    requestedCompanyId?: string | null,
    scopeOverride?: 'it' | 'admin' | null
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

    let categoryIds: string[] | null = null;
    if (scopeOverride && (scopeOverride === 'it' || scopeOverride === 'admin')) {
      const departmentIds = await getDepartmentIdsForScope(pool, scopeOverride, companyId);
      logger.info(`[finance-reports] Scope override: ${scopeOverride}, department IDs: ${JSON.stringify(departmentIds)}`);

      if (departmentIds && departmentIds.length > 0) {
        const placeholders = departmentIds.map(() => '?').join(',');
        const categoryQuery = `
          SELECT DISTINCT ac.categoryID
          FROM asset_categories ac
          INNER JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
          WHERE d.deleted_at IS NULL
            AND ac.deleted_at IS NULL
            AND d.departmentID IN (${placeholders})
        `;
        const [categoryRows] = (await pool.execute(categoryQuery, departmentIds)) as any[];
        categoryIds = categoryRows.map((row: any) => String(row.categoryID));
        logger.info(`[finance-reports] Category IDs for scope ${scopeOverride}: ${JSON.stringify(categoryIds)}`);
      }
    } else {
      logger.info(`[finance-reports] No scope override or invalid scope. scopeOverride: ${scopeOverride}`);
    }

    let baseQuery = `
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
        ad.name AS assigned_department_name,
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
      LEFT JOIN asset_assignments aa
        ON aa.asset_id = a.assetID
       AND aa.deleted_at IS NULL
       AND aa.status = 'Active'
      LEFT JOIN users au
        ON aa.user_id = au.userID
      LEFT JOIN asset_mngmnt_departments ad
        ON au.department_id = ad.departmentID
       AND ad.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_locations l
        ON a.location_id = l.locationID
       AND l.deleted_at IS NULL
      LEFT JOIN asset_mngmnt_location_rooms lr
        ON a.location_room_id = lr.roomID
       AND lr.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
        AND a.company_id = ?
    `;

    const queryParams: any[] = [companyId];

    if (categoryIds && categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',');
      baseQuery += ` AND a.category_id IN (${placeholders})`;
      queryParams.push(...categoryIds);
    }

    baseQuery += ` ORDER BY a.asset_code`;

    const [assetRows] = (await pool.execute(baseQuery, queryParams)) as any[];

    const assets = assetRows as FinanceAssetRow[];

    logger.info(`[finance-reports] Found ${assets.length} assets for company ${companyId} with scope ${scopeOverride || 'none'}`);

    // Calculate depreciation for each asset
    const depreciationSchedule: FinanceDepreciationRow[] = assets.map(asset => {
      const accumulatedDepreciation = this.calculateAccumulatedDepreciation(asset);
      const assetValue = this.toFinanceNumber(asset.asset_value);
      const netBookValue = Math.max(0, assetValue - accumulatedDepreciation);
      const yearsDepreciated = this.calculateYearsDepreciated(asset);
      const remainingUsefulLife = asset.useful_life_years
        ? Math.max(0, this.toFinanceNumber(asset.useful_life_years) - yearsDepreciated)
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
    const totalAssetValue = assets.reduce((sum, a) => sum + this.toFinanceNumber(a.asset_value), 0);
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
      group.totalAssetValue += this.toFinanceNumber(asset.asset_value);
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
      const department =
        asset.assigned_department_name || asset.department_name || 'Unassigned';
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
      group.totalAssetValue += this.toFinanceNumber(asset.asset_value);
      group.assetCount += 1;
    });

    // Add depreciation to department groups
    depreciationSchedule.forEach(asset => {
      const department =
        asset.assigned_department_name || asset.department_name || 'Unassigned';
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
    const assetValue = this.toFinanceNumber(asset.asset_value);
    const salvageValue = this.toFinanceNumber(asset.salvage_value);
    const annualDepreciation = this.toFinanceNumber(asset.annual_depreciation);
    const usefulLifeYears = this.toFinanceNumber(asset.useful_life_years);

    if (!assetValue || asset.is_old_unit === 1) {
      return 0;
    }

    if (!asset.depreciation_start_date || !annualDepreciation) {
      return 0;
    }

    const startDate = new Date(asset.depreciation_start_date);
    const today = new Date();
    const yearsDiff = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const depreciableValue = Math.max(0, assetValue - salvageValue);

    if (usefulLifeYears && yearsDiff >= usefulLifeYears) {
      return depreciableValue;
    }

    return Math.min(annualDepreciation * yearsDiff, depreciableValue);
  }

  private static calculateYearsDepreciated(asset: FinanceAssetRow): number {
    if (!asset.depreciation_start_date) {
      return 0;
    }

    const startDate = new Date(asset.depreciation_start_date);
    const today = new Date();
    return (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }

  private static toFinanceNumber(value: unknown): number {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

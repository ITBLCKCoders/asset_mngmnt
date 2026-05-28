import type { Pool, RowDataPacket } from 'mysql2/promise';

/** SQL fragment: asset belongs to company scope (owned or home/origin). */
export function buildAssetCompanyScopeClause(alias = 'a'): {
  whereFragment: string;
  params: string[];
} {
  const a = alias;
  return {
    whereFragment: `(${a}.company_id = ? OR ${a}.originating_company_id = ?)`,
    params: [], // caller pushes companyId twice
  };
}

/** Append company scope params (companyId, companyId) to an existing params array. */
export function appendAssetCompanyScopeParams(
  params: (string | number)[],
  companyId: string
): (string | number)[] {
  return [...params, companyId, companyId];
}

export function mapTransferredOutAssetRow(row: RowDataPacket & Record<string, unknown>) {
  const targetName =
    (row.target_company_name as string) ||
    (row.company_name as string) ||
    'Company';
  return {
    ...row,
    // Keep parity with sp_get_assets shape where department display text is `department`.
    department:
      (row.department as string) ||
      (row.department_name as string) ||
      null,
    status: `Transferred to ${targetName}`,
    transferred_out: true,
    transferred_to_company_name:
      (row.target_company_name as string) ||
      (row.company_name as string) ||
      null,
  };
}

export function mapTransferredOutBuilderRow(row: RowDataPacket & Record<string, unknown>) {
  const targetName =
    (row.target_company_name as string) ||
    (row.company_name as string) ||
    'Company';
  return {
    ...row,
    status: `Transferred to ${targetName}`,
    transferred_out: true,
    transferred_to_company_name:
      (row.target_company_name as string) ||
      (row.company_name as string) ||
      null,
  };
}

export async function getTransferredOutAssetsForCompany(
  pool: Pool,
  companyId: string
): Promise<Record<string, unknown>[]> {
  const [rows] = (await pool.execute(
    `SELECT
        a.*,
        c_origin.name as originating_company_name,
        c_current.name as target_company_name,
        c_current.name as company_name,
        ac.name as category_name,
        at.name as type_name,
        d.name as department_name
      FROM assets a
      LEFT JOIN companies c_origin ON a.originating_company_id = c_origin.companyID
      LEFT JOIN companies c_current ON a.company_id = c_current.companyID
      LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
      LEFT JOIN asset_types at ON a.type_id = at.typeID
      LEFT JOIN asset_mngmnt_departments d ON a.department_id = d.departmentID
      WHERE a.deleted_at IS NULL
        AND a.originating_company_id = ?
        AND a.company_id IS NOT NULL
        AND a.company_id <> ?`,
    [companyId, companyId]
  )) as [RowDataPacket[], unknown];

  return (rows as RowDataPacket[]).map(row =>
    mapTransferredOutAssetRow(row as RowDataPacket & Record<string, unknown>)
  );
}

export async function getTransferredOutBuildersForCompany(
  pool: Pool,
  companyId: string
): Promise<Record<string, unknown>[]> {
  const [rows] = (await pool.execute(
    `SELECT
        ab.*,
        c_origin.name as originating_company_name,
        c_current.name as target_company_name,
        c_current.name as company_name
      FROM asset_builders ab
      LEFT JOIN companies c_origin ON ab.originating_company_id = c_origin.companyID
      LEFT JOIN companies c_current ON ab.company_id = c_current.companyID
      WHERE ab.deleted_at IS NULL
        AND ab.originating_company_id = ?
        AND ab.company_id IS NOT NULL
        AND ab.company_id <> ?`,
    [companyId, companyId]
  )) as [RowDataPacket[], unknown];

  return (rows as RowDataPacket[]).map(row =>
    mapTransferredOutBuilderRow(row as RowDataPacket & Record<string, unknown>)
  );
}

/** Set originating_company_id after create when column exists (no-op safe if null company). */
export async function setAssetOriginatingCompany(
  pool: Pool,
  assetId: string,
  companyId: string | null
): Promise<void> {
  if (!companyId) return;
  await pool.execute(
    `UPDATE assets SET originating_company_id = ? WHERE assetID = ? AND originating_company_id IS NULL`,
    [companyId, assetId]
  );
}

export async function setAssetBuilderOriginatingCompany(
  pool: Pool,
  builderId: string,
  companyId: string | null
): Promise<void> {
  if (!companyId) return;
  await pool.execute(
    `UPDATE asset_builders SET originating_company_id = ? WHERE builderID = ? AND originating_company_id IS NULL`,
    [companyId, builderId]
  );
}

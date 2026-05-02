import { pool } from '../db.js';

/** Fallback form number when no settings: BRW-YYYYMMDD-XXXX (sequence per day). */
export async function generateBorrowFormNumberFallback(): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `BRW-${dateStr}-`;
  const [seqRows] = (await pool.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM asset_borrow_requests WHERE form_number LIKE ?`,
    [`${prefix}%`]
  )) as any[];
  const nextSeq = seqRows[0]?.next_seq ?? 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/** Generate borrow form number from asset_borrow_form_settings, or fallback to BRW-YYYYMMDD-XXXX. */
export async function generateBorrowFormNumber(
  companyId: string,
  departmentId: string | null
): Promise<string> {
  const [settingsRows] = (await pool.execute(
    `SELECT * FROM asset_borrow_form_settings WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  )) as any[];

  const settings = settingsRows[0];
  if (!settings) {
    return generateBorrowFormNumberFallback();
  }

  const [companyRows] = (await pool.execute(
    `SELECT code, prefix FROM companies WHERE companyID = ? AND deleted_at IS NULL`,
    [companyId]
  )) as any[];
  const company = companyRows[0];

  let department: { code?: string; prefix?: string; name?: string } | null =
    null;
  if (settings.department_format !== 'none' && departmentId) {
    const [deptRows] = (await pool.execute(
      `SELECT code, prefix, name FROM asset_mngmnt_departments WHERE departmentID = ? AND deleted_at IS NULL`,
      [departmentId]
    )) as any[];
    department = deptRows[0];
  }

  const isIT =
    department?.name?.toLowerCase().includes('it') ||
    department?.code?.toLowerCase().includes('it');
  const assetCode = isIT
    ? settings.it_asset_borrow_code
    : settings.admin_asset_borrow_code;

  const parts: string[] = [];

  if (settings.company_format === 'code' && company?.code) {
    parts.push(company.code);
  } else if (settings.company_format === 'prefix' && company?.prefix) {
    parts.push(company.prefix);
  }

  if (settings.department_format === 'code' && department?.code) {
    parts.push(department.code);
  } else if (settings.department_format === 'prefix' && department?.prefix) {
    parts.push(department.prefix);
  }

  if (assetCode) {
    parts.push(assetCode);
  }

  if (settings.include_date) {
    const now = new Date();
    const dateStr =
      settings.date_format === 'YYYYMMDD'
        ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        : `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    parts.push(dateStr);
  }

  const dateFilter = settings.include_date ? parts[parts.length - 1] : null;
  const basePattern = parts
    .slice(0, settings.include_date ? -1 : undefined)
    .join('-');
  const year = settings.include_date ? new Date().getFullYear() : null;
  const likePrefix =
    settings.include_date && settings.date_format === 'MMYYYY'
      ? `${basePattern}-%${year}-`
      : `${basePattern}${dateFilter ? `-${dateFilter}` : ''}-`;

  const [seqRows] = (await pool.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM asset_borrow_requests WHERE form_number LIKE ?`,
    [`${likePrefix}%`]
  )) as any[];
  const nextSeq = seqRows[0]?.next_seq ?? 1;
  parts.push(String(nextSeq).padStart(4, '0'));
  return parts.join('-');
}


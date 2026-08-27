import { pool } from '../db.js';

/** Fallback form number when no settings: RET-MMYYYY-XXXX (sequence resets per year). */
export async function generateReturnFormNumberFallback(): Promise<string> {
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  const year = now.getFullYear();
  const [seqRows] = (await pool.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM asset_return_forms WHERE form_number LIKE ? AND deleted_at IS NULL`,
    [`RET-%${year}-%`]
  )) as any[];
  const nextSeq = seqRows[0]?.next_seq ?? 1;
  return `RET-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
}

/** Generate return form number from asset_return_form_settings, or fallback to RET-MMYYYY-XXXX. */
export async function generateReturnFormNumber(
  companyId: string,
  departmentId: string | null
): Promise<string> {
  const [settingsRows] = (await pool.execute(
    `SELECT * FROM asset_return_form_settings WHERE company_id = ? AND deleted_at IS NULL`,
    [companyId]
  )) as any[];

  const settings = settingsRows[0];
  if (!settings) {
    return generateReturnFormNumberFallback();
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
    ? settings.it_asset_return_code
    : settings.admin_asset_return_code;

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
  // For month-inclusive date formats (MMYYYY): sequence resets per year, so
  // match any month in the same year. Only daily YYYYMMDD scopes per day.
  const year = settings.include_date ? new Date().getFullYear() : null;
  const likePrefix =
    settings.include_date && settings.date_format !== 'YYYYMMDD'
      ? `${basePattern}-%${year}-`
      : `${basePattern}${dateFilter ? `-${dateFilter}` : ''}-`;

  const [seqRows] = (await pool.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0) + 1 AS next_seq
     FROM asset_return_forms WHERE form_number LIKE ? AND deleted_at IS NULL`,
    [`${likePrefix}%`]
  )) as any[];
  const nextSeq = seqRows[0]?.next_seq ?? 1;
  parts.push(String(nextSeq).padStart(4, '0'));
  return parts.join('-');
}

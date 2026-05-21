import type { Pool } from 'mysql2/promise';

/**
 * Fetches the active company from the database.
 * Returns the company object or null if none is active.
 */
export async function getActiveCompany(pool: Pool): Promise<any | null> {
  const [rows] = await pool.query<any[][]>('CALL sp_GetActiveCompany()');
  return rows[0]?.[0] ?? null;
}

const COMPANY_SELECT = `SELECT
         companyID as id,
         name,
         email,
         code,
         prefix,
         tax_id,
         phone,
         website,
         unit_no,
         building_street,
         barangay_name,
         city_name,
         province_name,
         region_name,
         zipcode,
         logo_url,
         industry,
         size,
         is_active,
         is_main,
         created_at,
         created_by,
         updated_at,
         updated_by,
         deleted_at,
         deleted_by
       FROM companies`;

async function getUserCompany(pool: Pool, userId: string): Promise<any | null> {
  const [companyRows] = await pool.query<any[]>(
    `${COMPANY_SELECT}
       WHERE companyID = (
         SELECT company_id
         FROM users
         WHERE userID = ?
         LIMIT 1
       )
       AND deleted_at IS NULL
       LIMIT 1`,
    [userId]
  );
  return companyRows[0] ?? null;
}

async function userIsAdminOrSuperAdmin(
  pool: Pool,
  userId: string
): Promise<boolean> {
  const [userRows] = await pool.query<any[]>(
    `SELECT r.name as role_name
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     WHERE u.userID = ?
     LIMIT 1`,
    [userId]
  );
  const roleName = String(userRows[0]?.role_name ?? '')
    .trim()
    .toLowerCase();
  return roleName === 'super admin' || roleName === 'admin';
}

/**
 * Resolves a company context for an authenticated user.
 *
 * Super Admin and Admin use the global active company (header company switch)
 * so categories, types, and settings match the asset list for the selected company.
 *
 * Other users prefer their assigned company, then fall back to the global active company.
 */
export async function getScopedActiveCompany(
  pool: Pool,
  userId?: string
): Promise<any | null> {
  if (userId) {
    const isPrivileged = await userIsAdminOrSuperAdmin(pool, userId);
    if (isPrivileged) {
      const globalActive = await getActiveCompany(pool);
      if (globalActive) {
        return globalActive;
      }
    }

    const userCompany = await getUserCompany(pool, userId);
    if (userCompany) {
      return userCompany;
    }
  }

  return getActiveCompany(pool);
}

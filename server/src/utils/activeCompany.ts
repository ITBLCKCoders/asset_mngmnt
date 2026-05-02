import type { Pool } from 'mysql2/promise';

/**
 * Fetches the active company from the database.
 * Returns the company object or null if none is active.
 */
export async function getActiveCompany(pool: Pool): Promise<any | null> {
  const [rows] = await pool.query<any[][]>('CALL sp_GetActiveCompany()');
  return rows[0]?.[0] ?? null;
}

/**
 * Resolves a company context for an authenticated user.
 *
 * Current DB routines expose a global "active company", but many controllers
 * conceptually need a per-user scope. To avoid cross-company drift, prefer the
 * authenticated user's company when available and fall back to the global
 * active company only when the user has no company assigned.
 */
export async function getScopedActiveCompany(
  pool: Pool,
  userId?: string
): Promise<any | null> {
  if (userId) {
    const [companyRows] = await pool.query<any[]>(
      `SELECT
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
       FROM companies
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

    if (companyRows[0]) {
      return companyRows[0];
    }
  }

  return getActiveCompany(pool);
}

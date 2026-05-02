import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import { SettingModel } from '../models/setting.model.js';
import { createAuditLog } from '../utils/audit.js';

export async function getAssetIdFormatSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(`
      SELECT
        id,
        company_id,
        company_format,
        category_format,
        type_format,
        department_format,
        include_date,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_id_format_settings
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [currentCompany.id])) as any[];

    return res.json({ settings: rows });
  } catch (error: any) {
    logger.error('Get asset ID format settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch asset ID format settings' });
  }
}

export async function updateAssetIdFormatSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    company_id,
    company_format,
    category_format,
    type_format,
    department_format,
    include_date,
  } = req.body;
  const userId = req.user!.userID;

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    // Check if settings already exist for this company
    const [existing] = (await pool.execute(
      `
      SELECT id FROM asset_id_format_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    if (existing.length > 0) {
      // Update existing settings
      await pool.execute(
        `
        UPDATE asset_id_format_settings SET
          company_format = ?,
          category_format = ?,
          type_format = ?,
          department_format = ?,
          include_date = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE company_id = ? AND deleted_at IS NULL
      `,
        [
          company_format || 'code',
          category_format || 'prefix',
          type_format || 'prefix',
          department_format || 'none',
          include_date !== undefined ? include_date : true,
          userId,
          company_id,
        ]
      );
    } else {
      // Insert new settings
      await pool.execute(
        `
        INSERT INTO asset_id_format_settings (
          company_id,
          company_format,
          category_format,
          type_format,
          department_format,
          include_date,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          company_id,
          company_format || 'code',
          category_format || 'prefix',
          type_format || 'prefix',
          department_format || 'none',
          include_date !== undefined ? include_date : true,
          userId,
          userId,
        ]
      );
    }

    // Return updated settings
    const [rows] = (await pool.execute(
      `
      SELECT
        id,
        company_id,
        company_format,
        category_format,
        type_format,
        department_format,
        include_date,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_id_format_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    await createAuditLog({
      userId,
      action: 'update_asset_id_format_settings',
      resourceType: 'settings',
      resourceId: String(company_id),
      details: `Updated asset ID format settings for company: ${company_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Asset ID format settings updated successfully',
      settings: rows[0],
    });
  } catch (error: any) {
    logger.error('Update asset ID format settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update asset ID format settings' });
  }
}

export async function copyMainCompanyAssetSettings(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user!.userID;

  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    // Get main company
    const [mainCompanyRows] = (await pool.execute(`
      SELECT companyID as id, name, is_main FROM companies
      WHERE is_main = 1 AND deleted_at IS NULL
      LIMIT 1
    `)) as any[];

    logger.debug('Main company query result', { mainCompanyRows });

    const mainCompany = mainCompanyRows[0];

    if (!mainCompany) {
      // Fallback: get any company as main if none is marked as main
      const [fallbackRows] = (await pool.execute(`
        SELECT companyID as id, name, is_main FROM companies
        WHERE deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
      `)) as any[];

      logger.debug('Fallback main company query result', { fallbackRows });

      const fallbackCompany = fallbackRows[0];
      if (!fallbackCompany) {
        return res
          .status(400)
          .json({ error: 'No companies found in database' });
      }

      return res.status(400).json({
        error: 'No main company found. Please set a main company first.',
        availableCompanies: fallbackRows,
      });
    }

    logger.debug('Comparing company IDs', {
      currentCompanyId: currentCompany.id,
      mainCompanyId: mainCompany.id,
    });

    if (currentCompany.id === mainCompany.id) {
      logger.debug('Current company is main company, cannot copy to self');
      return res
        .status(400)
        .json({ error: 'Cannot copy settings to the main company itself' });
    }

    logger.debug('Proceeding with copy operation');

    // Get a connection for transaction
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.query('START TRANSACTION');

      // Copy asset categories
      await connection.execute(
        `
        INSERT INTO asset_categories (name, prefix, gl_code, company_id, created_by, updated_by)
        SELECT name, prefix, gl_code, ?, ?, ?
        FROM asset_categories
        WHERE company_id = ? AND deleted_at IS NULL
      `,
        [currentCompany.id, userId, userId, mainCompany.id]
      );

      // Copy suppliers
      await connection.execute(
        `
        INSERT INTO suppliers (name, category_id, contact, email, company_id, created_by, updated_by)
        SELECT s.name, COALESCE(c2.categoryID, s.category_id), s.contact, s.email, ?, ?, ?
        FROM suppliers s
        LEFT JOIN asset_categories c1 ON s.category_id = c1.categoryID AND c1.company_id = ? AND c1.deleted_at IS NULL
        LEFT JOIN asset_categories c2 ON c1.name = c2.name AND c2.company_id = ? AND c2.deleted_at IS NULL
        WHERE s.company_id = ? AND s.deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          category_id = VALUES(category_id),
          contact = VALUES(contact),
          email = VALUES(email),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [
          currentCompany.id,
          userId,
          userId,
          mainCompany.id,
          currentCompany.id,
          mainCompany.id,
        ]
      );

      // Copy asset types
      await connection.execute(
        `
        INSERT INTO asset_types (name, category_id, prefix, company_id, created_by, updated_by)
        SELECT t.name, COALESCE(c2.categoryID, t.category_id), t.prefix, ?, ?, ?
        FROM asset_types t
        LEFT JOIN asset_categories c1 ON t.category_id = c1.categoryID AND c1.company_id = ? AND c1.deleted_at IS NULL
        LEFT JOIN asset_categories c2 ON c1.name = c2.name AND c2.company_id = ? AND c2.deleted_at IS NULL
        WHERE t.company_id = ? AND t.deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          category_id = VALUES(category_id),
          prefix = VALUES(prefix),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [
          currentCompany.id,
          userId,
          userId,
          mainCompany.id,
          currentCompany.id,
          mainCompany.id,
        ]
      );

      // Copy asset brands
      await connection.execute(
        `
        INSERT INTO asset_brands (name, type_id, prefix, company_id, created_by, updated_by)
        SELECT b.name, COALESCE(t2.typeID, b.type_id), b.prefix, ?, ?, ?
        FROM asset_brands b
        LEFT JOIN asset_types t1 ON b.type_id = t1.typeID AND t1.company_id = ? AND t1.deleted_at IS NULL
        LEFT JOIN asset_types t2 ON t1.name = t2.name AND t2.company_id = ? AND t2.deleted_at IS NULL
        WHERE b.company_id = ? AND b.deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          type_id = VALUES(type_id),
          prefix = VALUES(prefix),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [
          currentCompany.id,
          userId,
          userId,
          mainCompany.id,
          currentCompany.id,
          mainCompany.id,
        ]
      );

      // Copy asset ID format settings
      await connection.execute(
        `
        INSERT INTO asset_id_format_settings (
          company_id, company_format, category_format, type_format,
          department_format, include_date, created_by, updated_by
        )
        SELECT ?, company_format, category_format, type_format,
                department_format, include_date, ?, ?
        FROM asset_id_format_settings
        WHERE company_id = ? AND deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          company_format = VALUES(company_format),
          category_format = VALUES(category_format),
          type_format = VALUES(type_format),
          department_format = VALUES(department_format),
          include_date = VALUES(include_date),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [currentCompany.id, userId, userId, mainCompany.id]
      );

      await connection.query('COMMIT');

      await createAuditLog({
        userId,
        action: 'copy_main_company_asset_settings',
        resourceType: 'settings',
        resourceId: String(currentCompany.id),
        details: `Copied asset settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.json({
        message: `Successfully copied asset settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
      });
    } catch (error: any) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    logger.error('Copy main company asset settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to copy asset settings from main company' });
  }
}

export async function copyMainCompanyLocationSettings(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user!.userID;

  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    // Get main company
    const [mainCompanyRows] = (await pool.execute(`
      SELECT companyID as id, name FROM companies
      WHERE is_main = 1 AND deleted_at IS NULL
      LIMIT 1
    `)) as any[];

    const mainCompany = mainCompanyRows[0];

    if (!mainCompany) {
      return res.status(400).json({ error: 'No main company found' });
    }

    if (currentCompany.id === mainCompany.id) {
      return res
        .status(400)
        .json({ error: 'Cannot copy settings to the main company itself' });
    }

    // Get a connection for transaction
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.query('START TRANSACTION');

      // Copy locations
      await connection.execute(
        `
        INSERT INTO asset_mngmnt_locations (name, floor_unit, building, room_area, description, company_id, created_by, updated_by)
        SELECT name, floor_unit, building, room_area, description, ?, ?, ?
        FROM asset_mngmnt_locations
        WHERE company_id = ? AND deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          floor_unit = VALUES(floor_unit),
          building = VALUES(building),
          room_area = VALUES(room_area),
          description = VALUES(description),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [currentCompany.id, userId, userId, mainCompany.id]
      );

      // Copy location rooms
      await connection.execute(
        `
        INSERT INTO asset_mngmnt_location_rooms (locationID, room_name, created_by, updated_by)
        SELECT
          (SELECT l2.locationID FROM asset_mngmnt_locations l2 WHERE l2.name = l1.name AND l2.company_id = ? AND l2.deleted_at IS NULL LIMIT 1),
          lr.room_name, ?, ?
        FROM asset_mngmnt_location_rooms lr
        JOIN asset_mngmnt_locations l1 ON lr.locationID = l1.locationID
        WHERE l1.company_id = ? AND lr.deleted_at IS NULL AND l1.deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          room_name = VALUES(room_name),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [currentCompany.id, userId, userId, mainCompany.id]
      );

      await connection.query('COMMIT');

      await createAuditLog({
        userId,
        action: 'copy_main_company_location_settings',
        resourceType: 'settings',
        resourceId: String(currentCompany.id),
        details: `Copied location settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.json({
        message: `Successfully copied location settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
      });
    } catch (error: any) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    logger.error('Copy main company location settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to copy location settings from main company' });
  }
}

export async function copyMainCompanyDepartmentSettings(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user!.userID;

  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    // Get main company
    const [mainCompanyRows] = (await pool.execute(`
      SELECT companyID as id, name FROM companies
      WHERE is_main = 1 AND deleted_at IS NULL
      LIMIT 1
    `)) as any[];

    const mainCompany = mainCompanyRows[0];

    if (!mainCompany) {
      return res.status(400).json({ error: 'No main company found' });
    }

    if (currentCompany.id === mainCompany.id) {
      return res
        .status(400)
        .json({ error: 'Cannot copy settings to the main company itself' });
    }

    // Get a connection for transaction
    const connection = await pool.getConnection();

    try {
      // Start transaction
      await connection.query('START TRANSACTION');

      // Copy departments
      await connection.execute(
        `
        INSERT INTO asset_mngmnt_departments (name, code, prefix, description, company_id, created_by, updated_by)
        SELECT name, code, prefix, description, ?, ?, ?
        FROM asset_mngmnt_departments
        WHERE company_id = ? AND deleted_at IS NULL
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          prefix = VALUES(prefix),
          description = VALUES(description),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `,
        [currentCompany.id, userId, userId, mainCompany.id]
      );

      await connection.query('COMMIT');

      await createAuditLog({
        userId,
        action: 'copy_main_company_department_settings',
        resourceType: 'settings',
        resourceId: String(currentCompany.id),
        details: `Copied department settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.json({
        message: `Successfully copied department settings from ${mainCompany.name} to ${currentCompany.name || currentCompany.code}`,
      });
    } catch (error: any) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    logger.error('Copy main company department settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to copy department settings from main company' });
  }
}

export async function getAccountabilityFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(`
      SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_code,
        admin_asset_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM accountability_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [currentCompany.id])) as any[];

    return res.json({ settings: rows });
  } catch (error: any) {
    logger.error('Get accountability form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form settings' });
  }
}

export async function updateAccountabilityFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    company_id,
    company_format,
    department_format,
    it_asset_code,
    admin_asset_code,
    include_date,
    date_format,
  } = req.body;
  const userId = req.user!.userID;

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    // Check if settings already exist for this company
    const [existing] = (await pool.execute(
      `
      SELECT id FROM accountability_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    if (existing.length > 0) {
      // Update existing settings
      await pool.execute(
        `
        UPDATE accountability_form_settings SET
          company_format = ?,
          department_format = ?,
          it_asset_code = ?,
          admin_asset_code = ?,
          include_date = ?,
          date_format = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE company_id = ? AND deleted_at IS NULL
      `,
        [
          company_format || 'code',
          department_format || 'none',
          it_asset_code || null,
          admin_asset_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          company_id,
        ]
      );
    } else {
      // Insert new settings
      await pool.execute(
        `
        INSERT INTO accountability_form_settings (
          company_id,
          company_format,
          department_format,
          it_asset_code,
          admin_asset_code,
          include_date,
          date_format,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          company_id,
          company_format || 'code',
          department_format || 'none',
          it_asset_code || null,
          admin_asset_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          userId,
        ]
      );
    }

    // Return updated settings
    const [rows] = (await pool.execute(
      `
      SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_code,
        admin_asset_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM accountability_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    await createAuditLog({
      userId,
      action: 'update_accountability_form_settings',
      resourceType: 'settings',
      resourceId: String(company_id),
      details: `Updated accountability form settings for company: ${company_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Accountability form settings updated successfully',
      settings: rows[0],
    });
  } catch (error: any) {
    logger.error('Update accountability form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update accountability form settings' });
  }
}

export async function getAssetReturnFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(`
      SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_return_code,
        admin_asset_return_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_return_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [currentCompany.id])) as any[];

    return res.json({ settings: rows });
  } catch (error: any) {
    logger.error('Get asset return form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch asset return form settings' });
  }
}

export async function updateAssetReturnFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    company_id,
    company_format,
    department_format,
    it_asset_return_code,
    admin_asset_return_code,
    include_date,
    date_format,
  } = req.body;
  const userId = req.user!.userID;

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const [existing] = (await pool.execute(
      `
      SELECT id FROM asset_return_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    if (existing.length > 0) {
      await pool.execute(
        `
        UPDATE asset_return_form_settings SET
          company_format = ?,
          department_format = ?,
          it_asset_return_code = ?,
          admin_asset_return_code = ?,
          include_date = ?,
          date_format = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE company_id = ? AND deleted_at IS NULL
      `,
        [
          company_format || 'code',
          department_format || 'none',
          it_asset_return_code || null,
          admin_asset_return_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          company_id,
        ]
      );
    } else {
      await pool.execute(
        `
        INSERT INTO asset_return_form_settings (
          company_id,
          company_format,
          department_format,
          it_asset_return_code,
          admin_asset_return_code,
          include_date,
          date_format,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          company_id,
          company_format || 'code',
          department_format || 'none',
          it_asset_return_code || null,
          admin_asset_return_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          userId,
        ]
      );
    }

    const [rows] = (await pool.execute(
      `
      SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_return_code,
        admin_asset_return_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_return_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    await createAuditLog({
      userId,
      action: 'update_asset_return_form_settings',
      resourceType: 'settings',
      resourceId: String(company_id),
      details: `Updated asset return form settings for company: ${company_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Asset return form settings updated successfully',
      settings: rows[0],
    });
  } catch (error: any) {
    logger.error('Update asset return form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update asset return form settings' });
  }
}

export async function getAssetTransferFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(
      `SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_transfer_code,
        admin_asset_transfer_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_transfer_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
      [currentCompany.id]
    )) as any[];

    return res.json({ settings: rows });
  } catch (error: any) {
    logger.error('Get asset transfer form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch asset transfer form settings' });
  }
}

export async function updateAssetTransferFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    company_id,
    company_format,
    department_format,
    it_asset_transfer_code,
    admin_asset_transfer_code,
    include_date,
    date_format,
  } = req.body;
  const userId = req.user!.userID;

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    await pool.execute(
      'CALL sp_upsert_asset_transfer_form_settings(?, ?, ?, ?, ?, ?, ?, ?)',
      [
        company_id,
        company_format || 'code',
        department_format || 'none',
        it_asset_transfer_code || null,
        admin_asset_transfer_code || null,
        include_date !== undefined ? (include_date ? 1 : 0) : 1,
        date_format || 'MMYYYY',
        userId,
      ]
    );

    const [rows] = (await pool.execute(
      `SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_transfer_code,
        admin_asset_transfer_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_transfer_form_settings
      WHERE company_id = ? AND deleted_at IS NULL`,
      [company_id]
    )) as any[];

    await createAuditLog({
      userId,
      action: 'update_asset_transfer_form_settings',
      resourceType: 'settings',
      resourceId: String(company_id),
      details: `Updated asset transfer form settings for company: ${company_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Asset transfer form settings updated successfully',
      settings: rows[0],
    });
  } catch (error: any) {
    logger.error('Update asset transfer form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update asset transfer form settings' });
  }
}

export async function getAssetBorrowFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!currentCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(
      `SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_borrow_code,
        admin_asset_borrow_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_borrow_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
      [currentCompany.id]
    )) as any[];

    return res.json({ settings: rows });
  } catch (error: any) {
    logger.error('Get asset borrow form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch asset borrow form settings' });
  }
}

export async function updateAssetBorrowFormSettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    company_id,
    company_format,
    department_format,
    it_asset_borrow_code,
    admin_asset_borrow_code,
    include_date,
    date_format,
  } = req.body;
  const userId = req.user!.userID;

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const [existing] = (await pool.execute(
      `
      SELECT id FROM asset_borrow_form_settings
      WHERE company_id = ? AND deleted_at IS NULL
    `,
      [company_id]
    )) as any[];

    if (existing.length > 0) {
      await pool.execute(
        `
        UPDATE asset_borrow_form_settings SET
          company_format = ?,
          department_format = ?,
          it_asset_borrow_code = ?,
          admin_asset_borrow_code = ?,
          include_date = ?,
          date_format = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE company_id = ? AND deleted_at IS NULL
      `,
        [
          company_format || 'code',
          department_format || 'none',
          it_asset_borrow_code || null,
          admin_asset_borrow_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          company_id,
        ]
      );
    } else {
      await pool.execute(
        `
        INSERT INTO asset_borrow_form_settings (
          company_id,
          company_format,
          department_format,
          it_asset_borrow_code,
          admin_asset_borrow_code,
          include_date,
          date_format,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          company_id,
          company_format || 'code',
          department_format || 'none',
          it_asset_borrow_code || null,
          admin_asset_borrow_code || null,
          include_date !== undefined ? include_date : true,
          date_format || 'MMYYYY',
          userId,
          userId,
        ]
      );
    }

    const [rows] = (await pool.execute(
      `SELECT
        id,
        company_id,
        company_format,
        department_format,
        it_asset_borrow_code,
        admin_asset_borrow_code,
        include_date,
        date_format,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM asset_borrow_form_settings
      WHERE company_id = ? AND deleted_at IS NULL`,
      [company_id]
    )) as any[];

    await createAuditLog({
      userId,
      action: 'update_asset_borrow_form_settings',
      resourceType: 'settings',
      resourceId: String(company_id),
      details: `Updated asset borrow form settings for company: ${company_id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Asset borrow form settings updated successfully',
      settings: rows[0],
    });
  } catch (error: any) {
    logger.error('Update asset borrow form settings failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update asset borrow form settings' });
  }
}

// MFA Global Settings Handlers

export async function getGlobalMFASettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const mfaEnabled = await SettingModel.getValue('mfa_enabled');
    // Default to true if not set
    return res.json({ mfaEnabled: mfaEnabled !== null ? mfaEnabled : true });
  } catch (error: any) {
    logger.error('Get global MFA settings failed:', error);
    return res.status(500).json({ error: 'Failed to fetch MFA settings' });
  }
}

export async function updateGlobalMFASettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const { mfaEnabled } = req.body;
  const userId = req.user!.userID;

  if (typeof mfaEnabled !== 'boolean') {
    return res.status(400).json({ error: 'mfaEnabled must be a boolean' });
  }

  try {
    const setting = await SettingModel.setValue(
      'mfa_enabled',
      mfaEnabled.toString(),
      'boolean',
      userId
    );

    return res.json({
      message: 'MFA settings updated successfully',
      mfaEnabled,
      setting,
    });
  } catch (error: any) {
    logger.error('Update global MFA settings failed:', error);
    return res.status(500).json({ error: 'Failed to update MFA settings' });
  }
}

// Security Settings Handlers

export async function getSecuritySettingsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const settings = {
      passwordMinLength: await SettingModel.getValue('password_min_length') ?? 8,
      passwordRequireUppercase: await SettingModel.getValue('password_require_uppercase') ?? true,
      passwordRequireLowercase: await SettingModel.getValue('password_require_lowercase') ?? true,
      passwordRequireNumbers: await SettingModel.getValue('password_require_numbers') ?? true,
      passwordRequireSpecial: await SettingModel.getValue('password_require_special') ?? false,
      passwordExpirationDays: await SettingModel.getValue('password_expiration_days') ?? 90,
      maxLoginAttempts: await SettingModel.getValue('max_login_attempts') ?? 5,
      lockoutDurationMinutes: await SettingModel.getValue('lockout_duration_minutes') ?? 30,
      sessionTimeoutMinutes: await SettingModel.getValue('session_timeout_minutes') ?? 60,
      auditLoggingEnabled: await SettingModel.getValue('audit_logging_enabled') ?? true,
      otpExpirySeconds: await SettingModel.getValue('otp_expiry_seconds') ?? 300,
    };

    return res.json({ settings });
  } catch (error: any) {
    logger.error('Get security settings failed:', error);
    return res.status(500).json({ error: 'Failed to fetch security settings' });
  }
}

export async function updateSecuritySettingsHandler(
  req: AuthRequest,
  res: Response
) {
  const {
    passwordMinLength,
    passwordRequireUppercase,
    passwordRequireLowercase,
    passwordRequireNumbers,
    passwordRequireSpecial,
    passwordExpirationDays,
    maxLoginAttempts,
    lockoutDurationMinutes,
    sessionTimeoutMinutes,
    auditLoggingEnabled,
    otpExpirySeconds,
  } = req.body;
  const userId = req.user!.userID;

  // Validate inputs
  if (passwordMinLength && (typeof passwordMinLength !== 'number' || passwordMinLength < 6)) {
    return res.status(400).json({ error: 'passwordMinLength must be at least 6' });
  }
  if (passwordExpirationDays && (typeof passwordExpirationDays !== 'number' || passwordExpirationDays < 0)) {
    return res.status(400).json({ error: 'passwordExpirationDays must be 0 or greater' });
  }
  if (maxLoginAttempts && (typeof maxLoginAttempts !== 'number' || maxLoginAttempts < 1)) {
    return res.status(400).json({ error: 'maxLoginAttempts must be at least 1' });
  }
  if (lockoutDurationMinutes && (typeof lockoutDurationMinutes !== 'number' || lockoutDurationMinutes < 1)) {
    return res.status(400).json({ error: 'lockoutDurationMinutes must be at least 1' });
  }
  if (sessionTimeoutMinutes && (typeof sessionTimeoutMinutes !== 'number' || sessionTimeoutMinutes < 1)) {
    return res.status(400).json({ error: 'sessionTimeoutMinutes must be at least 1' });
  }
  if (otpExpirySeconds && (typeof otpExpirySeconds !== 'number' || otpExpirySeconds < 60)) {
    return res.status(400).json({ error: 'otpExpirySeconds must be at least 60' });
  }

  try {
    // Update each setting if provided
    if (passwordMinLength !== undefined) {
      await SettingModel.setValue('password_min_length', passwordMinLength.toString(), 'number', userId);
    }
    if (passwordRequireUppercase !== undefined) {
      await SettingModel.setValue('password_require_uppercase', passwordRequireUppercase.toString(), 'boolean', userId);
    }
    if (passwordRequireLowercase !== undefined) {
      await SettingModel.setValue('password_require_lowercase', passwordRequireLowercase.toString(), 'boolean', userId);
    }
    if (passwordRequireNumbers !== undefined) {
      await SettingModel.setValue('password_require_numbers', passwordRequireNumbers.toString(), 'boolean', userId);
    }
    if (passwordRequireSpecial !== undefined) {
      await SettingModel.setValue('password_require_special', passwordRequireSpecial.toString(), 'boolean', userId);
    }
    if (passwordExpirationDays !== undefined) {
      await SettingModel.setValue('password_expiration_days', passwordExpirationDays.toString(), 'number', userId);
    }
    if (maxLoginAttempts !== undefined) {
      await SettingModel.setValue('max_login_attempts', maxLoginAttempts.toString(), 'number', userId);
    }
    if (lockoutDurationMinutes !== undefined) {
      await SettingModel.setValue('lockout_duration_minutes', lockoutDurationMinutes.toString(), 'number', userId);
    }
    if (sessionTimeoutMinutes !== undefined) {
      await SettingModel.setValue('session_timeout_minutes', sessionTimeoutMinutes.toString(), 'number', userId);
    }
    if (auditLoggingEnabled !== undefined) {
      await SettingModel.setValue('audit_logging_enabled', auditLoggingEnabled.toString(), 'boolean', userId);
    }
    if (otpExpirySeconds !== undefined) {
      await SettingModel.setValue('otp_expiry_seconds', otpExpirySeconds.toString(), 'number', userId);
    }

    return res.json({
      message: 'Security settings updated successfully',
    });
  } catch (error: any) {
    logger.error('Update security settings failed:', error);
    return res.status(500).json({ error: 'Failed to update security settings' });
  }
}

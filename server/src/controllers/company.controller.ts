import type { Request, Response } from 'express';
import Busboy from 'busboy';
import { pool } from '../db.js';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../utils/cloudinary.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import {
  getActiveCompany,
  getScopedActiveCompany,
} from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface CompanyFields {
  name: string;
  email: string;
  code: string;
}

const parseFormData = (
  req: Request
): Promise<{
  fields: Record<string, string>;
  file?: Buffer;
}> => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields: Record<string, string> = {};
    let logoBuffer: Buffer | undefined;
    let resolved = false;

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        const result: { fields: Record<string, string>; file?: Buffer } = {
          fields,
        };
        if (logoBuffer) result.file = logoBuffer;
        resolve(result);
      }
    };

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (fieldname, file) => {
      if (fieldname !== 'logo') {
        file.resume();
        return;
      }

      const chunks: Buffer[] = [];
      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.on('end', () => {
        logoBuffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        safeResolve();
      });
    });

    busboy.on('finish', safeResolve);

    busboy.on('error', err => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    req.pipe(busboy);
  });
};

const validateCompanyFields = (
  fields: Record<string, string>
): CompanyFields => {
  const name = fields.name?.trim();
  const email = fields.email?.trim();
  const code = fields.code?.trim()?.toUpperCase();

  if (!name || !email || !code) {
    throw new Error('Name, email, and code are required');
  }

  return { name, email, code };
};

const getCompanyParams = (
  validatedFields: CompanyFields,
  fields: Record<string, string>,
  logoUrl: string | null,
  id?: string
): (string | null)[] => {
  const baseParams: (string | null)[] = [
    validatedFields.name,
    validatedFields.email,
    validatedFields.code,
    fields.prefix || null,
    fields.taxId || null,
    fields.phone || null,
    fields.website || null,
    fields.unit_no || null,
    fields.building_street || null,
    fields.barangay_name || null,
    fields.city_name || null,
    fields.province_name || null,
    fields.region_name || null,
    fields.zipcode || null,
    logoUrl,
    fields.industry || 'Technology',
    fields.size || '51–200 employees',
  ];

  return id !== undefined ? [id, ...baseParams] : baseParams;
};

const handleLogoUpload = async (
  file: Buffer | undefined,
  oldLogoUrl?: string | null
): Promise<string | null> => {
  if (!file) return oldLogoUrl || null;

  const newLogoUrl = await uploadToCloudinary(file);
  if (oldLogoUrl) {
    await deleteFromCloudinary(oldLogoUrl);
  }
  return newLogoUrl;
};

// CREATE Company
export const createCompany = async (req: AuthRequest, res: Response) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'FormData required' });
  }

  const userId = req.user!.userID;
  let logoUrl: string | null = null;

  try {
    const { fields, file } = await parseFormData(req);
    const validatedFields = validateCompanyFields(fields);
    logoUrl = await handleLogoUpload(file);

    const params = [
      ...getCompanyParams(validatedFields, fields, logoUrl),
      userId,
    ];
    await pool.query(
      `CALL sp_CreateCompany(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Company',
      resourceType: 'company',
      resourceName: validatedFields.name,
      details: `Created company "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    if (logoUrl)
      await deleteFromCloudinary(logoUrl).catch(err =>
        logger.error('Cloudinary delete failed', { err })
      );
    logger.error('Create company error', { err });
    if (err.message === 'Name, email, and code are required') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Company code already exists' });
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
};

// UPDATE Company
export const updateCompany = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;
  let newLogoUrl: string | null = null;

  try {
    const { fields, file } = await parseFormData(req);
    const validatedFields = validateCompanyFields(fields);

    // Get current logo
    const [current] = await pool.query<any[]>(
      'SELECT logo_url FROM companies WHERE companyID = ?',
      [id]
    );
    const oldLogoUrl = current[0]?.logo_url as string | null;

    newLogoUrl = await handleLogoUpload(file, oldLogoUrl);
    const finalLogoUrl = newLogoUrl ?? oldLogoUrl;

    const params = [
      ...getCompanyParams(validatedFields, fields, finalLogoUrl, id),
      userId,
    ];
    await pool.query(
      `CALL sp_UpdateCompany(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Company',
      resourceType: 'company',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated company "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ success: true });
  } catch (err: any) {
    if (newLogoUrl)
      await deleteFromCloudinary(newLogoUrl).catch(err =>
        logger.error('Cloudinary delete failed', { err })
      );
    logger.error('Update company error', { err });
    if (err.message === 'Name, email, and code are required') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Company code already exists' });
    }
    res.status(500).json({ error: 'Failed to update company' });
  }
};

// DELETE Logo Only
export const deleteCompanyLogo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userID;

  try {
    const [rows] = await pool.query<any[]>(
      'SELECT logo_url FROM companies WHERE companyID = ?',
      [id]
    );
    const logoUrl = rows[0]?.logo_url as string | null;

    if (logoUrl) {
      await deleteFromCloudinary(logoUrl);
    }

    await pool.query(
      'UPDATE companies SET logo_url = NULL WHERE companyID = ?',
      [id]
    );

    await createAuditLog({
      userId,
      action: 'Deleted Company Logo',
      resourceType: 'company',
      ...(id && { resourceId: id }),
      details: `Removed logo from company "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: 'Logo removed successfully' });
  } catch (err) {
    logger.error('Delete logo error', { err });
    res.status(500).json({ error: 'Failed to remove logo' });
  }
};

/**
 * PUBLIC company list (no auth) — used by the registration page to populate
 * the company dropdown. Returns ONLY non-sensitive identification fields:
 * `id`, `name`, `prefix`, `logo_url`.
 *
 * SECURITY: Stripped fields that the authenticated `getAllCompanies` returns
 * (and must NOT be exposed publicly): email, tax_id, phone, full address,
 * audit metadata (created_by / updated_by / deleted_by), website,
 * industry, size. Leaking any of those to unauthenticated callers is a
 * PII / business-intelligence disclosure.
 */
export const getCompaniesPublicHandler = async (
  _req: Request,
  res: Response
) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT
         companyID AS id,
         name,
         prefix,
         logo_url
       FROM companies
       WHERE deleted_at IS NULL
       ORDER BY name ASC`
    );
    res.json({ companies: rows ?? [] });
  } catch (err: any) {
    logger.error('Get public companies error', { err });
    res.status(500).json({ error: 'Failed to get companies' });
  }
};

// GET all companies (authenticated only — returns full company detail)
export const getAllCompanies = async (req: AuthRequest, res: Response) => {
  try {
    // Always return full company details
    const query = `SELECT
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
      updated_at,
      deleted_at
      FROM companies
      WHERE deleted_at IS NULL
      ORDER BY name ASC`;

    const [rows] = await pool.query<any[]>(query);
    res.json({ companies: rows ?? [] });
  } catch (err: any) {
    logger.error('Get all companies error', { err });
    res.status(500).json({ error: err.message || 'Failed to get companies' });
  }
};

// GET active company
export const getActiveCompanyHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Fetch the company with is_active = TRUE
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
         updated_at,
         deleted_at
       FROM companies
       WHERE is_active = TRUE AND deleted_at IS NULL
       LIMIT 1`
    );
    const company = companyRows[0] || null;
    res.json({ data: company ? [company] : [] });
  } catch (err) {
    logger.error('Get active company error', { err });
    res.json({ data: [] });
  }
};

// GET current user's company (for form logos, etc.)
export const getMyCompanyHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userID;
    const [userRows] = (await pool.execute(
      'SELECT company_id FROM users WHERE userID = ? LIMIT 1',
      [userId]
    )) as [Array<{ company_id: string | null }>, unknown];
    const companyId = userRows[0]?.company_id ?? null;
    if (!companyId) {
      return res.json({ data: [] });
    }
    const [companyRows] = await pool.query<any[]>(
      `SELECT companyID as id, name, email, code, prefix, tax_id, phone, website,
       unit_no, building_street, barangay_name, city_name, province_name, region_name, zipcode,
       logo_url, industry, size, is_active, is_main, created_at, updated_at, deleted_at
       FROM companies WHERE companyID = ? AND deleted_at IS NULL LIMIT 1`,
      [companyId]
    );
    const company = companyRows[0] ?? null;
    res.json({ data: company ? [company] : [] });
  } catch (err) {
    logger.error('Get my company error', { err });
    res.json({ data: [] });
  }
};

// Set active company
export const setActiveCompany = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userID;
  try {
    await pool.query('CALL sp_SetActiveCompany(?)', [id]);

    await createAuditLog({
      userId,
      action: 'Set Active Company',
      resourceType: 'company',
      ...(id && { resourceId: id }),
      details: `Set company "${id}" as the active company`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Set active company error', { err });
    res.status(500).json({ error: 'Failed to set active company' });
  }
};

// Set main company
export const setMainCompany = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userID;
  try {
    await pool.query('CALL sp_SetMainCompany(?)', [id]);

    await createAuditLog({
      userId,
      action: 'Set Main Company',
      resourceType: 'company',
      ...(id && { resourceId: id }),
      details: `Set company "${id}" as the main company`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Set main company error', { err });
    res.status(500).json({ error: 'Failed to set main company' });
  }
};

// Delete company
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userID; // Get authenticated user ID

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    await pool.query('CALL sp_DeleteCompany(?, ?)', [id, userId]);

    await createAuditLog({
      userId,
      action: 'Deleted Company',
      resourceType: 'company',
      ...(id && { resourceId: id }),
      details: `Deleted company "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({ message: 'Company deleted successfully' });
  } catch (err: any) {
    logger.error('Delete company error', { err });
    if (err.message?.includes('Cannot delete the last company')) {
      return res.status(400).json({ error: 'Cannot delete the last company' });
    }
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

import type { Request, Response } from 'express';
import Busboy from 'busboy';
import { pool } from '../db.js';
import * as assetRepo from '../repositories/asset.repository.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import {
  uploadToCloudinary,
  uploadDocumentToCloudinary,
} from '../utils/cloudinary.js';
import { createAuditLog } from '../utils/audit.js';
import { buildAssetUpdateAuditDiff } from '../utils/assetAuditDiff.js';
import {
  CreateAssetDtoSchema,
  UpdateAssetDtoSchema,
} from '../dtos/assets/CreateAssetDto.js';
import { DtoTransformers } from '../utils/dtoTransformers.js';
import { createErrorResponse } from '../utils/responseWrapper.js';
import { getActiveCompany } from '../utils/activeCompany.js';
import {
  getAssetScope,
  classifyDepartmentScopeByName,
  getDepartmentIdsForScope,
} from '../utils/assetScope.js';
import {
  getTransferredOutAssetsForCompany,
  setAssetOriginatingCompany,
} from '../utils/companyTransferVisibility.js';

/** Matches `sp_create_asset` / `sp_update_asset` `p_status` ENUM (excludes UI-only `Assigned`). */
const STORED_PROC_ASSET_STATUSES = new Set([
  'Available',
  'In Use',
  'Under Maintenance',
  'Retired',
  'Disposed',
  'Lost',
]);

function normalizeAssetStatusForStoredProcedure(
  incoming: string | undefined | null,
  previous: string | undefined | null
): string {
  const prevTrim =
    previous != null && String(previous).trim()
      ? String(previous).trim()
      : null;
  const prevResolved =
    prevTrim === 'Assigned'
      ? 'In Use'
      : prevTrim && STORED_PROC_ASSET_STATUSES.has(prevTrim)
        ? prevTrim
        : null;

  const raw = incoming != null ? String(incoming).trim() : '';

  if (raw === 'Assigned') return 'In Use';
  if (raw && STORED_PROC_ASSET_STATUSES.has(raw)) return raw;

  const uiToSp: Record<string, string> = {
    'For Investigation': 'In Use',
    'For Disposal': 'Retired',
    Borrowed: 'In Use',
    'Service Unit': 'In Use',
    'For Isolation': 'Under Maintenance',
    Repairing: 'Under Maintenance',
  };
  if (raw && uiToSp[raw]) return uiToSp[raw];

  if (prevResolved) return prevResolved;
  return 'Available';
}

const parseFormData = (
  req: AuthRequest
): Promise<{
  fields: Record<string, string>;
  imageFile: { buffer: Buffer; filename: string; mimetype: string } | undefined;
  documents: { buffer: Buffer; filename: string; mimetype: string }[];
}> => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields: Record<string, string> = {};
    let imageFile:
      | { buffer: Buffer; filename: string; mimetype: string }
      | undefined;
    const documents: { buffer: Buffer; filename: string; mimetype: string }[] =
      [];
    let resolved = false;

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve({ fields, imageFile, documents });
      }
    };

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on(
      'file',
      (
        fieldname: string,
        file: any,
        filename: string,
        encoding: string,
        mimetype: string
      ) => {
        if (fieldname === 'image') {
          const chunks: Buffer[] = [];
          file.on('data', (chunk: Buffer) => chunks.push(chunk));
          file.on('end', () => {
            if (chunks.length > 0) {
              imageFile = {
                buffer: Buffer.concat(chunks),
                filename: filename || 'unknown',
                mimetype: mimetype || 'application/octet-stream',
              };
            }
          });
        } else if (fieldname === 'documents') {
          const chunks: Buffer[] = [];
          file.on('data', (chunk: Buffer) => chunks.push(chunk));
          file.on('end', () => {
            if (chunks.length > 0) {
              documents.push({
                buffer: Buffer.concat(chunks),
                filename: filename || 'unknown',
                mimetype: mimetype || 'application/octet-stream',
              });
            }
          });
        } else {
          file.resume(); // Skip unknown files
        }
      }
    );

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

export async function getMyAssetsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    logger.info(`Fetching assets for user: ${userId}`);

    // First, get all active assignments for the current user
    const assetIds = await assetRepo.getActiveAssignmentAssetIdsForUser(userId);

    logger.info(
      `Found ${assetIds.length} active assignments for user ${userId}`
    );

    if (assetIds.length === 0) {
      logger.info(
        `No active assignments found for user ${userId}, returning empty array`
      );
      return res.json({ assets: [] });
    }

    // Get all assets
    const allAssets = await assetRepo.callGetAllAssets();

    // Filter to only include assets assigned to current user
    const myAssets = allAssets.filter((asset: any) =>
      assetIds.includes(asset.assetID)
    );

    logger.info(`Found ${myAssets.length} assets assigned to user ${userId}`);

    if (myAssets.length === 0) {
      logger.warn(
        `No matching assets found in sp_get_assets for user ${userId}`
      );
      return res.json({ assets: [] });
    }

    // Batch fetch documents, current assignments, and history in parallel
    const docRows = await assetRepo.getAssetDocumentsForIds(assetIds);
    const currentAssignmentRows =
      await assetRepo.getCurrentAssignmentsForAssetIds(assetIds);
    const historyRows =
      await assetRepo.getAssignmentHistoryForAssetIds(assetIds);

    // Process and attach data to assets
    for (const asset of myAssets) {
      // Add empty specifications array (child asset specifications removed)
      asset.specifications = [];

      // Add documents
      const assetDocs = docRows.filter(
        (doc: any) => doc.asset_id === asset.assetID
      );
      asset.documents = assetDocs.map((doc: any) => ({
        documentID: doc.documentID,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        createdAt: doc.created_at,
      }));

      // Add current assignment
      const currentAssignment = currentAssignmentRows.find(
        (assignment: any) => assignment.asset_id === asset.assetID
      );
      if (currentAssignment) {
        asset.currentAssignment = {
          assignmentID: currentAssignment.assignmentID,
          user: {
            id: currentAssignment.user_id,
            name: currentAssignment.assigned_user_name,
            email: currentAssignment.assigned_user_email,
            employeeNumber: currentAssignment.employee_number,
            position: currentAssignment.position,
          },
          department: currentAssignment.department_name,
          location: currentAssignment.location_name
            ? `${currentAssignment.location_name}${currentAssignment.room_name ? ` - ${currentAssignment.room_name}` : ''}`
            : null,
          assignedDate: currentAssignment.assigned_date,
          status: currentAssignment.status,
        };
        // Update assignedTo field for backward compatibility
        asset.assignedTo = currentAssignment.assigned_user_name;
        // Keep the original status - assigned assets should show as "Available"
      } else {
        asset.currentAssignment = null;
        asset.assignedTo = null;
      }

      // Add assignment history
      const assetHistory = historyRows.filter(
        (history: any) => history.asset_id === asset.assetID
      );
      asset.assignmentHistory = assetHistory.map((row: any) => ({
        assignmentID: row.assignmentID,
        user: {
          id: row.user_id,
          name: row.assigned_user_name,
          email: row.assigned_user_email,
          employeeNumber: row.employee_number,
          position: row.position,
        },
        department: row.department_name,
        location: row.location_name
          ? `${row.location_name}${row.room_name ? ` - ${row.room_name}` : ''}`
          : null,
        assignedDate: row.assigned_date,
        actualReturnDate: row.actual_return_date,
        status: row.status,
        assignedBy: row.assigned_by_name,
        assignmentNotes: row.assignment_notes,
      }));

      // Check if this asset is a builder and fetch children
      try {
        const builder = await assetRepo.getBuilderByBuilderId(asset.assetID);
        if (builder) {
          const childRows = await assetRepo.getBuilderChildrenByBuilderId(
            asset.assetID
          );
          asset.children = childRows.map(row => ({
            id: row.asset_code,
            name: row.name,
          }));
          asset.isAssetBuilder = true;
          asset.builderStatus = builder.status;
        }
      } catch (childError) {
        logger.warn(
          `Failed to fetch children for asset ${asset.assetID}:`,
          childError
        );
        asset.children = [];
      }

      // Fetch accountability forms for this asset
      try {
        const formRows = await assetRepo.getAccountabilityFormsForAsset(
          asset.assetID
        );
        asset.accountabilityForms = formRows.map(row => ({
          id: row.formID,
          formNumber: row.form_number,
          status: row.status,
          created_at: row.created_at,
          signed_at: row.signed_at,
        }));
      } catch (formError) {
        logger.warn(
          `Failed to fetch accountability forms for asset ${asset.assetID}:`,
          formError
        );
        asset.accountabilityForms = [];
      }
    }

    logger.info(
      `Successfully processed ${myAssets.length} assets for user ${userId}`
    );
    logger.debug('Assets being returned', { first: myAssets[0] });
    return res.json({ assets: myAssets });
  } catch (error: any) {
    logger.error('Get my assets failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userID,
    });
    return res.status(500).json({ error: 'Failed to fetch my assets' });
  }
}

export async function getAssetsHandler(req: AuthRequest, res: Response) {
  try {
    const search = req.query.search
      ? String(req.query.search).toLowerCase()
      : '';

    logger.info(`getAssetsHandler called with search: "${search}", companyId: ${req.query.companyId}, scope: ${req.query.scope}`);

    let assets = await assetRepo.callGetAllAssets();
    logger.info(`Stored procedure returned ${assets.length} total assets`);

    // Filter by search term if provided
    if (search) {
      assets = assets.filter((asset: any) => {
        const searchableText = [
          asset.asset_code,
          asset.name,
          asset.description,
          asset.category_name,
          asset.type_name,
          asset.brand,
          asset.model,
          asset.serial,
          asset.status,
          asset.company_name,
          asset.location_name,
          asset.room_name,
          asset.department,
        ]
          .join(' ')
          .toLowerCase();
        return searchableText.includes(search);
      });
    }

    // Check if user is Super Admin or Admin
    const user = await assetRepo.getUserRoleById(req.user!.userID);
    const normalizedRoleName = String(user?.role_name ?? '').trim().toLowerCase();
    const isSuperAdmin = normalizedRoleName === 'super admin';
    const isAdmin = normalizedRoleName === 'admin';
    const isOverallManager = String(user?.manager_role ?? '').trim() === 'overallManager';

    // Use companyId from query parameter if provided and user is Super Admin or Admin
    const queryCompanyId = req.query.companyId
      ? String(req.query.companyId)
      : null;

    // Accept optional scope query param for IT/Admin tab switching
    const scopeParam = req.query.scope as string | undefined;
    const scopeOverride =
      scopeParam === 'it' || scopeParam === 'admin' ? scopeParam : undefined;

    let companyId: string | null = null;
    let departmentIds: string[] | null = null;

    if (isSuperAdmin || isAdmin || isOverallManager) {
      // For Super Admin, Admin, and overallManager, use query parameter if provided
      if (queryCompanyId) {
        companyId = queryCompanyId;
      } else if (!isSuperAdmin && !isAdmin) {
        // overallManager: use their company
        companyId = user?.company_id ?? null;
      }
      // else Super Admin/Admin with no companyId: show all companies (companyId stays null)

      // Apply scope override if provided
      if (scopeOverride && companyId) {
        departmentIds = await getDepartmentIdsForScope(pool, scopeOverride, companyId);
      } else if (scopeOverride && !companyId) {
        departmentIds = await getDepartmentIdsForScope(pool, scopeOverride);
      } else {
        departmentIds = null;
      }
    } else {
      // For other users, always use role-based scope
      const scope = await getAssetScope(pool, req.user!.userID);
      companyId = scope.companyId;
      departmentIds = scope.departmentIds;
    }

    if (companyId) {
      const currentCompanyAssets = assets.filter(
        (a: any) => a.company_id === companyId
      );
      logger.info(`Found ${currentCompanyAssets.length} assets with company_id = ${companyId}`);
      const transferredOutAssets =
        await getTransferredOutAssetsForCompany(pool, companyId);
      logger.info(`Found ${transferredOutAssets.length} transferred-out assets for company ${companyId}`);
      const currentAssetIds = new Set(
        currentCompanyAssets.map((a: any) => String(a.assetID))
      );
      assets = [
        ...currentCompanyAssets,
        ...(transferredOutAssets.filter(
          (a: any) => !currentAssetIds.has(String(a.assetID))
        ) as any[]),
      ];
      logger.info(`Total assets after merging: ${assets.length}`);
    } else if (!isSuperAdmin && !isAdmin) {
      // If no company is associated and user is not Super Admin or Admin, show nothing
      assets = [];
    }
    // For Super Admin and Admin, when companyId is null, show all assets (no filtering)

    // Separate transferred-out assets before scope filtering so both groups can be
    // evaluated consistently against active scope/category filters.
    const transferredOutAssets = assets.filter(
      (a: any) => a.transferred_out === true
    );
    const nonTransferredOutAssets = assets.filter(
      (a: any) => a.transferred_out !== true
    );

    if (departmentIds && departmentIds.length > 0) {
      // Filter assets solely by the department of their category.
      const categoryIds = await assetRepo.getCategoryIdsByDepartmentIds(departmentIds);

      const toScopedAsset = (asset: any) => ({
        ...asset,
        asset_scope_type: classifyDepartmentScopeByName(asset.department),
      });

      const filteredNonTransferredOut = nonTransferredOutAssets
        .filter((asset: any) => categoryIds.includes(asset.category_id))
        .map(toScopedAsset);

      // Apply same scope/category filtering to transferred-out assets.
      const filteredTransferredOut = transferredOutAssets
        .filter((asset: any) => categoryIds.includes(asset.category_id))
        .map(toScopedAsset);

      assets = [
        ...filteredNonTransferredOut,
        ...filteredTransferredOut,
      ];
    } else {
      // Still expose a scope type for clients even when departmentIds is null
      assets = assets.map((asset: any) => ({
        ...asset,
        asset_scope_type: classifyDepartmentScopeByName(asset.department),
      }));
    }

    const assetIds = assets.map((a: any) => a.assetID);

    if (assetIds.length > 0) {
      // Batch fetch documents for all assets
      const docRows = await assetRepo.getAssetDocumentsForIds(assetIds);

      // Batch fetch current assignments (Active/Reserved), one per asset — take first per asset_id after ordering by assigned_date DESC
      const currentAssignmentRows = await assetRepo.getCurrentAssignmentsForAssetIds(assetIds);

      // Batch fetch assignment history for timeline
      const historyRows = await assetRepo.getAssignmentHistoryForAssetIds(assetIds);

      // Batch fetch builder history (asset_builder_items for these assets)
      const builderHistoryRows = await assetRepo.getBuilderHistoryForAssetIds(assetIds);

      // Which of our assets are builders?
      const builderMetaRows = await assetRepo.getBuilderMetaForAssetIds(assetIds);
      const builderIds = builderMetaRows.map(r => r.builderID);
      const builderStatusById = new Map(
        builderMetaRows.map(r => [r.builderID, r.status])
      );

      // Batch fetch builder children (for assets that are builders)
      const childRows = await assetRepo.getBuilderChildrenForBuilderIds(builderIds);

      // Batch fetch accountability forms by asset_id (list view; JSON_CONTAINS forms can be loaded on detail)
      const formRows = await assetRepo.getAccountabilityFormsForAssetIds(assetIds);

      // Build lookup maps (first current assignment per asset)
      const firstCurrentByAssetId = new Map<number, any>();
      for (const row of currentAssignmentRows as any[]) {
        if (!firstCurrentByAssetId.has(row.asset_id)) {
          firstCurrentByAssetId.set(row.asset_id, row);
        }
      }

      // Attach batch data to each asset
      for (const asset of assets) {
        asset.specifications = [];

        asset.documents = (docRows as any[])
          .filter((d: any) => d.asset_id === asset.assetID)
          .map((doc: any) => ({
            documentID: doc.documentID,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            fileType: doc.file_type,
            createdAt: doc.created_at,
          }));

        const currentAssignment = firstCurrentByAssetId.get(asset.assetID);
        if (currentAssignment) {
          asset.currentAssignment = {
            assignmentID: currentAssignment.assignmentID,
            user: {
              id: currentAssignment.user_id,
              name: currentAssignment.assigned_user_name,
              email: currentAssignment.assigned_user_email,
              employeeNumber: currentAssignment.employee_number,
              position: currentAssignment.position,
            },
            department: currentAssignment.department_name,
            location: currentAssignment.location_name
              ? `${currentAssignment.location_name}${currentAssignment.room_name ? ` - ${currentAssignment.room_name}` : ''}`
              : null,
            assignedDate: currentAssignment.assigned_date,
            status: currentAssignment.status,
          };
          asset.assignedTo = currentAssignment.assigned_user_name;
        } else {
          asset.currentAssignment = null;
          asset.assignedTo = null;
        }

        asset.assignmentHistory = (historyRows as any[])
          .filter((h: any) => h.asset_id === asset.assetID)
          .map((row: any) => ({
            assignmentID: row.assignmentID,
            user: {
              id: row.user_id,
              name: row.assigned_user_name,
              email: row.assigned_user_email,
              employeeNumber: row.employee_number,
              position: row.position,
            },
            department: row.department_name,
            location: row.location_name
              ? `${row.location_name}${row.room_name ? ` - ${row.room_name}` : ''}`
              : null,
            assignedDate: row.assigned_date,
            actualReturnDate: row.actual_return_date,
            status: row.status,
            assignedBy: row.assigned_by_name,
            assignmentNotes: row.assignment_notes,
          }));

        asset.builderHistory = (builderHistoryRows as any[])
          .filter((b: any) => b.asset_id === asset.assetID)
          .map((row: any) => ({
            itemID: row.itemID,
            builderName: row.builder_name,
            builderID: row.builderID,
            addedDate: row.created_at,
            addedBy: row.added_by_name,
          }));

        const builderStatus = builderStatusById.get(asset.assetID);
        if (builderStatus !== undefined) {
          asset.isAssetBuilder = true;
          asset.builderStatus = builderStatus;
          asset.children = childRows
            .filter((c: any) => c.builder_id === asset.assetID)
            .map((row: any) => ({ id: row.asset_code, name: row.name }));
        } else {
          asset.children = [];
        }

        asset.accountabilityForms = (formRows as any[])
          .filter((f: any) => {
            if (f.asset_id === asset.assetID) return true;
            if (f.asset_id === null && f.assets_data) {
              try {
                const data = typeof f.assets_data === 'string' ? JSON.parse(f.assets_data) : f.assets_data;
                return data?.assets?.some((a: any) => a.id === asset.assetID);
              } catch {}
            }
            return false;
          })
          .map((row: any) => ({
            id: row.formID,
            formNumber: row.form_number,
            status: row.status,
            created_at: row.created_at,
            signed_at: row.signed_at,
            assets_data: row.assets_data,
          }));
      }
    } else {
      for (const asset of assets) {
        asset.specifications = [];
        asset.documents = [];
        asset.currentAssignment = null;
        asset.assignedTo = null;
        asset.assignmentHistory = [];
        asset.builderHistory = [];
        asset.children = [];
        asset.accountabilityForms = [];
      }
    }

    logger.debug('Assets being returned', { count: assets.length });
    return res.json({ assets });
  } catch (error: any) {
    logger.error('Get assets failed:', error);
    return res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

export async function createAssetHandler(req: AuthRequest, res: Response) {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'FormData required' });
  }

  const { fields, imageFile, documents } = await parseFormData(req);

  const {
    name,
    description,
    categoryId,
    supplier,
    typeId,
    brand,
    model,
    serial,
    purchaseDate,
    assetValue,
    salvageValue,
    depreciationMethod,
    usefulLifeYears,
    annualDepreciation,
    depreciationStartDate,
    companyId,
    locationId,
    locationRoomId,
    departmentId,
    locationNotes,
    warrantyMonths,
    condition,
    maintenanceSchedule,
    status,
    isOldUnit,
    assignedUser,
  } = fields;

  // Validate fields with DTO schema
  const createValidation = CreateAssetDtoSchema.safeParse({
    ...fields,
    assetValue: fields.assetValue ? Number(fields.assetValue) : undefined,
    salvageValue: fields.salvageValue ? Number(fields.salvageValue) : undefined,
    usefulLifeYears: fields.usefulLifeYears ? Number(fields.usefulLifeYears) : undefined,
    annualDepreciation: fields.annualDepreciation ? Number(fields.annualDepreciation) : undefined,
    warrantyMonths: fields.warrantyMonths ? Number(fields.warrantyMonths) : undefined,
    isOldUnit: fields.isOldUnit === 'true' || fields.isOldUnit === '1',
  });

  if (!createValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: createValidation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // For old units, save default purchase date, no depreciation method
  const finalPurchaseDate = purchaseDate;
  const finalDepreciationMethod = isOldUnit === '1' ? null : depreciationMethod;
  const userId = req.user!.userID;

  if (typeof name !== 'string' || typeof categoryId !== 'string') {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // Validate foreign keys
  logger.info('Validating foreign keys:', {
    companyId,
    locationId,
    locationRoomId,
    departmentId,
  });

  let validCompanyId = null;
  if (companyId) {
    validCompanyId = await assetRepo.getCompanyIdByIdOrName(companyId);
    logger.info(
      `Company validation for ${companyId}: ${validCompanyId ? 'found' : 'not found'}`
    );
  }

  let validLocationId = null;
  if (locationId) {
    validLocationId = await assetRepo.getLocationIdById(locationId);
    logger.info(
      `Location validation for ${locationId}: ${validLocationId ? 'found' : 'not found'}`
    );
  }

  let validLocationRoomId = null;
  if (locationRoomId) {
    validLocationRoomId = await assetRepo.getRoomIdByIdOrName(locationRoomId);
    logger.info(
      `Location room validation for ${locationRoomId}: ${validLocationRoomId ? 'found' : 'not found'}`
    );
  }

  let validDepartmentId = null;
  if (departmentId) {
    validDepartmentId = await assetRepo.getDepartmentIdByIdOrName(departmentId);
    logger.info(
      `Department validation for ${departmentId}: ${validDepartmentId ? 'found' : 'not found'}`
    );
  }

  logger.info('Validation results:', {
    validCompanyId,
    validLocationId,
    validLocationRoomId,
    validDepartmentId,
  });

  // Check if Smart Asset ID Format is configured for the company
  if (validCompanyId) {
    const formatSettings = await assetRepo.getAssetIdFormatSettings(validCompanyId);
    
    if (!formatSettings) {
      logger.warn(
        `Asset creation blocked: Company ${validCompanyId} has no Smart Asset ID Format configured`
      );
      return res.status(400).json({
        error: 'Smart Asset ID Format must be configured in settings before adding assets. Please configure it in Settings > Assets > Smart Asset ID Format.'
      });
    }
  }

  // Handle image upload if provided
  let finalImageUrl = null;
  if (imageFile) {
    try {
      finalImageUrl = await uploadToCloudinary(imageFile.buffer);
      logger.info('Image uploaded successfully:', finalImageUrl);
    } catch (uploadError: any) {
      logger.error('Image upload failed:', uploadError);
      return res.status(502).json({
        error: 'Image upload to Cloudinary failed',
        details: uploadError.message,
      });
    }
  }

  try {
    // Create asset using regular asset creation
    const [rows] = (await pool.execute(
      'CALL sp_create_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        description?.trim() || null,
        categoryId,
        supplier?.trim() || null,
        typeId || null,
        brand?.trim() || null,
        model?.trim() || null,
        serial?.trim() || null,
        finalImageUrl,
        finalPurchaseDate
          ? new Date(finalPurchaseDate).toISOString().split('T')[0]
          : null,
        assetValue || null,
        salvageValue || 0,
        finalDepreciationMethod &&
        [
          'straight-line',
          'declining-balance',
          'double-declining',
          'units-of-production',
        ].includes(finalDepreciationMethod)
          ? finalDepreciationMethod
          : null,
        usefulLifeYears || null,
        annualDepreciation || null,
        depreciationStartDate
          ? new Date(depreciationStartDate).toISOString().split('T')[0]
          : null,
        validCompanyId,
        validLocationId,
        validLocationRoomId,
        validDepartmentId,
        locationNotes?.trim() || null,
        warrantyMonths || null,
        condition || null,
        [
          'Monthly',
          'Quarterly',
          'Semi-Annual',
          'Annually',
          'As Needed',
          'None',
        ].includes(maintenanceSchedule || '')
          ? maintenanceSchedule
          : null,
        normalizeAssetStatusForStoredProcedure(status, null),
        isOldUnit || 0,
        userId,
        userId,
        null, // Let the stored procedure set created_at to NOW()
      ]
    )) as any[];

    const asset = rows[0][0];

    await setAssetOriginatingCompany(
      pool,
      String(asset.assetID),
      validCompanyId ?? asset.company_id ?? null
    );

    // Create audit log for asset creation
    await createAuditLog({
      userId,
      action: 'Created Asset',
      resourceType: 'asset',
      resourceId: asset.asset_code,
      resourceName: asset.name,
      details: `Created new asset with code ${asset.asset_code}`,
      newValues: {
        name: asset.name,
        description: asset.description,
        category_id: asset.category_id,
        type_id: asset.type_id,
        status: asset.status,
        supplier: asset.supplier,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        image_url: asset.image_url,
        purchase_date: asset.purchase_date,
        asset_value: asset.asset_value,
        salvage_value: asset.salvage_value,
        depreciation_method: asset.depreciation_method,
        useful_life_years: asset.useful_life_years,
        annual_depreciation: asset.annual_depreciation,
        depreciation_start_date: asset.depreciation_start_date,
        company_id: asset.company_id,
        location_id: asset.location_id,
        location_room_id: asset.location_room_id,
        department_id: asset.department_id,
        location_notes: asset.location_notes,
        warranty_months: asset.warranty_months,
        condition: asset.condition,
        maintenance_schedule: asset.maintenance_schedule,
        is_old_unit: asset.is_old_unit,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: asset.company_id,
    });

    // Handle document uploads if any
    if (documents && documents.length > 0) {
      if (documents.length > 5) {
        return res
          .status(400)
          .json({ error: 'Maximum 5 documents allowed per asset' });
      }

      for (const doc of documents) {
        try {
          const documentUrl = await uploadDocumentToCloudinary(
            doc.buffer,
            doc.filename
          );
          await pool.execute(
            'CALL sp_create_asset_document(?, ?, ?, ?, ?, ?)',
            [
              asset.assetID,
              doc.filename,
              documentUrl,
              doc.buffer.length,
              doc.mimetype,
              userId,
            ]
          );
        } catch (uploadError) {
          logger.error('Document upload failed:', uploadError);
          // Continue with other documents, don't fail the whole operation
        }
      }
    }

    // Create assignment record if assignedUser is provided, but keep status as Available
    if (assignedUser) {
      try {
        // Validate that the assigned user exists
        const user = await assetRepo.getUserBasicByIdSimple(assignedUser);

        if (user) {
          // Only create assignment if we have valid department, location, and room
          if (validDepartmentId && validLocationId && validLocationRoomId) {
            // Create assignment record with status 'Active', keep asset status as Available
            await assetRepo.executeRawWrite(
              'INSERT INTO asset_assignments (asset_id, user_id, department_id, location_id, location_room_id, status, assigned_by, assignment_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                asset.assetID,
                assignedUser,
                validDepartmentId,
                validLocationId,
                validLocationRoomId,
                'Active',
                userId,
                'Pre-assigned during asset creation',
              ]
            );

            logger.info(
              `Created pre-assignment for asset ${asset.asset_code} to user ${user.first_name} ${user.last_name}`
            );
          } else {
            logger.warn(
              `Cannot create assignment for asset ${asset.asset_code}: missing valid department (${validDepartmentId}), location (${validLocationId}), or room (${validLocationRoomId})`
            );
          }
        } else {
          logger.warn(
            `Assigned user ${assignedUser} not found, skipping assignment creation`
          );
        }
      } catch (assignmentError) {
        logger.error('Assignment creation failed:', assignmentError);
        // Don't fail the asset creation if assignment fails
      }
    }

    return res.status(201).json({
      message: 'Asset created successfully',
      asset: {
        assetID: asset.assetID,
        asset_code: asset.asset_code,
        name: asset.name,
        description: asset.description,
        category_id: asset.category_id,
        supplier: asset.supplier,
        type_id: asset.type_id,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        image_url: asset.image_url,
        purchase_date: asset.purchase_date,
        asset_value: asset.asset_value,
        salvage_value: asset.salvage_value,
        depreciation_method: asset.depreciation_method,
        useful_life_years: asset.useful_life_years,
        annual_depreciation: asset.annual_depreciation,
        depreciation_start_date: asset.depreciation_start_date,
        company_id: asset.company_id,
        location_id: asset.location_id,
        location_room_id: asset.location_room_id,
        department_id: asset.department_id,
        location_notes: asset.location_notes,
        warranty_months: asset.warranty_months,
        condition: asset.condition,
        maintenance_schedule: asset.maintenance_schedule,
        status: asset.status,
        is_old_unit: asset.is_old_unit,
        created_at: asset.created_at,
        created_by: asset.created_by,
        updated_at: asset.updated_at,
        updated_by: asset.updated_by,
        specifications: [],
      },
    });
  } catch (error: any) {
    logger.error('Create asset failed:', error);
    return res.status(500).json({ error: 'Failed to create asset' });
  }
}

/**
 * PUBLIC asset lookup (no auth) — used by the QR-code "asset details" page
 * scanned by visitors / employees off the network. Returns ONLY safe,
 * non-PII fields. The full handler (`getAssetByCodeHandler`) below is
 * authenticated and returns assignment user info, financials, audit
 * metadata, etc.
 *
 * Whitelist applied here (everything else stripped):
 *   - identification:  asset_code, name, image_url, description
 *   - classification:  category_name, type_name, brand, model, serial,
 *                      condition, status, is_old_unit
 *   - location:        company_name + logo, building, location_name,
 *                      room_name (no department / room IDs)
 *   - lifecycle:       warranty_months, maintenance_schedule
 *   - presence flag:   currentlyAssigned (boolean only — NO user info)
 *
 * Stripped (security-relevant): asset_value, salvage_value, depreciation_*,
 * purchase_date, supplier, assignment user (id, name, email, employee
 * number, position), assignment history, accountability forms, audit
 * authors (created_by / updated_by), child / builder relationships.
 */
export async function getAssetPublicHandler(req: Request, res: Response) {
  try {
    const { assetCode: rawAssetCode } = req.params;
    if (!rawAssetCode) {
      return res.status(400).json({ error: 'Asset code is required' });
    }
    const assetCode = decodeURIComponent(rawAssetCode);

    const assets = await assetRepo.callGetAllAssets();
    const asset = assets.find(
      (a: any) =>
        String(a.asset_code).toUpperCase() === assetCode.toUpperCase()
    );

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Has the asset been issued to someone? Return a boolean so the QR page
    // can show "Currently in use" without exposing who.
    const currentAssignment = await assetRepo.getCurrentAssignmentForAssetId(asset.assetID);
    const currentlyAssigned = currentAssignment !== null;

    return res.json({
      assets: [
        {
          asset_code: asset.asset_code,
          name: asset.name,
          image_url: asset.image_url ?? null,
          description: asset.description ?? null,
          category_name: asset.category_name ?? null,
          type_name: asset.type_name ?? null,
          brand: asset.brand ?? null,
          model: asset.model ?? null,
          serial: asset.serial ?? null,
          condition: asset.condition,
          status: asset.status,
          is_old_unit: asset.is_old_unit,
          warranty_months: asset.warranty_months ?? null,
          maintenance_schedule: asset.maintenance_schedule ?? null,
          company_name: asset.company_name ?? null,
          company_logo_url: asset.company_logo_url ?? null,
          building: asset.building ?? null,
          location_name: asset.location_name ?? null,
          room_name: asset.room_name ?? null,
          currentlyAssigned,
        },
      ],
    });
  } catch (error: any) {
    logger.error('Get public asset by code failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset' });
  }
}

export async function getAssetByCodeHandler(req: any, res: Response) {
  try {
    const { assetCode: rawAssetCode } = req.params;

    if (!rawAssetCode) {
      return res.status(400).json({ error: 'Asset code is required' });
    }
    const assetCode = decodeURIComponent(rawAssetCode);

    // Get the asset by code - don't filter out assets in builders for individual asset lookup
    const assets = await assetRepo.callGetAllAssets();

    // Only filter out assets in builders if this is not a specific asset request
    // For individual asset lookup, we want to show all assets including those in builders
    const asset = assets.find(
      (a: any) =>
        String(a.asset_code).toUpperCase() === assetCode.toUpperCase()
    );

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Fetch documents and current assignments for the asset
    // Add empty specifications array (child asset specifications removed)
    asset.specifications = [];

    try {
      const docRows = await assetRepo.getAssetDocumentsByAssetId(asset.assetID);
      asset.documents = docRows.map((doc: any) => ({
        documentID: doc.documentID,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileSize: doc.file_size,
        fileType: doc.file_type,
        createdAt: doc.created_at,
      }));
    } catch (docError) {
      logger.warn(`Failed to fetch documents for asset ${asset.assetID}:`, docError);
      asset.documents = [];
    }

    // Get current active or reserved assignment
    try {
      const assignment = await assetRepo.getCurrentAssignmentForAssetId(asset.assetID);

      if (assignment) {
        asset.currentAssignment = {
          assignmentID: assignment.assignmentID,
          user: {
            id: assignment.user_id,
            name: assignment.assigned_user_name,
            email: assignment.assigned_user_email,
            employeeNumber: assignment.employee_number,
            position: assignment.position,
          },
          department: assignment.department_name,
          location: assignment.location_name
            ? `${assignment.location_name}${assignment.room_name ? ` - ${assignment.room_name}` : ''}`
            : null,
          assignedDate: assignment.assigned_date,
          status: assignment.status,
        };
        // Update assignedTo field for backward compatibility
        asset.assignedTo = assignment.assigned_user_name;
        // Keep the original status - assigned assets should show as "Available"
      } else {
        asset.currentAssignment = null;
        asset.assignedTo = null;
        // Keep the original status if no assignment
      }
    } catch (assignError) {
      logger.warn(`Failed to fetch assignment for asset ${asset.assetID}:`, assignError);
      asset.currentAssignment = null;
      asset.assignedTo = null;
    }

    // Add assignment history for timeline
    try {
      const historyRows = await assetRepo.getAssignmentHistoryForAssetId(asset.assetID);
      asset.assignmentHistory = historyRows.map((row: any) => ({
        assignmentID: row.assignmentID,
        user: {
          id: row.user_id,
          name: row.assigned_user_name,
          email: row.assigned_user_email,
          employeeNumber: row.employee_number,
          position: row.position,
        },
        department: row.department_name,
        location: row.location_name
          ? `${row.location_name}${row.room_name ? ` - ${row.room_name}` : ''}`
          : null,
        assignedDate: row.assigned_date,
        actualReturnDate: row.actual_return_date,
        status: row.status,
        assignedBy: row.assigned_by_name,
        assignmentNotes: row.assignment_notes,
      }));
    } catch (historyError) {
      logger.warn(`Failed to fetch assignment history for asset ${asset.assetID}:`, historyError);
      asset.assignmentHistory = [];
    }

    // Get builder history for timeline
    try {
      const builderRows = await assetRepo.getBuilderHistoryForAsset(asset.assetID);
      asset.builderHistory = builderRows.map((row: any) => ({
        itemID: row.itemID,
        builderName: row.builder_name,
        builderID: row.builderID,
        addedDate: row.created_at,
        addedBy: row.added_by_name,
      }));
    } catch (builderError) {
      logger.warn(
        `Failed to fetch builder history for asset ${asset.assetID}:`,
        builderError
      );
      asset.builderHistory = [];
    }

    // Check if this asset is a builder and fetch children
    try {
      const builder = await assetRepo.getBuilderByAssetId(asset.assetID);
      if (builder) {
        // It's a builder, fetch children
        const childRows = await assetRepo.getBuilderChildrenByBuilderId(builder.builderID);
        asset.children = childRows.map((row: any) => ({
          id: row.asset_code,
          name: row.name,
        }));
        asset.isAssetBuilder = true;
        // Set the builder status
        asset.builderStatus = builder.status;
      }
    } catch (childError) {
      logger.warn(
        `Failed to fetch children for asset ${asset.assetID}:`,
        childError
      );
      asset.children = [];
    }

    // Fetch accountability forms for this asset
    try {
      const formRows = await assetRepo.getAccountabilityFormsForAssetWithLike(asset.assetID);
      asset.accountabilityForms = formRows.map((row: any) => ({
        id: row.formID,
        formNumber: row.form_number,
        status: row.status,
        created_at: row.created_at,
        signed_at: row.signed_at,
      }));
    } catch (formError) {
      logger.warn(
        `Failed to fetch accountability forms for asset ${asset.assetID}:`,
        formError
      );
      asset.accountabilityForms = [];
    }

    return res.json({ assets: [asset] });
  } catch (error: any) {
    logger.error('Get asset by code failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset' });
  }
}

export async function updateAssetHandler(req: AuthRequest, res: Response) {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'FormData required' });
  }

  const { fields, imageFile, documents } = await parseFormData(req);
  const { assetId } = req.params;
  const userId = req.user!.userID;

  const {
    name,
    description,
    categoryId,
    supplier,
    typeId,
    brand,
    model,
    serial,
    purchaseDate,
    assetValue,
    salvageValue,
    depreciationMethod,
    usefulLifeYears,
    annualDepreciation,
    depreciationStartDate,
    companyId,
    locationId,
    locationRoomId,
    departmentId,
    locationNotes,
    warrantyMonths,
    condition,
    maintenanceSchedule,
    status,
    isOldUnit,
    assignedUser,
  } = fields;

  // Validate fields with DTO schema
  const updateValidation = UpdateAssetDtoSchema.safeParse({
    assetId,
    ...fields,
    assetValue: fields.assetValue ? Number(fields.assetValue) : undefined,
    salvageValue: fields.salvageValue ? Number(fields.salvageValue) : undefined,
    usefulLifeYears: fields.usefulLifeYears ? Number(fields.usefulLifeYears) : undefined,
    annualDepreciation: fields.annualDepreciation ? Number(fields.annualDepreciation) : undefined,
    warrantyMonths: fields.warrantyMonths ? Number(fields.warrantyMonths) : undefined,
    isOldUnit: fields.isOldUnit === 'true' || fields.isOldUnit === '1',
  });

  if (!updateValidation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: updateValidation.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // For old units, save default purchase date, no depreciation method
  const finalPurchaseDate = purchaseDate;
  const finalDepreciationMethod = isOldUnit === '1' ? null : depreciationMethod;

  if (typeof name !== 'string' || typeof categoryId !== 'string') {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // Validate that asset exists
  const asset = await assetRepo.getAssetByCodeForAssign(assetId!);

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Validate foreign keys
  logger.info('Validating foreign keys for update:', {
    companyId,
    locationId,
    locationRoomId,
    departmentId,
  });

  let validCompanyId = null;
  if (companyId) {
    validCompanyId = await assetRepo.getCompanyIdByIdOrName(companyId);
    logger.info(
      `Company validation for ${companyId}: ${validCompanyId ? 'found' : 'not found'}`
    );
  }

  let validLocationId = null;
  if (locationId) {
    validLocationId = await assetRepo.getLocationIdById(locationId);
    logger.info(
      `Location validation for ${locationId}: ${validLocationId ? 'found' : 'not found'}`
    );
  }

  let validLocationRoomId = null;
  if (locationRoomId) {
    validLocationRoomId = await assetRepo.getRoomIdByIdOrName(locationRoomId);
    logger.info(
      `Location room validation for ${locationRoomId}: ${validLocationRoomId ? 'found' : 'not found'}`
    );
  }

  let validDepartmentId = null;
  if (departmentId) {
    validDepartmentId = await assetRepo.getDepartmentIdByIdOrName(departmentId);
    logger.info(
      `Department validation for ${departmentId}: ${validDepartmentId ? 'found' : 'not found'}`
    );
  }

  logger.info('Validation results for update:', {
    validCompanyId,
    validLocationId,
    validLocationRoomId,
    validDepartmentId,
  });

  // Get old values before update for audit logging
  const oldAsset = await assetRepo.getAssetForUpdateById(asset.assetID);
  if (!oldAsset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Preserve FKs when client omits or fails to resolve them (sp_update_asset overwrites with NULL)
  if (!validCompanyId) {
    validCompanyId = oldAsset.company_id ?? null;
  }
  if (!validLocationId) {
    validLocationId = oldAsset.location_id ?? null;
  }
  if (!validLocationRoomId) {
    validLocationRoomId = oldAsset.location_room_id ?? null;
  }
  if (!validDepartmentId) {
    validDepartmentId = oldAsset.department_id ?? null;
  }

  // Handle image upload if provided
  let finalImageUrl = oldAsset.image_url;
  if (imageFile) {
    try {
      finalImageUrl = await uploadToCloudinary(imageFile.buffer);
      logger.info('Image uploaded successfully:', finalImageUrl);
    } catch (uploadError: any) {
      logger.error('Image upload failed:', uploadError);
      return res.status(502).json({
        error: 'Image upload to Cloudinary failed',
        details: uploadError.message,
      });
    }
  }

  try {
    // Check if category or type has changed to determine if we need to update the asset code
    const categoryChanged = oldAsset.category_id !== categoryId;
    const typeChanged = oldAsset.type_id !== typeId;

    // Check if isOldUnit status has changed
    const isOldUnitChanged = oldAsset.is_old_unit !== (isOldUnit || 0);

    let updatedAsset;

    if (categoryChanged || typeChanged || isOldUnitChanged) {
      // Category, type, or isOldUnit status changed, update asset code using the new stored procedure
      const [codeUpdateRows] = (await pool.execute(
        'CALL sp_update_asset_code(?, ?, ?, ?, ?)',
        [
          asset.assetID,
          categoryId,
          typeId || null,
          validDepartmentId || oldAsset.department_id,
          userId,
        ]
      )) as any[];

      updatedAsset = codeUpdateRows[0][0];

      // Now update the other asset fields
      const [updateRows] = (await pool.execute(
        'CALL sp_update_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          asset.assetID,
          name.trim(),
          description?.trim() || null,
          categoryId,
          supplier?.trim() || null,
          typeId || null,
          brand?.trim() || null,
          model?.trim() || null,
          serial?.trim() || null,
          finalImageUrl,
          finalPurchaseDate
            ? new Date(finalPurchaseDate).toISOString().split('T')[0]
            : null,
          assetValue || null,
          salvageValue || 0,
          finalDepreciationMethod &&
          [
            'straight-line',
            'declining-balance',
            'double-declining',
            'units-of-production',
          ].includes(finalDepreciationMethod)
            ? finalDepreciationMethod
            : null,
          usefulLifeYears || null,
          annualDepreciation || null,
          depreciationStartDate
            ? new Date(depreciationStartDate).toISOString().split('T')[0]
            : null,
          validCompanyId,
          validLocationId,
          validLocationRoomId,
          validDepartmentId,
          locationNotes?.trim() || null,
          warrantyMonths || null,
          ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].includes(
            condition || ''
          )
            ? condition
            : 'Good',
          [
            'Monthly',
            'Quarterly',
            'Semi-Annual',
            'Annually',
            'As Needed',
            'None',
          ].includes(maintenanceSchedule || '')
            ? maintenanceSchedule
            : 'None',
          normalizeAssetStatusForStoredProcedure(status, oldAsset.status),
          isOldUnit || 0,
          userId,
        ]
      )) as any[];

      updatedAsset = updateRows[0][0];
    } else {
      // No category or type change, use regular update
      const [rows] = (await pool.execute(
        'CALL sp_update_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          asset.assetID,
          name.trim(),
          description?.trim() || null,
          categoryId,
          supplier?.trim() || null,
          typeId || null,
          brand?.trim() || null,
          model?.trim() || null,
          serial?.trim() || null,
          finalImageUrl,
          finalPurchaseDate
            ? new Date(finalPurchaseDate).toISOString().split('T')[0]
            : null,
          assetValue || null,
          salvageValue || 0,
          finalDepreciationMethod &&
          [
            'straight-line',
            'declining-balance',
            'double-declining',
            'units-of-production',
          ].includes(finalDepreciationMethod)
            ? finalDepreciationMethod
            : null,
          usefulLifeYears || null,
          annualDepreciation || null,
          depreciationStartDate
            ? new Date(depreciationStartDate).toISOString().split('T')[0]
            : null,
          validCompanyId,
          validLocationId,
          validLocationRoomId,
          validDepartmentId,
          locationNotes?.trim() || null,
          warrantyMonths || null,
          ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].includes(
            condition || ''
          )
            ? condition
            : 'Good',
          [
            'Monthly',
            'Quarterly',
            'Semi-Annual',
            'Annually',
            'As Needed',
            'None',
          ].includes(maintenanceSchedule || '')
            ? maintenanceSchedule
            : 'None',
          normalizeAssetStatusForStoredProcedure(status, oldAsset.status),
          isOldUnit || 0,
          userId,
        ]
      )) as any[];

      updatedAsset = rows[0][0];
    }

    const auditDiff = buildAssetUpdateAuditDiff(
      oldAsset as Record<string, unknown>,
      updatedAsset as Record<string, unknown>
    );
    const hasFieldChanges = auditDiff.changeCount > 0;

    await createAuditLog({
      userId,
      action: 'Updated Asset',
      resourceType: 'asset',
      resourceId: asset.asset_code || updatedAsset.asset_code || String(asset.assetID),
      resourceName: asset.asset_code || updatedAsset.asset_code || String(asset.assetID),
      details: hasFieldChanges
        ? `Updated ${auditDiff.changeCount} field(s)`
        : 'Updated asset details',
      oldValues: hasFieldChanges ? auditDiff.oldValues : undefined,
      newValues: hasFieldChanges ? auditDiff.newValues : undefined,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: updatedAsset.company_id,
    });

    // Handle document uploads if any
    if (documents && documents.length > 0) {
      if (documents.length > 5) {
        return res
          .status(400)
          .json({ error: 'Maximum 5 documents allowed per asset' });
      }

      for (const doc of documents) {
        try {
          const documentUrl = await uploadDocumentToCloudinary(
            doc.buffer,
            doc.filename
          );
          await pool.execute(
            'CALL sp_create_asset_document(?, ?, ?, ?, ?, ?)',
            [
              asset.assetID,
              doc.filename,
              documentUrl,
              doc.buffer.length,
              doc.mimetype,
              userId,
            ]
          );
        } catch (uploadError) {
          logger.error('Document upload failed:', uploadError);
          // Continue with other documents, don't fail the whole operation
        }
      }
    }

    // Handle assignment updates if assignedUser is provided
    if (assignedUser) {
      try {
        // Validate that the assigned user exists
        const user = await assetRepo.getUserBasicByIdSimple(assignedUser);

        if (user) {
          // Deactivate existing assignments
          await assetRepo.executeRawWrite(
            'UPDATE asset_assignments SET status = "Returned", actual_return_date = NOW() WHERE asset_id = ? AND status = "Active"',
            [asset.assetID]
          );

          // Only create new assignment if we have valid department, location, and room
          if (validDepartmentId && validLocationId && validLocationRoomId) {
            // Create new assignment record with status 'Active'
            await assetRepo.executeRawWrite(
              'INSERT INTO asset_assignments (asset_id, user_id, department_id, location_id, location_room_id, status, assigned_by, assignment_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                asset.assetID,
                assignedUser,
                validDepartmentId,
                validLocationId,
                validLocationRoomId,
                'Active',
                userId,
                'Updated assignment during asset edit',
              ]
            );

            logger.info(
              `Updated assignment for asset ${asset.asset_code} to user ${user.first_name} ${user.last_name}`
            );
          } else {
            logger.warn(
              `Cannot create assignment for asset ${asset.asset_code}: missing valid department (${validDepartmentId}), location (${validLocationId}), or room (${validLocationRoomId})`
            );
          }
        } else {
          logger.warn(
            `Assigned user ${assignedUser} not found, skipping assignment creation`
          );
        }
      } catch (assignmentError) {
        logger.error('Assignment update failed:', assignmentError);
        // Don't fail the asset update if assignment fails
      }
    }

    return res.json({
      message: 'Asset updated successfully',
      asset: {
        assetID: updatedAsset.assetID,
        asset_code: updatedAsset.asset_code,
        name: updatedAsset.name,
        description: updatedAsset.description,
        category_id: updatedAsset.category_id,
        supplier: updatedAsset.supplier,
        type_id: updatedAsset.type_id,
        brand: updatedAsset.brand,
        model: updatedAsset.model,
        serial: updatedAsset.serial,
        image_url: updatedAsset.image_url,
        purchase_date: updatedAsset.purchase_date,
        asset_value: updatedAsset.asset_value,
        salvage_value: updatedAsset.salvage_value,
        depreciation_method: updatedAsset.depreciation_method,
        useful_life_years: updatedAsset.useful_life_years,
        annual_depreciation: updatedAsset.annual_depreciation,
        depreciation_start_date: updatedAsset.depreciation_start_date,
        company_id: updatedAsset.company_id,
        location_id: updatedAsset.location_id,
        location_room_id: updatedAsset.location_room_id,
        department_id: updatedAsset.department_id,
        location_notes: updatedAsset.location_notes,
        warranty_months: updatedAsset.warranty_months,
        condition: updatedAsset.condition,
        maintenance_schedule: updatedAsset.maintenance_schedule,
        status: updatedAsset.status,
        is_old_unit: updatedAsset.is_old_unit,
        created_at: updatedAsset.created_at,
        created_by: updatedAsset.created_by,
        updated_at: updatedAsset.updated_at,
        updated_by: updatedAsset.updated_by,
        specifications: [],
      },
    });
  } catch (error: any) {
    logger.error('Update asset failed:', error);
    return res.status(500).json({ error: 'Failed to update asset' });
  }
}

export async function assignAssetHandler(req: AuthRequest, res: Response) {
  try {
    const { assetId } = req.params;
    const { departmentId, locationId, assignedTo } = req.body;
    const userId = req.user!.userID;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Validate that asset exists
    const asset = await assetRepo.getAssetByCodeForAssign(assetId);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Validate foreign keys if provided
    if (departmentId) {
      const dept = await assetRepo.getDepartmentById(departmentId);
      if (!dept) {
        return res.status(400).json({ error: 'Invalid department' });
      }
    }

    if (locationId) {
      const loc = await assetRepo.getLocationById(locationId);
      if (!loc) {
        return res.status(400).json({ error: 'Invalid location' });
      }
    }

    if (assignedTo) {
      const user = await assetRepo.getUserBasicByIdSimple(assignedTo);
      if (!user) {
        return res.status(400).json({ error: 'Invalid user' });
      }
    }

    // Update asset assignment
    const updateFields = [];
    const updateValues = [];

    if (departmentId !== undefined) {
      updateFields.push('department_id = ?');
      updateValues.push(departmentId);
    }

    if (locationId !== undefined) {
      updateFields.push('location_id = ?');
      updateValues.push(locationId);
    }

    if (assignedTo !== undefined) {
      // Note: assignedTo might be stored in a separate assignment table in the future
      // For now, we'll store it in a comment or note field, or create a simple assignment tracking
    }

    if (updateFields.length > 0) {
      // Get old values before update for audit logging
      const oldAsset = await assetRepo.getAssetForUpdateById(asset.assetID);
      if (!oldAsset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const oldValues = {
        department_id: oldAsset.department_id,
        location_id: oldAsset.location_id,
      };

      updateFields.push('updated_by = ?');
      updateValues.push(userId);

      const query = `UPDATE assets SET ${updateFields.join(', ')}, updated_at = NOW() WHERE assetID = ?`;
      updateValues.push(asset.assetID);

      await assetRepo.executeRawWrite(query, updateValues);

      // Create audit log for asset assignment/update
      const newValues: any = {};
      if (departmentId !== undefined) newValues.department_id = departmentId;
      if (locationId !== undefined) newValues.location_id = locationId;

      await createAuditLog({
        userId,
        action: 'Updated Asset',
        resourceType: 'asset',
        resourceId: assetId,
        resourceName: assetId,
        details: 'Asset assignment/location updated',
        oldValues,
        newValues,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    return res.json({ message: 'Asset assigned successfully' });
  } catch (error: any) {
    logger.error('Asset assignment failed:', error);
    return res.status(500).json({ error: 'Failed to assign asset' });
  }
}

export async function getAllFormsByAssetIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId } = req.params;
    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Import repository functions
    const accountabilityFormsRepo = await import('../repositories/accountabilityForm.repository.js');
    const returnFormsRepo = await import('../repositories/assetReturn.repository.js');
    const transferFormsRepo = await import('../repositories/assetTransferForm.repository.js');
    const borrowFormsRepo = await import('../repositories/assetBorrowRequests.repository.js');

    // Fetch accountability forms with proper mapping
    const accountabilityRows = await accountabilityFormsRepo.findFormsByAssetId(assetId);
    
    // Map accountability forms to match frontend expectations
    const accountabilityForms = accountabilityRows.map((row: any) => {
      return {
        id: row.formID,
        formNumber: row.form_number,
        status: row.status,
        created_at: row.created_at,
        signed_at: row.signed_at,
        assets_data: row.assets_data,
        user: {
          id: row.user_id,
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          email: row.email || '',
        },
        department: row.user_department_name ? {
          id: row.user_department_id,
          name: row.user_department_name,
        } : null,
        location: row.location_name ? {
          id: row.location_id,
          name: row.location_name,
        } : null,
        received_copy_wet_pdf_url: row.received_copy_wet_pdf_url || null,
      };
    });

    // Fetch other form types (return empty arrays for now due to schema limitations)
    const returnForms = await returnFormsRepo.getReturnFormsByAssetId(assetId);
    const transferForms = await transferFormsRepo.getTransferFormsByAssetId(assetId);
    const borrowForms = await borrowFormsRepo.getBorrowFormsByAssetId(pool, assetId);

    return res.json({
      accountabilityForms,
      returnForms,
      transferForms,
      borrowForms,
    });
  } catch (error: any) {
    logger.error('Get all forms by asset ID failed:', error);
    return res.status(500).json({ error: 'Failed to fetch forms' });
  }
}

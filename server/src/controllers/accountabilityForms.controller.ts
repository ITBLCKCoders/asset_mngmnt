import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as repo from '../repositories/accountabilityForm.repository.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import { declineAccountabilityFormBodySchema } from '../dtos/accountabilityForms/DeclineAccountabilityFormDto.js';
import { applyReturnAssignmentSideEffectsOnConnection } from '../utils/returnAssignmentSideEffects.js';
import { signedRawUrlFromStoredSecureUrl } from '../utils/cloudinary.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { createNotificationForApi } from '../utils/notificationsApi.js';
import { getHrAccountabilityReceiverUserIds } from '../utils/approverNotifications.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';
import { randomUUID } from 'crypto';
import { resolveChecklistAssignmentIds } from '../utils/accountabilityFormAssetsData.js';
import { isComputerTypeName } from '../utils/computerTypeAsset.js';
import * as assignmentRepo from '../repositories/assetAssignment.repository.js';
import { getManagerApprover1UserIdsInDepartmentAndCompany } from '../utils/approverNotifications.js';

async function userHasHrAccountabilityReceiverAccess(
  userId: string
): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT 1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (r.hr_accountability_receiver = 1 OR COALESCE(uc.hr_accountability_receiver, 0) = 1)
     LIMIT 1`,
    [userId]
  )) as [unknown[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

async function userCanViewAccountabilityFormRow(
  row: { user_id: string; created_by: string | null },
  currentUserId: string
): Promise<boolean> {
  if (row.user_id === currentUserId || row.created_by === currentUserId) {
    return true;
  }
  if (await userHasHrAccountabilityFullAccess(currentUserId)) {
    return true;
  }
  if (await userHasHrAccountabilityReceiverAccess(currentUserId)) {
    return true;
  }
  const perms = await repo.getUserAccountabilityFormPermissions(currentUserId);
  return perms.some(p => p.granted === 1);
}

async function userHasHrAccountabilityFullAccess(
  userId: string
): Promise<boolean> {
  const rows = await repo.getUserAccountabilityFormPermissions(userId);
  let create = false;
  let edit = false;
  let del = false;
  for (const row of rows) {
    if (row.granted !== 1) continue;
    if (row.permission_type === 'create') create = true;
    if (row.permission_type === 'edit') edit = true;
    if (row.permission_type === 'delete') del = true;
  }
  return create && edit && del;
}

/**
 * MySQL2 may return JSON columns as parsed objects, strings, or Buffers depending on config.
 * Calling JSON.parse on an object stringifies it to "[object Object]" and throws.
 */
function parseMysqlJsonColumn<T = unknown>(value: unknown): T | null {
  if (value == null || value === '') return null;
  if (Buffer.isBuffer(value)) {
    try {
      const s = value.toString('utf8');
      if (!s) return null;
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveSigningDigitalSignature(
  userId: string,
  preferredSignature?: string | null
): Promise<string | null> {
  const preferred =
    preferredSignature != null && String(preferredSignature).trim() !== ''
      ? String(preferredSignature).trim()
      : '';
  if (preferred) {
    return preferred;
  }

  const [userRows] = (await pool.query(
    `SELECT digital_signature FROM users WHERE userID = ? LIMIT 1`,
    [userId]
  )) as [{ digital_signature?: string | null }[], unknown];
  const fromUser = userRows[0]?.digital_signature;
  return fromUser != null && String(fromUser).trim() !== ''
    ? String(fromUser).trim()
    : null;
}

async function notifyChecklistApproversAfterEmployeeSign(params: {
  employeeId: string;
  formId: string;
  signedCount: number;
}): Promise<void> {
  const { employeeId, formId, signedCount } = params;
  if (signedCount <= 0) {
    return;
  }

  const [empRows] = (await pool.query(
    `SELECT department_id, company_id, name, first_name, last_name
     FROM users WHERE userID = ? LIMIT 1`,
    [employeeId]
  )) as [
    {
      department_id: string | null;
      company_id: string | null;
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    }[],
    unknown,
  ];
  const emp = empRows[0];
  const departmentId = emp?.department_id ?? null;
  const companyId = emp?.company_id ?? null;

  if (!departmentId || !companyId) {
    return;
  }

  const approverIds = await getManagerApprover1UserIdsInDepartmentAndCompany(
    departmentId,
    companyId
  );
  const employeeName =
    [emp?.first_name, emp?.last_name].filter(Boolean).join(' ').trim() ||
    emp?.name ||
    'An employee';

  for (const approverUserId of approverIds) {
    if (approverUserId === employeeId) continue;
    await createNotificationForApi({
      user_id: approverUserId,
      title: 'Asset Checklist Approval Needed',
      message: `${employeeName} signed ${signedCount} asset checklist${signedCount !== 1 ? 's' : ''} and requires your approval.`,
      type: 'system',
      data: {
        route: '/approvals',
        actionTarget: 'checklist_approval',
        form_id: formId,
        employee_id: employeeId,
        employee_name: employeeName,
        checklist_count: signedCount,
      },
    });
  }
}

async function signLinkedChecklistsForAccountabilityForm(params: {
  formId: string;
  formNumber: string | null;
  assetsDataRaw: unknown;
  fallbackAssignmentId: string | null;
  userId: string;
  employeeId: string;
  digitalSignature: string | null;
  req: AuthRequest;
}): Promise<number> {
  const {
    formId,
    formNumber,
    assetsDataRaw,
    fallbackAssignmentId,
    userId,
    employeeId,
    digitalSignature,
    req,
  } = params;

  const assignmentIds = await resolveChecklistAssignmentIds({
    assetsDataRaw,
    fallbackAssignmentId,
    userId,
    getActiveAssignmentIdsByAssetIds:
      assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
    getActiveAssignmentIdsByAssetCodes:
      assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
    isComputerType: isComputerTypeName,
  });

  const checklists =
    await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);
  const unsigned = checklists.filter(
    (c: { employee_signed_at?: string | null }) => !c.employee_signed_at
  );
  const allChecklistIds = checklists.map((c: { id: string }) => c.id);

  if (allChecklistIds.length === 0) {
    return 0;
  }

  let signedCount = 0;
  if (unsigned.length > 0) {
    signedCount = await checklistRepo.signChecklistsAsEmployee({
      checklistIds: unsigned.map((c: { id: string }) => c.id),
      employeeId,
      digitalSignature,
    });
  }

  if (digitalSignature) {
    signedCount += await checklistRepo.backfillEmployeeChecklistSignatures({
      checklistIds: allChecklistIds,
      employeeId,
      digitalSignature,
    });
  }

  if (signedCount === 0) {
    return 0;
  }

  try {
    await notifyChecklistApproversAfterEmployeeSign({
      employeeId,
      formId,
      signedCount,
    });
  } catch (notifError) {
    logger.error('Failed to notify checklist approvers:', notifError);
  }

  await createAuditLog({
    userId: employeeId,
    action: 'Signed Asset Checklists',
    resourceType: 'accountability_form',
    resourceId: formId,
    resourceName: formNumber ?? formId,
    details: `Signed ${signedCount} asset checklist(s) for accountability form`,
    newValues: {
      signed_checklist_count: signedCount,
      checklist_ids: unsigned.map((c: { id: string }) => c.id),
    },
    ipAddress: req.ip,
    userAgent: req.get ? req.get('User-Agent') : 'Unknown',
  });

  return signedCount;
}

/** Stored inside `assets_data` JSON alongside `assets` (not shown in PDF tables). */
type AccountabilityFormOrigin = 'processor_return';

function parseAccountabilityAssetsData(assetsDataRaw: unknown): {
  assets: any[];
  assignmentIds: string[];
  formOrigin?: AccountabilityFormOrigin;
} {
  const assets: any[] = [];
  const assignmentIds: string[] = [];
  if (assetsDataRaw == null || assetsDataRaw === '') {
    return { assets, assignmentIds };
  }
  try {
    const raw =
      Buffer.isBuffer(assetsDataRaw)
        ? assetsDataRaw.toString('utf8')
        : assetsDataRaw;
    const assetsData =
      typeof raw === 'string'
        ? JSON.parse(raw)
        : typeof raw === 'object'
          ? (raw as Record<string, unknown>)
          : null;
    if (
      assetsData &&
      Array.isArray((assetsData as { assets?: unknown }).assets)
    ) {
      for (const a of (assetsData as { assets: any[] }).assets) {
        assets.push(a);
      }
    }
    const rawAssignmentIds = (assetsData as { assignment_ids?: unknown })
      ?.assignment_ids;
    if (Array.isArray(rawAssignmentIds)) {
      for (const id of rawAssignmentIds) {
        const assignmentId = String(id ?? '').trim();
        if (assignmentId) {
          assignmentIds.push(assignmentId);
        }
      }
    }
    const fo = (assetsData as { form_origin?: unknown })?.form_origin;
    if (fo === 'processor_return') {
      return {
        assets,
        assignmentIds: [...new Set(assignmentIds)],
        formOrigin: 'processor_return',
      };
    }
  } catch {
    /* ignore */
  }
  return { assets, assignmentIds: [...new Set(assignmentIds)] };
}

// Helper function to generate form number based on settings
async function generateFormNumber(
  companyId: string,
  assets: any[],
  departmentId?: string
): Promise<string> {
  // Fetch accountability form settings
  const settings = await repo.getAccountabilityFormSettings(companyId);

  // Block form creation if no settings exist for the company
  if (!settings) {
    throw new Error(
      'Please configure your company asset accountability form number first or contact system administrator'
    );
  }

  // Get company info
  const company = await repo.getCompanyCodePrefix(companyId);

  // Get department info if department_format is not 'none'
  let department: { code: string | null; prefix: string | null } | null = null;
  if (settings?.department_format !== 'none' && departmentId) {
    department = await repo.getDepartmentCodePrefix(departmentId);
  }

  // Determine if assets are IT or Admin based on asset category's department first
  const deptName = (asset: any) =>
    (asset.department || asset.categoryDepartment || '')
      .toString()
      .toLowerCase();
  const isITByDept = assets.some(
    (asset: any) =>
      deptName(asset).includes('it') ||
      deptName(asset).includes('information technology')
  );
  const isAdminByDept = assets.some(
    (asset: any) =>
      deptName(asset).includes('admin') ||
      deptName(asset).includes('administration')
  );

  let isITAsset: boolean;
  if (isITByDept) {
    isITAsset = true;
  } else if (isAdminByDept) {
    isITAsset = false;
  } else {
    // Fallback: keyword matching on type only when no department info
    isITAsset = assets.some(
      (asset: any) =>
        (asset.type || '').toLowerCase().includes('computer') ||
        (asset.type || '').toLowerCase().includes('server') ||
        (asset.type || '').toLowerCase().includes('laptop')
    );
  }

  const assetCode = isITAsset
    ? settings?.it_asset_code
    : settings?.admin_asset_code;

  // Build form number parts
  const parts = [];

  // Company part
  if (settings?.company_format === 'code' && company?.code) {
    parts.push(company.code);
  } else if (settings?.company_format === 'prefix' && company?.prefix) {
    parts.push(company.prefix);
  }

  // Department part
  if (settings?.department_format === 'code' && department?.code) {
    parts.push(department.code);
  } else if (settings?.department_format === 'prefix' && department?.prefix) {
    parts.push(department.prefix);
  }

  // Asset code part
  if (assetCode) {
    parts.push(assetCode);
  }

  // Date part
  if (settings?.include_date) {
    const now = new Date();
    const dateStr =
      settings.date_format === 'YYYYMMDD'
        ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        : `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    parts.push(dateStr);
  }

  // Generate sequence number (for MMYYYY: reset per year, so match any month in same year)
  const dateFilter = settings?.include_date ? parts[parts.length - 1] : null;
  const basePattern = parts.slice(0, -1).join('-'); // All parts except date/sequence
  const year = settings?.include_date ? new Date().getFullYear() : null;
  const likeParam =
    settings?.include_date && settings?.date_format === 'MMYYYY'
      ? `${basePattern}-%${year}`
      : `${basePattern}${dateFilter ? `-${dateFilter}` : ''}`;

  const nextSeq = await repo.getNextFormSequence(likeParam);
  parts.push(String(nextSeq).padStart(4, '0'));

  return parts.join('-');
}

/** Primary key is UUID (DEFAULT (uuid())); mysql2 insertId is 0 — resolve by unique form_number. */
async function getFormIdByFormNumber(
  formNumber: string
): Promise<string | null> {
  const id = await repo.findFormIdByFormNumber(formNumber);
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

export async function createAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assignmentId,
      assetId,
      userId,
      departmentId,
      locationId,
      assets,
      assignmentIds,
      signAsIssuer,
      issuerSignature,
      signITCopy,
      itCopySignature,
      formOrigin: formOriginBody,
      form_origin: formOriginSnake,
      previousFormId,
      previousFormOriginalStatus,
    } = req.body;
    const formOriginRaw = formOriginBody ?? formOriginSnake;
    const formOriginStored: AccountabilityFormOrigin | undefined =
      formOriginRaw === 'processor_return' ? 'processor_return' : undefined;
    const createdBy = req.user!.userID;

    // Handle builder forms (multiple assets)
    if (assets && Array.isArray(assets) && assets.length > 0) {
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get company ID and user details from department or user
      let companyId: string | null = null;
      if (departmentId) {
        companyId = await repo.getCompanyIdByDepartmentId(departmentId);
      }
      const userDetails = await repo.getUserCompanyAndName(userId);
      if (!companyId) {
        companyId = userDetails?.company_id ?? null;
      }

      if (!companyId) {
        return res
          .status(400)
          .json({ error: 'Could not determine company for form creation' });
      }

      // Generate form number based on settings
      let formNumber: string = '';
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          formNumber = await generateFormNumber(
            companyId,
            assets,
            departmentId
          );

          const assetsDataPayload: Record<string, unknown> = { assets };
          if (formOriginStored) {
            assetsDataPayload.form_origin = formOriginStored;
          }
          if (previousFormId) {
            assetsDataPayload.previous_form_id = previousFormId;
          }
          if (previousFormOriginalStatus) {
            assetsDataPayload.previous_form_original_status = previousFormOriginalStatus;
          }
          if (Array.isArray(assignmentIds) && assignmentIds.length > 0) {
            assetsDataPayload.assignment_ids = assignmentIds;
          }

          // Determine which assignment_id to use for the accountability form
          // Prioritize the assignment that matches a computer-type asset (same logic as frontend)
          let selectedAssignmentId: string | null = null;
          if (Array.isArray(assignmentIds) && assignmentIds.length > 0) {
            if (assets && Array.isArray(assets)) {
              // Query the assignments to find which one has a computer-type asset
              const assignmentsQuery = `
                SELECT aa.assignmentID, a.category_id, a.type_id, ac.name as category_name, at.name as type_name
                FROM asset_assignments aa
                LEFT JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
                LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
                LEFT JOIN asset_types at ON a.type_id = at.typeID
                WHERE aa.assignmentID IN (${assignmentIds.map(() => '?').join(',')})
                AND aa.deleted_at IS NULL
              `;
              const [assignmentRows] = await pool.execute(assignmentsQuery, assignmentIds);
              
              // Find the assignment with a computer-type asset
              const computerAssignment = (assignmentRows as any[]).find((row: any) => {
                const type = (row.type_name || '').toLowerCase();
                return type.includes('computer') ||
                       type.includes('laptop') ||
                       type.includes('server');
              });
              
              if (computerAssignment) {
                selectedAssignmentId = computerAssignment.assignmentID;
              }
            }
            
            // Fall back to first assignment_id if no computer asset found
            if (!selectedAssignmentId) {
              selectedAssignmentId = assignmentIds[0];
            }
          }

          // Create accountability form with assets stored in separate column
          await repo.insertAccountabilityFormMulti({
            formNumber,
            userId,
            departmentId: departmentId || null,
            locationId: locationId || null,
            createdBy,
            assetsDataJson: JSON.stringify(assetsDataPayload),
            issuerSignature: issuerSignature || null,
            itCopySignature: itCopySignature || null,
            assignmentId: selectedAssignmentId,
          });

          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
            // If duplicate entry error, wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            continue;
          }
          throw error; // Re-throw if not a duplicate entry or max attempts reached
        }
      }

      const resolvedFormId = await getFormIdByFormNumber(formNumber);
      if (!resolvedFormId) {
        logger.error(
          'Could not resolve formID after accountability form insert (multi-asset)',
          { formNumber }
        );
        return res.status(500).json({
          error: 'Failed to create accountability form',
        });
      }

      // Create audit log
      const userName =
        `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
      await createAuditLog({
        userId: createdBy,
        action: 'Created Accountability Form',
        resourceType: 'accountability_form',
        resourceId: resolvedFormId,
        resourceName: formNumber,
        details: `Accountability form ${formNumber} created for ${userName} with ${assets.length} assets`,
        newValues: {
          form_number: formNumber,
          user_id: userId,
          assets: assets,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      // Emit WebSocket notification to the form user
      try {
        const createdByRow = await repo.getUserNameById(createdBy);
        const assignerName = createdByRow
          ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || createdBy
          : createdBy;

        // Create database notification entry
        await NotificationService.createNotification(
          {
            user_id: userId,
            title: 'New accountability form has been issued',
            message: `by ${assignerName}. Review it and check your assets and sign the form`,
            type: 'accountability_form',
            status: 'unread',
            data: JSON.stringify({
              description: `by ${assignerName}. Review it and check your assets and sign the form`,
              route: '/profile?tab=documents',
              actionTarget: 'profile_documents',
              formId: resolvedFormId,
              formNumber: formNumber,
              assignedBy: assignerName,
              timestamp: new Date().toISOString(),
            }),
          },
          createdBy
        );

        const io = getIoInstance();
        if (!io) {
          logger.error('[NOTIFICATION] Socket.IO instance not available');
        } else {
          emitNotification(io, userId, 'notification', {
            title: 'New accountability form has been issued',
            description: `by ${assignerName}. Review it and check your assets and sign the form`,
            type: 'accountability_form',
            route: '/profile?tab=documents',
            actionTarget: 'profile_documents',
            formId: resolvedFormId,
            formNumber: formNumber,
            assignedBy: assignerName,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (socketError) {
        logger.error('Failed to send WebSocket notification:', socketError);
        // Don't fail the form creation if notification fails
      }

      return res.status(201).json({
        message: 'Accountability form created successfully',
        form: {
          formID: resolvedFormId,
          form_number: formNumber,
          user_id: userId,
          department_id: departmentId,
          location_id: locationId,
          status: 'Pending',
          created_at: new Date(),
          created_by: createdBy,
          assets: assets,
        },
      });
    }

    // Handle single asset forms
    if (!assignmentId || !assetId || !userId) {
      return res
        .status(400)
        .json({ error: 'Assignment ID, Asset ID, and User ID are required' });
    }

    // Validate that assignment exists and is active
    const assignment = await repo.getAssignmentForFormCheck(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (assignment.status !== 'Active') {
      return res.status(400).json({
        error: 'Accountability form can only be created for active assignments',
      });
    }

    // Check if form already exists for this assignment
    const existingFormId = await repo.findFormIdByAssignmentId(assignmentId);
    if (existingFormId) {
      return res.status(400).json({
        error: 'Accountability form already exists for this assignment',
      });
    }

    // Get company ID, user details, and asset info
    let companyId: string | null = null;
    if (departmentId) {
      companyId = await repo.getCompanyIdByDepartmentId(departmentId);
    }
    const userDetails = await repo.getUserCompanyAndName(userId);
    if (!companyId) {
      companyId = userDetails?.company_id ?? null;
    }

    // Get asset information (including category's department for IT/Admin form number)
    const assetInfo = await repo.getAssetForFormCreation(assetId);

    if (!companyId) {
      return res
        .status(400)
        .json({ error: 'Could not determine company for form creation' });
    }

    // Generate form number based on settings
    let formNumber: string = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const assetArray = assetInfo
          ? [
              {
                category: assetInfo.category_name,
                type: assetInfo.type_name,
                department: assetInfo.department_name,
              },
            ]
          : [];
        formNumber = await generateFormNumber(
          companyId,
          assetArray,
          departmentId
        );

        // Create accountability form
        await repo.insertAccountabilityFormSingle({
          formNumber,
          assignmentId,
          assetId,
          userId,
          departmentId: departmentId || null,
          locationId: locationId || null,
          createdBy,
          issuerSignature: issuerSignature || null,
          itCopySignature: itCopySignature || null,
        });

        break; // Success, exit retry loop
      } catch (error: any) {
        attempts++;
        if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
          // If duplicate entry error, wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          continue;
        }
        throw error; // Re-throw if not a duplicate entry or max attempts reached
      }
    }

    const resolvedFormIdSingle = await getFormIdByFormNumber(formNumber);
    if (!resolvedFormIdSingle) {
      logger.error(
        'Could not resolve formID after accountability form insert (single-asset)',
        { formNumber }
      );
      return res.status(500).json({
        error: 'Failed to create accountability form',
      });
    }

    // Create audit log
    const userName =
      `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
    await createAuditLog({
      userId: createdBy,
      action: 'Created Accountability Form',
      resourceType: 'accountability_form',
      resourceId: resolvedFormIdSingle,
      resourceName: formNumber,
      details: `Accountability form ${formNumber} created for ${userName} with assignment ${assignmentId}`,
      newValues: {
        form_number: formNumber,
        assignment_id: assignmentId,
        asset_id: assetId,
        user_id: userId,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Emit WebSocket notification to the form user
    try {
      const createdByRow = await repo.getUserNameById(createdBy);
      const assignerName = createdByRow
        ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || createdBy
        : createdBy;

      // Create database notification entry
      await NotificationService.createNotification(
        {
          user_id: userId,
          title: 'New accountability form has been issued',
          message: `by ${assignerName}. Review it and check your assets and sign the form`,
          type: 'accountability_form',
          status: 'unread',
          data: JSON.stringify({
            description: `by ${assignerName}. Review it and check your assets and sign the form`,
            route: '/profile?tab=documents',
            actionTarget: 'profile_documents',
            formId: resolvedFormIdSingle,
            formNumber: formNumber,
            assignedBy: assignerName,
            timestamp: new Date().toISOString(),
          }),
        },
        createdBy
      );

      const io = getIoInstance();
      if (!io) {
        logger.error('[NOTIFICATION] Socket.IO instance not available');
      } else {
        emitNotification(io, userId, 'notification', {
          title: 'New accountability form has been issued',
          description: `by ${assignerName}. Review it and check your assets and sign the form`,
          type: 'accountability_form',
          route: '/profile?tab=documents',
          actionTarget: 'profile_documents',
          formId: resolvedFormIdSingle,
          formNumber: formNumber,
          assignedBy: assignerName,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (socketError) {
      logger.error('Failed to send WebSocket notification:', socketError);
      // Don't fail the form creation if notification fails
    }

    return res.status(201).json({
      message: 'Accountability form created successfully',
      form: {
        formID: resolvedFormIdSingle,
        form_number: formNumber,
        assignment_id: assignmentId,
        asset_id: assetId,
        user_id: userId,
        department_id: departmentId,
        location_id: locationId,
        status: 'Pending',
        created_at: new Date(),
        created_by: createdBy,
      },
    });
  } catch (error: any) {
    logger.error('Create accountability form failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create accountability form' });
  }
}

export async function getAccountabilityFormsByAssetIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId } = req.params;
    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const rows = await repo.findFormsByAssetId(assetId);

    const forms = rows.map((row: any) => {
      const parsed = parseAccountabilityAssetsData(row.assets_data);
      let assets = parsed.assets;
      const formOrigin = parsed.formOrigin;

      // If no assets from acknowledgments, use the single asset
      if (assets.length === 0 && row.asset_id) {
        assets = [
          {
            id: row.asset_id,
            code: row.asset_code,
            name: row.asset_name,
            category: row.category_name || row.category_id,
            type: row.type_name || row.type_id,
            serialNo: row.serial,
            modelNo: row.assetModelNo,
          },
        ];
      }

      return {
        id: row.formID,
        formNumber: row.form_number,
        assets: assets,
        assignmentIds: parsed.assignmentIds,
        ...(formOrigin ? { formOrigin } : {}),
        user: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          employeeNumber: row.employeeNumber,
          position: row.position,
          companyLogoUrl: row.user_company_logo_url ?? null,
          company:
            row.user_company_id != null
              ? {
                  id: row.user_company_id,
                  name: row.user_company_name,
                }
              : undefined,
          department:
            row.user_department_name != null
              ? {
                  id: row.user_department_id,
                  name: row.user_department_name,
                }
              : undefined,
        },
        assignment: {
          id: row.assignment_id,
          assigned_date: row.assigned_date,
          expected_return_date: row.expected_return_date,
          assignment_notes: row.assignment_notes,
          assigned_by: row.assigned_by
            ? {
                id: row.assigned_by,
                first_name: row.assigned_by_first_name,
                last_name: row.assigned_by_last_name,
                email: row.assigned_by_email,
              }
            : null,
        },
        issuer: row.created_by
          ? {
              id: row.created_by,
              first_name: row.created_by_first_name,
              last_name: row.created_by_last_name,
              email: row.created_by_email,
            }
          : null,
        department: row.department_id
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              floor_unit: row.floor_unit,
              building: row.building,
              room_name: row.room_name,
            }
          : null,
        status: row.status,
        declineReason: row.decline_reason ?? null,
        acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
        issuerSignature: row.issuer_signature,
        itCopySignature: row.it_copy_signature,
        receivedCopy201FileSignature:
          row.received_copy_201_file_signature ?? null,
        receivedCopy201FileSignedAt:
          row.received_copy_201_file_signed_at ?? null,
        receivedCopy201FileSignedById:
          row.received_copy_201_file_signed_by ?? null,
        receivedCopy201FileSignedByName:
          (row.received_copy_201_file_signed_by_name &&
            String(row.received_copy_201_file_signed_by_name).trim()) ||
          (row.received_copy_signer_first_name != null ||
          row.received_copy_signer_last_name != null
            ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
              null
            : null),
        signed_at: row.signed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return res.json({ forms });
  } catch (error: any) {
    logger.error('Get accountability forms by asset id failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability forms' });
  }
}

export async function getAccountabilityFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId, status } = req.query;

    const rows = await repo.listAccountabilityForms({
      userId: typeof userId === 'string' ? userId : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    const forms = rows.map((row: any) => {
      const parsed = parseAccountabilityAssetsData(row.assets_data);
      let assets = parsed.assets;
      const formOrigin = parsed.formOrigin;

      // If no assets from acknowledgments, use the single asset
      if (assets.length === 0 && row.asset_id) {
        assets = [
          {
            id: row.asset_id,
            code: row.asset_code,
            name: row.asset_name,
            category: row.category_name || row.category_id,
            type: row.type_name || row.type_id,
            serialNo: row.serial,
            modelNo: row.assetModelNo,
          },
        ];
      }

      return {
        id: row.formID,
        formNumber: row.form_number,
        assets: assets,
        assignmentIds: parsed.assignmentIds,
        ...(formOrigin ? { formOrigin } : {}),
        user: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          employeeNumber: row.employeeNumber,
          position: row.position,
          companyLogoUrl: row.user_company_logo_url ?? null,
          company:
            row.user_company_id != null
              ? {
                  id: row.user_company_id,
                  name: row.user_company_name,
                }
              : undefined,
          department:
            row.user_department_name != null
              ? {
                  id: row.user_department_id,
                  name: row.user_department_name,
                }
              : undefined,
        },
        assignment: {
          id: row.assignment_id,
          assigned_date: row.assigned_date,
          expected_return_date: row.expected_return_date,
          assignment_notes: row.assignment_notes,
          assigned_by: row.assigned_by
            ? {
                id: row.assigned_by,
                first_name: row.assigned_by_first_name,
                last_name: row.assigned_by_last_name,
                email: row.assigned_by_email,
              }
            : null,
        },
        issuer: row.created_by
          ? {
              id: row.created_by,
              first_name: row.created_by_first_name,
              last_name: row.created_by_last_name,
              email: row.created_by_email,
            }
          : null,
        department: row.department_id
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              floor_unit: row.floor_unit,
              building: row.building,
              room_name: row.room_name,
            }
          : null,
        status: row.status,
        declineReason: row.decline_reason ?? null,
        acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
        issuerSignature: row.issuer_signature,
        itCopySignature: row.it_copy_signature,
        receivedCopy201FileSignature:
          row.received_copy_201_file_signature ?? null,
        receivedCopy201FileSignedAt:
          row.received_copy_201_file_signed_at ?? null,
        receivedCopy201FileSignedById:
          row.received_copy_201_file_signed_by ?? null,
        receivedCopy201FileSignedByName:
          (row.received_copy_201_file_signed_by_name &&
            String(row.received_copy_201_file_signed_by_name).trim()) ||
          (row.received_copy_signer_first_name != null ||
          row.received_copy_signer_last_name != null
            ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
              null
            : null),
        signed_at: row.signed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return res.json({ forms });
  } catch (error: any) {
    logger.error('Get accountability forms failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability forms' });
  }
}

export async function signAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const { acknowledgments } = req.body;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Get form details
    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    // Check if user can sign this form (only the assigned user)
    if (form.user_id !== userId) {
      return res
        .status(403)
        .json({ error: 'You can only sign forms assigned to you' });
    }

    if (form.status !== 'Pending') {
      return res.status(400).json({ error: 'Form is not in pending status' });
    }

    // Get existing acknowledgments to preserve issuer signature
    const parsedExisting = parseMysqlJsonColumn<Record<string, unknown>>(
      form.acknowledgments
    );
    const existingAcknowledgments =
      parsedExisting &&
      typeof parsedExisting === 'object' &&
      !Array.isArray(parsedExisting)
        ? parsedExisting
        : {};

    const updatedAcknowledgments = {
      ...existingAcknowledgments,
      ...acknowledgments,
    } as Record<string, unknown>;

    const digitalSignature = await resolveSigningDigitalSignature(
      userId,
      typeof updatedAcknowledgments.digitalSignature === 'string'
        ? updatedAcknowledgments.digitalSignature
        : null
    );

  // Sign linked asset checklists before marking the accountability form signed
    try {
      await signLinkedChecklistsForAccountabilityForm({
        formId,
        formNumber: form.form_number ?? null,
        assetsDataRaw: form.assets_data,
        fallbackAssignmentId: form.assignment_id,
        userId: form.user_id,
        employeeId: userId,
        digitalSignature,
        req,
      });
    } catch (checklistSignError) {
      logger.error(
        'Failed to auto-sign linked checklists during accountability sign:',
        checklistSignError
      );
      return res.status(500).json({
        error:
          'Failed to sign linked asset checklists. Accountability form was not signed.',
      });
    }

    // Update form with signature
    await repo.updateFormSigned(
      formId,
      JSON.stringify(updatedAcknowledgments),
      req.ip ?? '',
      req.get ? req.get('User-Agent') ?? 'Unknown' : 'Unknown'
    );

    // Create audit log
    await createAuditLog({
      userId,
      action: 'Signed Accountability Form',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Accountability form ${form.form_number} signed by user`,
      oldValues: {
        status: form.status,
      },
      newValues: {
        status: 'Signed',
        signed_at: new Date(),
        acknowledgments: acknowledgments,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Notify HR accountability receivers
    try {
      const hrReceiverIds = await getHrAccountabilityReceiverUserIds();
      for (const receiverId of hrReceiverIds) {
        await createNotificationForApi({
          user_id: receiverId,
          title: 'Accountability Form Ready for HR Copy',
          message: `An Accountability form (${form.form_number}) is ready for you to receive for HR Copy of 201 file`,
          type: 'accountability_form',
          data: {
            formId: formId,
            formNumber: form.form_number,
          },
        });
      }
      logger.info(`Sent HR copy notifications to ${hrReceiverIds.length} receivers`);
    } catch (notifError) {
      logger.error('Failed to send HR copy notifications:', notifError);
      // Don't fail the request if notification fails
    }

    return res.json({
      message: 'Accountability form signed successfully',
      form: {
        id: formId,
        status: 'Signed',
        signed_at: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Sign accountability form failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to sign accountability form' });
  }
}

export async function declineAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const parsed = declineAccountabilityFormBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const first =
        parsed.error.flatten().fieldErrors.reason?.[0] ||
        parsed.error.errors[0]?.message ||
        'Invalid request body';
      return res.status(400).json({ error: first });
    }

    const { reason } = parsed.data;
    const { formId } = req.params;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.user_id !== userId) {
      return res.status(403).json({
        error: 'You can only decline forms assigned to you',
      });
    }

    if (form.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending forms can be declined' });
    }

    // Extract previous_form_id and original status from assets_data if it exists
    let previousFormId: string | null = null;
    let previousFormOriginalStatus: string | null = null;
    let previousFormAssetIds: string[] = [];
    if (form.assets_data) {
      try {
        const data =
          typeof form.assets_data === 'string'
            ? JSON.parse(form.assets_data)
            : form.assets_data;
        previousFormId = data?.previous_form_id || null;
        previousFormOriginalStatus = data?.previous_form_original_status || null;
      } catch {
        /* ignore */
      }
    }

    // Get assets from the previous form if it exists
    if (previousFormId) {
      try {
        const prevAssetsData = await repo.getFormAssetsDataById(previousFormId);
        if (prevAssetsData != null) {
          const prevData =
            typeof prevAssetsData === 'string'
              ? JSON.parse(prevAssetsData)
              : prevAssetsData;
          const prevAssets = (prevData as { assets?: unknown })?.assets;
          if (Array.isArray(prevAssets)) {
            previousFormAssetIds = prevAssets
              .map((a: any) => String(a.id))
              .filter(Boolean);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const assetIds: string[] = [];
    if (form.assets_data) {
      try {
        const data =
          typeof form.assets_data === 'string'
            ? JSON.parse(form.assets_data)
            : form.assets_data;
        const arr = data?.assets;
        if (Array.isArray(arr)) {
          for (const a of arr) {
            if (a?.id) assetIds.push(String(a.id));
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (assetIds.length === 0 && form.asset_id) {
      assetIds.push(String(form.asset_id));
    }

    if (assetIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'Form has no assets to release' });
    }

    const uniqueAssetIds = [...new Set(assetIds)];
    
    // Only return assets that are NOT in the previous form (the newly added ones)
    const newlyAddedAssetIds = uniqueAssetIds.filter(
      id => !previousFormAssetIds.includes(id)
    );
    
    const returnNotes = `Accountability form declined by assignee. Reason: ${reason}`;
    const ipAddress = req.ip || '';
    const userAgent = req.get ? req.get('User-Agent') || 'Unknown' : 'Unknown';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const assetId of newlyAddedAssetIds) {
        const assignment = await repo.findActiveAssignmentForUserAssetTx(
          conn,
          form.user_id,
          assetId
        );

        if (!assignment) {
          logger.warn(
            `Decline form ${formId}: no active assignment for user ${form.user_id} asset ${assetId}`
          );
          continue;
        }

        await repo.callReturnAssignmentTx(
          conn,
          assignment.assignmentID,
          returnNotes,
          userId
        );

        await applyReturnAssignmentSideEffectsOnConnection(
          conn,
          {
            assignmentID: assignment.assignmentID,
            asset_id: assignment.asset_id,
            user_id: assignment.user_id,
            status: assignment.status,
          },
          returnNotes,
          userId,
          {
            ipAddress,
            userAgent,
            skipAssigneeNotification: true,
          }
        );
      }

      // Re-assign assets from the previous form back to the user
      if (previousFormId && previousFormAssetIds.length > 0) {
        for (const assetId of previousFormAssetIds) {
          // Check if asset already has an active assignment for the user
          const existingAssignmentId =
            await repo.findAssignmentIdForUserAssetTx(
              conn,
              form.user_id,
              assetId
            );

          // Only create new assignment if one doesn't already exist
          if (existingAssignmentId == null) {
            if (!(await repo.assetExistsTx(conn, assetId))) continue;

            const assignmentId = randomUUID();
            await repo.callCreateAssignmentTx(conn, {
              assignmentId,
              assetId,
              userId: form.user_id,
              departmentId: form.department_id ?? null,
              locationId: form.location_id ?? null,
              locationRoomId: form.location_room_id ?? null,
              expectedReturnDate: null,
              assignmentNotes: `Re-assigned after decline of form ${form.form_number}`,
              assignedBy: userId,
            });
          }
        }
      }

      const declinedRows = await repo.updateFormDeclinedTx(
        conn,
        formId,
        reason
      );
      if (declinedRows === 0) {
        throw new Error('Form state changed during decline');
      }

      // Re-enable previous form if it exists
      if (previousFormId) {
        const prevForm = await repo.getFormByIdTx(conn, previousFormId);

        if (prevForm) {
          // Restore original status if available, otherwise use 'Pending'
          const restoredStatus = previousFormOriginalStatus || 'Pending';
          await repo.updateFormStatusTx(conn, previousFormId, restoredStatus);

          await createAuditLog({
            userId,
            action: 'Re-enabled Accountability Form',
            resourceType: 'accountability_form',
            resourceId: previousFormId,
            resourceName: prevForm.form_number,
            details: `Previous accountability form re-enabled after decline of form ${form.form_number}`,
            oldValues: { status: 'Disabled' },
            newValues: { status: restoredStatus },
            ipAddress,
            userAgent,
          });
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await createAuditLog({
      userId,
      action: 'Declined Accountability Form',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Accountability form ${form.form_number} declined. Reason: ${reason}`,
      oldValues: { status: 'Pending' },
      newValues: { status: 'Disabled', decline_reason: reason },
      ipAddress,
      userAgent,
    });

    // Send notification to the issuer if form has an issuer
    logger.info(`Checking if form has issuer. form.created_by: ${form.created_by}`);
    if (form.created_by) {
      try {
        // Get user details for the notification
        const userRow = await repo.getUserNameById(userId);
        const userName = userRow
          ? `${userRow.first_name ?? ''} ${userRow.last_name ?? ''}`.trim()
          : userId;

        // Truncate reason if too long (max 100 characters)
        const truncatedReason = reason.length > 100
          ? reason.substring(0, 97) + '...'
          : reason;

        // Create notification for the issuer
        const notificationData = {
          type: 'accountability_form',
          title: `${userName} Declined accountability form no. ${form.form_number}`,
          message: `Reason: ${truncatedReason}`,
          formId: formId,
          formNumber: form.form_number,
          declineReason: reason, // Store full reason for dialog
          declinedBy: userId,
          declinedByName: userName,
          actionTarget: 'accountability_form_declined',
          route: '/forms/accountability',
          openPreview: true, // Flag to open PDF preview dialog
        };

        logger.info(`Inserting notification into database for issuer ${form.created_by}`);
        const insertId = await repo.insertDeclineNotification(
          form.created_by,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          JSON.stringify(notificationData)
        );

        logger.info(`Notification inserted with ID: ${insertId}`);

        // Emit socket event to notify the issuer
        const { getIoInstance } = await import('../utils/socketManager.js');
        const io = getIoInstance();
        if (io) {
          logger.info(`Emitting socket notification to user:${form.created_by}`);
          io.to(`user:${form.created_by}`).emit('notification', notificationData);
        } else {
          logger.warn('Socket.IO instance not available');
        }

        logger.info(`Notification sent to issuer ${form.created_by} for declined form ${formId}`);
      } catch (notifError) {
        logger.error('Failed to send decline notification to issuer:', notifError);
        // Don't fail the decline operation if notification fails
      }
    } else {
      logger.warn(`Form ${formId} does not have a creator, skipping notification`);
    }

    return res.json({
      message: 'Accountability form declined successfully',
      form: {
        id: formId,
        status: 'Disabled',
        declineReason: reason,
      },
    });
  } catch (error: any) {
    logger.error('Decline accountability form failed:', error);
    if (error?.message === 'Form state changed during decline') {
      return res.status(409).json({
        error: 'Form could not be declined; refresh and try again',
      });
    }
    return res
      .status(500)
      .json({ error: 'Failed to decline accountability form' });
  }
}

export async function signReceivedCopyHandler(req: AuthRequest, res: Response) {
  try {
    const { formId } = req.params;
    const { digitalInitials } = req.body;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.received_copy_201_file_signed_at) {
      return res.status(400).json({
        error: 'Received Copy for 201 File has already been signed',
      });
    }

    const signerRow = await repo.getUserNameById(userId);
    const signerName = signerRow
      ? `${signerRow.first_name ?? ''} ${signerRow.last_name ?? ''}`.trim() || null
      : null;

    // Do NOT set status = 'Signed' - that would cause PDF to show HR signature in
    // "Issued to/Received by". Status reflects employee signing; received copy has its own columns.
    await repo.updateFormReceivedCopySignature(
      formId,
      digitalInitials || null,
      userId,
      signerName
    );

    await createAuditLog({
      userId,
      action: 'Signed Received Copy for 201 File',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Received Copy for 201 File signed for form ${form.form_number} with digital initials: ${digitalInitials}`,
      newValues: { received_copy_201_file_signed_at: 'Updated', received_copy_201_file_signature: digitalInitials },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    return res.json({
      message: 'Received Copy for 201 File signed successfully',
      signedByName: signerName,
    });
  } catch (error: any) {
    logger.error('Sign received copy failed:', error);
    const message =
      error?.message?.includes('Unknown column') ||
      error?.code === 'ER_BAD_FIELD_ERROR'
        ? 'Database migration required: run migration_add_received_copy_201_file_signature.sql to add the received_copy_201_file_signature column.'
        : 'Failed to sign received copy';
    return res.status(500).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && {
        detail: error?.message,
      }),
    });
  }
}

export async function getAccountabilityFormChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    const canView = await userCanViewAccountabilityFormRow(
      {
        user_id: String(row.user_id),
        created_by: row.created_by != null ? String(row.created_by) : null,
      },
      currentUserId
    );
    if (!canView) {
      return res.status(403).json({
        error: 'You do not have permission to view checklists for this form',
      });
    }

    const assignmentIds = await resolveChecklistAssignmentIds({
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      getActiveAssignmentIdsByAssetIds:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
      getActiveAssignmentIdsByAssetCodes:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
      isComputerType: isComputerTypeName,
    });
    const checklists =
      await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);

    return res.status(200).json({ checklists });
  } catch (error) {
    logger.error('Get accountability form checklists failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form checklists' });
  }
}

export async function signAccountabilityFormChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;
    const bodySignature =
      typeof req.body?.digitalSignature === 'string'
        ? req.body.digitalSignature.trim()
        : '';

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (String(row.user_id) !== String(currentUserId)) {
      return res
        .status(403)
        .json({ error: 'You can only sign checklists assigned to you' });
    }

    if (row.status !== 'Pending' && row.status !== 'Signed') {
      return res.status(400).json({
        error:
          'Checklists can only be signed while the accountability form is pending or signed',
      });
    }

    const parsedAcknowledgments = parseMysqlJsonColumn<Record<string, unknown>>(
      row.acknowledgments
    );
    const ackSignature =
      parsedAcknowledgments &&
      typeof parsedAcknowledgments.digitalSignature === 'string'
        ? parsedAcknowledgments.digitalSignature
        : null;

    const digitalSignature = await resolveSigningDigitalSignature(
      currentUserId,
      bodySignature || ackSignature
    );

    const signedCount = await signLinkedChecklistsForAccountabilityForm({
      formId,
      formNumber: row.form_number ?? null,
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      employeeId: currentUserId,
      digitalSignature,
      req,
    });

    if (signedCount === 0) {
      return res.status(400).json({
        error: 'All checklists for this form are already signed',
      });
    }

    const assignmentIds = await resolveChecklistAssignmentIds({
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      getActiveAssignmentIdsByAssetIds:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
      getActiveAssignmentIdsByAssetCodes:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
      isComputerType: isComputerTypeName,
    });
    const updatedChecklists =
      await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);

    return res.status(200).json({
      message: `Signed ${signedCount} checklist(s) successfully`,
      signedCount,
      checklists: updatedChecklists,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    logger.error('Sign accountability form checklists failed:', error);
    if (
      typeof message === 'string' &&
      message.includes('employee_signed_at')
    ) {
      return res.status(503).json({
        error:
          'Checklist signing is not available: run db/migration_add_asset_checklist_employee_sign.sql',
      });
    }
    return res
      .status(500)
      .json({ error: 'Failed to sign asset checklists' });
  }
}

export async function getAccountabilityFormByIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    const hrAccess = await userHasHrAccountabilityFullAccess(currentUserId);
    // Assignee may view; issuer (created_by) may view; HR with full Accountability Form perms may view
    if (
      row.user_id !== currentUserId &&
      row.created_by !== currentUserId &&
      !hrAccess
    ) {
      return res.status(403).json({
        error: 'You can only view forms assigned to you or that you issued',
      });
    }

    const parsedSingle = parseAccountabilityAssetsData(row.assets_data);
    let assets = parsedSingle.assets;
    const formOriginSingle = parsedSingle.formOrigin;

    // If no assets from acknowledgments, use the single asset
    if (assets.length === 0 && row.asset_id) {
      assets = [
        {
          id: row.asset_id,
          code: row.asset_code,
          name: row.asset_name,
          category: row.category_name || row.category_id,
          type: row.type_name || row.type_id,
          serialNo: row.serial,
          modelNo: row.assetModelNo,
        },
      ];
    }

    const form = {
      id: row.formID,
      formNumber: row.form_number,
      assets: assets,
      assignmentIds: parsedSingle.assignmentIds,
      ...(formOriginSingle ? { formOrigin: formOriginSingle } : {}),
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        employeeNumber: row.employeeNumber,
        position: row.position,
        companyLogoUrl: row.user_company_logo_url ?? null,
        company:
          row.user_company_id != null
            ? {
                id: row.user_company_id,
                name: row.user_company_name,
              }
            : undefined,
        department:
          row.user_department_name != null
            ? {
                id: row.user_department_id,
                name: row.user_department_name,
              }
            : undefined,
      },
      assignment: {
        id: row.assignment_id,
        assigned_date: row.assigned_date,
        expected_return_date: row.expected_return_date,
        assignment_notes: row.assignment_notes,
        assigned_by: row.assigned_by
          ? {
              id: row.assigned_by,
              first_name: row.assigned_by_first_name,
              last_name: row.assigned_by_last_name,
              email: row.assigned_by_email,
            }
          : null,
      },
      issuer: row.created_by
        ? {
            id: row.created_by,
            first_name: row.created_by_first_name,
            last_name: row.created_by_last_name,
            email: row.created_by_email,
          }
        : null,
      department: row.department_id
        ? {
            id: row.department_id,
            name: row.department_name,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            floor_unit: row.floor_unit,
            building: row.building,
            room_name: row.room_name,
          }
        : null,
      status: row.status,
      declineReason: row.decline_reason ?? null,
      acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
      issuerSignature: row.issuer_signature,
      itCopySignature: row.it_copy_signature,
      receivedCopy201FileSignature:
        row.received_copy_201_file_signature ?? null,
      receivedCopy201FileSignedAt: row.received_copy_201_file_signed_at ?? null,
      receivedCopy201FileSignedById:
        row.received_copy_201_file_signed_by ?? null,
      receivedCopy201FileSignedByName:
        (row.received_copy_201_file_signed_by_name &&
          String(row.received_copy_201_file_signed_by_name).trim()) ||
        (row.received_copy_signer_first_name != null ||
        row.received_copy_signer_last_name != null
          ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
            null
          : null),
      receivedCopyWetPdfUrl: row.received_copy_wet_pdf_url ?? null,
      signed_at: row.signed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return res.json({ form });
  } catch (error: any) {
    logger.error('Get accountability form by ID failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form' });
  }
}

/**
 * Check if a user has unsigned accountability forms
 * Returns list of unsigned forms for the specified user
 */
export async function checkUnsignedAccountabilityFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Query for accountability forms that are still pending (not signed)
    const rows = await repo.findUnsignedFormsByUserId(userId);

    const unsignedForms = rows.map((row) => ({
      formId: row.formID,
      formNumber: row.form_number,
      userId: row.user_id,
      status: row.status,
      createdAt: row.created_at,
      assetCode: row.asset_code,
      assetName: row.asset_name,
    }));

    return res.json({
      hasUnsignedForms: unsignedForms.length > 0,
      unsignedForms,
    });
  } catch (error: any) {
    logger.error('Check unsigned accountability forms failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to check unsigned accountability forms' });
  }
}

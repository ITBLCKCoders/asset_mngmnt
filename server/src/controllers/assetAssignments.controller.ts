import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { createAuditLog } from '../utils/audit.js';
import { handleAccountabilityFormOnAssetReturn } from '../utils/accountabilityFormOnReturn.js';
import {
  getAssetScope,
  classifyDepartmentScopeByName,
  getDepartmentIdsForScope,
} from '../utils/assetScope.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';
import { createAccountabilityFormHandler } from './accountabilityForms.controller.js';
import * as repo from '../repositories/assetAssignment.repository.js';
import {
  buildAccountabilityFormMap,
  loadUserModulePermissions,
} from '../services/assetAssignment.service.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import * as checklistListRepo from '../repositories/assetChecklistList.repository.js';
import { getCategoryDepartmentForAssetIds } from '../repositories/assetReturn.repository.js';
import {
  generateChecklistFormNumber,
  generateChecklistFormNumberFallback,
} from '../utils/checklistFormNumber.js';

// ---------------------------------------------------------------------------
// Internal helpers — controller-local. Pure HTTP / logging concerns only.
// ---------------------------------------------------------------------------

function reqAudit(req: AuthRequest) {
  return {
    ipAddress: req.ip,
    userAgent: req.get ? req.get('User-Agent') : 'Unknown',
  };
}

/**
 * Map a sp_get_assignments-shape row to the API assignment object. Used by
 * `/asset-assignments` (with accountabilityForm pairing) and
 * `/asset-assignments/me` and `/asset-assignments/filtered` (without).
 */
function mapAssignmentRow(
  row: any,
  accountabilityForm:
    | { id: string; formNumber: string; status: string; declineReason: string | null; created_at: string | null; updated_at: string | null }
    | null = null,
  includeScopeType = false
) {
  const base = {
    assignmentID: row.assignmentID,
    asset: {
      id: row.asset_id,
      code: row.asset_code,
      name: row.asset_name,
      category_id: row.category_id,
      type_id: row.type_id,
      condition: row.condition ?? null,
      asset_value: row.asset_value ?? null,
      ...(includeScopeType && {
        scopeType: classifyDepartmentScopeByName(row.department_name),
      }),
    },
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      employeeNumber: row.employeeNumber,
      position: row.position,
    },
    department: row.department_id
      ? { id: row.department_id, name: row.department_name }
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
    assigned_date: row.assigned_date,
    expected_return_date: row.expected_return_date,
    actual_return_date: row.actual_return_date,
    assignment_notes: row.assignment_notes,
    status: row.status,
    assigned_by: {
      id: row.assigned_by,
      first_name: row.assigned_by_first_name,
      last_name: row.assigned_by_last_name,
      employeeNumber: row.assigned_by_employee_number,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return accountabilityForm !== null
    ? { ...base, accountabilityForm }
    : base;
}

// ---------------------------------------------------------------------------
// POST /asset-assignments
// ---------------------------------------------------------------------------

export async function createAssetAssignmentHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assetId,
      userId,
      departmentId,
      locationId,
      locationRoomId,
      expectedReturnDate,
      assignmentNotes,
      signAsIssuer,
      issuerSignature,
      signITCopy,
      itCopySignature,
    } = req.body;
    const assignedBy = req.user!.userID;

    // Support both single asset and multiple assets assignment
    const assetsToAssign: string[] = Array.isArray(assetId) ? assetId : [assetId];
    if (assetsToAssign.length === 0 || !assetsToAssign[0] || !userId) {
      return res
        .status(400)
        .json({ error: 'Asset ID(s) and User ID are required' });
    }

    // Validate user exists
    const user = await repo.getUserBasic(userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Resolve company_id from department override or user
    let companyId = user.company_id;
    if (departmentId) {
      const cid = await repo.getCompanyIdByDepartment(departmentId);
      if (cid != null) companyId = cid;
    }

    // Require accountability-form settings for company
    if (companyId) {
      const hasSettings = await repo.hasAccountabilityFormSettings(companyId);
      if (!hasSettings) {
        return res.status(400).json({
          error:
            'Please configure your company asset accountability form number first or contact system administrator',
        });
      }
    }

    // Validate department
    if (departmentId && !(await repo.departmentExists(departmentId))) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    // Validate location
    if (locationId && !(await repo.locationExists(locationId))) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    // Validate / canonicalise room
    let actualLocationRoomId = locationRoomId;
    if (locationRoomId) {
      const resolved = await repo.resolveRoomIdByIdOrName(locationRoomId);
      if (resolved == null) {
        return res.status(400).json({ error: 'Invalid location room' });
      }
      actualLocationRoomId = resolved;
    }

    // Process each asset
    const assignments: { assignmentID: string; asset_id: string; asset_code: string }[] = [];
    const assignedAssets: any[] = [];

    for (const assetCode of assetsToAssign) {
      const asset = await repo.getAssetByCode(assetCode);
      if (!asset) {
        return res.status(404).json({ error: `Asset ${assetCode} not found` });
      }

      // Inactivate previous assignments
      const activeAssignments = await repo.getActiveAssignmentsByAssetId(
        asset.assetID
      );
      if (activeAssignments.some(a => a.user_id === userId)) {
        return res.status(400).json({
          error: `Asset ${assetCode} is already assigned to this user`,
        });
      }
      for (const prev of activeAssignments) {
        await repo.setAssignmentInactive(
          prev.assignmentID,
          '\nReassigned to another user'
        );
        await createAuditLog({
          userId: assignedBy,
          action: 'Reassigned Asset',
          resourceType: 'asset_assignment',
          resourceId: prev.assignmentID,
          resourceName: assetCode,
          details: `Previous assignment to user ${prev.user_id} set to Inactive due to reassignment`,
          oldValues: { status: 'Active' },
          newValues: { status: 'Inactive' },
          ...reqAudit(req),
        });
      }

      // Create new assignment
      const assignmentId = randomUUID();
      await repo.callCreateAssignment({
        assignmentId,
        assetId: asset.assetID,
        userId,
        departmentId: departmentId || null,
        locationId: locationId || null,
        locationRoomId: actualLocationRoomId || null,
        expectedReturnDate: expectedReturnDate || null,
        assignmentNotes: assignmentNotes || null,
        assignedBy,
      });

      // Bump asset-builder status if relevant
      const builders = await repo.getBuildersForAsset(asset.assetID);
      if (builders.length > 0) {
        const builder = builders[0]!;
        if (builder.builder_status !== 'Assigned') {
          await repo.setBuilderStatus(builder.builderID, 'Assigned', assignedBy);

          const assetCodeList = await repo.getBuilderAssetCodes(
            builder.builderID
          );
          const assetCodesBulletList =
            assetCodeList.length > 0
              ? '\n• ' + assetCodeList.join('\n• ')
              : assetCode;

          await createAuditLog({
            userId: assignedBy,
            action: 'Updated Asset Builder Status',
            resourceType: 'asset_builder',
            resourceId: builder.builderID,
            resourceName: builder.name,
            details: `Asset builder "${builder.name}" status updated to "Assigned" due to asset assignment`,
            oldValues: { status: builder.builder_status },
            newValues: { status: 'Assigned' },
            ...reqAudit(req),
          });

          await createAuditLog({
            userId: assignedBy,
            action: 'Assigned Asset Builder',
            resourceType: 'asset_builder',
            resourceId: builder.builderID,
            resourceName: builder.name,
            details: `Asset builder "${builder.name}" assigned to ${user.first_name} ${user.last_name}. Assets:${assetCodesBulletList}`,
            newValues: {
              status: 'Assigned',
              asset_codes: assetCodeList,
              assigned_to: `${user.first_name} ${user.last_name}`,
            },
            ...reqAudit(req),
          });
        }
      }

      // Resolve names for audit log
      const departmentName = departmentId
        ? (await repo.getDepartmentName(departmentId)) ?? departmentId
        : '';
      const locationName = locationId
        ? (await repo.getLocationName(locationId)) ?? locationId
        : '';
      const roomName = actualLocationRoomId
        ? (await repo.getRoomName(actualLocationRoomId)) ?? actualLocationRoomId
        : '';
      const assignedByUser = await repo.getUserFullName(assignedBy);

      await createAuditLog({
        userId: assignedBy,
        action: 'Assigned Asset',
        resourceType: 'asset_assignment',
        resourceId: assignmentId,
        resourceName: assetCode,
        details: `Asset ${assetCode} assigned to ${user.first_name} ${user.last_name} by ${assignedByUser} via Asset Assignment page${departmentName ? ` in ${departmentName}` : ''}${locationName ? ` at ${locationName}` : ''}${roomName ? ` (${roomName})` : ''}`,
        newValues: {
          asset_id: asset.assetID,
          user_id: userId,
          department_id: departmentId,
          location_id: locationId,
          location_room_id: actualLocationRoomId,
          expected_return_date: expectedReturnDate,
          assigned_by: assignedBy,
        },
        ...reqAudit(req),
      });

      assignments.push({
        assignmentID: assignmentId,
        asset_id: asset.assetID,
        asset_code: assetCode,
      });

      const assetDetails = await repo.getAssetDetailsForForm(asset.assetID);
      assignedAssets.push({
        id: asset.assetID,
        code: assetCode,
        name: assetDetails?.name || assetCode,
        category: assetDetails?.category_name || assetDetails?.category_id,
        type: assetDetails?.type_name || assetDetails?.type_id,
        serialNo: assetDetails?.serial || '',
        modelNo: assetDetails?.model || '',
        brand: assetDetails?.brand || '',
      });
    }

    // ----------------------------------------------------------------
    // Recreate accountability forms (per affected department)
    // ----------------------------------------------------------------
    const accountabilityFormIds: string[] = [];
    try {
      if (assignedAssets.length > 0) {
        const assignedAssetCodes = assignedAssets.map(a => a.code);
        const assignedAssetDetails = await repo.getCategoryDeptForAssetCodes(
          assignedAssetCodes
        );

        // Group categories by department
        const departmentGroups: Record<
          string,
          { categories: { id: string; name: string }[]; deptName: string }
        > = {};
        for (const row of assignedAssetDetails) {
          const deptName = row.department_name || 'Other';
          if (!departmentGroups[deptName]) {
            departmentGroups[deptName] = { categories: [], deptName };
          }
          departmentGroups[deptName]!.categories.push({
            id: row.categoryID ?? '',
            name: row.category_name ?? '',
          });
        }

        logger.info(
          `Newly assigned assets affect departments: ${Object.keys(departmentGroups).join(', ')}`
        );

        for (const [deptName, deptInfo] of Object.entries(departmentGroups)) {
          logger.info(`Processing department: ${deptName}`);
          const categoryIds = [
            ...new Set(
              deptInfo.categories
                .map(c => c.id)
                .filter(id => id != null && String(id).trim() !== '')
            ),
          ] as string[];

          let departmentAssetsRows = categoryIds.length > 0
            ? await repo.getActiveAssignmentsByUserAndCategories(
                userId,
                categoryIds
              )
            : [];

          const seenAssetIds = new Set(
            departmentAssetsRows.map(r => String(r.assetID))
          );

          const existingForms = await repo.getExistingAccountabilityForms(
            userId,
            deptName
          );

          // Pull in any extra assets referenced by existing forms but not yet
          // present in our category-driven query (preserves original
          // "merge missing assets" behaviour).
          const candidateExtras = new Set<string>();
          for (const form of existingForms) {
            const raw = form.assets_data;
            if (raw == null) continue;
            try {
              const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
              const assets = data?.assets;
              if (!Array.isArray(assets)) continue;
              for (const a of assets) {
                const aid = String(a?.id ?? a?.assetID ?? '').trim();
                if (aid && !seenAssetIds.has(aid)) {
                  candidateExtras.add(aid);
                }
              }
            } catch {
              /* ignore invalid JSON */
            }
          }

          const extraList = [...candidateExtras];
          if (extraList.length > 0) {
            const extraRows =
              await repo.getActiveAssignmentsByUserAndAssetIds(
                userId,
                extraList
              );
            departmentAssetsRows = [
              ...departmentAssetsRows,
              ...extraRows,
            ];
          }

          const departmentAssets = departmentAssetsRows.map(row => ({
            id: row.assetID,
            code: row.asset_code,
            name: row.name || row.asset_code,
            category: row.category_name,
            type: row.type_name,
            department: row.department_name,
            serialNo: row.serial || '',
            modelNo: row.model || '',
            brand: row.brand || '',
          }));

          logger.info(
            `Department ${deptName} has ${departmentAssets.length} total assets for user`
          );

          if (departmentAssets.length === 0) {
            logger.warn(
              `Skipping accountability refresh for department ${deptName}: no active assets after category query and merge`
            );
            continue;
          }

          const formType = deptName?.toLowerCase().includes('it')
            ? 'IT'
            : deptName?.toLowerCase().includes('admin')
              ? 'Admin'
              : deptName || 'Other';

          let disabledFormId: string | null = null;
          let previousFormOriginalStatus: string | null = null;
          if (existingForms.length > 0) {
            for (const form of existingForms) {
              previousFormOriginalStatus = form.status;
              await repo.disableAccountabilityForm(form.formID);
              disabledFormId = form.formID;
              logger.info(
                `Disabled existing form ${form.formID} for department ${deptName}`
              );
              await createAuditLog({
                userId: assignedBy,
                action: 'Disabled Accountability Form',
                resourceType: 'accountability_form',
                resourceId: form.formID,
                resourceName: `Previous ${formType} form for user ${user.first_name} ${user.last_name}`,
                details: `Previous accountability form disabled due to new asset assignment`,
                oldValues: { status: form.status },
                newValues: { status: 'Disabled' },
                ...reqAudit(req),
              });
            }
          }

          logger.info(
            `Creating new accountability form for ${formType} department (${deptName}) with ${departmentAssets.length} assets`
          );

          const departmentAssignmentIds = assignments.map(
            assignment => assignment.assignmentID
          );

          const accountabilityFormReq = {
            ...req,
            body: {
              assets: departmentAssets,
              userId,
              departmentId:
                departmentAssetsRows[0]?.department_id ?? departmentId,
              locationId,
              signAsIssuer,
              issuerSignature,
              signITCopy,
              itCopySignature,
              previousFormId: disabledFormId,
              previousFormOriginalStatus,
              assignmentIds: departmentAssignmentIds,
            },
          } as AuthRequest;

          const accountabilityFormRes = {
            status: (_code: number) => ({ json: (data: any) => data }),
          } as Response;

          const formCreateResult: unknown = await createAccountabilityFormHandler(
            accountabilityFormReq,
            accountabilityFormRes
          );
          const createdBody = formCreateResult as {
            form?: { formID?: number | string };
            error?: string;
          };
          const fid = createdBody?.form?.formID;
          if (fid != null && String(fid).trim() !== '' && String(fid) !== '0') {
            accountabilityFormIds.push(String(fid));
          }
        }
      }
    } catch (formError) {
      logger.error('Failed to create accountability form:', formError);
    }

    // ----------------------------------------------------------------
    // Notify the assignee
    // ----------------------------------------------------------------
    try {
      const assignerName = await repo.getUserFullName(assignedBy);
      const assetCodesList = assetsToAssign.join(', ');
      const truncatedCodes =
        assetCodesList.length > 50
          ? assetCodesList.substring(0, 47) + '...'
          : assetCodesList;

      await NotificationService.createNotification(
        {
          user_id: userId,
          title: 'New asset is assigned to You',
          message: `by ${assignerName}. Assets: ${truncatedCodes}`,
          type: 'asset_assignment',
          status: 'unread',
          data: JSON.stringify({
            description: `by ${assignerName}. Assets: ${truncatedCodes}`,
            route: '/my-assets',
            actionTarget: 'my_assets',
            assignedBy: assignerName,
            timestamp: new Date().toISOString(),
          }),
        },
        assignedBy,
        req.ip,
        req.get('User-Agent')
      );

      const notificationData = {
        title: 'New asset is assigned to You',
        description: `by ${assignerName}. Assets: ${truncatedCodes}`,
        type: 'asset_assigned',
        route: '/my-assets',
        actionTarget: 'my_assets',
        assignedBy: assignerName,
        timestamp: new Date().toISOString(),
      };

      const io = getIoInstance();
      if (!io) {
        logger.error('[NOTIFICATION] Socket.IO instance not available');
      } else {
        emitNotification(io, userId, 'notification', notificationData);
      }
    } catch (socketError) {
      logger.error('Failed to send WebSocket notification:', socketError);
    }

    return res.status(201).json({
      message: 'Assets assigned successfully',
      accountabilityFormIds,
      assignments: assignments.map(a => ({
        assignmentID: a.assignmentID,
        asset_id: a.asset_id,
        asset_code: a.asset_code,
        user_id: userId,
        department_id: departmentId,
        location_id: locationId,
        location_room_id: actualLocationRoomId,
        assigned_date: new Date(),
        expected_return_date: expectedReturnDate,
        assignment_notes: assignmentNotes,
        assigned_by: assignedBy,
      })),
    });
  } catch (error: any) {
    logger.error('Create asset assignment failed:', error);
    return res.status(500).json({ error: 'Failed to create asset assignment' });
  }
}

// ---------------------------------------------------------------------------
// GET /asset-assignments/me
// ---------------------------------------------------------------------------

export async function getMyAssignmentsHandler(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.userID;
    const { companyId, departmentIds } = await getAssetScope(
      pool,
      currentUserId
    );

    if (!companyId) {
      return res.json({ assignments: [] });
    }

    let where = `
      AND aa.status = 'Active'
      AND aa.user_id = ?
      AND a.company_id = ?`;
    const params: unknown[] = [currentUserId, companyId];
    if (departmentIds && departmentIds.length > 0) {
      where += ` AND ac.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    const rows = await repo.listAssignmentsRaw(
      where,
      ' ORDER BY aa.assigned_date DESC',
      params
    );

    return res.json({
      assignments: rows.map(r => mapAssignmentRow(r, null, true)),
    });
  } catch (error: any) {
    logger.error('Get my asset assignments failed:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

function mapIntangibleAssignmentRow(row: any) {
  return {
    assignmentID: row.assignmentID,
    asset: {
      id: row.intangible_asset_id,
      code: '',
      name: row.asset_name,
      category_id: '',
      type_id: row.asset_type,
    },
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      employeeNumber: row.employeeNumber,
      position: row.position,
    },
    department: row.department_id
      ? { id: row.department_id, name: row.department_name }
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
    assigned_date: row.assigned_date,
    expected_return_date: null,
    actual_return_date: null,
    assignment_notes: null,
    status: row.status,
    assigned_by: row.assigned_by
      ? {
          id: row.assigned_by,
          first_name: row.assigned_by_first_name,
          last_name: row.assigned_by_last_name,
          employeeNumber: row.assigned_by_employee_number,
        }
      : { id: '', first_name: '', last_name: '', employeeNumber: '' },
    created_at: row.created_at,
    updated_at: row.updated_at,
    assetType: 'intangible',
  };
}

// ---------------------------------------------------------------------------
// GET /asset-assignments
// ---------------------------------------------------------------------------

export async function getAssetAssignmentsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId, userId, status, companyId } = req.query;

    let physicalRows: any[] = [];
    let intangibleRows: any[] = [];

    if (companyId) {
      let where = ' AND a.company_id = ?';
      const params: unknown[] = [companyId];
      if (assetId) {
        where += ' AND aa.asset_id = (SELECT assetID FROM assets WHERE asset_code = ?)';
        params.push(assetId);
      }
      if (userId) {
        where += ' AND aa.user_id = ?';
        params.push(userId);
      }
      if (status) {
        where += ' AND aa.status = ?';
        params.push(status);
      }
      physicalRows = await repo.listAssignmentsRaw(
        where,
        ' ORDER BY aa.assigned_date DESC',
        params
      );

      intangibleRows = await repo.getIntangibleAssignments(companyId as string);
    } else {
      physicalRows = await repo.callGetAssignments(
        (assetId as string) ?? null,
        (userId as string) ?? null,
        (status as string) ?? null
      );
      intangibleRows = await repo.getIntangibleAssignments(null);
    }

    const formMap = await buildAccountabilityFormMap(physicalRows);

    const assignments = [
      ...physicalRows.map(row =>
        mapAssignmentRow(
          row,
          formMap.get(String((row as { assignmentID?: string }).assignmentID)) ??
            null,
          true
        )
      ),
      ...intangibleRows.map(row => mapIntangibleAssignmentRow(row)),
    ];

    return res.json({ assignments });
  } catch (error: any) {
    logger.error('Get asset assignments failed:', error);
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
    });
    return res.status(500).json({
      error: 'Failed to fetch asset assignments',
      details: error?.sqlMessage || error?.message,
    });
  }
}

// ---------------------------------------------------------------------------
// GET /asset-assignments/filtered
// ---------------------------------------------------------------------------

export async function getFilteredAssetAssignmentsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId, userId, status } = req.query;
    const currentUserId = req.user!.userID;

    const permissions = await loadUserModulePermissions(currentUserId);

    const hasReturnAccess =
      permissions['Asset Return']?.create && permissions['Asset Return']?.edit;
    const hasAssignmentView =
      permissions['Asset Assignment']?.view === true;
    const hasBasicAccess = hasReturnAccess || hasAssignmentView;

    if (!hasBasicAccess) {
      return res.json({ assignments: [] });
    }

    // Accept optional scope query param for IT/Admin tab switching
    const scopeParam = req.query.scope as string | undefined;
    const scopeOverride =
      scopeParam === 'it' || scopeParam === 'admin' ? scopeParam : undefined;

    const { companyId, departmentIds: scopeDeptIds, isSuperAdmin } = await getAssetScope(
      pool,
      currentUserId
    );
    if (!companyId) {
      return res.json({ assignments: [] });
    }

    let departmentIds = scopeDeptIds;

    // For Global Admin, Admin, and overallManager: apply scope override if provided
    if (scopeOverride) {
      const [userRows] = (await pool.execute(
        `SELECT r.manager_role FROM users u
         LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
         WHERE u.userID = ?`,
        [currentUserId]
      )) as any[];
      const managerRole = String(userRows?.[0]?.manager_role ?? '').trim();
      const isAdmin = permissions['Asset List']?.create && permissions['Asset List']?.edit && permissions['Asset List']?.delete;
      if (isSuperAdmin || isAdmin || managerRole === 'overallManager') {
        departmentIds = await getDepartmentIdsForScope(pool, scopeOverride, companyId);
      }
    }

    let where = '';
    const params: unknown[] = [];
    if (assetId) {
      where +=
        ' AND aa.asset_id = (SELECT assetID FROM assets WHERE asset_code = ?)';
      params.push(assetId);
    }
    if (userId) {
      where += ' AND aa.user_id = ?';
      params.push(userId);
    }
    if (status) {
      where += ' AND aa.status = ?';
      params.push(status);
    }
    where += ' AND a.company_id = ?';
    params.push(companyId);
    if (departmentIds && departmentIds.length > 0) {
      where += ` AND ac.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    const rows = await repo.listAssignmentsRaw(
      where,
      ' ORDER BY aa.assigned_date DESC',
      params
    );

    return res.json({
      assignments: rows.map(r => mapAssignmentRow(r)),
    });
  } catch (error: any) {
    logger.error('Get filtered asset assignments failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch filtered asset assignments' });
  }
}

// ---------------------------------------------------------------------------
// POST /asset-assignments/checklist
// ---------------------------------------------------------------------------

export async function createAssetChecklistHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assignmentId,
      employeeId,
      employeeName,
      employeeDesignation,
      employeeDepartment,
      employeeCompany,
      typeOnboarding,
      typeOffboarding,
      receivedBy,
      checklistData,
      remarks,
    } = req.body;
    const createdBy = req.user!.userID;

    if (!assignmentId || !employeeId || !employeeName || !checklistData) {
      return res.status(400).json({
        error: 'assignmentId, employeeId, employeeName, and checklistData are required',
      });
    }

    // Validate assignment exists
    const assignment = await repo.getAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const checklistId = randomUUID();
    let formNumber = await generateChecklistFormNumberFallback();
    const departmentIdForNumber = assignment.asset_id
      ? await getCategoryDepartmentForAssetIds([assignment.asset_id])
      : null;
    const companyIdForNumber = departmentIdForNumber
      ? await repo.getCompanyIdByDepartment(departmentIdForNumber)
      : null;
    if (companyIdForNumber) {
      formNumber = await generateChecklistFormNumber(
        companyIdForNumber,
        departmentIdForNumber
      );
    }

    await checklistRepo.createAssetChecklist({
      id: checklistId,
      formNumber,
      assignmentId,
      employeeId,
      employeeName,
      employeeDesignation: employeeDesignation || null,
      employeeDepartment: employeeDepartment || null,
      employeeCompany: employeeCompany || null,
      typeOnboarding: typeOnboarding || false,
      typeOffboarding: typeOffboarding || false,
      receivedBy: receivedBy || null,
      checklistData,
      remarks: remarks || null,
      createdBy,
    });

    await createAuditLog({
      userId: createdBy,
      action: 'Created Asset Checklist',
      resourceType: 'asset_checklist',
      resourceId: checklistId,
      resourceName: `Checklist for assignment ${assignmentId}`,
      details: `Asset checklist created for employee ${employeeName}`,
    });

    return res.status(201).json({
      message: 'Asset checklist created successfully',
      checklistId,
      formNumber,
    });
  } catch (error) {
    logger.error('Create asset checklist failed:', error);
    return res.status(500).json({ error: 'Failed to create asset checklist' });
  }
}

// GET /asset-assignments/checklist/:assignmentId
// ---------------------------------------------------------------------------

export async function getChecklistByAssignmentIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    const checklist = await checklistRepo.getChecklistByAssignmentId(assignmentId);

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const assignment = await repo.getAssignmentById(assignmentId);
    const assetDetails = assignment?.asset_id
      ? await repo.getAssetDetailsForForm(assignment.asset_id)
      : null;

    return res.status(200).json({
      ...checklist,
      asset: assignment?.asset_id
        ? {
            id: assignment.asset_id,
            code: assetDetails?.asset_code ?? null,
            name: assetDetails?.name ?? null,
          }
        : null,
    });
  } catch (error) {
    logger.error('Get checklist by assignment ID failed:', error);
    return res.status(500).json({ error: 'Failed to get checklist' });
  }
}

export async function getAssetChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const employeeId = req.query.employee_id as string | undefined;
    const checklists = await checklistListRepo.getAssetChecklists(employeeId);
    return res.status(200).json({ checklists });
  } catch (error) {
    logger.error('Get asset checklists failed:', error);
    return res.status(500).json({ error: 'Failed to get asset checklists' });
  }
}

// ---------------------------------------------------------------------------
// PUT /asset-assignments/:assignmentId/return
// ---------------------------------------------------------------------------

export async function returnAssetHandler(req: AuthRequest, res: Response) {
  try {
    const { assignmentId } = req.params;
    const { returnNotes } = req.body;
    const userId = req.user!.userID;

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    const assignment = await repo.getAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await repo.callReturnAssignment(assignmentId, returnNotes || '', userId);

    // Builder status update
    const builders = await repo.getBuildersForAsset(assignment.asset_id);
    if (builders.length > 0) {
      const builder = builders[0]!;
      const assignedCount = await repo.countAssignedAssetsInBuilder(
        builder.builderID
      );

      if (assignedCount === 0 && builder.builder_status === 'Assigned') {
        await repo.setBuilderStatus(builder.builderID, 'Available', userId);
        const returnedAssetCode =
          (await repo.getAssetCodeById(assignment.asset_id)) ??
          assignment.asset_id;
        await createAuditLog({
          userId,
          action: 'Updated Asset Builder Status',
          resourceType: 'asset_builder',
          resourceId: builder.builderID,
          resourceName: builder.name,
          details: `Asset builder "${builder.name}" status updated to "Available" due to asset return. Assets returned:\n• ${returnedAssetCode}`,
          oldValues: { status: 'Assigned' },
          newValues: {
            status: 'Available',
            returned_asset_codes: [returnedAssetCode],
          },
          ...reqAudit(req),
        });
      }

      // Partial return: remove returned asset from builder
      if (assignedCount > 0) {
        await repo.removeAssetFromAllBuilders(assignment.asset_id);
        const assetCodeForRemove =
          (await repo.getAssetCodeById(assignment.asset_id)) ??
          assignment.asset_id;
        await createAuditLog({
          userId,
          action: 'Removed from Asset Builder',
          resourceType: 'asset',
          resourceId: assetCodeForRemove,
          resourceName: assetCodeForRemove,
          details: `Asset "${assetCodeForRemove}" removed from asset builder due to partial return`,
          oldValues: { builder_ids: builders.map(b => b.builderID) },
          ...reqAudit(req),
        });
        for (const b of builders) {
          await createAuditLog({
            userId,
            action: 'Removed from Asset Builder',
            resourceType: 'asset_builder',
            resourceId: b.builderID,
            resourceName: b.name,
            details: `Asset "${assetCodeForRemove}" removed from asset builder due to partial return`,
            oldValues: {
              asset_id: assignment.asset_id,
              asset_code: assetCodeForRemove,
            },
            ...reqAudit(req),
          });
        }
      }
    }

    await createAuditLog({
      userId,
      action: 'Returned Asset',
      resourceType: 'asset_assignment',
      resourceId: assignment.assignmentID,
      resourceName: assignment.asset_id,
      details: `Asset returned with notes: ${returnNotes || 'None'}`,
      oldValues: { status: assignment.status },
      newValues: {
        status: 'Returned',
        actual_return_date: new Date(),
        return_notes: returnNotes,
      },
      ...reqAudit(req),
    });

    try {
      await handleAccountabilityFormOnAssetReturn(
        assignment.user_id,
        [assignment.asset_id],
        assignment.department_id,
        assignment.location_id,
        assignment.location_room_id,
        userId,
        req
      );
    } catch (formErr) {
      logger.error('Accountability form update on return failed:', formErr);
    }

    return res.json({ message: 'Asset returned successfully' });
  } catch (error: any) {
    logger.error('Return asset failed:', error);
    return res.status(500).json({ error: 'Failed to return asset' });
  }
}

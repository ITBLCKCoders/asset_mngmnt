import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as intangibleAssetsService from '../services/intangibleAssets.service.js';
import * as repo from '../repositories/assetAssignment.repository.js';
import * as formRepo from '../repositories/accountabilityForm.repository.js';
import * as intangibleRepo from '../repositories/intangibleAssets.repository.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';

/**
 * Shared pending-copy handling for intangible accountability forms created
 * with a designated IT/Admin copy signer: hide the linked intangible rows
 * and notify the copy signer instead of the asset owner. The owner is
 * notified with both notices once the form is finally approved.
 * Returns true when the pending flow applies.
 */
async function holdIntangiblesForPendingCopy(args: {
  assignmentId: string;
  assignedTo: string;
  adminCopySignerId: string | null | undefined;
  adminCopyCopyType: string | null | undefined;
  formId: string;
  formNumber: string;
  req: AuthRequest;
}): Promise<boolean> {
  if (!args.adminCopySignerId) return false;
  try {
    await intangibleRepo.setIntangibleInactiveByAccountabilityAssignmentIds(
      [args.assignmentId],
      args.assignedTo
    );
  } catch (hideErr) {
    logger.error('Failed to hold intangible assignments pending copy sign:', hideErr);
  }
  try {
    const signerNameRow = await formRepo.getUserNameById(args.adminCopySignerId);
    void signerNameRow;
    const issuerRow = await formRepo.getUserNameById(args.req.user!.userID);
    const assignerName = issuerRow
      ? `${issuerRow.first_name ?? ''} ${issuerRow.last_name ?? ''}`.trim() || args.req.user!.userID
      : args.req.user!.userID;
    const ownerRow = await formRepo.getUserNameById(args.assignedTo);
    const ownerName = ownerRow
      ? `${ownerRow.first_name ?? ''} ${ownerRow.last_name ?? ''}`.trim() || args.assignedTo
      : args.assignedTo;
    const copyType = args.adminCopyCopyType === 'Admin' ? 'Admin' : 'IT';
    await NotificationService.createNotification(
      {
        user_id: args.adminCopySignerId,
        title: `Accountability form ${args.formNumber} needs ${copyType} copy signature`,
        message: `Please sign the ${copyType} copy for ${ownerName}'s accountability form (${args.formNumber}).`,
        type: 'accountability_form',
        status: 'unread',
        data: JSON.stringify({
          description: `Please sign the ${copyType} copy for ${ownerName}'s accountability form (${args.formNumber}).`,
          route: '/approvals?tab=for-approval',
          actionTarget: 'accountability_form_admin_copy',
          formId: args.formId,
          formNumber: args.formNumber,
          copyType,
          assignedBy: assignerName,
          timestamp: new Date().toISOString(),
        }),
      },
      args.req.user!.userID,
      args.req.ip,
      args.req.get('User-Agent')
    );
    const io = getIoInstance();
    if (io) {
      emitNotification(io, args.adminCopySignerId, 'notification', {
        title: `Accountability form ${args.formNumber} needs ${copyType} copy signature`,
        description: `Please sign the ${copyType} copy for ${ownerName}'s accountability form (${args.formNumber}).`,
        type: 'accountability_form',
        route: '/approvals?tab=for-approval',
        actionTarget: 'accountability_form_admin_copy',
        formId: args.formId,
        formNumber: args.formNumber,
        copyType,
        assignedBy: assignerName,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (notifErr) {
    logger.error('Failed to notify copy signer for intangible form:', notifErr);
  }
  return true;
}

/**
 * Adopt an in-flight (pending approval) accountability form instead of
 * disabling + recreating it: merge the newly assigned assets into its
 * `assets_data` so ONE live form carries the whole issuance flow. The copy
 * signer was already notified for the adopted form, so no new notification
 * is sent — only the rows are held hidden and an audit entry is written.
 * Returns an error message string, or null on success.
 */
async function mergeAssetsIntoInflightForm(args: {
  mergeTarget: { formID: string; form_number: string; assets_data: string | null };
  combinedAssets: any[];
  assignmentId: string;
  assignedTo: string;
  userId: string;
  req: AuthRequest;
}): Promise<string | null> {
  try {
    const merged = await formRepo.mergeAssetsIntoFormAssetsData(
      args.mergeTarget.formID,
      args.combinedAssets,
      [args.assignmentId]
    );
    try {
      await intangibleRepo.setIntangibleInactiveByAccountabilityAssignmentIds(
        [args.assignmentId],
        args.assignedTo
      );
    } catch (hideErr) {
      logger.error('Failed to hold intangible assignments on merge into in-flight form:', hideErr);
    }
    await createAuditLog({
      userId: args.userId,
      action: 'Merged Assets Into In-Flight Accountability Form',
      resourceType: 'accountability_form',
      resourceId: args.mergeTarget.formID,
      resourceName: args.mergeTarget.form_number,
      details: `Merged ${args.combinedAssets.length} asset(s) into in-flight form ${args.mergeTarget.form_number} instead of recreating it`,
      newValues: { assetCount: merged.assetCount, assignment_ids: merged.assignmentIds },
      ipAddress: args.req.ip || 'unknown',
      userAgent: args.req.get('User-Agent') || 'unknown',
    });
    return null;
  } catch (err: any) {
    logger.error('Failed to merge assets into in-flight form:', err);
    return 'Failed to merge new assets into the pending accountability form';
  }
}

// GET all intangible assets
export const getAllIntangibleAssets = async (req: AuthRequest, res: Response) => {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const assets = await intangibleAssetsService.getAllIntangibleAssets(
      activeCompany.id
    );
    res.json(assets);
  } catch (err) {
    logger.error('Get all intangible assets error', { err });
    res.status(500).json({ error: 'Failed to fetch intangible assets' });
  }
};

// CREATE single intangible asset
export const createIntangibleAsset = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const { name, description, remarks, type, riskLevelId, status } = req.body;

    const id = await intangibleAssetsService.createIntangibleAsset({
      name,
      description: description || null,
      remarks: remarks || null,
      type,
      riskLevelId: riskLevelId || null,
      status: status || 'available',
      companyId: activeCompany.id,
      createdBy: userId,
    });

    await createAuditLog({
      userId,
      action: 'Created Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: name,
      details: `Created intangible asset "${name}"`,
      newValues: { name, description, remarks, type, riskLevelId, status },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    logger.error('Create intangible asset error', { err });
    res.status(500).json({ error: 'Failed to create intangible asset' });
  }
};

// CREATE bulk intangible assets
export const createIntangibleAssetsBulk = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const { assets } = req.body;

    const results = await intangibleAssetsService.createIntangibleAssetsBulk(
      assets,
      activeCompany.id,
      userId
    );

    await createAuditLog({
      userId,
      action: 'Created Intangible Assets (Bulk)',
      resourceType: 'intangible_asset',
      details: `Created ${assets.length} intangible assets in bulk`,
      newValues: { count: assets.length },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true, results });
  } catch (err: any) {
    logger.error('Create intangible assets bulk error', { err });
    res.status(500).json({ error: 'Failed to create intangible assets' });
  }
};

// UPDATE intangible asset
export const updateIntangibleAsset = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID is required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const { name, description, remarks, type, riskLevelId, status } = req.body;

    // Get existing asset for audit log
    const existingAsset =
      await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
    if (!existingAsset) {
      return res.status(404).json({ error: 'Intangible asset not found' });
    }

    await intangibleAssetsService.updateIntangibleAsset(id, {
      name,
      description: description || null,
      remarks: remarks || null,
      type,
      riskLevelId: riskLevelId !== undefined ? riskLevelId : null,
      status: status ?? existingAsset.status,
      companyId: activeCompany.id,
      updatedBy: userId,
      assignedTo: existingAsset.assigned_to || null,
      assignedDate: existingAsset.assigned_date || null,
      assignmentId: existingAsset.assignment_id || null,
    });

    await createAuditLog({
      userId,
      action: 'Updated Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: name || existingAsset.name,
      details: `Updated intangible asset "${id}"`,
      oldValues: existingAsset,
      newValues: { name, description, remarks, type, riskLevelId, status },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

    // Sync updated fields into all active accountability forms referencing this asset
    try {
      const forms = await formRepo.findActiveFormsByIntangibleAssetId(id);
      for (const form of forms) {
        try {
          const assetsDataRaw = form.assets_data;
          if (!assetsDataRaw) continue;

          const assetsData =
            typeof assetsDataRaw === 'string'
              ? JSON.parse(assetsDataRaw)
              : typeof assetsDataRaw === 'object'
                ? (assetsDataRaw as Record<string, unknown>)
                : null;

          if (!assetsData || !Array.isArray(assetsData.assets)) continue;

          const updatedAssets = (assetsData.assets as any[]).map((a: any) => {
            if (String(a.id) === String(id)) {
              return {
                ...a,
                name: name ?? a.name,
                code: name ?? a.code,
                description: description !== undefined ? description : a.description,
                type: type ?? a.type,
                risk_level:
                  riskLevelId !== undefined && riskLevelId !== null
                    ? { id: riskLevelId }
                    : a.risk_level ?? null,
              };
            }
            return a;
          });

          assetsData.assets = updatedAssets;
          await formRepo.updateFormAssetsDataById(form.formID, JSON.stringify(assetsData));
        } catch (formErr) {
          logger.error('Failed to sync accountability form for intangible asset update', {
            formID: form.formID,
            err: formErr,
          });
        }
      }
    } catch (syncErr) {
      logger.error('Failed to query accountability forms for intangible asset sync', {
        assetId: id,
        err: syncErr,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update intangible asset error', { err });
    res.status(500).json({ error: 'Failed to update intangible asset' });
  }
};

// ASSIGN intangible asset to user
export const assignIntangibleAsset = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID is required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const {
      assignedTo,
      assignmentId,
      departmentId,
      locationId,
      locationRoomId,
      signAsIssuer,
      issuerSignature,
      signITCopy,
      itCopySignature,
      tempAccountability,
      adminCopySignerId,
      adminCopyCopyType,
    } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ error: 'User ID is required for assignment' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Get existing asset for audit log
    const existingAsset =
      await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
    if (!existingAsset) {
      return res.status(404).json({ error: 'Intangible asset not found' });
    }

    const alreadyAssigned = await intangibleAssetsService.hasActiveAssignment(id, assignedTo);
    if (alreadyAssigned) {
      return res.status(400).json({ error: 'Asset is already assigned to this user' });
    }

    const result = await intangibleAssetsService.assignIntangibleAsset({
      id,
      assignedTo,
      assignmentId,
      companyId: activeCompany.id,
      assignedBy: userId,
      departmentId: departmentId || null,
      locationId: locationId || null,
      locationRoomId: locationRoomId || null,
    });

    if (!result.assigned) {
      return res.status(400).json({ error: 'Asset is already assigned to this user' });
    }

    await createAuditLog({
      userId,
      action: 'Assigned Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: existingAsset.name,
      details: `Assigned intangible asset "${existingAsset.name}" to user`,
      newValues: { assignedTo, assignmentId },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

    // Handle accountability form with user's existing tangible assets (same logic as batch assign)
    let formErrorMsg: string | null = null;
    if (departmentId && assignedTo) {
      const [deptRows] = await pool.execute(
        'SELECT name FROM asset_mngmnt_departments WHERE departmentID = ?',
        [departmentId]
      );
      const deptName = (deptRows as any[])[0]?.name;

      if (deptName) {
        const [catRows] = await pool.execute(
          'SELECT categoryID FROM asset_categories WHERE department_id = ? AND deleted_at IS NULL',
          [departmentId]
        );
        const categoryIds = (catRows as any[]).map(r => String(r.categoryID)).filter(Boolean);

        const departmentAssetsRows = categoryIds.length > 0
          ? await repo.getActiveAssignmentsByUserAndCategories(assignedTo, categoryIds)
          : [];

        // Include just-issued tangible assignments still held as `Inactive`
        // pending the IT/Admin copy signature so merged forms don't drop them.
        if (categoryIds.length > 0) {
          try {
            const pendingRows = await repo.getPendingCopyAssignmentsByUserAndCategories(
              assignedTo,
              categoryIds
            );
            const seen = new Set(departmentAssetsRows.map(r => String((r as any).assetID)));
            for (const row of pendingRows) {
              if (!seen.has(String((row as any).assetID))) {
                departmentAssetsRows.push(row);
                seen.add(String((row as any).assetID));
              }
            }
          } catch (mergeErr) {
            logger.error('Failed to merge pending-copy assignments into form:', mergeErr);
          }
        }

        // All of the user's currently-active intangible assets in this department
        // (includes the asset being assigned plus previously assigned ones).
        const intangibleRows = departmentId
          ? await formRepo.getActiveIntangibleAssetsByUserAndDepartment(assignedTo, departmentId)
          : [];

        const combinedAssets = [
          ...departmentAssetsRows.map(row => ({
            id: row.assetID,
            code: row.asset_code,
            name: row.name || row.asset_code,
            category: row.category_name,
            type: row.type_name,
            department: row.department_name,
            serialNo: row.serial || '',
            modelNo: row.model || '',
            brand: row.brand || '',
          })),
          ...(intangibleRows as any[]).map(ia => ({
            id: ia.id,
            code: ia.name || ia.id,
            name: ia.name || '',
            description: ia.description || '',
            category: 'Intangible',
            type: ia.type || 'Intangible',
            department: ia.type_department_name || deptName,
            serialNo: '',
            modelNo: '',
            brand: '',
          })),
        ];

        if (combinedAssets.length > 0) {
          // Never disable in-flight approval forms: adopt the newest one and
          // merge the new assets into it so a single live form carries the
          // whole issuance flow (mixed tangible+intangible issuance).
          const existingForms = await repo.getExistingAccountabilityForms(assignedTo, deptName);
          const inflightForms = existingForms.filter(f =>
            String((f as any).approval_status ?? '').startsWith('pending')
          );
          for (const form of existingForms) {
            if (inflightForms.some(f => f.formID === form.formID)) continue;
            await repo.disableAccountabilityForm(form.formID);
          }
          const mergeTarget = inflightForms[0] ?? null;
          if (mergeTarget) {
            formErrorMsg = await mergeAssetsIntoInflightForm({
              mergeTarget,
              combinedAssets,
              assignmentId,
              assignedTo,
              userId,
              req,
            });
          } else {

          // Generate form number
          const settings = await formRepo.getAccountabilityFormSettings(activeCompany.id);
          if (!settings) {
            formErrorMsg = 'Accountability form settings not configured for company';
          } else {
            const companyInfo = await formRepo.getCompanyCodePrefix(activeCompany.id);
            const deptInfo = await formRepo.getDepartmentCodePrefix(departmentId);

            // Determine IT vs Admin from the intangible asset type's department
            // (mirrors how tangible assets route by their category's department).
            const typeDeptNames = (intangibleRows as any[])
              .map((ia: any) => ia.type_department_name)
              .filter(Boolean)
              .map((n: string) => n.toLowerCase());
            const isIT = typeDeptNames.some(
              (n: string) => n.includes('it') || n.includes('information technology')
            );
            const isAdmin = typeDeptNames.some(
              (n: string) => n.includes('admin') || n.includes('administration')
            );
            const isITAsset = isIT || (!isAdmin);
            const assetCode = isITAsset
              ? settings.it_asset_code
              : settings.admin_asset_code;

            const parts: string[] = [];
            const companyPart = settings.company_format === 'code' ? companyInfo?.code : companyInfo?.prefix;
            if (companyPart) parts.push(companyPart);
            const deptPart = settings.department_format === 'code' ? deptInfo?.code : deptInfo?.prefix;
            if (deptPart) parts.push(deptPart);
            if (assetCode) parts.push(assetCode);
            const now = new Date();
            const dateStr = settings.date_format === 'YYYYMMDD'
              ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
              : `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
            if (settings.include_date) parts.push(dateStr);

            // For MMYYYY: reset per year, so match any month in the same year
            const basePattern = settings.include_date
              ? parts.slice(0, -1).join('-')
              : parts.join('-');
            const year = settings.include_date ? now.getFullYear() : null;
            const likeParam =
              settings.include_date && settings.date_format === 'MMYYYY'
                ? `${basePattern}-%${year}`
                : parts.join('-');
            const nextSeq = await formRepo.getNextFormSequence(likeParam);
            parts.push(String(nextSeq).padStart(4, '0'));
            const formNumber = parts.join('-');

            const assetsDataPayload: Record<string, unknown> = {
              assets: combinedAssets,
              assignment_ids: [assignmentId],
            };

            await formRepo.insertAccountabilityFormMulti({
              formNumber,
              userId: assignedTo,
              departmentId: departmentId || null,
              locationId: locationId || null,
              createdBy: userId,
              assetsDataJson: JSON.stringify(assetsDataPayload),
              issuerSignature: issuerSignature || null,
              itCopySignature: itCopySignature || null,
              assignmentId: null,
              approvalStatus: adminCopySignerId ? 'pending_admin_copy_signature' : 'approved',
              adminCopySignerId: adminCopySignerId ?? null,
              adminCopyCopyType: adminCopyCopyType ?? null,
            });

            const resolvedFormId = await formRepo.findFormIdByFormNumber(formNumber);
            if (!resolvedFormId) {
              formErrorMsg = 'Form inserted but could not resolve form ID';
              logger.error(formErrorMsg, { formNumber });
            } else {
              logger.info('Created accountability form:', { formID: resolvedFormId, formNumber });

              const userDetails = await formRepo.getUserCompanyAndName(assignedTo);
              const userName = `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
              await createAuditLog({
                userId,
                action: 'Created Accountability Form',
                resourceType: 'accountability_form',
                resourceId: resolvedFormId,
                resourceName: formNumber,
                details: `Accountability form ${formNumber} created for ${userName} with ${combinedAssets.length} assets`,
                newValues: { form_number: formNumber, user_id: assignedTo, assets: combinedAssets },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown',
                companyId: activeCompany.id,
              });

              // Pending copy flow holds the rows hidden and notifies the copy
              // signer; the owner is notified only at final approval.
              const pendingCopyFlow = await holdIntangiblesForPendingCopy({
                assignmentId,
                assignedTo,
                adminCopySignerId: adminCopySignerId ?? null,
                adminCopyCopyType: adminCopyCopyType ?? null,
                formId: resolvedFormId,
                formNumber,
                req,
              });
              if (!pendingCopyFlow) {
              try {
                const createdByRow = await formRepo.getUserNameById(userId);
                const assignerName = createdByRow
                  ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || userId
                  : userId;

                await NotificationService.createNotification(
                  {
                    user_id: assignedTo,
                    title: 'New accountability form has been issued',
                    message: `by ${assignerName}. Review it and check your assets and sign the form`,
                    type: 'accountability_form',
                    status: 'unread',
                    data: JSON.stringify({
                      description: `by ${assignerName}. Review it and check your assets and sign the form`,
                      route: '/profile?tab=documents',
                      actionTarget: 'profile_documents',
                      formId: resolvedFormId,
                      formNumber,
                      assignedBy: assignerName,
                      timestamp: new Date().toISOString(),
                    }),
                  },
                  userId,
                  req.ip,
                  req.get('User-Agent')
                );

                const io = getIoInstance();
                if (io) {
                  emitNotification(io, assignedTo, 'notification', {
                    title: 'New accountability form has been issued',
                    description: `by ${assignerName}. Review it and check your assets and sign the form`,
                    type: 'accountability_form',
                    route: '/profile?tab=documents',
                    actionTarget: 'profile_documents',
                    formId: resolvedFormId,
                    formNumber,
                    assignedBy: assignerName,
                    timestamp: new Date().toISOString(),
                  });
                }
              } catch (notifError) {
                logger.error('Failed to send form notification:', notifError);
              }
              }
            }
          }
          }
        }
      }
    }

    res.json({ success: !formErrorMsg, formError: formErrorMsg });
  } catch (err: any) {
    logger.error('Assign intangible asset error', { err });
    res.status(500).json({ error: 'Failed to assign intangible asset' });
  }
};

// UNASSIGN intangible asset from a specific user
export const unassignIntangibleAsset = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  if (!id) {
    return res.status(400).json({ error: 'Asset ID is required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const { userId: assigneeUserId } = req.body;
    if (!assigneeUserId) {
      return res.status(400).json({ error: 'User ID is required for unassignment' });
    }

    // Get existing asset for audit log
    const existingAsset =
      await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
    if (!existingAsset) {
      return res.status(404).json({ error: 'Intangible asset not found' });
    }

    await intangibleAssetsService.unassignIntangibleAsset(id, assigneeUserId, activeCompany.id);

    await createAuditLog({
      userId,
      action: 'Unassigned Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: existingAsset.name,
      details: `Unassigned intangible asset "${existingAsset.name}" from user`,
      oldValues: { assignedTo: assigneeUserId },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Unassign intangible asset error', { err });
    res.status(500).json({ error: 'Failed to unassign intangible asset' });
  }
};

// BATCH assign intangible assets with accountability form creation
export const batchAssignIntangibleAssets = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const {
      assetIds,
      assignedTo,
      assignmentId,
      departmentId,
      locationId,
      locationRoomId,
      signAsIssuer,
      issuerSignature,
      signITCopy,
      itCopySignature,
      adminCopySignerId,
      adminCopyCopyType,
    } = req.body as {
      assetIds?: string[];
      assignedTo?: string;
      assignmentId?: string;
      departmentId?: string | null;
      locationId?: string | null;
      locationRoomId?: string | null;
      signAsIssuer?: boolean;
      issuerSignature?: string | null;
      signITCopy?: boolean;
      itCopySignature?: string | null;
      adminCopySignerId?: string | null;
      adminCopyCopyType?: 'IT' | 'Admin' | null;
    };

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'Asset IDs are required' });
    }
    if (!assignedTo) {
      return res.status(400).json({ error: 'User ID is required for assignment' });
    }
    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Assign each intangible asset (allows multiple concurrent assignees)
    const failedAssets: string[] = [];
    const skippedAssets: string[] = [];
    for (const id of assetIds) {
      try {
        const existingAsset = await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
        if (!existingAsset) {
          failedAssets.push(id);
          continue;
        }

        const alreadyAssigned = await intangibleAssetsService.hasActiveAssignment(id, assignedTo);
        if (alreadyAssigned) {
          skippedAssets.push(id);
          continue;
        }

        const result = await intangibleAssetsService.assignIntangibleAsset({
          id,
          assignedTo,
          assignmentId,
          companyId: activeCompany.id,
          assignedBy: userId,
          departmentId: departmentId || null,
          locationId: locationId || null,
          locationRoomId: locationRoomId || null,
        });

        if (!result.assigned) {
          skippedAssets.push(id);
          continue;
        }

        await createAuditLog({
          userId,
          action: 'Assigned Intangible Asset',
          resourceType: 'intangible_asset',
          resourceId: id,
          resourceName: existingAsset.name,
          details: `Assigned intangible asset "${existingAsset.name}" to user`,
          newValues: { assignedTo, assignmentId },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          companyId: activeCompany.id,
        });
      } catch (err) {
        logger.error('Failed to assign intangible asset:', { id, err });
        failedAssets.push(id);
      }
    }

    // Handle accountability form with user's existing tangible assets
    let formErrorMsg: string | null = null;
    if (departmentId && assignedTo) {
      const [deptRows] = await pool.execute(
        'SELECT name FROM asset_mngmnt_departments WHERE departmentID = ?',
        [departmentId]
      );
      const deptName = (deptRows as any[])[0]?.name;

      if (deptName) {
        const [catRows] = await pool.execute(
          'SELECT categoryID FROM asset_categories WHERE department_id = ? AND deleted_at IS NULL',
          [departmentId]
        );
        const categoryIds = (catRows as any[]).map(r => String(r.categoryID)).filter(Boolean);

        const departmentAssetsRows = categoryIds.length > 0
          ? await repo.getActiveAssignmentsByUserAndCategories(assignedTo, categoryIds)
          : [];

        // Include just-issued tangible assignments still held as `Inactive`
        // pending the IT/Admin copy signature so merged forms don't drop them.
        if (categoryIds.length > 0) {
          try {
            const pendingRows = await repo.getPendingCopyAssignmentsByUserAndCategories(
              assignedTo,
              categoryIds
            );
            const seen = new Set(departmentAssetsRows.map(r => String((r as any).assetID)));
            for (const row of pendingRows) {
              if (!seen.has(String((row as any).assetID))) {
                departmentAssetsRows.push(row);
                seen.add(String((row as any).assetID));
              }
            }
          } catch (mergeErr) {
            logger.error('Failed to merge pending-copy assignments into form:', mergeErr);
          }
        }

        // All of the user's currently-active intangible assets in this department
        // (includes the assets being assigned in this batch plus previously assigned ones).
        const intangibleRows = departmentId
          ? await formRepo.getActiveIntangibleAssetsByUserAndDepartment(assignedTo, departmentId)
          : [];

        const combinedAssets = [
          ...departmentAssetsRows.map(row => ({
            id: row.assetID,
            code: row.asset_code,
            name: row.name || row.asset_code,
            category: row.category_name,
            type: row.type_name,
            department: row.department_name,
            serialNo: row.serial || '',
            modelNo: row.model || '',
            brand: row.brand || '',
          })),
          ...(intangibleRows as any[]).map(ia => ({
            id: ia.id,
            code: ia.name || ia.id,
            name: ia.name || '',
            description: ia.description || '',
            category: 'Intangible',
            type: ia.type || 'Intangible',
            department: ia.type_department_name || deptName,
            serialNo: '',
            modelNo: '',
            brand: '',
          })),
        ];

        if (combinedAssets.length > 0) {
          // Never disable in-flight approval forms: adopt the newest one and
          // merge the new assets into it so a single live form carries the
          // whole issuance flow (mixed tangible+intangible issuance).
          const existingForms = await repo.getExistingAccountabilityForms(assignedTo, deptName);
          const inflightForms = existingForms.filter(f =>
            String((f as any).approval_status ?? '').startsWith('pending')
          );
          for (const form of existingForms) {
            if (inflightForms.some(f => f.formID === form.formID)) continue;
            await repo.disableAccountabilityForm(form.formID);
          }
          const mergeTarget = inflightForms[0] ?? null;
          if (mergeTarget) {
            formErrorMsg = await mergeAssetsIntoInflightForm({
              mergeTarget,
              combinedAssets,
              assignmentId,
              assignedTo,
              userId,
              req,
            });
          } else {

          // Generate form number
          const settings = await formRepo.getAccountabilityFormSettings(activeCompany.id);
          if (!settings) {
            formErrorMsg = 'Accountability form settings not configured for company';
          } else {
            const companyInfo = await formRepo.getCompanyCodePrefix(activeCompany.id);
            const deptInfo = await formRepo.getDepartmentCodePrefix(departmentId);

            // Determine IT vs Admin from the intangible asset type's department
            // (mirrors how tangible assets route by their category's department).
            const typeDeptNames = (intangibleRows as any[])
              .map((ia: any) => ia.type_department_name)
              .filter(Boolean)
              .map((n: string) => n.toLowerCase());
            const isIT = typeDeptNames.some(
              (n: string) => n.includes('it') || n.includes('information technology')
            );
            const isAdmin = typeDeptNames.some(
              (n: string) => n.includes('admin') || n.includes('administration')
            );
            const isITAsset = isIT || (!isAdmin);
            const assetCode = isITAsset
              ? settings.it_asset_code
              : settings.admin_asset_code;

            const parts: string[] = [];
            const companyPart = settings.company_format === 'code' ? companyInfo?.code : companyInfo?.prefix;
            if (companyPart) parts.push(companyPart);
            const deptPart = settings.department_format === 'code' ? deptInfo?.code : deptInfo?.prefix;
            if (deptPart) parts.push(deptPart);
            if (assetCode) parts.push(assetCode);
            const now = new Date();
            const dateStr = settings.date_format === 'YYYYMMDD'
              ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
              : `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
            if (settings.include_date) parts.push(dateStr);

            // For MMYYYY: reset per year, so match any month in the same year
            const basePattern = settings.include_date
              ? parts.slice(0, -1).join('-')
              : parts.join('-');
            const year = settings.include_date ? now.getFullYear() : null;
            const likeParam =
              settings.include_date && settings.date_format === 'MMYYYY'
                ? `${basePattern}-%${year}`
                : parts.join('-');
            const nextSeq = await formRepo.getNextFormSequence(likeParam);
            parts.push(String(nextSeq).padStart(4, '0'));
            const formNumber = parts.join('-');

            const assetsDataPayload: Record<string, unknown> = {
              assets: combinedAssets,
              assignment_ids: [assignmentId],
            };

            await formRepo.insertAccountabilityFormMulti({
              formNumber,
              userId: assignedTo,
              departmentId: departmentId || null,
              locationId: locationId || null,
              createdBy: userId,
              assetsDataJson: JSON.stringify(assetsDataPayload),
              issuerSignature: issuerSignature || null,
              itCopySignature: itCopySignature || null,
              assignmentId: null,
              approvalStatus: adminCopySignerId ? 'pending_admin_copy_signature' : 'approved',
              adminCopySignerId: adminCopySignerId ?? null,
              adminCopyCopyType: adminCopyCopyType ?? null,
            });

            const resolvedFormId = await formRepo.findFormIdByFormNumber(formNumber);
            if (!resolvedFormId) {
              formErrorMsg = 'Form inserted but could not resolve form ID';
              logger.error(formErrorMsg, { formNumber });
            } else {
              logger.info('Created accountability form:', { formID: resolvedFormId, formNumber });

              const userDetails = await formRepo.getUserCompanyAndName(assignedTo);
              const userName = `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
              await createAuditLog({
                userId,
                action: 'Created Accountability Form',
                resourceType: 'accountability_form',
                resourceId: resolvedFormId,
                resourceName: formNumber,
                details: `Accountability form ${formNumber} created for ${userName} with ${combinedAssets.length} assets`,
                newValues: { form_number: formNumber, user_id: assignedTo, assets: combinedAssets },
                ipAddress: req.ip || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown',
                companyId: activeCompany.id,
              });

              // Pending copy flow holds the rows hidden and notifies the copy
              // signer; the owner is notified only at final approval.
              const pendingCopyFlow = await holdIntangiblesForPendingCopy({
                assignmentId,
                assignedTo,
                adminCopySignerId: adminCopySignerId ?? null,
                adminCopyCopyType: adminCopyCopyType ?? null,
                formId: resolvedFormId,
                formNumber,
                req,
              });
              if (!pendingCopyFlow) {
              try {
                const createdByRow = await formRepo.getUserNameById(userId);
                const assignerName = createdByRow
                  ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || userId
                  : userId;

                await NotificationService.createNotification(
                  {
                    user_id: assignedTo,
                    title: 'New accountability form has been issued',
                    message: `by ${assignerName}. Review it and check your assets and sign the form`,
                    type: 'accountability_form',
                    status: 'unread',
                    data: JSON.stringify({
                      description: `by ${assignerName}. Review it and check your assets and sign the form`,
                      route: '/profile?tab=documents',
                      actionTarget: 'profile_documents',
                      formId: resolvedFormId,
                      formNumber,
                      assignedBy: assignerName,
                      timestamp: new Date().toISOString(),
                    }),
                  },
                  userId,
                  req.ip,
                  req.get('User-Agent')
                );

                const io = getIoInstance();
                if (io) {
                  emitNotification(io, assignedTo, 'notification', {
                    title: 'New accountability form has been issued',
                    description: `by ${assignerName}. Review it and check your assets and sign the form`,
                    type: 'accountability_form',
                    route: '/profile?tab=documents',
                    actionTarget: 'profile_documents',
                    formId: resolvedFormId,
                    formNumber,
                    assignedBy: assignerName,
                    timestamp: new Date().toISOString(),
                  });
                }
              } catch (notifError) {
                logger.error('Failed to send form notification:', notifError);
              }
              }
            }
          }
          }
        }
      }
    }

    res.json({
      success: !formErrorMsg,
      assigned: assetIds.filter(id => !failedAssets.includes(id) && !skippedAssets.includes(id)),
      skipped: skippedAssets,
      failed: failedAssets,
      formError: formErrorMsg,
    });
  } catch (err: any) {
    logger.error('Batch assign intangible assets error', { message: err.message, stack: err.stack, sqlMessage: err.sqlMessage, sql: err.sql });
    res.status(500).json({ error: err.message || 'Failed to batch assign intangible assets' });
  }
};

import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as intangibleAssetsService from '../services/intangibleAssets.service.js';
import * as repo from '../repositories/assetAssignment.repository.js';
import * as formRepo from '../repositories/accountabilityForm.repository.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';

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

    const { name, description, remarks, type, status } = req.body;

    const id = await intangibleAssetsService.createIntangibleAsset({
      name,
      description: description || null,
      remarks: remarks || null,
      type,
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
      newValues: { name, description, remarks, type, status },
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

    const { name, description, remarks, type, status, assignedTo, assignedDate, assignmentId } = req.body;

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
      status: status ?? existingAsset.status,
      companyId: activeCompany.id,
      updatedBy: userId,
      assignedTo: assignedTo || null,
      assignedDate: assignedDate || null,
      assignmentId: assignmentId || null,
    });

    await createAuditLog({
      userId,
      action: 'Updated Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: name || existingAsset.name,
      details: `Updated intangible asset "${id}"`,
      oldValues: existingAsset,
      newValues: { name, description, remarks, type, status, assignedTo, assignmentId },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      companyId: activeCompany.id,
    });

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

    const { assignedTo, assignmentId } = req.body;

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

    if (existingAsset.status === 'assigned') {
      return res.status(400).json({ error: 'Asset is already assigned' });
    }

    await intangibleAssetsService.assignIntangibleAsset(
      id,
      assignedTo,
      assignmentId,
      activeCompany.id
    );

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

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Assign intangible asset error', { err });
    res.status(500).json({ error: 'Failed to assign intangible asset' });
  }
};

// UNASSIGN intangible asset
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

    // Get existing asset for audit log
    const existingAsset =
      await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
    if (!existingAsset) {
      return res.status(404).json({ error: 'Intangible asset not found' });
    }

    await intangibleAssetsService.unassignIntangibleAsset(id, activeCompany.id);

    await createAuditLog({
      userId,
      action: 'Unassigned Intangible Asset',
      resourceType: 'intangible_asset',
      resourceId: id,
      resourceName: existingAsset.name,
      details: `Unassigned intangible asset "${existingAsset.name}"`,
      oldValues: { assignedTo: existingAsset.assigned_to, assignmentId: existingAsset.assignment_id },
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

    const { assetIds, assignedTo, assignmentId, departmentId, locationId,
            signAsIssuer, issuerSignature, signITCopy, itCopySignature } = req.body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'Asset IDs are required' });
    }
    if (!assignedTo) {
      return res.status(400).json({ error: 'User ID is required for assignment' });
    }
    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    // Assign each intangible asset
    const failedAssets: string[] = [];
    for (const id of assetIds) {
      try {
        const existingAsset = await intangibleAssetsService.getIntangibleAssetById(id, activeCompany.id);
        if (!existingAsset) {
          failedAssets.push(id);
          continue;
        }
        if (existingAsset.status === 'assigned') {
          failedAssets.push(id);
          continue;
        }

        await intangibleAssetsService.assignIntangibleAsset(id, assignedTo, assignmentId, activeCompany.id);

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

        const [intangibleRows] = await pool.execute(
          `SELECT id, name, type FROM intangible_assets
           WHERE id IN (${assetIds.map(() => '?').join(',')}) AND company_id = ?`,
          [...assetIds, activeCompany.id]
        );

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
            category: 'Intangible',
            type: ia.type || 'Intangible',
            department: deptName,
            serialNo: '',
            modelNo: '',
            brand: '',
          })),
        ];

        if (combinedAssets.length > 0) {
          // Disable existing accountability forms
          const existingForms = await repo.getExistingAccountabilityForms(assignedTo, deptName);
          for (const form of existingForms) {
            await repo.disableAccountabilityForm(form.formID);
          }

          // Generate form number
          const settings = await formRepo.getAccountabilityFormSettings(activeCompany.id);
          if (!settings) {
            formErrorMsg = 'Accountability form settings not configured for company';
          } else {
            const companyInfo = await formRepo.getCompanyCodePrefix(activeCompany.id);
            const deptInfo = await formRepo.getDepartmentCodePrefix(departmentId);

            const isIT = deptName.toLowerCase().includes('it');
            const assetCode = isIT ? settings.it_asset_code : settings.admin_asset_code;

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

            const likeParam = parts.join('-');
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
                  userId
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

    res.json({
      success: !formErrorMsg,
      assigned: assetIds.filter(id => !failedAssets.includes(id)),
      failed: failedAssets,
      formError: formErrorMsg,
    });
  } catch (err: any) {
    logger.error('Batch assign intangible assets error', { message: err.message, stack: err.stack, sqlMessage: err.sqlMessage, sql: err.sql });
    res.status(500).json({ error: err.message || 'Failed to batch assign intangible assets' });
  }
};

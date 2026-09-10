import type { Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import type { AuthRequest } from '../middleware/authenticate.js';
import { pool } from '../db.js';
import * as repo from '../repositories/intangibleDeactivation.repository.js';
import * as accRepo from '../repositories/accountabilityForm.repository.js';
import { createIntangibleDeactivationSchema, approveIntangibleDeactivationSchema, declineIntangibleDeactivationSchema } from '../dtos/intangibleDeactivation.dto.js';
import { createAuditLog } from '../utils/audit.js';
import logger from '../logger.js';
import { getDesignatedApproverUserIdForRequester, getDesignatedSubApproverUserIdForRequester } from '../utils/approverNotifications.js';
import { createNotificationForApi } from '../utils/notificationsApi.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';
import { createReturnAccountabilityFormAndNotify } from '../utils/accountabilityFormOnReturn.js';
import { notifyIfNoAssetsRemainInCustody } from '../utils/noAssetCustodyNotification.js';

function parseAssetsData(v: unknown): { assets: any[]; intangibleAssetIds: string[] } {
  if (v == null || v === '') return { assets: [], intangibleAssetIds: [] };
  try {
    const raw = Buffer.isBuffer(v) ? v.toString('utf8') : v;
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw as any;
    return {
      assets: Array.isArray(obj?.assets) ? obj.assets : [],
      intangibleAssetIds: Array.isArray(obj?.intangibleAssetIds) ? obj.intangibleAssetIds.map((x: any) => String(x)) : [],
    };
  } catch { return { assets: [], intangibleAssetIds: [] }; }
}

async function mapRow(row: repo.DeactivationFormRow): Promise<any> {
  const { assets, intangibleAssetIds } = parseAssetsData(row.assets_data);
  const currentAssetDetails = await repo.getIntangibleAssetDetailsByIds(intangibleAssetIds);
  const currentAssetDetailsById = new Map(
    currentAssetDetails.map(asset => [String(asset.id), asset])
  );
  const enrichedAssets = assets.map(asset => {
    const current = currentAssetDetailsById.get(String(asset.id));
    return {
      ...asset,
      description: asset.description ?? current?.description ?? null,
      riskLevel: asset.riskLevel ?? asset.risk_level ?? current?.risk_level_name ?? null,
    };
  });

  return {
    id: row.formID,
    formNumber: row.form_number,
    status: row.status,
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      employeeNumber: row.employee_number,
      position: row.position,
      company: row.company_name ? { id: row.company_id, name: row.company_name } : null,
      department: row.department_name ? { id: row.department_id, name: row.department_name } : null,
    },
    department: row.department_id ? { id: row.department_id, name: row.department_name } : null,
    companyId: row.company_id,
    assets: enrichedAssets,
    assets_data: row.assets_data,
    requesterSignature: row.requester_signature,
    requestedAt: row.requested_at,
    deptHeadApproverId: row.dept_head_approver_id,
    deptHeadSubApproverId: row.dept_head_sub_approver_id,
    deptHeadSignedAt: row.dept_head_signed_at,
    deptHeadSignedBy: row.dept_head_signed_by,
    deptHeadSignature: row.dept_head_signature,
    deptHeadApproverName: row.dept_head_first_name ? `${row.dept_head_first_name} ${row.dept_head_last_name ?? ''}`.trim() : null,
    hrSignedAt: row.hr_signed_at,
    hrSignedBy: row.hr_signed_by,
    hrSignature: row.hr_signature,
    hrApproverName: row.hr_first_name ? `${row.hr_first_name} ${row.hr_last_name ?? ''}`.trim() : null,
    declineReason: row.decline_reason,
    declinedBy: row.declined_by,
    declinedAt: row.declined_at,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function generateFormNumber(companyId: string): Promise<string> {
  // Try to reuse accountability settings for consistency; fallback to simple IDF prefix
  const settings = await repo.getIntangibleDeactivationFormSettings(companyId);
  const company = await repo.getCompanyPrefix(companyId);
  const prefixBase =
    settings?.company_format === 'prefix'
      ? company?.prefix || company?.code || 'GEN'
      : company?.code || company?.prefix || 'GEN';
  const department = await accRepo.getHrDepartmentCodePrefix(companyId);
  const parts = [prefixBase];
  if (settings?.department_format === 'code' && department?.code) {
    parts.push(department.code);
  } else if (settings?.department_format === 'prefix' && department?.prefix) {
    parts.push(department.prefix);
  }
  parts.push(settings?.form_code || 'IDF');

  const now = new Date();
  const includeDate = settings?.include_date ?? true;
  const dateFormat = settings?.date_format || 'MMYYYY';
  const datePart = includeDate
    ? dateFormat === 'YYYYMMDD'
      ? `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
      : `${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`
    : null;
  if (datePart) parts.push(datePart);

  const basePattern = parts.slice(0, datePart ? -1 : undefined).join('-');
  const likeParam = includeDate && dateFormat === 'MMYYYY'
    ? `${basePattern}-%${now.getFullYear()}`
    : basePattern + (datePart ? `-${datePart}` : '');
  const seq = await repo.getNextSequence(likeParam);
  parts.push(String(seq).padStart(4,'0'));
  return parts.join('-');
}

async function resolveSignature(userId: string, preferred?: string | null): Promise<string | null> {
  const p = preferred?.trim();
  if (p) return p;
  const [rows] = await pool.query(`SELECT digital_signature FROM users WHERE userID=? LIMIT 1`, [userId]) as any;
  const s = rows[0]?.digital_signature;
  return s?.trim() ? s.trim() : null;
}

function hrHasAccess(user: any): boolean {
  return user?.role?.hr_accountability_receiver === true || user?.hr_accountability_receiver === true;
}

export async function createDeactivationHandler(req: AuthRequest, res: Response) {
  try {
    const parsed = createIntangibleDeactivationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation error', errors: parsed.error.issues });
    const { intangibleAssetIds, digitalSignature, remarks } = parsed.data;
    const requesterId = req.user!.userID;

    const pendingRows = await repo.listPendingForUser(requesterId);
    const pendingAssetIds = new Set(
      pendingRows.flatMap(row => parseAssetsData(row.assets_data).intangibleAssetIds)
    );
    const alreadyRequested = intangibleAssetIds.filter(id => pendingAssetIds.has(String(id)));
    if (alreadyRequested.length > 0) {
      return res.status(409).json({
        error: `A deactivation request already exists for asset(s): ${alreadyRequested.join(', ')}`,
        assetIds: alreadyRequested,
      });
    }

    // Validate assets belong to user and are active
    const activeRows = await repo.getActiveIntangibleAssignmentsForUser(requesterId);
    const activeMap = new Map<string, any>(activeRows.map(r => [String(r.intangible_asset_id), r]));
    const invalid = intangibleAssetIds.filter(id => !activeMap.has(String(id)));
    if (invalid.length > 0) return res.status(400).json({ error: `Some assets are not assigned to you or already inactive: ${invalid.join(', ')}` });

    const assetsSnapshot = intangibleAssetIds.map(id => {
      const r: any = activeMap.get(String(id));
      return {
        id: String(id),
        name: r.name,
        type: r.type,
        description: r.description,
        department: r.department_name,
        riskLevel: r.risk_level_name,
      };
    });

    const userInfo = await repo.getUserCompanyAndDept(requesterId);
    if (!userInfo?.company_id) return res.status(400).json({ error: 'Could not determine company for form' });

    const approverId = await getDesignatedApproverUserIdForRequester(requesterId);
    const subApproverId = await getDesignatedSubApproverUserIdForRequester(requesterId);

    const sig = await resolveSignature(requesterId, digitalSignature);
    if (!sig) return res.status(400).json({ error: 'Digital signature required' });

    let formNumber = '';
    let attempts = 0;
    while (attempts < 5) {
      try {
        formNumber = await generateFormNumber(userInfo.company_id);
        await repo.insertForm({
          formNumber,
          userId: requesterId,
          departmentId: userInfo.department_id,
          companyId: userInfo.company_id,
          assetsDataJson: JSON.stringify({ assets: assetsSnapshot, intangibleAssetIds, remarks: remarks ?? null }),
          requesterSignature: sig,
          deptHeadApproverId: approverId,
          deptHeadSubApproverId: subApproverId,
          createdBy: requesterId,
        });
        break;
      } catch (e: any) {
        if (e.code === 'ER_DUP_ENTRY' && attempts < 4) { attempts++; await new Promise(r => setTimeout(r, 80*attempts)); continue; }
        throw e;
      }
    }
    const formId = await repo.findFormIdByNumber(formNumber);
    const userName = `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim() || requesterId;
    await createAuditLog({ userId: requesterId, action: 'Created Intangible Deactivation Form', resourceType: 'intangible_deactivation_form', resourceId: formId ?? formNumber, resourceName: formNumber, details: `Intangible deactivation ${formNumber} created for ${userName} with ${intangibleAssetIds.length} asset(s)`, newValues: { form_number: formNumber, intangibleAssetIds }, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });

    // Notify approver(s)
    const notifyTargets = [approverId, subApproverId].filter(Boolean) as string[];
    for (const target of notifyTargets) {
      try {
        await createNotificationForApi({ user_id: target, title: `Intangible deactivation ${formNumber} needs your approval`, message: `${userName} requested deactivation of ${intangibleAssetIds.length} intangible asset(s).`, type: 'system', data: { route: '/approvals?tab=for-approval', actionTarget: 'intangible_deactivation_approval', formId, formNumber } });
        const io = getIoInstance();
        if (io) emitNotification(io, target, 'notification', { title: `Intangible deactivation ${formNumber} needs your approval`, description: `${userName} requested deactivation`, type: 'system', route: '/approvals?tab=for-approval', formId, formNumber });
      } catch (e) { logger.error('notify approver failed', e); }
    }

    return res.status(201).json({ message: 'Deactivation request submitted', form: { formID: formId, form_number: formNumber, status: 'Pending' } });
  } catch (e) {
    logger.error('createDeactivationHandler error', e);
    return res.status(500).json({ error: 'Failed to create deactivation request' });
  }
}

export async function listDeactivationsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    const companyScope = (req.query.companyId as string) || undefined;
    // simple: return all; client filters. If user has hr access or admin, show all; else user + company filter
    const rows = await repo.listAll();
    // apply company filter if provided
    let filtered = rows;
    if (companyScope) filtered = filtered.filter(r => r.company_id === companyScope);
    return res.json({ forms: await Promise.all(filtered.map(mapRow)) });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed to fetch' }); }
}

export async function getMyDeactivationsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    const rows = await repo.listForms({ userId });
    const pendingRows = rows.filter(row => ['Pending', 'PendingHrApproval'].includes(row.status));
    const pendingAssetIds = [
      ...new Set(
        pendingRows.flatMap(row => parseAssetsData(row.assets_data).intangibleAssetIds)
      ),
    ];
    return res.json({ forms: await Promise.all(rows.map(mapRow)), pendingAssetIds });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed' }); }
}

export async function getDeactivationByIdHandler(req: AuthRequest, res: Response) {
  try {
    const formId = String((req.params as any).formId ?? '');
    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error: 'Form not found' });
    return res.json({ form: await mapRow(row) });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed' }); }
}

export async function getPendingApprovalsHandler(req: AuthRequest, res: Response) {
  try {
    const rows = await repo.listPendingForApprover(req.user!.userID!);
    return res.json({ forms: await Promise.all(rows.map(mapRow)) });
  } catch (e) { logger.error(e); return res.status(500).json({ error:'Failed'}); }
}

export async function getPendingHrApprovalsHandler(req: AuthRequest, res: Response) {
  try {
    if (!hrHasAccess((req as any).user)) {
      // also check DB flag
      const [rows] = await pool.execute(`SELECT 1 FROM users u LEFT JOIN asset_mngmnt_roles r ON u.role_id=r.roleID LEFT JOIN user_custodian_settings uc ON u.userID=uc.user_id WHERE u.userID=? AND (r.hr_accountability_receiver=1 OR COALESCE(uc.hr_accountability_receiver,0)=1) LIMIT 1`, [req.user!.userID!]) as any;
      if (!rows || rows.length===0) return res.status(403).json({ error:'Forbidden' });
    }
    const rows = await repo.listPendingHrApproval();
    return res.json({ forms: await Promise.all(rows.map(mapRow)) });
  } catch (e) { logger.error(e); return res.status(500).json({ error:'Failed'}); }
}

export async function getApprovedByMeHandler(req: AuthRequest, res: Response) {
  try {
    const rows = await repo.listApprovedByUser(req.user!.userID!);
    return res.json({ forms: await Promise.all(rows.map(mapRow)) });
  } catch (e) { logger.error(e); return res.status(500).json({ error:'Failed'}); }
}

export async function approveDeptHeadHandler(req: AuthRequest, res: Response) {
  try {
    const parsed = approveIntangibleDeactivationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
    const sig = await resolveSignature(req.user!.userID!, parsed.data.digitalSignature);
    if (!sig) return res.status(400).json({ error: 'Digital signature required' });
    const formId = String((req.params as any).formId ?? '');
    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error: 'Form not found' });
    if (row.status !== 'Pending') return res.status(400).json({ error: `Cannot approve form with status ${row.status}` });
    const isApprover = row.dept_head_approver_id === req.user!.userID || row.dept_head_sub_approver_id === req.user!.userID;
    if (!isApprover) return res.status(403).json({ error: 'Not authorized to approve this form' });
    const affected = await repo.updateDeptHeadApproval(formId, req.user!.userID!, sig);
    if (!affected) return res.status(400).json({ error: 'Failed to approve' });

    // Notify the requester that the department-head approval is complete.
    try {
      const title = 'Your request for intangible deactivation has been approved by your department head.';
      await NotificationService.createNotification({
        user_id: row.user_id,
        title,
        message: title,
        type: 'system',
        status: 'unread',
        data: JSON.stringify({ route: '/profile?tab=documents&docTab=intangible-deactivation', formId, formNumber: row.form_number }),
      }, req.user!.userID!, req.ip, req.get('User-Agent') ?? 'Unknown');
      const io = getIoInstance();
      if (io) emitNotification(io, row.user_id, 'notification', {
        title,
        description: title,
        type: 'system',
        route: '/profile?tab=documents&docTab=intangible-deactivation',
        formId,
        formNumber: row.form_number,
      });
    } catch (notificationError) {
      logger.error('Failed to notify requester after department-head approval', notificationError);
    }

    // Notify HR receivers
    const { getHrAccountabilityReceiverUserIds } = await import('../utils/approverNotifications.js');
    const hrIds = await getHrAccountabilityReceiverUserIds();
    const requesterName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.user_id;
    for (const hrId of hrIds) {
      try {
        await createNotificationForApi({ user_id: hrId, title: `Intangible deactivation ${row.form_number} awaiting HR approval`, message: `${requesterName}'s deactivation approved by Dept Head, awaiting HR.`, type: 'system', data: { route: '/approvals?tab=receive', actionTarget: 'intangible_deactivation_hr', formId, formNumber: row.form_number } });
        const io = getIoInstance(); if (io) emitNotification(io, hrId, 'notification', { title: `Intangible deactivation ${row.form_number} awaiting HR`, description: `${requesterName}'s request`, type:'system', route:'/approvals?tab=receive', formId });
      } catch {}
    }
    await createAuditLog({ userId: req.user!.userID!, action: 'Approved Intangible Deactivation (Dept Head)', resourceType: 'intangible_deactivation_form', resourceId: formId, resourceName: row.form_number, details: `Dept head approved ${row.form_number}`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
    return res.json({ message: 'Approved, forwarded to HR' });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed to approve' }); }
}

export async function approveHrHandler(req: AuthRequest, res: Response) {
  try {
    const parsed = approveIntangibleDeactivationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
    const sig = await resolveSignature(req.user!.userID!, parsed.data.digitalSignature);
    if (!sig) return res.status(400).json({ error: 'Digital signature required' });
    const formId = String((req.params as any).formId ?? '');
    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error: 'Form not found' });
    if (row.status !== 'PendingHrApproval') return res.status(400).json({ error: `Cannot HR-approve form with status ${row.status}` });
    // check HR access
    const [hrRows] = await pool.execute(`SELECT 1 FROM users u LEFT JOIN asset_mngmnt_roles r ON u.role_id=r.roleID LEFT JOIN user_custodian_settings uc ON u.userID=uc.user_id WHERE u.userID=? AND (r.hr_accountability_receiver=1 OR COALESCE(uc.hr_accountability_receiver,0)=1) LIMIT 1`, [req.user!.userID!]) as any;
    if (!hrRows || hrRows.length===0) return res.status(403).json({ error:'Not authorized (HR only)' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const affected = await (repo as any).updateHrApproval(formId, req.user!.userID!, sig, conn);
      if (!affected) { await conn.rollback(); conn.release(); return res.status(400).json({ error:'Failed to approve' }); }

      // Deactivate assignments — normalize ids so the DB match, the
      // NOT IN filter, and the in-memory prune below all agree.
      const { assets, intangibleAssetIds } = parseAssetsData(row.assets_data);
      const normalizeId = (v: unknown): string | null => {
        const s = String(v ?? '').trim();
        return s ? s : null;
      };
      const rawIds: string[] = (intangibleAssetIds.length
        ? intangibleAssetIds
        : assets.map((a: any) => a?.id ?? a?.assetID ?? a?.intangible_asset_id)
      )
        .map(normalizeId)
        .filter((v): v is string => v !== null);
      const ids: string[] = [...new Set(rawIds)];
      if (!ids.length) {
        logger.warn(`HR-approve ${row.form_number}: no intangible ids resolved, skipping deactivation/regen`);
      }
      if (ids.length) {
        await repo.deactivateAssignments(ids, row.user_id, conn);
      }

      // Handle accountability forms: disable those containing deactivated assets and regenerate
      await handleIntangibleAccountabilityAfterDeactivation(row.user_id, ids, req, sig, conn);

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally { conn.release(); }

    await createAuditLog({ userId: req.user!.userID!, action: 'Approved Intangible Deactivation (HR)', resourceType: 'intangible_deactivation_form', resourceId: formId, resourceName: row.form_number, details: `HR approved ${row.form_number}, assets deactivated`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });

    // Notify requester that HR has completed processing the request.
    try {
      const title = 'Your intangible deactivation request has been processed.';
      await NotificationService.createNotification({
        user_id: row.user_id,
        title,
        message: title,
        type: 'system',
        status: 'unread',
        data: JSON.stringify({ route: '/profile?tab=documents&docTab=intangible-deactivation', formId, formNumber: row.form_number }),
      }, req.user!.userID!, req.ip, req.get('User-Agent') ?? 'Unknown');
      const io = getIoInstance();
      if (io) emitNotification(io, row.user_id, 'notification', {
        title,
        description: title,
        type: 'system',
        route: '/profile?tab=documents&docTab=intangible-deactivation',
        formId,
        formNumber: row.form_number,
      });
    } catch (notificationError) {
      logger.error('Failed to notify requester after HR processing', notificationError);
    }

    await notifyIfNoAssetsRemainInCustody({
      userId: row.user_id,
      sourceType: 'intangible_deactivation',
      sourceId: formId,
    });

    return res.json({ message: 'HR approved, assets deactivated and accountability updated' });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed to HR approve' }); }
}

async function handleIntangibleAccountabilityAfterDeactivation(userId: string, deactivatedIds: string[], req: AuthRequest, _hrSignature: string | null, conn: PoolConnection) {
  const idSet = new Set(
    (deactivatedIds ?? []).map(v => String(v ?? '').trim()).filter(Boolean)
  );
  const [formRows] = await conn.execute(
    `SELECT formID, form_number, asset_id, assets_data, status, created_by, issuer_signature, it_copy_signature, admin_copy_copy_type, created_at
       FROM accountability_forms
      WHERE user_id=? AND deleted_at IS NULL
        AND status IN ('Pending', 'Signed')
      ORDER BY created_at DESC`,
    [userId]
  ) as any[];

  // The replacement form must retain the issuer of the latest disabled form,
  // not the HR user who processed the deactivation.
  let replacementIssuerId: string | null = null;
  let replacementIssuerSignature: string | null = null;
  let replacementItCopySignature: string | null = null;
  let replacementCopyType: 'IT' | 'Admin' | null = null;

  for (const form of (formRows as any[])) {
    let containsDeactivatedAsset = false;
    try {
      // Legacy single-asset rows store the asset outside assets_data.
      if (form.asset_id && idSet.has(String(form.asset_id).trim())) {
        containsDeactivatedAsset = true;
      } else {
        const data = typeof form.assets_data === 'string' ? JSON.parse(form.assets_data) : form.assets_data;
        const assets: any[] = Array.isArray(data?.assets) ? data.assets : [];
        const intangibleAssetIds: unknown[] = Array.isArray(data?.intangibleAssetIds)
          ? data.intangibleAssetIds
          : [];
        const keysOf = (a: any): string[] => [
          String(a?.id ?? '').trim(),
          String(a?.assetID ?? '').trim(),
          String(a?.intangible_asset_id ?? '').trim(),
          String(a?.code ?? '').trim(),
        ].filter(Boolean);
        containsDeactivatedAsset =
          assets.some(asset => keysOf(asset).some(k => idSet.has(k))) ||
          intangibleAssetIds.some(assetId => idSet.has(String(assetId).trim()));
      }
    } catch {
      containsDeactivatedAsset = false;
    }
    if (!containsDeactivatedAsset) continue;

    if (!replacementIssuerId) {
      replacementIssuerId = form.created_by ?? null;
      replacementIssuerSignature = form.issuer_signature ?? null;
      replacementItCopySignature = form.it_copy_signature ?? null;
      replacementCopyType = form.admin_copy_copy_type === 'Admin' ? 'Admin' : form.admin_copy_copy_type === 'IT' ? 'IT' : null;
    }

    await conn.execute(
      `UPDATE accountability_forms SET status='Disabled', updated_at=NOW() WHERE formID=?`,
      [form.formID]
    );
    await createAuditLog({
      userId: req.user!.userID,
      action: 'Disabled Accountability Form (Intangible Deactivation)',
      resourceType: 'accountability_form',
      resourceId: form.formID,
      resourceName: form.form_number,
      details: `Disabled due to intangible deactivation ${[...idSet].join(',')}`,
      oldValues: { status: form.status },
      newValues: { status: 'Disabled' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? 'Unknown',
    });
  }

  if (!replacementIssuerId) {
    logger.warn(`No issuer found while regenerating accountability after intangible deactivation for user ${userId}`);
    return;
  }

  const [tangibleRows] = await conn.execute(
    `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name AS category_name, at.name AS type_name,
            d.name AS department_name, d.departmentID AS department_id,
            aa.location_id, aa.location_room_id
       FROM asset_assignments aa
       JOIN assets a ON aa.asset_id = a.assetID
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
      WHERE aa.user_id=? AND aa.status='Active' AND aa.deleted_at IS NULL
      ORDER BY aa.assigned_date ASC`,
    [userId]
  ) as any[];
  // Exclude deactivated ids only when we have any — `NOT IN ()` is a
  // SQL syntax error, and `status='Active'` already hides deactivated rows.
  const normalizedDeactivated = [...new Set(
    (deactivatedIds ?? []).map(v => String(v ?? '').trim()).filter(Boolean)
  )];
  const notInClause = normalizedDeactivated.length
    ? `AND iaa.intangible_asset_id NOT IN (${normalizedDeactivated.map(() => '?').join(',')})`
    : '';
  const [intangibleRows] = await conn.execute(
    `SELECT iaa.intangible_asset_id, ia.name, ia.description, ia.type,
            ia.risk_level_id,
            iaa.department_id, iaa.location_id, iaa.location_room_id,
            d.name AS department_name,
            td.departmentID AS type_department_id, td.name AS type_department_name, td.code AS type_department_code,
            rl.id AS risk_level_id_resolved, rl.name AS risk_level_name, rl.color AS risk_level_color
       FROM intangible_asset_assignments iaa
        JOIN intangible_assets ia ON iaa.intangible_asset_id=ia.id
        LEFT JOIN asset_mngmnt_departments d ON iaa.department_id=d.departmentID AND d.deleted_at IS NULL
        LEFT JOIN intangible_asset_types iat ON ia.type = iat.name AND iat.company_id = ia.company_id AND iat.deleted_at IS NULL
        LEFT JOIN asset_mngmnt_departments td ON iat.department_id = td.departmentID AND td.deleted_at IS NULL
        LEFT JOIN risk_levels rl ON ia.risk_level_id = rl.id AND rl.deleted_at IS NULL
      WHERE iaa.user_id=?
        AND iaa.status='Active'
        AND iaa.deleted_at IS NULL
        ${notInClause}`,
    [userId, ...normalizedDeactivated]
  ) as any[];

  if (tangibleRows.length === 0 && intangibleRows.length === 0) return;

  const groups = new Map<string, { departmentId: string | null; locationId: string | null; locationRoomId: string | null; assets: any[] }>();
  const addToGroup = (key: string, departmentId: string | null, locationId: string | null, locationRoomId: string | null, asset: any) => {
    const group = groups.get(key) ?? { departmentId, locationId, locationRoomId, assets: [] };
    group.assets.push(asset);
    groups.set(key, group);
  };

  for (const row of tangibleRows as any[]) {
    const key = String(row.department_id ?? 'None');
    addToGroup(key, row.department_id ?? null, row.location_id ?? null, row.location_room_id ?? null, {
      id: row.assetID,
      code: row.asset_code,
      name: row.name || row.asset_code,
      category: row.category_name || 'Asset',
      type: row.type_name || 'Asset',
      department: row.department_name,
      serialNo: row.serial || '',
      modelNo: row.model || '',
      brand: row.brand || '',
    });
  }
  for (const row of intangibleRows as any[]) {
    const key = String(row.department_id ?? 'None');
    const typeDepartment =
      row.type_department_id || row.type_department_name
        ? {
            id: row.type_department_id ?? null,
            name: row.type_department_name ?? null,
            code: row.type_department_code ?? undefined,
          }
        : null;
    const riskLevel =
      row.risk_level_id || row.risk_level_name
        ? {
            id: row.risk_level_id ?? row.risk_level_id_resolved ?? null,
            name: row.risk_level_name ?? null,
            color: row.risk_level_color ?? undefined,
          }
        : null;
    addToGroup(key, row.department_id ?? null, row.location_id ?? null, row.location_room_id ?? null, {
      id: row.intangible_asset_id,
      code: row.name || row.intangible_asset_id,
      name: row.name || '',
      description: row.description || '',
      category: 'Intangible',
      type: row.type || 'Intangible',
      department: row.department_name,
      type_department: typeDepartment,
      type_department_name: row.type_department_name ?? null,
      risk_level_id: row.risk_level_id ?? row.risk_level_id_resolved ?? null,
      risk_level: riskLevel,
      serialNo: '',
      modelNo: '',
      brand: '',
    });
  }

  // Final in-memory sweep: never insert the deactivated intangible into the
  // replacement form, even if a read-side id mismatch let it through above.
  // Matches every id key the codebase uses for intangible entries.
  const deadSet = new Set(normalizedDeactivated.map(String));
  const assetKey = (a: any): string =>
    String(a?.id ?? a?.assetID ?? a?.intangible_asset_id ?? a?.code ?? '').trim();
  for (const group of groups.values()) {
    const pruned = group.assets.filter(a => !deadSet.has(assetKey(a)));
    if (pruned.length !== group.assets.length) {
      logger.warn(
        `Pruned ${group.assets.length - pruned.length} deactivated intangible(s) from replacement form for user ${userId}`
      );
    }
    if (!pruned.length) continue;
    const replacementReq = {
      ...req,
      // This is the important part: the original issuer creates the form,
      // allowing the normal issuer approver/sub-approver flow to resolve.
      user: { userID: replacementIssuerId },
      body: {
        assets: pruned,
        userId,
        departmentId: group.departmentId,
        locationId: group.locationId,
        locationRoomId: group.locationRoomId,
        issuerSignature: replacementIssuerSignature,
        itCopySignature: replacementItCopySignature,
        // Preserve the original form scope so this replacement cannot bypass
        // the issuer approver/sub-approver copy-signature step.
        adminCopyCopyType: replacementCopyType ?? undefined,
        custodyNote: 'Replacement accountability form created after intangible deactivation.',
        adminCopySignerLenient: false,
      },
    } as AuthRequest;

    try {
      await createReturnAccountabilityFormAndNotify(
        replacementReq,
        userId,
        replacementIssuerId,
        req,
        'Replacement accountability form created after intangible deactivation.'
      );
      logger.info(`Created replacement accountability form for user ${userId} with issuer ${replacementIssuerId}`);
    } catch (error) {
      logger.error('Failed to create replacement accountability form after intangible deactivation:', error);
    }
  }
}

export async function declineHandler(req: AuthRequest, res: Response) {
  try {
    const parsed = declineIntangibleDeactivationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
    const formId = String((req.params as any).formId ?? '');
    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error:'Form not found' });
    if (!['Pending','PendingHrApproval'].includes(row.status)) return res.status(400).json({ error:`Cannot decline ${row.status}` });
    const isDeptApprover = row.dept_head_approver_id===req.user!.userID || row.dept_head_sub_approver_id===req.user!.userID;
    const [hrRows] = await pool.execute(`SELECT 1 FROM users u LEFT JOIN asset_mngmnt_roles r ON u.role_id=r.roleID LEFT JOIN user_custodian_settings uc ON u.userID=uc.user_id WHERE u.userID=? AND (r.hr_accountability_receiver=1 OR COALESCE(uc.hr_accountability_receiver,0)=1) LIMIT 1`, [req.user!.userID!]) as any;
    const isHr = hrRows && (hrRows as any[]).length>0;
    if (row.status==='Pending' && !isDeptApprover) return res.status(403).json({ error:'Not authorized' });
    if (row.status==='PendingHrApproval' && !isHr) return res.status(403).json({ error:'Not authorized (HR only)' });
    const affected = await repo.updateDeclined(formId, parsed.data.reason, req.user!.userID!);
    if (!affected) return res.status(400).json({ error:'Failed to decline' });
    await createAuditLog({ userId: req.user!.userID!, action: 'Declined Intangible Deactivation', resourceType: 'intangible_deactivation_form', resourceId: formId, resourceName: row.form_number, details: `Declined ${row.form_number}: ${parsed.data.reason}`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
    // notify requester
    try {
      await NotificationService.createNotification({ user_id: row.user_id, title: `Intangible deactivation ${row.form_number} declined`, message: `Your request was declined: ${parsed.data.reason}`, type: 'system', status:'unread', data: JSON.stringify({ route:'/forms/intangible-deactivation', formId }) }, req.user!.userID!, req.ip, req.get('User-Agent') ?? 'Unknown');
      const io=getIoInstance(); if(io) emitNotification(io, row.user_id, 'notification', { title:'Intangible deactivation declined', description: parsed.data.reason, type:'system', route:'/forms/intangible-deactivation', formId });
    } catch {}
    return res.json({ message:'Declined' });
  } catch(e){ logger.error(e); return res.status(500).json({ error:'Failed' }); }
}

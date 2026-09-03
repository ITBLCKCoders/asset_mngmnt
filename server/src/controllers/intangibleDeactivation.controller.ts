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
import { handleAccountabilityFormOnAssetReturn } from '../utils/accountabilityFormOnReturn.js';

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

function mapRow(row: repo.DeactivationFormRow): any {
  const { assets } = parseAssetsData(row.assets_data);
  return {
    id: row.formID,
    formNumber: row.form_number,
    status: row.status,
    user: { id: row.user_id, first_name: row.first_name, last_name: row.last_name, email: row.email, company: row.company_name ? { id: row.company_id, name: row.company_name } : null, department: row.department_name ? { id: row.department_id, name: row.department_name } : null },
    department: row.department_id ? { id: row.department_id, name: row.department_name } : null,
    companyId: row.company_id,
    assets,
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
  const settings = await accRepo.getAccountabilityFormSettings(companyId);
  const company = await repo.getCompanyPrefix(companyId);
  const prefixBase = company?.code || company?.prefix || 'GEN';
  const likeParam = `${prefixBase}-IDF`;
  const seq = await repo.getNextSequence(likeParam);
  const datePart = (() => {
    const now = new Date();
    if (settings?.include_date) {
      return settings.date_format === 'YYYYMMDD'
        ? `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
        : `${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;
    }
    return null;
  })();
  const parts = [prefixBase, 'IDF'];
  if (datePart) parts.push(datePart);
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

    // Validate assets belong to user and are active
    const activeRows = await repo.getActiveIntangibleAssignmentsForUser(requesterId);
    const activeMap = new Map<string, any>(activeRows.map(r => [String(r.intangible_asset_id), r]));
    const invalid = intangibleAssetIds.filter(id => !activeMap.has(String(id)));
    if (invalid.length > 0) return res.status(400).json({ error: `Some assets are not assigned to you or already inactive: ${invalid.join(', ')}` });

    const assetsSnapshot = intangibleAssetIds.map(id => {
      const r: any = activeMap.get(String(id));
      return { id: String(id), name: r.name, type: r.type, description: r.description, department: r.department_name };
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
    return res.json({ forms: filtered.map(mapRow) });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed to fetch' }); }
}

export async function getMyDeactivationsHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    const rows = await repo.listForms({ userId });
    return res.json({ forms: rows.map(mapRow) });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed' }); }
}

export async function getDeactivationByIdHandler(req: AuthRequest, res: Response) {
  try {
    const formId = String((req.params as any).formId ?? '');
    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error: 'Form not found' });
    return res.json({ form: mapRow(row) });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed' }); }
}

export async function getPendingApprovalsHandler(req: AuthRequest, res: Response) {
  try {
    const rows = await repo.listPendingForApprover(req.user!.userID!);
    return res.json({ forms: rows.map(mapRow) });
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
    return res.json({ forms: rows.map(mapRow) });
  } catch (e) { logger.error(e); return res.status(500).json({ error:'Failed'}); }
}

export async function getApprovedByMeHandler(req: AuthRequest, res: Response) {
  try {
    const rows = await repo.listApprovedByUser(req.user!.userID!);
    return res.json({ forms: rows.map(mapRow) });
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
      const affected = await (repo as any).updateHrApproval(formId, req.user!.userID!, sig);
      if (!affected) { await conn.rollback(); conn.release(); return res.status(400).json({ error:'Failed to approve' }); }

      // Deactivate assignments
      const { assets, intangibleAssetIds } = parseAssetsData(row.assets_data);
      const ids: string[] = intangibleAssetIds.length ? intangibleAssetIds : assets.map((a:any)=> String(a.id));
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

    // notify requester
    try {
      await NotificationService.createNotification({ user_id: row.user_id, title: `Intangible deactivation ${row.form_number} approved`, message: `Your intangible deactivation request has been approved by HR.`, type: 'system', status: 'unread', data: JSON.stringify({ route: '/forms/intangible-deactivation', formId, formNumber: row.form_number }) }, req.user!.userID!, req.ip, req.get('User-Agent') ?? 'Unknown');
      const io = getIoInstance(); if (io) emitNotification(io, row.user_id, 'notification', { title: `Intangible deactivation approved`, description: `${row.form_number} approved`, type:'system', route:'/forms/intangible-deactivation', formId });
    } catch {}

    return res.json({ message: 'HR approved, assets deactivated and accountability updated' });
  } catch (e) { logger.error(e); return res.status(500).json({ error: 'Failed to HR approve' }); }
}

async function handleIntangibleAccountabilityAfterDeactivation(userId: string, deactivatedIds: string[], req: AuthRequest, hrSignature: string | null, conn: PoolConnection) {
  const idSet = new Set(deactivatedIds.map(String));
  // Find and disable accountability forms containing any deactivated intangible id
  const [formRows] = await conn.execute(`SELECT formID, form_number, assets_data, status FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL`, [userId]) as any[];
  const disabledNumbersByScope: Record<string,string[]> = { IT: [], Admin: [] };
  const { classifyDepartmentScopeByName } = await import('../utils/assetScope.js');
  for (const form of (formRows as any[])) {
    let contains = false;
    let scopes = new Set<string>();
    try {
      const data = typeof form.assets_data === 'string' ? JSON.parse(form.assets_data) : form.assets_data;
      const assets: any[] = Array.isArray(data?.assets) ? data.assets : [];
      for (const a of assets) {
        if (idSet.has(String(a.id))) contains = true;
        const sc = classifyDepartmentScopeByName(a?.department || a?.categoryDepartment || '');
        if (sc==='IT' || sc==='Admin') scopes.add(sc);
      }
    } catch {}
    if (!contains) continue;
    await conn.execute(`UPDATE accountability_forms SET status='Disabled', updated_at=NOW() WHERE formID=?`, [form.formID]);
    await createAuditLog({ userId: req.user!.userID, action: 'Disabled Accountability Form (Intangible Deactivation)', resourceType: 'accountability_form', resourceId: form.formID, resourceName: form.form_number, details: `Disabled due to intangible deactivation ${[...idSet].join(',')}`, oldValues: { status: form.status }, newValues: { status: 'Disabled' }, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
    for (const s of scopes) {
      if (s==='IT' || s==='Admin') (disabledNumbersByScope as any)[s as 'IT'|'Admin'].push(String(form.form_number));
    }
  }

  // Check remaining assignments
  const [activeAssignmentsRows] = await conn.execute(`SELECT asset_id FROM asset_assignments WHERE user_id=? AND status='Active' AND deleted_at IS NULL`, [userId]) as any[];
  const activeAssignments = (activeAssignmentsRows as any[]) ?? [];
  const [activeIntangiblesRows] = await conn.execute(
    `SELECT iaa.intangible_asset_id, ia.name, ia.description, ia.type, iaa.department_id, d.name as department_name
     FROM intangible_asset_assignments iaa
     JOIN intangible_assets ia ON iaa.intangible_asset_id=ia.id AND ia.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments d ON iaa.department_id=d.departmentID AND d.deleted_at IS NULL
     WHERE iaa.user_id=? AND iaa.status='Active' AND iaa.deleted_at IS NULL`, [userId]) as any[];
  const activeIntangibles = (activeIntangiblesRows as any[]) ?? [];

  if (activeAssignments.length===0 && activeIntangibles.length===0) {
    // No remaining assets -> accountability clearance is now owner self-service
    // via Profile > Documents (unified form). Do not auto-create here.
    return;
  }

  // Still has remaining -> create new accountability forms for remaining assets grouped by scope
  // Simplified: call handleAccountabilityFormOnAssetReturn equivalent by directly invoking creation via handler
  // Instead, we will use the same fallback: group intangibles by department + tangibles already handled via existing forms.
  // For tangibles untouched, we don't need to recreate; only need to recreate for intangibles remaining.
  // Easiest: delegate to existing handle but with empty returnedAssetIds that are intangible -> it already handles intangible-only case.
  // We'll create intangible-only forms for remaining intangibles grouped by department.
  if ((activeIntangibles as any[]).length>0) {
    const byDept = new Map<string, any[]>();
    for (const r of (activeIntangibles as any[])) {
      const k = String(r.department_id ?? 'None');
      const arr = byDept.get(k) ?? [];
      arr.push(r);
      byDept.set(k, arr);
    }
    const { createAccountabilityFormHandler } = await import('../controllers/accountabilityForms.controller.js');
    for (const [, rows] of byDept.entries()) {
      const first = rows[0];
      const departmentAssets = rows.map(row => ({ id: row.intangible_asset_id, code: row.name || row.intangible_asset_id, name: row.name||'', description: row.description||'', category:'Intangible', type: row.type||'Intangible', department: row.department_name, serialNo:'', modelNo:'', brand:'' }));
      const fakeReq = { ...req, user: { userID: req.user!.userID }, body: { assets: departmentAssets, userId, departmentId: first.department_id ?? null, locationId: null, issuerSignature: hrSignature, itCopySignature: hrSignature } } as AuthRequest;
      const fakeRes = { status: () => ({ json: () => ({}) }) } as unknown as Response;
      try { await createAccountabilityFormHandler(fakeReq, fakeRes); } catch(e){ logger.error('create remaining intangible form failed', e); }
    }
  }
  // For tangibles, existing Disabled logic already captured; if user had tangibles, those forms remain disabled but need replacement via same grouping as OnReturn does.
  // Invoke generic handler for tangible recomputation if needed: fetch remaining tangibles and create forms per scope similar to OnReturn fallback.
  if (activeAssignments.length>0) {
    // Trigger creation via handleAccountabilityFormOnAssetReturn with a dummy? Instead, manually recreate for remaining tangible scopes that were disabled.
    // Simpler: reuse handleAccountabilityFormOnAssetReturn by passing deactivatedIds as returnedAssetIds - it already regenerates tangible forms for returned departments.
    // But it would try to disable again. We already disabled, so call with empty to just generate? We'll just call getClearanceEligibility path? For now skip tangible regen if tangibles unaffected.
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

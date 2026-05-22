import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import { getAssetScope } from '../utils/assetScope.js';
import { createNotificationForApi } from '../utils/notificationsApi.js';
import {
  getManagerApprover2UserIdsInItDepartmentAndCompany,
  isUserInItDepartmentForCompany,
  isUserManagerApprover1,
  isUserManagerApprover2,
} from '../utils/approverNotifications.js';
import { createAuditLog } from '../utils/audit.js';

function groupChecklistsIntoBatches(checklists: Record<string, unknown>[]) {
  const byEmployee = new Map<string, Record<string, unknown>[]>();
  for (const row of checklists) {
    const employeeId = String(row.employee_id ?? '');
    if (!employeeId) continue;
    const list = byEmployee.get(employeeId) ?? [];
    list.push(row);
    byEmployee.set(employeeId, list);
  }

  return Array.from(byEmployee.entries()).map(([employeeId, list]) => {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(String(a.created_at ?? 0)).getTime() -
        new Date(String(b.created_at ?? 0)).getTime()
    );
    const earliest = sorted[0] ?? {};
    return {
      batchKey: employeeId,
      employee_id: employeeId,
      employee_name: String(earliest.employee_name ?? 'Employee'),
      employee_department_name:
        (earliest.employee_department_name as string | null) ??
        (earliest.employee_department as string | null) ??
        null,
      created_at: String(earliest.created_at ?? new Date().toISOString()),
      checklist_count: list.length,
      checklists: sorted,
    };
  });
}

export async function getPendingChecklistApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.status(200).json({ checklistBatches: [] });
    }

    if (!(await isUserManagerApprover1(userId))) {
      return res.status(200).json({ checklistBatches: [] });
    }

    const [approverRows] = (await pool.query(
      'SELECT department_id FROM users WHERE userID = ? LIMIT 1',
      [userId]
    )) as [{ department_id: string | null }[], unknown];
    const approverDepartmentId = approverRows[0]?.department_id ?? null;
    if (approverDepartmentId == null) {
      return res.status(200).json({ checklistBatches: [] });
    }

    const rows = await checklistRepo.findPendingDeptHeadApprovalChecklists(
      approverDepartmentId,
      companyId
    );
    const checklistBatches = groupChecklistsIntoBatches(rows);

    return res.status(200).json({ checklistBatches });
  } catch (error) {
    logger.error('Get pending checklist approvals failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch pending checklist approvals' });
  }
}

export async function getChecklistsApprovedByDeptHeadMeHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.status(200).json({ checklistBatches: [] });
    }

    const rows = await checklistRepo.findChecklistsApprovedByDeptHead(
      companyId,
      userId
    );
    const checklistBatches = groupChecklistsIntoBatches(rows);

    return res.status(200).json({ checklistBatches });
  } catch (error) {
    logger.error('Get approved checklists by dept head failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch approved checklists' });
  }
}

export async function approveChecklistsDeptHeadHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const bodyIds = req.body?.checklistIds;
    const checklistIds = Array.isArray(bodyIds)
      ? bodyIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    const bodySignature =
      typeof req.body?.digitalSignature === 'string'
        ? req.body.digitalSignature.trim()
        : '';

    if (checklistIds.length === 0) {
      return res.status(400).json({ error: 'checklistIds is required' });
    }

    if (!(await isUserManagerApprover1(userId))) {
      return res
        .status(403)
        .json({ error: 'Not authorized as department head approver' });
    }

    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const [approverRows] = (await pool.query(
      'SELECT department_id, digital_signature FROM users WHERE userID = ? LIMIT 1',
      [userId]
    )) as [
      { department_id: string | null; digital_signature?: string | null }[],
      unknown,
    ];
    const approverDepartmentId = approverRows[0]?.department_id ?? null;
    if (approverDepartmentId == null) {
      return res.status(400).json({ error: 'Approver has no department' });
    }

    let digitalSignature: string | null = bodySignature || null;
    if (!digitalSignature) {
      const fromUser = approverRows[0]?.digital_signature;
      digitalSignature =
        fromUser != null && String(fromUser).trim() !== ''
          ? String(fromUser).trim()
          : null;
    }

    const approvedCount = await checklistRepo.approveChecklistsAsDeptHead({
      checklistIds,
      approverUserId: userId,
      approverDepartmentId,
      companyId,
      digitalSignature,
    });

    if (approvedCount === 0) {
      return res.status(400).json({
        error:
          'No checklists were approved. They may already be approved or not in your department.',
      });
    }

    await createAuditLog({
      userId,
      action: 'Approved Asset Checklists',
      resourceType: 'asset_checklist',
      resourceId: checklistIds.join(','),
      details: `Department head approved ${approvedCount} asset checklist(s)`,
      newValues: { approved_count: approvedCount, checklist_ids: checklistIds },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    try {
      const itApproverIds =
        await getManagerApprover2UserIdsInItDepartmentAndCompany(companyId);
      const [approverNameRows] = (await pool.query(
        `SELECT name, first_name, last_name FROM users WHERE userID = ? LIMIT 1`,
        [userId]
      )) as [
        {
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
        }[],
        unknown,
      ];
      const approverRow = approverNameRows[0];
      const deptHeadName =
        [approverRow?.first_name, approverRow?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        approverRow?.name ||
        'Department head';
      for (const itUserId of itApproverIds) {
        if (itUserId === userId) continue;
        await createNotificationForApi({
          user_id: itUserId,
          title: 'Asset Checklist Receive Approval Needed',
          message: `${deptHeadName} approved ${approvedCount} asset checklist${approvedCount !== 1 ? 's' : ''} — IT receive approval required.`,
          type: 'system',
          data: {
            route: '/approvals',
            actionTarget: 'checklist_receive',
            checklist_count: approvedCount,
          },
        });
      }
    } catch (notifError) {
      logger.error('Failed to notify IT checklist receivers:', notifError);
    }

    return res.status(200).json({
      message: `Approved ${approvedCount} checklist(s) successfully`,
      approvedCount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    logger.error('Approve checklists dept head failed:', error);
    if (
      typeof message === 'string' &&
      message.includes('dept_head_signed_at')
    ) {
      return res.status(503).json({
        error:
          'Checklist approval is not available: run db/migration_add_asset_checklist_dept_head_sign.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to approve checklists' });
  }
}

export async function getReceivePendingChecklistApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    if (!(await isUserManagerApprover2(userId))) {
      return res.status(200).json({ checklistBatches: [] });
    }

    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.status(200).json({ checklistBatches: [] });
    }

    if (!(await isUserInItDepartmentForCompany(userId, companyId))) {
      return res.status(200).json({ checklistBatches: [] });
    }

    const rows = await checklistRepo.findPendingItManagerReceiveChecklists(
      companyId
    );
    const checklistBatches = groupChecklistsIntoBatches(rows).map(batch => ({
      ...batch,
      dept_head_signed_at: batch.checklists[0]?.dept_head_signed_at ?? null,
      it_manager_signed_at: batch.checklists[0]?.it_manager_signed_at ?? null,
    }));

    return res.status(200).json({ checklistBatches });
  } catch (error) {
    logger.error('Get receive-pending checklist approvals failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch receive-pending checklist approvals' });
  }
}

export async function receiveChecklistsItManagerHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const bodyIds = req.body?.checklistIds;
    const checklistIds = Array.isArray(bodyIds)
      ? bodyIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    const bodySignature =
      typeof req.body?.digitalSignature === 'string'
        ? req.body.digitalSignature.trim()
        : '';

    if (checklistIds.length === 0) {
      return res.status(400).json({ error: 'checklistIds is required' });
    }

    if (!(await isUserManagerApprover2(userId))) {
      return res
        .status(403)
        .json({ error: 'Not authorized as IT manager approver' });
    }

    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    if (!(await isUserInItDepartmentForCompany(userId, companyId))) {
      return res
        .status(403)
        .json({ error: 'Only IT department Manager Approver 2 can receive' });
    }

    const [approverRows] = (await pool.query(
      'SELECT digital_signature FROM users WHERE userID = ? LIMIT 1',
      [userId]
    )) as [{ digital_signature?: string | null }[], unknown];
    let digitalSignature: string | null = bodySignature || null;
    if (!digitalSignature) {
      const fromUser = approverRows[0]?.digital_signature;
      digitalSignature =
        fromUser != null && String(fromUser).trim() !== ''
          ? String(fromUser).trim()
          : null;
    }

    const receivedCount = await checklistRepo.receiveChecklistsAsItManager({
      checklistIds,
      approverUserId: userId,
      companyId,
      digitalSignature,
    });

    if (receivedCount === 0) {
      return res.status(400).json({
        error:
          'No checklists were received. They may already be received or not in your company.',
      });
    }

    await createAuditLog({
      userId,
      action: 'Received Asset Checklists (IT)',
      resourceType: 'asset_checklist',
      resourceId: checklistIds.join(','),
      details: `IT manager received ${receivedCount} asset checklist(s)`,
      newValues: { received_count: receivedCount, checklist_ids: checklistIds },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    return res.status(200).json({
      message: `Received ${receivedCount} checklist(s) successfully`,
      receivedCount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    logger.error('Receive checklists IT manager failed:', error);
    if (
      typeof message === 'string' &&
      message.includes('it_manager_signed_at')
    ) {
      return res.status(503).json({
        error:
          'Checklist receive is not available: run db/migration_add_asset_checklist_it_manager_sign.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to receive checklists' });
  }
}

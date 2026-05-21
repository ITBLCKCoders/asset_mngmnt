import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import { getAssetScope } from '../utils/assetScope.js';
import {
  isUserManagerApprover1,
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

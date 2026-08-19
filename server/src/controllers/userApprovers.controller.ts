import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import {
  getUserDesignatedApprovers,
  setUserDesignatedApprover,
  removeUserDesignatedApprover,
  getEligibleApprovers,
} from '../services/userApprovers.service.js';

const APPROVER_TYPES = ['approver', 'sub_approver'] as const;
type ApproverType = (typeof APPROVER_TYPES)[number];
const ELIGIBLE_TYPES = ['approver', 'ma3', 'sub_approver'] as const;
type EligibleType = (typeof ELIGIBLE_TYPES)[number];

function isApproverType(value: unknown): value is ApproverType {
  return (
    typeof value === 'string' &&
    (APPROVER_TYPES as readonly string[]).includes(value)
  );
}

export async function getUserApproversHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const designated = await getUserDesignatedApprovers(userId);
    return res.json({ approvers: designated });
  } catch (error) {
    logger.error('Get user approvers failed:', error);
    return res.status(500).json({ error: 'Failed to fetch user approvers' });
  }
}

export async function setUserApproverHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const { approverType, approverUserId } = req.body as {
      approverType?: unknown;
      approverUserId?: unknown;
    };

    if (
      !isApproverType(approverType) ||
      typeof approverUserId !== 'string' ||
      approverUserId.trim() === ''
    ) {
      return res.status(400).json({
        error:
          'approverType must be "approver" or "sub_approver" and approverUserId is required',
      });
    }
    if (approverUserId === userId) {
      return res.status(400).json({ error: 'A user cannot be their own approver' });
    }

    // Requester and approver must both exist, be active, and belong to the same company
    const [rows] = (await pool.execute(
      `SELECT
        (SELECT company_id FROM users WHERE userID = ?) AS requester_company,
        u.company_id AS approver_company,
        u.is_active
       FROM users u
       WHERE u.userID = ?
       LIMIT 1`,
      [userId, approverUserId]
    )) as [
      {
        requester_company: string | null;
        approver_company: string | null;
        is_active: number;
      }[],
      unknown,
    ];
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Approver user not found' });
    }
    if (!row.requester_company) {
      return res.status(404).json({ error: 'Requester user not found' });
    }
    if (row.requester_company !== row.approver_company) {
      return res
        .status(400)
        .json({ error: 'Approver must belong to the same company as the user' });
    }
    if (row.is_active !== 1) {
      return res.status(400).json({ error: 'Approver must be an active user' });
    }

    await setUserDesignatedApprover(userId, approverType, approverUserId);

    await createAuditLog({
      userId: req.user!.userID,
      action: 'set_user_approver',
      resourceType: 'user_approver',
      resourceId: `${userId}:${approverType}`,
      details: `Set ${approverType} to user ${approverUserId} for user ${userId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Approver assigned successfully' });
  } catch (error) {
    logger.error('Set user approver failed:', error);
    return res.status(500).json({ error: 'Failed to set user approver' });
  }
}

export async function removeUserApproverHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const approverType = req.params.approverType as string;
    if (!isApproverType(approverType)) {
      return res
        .status(400)
        .json({ error: 'approverType must be "approver" or "sub_approver"' });
    }

    await removeUserDesignatedApprover(userId, approverType);

    await createAuditLog({
      userId: req.user!.userID,
      action: 'remove_user_approver',
      resourceType: 'user_approver',
      resourceId: `${userId}:${approverType}`,
      details: `Removed ${approverType} for user ${userId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Approver removed successfully' });
  } catch (error) {
    logger.error('Remove user approver failed:', error);
    return res.status(500).json({ error: 'Failed to remove user approver' });
  }
}

export async function getEligibleApproversHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.userId as string;
    const approverType = String(req.params.approverType ?? '');

    if (!(ELIGIBLE_TYPES as readonly string[]).includes(approverType)) {
      return res
        .status(400)
        .json({ error: 'approverType must be "approver", "ma3", or "sub_approver"' });
    }

    const eligible = await getEligibleApprovers(
      userId,
      approverType as EligibleType
    );
    return res.json({ eligible });
  } catch (error) {
    logger.error('Get eligible approvers failed:', error);
    return res.status(500).json({ error: 'Failed to fetch eligible approvers' });
  }
}
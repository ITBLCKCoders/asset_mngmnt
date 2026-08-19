import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import {
  getCompanyApprovers,
  getDesignatedApprover,
  setCompanyApprover,
  removeCompanyApprover,
  getEligibleApproversByType,
} from '../repositories/companyApprovers.repository.js';

export async function getCompanyApproversHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    const approvers = await getCompanyApprovers(companyId);
    return res.json({ approvers });
  } catch (error: any) {
    logger.error('Get company approvers failed:', error);
    return res.status(500).json({ error: 'Failed to fetch company approvers' });
  }
}

export async function setCompanyApproverHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    const { approverType, userId } = req.body as {
      approverType: 'approver' | 'sub_approver';
      userId: string;
    };

    if (!approverType || !userId) {
      return res.status(400).json({ error: 'approverType and userId are required' });
    }

    if (!['approver', 'sub_approver'].includes(approverType)) {
      return res.status(400).json({ error: 'Invalid approverType' });
    }

    await setCompanyApprover(companyId, approverType, userId);

    await createAuditLog({
      userId: req.user!.userID,
      action: 'set_company_approver',
      resourceType: 'company_approver',
      resourceId: `${companyId}:${approverType}`,
      details: `Set ${approverType} to user ${userId} for company ${companyId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Approver set successfully' });
  } catch (error: any) {
    logger.error('Set company approver failed:', error);
    return res.status(500).json({ error: 'Failed to set company approver' });
  }
}

export async function removeCompanyApproverHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId, approverType } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!approverType) {
      return res.status(400).json({ error: 'approverType is required' });
    }

    if (!['approver', 'sub_approver'].includes(approverType)) {
      return res.status(400).json({ error: 'Invalid approverType' });
    }

    await removeCompanyApprover(companyId, approverType as 'approver' | 'sub_approver');

    await createAuditLog({
      userId: req.user!.userID,
      action: 'remove_company_approver',
      resourceType: 'company_approver',
      resourceId: `${companyId}:${approverType}`,
      details: `Removed ${approverType} for company ${companyId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Approver removed successfully' });
  } catch (error: any) {
    logger.error('Remove company approver failed:', error);
    return res.status(500).json({ error: 'Failed to remove company approver' });
  }
}

export async function getEligibleApproversHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId, approverType } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!approverType) {
      return res.status(400).json({ error: 'approverType is required' });
    }

    if (!['approver', 'ma3', 'sub_approver'].includes(approverType)) {
      return res.status(400).json({ error: 'Invalid approverType' });
    }

    const eligible = await getEligibleApproversByType(
      companyId,
      approverType as 'approver' | 'ma3' | 'sub_approver'
    );
    return res.json({ eligible });
  } catch (error: any) {
    logger.error('Get eligible approvers failed:', error);
    return res.status(500).json({ error: 'Failed to fetch eligible approvers' });
  }
}
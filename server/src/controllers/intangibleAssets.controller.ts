import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as intangibleAssetsService from '../services/intangibleAssets.service.js';

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
      status,
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

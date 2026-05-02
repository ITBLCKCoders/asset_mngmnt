import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import { createAuditLog } from '../utils/audit.js';

export async function getLocationsHandler(req: AuthRequest, res: Response) {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute('CALL sp_get_locations(?)', [
      activeCompany.id,
    ])) as any[];

    const locations = rows[0].map((loc: any) => ({
      locationID: loc.locationID,
      name: loc.name,
      floor_unit: loc.floor_unit,
      building: loc.building,
      room_areas: loc.room_areas
        ? typeof loc.room_areas === 'string'
          ? JSON.parse(loc.room_areas)
          : loc.room_areas
        : [],
      department_id: loc.department_id,
      company_id: loc.company_id,
      department: loc.department_name
        ? {
            departmentID: loc.department_id,
            name: loc.department_name,
            code: loc.department_code,
            prefix: loc.department_prefix,
            description: loc.department_description,
            created_at: loc.department_created_at,
            created_by: loc.department_created_by,
            updated_at: loc.department_updated_at,
            updated_by: loc.department_updated_by,
            deleted_at: loc.department_deleted_at,
            deleted_by: loc.department_deleted_by,
          }
        : undefined,
      description: loc.description,
      created_at: loc.created_at,
      created_by: loc.created_by,
      updated_at: loc.updated_at,
      updated_by: loc.updated_by,
      deleted_at: loc.deleted_at,
      deleted_by: loc.deleted_by,
    }));

    return res.json({ locations });
  } catch (error: any) {
    logger.error('Get locations failed:', error);
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
}

export async function createLocationHandler(req: AuthRequest, res: Response) {
  const { name, floor_unit, building, room_areas, department_id, description } =
    req.body;
  const userId = req.user!.userID;

  if (!name || !floor_unit) {
    return res.status(400).json({ error: 'Name and floor/unit are required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const roomAreasJson =
      room_areas && Array.isArray(room_areas)
        ? JSON.stringify(room_areas.map(r => r.room_name))
        : null;

    // Ensure department_id is properly handled - convert undefined/empty to null
    const processedDepartmentId =
      department_id !== undefined &&
      department_id !== null &&
      department_id.trim() !== ''
        ? department_id
        : null;

    const [rows] = (await pool.execute(
      'CALL sp_create_location(?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        floor_unit.trim(),
        building?.trim() || null,
        roomAreasJson,
        processedDepartmentId,
        description?.trim() || null,
        activeCompany.id,
        userId,
      ]
    )) as any[];

    const locationId = rows[0][0].locationID;

    await createAuditLog({
      userId,
      action: 'create_location',
      resourceType: 'location',
      resourceId: String(locationId),
      resourceName: name.trim(),
      details: `Created location: ${name.trim()} (${floor_unit.trim()})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(201).json({
      message: 'Location created successfully',
      location: {
        locationID: locationId,
        name: name.trim(),
        floor_unit: floor_unit.trim(),
        building: building?.trim() || null,
        room_areas: room_areas || [],
        department_id: department_id || null,
        description: description?.trim() || null,
        created_at: new Date(),
        created_by: userId,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Create location failed:', error);
    return res.status(500).json({ error: 'Failed to create location' });
  }
}

export async function updateLocationHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, floor_unit, building, room_areas, department_id, description } =
    req.body;
  const userId = req.user!.userID;

  if (!name || !floor_unit) {
    return res.status(400).json({ error: 'Name and floor/unit are required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const roomAreasJson =
      room_areas && Array.isArray(room_areas)
        ? JSON.stringify(room_areas.map(r => r.room_name))
        : null;

    // Ensure department_id is properly handled - convert undefined/empty to null
    const processedDepartmentId =
      department_id !== undefined &&
      department_id !== null &&
      department_id.trim() !== ''
        ? department_id
        : null;

    const [rows] = (await pool.execute(
      'CALL sp_update_location(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        name.trim(),
        floor_unit.trim(),
        building?.trim() || null,
        roomAreasJson,
        processedDepartmentId,
        description?.trim() || null,
        activeCompany.id,
        userId,
      ]
    )) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await createAuditLog({
      userId,
      action: 'update_location',
      resourceType: 'location',
      resourceId: String(id),
      resourceName: name.trim(),
      details: `Updated location: ${name.trim()} (${floor_unit.trim()})`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Location updated successfully',
      location: {
        locationID: id,
        name: name.trim(),
        floor_unit: floor_unit.trim(),
        building: building?.trim() || null,
        room_areas: room_areas || [],
        department_id: department_id || null,
        description: description?.trim() || null,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Update location failed:', error);
    return res.status(500).json({ error: 'Failed to update location' });
  }
}

export async function deleteLocationHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute('CALL sp_delete_location(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ])) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    await createAuditLog({
      userId,
      action: 'delete_location',
      resourceType: 'location',
      resourceId: String(id),
      details: `Deleted location with ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Location deleted successfully' });
  } catch (error: any) {
    logger.error('Delete location failed:', error);
    return res.status(500).json({ error: 'Failed to delete location' });
  }
}

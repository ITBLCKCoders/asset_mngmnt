import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import { createErrorResponse, createSuccessResponse } from '../utils/responseWrapper.js';
import { ReportsService } from '../services/reports.service.js';

export async function getMaintenanceAndRepairHistoryHandler(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const companyId =
      typeof req.query.companyId === 'string' ? req.query.companyId : null;

    const data = await ReportsService.getMaintenanceAndRepairHistory(
      pool,
      userId,
      companyId
    );

    return createSuccessResponse(res, data);
  } catch (error) {
    logger.error('[reports] failed to get maintenance and repair history', error);
    return createErrorResponse(
      res,
      'Failed to fetch reports history',
      [],
      500
    );
  }
}

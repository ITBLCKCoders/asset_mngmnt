import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { createErrorResponse, createSuccessResponse } from '../utils/responseWrapper.js';
import {
  getCategoryIdsForDashboardScope,
  getDashboardData,
} from '../services/dashboard.service.js';
import { pool } from '../db.js';
import logger from '../logger.js';

/**
 * GET /api/dashboard/stats
 * Optional query: scope=it|admin (only applied when user is Global Admin)
 */
export async function getDashboardStatsHandler(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user!.userID;
    const scopeParam = req.query.scope as string | undefined;
    const companyIdParam = req.query.companyId as string | undefined;
    const scopeOverride =
      scopeParam === 'it' || scopeParam === 'admin' ? scopeParam : undefined;
    const companyIdOverride =
      companyIdParam && companyIdParam.trim() !== ''
        ? companyIdParam.trim()
        : undefined;

    const data = await getDashboardData(
      pool,
      userId,
      scopeOverride,
      companyIdOverride
    );
    return createSuccessResponse(res, data);
  } catch (error: any) {
    logger.error('Dashboard stats failed:', error);
    return res.status(500).json({
      success: false,
      error: 'DASHBOARD_STATS_FAILED',
      message: 'Failed to load dashboard stats',
    });
  }
}

/**
 * GET /api/dashboard/scope-category-ids?scope=it|admin&companyId=
 * Same category set as dashboard asset filtering for the given IT/Admin tab.
 */
export async function getScopeCategoryIdsHandler(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user!.userID;
    const scopeParam = req.query.scope as string | undefined;
    if (scopeParam !== 'it' && scopeParam !== 'admin') {
      return createErrorResponse(res, 'INVALID_SCOPE', [], 400);
    }
    const companyIdParam = req.query.companyId as string | undefined;
    const companyIdOverride =
      companyIdParam && companyIdParam.trim() !== ''
        ? companyIdParam.trim()
        : undefined;

    const categoryIds = await getCategoryIdsForDashboardScope(
      pool,
      userId,
      scopeParam,
      companyIdOverride
    );
    return createSuccessResponse(res, { categoryIds });
  } catch (error: any) {
    logger.error('Scope category ids failed:', error);
    return createErrorResponse(res, 'SCOPE_CATEGORY_IDS_FAILED', [], 500);
  }
}

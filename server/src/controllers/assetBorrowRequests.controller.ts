import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../utils/responseWrapper.js';
import { AssetBorrowRequestsService } from '../services/assetBorrowRequests.service.js';
import type { CreateAssetBorrowRequestDto } from '../dtos/assetBorrowRequests/CreateAssetBorrowRequestDto.js';
import type { DeptHeadApproveBorrowRequestDto } from '../dtos/assetBorrowRequests/DeptHeadApproveBorrowRequestDto.js';
import type { StaffApproveBorrowRequestDto } from '../dtos/assetBorrowRequests/StaffApproveBorrowRequestDto.js';
import type { StaffDeclineBorrowRequestDto } from '../dtos/assetBorrowRequests/StaffDeclineBorrowRequestDto.js';
import type { ProcessBorrowReturnDto } from '../dtos/assetBorrowRequests/ProcessBorrowReturnDto.js';
import { createAuditLog } from '../utils/audit.js';

export async function createAssetBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const body = req.body as CreateAssetBorrowRequestDto;
    const result = await AssetBorrowRequestsService.create(pool, userId, body);

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    await createAuditLog({
      userId,
      action: 'create_borrow_request',
      resourceType: 'borrow_request',
      resourceId: result.id,
      details: `Created borrow request with ID: ${result.id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { id: result.id }, 'Borrow request created', undefined, 201);
  } catch (err) {
    logger.error('[assetBorrowRequests] create failed', err);
    return createErrorResponse(
      res,
      'Failed to create borrow request',
      [],
      500
    );
  }
}

export async function listAssetBorrowRequests(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.listForStaff(pool, userId);

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.rows });
  } catch (err) {
    logger.error('[assetBorrowRequests] list failed', err);
    return createErrorResponse(res, 'Failed to list borrow requests', [], 500);
  }
}

export async function listPendingDeptHeadBorrowRequests(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.listPendingDeptHeadApprovals(
      pool,
      userId
    );

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.rows });
  } catch (err) {
    logger.error('[assetBorrowRequests] pending dept list failed', err);
    return createErrorResponse(
      res,
      'Failed to list pending borrow approvals',
      [],
      500
    );
  }
}

export async function listApprovedByDeptHeadMeBorrowRequests(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.listApprovedByDeptHeadMe(
      pool,
      userId
    );

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.rows });
  } catch (err) {
    logger.error('[assetBorrowRequests] approved-by-me list failed', err);
    return createErrorResponse(
      res,
      'Failed to list approved borrow requests',
      [],
      500
    );
  }
}

export async function approveDeptHeadBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const borrowRequestId = req.params.borrowRequestId;
    if (
      !borrowRequestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        borrowRequestId
      )
    ) {
      return createErrorResponse(res, 'Invalid borrow request id', [], 400);
    }

    const body = req.body as DeptHeadApproveBorrowRequestDto;
    const result = await AssetBorrowRequestsService.approveDeptHead(
      pool,
      userId,
      borrowRequestId,
      body
    );

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    await createAuditLog({
      userId,
      action: 'approve_borrow_request_dept_head',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Department head approved borrow request with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { ok: true }, 'Borrow request approved');
  } catch (err) {
    logger.error('[assetBorrowRequests] dept head approve failed', err);
    return createErrorResponse(
      res,
      'Failed to approve borrow request',
      [],
      500
    );
  }
}

export async function declineDeptHeadBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const borrowRequestId = req.params.borrowRequestId;
    if (
      !borrowRequestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        borrowRequestId
      )
    ) {
      return createErrorResponse(res, 'Invalid borrow request id', [], 400);
    }

    const result = await AssetBorrowRequestsService.declineDeptHead(
      pool,
      userId,
      borrowRequestId
    );

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    await createAuditLog({
      userId,
      action: 'decline_borrow_request_dept_head',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Department head declined borrow request with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { ok: true }, 'Borrow request declined');
  } catch (err) {
    logger.error('[assetBorrowRequests] dept head decline failed', err);
    return createErrorResponse(
      res,
      'Failed to decline borrow request',
      [],
      500
    );
  }
}

export async function listMyAssetBorrowRequests(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.listForCurrentUser(
      pool,
      userId
    );

    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.rows });
  } catch (err) {
    logger.error('[assetBorrowRequests] list mine failed', err);
    return createErrorResponse(
      res,
      'Failed to list your borrow requests',
      [],
      500
    );
  }
}

export async function listBorrowRequestAvailableAssets(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }
    const borrowRequestId = req.params.borrowRequestId;
    if (
      !borrowRequestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        borrowRequestId
      )
    ) {
      return createErrorResponse(res, 'Invalid borrow request id', [], 400);
    }

    const result =
      await AssetBorrowRequestsService.listAvailableAssetsForStaffProcessing(
        pool,
        userId,
        borrowRequestId
      );
    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }
    return createSuccessResponse(res, { assets: result.assets });
  } catch (err) {
    logger.error('[assetBorrowRequests] list available assets failed', err);
    return createErrorResponse(
      res,
      'Failed to list available assets for this request',
      [],
      500
    );
  }
}

export async function staffApproveBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const borrowRequestId = req.params.borrowRequestId;
    if (
      !borrowRequestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        borrowRequestId
      )
    ) {
      return createErrorResponse(res, 'Invalid borrow request id', [], 400);
    }

    const body = req.body as StaffApproveBorrowRequestDto;
    const params: any = {
      borrowRequestId,
      assetCode: body.asset_code,
      preUsageCondition: body.pre_usage_condition,
      conditionImages: body.condition_images,
    };
    if (body.processor_remarks) {
      params.processorRemarks = body.processor_remarks;
    }
    if (body.processor_signature) {
      params.processorSignature = body.processor_signature;
    }
    if (body.processor_signed_at) {
      params.processorSignedAt = body.processor_signed_at;
    }
    const result = await AssetBorrowRequestsService.staffApprove(pool, userId, params);
    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    await createAuditLog({
      userId,
      action: 'approve_borrow_request_staff',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Staff approved borrow request with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { ok: true }, 'Borrow request processed');
  } catch (err) {
    logger.error('[assetBorrowRequests] staff approve failed', err);
    return createErrorResponse(
      res,
      'Failed to process borrow request',
      [],
      500
    );
  }
}

export async function getApprovedBorrowRequestsForReceive(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.getApprovedBorrowRequestsForReceive(pool, userId);
    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.borrowRequests });
  } catch (err) {
    logger.error('[assetBorrowRequests] get approved for receive failed', err);
    return createErrorResponse(
      res,
      'Failed to fetch approved borrow requests',
      [],
      500
    );
  }
}

export async function staffDeclineBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    const borrowRequestId = req.params.borrowRequestId;
    if (!borrowRequestId) return createErrorResponse(res, 'Borrow request ID is required', [], 400);
    const body = req.body as StaffDeclineBorrowRequestDto;
    const result = await AssetBorrowRequestsService.staffDecline(pool, userId, {
      borrowRequestId,
      reason: body.reason.trim(),
    });
    if ('error' in result) return createErrorResponse(res, result.error, [], result.status);

    await createAuditLog({
      userId,
      action: 'decline_borrow_request_staff',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Staff declined borrow request with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { ok: true }, 'Borrow request declined');
  } catch (err) {
    logger.error('[assetBorrowRequests] staff decline failed', err);
    return createErrorResponse(res, 'Failed to decline borrow request', [], 500);
  }
}

export async function processBorrowReturn(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    const borrowRequestId = req.params.borrowRequestId;
    if (!borrowRequestId) return createErrorResponse(res, 'Borrow request ID is required', [], 400);
    const body = req.body as ProcessBorrowReturnDto;
    if (!body.verification_received || !body.verification_same_condition) {
      return createErrorResponse(
        res,
        'Verification must be confirmed before processing return',
        [],
        400
      );
    }
    const params: any = {
      borrowRequestId,
      returnCondition: body.return_condition,
      returnConditionImages: body.condition_images ?? [],
    };
    if (body.return_remarks) {
      params.returnRemarks = body.return_remarks;
    }
    const result = await AssetBorrowRequestsService.processBorrowReturn(pool, userId, params);
    if ('error' in result) return createErrorResponse(res, result.error, [], result.status);

    await createAuditLog({
      userId,
      action: 'process_borrow_return',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Processed borrow return with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return createSuccessResponse(res, { ok: true }, 'Borrow return processed');
  } catch (err) {
    logger.error('[assetBorrowRequests] process return failed', err);
    return createErrorResponse(res, 'Failed to process borrow return', [], 500);
  }
}


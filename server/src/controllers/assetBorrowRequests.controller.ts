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
import { createNotificationForApi } from '../utils/notificationsApi.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { getIoInstance } from '../utils/socketManager.js';
import {
  getDesignatedApproverUserIdForRequester,
  getDesignatedSubApproverUserIdForRequester,
  getAssetRoleUsersForScopeAndCompany,
} from '../utils/approverNotifications.js';
import { getUserNamesById } from '../repositories/assetTransferForm.repository.js';
import { getBorrowRequestById } from '../repositories/assetBorrowRequests.repository.js';

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

    try {
      const requesterName = await getUserNamesById(userId);
      const fullName = requesterName
        ? `${requesterName.first_name} ${requesterName.last_name}`.trim()
        : 'A user';
      const approverUserId = await getDesignatedApproverUserIdForRequester(userId);
      const subApproverUserId = await getDesignatedSubApproverUserIdForRequester(userId);
      const io = getIoInstance();
      const notifyUsers = [approverUserId, subApproverUserId].filter(
        (id): id is string => id !== null && id !== userId
      );
      for (const targetUserId of notifyUsers) {
        await createNotificationForApi({
          user_id: targetUserId,
          title: 'New Borrow Request Pending Approval',
          message: `${fullName} has submitted a borrow request (${result.id.slice(0, 8)}) for ${body.borrow_scope === 'it' ? 'IT' : 'Admin'} assets and requires your approval.`,
          type: 'system',
          data: {
            form_id: result.id,
            requester_id: userId,
            requester_name: fullName,
            borrow_scope: body.borrow_scope,
            route: '/approvals',
            actionTarget: 'borrow_request_approval',
          },
        });
        if (io) {
          emitNotification(io, targetUserId, 'notification', {
            title: 'New Borrow Request Pending Approval',
            message: `${fullName} has submitted a borrow request (${result.id.slice(0, 8)}) for ${body.borrow_scope === 'it' ? 'IT' : 'Admin'} assets and requires your approval.`,
            type: 'system',
            data: {
              form_id: result.id,
              requester_id: userId,
              requester_name: fullName,
              borrow_scope: body.borrow_scope,
              route: '/approvals',
              actionTarget: 'borrow_request_approval',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send submit notifications', notifError);
    }

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

    const companyIdParam = req.query.companyId as string | undefined;

    const result = await AssetBorrowRequestsService.listForStaff(pool, userId, companyIdParam);

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

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        const scopeLabel = row.borrow_scope === 'it' ? 'IT' : 'Admin';

        const requesterName = await getUserNamesById(row.user_id);
        const fullName = requesterName
          ? `${requesterName.first_name} ${requesterName.last_name}`.trim()
          : 'A user';

        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Request Approved by Department Head',
          message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been approved by the department head and is now ready for processing.`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Request Approved by Department Head',
            message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been approved by the department head and is now ready for processing.`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }

        const assetRoleUsers = await getAssetRoleUsersForScopeAndCompany(
          row.company_id,
          row.borrow_scope
        );
        for (const targetUserId of assetRoleUsers) {
          if (targetUserId === row.user_id || targetUserId === userId) continue;
          await createNotificationForApi({
            user_id: targetUserId,
            title: 'Borrow Request Ready for Processing',
            message: `${fullName}'s borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been approved by the department head and is ready for ${scopeLabel} asset assignment.`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              requester_id: row.user_id,
              requester_name: fullName,
              borrow_scope: row.borrow_scope,
              route: '/borrow-requests',
              actionTarget: 'borrow_request_staff_processing',
            },
          });
          if (io) {
            emitNotification(io, targetUserId, 'notification', {
              title: 'Borrow Request Ready for Processing',
              message: `${fullName}'s borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been approved by the department head and is ready for ${scopeLabel} asset assignment.`,
              type: 'system',
              data: {
                form_id: borrowRequestId,
                form_number: row.form_number,
                requester_id: row.user_id,
                requester_name: fullName,
                borrow_scope: row.borrow_scope,
                route: '/borrow-requests',
                actionTarget: 'borrow_request_staff_processing',
              },
              time: new Date().toISOString(),
            });
          }
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send dept head approve notifications', notifError);
    }

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

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Request Declined',
          message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been declined by the department head.`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Request Declined',
            message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been declined by the department head.`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send dept head decline notification', notifError);
    }

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

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Request Processed',
          message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been processed. Asset ${body.asset_code} has been assigned to you. Please receive the asset.`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            asset_code: body.asset_code,
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Request Processed',
            message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been processed. Asset ${body.asset_code} has been assigned to you. Please receive the asset.`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              asset_code: body.asset_code,
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send staff approve notification', notifError);
    }

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

export async function listReceivedByMeBorrowRequests(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    }

    const result = await AssetBorrowRequestsService.listReceivedByMe(pool, userId);
    if ('error' in result) {
      return createErrorResponse(res, result.error, [], result.status);
    }

    return createSuccessResponse(res, { borrowRequests: result.borrowRequests });
  } catch (err) {
    logger.error('[assetBorrowRequests] received-by-me list failed', err);
    return createErrorResponse(
      res,
      'Failed to list received borrow requests',
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

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Request Declined by Staff',
          message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) was declined by staff. Reason: ${body.reason.trim()}`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            decline_reason: body.reason.trim(),
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Request Declined by Staff',
            message: `Your borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}) was declined by staff. Reason: ${body.reason.trim()}`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              decline_reason: body.reason.trim(),
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send staff decline notification', notifError);
    }

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

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Return Processed',
          message: `Your borrowed asset for request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been returned.`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Return Processed',
            message: `Your borrowed asset for request (${row.form_number ?? borrowRequestId.slice(0, 8)}) has been returned.`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send return processed notification', notifError);
    }

    return createSuccessResponse(res, { ok: true }, 'Borrow return processed');
  } catch (err) {
    logger.error('[assetBorrowRequests] process return failed', err);
    return createErrorResponse(res, 'Failed to process borrow return', [], 500);
  }
}

export async function receiveBorrowRequest(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  try {
    const userId = req.user?.userID;
    if (!userId) return createErrorResponse(res, 'UNAUTHORIZED', [], 401);
    const borrowRequestId = req.params.borrowRequestId;
    if (!borrowRequestId) return createErrorResponse(res, 'Borrow request ID is required', [], 400);

    // Extract digital signature from request body
    const bodySignature =
      typeof req.body?.digitalSignature === 'string'
        ? req.body.digitalSignature.trim()
        : '';

    // Get user's stored digital signature if not provided in body
    let digitalSignature: string | null = bodySignature || null;
    if (!digitalSignature) {
      const [userRows] = (await pool.query(
        'SELECT digital_signature FROM users WHERE userID = ? LIMIT 1',
        [userId]
      )) as [{ digital_signature?: string | null }[], unknown];
      const fromUser = userRows[0]?.digital_signature;
      digitalSignature =
        fromUser != null && String(fromUser).trim() !== ''
          ? String(fromUser).trim()
          : null;
    }

    const result = await AssetBorrowRequestsService.receiveBorrowRequest(
      pool,
      userId,
      borrowRequestId,
      digitalSignature
    );
    if ('error' in result) return createErrorResponse(res, result.error, [], result.status);

    await createAuditLog({
      userId,
      action: 'receive_borrow_request',
      resourceType: 'borrow_request',
      resourceId: borrowRequestId,
      details: `Received borrow request with ID: ${borrowRequestId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    try {
      const row = await getBorrowRequestById(pool, borrowRequestId);
      if (row) {
        const io = getIoInstance();
        await createNotificationForApi({
          user_id: row.user_id,
          title: 'Borrow Asset Received',
          message: `You have successfully received the asset for borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}).`,
          type: 'system',
          data: {
            form_id: borrowRequestId,
            form_number: row.form_number,
            borrow_scope: row.borrow_scope,
            route: '/assets/borrow',
            actionTarget: 'my_borrow_requests',
          },
        });
        if (io) {
          emitNotification(io, row.user_id, 'notification', {
            title: 'Borrow Asset Received',
            message: `You have successfully received the asset for borrow request (${row.form_number ?? borrowRequestId.slice(0, 8)}).`,
            type: 'system',
            data: {
              form_id: borrowRequestId,
              form_number: row.form_number,
              borrow_scope: row.borrow_scope,
              route: '/assets/borrow',
              actionTarget: 'my_borrow_requests',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('[assetBorrowRequests] Failed to send receive notification', notifError);
    }

    return createSuccessResponse(res, { ok: true }, 'Borrow request received successfully');
  } catch (err) {
    logger.error('[assetBorrowRequests] receive failed', err);
    return createErrorResponse(res, 'Failed to receive borrow request', [], 500);
  }
}


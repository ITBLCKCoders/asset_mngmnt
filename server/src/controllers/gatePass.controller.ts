import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import * as gatePassService from '../services/gatePass.service.js';
import { CreateGatePassDtoSchema, UpdateGatePassDtoSchema } from '../dtos/gatePass/CreateGatePassDto.js';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
} from '../utils/responseWrapper.js';
import type { ValidationError } from '../dtos/common/ApiResponseDto.js';

function mapZodErrorsToValidationErrors(zodErrors: any[]): ValidationError[] {
  return zodErrors.map((err) => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
  }));
}

export async function createGatePassHandler(req: AuthRequest, res: Response) {
  try {
    const validationResult = CreateGatePassDtoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return createErrorResponse(
        res,
        'Validation failed',
        mapZodErrorsToValidationErrors(validationResult.error.errors),
        400
      );
    }

    const gatePassId = await gatePassService.createGatePass({
      assignmentId: validationResult.data.assignmentId,
      assetId: validationResult.data.assetId,
      userId: validationResult.data.userId,
      purpose: validationResult.data.purpose,
      expectedReturnDate: validationResult.data.expectedReturnDate ?? null,
      destinationLocationId: validationResult.data.destinationLocationId ?? null,
      destinationDepartmentId: validationResult.data.destinationDepartmentId ?? null,
      condition: validationResult.data.condition,
      notes: validationResult.data.notes ?? null,
      createdBy: req.user?.userID || '',
    });

    return createSuccessResponse(res, { gatePassId }, 'Gate pass created successfully');
  } catch (error: any) {
    logger.error('Create gate pass failed:', error);
    return createInternalErrorResponse(res, 'Failed to create gate pass');
  }
}

export async function getGatePassHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return createErrorResponse(res, 'Gate pass ID is required', [], 400);
    }
    const gatePass = await gatePassService.getGatePassById(id);
    
    if (!gatePass) {
      return createNotFoundResponse(res, 'Gate pass not found');
    }

    return createSuccessResponse(res, gatePass);
  } catch (error: any) {
    logger.error('Get gate pass failed:', error);
    return createInternalErrorResponse(res, 'Failed to get gate pass');
  }
}

export async function getAllGatePassesHandler(req: AuthRequest, res: Response) {
  try {
    const filters: {
      userId?: string;
      assetId?: string;
      status?: string;
      destinationDepartmentId?: string;
      destinationLocationId?: string;
    } = {};
    
    if (req.query.userId) filters.userId = req.query.userId as string;
    if (req.query.assetId) filters.assetId = req.query.assetId as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.destinationDepartmentId) filters.destinationDepartmentId = req.query.destinationDepartmentId as string;
    if (req.query.destinationLocationId) filters.destinationLocationId = req.query.destinationLocationId as string;

    const gatePasses = await gatePassService.getAllGatePasses(filters);
    return createSuccessResponse(res, { gatePasses });
  } catch (error: any) {
    logger.error('Get all gate passes failed:', error);
    return createInternalErrorResponse(res, 'Failed to get gate passes');
  }
}

export async function updateGatePassHandler(req: AuthRequest, res: Response) {
  try {
    const validationResult = UpdateGatePassDtoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return createErrorResponse(
        res,
        'Validation failed',
        mapZodErrorsToValidationErrors(validationResult.error.errors),
        400
      );
    }

    const { gatePassId, ...updateData } = validationResult.data;
    
    // Add processedBy if status is being changed to Completed
    const finalUpdateData: any = { ...updateData };
    if (finalUpdateData.status === 'Completed' && !finalUpdateData.processedBy) {
      finalUpdateData.processedBy = req.user?.userID || '';
    }

    await gatePassService.updateGatePass(gatePassId, finalUpdateData);

    return createSuccessResponse(res, null, 'Gate pass updated successfully');
  } catch (error: any) {
    logger.error('Update gate pass failed:', error);
    return createInternalErrorResponse(res, 'Failed to update gate pass');
  }
}

export async function deleteGatePassHandler(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return createErrorResponse(res, 'Gate pass ID is required', [], 400);
    }
    await gatePassService.deleteGatePass(id);
    return createSuccessResponse(res, null, 'Gate pass deleted successfully');
  } catch (error: any) {
    logger.error('Delete gate pass failed:', error);
    return createInternalErrorResponse(res, 'Failed to delete gate pass');
  }
}

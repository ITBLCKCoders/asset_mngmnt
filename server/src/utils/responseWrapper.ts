import { Response } from 'express';
import { ValidationError } from '../dtos/common/ApiResponseDto';
import logger from '../logger.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function createSuccessResponse<T>(
  res: Response,
  data: T,
  message?: string,
  meta?: any,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = { success: true };

  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
}

export function createErrorResponse(
  res: Response,
  error: string,
  errors?: ValidationError[],
  statusCode: number = 400,
  message?: string
): Response {
  const response: ApiResponse = {
    success: false,
    error,
  };

  if (errors && errors.length > 0) response.errors = errors;
  if (message) response.message = message;

  return res.status(statusCode).json(response);
}

export function createNotFoundResponse(
  res: Response,
  message: string = 'Resource not found'
): Response {
  return createErrorResponse(res, 'NOT_FOUND', [], 404, message);
}

export function createUnauthorizedResponse(
  res: Response,
  message: string = 'Unauthorized'
): Response {
  return createErrorResponse(res, 'UNAUTHORIZED', [], 401, message);
}

export function createForbiddenResponse(
  res: Response,
  message: string = 'Forbidden'
): Response {
  return createErrorResponse(res, 'FORBIDDEN', [], 403, message);
}

export function createValidationErrorResponse(
  res: Response,
  errors: ValidationError[],
  message: string = 'Validation failed'
): Response {
  return createErrorResponse(res, 'VALIDATION_ERROR', errors, 400, message);
}

export function createConflictResponse(
  res: Response,
  error: string,
  message?: string
): Response {
  return createErrorResponse(res, error, [], 409, message);
}

export function createInternalErrorResponse(
  res: Response,
  error: string = 'Internal server error',
  message?: string
): Response {
  return createErrorResponse(res, error, [], 500, message);
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): any {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

// Helper function to handle async operations with error handling
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  res: Response,
  successMessage?: string,
  errorMessage?: string
): Promise<Response | void> {
  try {
    const data = await operation();
    return createSuccessResponse(res, data, successMessage);
  } catch (error: any) {
    logger.error('Async operation error:', error);
    return createInternalErrorResponse(
      res,
      errorMessage || 'Operation failed',
      error.message
    );
  }
}

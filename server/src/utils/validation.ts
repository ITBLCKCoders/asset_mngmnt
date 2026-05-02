import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../dtos/common/ApiResponseDto';

export function validateDto<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: (err as z.ZodIssue & { input?: unknown }).input,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validationErrors,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request<{}, any, any, T>, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: (err as z.ZodIssue & { input?: unknown }).input,
        }));

        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          errors: validationErrors,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request<T, any, any>, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: (err as z.ZodIssue & { input?: unknown }).input,
        }));

        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          errors: validationErrors,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
      });
    }
  };
}

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string,
  errors?: ValidationError[],
  meta?: any
) {
  const response: any = { success };

  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;
  if (errors && errors.length > 0) response.errors = errors;
  if (meta) response.meta = meta;

  return response;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: any
) {
  return createApiResponse(true, data, message, undefined, undefined, meta);
}

export function createErrorResponse(
  error: string,
  errors?: ValidationError[],
  meta?: any
) {
  return createApiResponse(false, undefined, undefined, error, errors, meta);
}

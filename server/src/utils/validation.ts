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



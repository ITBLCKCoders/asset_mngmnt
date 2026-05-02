import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createValidationErrorResponse,
  createConflictResponse,
  createInternalErrorResponse,
  createPaginationMeta,
} from '../../utils/responseWrapper.js';
import { createMockRes } from '../helpers/mockRes.js';

describe('responseWrapper', () => {
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    res = createMockRes();
  });

  describe('createSuccessResponse', () => {
    it('should set status 200 and return success payload with data', () => {
      const data = { id: '1', name: 'Test' };
      createSuccessResponse(res, data);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({ success: true, data });
    });

    it('should include message and meta when provided', () => {
      createSuccessResponse(
        res,
        { count: 5 },
        'Done',
        { page: 1, total: 10 },
        200
      );

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { count: 5 },
        message: 'Done',
        meta: { page: 1, total: 10 },
      });
    });

    it('should use custom status code', () => {
      createSuccessResponse(res, {}, undefined, undefined, 201);
      expect(res._status).toBe(201);
    });
  });

  describe('createErrorResponse', () => {
    it('should set status 400 and return error payload', () => {
      createErrorResponse(res, 'VALIDATION_ERROR');

      expect(res._status).toBe(400);
      expect(res._json).toEqual({ success: false, error: 'VALIDATION_ERROR' });
    });

    it('should include errors array and message when provided', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      createErrorResponse(
        res,
        'VALIDATION_ERROR',
        errors,
        400,
        'Validation failed'
      );

      expect(res._json).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        errors,
        message: 'Validation failed',
      });
    });
  });

  describe('createNotFoundResponse', () => {
    it('should set status 404 and NOT_FOUND error', () => {
      createNotFoundResponse(res, 'Resource not found');

      expect(res._status).toBe(404);
      expect(res._json).toEqual({
        success: false,
        error: 'NOT_FOUND',
        message: 'Resource not found',
      });
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('should set status 401 and UNAUTHORIZED error', () => {
      createUnauthorizedResponse(res);
      expect(res._status).toBe(401);
      expect((res._json as any).error).toBe('UNAUTHORIZED');
    });
  });

  describe('createForbiddenResponse', () => {
    it('should set status 403 and FORBIDDEN error', () => {
      createForbiddenResponse(res);
      expect(res._status).toBe(403);
      expect((res._json as any).error).toBe('FORBIDDEN');
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should set status 400 with VALIDATION_ERROR and errors', () => {
      const errors = [{ field: 'email', message: 'Invalid' }];
      createValidationErrorResponse(res, errors);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        errors,
        message: 'Validation failed',
      });
    });
  });

  describe('createConflictResponse', () => {
    it('should set status 409 with error code', () => {
      createConflictResponse(res, 'DUPLICATE', 'Already exists');
      expect(res._status).toBe(409);
      expect(res._json).toEqual({
        success: false,
        error: 'DUPLICATE',
        message: 'Already exists',
      });
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should set status 500 with error message', () => {
      createInternalErrorResponse(res, 'Server error', 'Something broke');
      expect(res._status).toBe(500);
      expect((res._json as any).error).toBe('Server error');
      expect((res._json as any).message).toBe('Something broke');
    });
  });

  describe('createPaginationMeta', () => {
    it('should return page, limit, total, totalPages', () => {
      const meta = createPaginationMeta(1, 10, 25);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should ceil totalPages', () => {
      expect(createPaginationMeta(1, 10, 21).totalPages).toBe(3);
    });
  });
});

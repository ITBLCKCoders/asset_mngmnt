import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { z } from 'zod';
import {
  validateDto,
  validateQuery,
  validateParams,
  createApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../utils/validation.js';
import { createMockRes } from '../helpers/mockRes.js';

const bodySchema = z.object({ name: z.string(), count: z.number().optional() });
const querySchema = z.object({
  page: z.coerce.number(),
  limit: z.coerce.number().optional(),
});
const paramsSchema = z.object({ id: z.string() });

describe('validation', () => {
  let res: ReturnType<typeof createMockRes>;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    res = createMockRes();
    next = jest.fn();
  });

  describe('validateDto', () => {
    it('should call next() when body is valid', () => {
      const req: any = { body: { name: 'Test', count: 5 } };
      const middleware = validateDto(bodySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({ name: 'Test', count: 5 });
    });

    it('should return 400 with validation errors when body is invalid', () => {
      const req: any = { body: { name: 123 } }; // count optional; name should be string
      const middleware = validateDto(bodySchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      const json = res._json as any;
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
      expect(Array.isArray(json.errors)).toBe(true);
    });

    it('should return 400 when required field is missing', () => {
      const req: any = { body: {} };
      const middleware = validateDto(bodySchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
    });
  });

  describe('validateQuery', () => {
    it('should call next() when query is valid', () => {
      const req: any = { query: { page: '1', limit: '10' } };
      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.query).toEqual({ page: 1, limit: 10 });
    });

    it('should return 400 when query is invalid', () => {
      const req: any = { query: { page: 'not-a-number' } };
      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect((res._json as any).error).toBe('Invalid query parameters');
    });
  });

  describe('validateParams', () => {
    it('should call next() when params are valid', () => {
      const req: any = { params: { id: 'user-123' } };
      const middleware = validateParams(paramsSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.params).toEqual({ id: 'user-123' });
    });

    it('should return 400 when params are invalid', () => {
      const req: any = { params: {} };
      const middleware = validateParams(paramsSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(400);
      expect((res._json as any).error).toBe('Invalid parameters');
    });
  });

  describe('createApiResponse', () => {
    it('should return success object with data', () => {
      const out = createApiResponse(true, { id: 1 }, 'OK');
      expect(out).toEqual({ success: true, data: { id: 1 }, message: 'OK' });
    });

    it('should return error object with error and errors', () => {
      const errors = [{ field: 'email', message: 'Invalid' }];
      const out = createApiResponse(
        false,
        undefined,
        undefined,
        'VALIDATION_ERROR',
        errors
      );
      expect(out).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        errors,
      });
    });
  });

  describe('createSuccessResponse (plain object)', () => {
    it('should return success payload', () => {
      const out = createSuccessResponse({ list: [] }, 'Done', { page: 1 });
      expect(out).toEqual({
        success: true,
        data: { list: [] },
        message: 'Done',
        meta: { page: 1 },
      });
    });
  });

  describe('createErrorResponse (plain object)', () => {
    it('should return error payload', () => {
      const out = createErrorResponse('NOT_FOUND', []);
      expect(out).toEqual({ success: false, error: 'NOT_FOUND' });
    });
  });
});

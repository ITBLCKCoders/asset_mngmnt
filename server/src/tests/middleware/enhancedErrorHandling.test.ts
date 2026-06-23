import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

jest.mock('../../logger.js', () => ({ __esModule: true, default: mockLogger }));
jest.mock('../../config/validation.js', () => ({ config: { NODE_ENV: 'development' } }));

const {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  enhancedErrorHandler,
  notFoundHandler,
  asyncHandler,
  setupGlobalErrorHandlers,
  requestTimeout,
  securityHeaders,
  requestId,
  requestLogger,
} = require('../../middleware/enhancedErrorHandling.js');

describe('enhancedErrorHandling', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      headersSent: false,
      on: jest.fn(),
      once: jest.fn(),
    };
  });

  describe('AppError subclasses', () => {
    it('should create AppError with correct status', () => {
      const err = new AppError('generic', 500);
      expect(err.message).toBe('generic');
      expect(err.statusCode).toBe(500);
      expect(err.isOperational).toBe(true);
    });

    it('should create ValidationError with 400', () => {
      const err = new ValidationError('bad input');
      expect(err.statusCode).toBe(400);
    });

    it('should create NotFoundError with 404', () => {
      const err = new NotFoundError('not found');
      expect(err.statusCode).toBe(404);
    });

    it('should create AuthenticationError with 401', () => {
      const err = new AuthenticationError('unauthorized');
      expect(err.statusCode).toBe(401);
    });

    it('should create ForbiddenError with 403', () => {
      const err = new ForbiddenError('forbidden');
      expect(err.statusCode).toBe(403);
    });

    it('should create ConflictError with 409', () => {
      const err = new ConflictError('conflict');
      expect(err.statusCode).toBe(409);
    });

    it('should create RateLimitError with 429', () => {
      const err = new RateLimitError('too fast');
      expect(err.statusCode).toBe(429);
    });
  });

  describe('enhancedErrorHandler', () => {
    it('should handle AppError with its status code', () => {
      const err = new NotFoundError('Asset not found');
      enhancedErrorHandler(err, req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Asset not found' })
      );
    });

    it('should fallback to 500 for unknown errors', () => {
      const err = new Error('Something broke');
      enhancedErrorHandler(err, req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Internal Server Error' })
      );
    });

    it('should handle MulterError with 400', () => {
      const err = new Error('Unexpected field');
      err.name = 'MulterError';
      enhancedErrorHandler(err, req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle JsonWebTokenError with 401', () => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      enhancedErrorHandler(err, req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should log 5xx as error and 4xx as warn', () => {
      enhancedErrorHandler(new Error('server error'), req, res, jest.fn());
      expect(mockLogger.error).toHaveBeenCalled();

      jest.clearAllMocks();
      enhancedErrorHandler(new NotFoundError('gone'), req, res, jest.fn());
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError and pass to next', () => {
      const next = jest.fn();
      notFoundHandler(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('asyncHandler', () => {
    it('should catch errors and pass to next', async () => {
      const failingFn = async () => { throw new Error('async fail'); };
      const next = jest.fn();
      const wrapped = asyncHandler(failingFn);
      await wrapped(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call the wrapped function on success', async () => {
      const successFn = jest.fn().mockResolvedValue(undefined);
      const next = jest.fn();
      const wrapped = asyncHandler(successFn);
      await wrapped(req, res, next);
      expect(successFn).toHaveBeenCalledWith(req, res, next);
    });
  });

  describe('requestTimeout', () => {
    it('should call next immediately', () => {
      const next = jest.fn();
      const middleware = requestTimeout(100);
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers and call next', () => {
      const next = jest.fn();
      const middleware = securityHeaders();
      middleware(req, res, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(next).toHaveBeenCalled();
    });

    it('should not set X-Frame-Options DENY for wet-pdf routes', () => {
      req.originalUrl = '/api/transfers/received-copy-wet-pdf/view/123';
      const next = jest.fn();
      const middleware = securityHeaders();
      middleware(req, res, next);
      const frameCalls = (res.setHeader as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === 'X-Frame-Options'
      );
      expect(frameCalls).toHaveLength(0);
    });
  });

  describe('requestId', () => {
    it('should use existing X-Request-ID header', () => {
      req.get = jest.fn((h: string) =>
        h === 'X-Request-ID' ? 'existing-id' : undefined
      );
      const next = jest.fn();
      const middleware = requestId();
      middleware(req, res, next);
      expect(req.requestId).toBe('existing-id');
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id');
    });

    it('should generate request ID when no header present', () => {
      req.get = jest.fn().mockReturnValue(undefined);
      const next = jest.fn();
      const middleware = requestId();
      middleware(req, res, next);
      expect(req.requestId).toBeDefined();
      expect(typeof req.requestId).toBe('string');
    });
  });

  describe('requestLogger', () => {
    it('should log on finish', () => {
      const next = jest.fn();
      const middleware = requestLogger();
      middleware(req, res, next);

      const finishCb = res.on.mock.calls.find((c: string[]) => c[0] === 'finish')?.[1];
      res.statusCode = 200;
      if (finishCb) finishCb();
      expect(mockLogger.info).toHaveBeenCalled();

      jest.clearAllMocks();
      res.statusCode = 500;
      const middleware2 = requestLogger();
      middleware2(req, res, jest.fn());
      const finishCb2 = res.on.mock.calls.find((c: string[]) => c[0] === 'finish')?.[1];
      if (finishCb2) finishCb2();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('should register process handlers', () => {
      const onSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
      setupGlobalErrorHandlers();
      expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      onSpy.mockRestore();
    });
  });
});

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger from '../logger.js';
import { config } from '../config/validation.js';

/**
 * Helmet middleware with a strict-by-default Content Security Policy.
 *
 * - `defaultSrc 'self'` blocks all unexpected origins.
 * - `imgSrc` allows `https:` so Cloudinary-hosted asset photos work.
 * - `crossOriginEmbedderPolicy: false` keeps the wet-PDF iframe view working
 *   across the dev Vite (9669) and API (6996) ports.
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Custom error classes
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 429);
  }
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => unknown | Promise<unknown>;

// Enhanced error handler middleware
export function enhancedErrorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorDetails: any = null;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    errorDetails = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    errorDetails = error.message;
  } else if (error.message?.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (error.message?.includes('EADDRINUSE')) {
    statusCode = 500;
    message = 'Port already in use';
  }

  // Log error with context
  const errorContext = {
    message: error.message,
    code: (error as { code?: string }).code,
    errno: (error as { errno?: number }).errno,
    sqlState: (error as { sqlState?: string }).sqlState,
    sqlMessage: (error as { sqlMessage?: string }).sqlMessage,
    sql: (error as { sql?: string }).sql,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.userID,
  };

  if (statusCode >= 500) {
    logger.error('[SERVER_ERROR]', errorContext);
  } else {
    logger.warn('[CLIENT_ERROR]', { ...errorContext, statusCode });
  }

  // Don't send stack trace in production
  const errorResponse = {
    success: false,
    error: message,
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    ...(errorDetails && { details: errorDetails }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
}

// 404 Not Found handler
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}

// Async error wrapper
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler for unhandled rejections
export function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('[UNHANDLED_REJECTION]', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });

    // Don't exit the process in development, but log the error
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('[UNCAUGHT_EXCEPTION]', {
      message: error.message,
      stack: error.stack,
    });

    process.exit(1);
  });
}

// Request timeout handler
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError('Request timeout', 408);
        next(error);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow embedding the wet-PDF view in the app iframe (cross-origin dev: Vite vs API port).
    if (
      !req.originalUrl.includes('/received-copy-wet-pdf/view') &&
      !req.originalUrl.includes('/wet-return-pdf/view') &&
      !req.originalUrl.includes('/wet-transfer-pdf/view')
    ) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Add cache control for sensitive endpoints
    if (
      req.originalUrl.includes('/auth/') ||
      req.originalUrl.includes('/admin/')
    ) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
}

// Request ID middleware for tracing
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId =
      req.get('X-Request-ID') ||
      req.get('X-Correlation-ID') ||
      Math.random().toString(36).substr(2, 9);

    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

// Request logging middleware
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

      logger[logLevel]('[REQUEST]', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: (req as any).requestId,
        userId: (req as any).user?.userID,
      });
    });

    next();
  };
}

export default {
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
};

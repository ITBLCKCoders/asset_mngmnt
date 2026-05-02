import type { Request, Response, NextFunction } from 'express';
import { resolveCorsDecision } from './corsPolicy.js';
import logger from '../logger.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Endpoints exempt from Origin/Referer enforcement.
 *
 * Each entry is matched against `req.originalUrl` (path only, no query). Use
 * sparingly — only for endpoints that have their own CSRF-equivalent defense
 * (e.g. signed httpOnly cookies + DB session lookup).
 */
const EXEMPT_PATHS: ReadonlyArray<RegExp> = [
  // Refresh is protected by signed httpOnly refresh cookie + DB session lookup.
  /^\/api\/auth\/refresh(?:\?|$|\/)/,
];

function isExempt(originalUrl: string): boolean {
  return EXEMPT_PATHS.some(pattern => pattern.test(originalUrl));
}

function isLoopbackIp(ip: string | undefined): boolean {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.')
  );
}

/**
 * Origin/Referer CSRF check.
 *
 * For unsafe HTTP methods (anything that mutates state) we require either an
 * `Origin` or `Referer` header that resolves to an allowlisted origin via the
 * same policy used for CORS. Requests with neither header are allowed only
 * from loopback IPs (local curl / health probes).
 *
 * Rationale: cookies are httpOnly + signed, so the only realistic CSRF vector
 * is a cross-site form/fetch. Browsers always attach Origin/Referer on those,
 * so an allowlist check provides effective protection without any client-side
 * token plumbing.
 */
export function originCheck(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isExempt(req.originalUrl)) return next();

  const originHeader = req.get('Origin');
  const refererHeader = req.get('Referer');

  // No Origin/Referer at all — only allow from loopback (curl/health checks).
  if (!originHeader && !refererHeader) {
    if (isLoopbackIp(req.ip)) return next();
    logger.warn('[CSRF] Rejected: missing Origin and Referer', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      requestId: (req as Request & { requestId?: string }).requestId,
    });
    return res.status(403).json({
      success: false,
      error: 'CSRF: missing Origin/Referer',
    });
  }

  const candidate = originHeader || refererHeader || '';
  const decision = resolveCorsDecision(candidate);

  if (!decision.allowed) {
    logger.warn('[CSRF] Rejected: bad Origin/Referer', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      origin: originHeader,
      referer: refererHeader,
      reason: decision.reason,
      requestId: (req as Request & { requestId?: string }).requestId,
    });
    return res.status(403).json({
      success: false,
      error: 'CSRF: bad Origin/Referer',
    });
  }

  return next();
}

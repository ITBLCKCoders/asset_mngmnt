import { config } from '../config/validation.js';
import { serverConfig } from '../config/database.js';
import logger from '../logger.js';

export interface CorsDecision {
  allowed: boolean;
  reason: string;
}

export function normalizeOrigin(input: string): string {
  try {
    const parsed = new URL(input.trim());
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return input.trim().replace(/\/+$/, '').toLowerCase();
  }
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const wildcardPattern = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${wildcardPattern}$`, 'i');
}

export function compileOriginPattern(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  // Optional raw regex format: /.../flags
  const regexLiteralMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
  if (regexLiteralMatch) {
    try {
      const patternSource = regexLiteralMatch[1] ?? '';
      const patternFlags = regexLiteralMatch[2] ?? '';
      return new RegExp(patternSource, patternFlags);
    } catch {
      logger.warn(`[CORS] Ignoring invalid regex pattern: ${trimmed}`);
      return null;
    }
  }

  if (trimmed.includes('*')) {
    return wildcardToRegex(normalizeOrigin(trimmed));
  }

  // Treat plain entries as exact origins via regex.
  return new RegExp(
    `^${normalizeOrigin(trimmed).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    'i'
  );
}

const isLanOrigin = (origin: string): boolean =>
  /^(https?):\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(origin);

/**
 * Resolve whether a request Origin should be allowed by the same policy used
 * for HTTP CORS, Socket.IO CORS, and Origin/Referer CSRF checks.
 *
 * In production, the LAN-origin allowance is disabled — only explicit
 * ALLOWED_ORIGINS / ALLOWED_ORIGIN_PATTERNS entries (plus self-origins) pass.
 */
export function resolveCorsDecision(origin: string | undefined): CorsDecision {
  if (!origin) return { allowed: true, reason: 'no_origin_header' };

  const normalizedOrigin = normalizeOrigin(origin);

  const isProduction = config.NODE_ENV === 'production';
  const allowedOrigins = serverConfig.allowedOrigins.map(normalizeOrigin);
  const allowedOriginPatterns = serverConfig.allowedOriginPatterns
    .map(compileOriginPattern)
    .filter((pattern): pattern is RegExp => pattern !== null);
  const port = serverConfig.port;
  const selfOrigins = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `https://localhost:${port}`,
    `https://127.0.0.1:${port}`,
  ].map(normalizeOrigin);

  if (allowedOrigins.includes(normalizedOrigin)) {
    return { allowed: true, reason: 'exact_allowlist' };
  }

  if (selfOrigins.includes(normalizedOrigin)) {
    return { allowed: true, reason: 'self_origin' };
  }

  if (allowedOriginPatterns.some(pattern => pattern.test(normalizedOrigin))) {
    return { allowed: true, reason: 'pattern_allowlist' };
  }

  if (!isProduction && isLanOrigin(normalizedOrigin)) {
    return { allowed: true, reason: 'lan_origin' };
  }

  return { allowed: false, reason: 'not_in_allowlist' };
}

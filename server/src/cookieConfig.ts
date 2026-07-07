import { config } from './config/validation.js';

const isProd = config.NODE_ENV === 'production';
const cookieDomain =
  config.COOKIE_DOMAIN && config.COOKIE_DOMAIN !== 'localhost'
    ? config.COOKIE_DOMAIN.replace(/^https?:\/\//, '').trim()
    : undefined;

const sameSite = isProd ? ('none' as const) : ('lax' as const);

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  signed: true,
};

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  path: '/',
  maxAge: 15 * 60 * 1000,
  signed: true,
};

export const clearCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite,
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  path: '/',
  signed: true,
};

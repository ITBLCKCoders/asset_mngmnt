import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

export const emailBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, try again later' },
  keyGenerator: (req: any) => {
    const email = req.body?.email?.toLowerCase();
    return email
      ? `email:${email}`
      : `anonymous:${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  },
  skip: (req: any) => !req.body?.email,
  standardHeaders: true,
  legacyHeaders: false,
});

export const ipBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts from this IP, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpResendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { error: 'Please wait 60 seconds before resending OTP' },
  keyGenerator: (req: any) => {
    const email = req.body?.email?.toLowerCase();
    return email
      ? `otp-resend:${email}`
      : `otp-resend-anon:${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  },
  skip: (req: any) => !req.body?.email,
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP attempts. Try again in 60 seconds' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many refresh attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

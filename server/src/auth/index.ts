export * from './types.js';
export * from './tokens.js';
export * from './session.js';
export * from './user.js';
export * from './email.js';
export * from './password.js';
export * from './cleanup.js';
export * from './mfa.js';
// SMS OTP replaced by email OTP — kept for reference
// export * from './sms.js';

export {
  generateTokens,
  refreshSessionTokens,
  verifyAccessToken,
} from './tokens.js';

export { login, register } from './user.js';

export {
  verifyOTP,
  sendVerificationOTP,
  sendSigningOTP,
  verifySigningOTP,
  normalizeSigningOtpPurpose,
  getSigningOtpTemplate,
} from './email.js';
export type { SigningOtpPurpose } from './email.js';

export {
  forgotPassword,
  verifyPasswordResetOTP,
  // verifyPasswordResetOTPSms,
  resetPassword,
} from './password.js';

// SMS OTP replaced by email OTP — kept for reference
// export { sendSmsVerification, checkSmsVerification } from './sms.js';

export {
  logout,
  checkInactivity,
  verifyRefreshToken,
  revokeRefreshToken,
  updateActivity,
} from './session.js';

export { cleanupExpiredSessions } from './cleanup.js';

export {
  generateTOTPSecret,
  verifyTOTPSetup,
  verifyTOTP,
  disableMFA,
  isMFAEnabled,
  regenerateBackupCodes,
  sendMFARecoveryOTP,
  verifyMFARecoveryOTP,
} from './mfa.js';

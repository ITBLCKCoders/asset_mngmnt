import { Router } from 'express';
import multer from 'multer';
import {
  registerHandler,
  loginHandler,
  verifyOTPHandler,
  resendOTPHandler,
  forgotPasswordHandler,
  verifyPasswordResetOTPHandler,
  resetPasswordHandler,
  refreshTokenHandler,
  logoutHandler,
  getMeHandler,
  changePasswordHandler,
  updateProfileHandler,
  uploadAvatarHandler,
  checkInitialsAvailabilityHandler,
  sendInitialsOtpHandler,
  verifyInitialsOtpHandler,
  setupMFAHandler,
  verifyMFASetupHandler,
  verifyMFAHandler,
  disableMFAHandler,
  regenerateBackupCodesHandler,
  getMFAStatusHandler,
  sendMFARecoveryOTPHandler,
  verifyMFARecoveryOTPHandler,
  sendPasswordChangeOTPHandler,
  forceChangePasswordHandler,
  getPasswordStatusHandler,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { verifyFileMagicBytes } from '../middleware/verifyFileMagicBytes.js';
import {
  emailBasedLimiter,
  ipBasedLimiter,
  otpResendLimiter,
  otpVerifyLimiter,
  refreshTokenLimiter,
} from '../middleware/rateLimiters.js';
import { validateDto } from '../utils/validation.js';
import {
  LoginDtoSchema,
  RegisterDtoSchema,
  VerifyOTPDtoSchema,
  ResendOTPDtoSchema,
  ForgotPasswordDtoSchema,
  VerifyResetOTPDtoSchema,
  ResetPasswordDtoSchema,
  ChangePasswordDtoSchema,
  UpdateProfileDtoSchema,
  CheckInitialsAvailabilityDtoSchema,
  VerifyInitialsOtpDtoSchema,
} from '../dtos/auth/AuthDto.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    fields: 50,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  },
});

// Authentication routes with rate limiting
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, username, contactNumber, department_id, company_id]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               username: { type: string }
 *               contactNumber: { type: string }
 *               position: { type: string, nullable: true }
 *               employeeNumber: { type: string, nullable: true }
 *               roleId: { type: string, nullable: true }
 *               otpChannel:
 *                 type: string
 *                 enum: [email, sms]
 *                 default: email
 *               department_id: { type: string }
 *               company_id: { type: string }
 *     responses:
 *       201: { description: User registered, OTP sent to email }
 *       400: { description: Validation error or email already exists }
 */
router.post(
  '/register',
  emailBasedLimiter,
  ipBasedLimiter,
  validateDto(RegisterDtoSchema),
  registerHandler
);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Success, returns access token and user }
 *       400: { description: Invalid credentials }
 */
router.post(
  '/login',
  emailBasedLimiter,
  ipBasedLimiter,
  validateDto(LoginDtoSchema),
  loginHandler
);
/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for email or SMS verification
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *                 default: email
 *               email: { type: string, format: email }
 *               contactNumber: { type: string, example: "+639123456789" }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: OTP verified, returns access token }
 *       400: { description: Invalid or expired OTP }
 */
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validateDto(VerifyOTPDtoSchema),
  verifyOTPHandler
);
/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to email or SMS
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *                 default: email
 *               email: { type: string, format: email }
 *               contactNumber: { type: string, example: "+639123456789" }
 *     responses:
 *       200: { description: OTP resent }
 *       400: { description: Invalid request or rate limited }
 */
router.post(
  '/resend-otp',
  otpResendLimiter,
  ipBasedLimiter,
  validateDto(ResendOTPDtoSchema),
  resendOTPHandler
);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel]
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *                 default: email
 *               email: { type: string, format: email }
 *               contactNumber: { type: string, example: "+639123456789" }
 *     responses:
 *       200: { description: OTP sent to email if account exists }
 *       400: { description: Validation error }
 */
router.post(
  '/forgot-password',
  emailBasedLimiter,
  ipBasedLimiter,
  validateDto(ForgotPasswordDtoSchema),
  forgotPasswordHandler
);
/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for password reset
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp]
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *                 default: email
 *               email: { type: string, format: email }
 *               contactNumber: { type: string, example: "+639123456789" }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: OTP verified }
 *       400: { description: Invalid or expired OTP }
 */
router.post(
  '/verify-reset-otp',
  otpVerifyLimiter,
  validateDto(VerifyResetOTPDtoSchema),
  verifyPasswordResetOTPHandler
);
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password after OTP verification
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, password]
 *             properties:
 *               userId: { type: string, description: User ID from verify-reset-otp }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid or expired token or validation error }
 */
router.post(
  '/reset-password',
  ipBasedLimiter,
  validateDto(ResetPasswordDtoSchema),
  resetPasswordHandler
);
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token cookie
 *     security: []
 *     responses:
 *       200: { description: New access token returned }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', refreshTokenLimiter, refreshTokenHandler);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (clears refresh token cookie)
 *     security: []
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post('/logout', logoutHandler);
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, getMeHandler);
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (authenticated)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password changed }
 *       400: { description: Invalid current password }
 *       401: { description: Unauthorized }
 */
router.post(
  '/change-password',
  authenticate,
  validateDto(ChangePasswordDtoSchema),
  changePasswordHandler
);
/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               middleName: { type: string, nullable: true }
 *               lastName: { type: string }
 *               username: { type: string, nullable: true }
 *               contactNumber: { type: string, nullable: true }
 *               position: { type: string, nullable: true }
 *               employeeNumber: { type: string, nullable: true }
 *               digitalSignature: { type: string, nullable: true }
 *               unitNo: { type: string, nullable: true }
 *               buildingNo: { type: string, nullable: true }
 *               street: { type: string, nullable: true }
 *               subdivision: { type: string, nullable: true }
 *               barangay: { type: string, nullable: true }
 *               city: { type: string, nullable: true }
 *               province: { type: string, nullable: true }
 *               region: { type: string, nullable: true }
 *     responses:
 *       200: { description: Profile updated }
 *       401: { description: Unauthorized }
 */
router.patch(
  '/profile',
  authenticate,
  validateDto(UpdateProfileDtoSchema),
  updateProfileHandler
);
/**
 * @swagger
 * /api/auth/check-initials-availability:
 *   post:
 *     tags: [Auth]
 *     summary: Check if digital initials are available
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - digitalSignature
 *             properties:
 *               digitalSignature:
 *                 type: string
 *                 description: Digital signature/initials to check
 *     responses:
 *       200: { description: Initials are available }
 *       409: { description: Initials already in use by another user }
 *       401: { description: Unauthorized }
 */
router.post(
  '/check-initials-availability',
  authenticate,
  validateDto(CheckInitialsAvailabilityDtoSchema),
  checkInitialsAvailabilityHandler
);
/**
 * @swagger
 * /api/auth/initials/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send SMS OTP for initials verification
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OTP sent successfully }
 *       400: { description: Invalid request or no contact number }
 *       401: { description: Unauthorized }
 */
router.post('/initials/send-otp', authenticate, sendInitialsOtpHandler);
/**
 * @swagger
 * /api/auth/initials/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify SMS OTP for initials verification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *     responses:
 *       200: { description: OTP verified successfully }
 *       400: { description: Invalid OTP format or expired }
 *       401: { description: Unauthorized }
 */
router.post(
  '/initials/verify-otp',
  authenticate,
  validateDto(VerifyInitialsOtpDtoSchema),
  verifyInitialsOtpHandler
);
/**
 * @swagger
 * /api/auth/upload/avatar:
 *   post:
 *     tags: [Auth]
 *     summary: Upload avatar image
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Avatar uploaded }
 *       400: { description: Invalid file (only images allowed, max 5MB) }
 *       401: { description: Unauthorized }
 */
router.post(
  '/upload/avatar',
  authenticate,
  upload.single('avatar'),
  verifyFileMagicBytes('image'),
  uploadAvatarHandler
);

/**
 * @swagger
 * /api/auth/mfa/status:
 *   get:
 *     tags: [Auth]
 *     summary: Get MFA status (global setting and user status if authenticated)
 *     security: []
 *     responses:
 *       200: { description: Returns global MFA setting and user MFA status if logged in }
 */
router.get('/mfa/status', getMFAStatusHandler);

/**
 * @swagger
 * /api/auth/mfa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Start MFA setup - generates QR code
 *     security: []
 *     responses:
 *       200: { description: Returns QR code and secret }
 *       401: { description: Unauthorized }
 */
router.post('/mfa/setup', authenticate, setupMFAHandler);

/**
 * @swagger
 * /api/auth/mfa/verify-setup:
 *   post:
 *     tags: [Auth]
 *     summary: Verify TOTP and enable MFA
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: MFA enabled, returns backup codes }
 *       400: { description: Invalid TOTP code }
 *       401: { description: Unauthorized }
 */
router.post('/mfa/verify-setup', authenticate, verifyMFASetupHandler);

/**
 * @swagger
 * /api/auth/mfa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify TOTP during login (public endpoint with temp token)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, totp]
 *             properties:
 *               tempToken: { type: string }
 *               totp: { type: string, minLength: 6, maxLength: 8 }
 *     responses:
 *       200: { description: Login successful, returns tokens }
 *       401: { description: Invalid TOTP or expired session }
 */
router.post('/mfa/verify', otpVerifyLimiter, verifyMFAHandler);

/**
 * @swagger
 * /api/auth/mfa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable MFA (requires password confirmation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200: { description: MFA disabled }
 *       400: { description: Invalid password }
 *       401: { description: Unauthorized }
 */
router.post('/mfa/disable', authenticate, disableMFAHandler);

/**
 * @swagger
 * /api/auth/mfa/regenerate-backup-codes:
 *   post:
 *     tags: [Auth]
 *     summary: Generate new backup codes (requires password)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200: { description: New backup codes generated }
 *       400: { description: Invalid password or MFA not enabled }
 *       401: { description: Unauthorized }
 */
router.post(
  '/mfa/regenerate-backup-codes',
  authenticate,
  regenerateBackupCodesHandler
);

/**
 * @swagger
 * /api/auth/mfa/recovery/send:
 *   post:
 *     tags: [Auth]
 *     summary: Send email OTP for MFA recovery
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken]
 *             properties:
 *               tempToken: { type: string }
 *     responses:
 *       200: { description: Recovery code sent to email }
 *       401: { description: Invalid or expired session }
 */
router.post('/mfa/recovery/send', otpVerifyLimiter, sendMFARecoveryOTPHandler);

/**
 * @swagger
 * /api/auth/mfa/recovery/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email OTP for MFA recovery and complete login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, otp]
 *             properties:
 *               tempToken: { type: string }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: Login successful, returns tokens }
 *       400: { description: Invalid or expired OTP }
 */
router.post('/mfa/recovery/verify', otpVerifyLimiter, verifyMFARecoveryOTPHandler);

/**
 * @swagger
 * /api/auth/password-change/send-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Send email OTP for forced password change verification
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken]
 *             properties:
 *               tempToken: { type: string }
 *     responses:
 *       200: { description: OTP sent to email }
 *       401: { description: Invalid or expired session }
 */
router.post('/password-change/send-otp', otpVerifyLimiter, sendPasswordChangeOTPHandler);

/**
 * @swagger
 * /api/auth/password-change/force:
 *   post:
 *     tags: [Authentication]
 *     summary: Force change password with 2FA verification (TOTP or email OTP)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, newPassword, confirmPassword]
 *             properties:
 *               tempToken: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *               totp: { type: string, description: "TOTP code from authenticator app" }
 *               emailOtp: { type: string, description: "Email OTP as backup" }
 *     responses:
 *       200: { description: Password changed, returns tokens }
 *       400: { description: Validation error }
 *       401: { description: Invalid session or verification failed }
 */
router.post('/password-change/force', otpVerifyLimiter, forceChangePasswordHandler);

/**
 * @swagger
 * /api/auth/password-status:
 *   get:
 *     tags: [Authentication]
 *     summary: Get password expiration status for current user
 *     responses:
 *       200: { description: Returns expired/expiringSoon flags and daysRemaining }
 *       401: { description: Unauthorized }
 */
router.get('/password-status', authenticate, getPasswordStatusHandler);

export default router;

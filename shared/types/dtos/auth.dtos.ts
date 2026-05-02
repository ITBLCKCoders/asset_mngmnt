// Shared Auth + MFA DTOs (login, register, OTP/password flows, MFA setup &
// verification).

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  position?: string;
  employeeNumber?: string;
  roleId?: string;
  departmentId?: string;
  companyId?: string;
}

export interface VerifyOTPDto {
  email: string;
  otp: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  position?: string;
  employeeNumber?: string;
}

// MFA DTOs
export interface MFALoginResponse {
  mfaRequired: true;
  tempToken: string;
  message: string;
}

export interface MFAVerifyDto {
  tempToken: string;
  totp: string;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export interface MFASetupVerifyDto {
  token: string;
}

export interface MFADisableDto {
  password: string;
}

export interface MFABackupCodesResponse {
  success: boolean;
  backupCodes: string[];
}

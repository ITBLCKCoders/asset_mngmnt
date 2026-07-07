import { z } from 'zod';

// SMS channel disabled — all OTP now uses email
const OtpChannelSchema = z.enum(['email' /*, 'sms' */]);

export const LoginDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RegisterDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  username: z.string().min(1, 'Username is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  position: z.string().optional().nullable(),
  employeeNumber: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  otpChannel: OtpChannelSchema.optional().default('email'),
  department_id: z.string().min(1, 'Department is required'),
  company_id: z.string().min(1, 'Company is required'),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const VerifyOTPDtoSchema = z
  .object({
    channel: OtpChannelSchema.optional().default('email'),
    email: z.string().email('Invalid email format').optional(),
    contactNumber: z.string().optional(),
    otp: z.string().min(6, 'OTP must be 6 characters').max(6),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required for email OTP',
      });
    }

    // SMS channel validation removed — all OTP now uses email
    // if (data.channel === 'sms' && !data.contactNumber) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     path: ['contactNumber'],
    //     message: 'Contact number is required for SMS OTP',
    //   });
    // }
  });

export type VerifyOTPDto = z.infer<typeof VerifyOTPDtoSchema>;

export const ResendOTPDtoSchema = z
  .object({
    channel: OtpChannelSchema.optional().default('email'),
    email: z.string().email('Invalid email format').optional(),
    contactNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required for email OTP',
      });
    }

    // SMS channel validation removed — all OTP now uses email
    // if (data.channel === 'sms' && !data.contactNumber) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     path: ['contactNumber'],
    //     message: 'Contact number is required for SMS OTP',
    //   });
    // }
  });

export type ResendOTPDto = z.infer<typeof ResendOTPDtoSchema>;

export const ForgotPasswordDtoSchema = z
  .object({
    channel: OtpChannelSchema.optional().default('email'),
    email: z.string().email('Invalid email format').optional(),
    contactNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required for email OTP',
      });
    }

    // SMS channel validation removed — all OTP now uses email
    // if (data.channel === 'sms' && !data.contactNumber && !data.email) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     path: ['contactNumber'],
    //     message: 'Email or contact number is required for SMS OTP',
    //   });
    // }
  });

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

export const VerifyResetOTPDtoSchema = z
  .object({
    channel: OtpChannelSchema.optional().default('email'),
    email: z.string().email('Invalid email format').optional(),
    contactNumber: z.string().optional(),
    otp: z.string().min(6, 'OTP must be 6 characters').max(6),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required for email OTP',
      });
    }

    // SMS channel validation removed — all OTP now uses email
    // if (data.channel === 'sms' && !data.contactNumber && !data.email) {
    //   ctx.addIssue({
    //     code: z.ZodIssueCode.custom,
    //     path: ['contactNumber'],
    //     message: 'Email or contact number is required for SMS OTP',
    //   });
    // }
  });

export type VerifyResetOTPDto = z.infer<typeof VerifyResetOTPDtoSchema>;

export const ResetPasswordDtoSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;

export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;

export const UpdateProfileDtoSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  middleName: z.string().max(255).optional().nullable(),
  lastName: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  contactNumber: z.string().max(20).optional().nullable(),
  position: z.string().optional().nullable(),
  employeeNumber: z.string().optional().nullable(),
  digitalSignature: z.string().optional().nullable(),
  // Address fields
  unitNo: z.string().optional().nullable(),
  buildingNo: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  subdivision: z.string().optional().nullable(),
  barangay: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

export const CheckInitialsAvailabilityDtoSchema = z.object({
  digitalSignature: z.string().min(1, 'Digital signature is required'),
});

export type CheckInitialsAvailabilityDto = z.infer<typeof CheckInitialsAvailabilityDtoSchema>;

export const VerifyInitialsOtpDtoSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 characters').max(6).regex(/^\d+$/, 'OTP must be numeric'),
});

export type VerifyInitialsOtpDto = z.infer<typeof VerifyInitialsOtpDtoSchema>;

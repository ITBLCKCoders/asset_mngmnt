import { z } from 'zod';

export const CreateUserDtoSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    first_name: z.string().min(1, 'First name is required').max(100),
    last_name: z.string().min(1, 'Last name is required').max(100),
    username: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    employee_number: z.string().optional().nullable(),
    role_id: z.string().min(1, 'Role is required'),
    department_id: z.string().optional().nullable(),
    company_id: z.string().optional().nullable(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

export const UpdateUserDtoSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  first_name: z.string().min(1, 'First name is required').max(100).optional(),
  last_name: z.string().min(1, 'Last name is required').max(100).optional(),
  username: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
  role_id: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

export const ChangePasswordDtoSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;

export const UpdateProfileDtoSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  username: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
